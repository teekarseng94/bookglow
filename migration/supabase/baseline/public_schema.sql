


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."_merchant_revenue_between"("p_outlet_id" "text", "p_start" "date", "p_end" "date") RETURNS numeric
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_sum numeric := 0;
BEGIN
  IF NOT (
    public.is_portal_platform_admin()
    OR public.current_portal_outlet_id() = p_outlet_id
  ) THEN
    RAISE EXCEPTION 'Not allowed for this outlet.' USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(SUM(t.amount), 0) INTO v_sum
  FROM public.transactions t
  WHERE t.outlet_id = p_outlet_id
    AND t.type = 'SALE'
    AND lower(COALESCE(t.status, '')) NOT IN ('void', 'voided')
    AND COALESCE(t.category, '') NOT IN ('Voucher', 'Redemption')
    AND (timezone('Asia/Kuala_Lumpur', t.date))::date >= p_start
    AND (timezone('Asia/Kuala_Lumpur', t.date))::date <= p_end;

  RETURN v_sum;
END;
$$;


ALTER FUNCTION "public"."_merchant_revenue_between"("p_outlet_id" "text", "p_start" "date", "p_end" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."abandon_pending_merchant_workspace"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_outlet text;
BEGIN
  IF v_uid IS NULL THEN RETURN; END IF;
  SELECT o.outlet_id INTO v_outlet
  FROM public.outlet_members om
  JOIN public.outlets o ON o.outlet_id = om.outlet_id
  WHERE om.user_id = v_uid AND om.role = 'owner' AND om.status = 'active'
    AND coalesce(o.settings->>'merchantSetupPending', '') = 'true'
  ORDER BY om.created_at
  LIMIT 1;
  IF v_outlet IS NULL THEN RETURN; END IF;
  UPDATE public.outlet_members SET status = 'removed', updated_at = now()
  WHERE outlet_id = v_outlet AND user_id = v_uid AND status = 'active';
  UPDATE public.users SET outlet_id = NULL WHERE uid = v_uid::text AND outlet_id = v_outlet;
END;
$$;


ALTER FUNCTION "public"."abandon_pending_merchant_workspace"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."accept_outlet_invitation"("invitation_token" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text;
  inv public.outlet_invitations%rowtype;
  v_limit int;
  v_count int;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT lower(email) INTO v_email FROM auth.users WHERE id = v_uid;

  SELECT * INTO inv
  FROM public.outlet_invitations
  WHERE token_hash = encode(extensions.digest(invitation_token, 'sha256'), 'hex')
  FOR UPDATE;

  IF NOT FOUND OR inv.status <> 'pending' OR inv.accepted_at IS NOT NULL THEN
    RAISE EXCEPTION 'Invitation is invalid or already accepted';
  END IF;
  IF inv.expires_at <= now() THEN
    UPDATE public.outlet_invitations SET status = 'expired', updated_at = now() WHERE id = inv.id;
    RAISE EXCEPTION 'Invitation expired';
  END IF;
  IF lower(inv.email) <> v_email THEN
    RAISE EXCEPTION 'Invitation email does not match signed-in account';
  END IF;

  SELECT account_limit INTO v_limit
  FROM public.outlets
  WHERE outlet_id = inv.outlet_id AND access_status = 'active' AND status = 'active'
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Outlet is unavailable'; END IF;

  SELECT count(*) INTO v_count
  FROM public.outlet_members
  WHERE outlet_id = inv.outlet_id AND status = 'active';
  IF v_count >= v_limit THEN RAISE EXCEPTION 'Outlet account limit reached'; END IF;

  PERFORM public.ensure_identity_profiles();
  PERFORM public.abandon_pending_merchant_workspace();

  INSERT INTO public.outlet_members(outlet_id, user_id, role, status, invited_by)
  VALUES (inv.outlet_id, v_uid, inv.role, 'active', inv.invited_by)
  ON CONFLICT (outlet_id, user_id) DO NOTHING;

  INSERT INTO public.users(uid, email, outlet_id, role, display_name)
  VALUES (
    v_uid::text,
    v_email,
    inv.outlet_id,
    inv.role,
    coalesce((SELECT full_name FROM public.profiles WHERE id = v_uid), split_part(v_email, '@', 1))
  )
  ON CONFLICT (uid) DO UPDATE
  SET email = excluded.email,
      outlet_id = excluded.outlet_id,
      role = CASE
        WHEN public.users.role = 'platform_admin' THEN public.users.role
        ELSE excluded.role
      END;

  UPDATE public.outlet_invitations
  SET status = 'accepted', accepted_at = now(), accepted_by = v_uid, updated_at = now()
  WHERE id = inv.id;

  INSERT INTO public.audit_logs(outlet_id, actor_user_id, action, target_type, target_id, metadata)
  VALUES (inv.outlet_id, v_uid, 'member.invitation_accepted', 'outlet_member', v_uid::text, jsonb_build_object('role', inv.role));

  RETURN jsonb_build_object('outlet_id', inv.outlet_id, 'role', inv.role);
END;
$$;


ALTER FUNCTION "public"."accept_outlet_invitation"("invitation_token" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."append_platform_audit_event"("p_outlet_id" "text", "p_action" "text", "p_affected_target" "text", "p_reason" "text" DEFAULT NULL::"text", "p_metadata" "jsonb" DEFAULT '{}'::"jsonb", "p_source" "text" DEFAULT 'merchant-portal'::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_id uuid;
  v_email text;
BEGIN
  IF NOT public.is_portal_platform_admin() THEN
    RAISE EXCEPTION 'Platform administrator access required';
  END IF;
  SELECT email INTO v_email FROM public.users WHERE uid = auth.uid()::text;
  INSERT INTO public.platform_audit_events (
    outlet_id, action, affected_target, actor_uid, actor_email, reason, metadata, source
  ) VALUES (
    p_outlet_id, p_action, p_affected_target, auth.uid()::text, v_email, p_reason,
    COALESCE(p_metadata, '{}'::jsonb), COALESCE(p_source, 'merchant-portal')
  ) RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;


ALTER FUNCTION "public"."append_platform_audit_event"("p_outlet_id" "text", "p_action" "text", "p_affected_target" "text", "p_reason" "text", "p_metadata" "jsonb", "p_source" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."appointments_reject_staff_overlap"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_start integer;
  v_end integer;
  v_conflict boolean;
BEGIN
  -- OLD is unassigned on INSERT, so it is only read inside this branch.
  IF TG_OP = 'UPDATE' THEN
    IF NOT (
         NEW.staff_id IS DISTINCT FROM OLD.staff_id
      OR NEW.date     IS DISTINCT FROM OLD.date
      OR NEW.time     IS DISTINCT FROM OLD.time
      OR NEW.end_time IS DISTINCT FROM OLD.end_time
      OR (
           lower(coalesce(NEW.status, '')) NOT IN ('cancelled', 'no-show', 'no_show', 'canceled')
           AND lower(coalesce(OLD.status, '')) IN ('cancelled', 'no-show', 'no_show', 'canceled')
         )
    ) THEN
      RETURN NEW;
    END IF;
  END IF;

  IF NEW.staff_id IS NULL OR btrim(NEW.staff_id) = '' THEN
    RETURN NEW;
  END IF;
  IF lower(coalesce(NEW.status, '')) IN ('cancelled', 'no-show', 'no_show', 'canceled') THEN
    RETURN NEW;
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended(NEW.outlet_id || '|' || NEW.staff_id || '|' || NEW.date, 0)
  );

  v_start := public.parse_time_to_minutes(NEW.time);
  v_end := public.parse_time_to_minutes(coalesce(nullif(NEW.end_time, ''), NEW.time));
  IF v_end <= v_start THEN
    SELECT v_start + coalesce(s.duration, 30)
      INTO v_end
    FROM public.services s
    WHERE s.id = NEW.service_id;
    IF v_end IS NULL OR v_end <= v_start THEN
      v_end := v_start + 30;
    END IF;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.appointments a
    WHERE a.outlet_id = NEW.outlet_id
      AND a.staff_id = NEW.staff_id
      AND a.date = NEW.date
      AND a.id IS DISTINCT FROM NEW.id
      AND lower(coalesce(a.status, '')) NOT IN ('cancelled', 'no-show', 'no_show', 'canceled')
      AND v_start < (
        CASE
          WHEN public.parse_time_to_minutes(coalesce(nullif(a.end_time, ''), a.time))
               > public.parse_time_to_minutes(a.time)
          THEN public.parse_time_to_minutes(coalesce(nullif(a.end_time, ''), a.time))
          ELSE public.parse_time_to_minutes(a.time) + coalesce(
            (SELECT s.duration FROM public.services s WHERE s.id = a.service_id),
            30
          )
        END
      )
      AND public.parse_time_to_minutes(a.time) < v_end
  ) INTO v_conflict;

  IF v_conflict THEN
    RAISE EXCEPTION 'This staff member already has an appointment at that time.'
      USING ERRCODE = 'unique_violation';
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."appointments_reject_staff_overlap"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."booking_slug_from_name"("value" "text") RETURNS "text"
    LANGUAGE "plpgsql" IMMUTABLE
    SET "search_path" TO 'public'
    AS $_$
DECLARE
  v_word text;
  v_clean text;
  v_out text := '';
  v_first boolean := true;
BEGIN
  FOR v_word IN
    SELECT unnest(regexp_split_to_array(trim(coalesce(value, '')), '\s+'))
  LOOP
    v_clean := regexp_replace(v_word, '[^a-zA-Z0-9]', '', 'g');
    CONTINUE WHEN v_clean = '';
    IF v_first THEN
      v_out := lower(v_clean);
      v_first := false;
    ELSE
      v_out := v_out || upper(left(v_clean, 1)) || lower(substr(v_clean, 2));
    END IF;
  END LOOP;

  -- Must be a usable URL segment starting with a letter. CJK-only names and
  -- names starting with a digit return '' so the caller asks for a path.
  IF v_out ~ '^[a-zA-Z][a-zA-Z0-9_-]*$' THEN
    RETURN v_out;
  END IF;
  RETURN '';
END;
$_$;


ALTER FUNCTION "public"."booking_slug_from_name"("value" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_manage_outlet_accounts"("p_outlet_id" "text") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
 SELECT public.has_outlet_role(p_outlet_id,ARRAY['owner','admin']) $$;


ALTER FUNCTION "public"."can_manage_outlet_accounts"("p_outlet_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_manage_outlet_integrations"("p_outlet_id" "text", "p_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.platform_account_controls c
    WHERE c.user_id=p_user_id AND c.status='suspended'
  ) AND (
    EXISTS (
      SELECT 1 FROM public.outlet_members m
      JOIN public.outlets o ON o.outlet_id=m.outlet_id
      WHERE m.outlet_id=p_outlet_id AND m.user_id=p_user_id
        AND m.status='active' AND m.role IN ('owner','admin')
        AND o.access_status='active'
    )
    OR EXISTS (
      SELECT 1 FROM public.platform_admins pa
      WHERE pa.user_id=p_user_id AND pa.status='active'
    )
  )
$$;


ALTER FUNCTION "public"."can_manage_outlet_integrations"("p_outlet_id" "text", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."change_outlet_member_role"("p_member_id" "uuid", "p_role" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE m public.outlet_members%rowtype; BEGIN SELECT * INTO m FROM public.outlet_members WHERE id=p_member_id FOR UPDATE;
 IF p_role NOT IN ('admin','manager','cashier') OR NOT public.can_manage_outlet_accounts(m.outlet_id) OR m.role='owner' OR m.user_id=auth.uid() THEN RAISE EXCEPTION 'Role change not permitted'; END IF;
 UPDATE public.outlet_members SET role=p_role,updated_at=now() WHERE id=p_member_id; INSERT INTO public.audit_logs(outlet_id,actor_user_id,action,target_type,target_id,metadata) VALUES(m.outlet_id,auth.uid(),'member.role_changed','outlet_member',p_member_id::text,jsonb_build_object('role',p_role)); END $$;


ALTER FUNCTION "public"."change_outlet_member_role"("p_member_id" "uuid", "p_role" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."complete_merchant_onboarding"("payload" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text;
  v_name text := trim(coalesce(payload->>'businessName', ''));
  v_location_type text := payload->>'serviceLocationType';
  v_outlet_id text;
  v_slug_base text;
  v_slug text;
  v_existing public.users%rowtype;
  v_settings jsonb;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT email INTO v_email FROM auth.users WHERE id = v_uid;
  SELECT * INTO v_existing FROM public.users WHERE uid = v_uid::text;
  IF FOUND AND v_existing.outlet_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'outlet_id', v_existing.outlet_id,
      'booking_slug', (SELECT booking_slug FROM public.outlets WHERE outlet_id = v_existing.outlet_id),
      'idempotent', true
    );
  END IF;
  IF char_length(v_name) < 2 OR char_length(v_name) > 80 THEN RAISE EXCEPTION 'Business name must be 2 to 80 characters'; END IF;
  IF coalesce(jsonb_array_length(coalesce(payload->'businessCategories', '[]'::jsonb)), 0) < 1 THEN RAISE EXCEPTION 'Select at least one business category'; END IF;
  IF jsonb_array_length(coalesce(payload->'businessCategories', '[]'::jsonb)) > 4 THEN RAISE EXCEPTION 'Select no more than four business categories'; END IF;
  IF v_location_type NOT IN ('physical', 'mobile', 'virtual') THEN RAISE EXCEPTION 'Invalid service location type'; END IF;
  IF v_location_type = 'physical' AND char_length(trim(coalesce(payload->'location'->>'addressDisplay', ''))) < 4 THEN
    RAISE EXCEPTION 'Physical business address is required';
  END IF;
  IF coalesce(payload->>'teamSize', '') NOT IN ('independent','2-5','6-10','11-20','20-plus') THEN RAISE EXCEPTION 'Invalid team size'; END IF;

  v_outlet_id := 'outlet_' || replace(gen_random_uuid()::text, '-', '');
  v_slug_base := nullif(public.slugify_booking_name(v_name), '');
  IF v_slug_base IS NULL THEN v_slug_base := 'business'; END IF;
  v_slug := v_slug_base;
  WHILE EXISTS (SELECT 1 FROM public.outlets WHERE lower(booking_slug) = lower(v_slug)) LOOP
    v_slug := v_slug_base || '-' || substr(encode(gen_random_bytes(4), 'hex'), 1, 8);
  END LOOP;

  v_settings := jsonb_build_object(
    'shopName', v_name,
    'receiptCompanyName', v_name,
    'isOutletModeEnabled', false,
    'isAdminAuthenticated', true,
    'lockedFeatures', '[]'::jsonb,
    'paymentMethods', jsonb_build_array('Cash', 'Credit Card', 'E-wallet', 'Other'),
    'reminderEnabled', true,
    'reminderTiming', 24,
    'reminderChannel', 'Both',
    'website', nullif(trim(coalesce(payload->>'website', '')), ''),
    'primaryBusinessCategory', payload->>'primaryBusinessCategory',
    'businessCategories', payload->'businessCategories',
    'serviceLocationType', v_location_type,
    'teamSize', payload->>'teamSize',
    'previousSoftware', payload->>'previousSoftware',
    'previousSoftwareOther', payload->>'previousSoftwareOther',
    'onboardingCompletedAt', now(),
    'onboardingVersion', 1,
    'businessHoursConfigured', false
  );

  INSERT INTO public.outlets (
    outlet_id, name, email, website, address, address_display, timezone,
    booking_slug, is_active, settings, created_at, updated_at
  ) VALUES (
    v_outlet_id, v_name, v_email, nullif(trim(coalesce(payload->>'website', '')), ''),
    CASE WHEN v_location_type = 'physical' THEN payload->'location' ELSE NULL END,
    CASE WHEN v_location_type = 'physical' THEN payload->'location'->>'addressDisplay' ELSE NULL END,
    coalesce(nullif(payload->'location'->>'timezone', ''), 'Asia/Kuala_Lumpur'),
    v_slug, true, v_settings, now(), now()
  );

  INSERT INTO public.users(uid, email, outlet_id, role, display_name, created_at)
  VALUES (v_uid::text, v_email, v_outlet_id, 'admin', coalesce(auth.jwt()->'user_metadata'->>'full_name', split_part(v_email, '@', 1)), now())
  ON CONFLICT (uid) DO UPDATE SET email = excluded.email, outlet_id = excluded.outlet_id, role = 'admin', display_name = excluded.display_name;

  INSERT INTO public.merchant_onboarding_drafts(auth_user_id, current_step, account_type, payload, completed_at, updated_at)
  VALUES (v_uid, 'complete', 'create', payload, now(), now())
  ON CONFLICT (auth_user_id) DO UPDATE SET current_step = 'complete', payload = excluded.payload, completed_at = now(), updated_at = now();

  RETURN jsonb_build_object('outlet_id', v_outlet_id, 'booking_slug', v_slug, 'idempotent', false);
END;
$$;


ALTER FUNCTION "public"."complete_merchant_onboarding"("payload" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."complete_pos_sale"("p_transaction" "jsonb", "p_appointment_id" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_outlet_id text := public.current_portal_outlet_id();
  v_transaction_id text := nullif(trim(p_transaction->>'id'), '');
  v_appointment public.appointments%rowtype;
  v_existing public.transactions%rowtype;
  v_created boolean := false;
BEGIN
  IF auth.uid() IS NULL OR v_outlet_id IS NULL THEN RAISE EXCEPTION 'Authenticated outlet membership required'; END IF;
  IF v_transaction_id IS NULL THEN RAISE EXCEPTION 'Transaction id is required'; END IF;
  IF coalesce(p_transaction->>'outlet_id', v_outlet_id) <> v_outlet_id THEN RAISE EXCEPTION 'Transaction belongs to another outlet'; END IF;
  IF coalesce(p_transaction->>'type', '') <> 'SALE' THEN RAISE EXCEPTION 'Only POS sales are supported'; END IF;

  SELECT * INTO v_existing FROM public.transactions WHERE id = v_transaction_id FOR UPDATE;
  IF FOUND AND v_existing.outlet_id <> v_outlet_id THEN RAISE EXCEPTION 'Transaction belongs to another outlet'; END IF;

  IF p_appointment_id IS NOT NULL THEN
    SELECT * INTO v_appointment FROM public.appointments
      WHERE id = p_appointment_id AND outlet_id = v_outlet_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Appointment not found in active outlet'; END IF;
    IF v_appointment.status IN ('cancelled', 'no-show', 'no_show') THEN RAISE EXCEPTION 'Cancelled or no-show appointment cannot be completed'; END IF;
    IF v_appointment.sale_id IS NOT NULL AND v_appointment.sale_id <> v_transaction_id THEN
      RAISE EXCEPTION 'Appointment is already linked to another sale';
    END IF;
  END IF;

  IF v_existing.id IS NULL THEN
    INSERT INTO public.transactions(id,outlet_id,date,type,client_id,items,amount,category,description,payment_method,status,voided,remarks,payment_status,outstanding)
    VALUES (v_transaction_id,v_outlet_id,coalesce((p_transaction->>'date')::timestamptz,now()),'SALE',p_transaction->>'client_id',p_transaction->'items',
      coalesce((p_transaction->>'amount')::numeric,0),coalesce(p_transaction->>'category',''),coalesce(p_transaction->>'description',''),
      p_transaction->>'payment_method',coalesce(p_transaction->>'status','completed'),false,p_transaction->>'remarks','paid',coalesce((p_transaction->>'outstanding')::numeric,0));
    v_created := true;
  END IF;

  IF p_appointment_id IS NOT NULL THEN
    UPDATE public.appointments SET status='completed', payment_status='paid', sale_id=v_transaction_id,
      completed_at=coalesce(completed_at,now()), updated_at=now()
      WHERE id=p_appointment_id AND outlet_id=v_outlet_id;
  END IF;

  IF v_created THEN
    INSERT INTO public.audit_logs(outlet_id,actor_user_id,action,target_type,target_id,metadata)
      VALUES(v_outlet_id,auth.uid(),'pos_sale_completed','transaction',v_transaction_id,
        jsonb_build_object('appointment_ids',CASE WHEN p_appointment_id IS NULL THEN '[]'::jsonb ELSE jsonb_build_array(p_appointment_id) END));
  END IF;
  RETURN jsonb_build_object('transaction_id',v_transaction_id,'appointment_ids',CASE WHEN p_appointment_id IS NULL THEN '[]'::jsonb ELSE jsonb_build_array(p_appointment_id) END,'created',v_created);
END $$;


ALTER FUNCTION "public"."complete_pos_sale"("p_transaction" "jsonb", "p_appointment_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_merchant_workspace"("p_request_id" "uuid", "p_business_name" "text", "p_business_type" "text", "p_phone" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_req public.merchant_provision_requests%rowtype;
  v_outlet text;
  v_email text;
  v_slug text;
  v_slug_base text;
  v_slug_name text;
  v_pending boolean := false;
  v_draft jsonb;
  v_addr text;
  v_website text;
  v_timezone text;
  v_phone_number text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF length(trim(coalesce(p_business_name, ''))) < 2 THEN RAISE EXCEPTION 'Business name is required'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(v_uid::text, 0));

  SELECT * INTO v_req FROM public.merchant_provision_requests WHERE request_id = p_request_id FOR UPDATE;
  IF FOUND THEN
    IF v_req.user_id <> v_uid THEN RAISE EXCEPTION 'Provision request belongs to another user'; END IF;
    IF v_req.status = 'succeeded' THEN
      RETURN (
        SELECT jsonb_build_object(
          'outlet_id', o.outlet_id, 'booking_slug', o.booking_slug, 'idempotent', true,
          'role', 'owner', 'onboarding_status', o.onboarding_status,
          'current_step', s.current_step, 'access_status', o.access_status,
          'registration_pending', false
        )
        FROM public.outlets o
        LEFT JOIN public.onboarding_states s ON s.outlet_id = o.outlet_id
        WHERE o.outlet_id = v_req.outlet_id
      );
    END IF;
  ELSE
    INSERT INTO public.merchant_provision_requests(request_id, user_id) VALUES (p_request_id, v_uid);
  END IF;

  SELECT om.outlet_id, coalesce(o.settings->>'merchantSetupPending', '') = 'true'
    INTO v_outlet, v_pending
  FROM public.outlet_members om
  JOIN public.outlets o ON o.outlet_id = om.outlet_id
  WHERE om.user_id = v_uid AND om.role = 'owner' AND om.status = 'active'
  ORDER BY om.created_at
  LIMIT 1;

  SELECT email INTO v_email FROM auth.users WHERE id = v_uid;
  PERFORM public.ensure_identity_profiles();

  -- Contact details the wizard stored step by step. Read before the draft is
  -- marked complete below; the upsert there never overwrites `payload`.
  SELECT payload INTO v_draft
  FROM public.merchant_onboarding_drafts
  WHERE auth_user_id = v_uid;

  v_addr := public.text_or_null(v_draft->'location'->>'addressDisplay');
  v_website := public.text_or_null(v_draft->>'website');
  v_timezone := public.text_or_null(v_draft->'location'->>'timezone');
  v_phone_number := coalesce(
    public.text_or_null(p_phone),
    public.text_or_null(v_draft->>'phoneE164'),
    (SELECT public.text_or_null(phone) FROM public.profiles WHERE id = v_uid)
  );

  v_slug_base := coalesce(nullif(public.slugify_booking_name(trim(p_business_name)), ''), 'business');
  v_slug_name := public.booking_slug_from_name(trim(p_business_name));

  IF v_outlet IS NOT NULL AND v_pending THEN
    -- Prefer the plain shop-name path so the portal recognises it as still
    -- following the shop name; fall back to a suffixed path when it is taken.
    IF v_slug_name <> '' AND NOT EXISTS (
      SELECT 1 FROM public.outlets WHERE lower(booking_slug) = lower(v_slug_name) AND outlet_id <> v_outlet
    ) THEN
      v_slug := v_slug_name;
    ELSE
      v_slug := v_slug_base || '-' || substr(v_outlet, -6);
      WHILE EXISTS (
        SELECT 1 FROM public.outlets WHERE lower(booking_slug) = lower(v_slug) AND outlet_id <> v_outlet
      ) LOOP
        v_slug := v_slug_base || '-' || substr(encode(gen_random_bytes(4), 'hex'), 1, 8);
      END LOOP;
    END IF;

    UPDATE public.outlets SET
      name = trim(p_business_name),
      email = v_email,
      phone = coalesce(public.text_or_null(p_phone), phone),
      phone_number = coalesce(public.text_or_null(phone_number), v_phone_number),
      address_display = coalesce(public.text_or_null(address_display), v_addr),
      website = coalesce(public.text_or_null(website), v_website),
      timezone = coalesce(public.text_or_null(timezone), v_timezone, timezone),
      business_type = p_business_type,
      booking_slug = v_slug,
      settings = (coalesce(settings, '{}'::jsonb) - 'merchantSetupPending')
        || jsonb_build_object('shopName', trim(p_business_name), 'merchantSetupCompletedAt', now()),
      updated_at = now()
    WHERE outlet_id = v_outlet;

    INSERT INTO public.merchant_onboarding_drafts(auth_user_id, current_step, account_type, payload, completed_at, updated_at)
    VALUES (v_uid, 'complete', 'create', jsonb_build_object('businessName', trim(p_business_name)), now(), now())
    ON CONFLICT (auth_user_id) DO UPDATE
      SET current_step = 'complete', account_type = 'create', completed_at = now(), updated_at = now();

    UPDATE public.merchant_provision_requests
      SET status = 'succeeded', outlet_id = v_outlet, updated_at = now()
      WHERE request_id = p_request_id;

    INSERT INTO public.audit_logs(outlet_id, actor_user_id, action, target_type, target_id)
    VALUES (v_outlet, v_uid, 'merchant.workspace_setup_completed', 'outlet', v_outlet);

    RETURN jsonb_build_object(
      'outlet_id', v_outlet, 'booking_slug', v_slug, 'idempotent', false,
      'role', 'owner', 'onboarding_status', 'incomplete', 'current_step', 'business',
      'access_status', 'active', 'registration_pending', false
    );
  END IF;

  IF v_outlet IS NOT NULL THEN
    RETURN (
      SELECT jsonb_build_object(
        'outlet_id', o.outlet_id, 'booking_slug', o.booking_slug, 'idempotent', true,
        'role', 'owner', 'onboarding_status', o.onboarding_status,
        'current_step', s.current_step, 'access_status', o.access_status,
        'registration_pending', false
      )
      FROM public.outlets o
      LEFT JOIN public.onboarding_states s ON s.outlet_id = o.outlet_id
      WHERE o.outlet_id = v_outlet
    );
  END IF;

  v_outlet := 'outlet_' || replace(gen_random_uuid()::text, '-', '');
  IF v_slug_name <> '' AND NOT EXISTS (
    SELECT 1 FROM public.outlets WHERE lower(booking_slug) = lower(v_slug_name)
  ) THEN
    v_slug := v_slug_name;
  ELSE
    v_slug := v_slug_base || '-' || substr(v_outlet, -6);
    WHILE EXISTS (SELECT 1 FROM public.outlets WHERE lower(booking_slug) = lower(v_slug)) LOOP
      v_slug := v_slug_base || '-' || substr(encode(gen_random_bytes(4), 'hex'), 1, 8);
    END LOOP;
  END IF;

  INSERT INTO public.outlets(
    outlet_id, name, email, phone, phone_number, address_display, website, business_type,
    owner_user_id, booking_slug, is_active, status, onboarding_status, access_status,
    account_limit, settings
  ) VALUES (
    v_outlet, trim(p_business_name), v_email, p_phone, v_phone_number, v_addr, v_website, p_business_type,
    v_uid, v_slug, true, 'active', 'incomplete', 'active', 3,
    jsonb_build_object('shopName', trim(p_business_name), 'merchantSetupCompletedAt', now())
  );
  INSERT INTO public.outlet_members(outlet_id, user_id, role, status) VALUES (v_outlet, v_uid, 'owner', 'active');
  INSERT INTO public.onboarding_states(outlet_id) VALUES (v_outlet);
  INSERT INTO public.users(uid, email, outlet_id, role, display_name)
  VALUES (
    v_uid::text, v_email, v_outlet, 'admin',
    coalesce((SELECT full_name FROM public.profiles WHERE id = v_uid), split_part(v_email, '@', 1))
  )
  ON CONFLICT (uid) DO UPDATE SET outlet_id = excluded.outlet_id, role = 'admin';

  INSERT INTO public.merchant_onboarding_drafts(auth_user_id, current_step, account_type, payload, completed_at, updated_at)
  VALUES (v_uid, 'complete', 'create', jsonb_build_object('businessName', trim(p_business_name)), now(), now())
  ON CONFLICT (auth_user_id) DO UPDATE
    SET current_step = 'complete', account_type = 'create', completed_at = now(), updated_at = now();

  INSERT INTO public.audit_logs(outlet_id, actor_user_id, action, target_type, target_id)
  VALUES (v_outlet, v_uid, 'merchant.workspace_created', 'outlet', v_outlet);
  UPDATE public.merchant_provision_requests
    SET status = 'succeeded', outlet_id = v_outlet, updated_at = now()
    WHERE request_id = p_request_id;

  RETURN jsonb_build_object(
    'outlet_id', v_outlet, 'booking_slug', v_slug, 'idempotent', false,
    'role', 'owner', 'onboarding_status', 'incomplete', 'current_step', 'business',
    'access_status', 'active', 'registration_pending', false
  );
END;
$$;


ALTER FUNCTION "public"."create_merchant_workspace"("p_request_id" "uuid", "p_business_name" "text", "p_business_type" "text", "p_phone" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_outlet_invitation"("invitee_email" "text", "invitation_role" "text" DEFAULT 'cashier'::"text", "valid_hours" integer DEFAULT 168) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE v_outlet_id text := public.current_portal_outlet_id(); v_token text;
BEGIN
  IF v_outlet_id IS NULL OR NOT public.is_portal_admin() THEN RAISE EXCEPTION 'Outlet administrator access required'; END IF;
  IF invitation_role NOT IN ('admin','manager','cashier') THEN RAISE EXCEPTION 'Invalid invitation role'; END IF;
  IF invitee_email IS NULL OR position('@' in invitee_email) < 2 THEN RAISE EXCEPTION 'Valid email required'; END IF;
  v_token := encode(extensions.gen_random_bytes(24), 'hex');
  INSERT INTO public.outlet_invitations(outlet_id,email,role,token_hash,expires_at,created_by)
  VALUES(v_outlet_id,lower(trim(invitee_email)),invitation_role,encode(extensions.digest(v_token,'sha256'),'hex'),now() + make_interval(hours => greatest(1,least(valid_hours,720))),auth.uid()::text);
  RETURN jsonb_build_object('invitation_token',v_token,'expires_at',now() + make_interval(hours => greatest(1,least(valid_hours,720))));
END;
$$;


ALTER FUNCTION "public"."create_outlet_invitation"("invitee_email" "text", "invitation_role" "text", "valid_hours" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_public_booking"("p_outlet_id" "text", "p_service_id" "text", "p_date" "text", "p_time" "text", "p_customer_name" "text", "p_phone" "text", "p_email" "text" DEFAULT NULL::"text", "p_staff_id" "text" DEFAULT NULL::"text", "p_auth_uid" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_result jsonb;
BEGIN
  v_result := public.create_public_booking_batch(
    p_outlet_id,
    p_date,
    p_time,
    p_customer_name,
    p_phone,
    jsonb_build_array(jsonb_build_object('service_id', p_service_id, 'staff_id', p_staff_id)),
    p_email
  );

  RETURN jsonb_build_object(
    'success', true,
    'appointment_id', v_result->'appointments'->0->>'appointment_id'
  );
END;
$$;


ALTER FUNCTION "public"."create_public_booking"("p_outlet_id" "text", "p_service_id" "text", "p_date" "text", "p_time" "text", "p_customer_name" "text", "p_phone" "text", "p_email" "text", "p_staff_id" "text", "p_auth_uid" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_public_booking_batch"("p_outlet_id" "text", "p_date" "text", "p_time" "text", "p_customer_name" "text", "p_phone" "text", "p_items" "jsonb", "p_email" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
DECLARE
  v_name text;
  v_phone text;
  v_email text;
  v_date text;
  v_time text;
  v_jwt_uid text;
  v_outlet_ok boolean;
  v_item_count integer;
  v_base_start integer;
  v_item jsonb;
  v_service_id text;
  v_service_name text;
  v_requested_staff text;
  v_staff_id text;
  v_duration integer;
  v_start integer;
  v_end integer;
  v_cursors jsonb := '{}'::jsonb;
  v_client_id text;
  v_customer_id text;
  v_appointment_id text;
  v_appointments jsonb := '[]'::jsonb;
  v_ids jsonb := '[]'::jsonb;
  v_history jsonb;
BEGIN
  v_name := btrim(coalesce(p_customer_name, ''));
  v_phone := btrim(coalesce(p_phone, ''));
  v_email := btrim(coalesce(p_email, ''));
  v_date := btrim(coalesce(p_date, ''));
  v_time := btrim(coalesce(p_time, ''));
  v_jwt_uid := auth.uid()::text;

  IF jsonb_typeof(p_items) <> 'array' THEN
    RAISE EXCEPTION 'Please select at least one service.' USING ERRCODE = '22023';
  END IF;
  v_item_count := jsonb_array_length(p_items);
  IF v_item_count < 1 OR v_item_count > 10 THEN
    RAISE EXCEPTION 'Please select between 1 and 10 services.' USING ERRCODE = '22023';
  END IF;

  IF btrim(coalesce(p_outlet_id, '')) = ''
     OR v_date = '' OR v_time = '' OR v_name = '' OR v_phone = '' THEN
    RAISE EXCEPTION 'outletId, date, time, customerName, and phone are required.'
      USING ERRCODE = '22023';
  END IF;

  IF char_length(v_name) > 200 OR char_length(v_phone) > 40 OR char_length(v_email) > 200 THEN
    RAISE EXCEPTION 'Input too long.' USING ERRCODE = '22023';
  END IF;

  IF v_date !~ '^\d{4}-\d{2}-\d{2}$' THEN
    RAISE EXCEPTION 'Invalid date format.' USING ERRCODE = '22023';
  END IF;

  IF v_time !~ '^\d{1,2}:\d{2}$' THEN
    RAISE EXCEPTION 'Invalid time format.' USING ERRCODE = '22023';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM outlets
    WHERE outlet_id = p_outlet_id AND coalesce(is_active, true) = true
  ) INTO v_outlet_ok;

  IF NOT v_outlet_ok THEN
    RAISE EXCEPTION 'Outlet not found.' USING ERRCODE = 'P0002';
  END IF;

  -- Serialises the whole outlet-day, so two visitors cannot be handed the same
  -- free therapist from the same read. Always taken before the per-staff lock
  -- in the insert trigger, so the two lock in a consistent order.
  PERFORM pg_advisory_xact_lock(hashtextextended(p_outlet_id || '|' || v_date, 0));

  v_base_start := public.parse_time_to_minutes(v_time);

  SELECT id INTO v_client_id
  FROM clients
  WHERE outlet_id = p_outlet_id AND phone = v_phone
  LIMIT 1;

  IF v_client_id IS NULL THEN
    v_client_id := replace(gen_random_uuid()::text, '-', '');
    INSERT INTO clients (id, outlet_id, name, email, phone, notes, points)
    VALUES (v_client_id, p_outlet_id, v_name, v_email, v_phone, 'Public booking', 0);
  END IF;

  -- Authenticated JWT only (a client-supplied id is never trusted).
  IF v_jwt_uid IS NOT NULL THEN
    v_customer_id := v_jwt_uid;
    INSERT INTO frontend_customers (
      id, outlet_id, name, phone, email, client_id, source, created_at, updated_at
    ) VALUES (
      v_customer_id, p_outlet_id, v_name, v_phone, v_email, v_client_id, 'public-booking', now(), now()
    )
    ON CONFLICT (id) DO UPDATE SET
      outlet_id = EXCLUDED.outlet_id,
      name = EXCLUDED.name,
      phone = EXCLUDED.phone,
      email = EXCLUDED.email,
      client_id = EXCLUDED.client_id,
      updated_at = now();
  ELSE
    SELECT id INTO v_customer_id
    FROM frontend_customers
    WHERE outlet_id = p_outlet_id AND phone = v_phone
    LIMIT 1;

    IF v_customer_id IS NULL THEN
      v_customer_id := replace(gen_random_uuid()::text, '-', '');
      INSERT INTO frontend_customers (
        id, outlet_id, name, phone, email, client_id,
        booking_history_refs, source, created_at, updated_at
      ) VALUES (
        v_customer_id, p_outlet_id, v_name, v_phone, v_email, v_client_id,
        '[]'::jsonb, 'public-booking', now(), now()
      );
    ELSE
      UPDATE frontend_customers
      SET name = v_name, email = v_email, client_id = v_client_id, updated_at = now()
      WHERE id = v_customer_id;
    END IF;
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    v_service_id := btrim(coalesce(v_item->>'service_id', ''));
    v_requested_staff := btrim(coalesce(v_item->>'staff_id', ''));

    IF v_service_id = '' THEN
      RAISE EXCEPTION 'A selected service is missing.' USING ERRCODE = '22023';
    END IF;

    SELECT coalesce(duration, 60), name INTO v_duration, v_service_name
    FROM services
    WHERE id = v_service_id
      AND outlet_id = p_outlet_id
      AND coalesce(is_visible, true) = true;

    IF v_duration IS NULL THEN
      RAISE EXCEPTION 'Service not found or does not belong to this outlet.'
        USING ERRCODE = 'P0002';
    END IF;

    IF v_requested_staff <> '' AND EXISTS (
      SELECT 1 FROM staff
      WHERE id = v_requested_staff
        AND lower(btrim(outlet_id)) = lower(btrim(p_outlet_id))
    ) THEN
      -- Named therapist: a second service with the same person follows the
      -- first instead of colliding with it.
      v_staff_id := v_requested_staff;
      v_start := coalesce((v_cursors->>v_staff_id)::integer, v_base_start);
    ELSE
      -- Any available: someone qualified and genuinely free, not already taken
      -- earlier in this same visit. An empty qualified_services means the
      -- therapist covers everything, matching the merchant and booking UIs.
      v_start := v_base_start;
      SELECT s.id INTO v_staff_id
      FROM staff s
      WHERE s.outlet_id = p_outlet_id
        AND (v_cursors->>s.id) IS NULL
        AND (
          s.qualified_services IS NULL
          OR jsonb_typeof(s.qualified_services) <> 'array'
          OR jsonb_array_length(s.qualified_services) = 0
          OR s.qualified_services ? v_service_id
        )
        AND public.staff_free_for_slot(p_outlet_id, s.id, v_date, v_start, v_start + v_duration)
      ORDER BY s.name
      LIMIT 1;

      IF v_staff_id IS NULL THEN
        RAISE EXCEPTION 'No therapist is free for % at that time. Please choose another time.',
          coalesce(nullif(v_service_name, ''), 'that service')
          USING ERRCODE = 'unique_violation';
      END IF;
    END IF;

    v_end := v_start + v_duration;
    v_appointment_id := replace(gen_random_uuid()::text, '-', '');

    INSERT INTO appointments (
      id, outlet_id, client_id, customer_id, staff_id, service_id,
      date, time, end_time, status, source, created_at
    ) VALUES (
      v_appointment_id, p_outlet_id, v_client_id, v_customer_id, v_staff_id, v_service_id,
      v_date,
      public.minutes_to_booking_time(v_start),
      public.minutes_to_booking_time(v_end),
      'scheduled', 'public-booking', now()
    );

    v_cursors := v_cursors || jsonb_build_object(v_staff_id, v_end);
    v_ids := v_ids || to_jsonb(v_appointment_id);
    v_appointments := v_appointments || jsonb_build_object(
      'appointment_id', v_appointment_id,
      'service_id', v_service_id,
      'service_name', coalesce(v_service_name, ''),
      'staff_id', v_staff_id,
      'time', public.minutes_to_booking_time(v_start),
      'end_time', public.minutes_to_booking_time(v_end)
    );
  END LOOP;

  SELECT coalesce(booking_history_refs, '[]'::jsonb) INTO v_history
  FROM frontend_customers WHERE id = v_customer_id;

  IF jsonb_typeof(v_history) <> 'array' THEN
    v_history := '[]'::jsonb;
  END IF;

  UPDATE frontend_customers
  SET booking_history_refs = v_history || v_ids,
      last_appointment_id = v_appointments->-1->>'appointment_id',
      last_booked_at = now(),
      updated_at = now()
  WHERE id = v_customer_id;

  RETURN jsonb_build_object('success', true, 'appointments', v_appointments);
END;
$_$;


ALTER FUNCTION "public"."create_public_booking_batch"("p_outlet_id" "text", "p_date" "text", "p_time" "text", "p_customer_name" "text", "p_phone" "text", "p_items" "jsonb", "p_email" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."current_portal_outlet_id"() RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT outlet_id FROM public.users WHERE uid = auth.uid()::text LIMIT 1;
$$;


ALTER FUNCTION "public"."current_portal_outlet_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_appointment_and_linked_sale"("p_appointment_id" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_outlet_id text := public.current_portal_outlet_id();
  v_appointment public.appointments%rowtype;
  v_sale_id text;
  v_sale_exists boolean := false;
  v_related_appointment_ids text[];
BEGIN
  IF auth.uid() IS NULL OR v_outlet_id IS NULL THEN
    RAISE EXCEPTION 'Authenticated outlet membership required';
  END IF;
  IF nullif(trim(coalesce(p_appointment_id, '')), '') IS NULL THEN
    RAISE EXCEPTION 'Appointment id is required';
  END IF;

  SELECT * INTO v_appointment
  FROM public.appointments
  WHERE id = p_appointment_id AND outlet_id = v_outlet_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'appointment_id', p_appointment_id,
      'transaction_id', NULL,
      'deleted_appointment_ids', '[]'::jsonb,
      'sale_deleted', false,
      'already_missing', true
    );
  END IF;

  v_sale_id := nullif(trim(coalesce(v_appointment.sale_id, v_appointment.source_sale_id, '')), '');

  IF v_sale_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.transactions
      WHERE id = v_sale_id AND outlet_id = v_outlet_id
    ) INTO v_sale_exists;

    SELECT coalesce(array_agg(id), ARRAY[p_appointment_id]::text[])
    INTO v_related_appointment_ids
    FROM public.appointments
    WHERE outlet_id = v_outlet_id
      AND (id = p_appointment_id OR sale_id = v_sale_id OR source_sale_id = v_sale_id);

    DELETE FROM public.appointments
    WHERE outlet_id = v_outlet_id
      AND id = ANY (v_related_appointment_ids);

    IF v_sale_exists THEN
      DELETE FROM public.transactions
      WHERE outlet_id = v_outlet_id
        AND parent_sale_id = v_sale_id
        AND category = 'Commission';

      DELETE FROM public.transactions
      WHERE id = v_sale_id
        AND outlet_id = v_outlet_id;

      INSERT INTO public.audit_logs(outlet_id, actor_user_id, action, target_type, target_id, reason, metadata)
      VALUES (
        v_outlet_id,
        auth.uid(),
        'appointment_deleted_with_sale',
        'transaction',
        v_sale_id,
        'Deleted from Schedule',
        jsonb_build_object(
          'appointment_ids', to_jsonb(v_related_appointment_ids),
          'trigger_appointment_id', p_appointment_id
        )
      );

      RETURN jsonb_build_object(
        'appointment_id', p_appointment_id,
        'transaction_id', v_sale_id,
        'deleted_appointment_ids', to_jsonb(v_related_appointment_ids),
        'sale_deleted', true,
        'already_missing', false
      );
    END IF;

    RETURN jsonb_build_object(
      'appointment_id', p_appointment_id,
      'transaction_id', v_sale_id,
      'deleted_appointment_ids', to_jsonb(v_related_appointment_ids),
      'sale_deleted', false,
      'already_missing', false
    );
  END IF;

  DELETE FROM public.appointments
  WHERE id = p_appointment_id AND outlet_id = v_outlet_id;

  INSERT INTO public.audit_logs(outlet_id, actor_user_id, action, target_type, target_id, reason, metadata)
  VALUES (
    v_outlet_id,
    auth.uid(),
    'appointment_deleted',
    'appointment',
    p_appointment_id,
    'Deleted from Schedule',
    jsonb_build_object('transaction_id', NULL)
  );

  RETURN jsonb_build_object(
    'appointment_id', p_appointment_id,
    'transaction_id', NULL,
    'deleted_appointment_ids', jsonb_build_array(p_appointment_id),
    'sale_deleted', false,
    'already_missing', false
  );
END;
$$;


ALTER FUNCTION "public"."delete_appointment_and_linked_sale"("p_appointment_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ensure_customer_profile"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE v_uid uuid:=auth.uid(); BEGIN IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
 PERFORM public.ensure_identity_profiles(); INSERT INTO public.customer_profiles(user_id) VALUES(v_uid) ON CONFLICT(user_id) DO UPDATE SET updated_at=now();
 RETURN jsonb_build_object('user_id',v_uid); END $$;


ALTER FUNCTION "public"."ensure_customer_profile"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ensure_identity_profiles"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
DECLARE u auth.users%rowtype;
BEGIN SELECT * INTO u FROM auth.users WHERE id=auth.uid(); IF NOT FOUND THEN RAISE EXCEPTION 'Authentication required'; END IF;
 INSERT INTO public.profiles(id,email,full_name,phone,avatar_url) VALUES(u.id,u.email,u.raw_user_meta_data->>'full_name',u.raw_user_meta_data->>'phone',u.raw_user_meta_data->>'avatar_url')
 ON CONFLICT(id) DO UPDATE SET email=excluded.email,updated_at=now();
 RETURN jsonb_build_object('user_id',u.id); END $$;


ALTER FUNCTION "public"."ensure_identity_profiles"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ensure_merchant_workspace"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text;
  v_name text;
  v_outlet text;
  v_slug text;
  v_slug_base text;
  v_pending boolean;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(v_uid::text, 0));
  PERFORM public.ensure_identity_profiles();
  SELECT email INTO v_email FROM auth.users WHERE id = v_uid;

  SELECT om.outlet_id, coalesce(o.settings->>'merchantSetupPending', '') = 'true'
    INTO v_outlet, v_pending
  FROM public.outlet_members om
  JOIN public.outlets o ON o.outlet_id = om.outlet_id
  WHERE om.user_id = v_uid AND om.status = 'active'
  ORDER BY CASE WHEN om.role = 'owner' THEN 0 ELSE 1 END, om.created_at
  LIMIT 1;

  IF v_outlet IS NOT NULL THEN
    RETURN jsonb_build_object(
      'outlet_id', v_outlet,
      'booking_slug', (SELECT booking_slug FROM public.outlets WHERE outlet_id = v_outlet),
      'idempotent', true,
      'role', 'owner',
      'registration_pending', coalesce(v_pending, false)
    );
  END IF;

  v_name := coalesce(
    nullif(trim(coalesce((SELECT full_name FROM public.profiles WHERE id = v_uid), '')), ''),
    nullif(trim(split_part(coalesce(v_email, ''), '@', 1)), ''),
    'My business'
  );
  IF char_length(v_name) < 2 THEN v_name := 'My business'; END IF;

  v_outlet := 'outlet_' || replace(gen_random_uuid()::text, '-', '');
  v_slug_base := coalesce(nullif(public.slugify_booking_name(v_name), ''), 'business');
  v_slug := v_slug_base || '-' || substr(v_outlet, -6);
  WHILE EXISTS (SELECT 1 FROM public.outlets WHERE lower(booking_slug) = lower(v_slug)) LOOP
    v_slug := v_slug_base || '-' || substr(encode(gen_random_bytes(4), 'hex'), 1, 8);
  END LOOP;

  INSERT INTO public.outlets (
    outlet_id, name, email, business_type, owner_user_id, booking_slug,
    is_active, status, onboarding_status, access_status, account_limit, settings
  ) VALUES (
    v_outlet, v_name, v_email, 'other', v_uid, v_slug,
    true, 'active', 'incomplete', 'active', 3,
    jsonb_build_object('merchantSetupPending', true, 'shopName', v_name)
  );

  INSERT INTO public.outlet_members(outlet_id, user_id, role, status)
  VALUES (v_outlet, v_uid, 'owner', 'active');
  INSERT INTO public.onboarding_states(outlet_id) VALUES (v_outlet)
  ON CONFLICT (outlet_id) DO NOTHING;

  INSERT INTO public.users(uid, email, outlet_id, role, display_name)
  VALUES (
    v_uid::text, v_email, v_outlet, 'admin',
    coalesce((SELECT full_name FROM public.profiles WHERE id = v_uid), split_part(coalesce(v_email, ''), '@', 1))
  )
  ON CONFLICT (uid) DO UPDATE
    SET email = excluded.email, outlet_id = excluded.outlet_id, role = 'admin';

  INSERT INTO public.merchant_onboarding_drafts(auth_user_id, current_step, account_type, payload, updated_at)
  VALUES (v_uid, 'account-type', 'create', '{}'::jsonb, now())
  ON CONFLICT (auth_user_id) DO NOTHING;

  INSERT INTO public.audit_logs(outlet_id, actor_user_id, action, target_type, target_id)
  VALUES (v_outlet, v_uid, 'merchant.workspace_ensured', 'outlet', v_outlet);

  RETURN jsonb_build_object(
    'outlet_id', v_outlet,
    'booking_slug', v_slug,
    'idempotent', false,
    'role', 'owner',
    'registration_pending', true
  );
END;
$$;


ALTER FUNCTION "public"."ensure_merchant_workspace"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_public_available_slots"("p_outlet_id" "text", "p_service_id" "text", "p_date" "text", "p_staff_id" "text" DEFAULT NULL::"text") RETURNS "text"[]
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_business_hours jsonb;
  v_duration integer;
  v_day_key text;
  v_today_hours jsonb;
  v_open integer;
  v_close integer;
  v_minutes integer;
  v_slot_end integer;
  v_slots text[] := ARRAY[]::text[];
  v_hh text;
  v_mm text;
  v_overlaps boolean;
BEGIN
  IF p_outlet_id IS NULL OR btrim(p_outlet_id) = ''
     OR p_service_id IS NULL OR btrim(p_service_id) = ''
     OR p_date IS NULL OR btrim(p_date) = '' THEN
    RETURN v_slots;
  END IF;

  SELECT business_hours INTO v_business_hours
  FROM outlets
  WHERE outlet_id = p_outlet_id AND COALESCE(is_active, true) = true;

  IF v_business_hours IS NULL THEN
    RETURN v_slots;
  END IF;

  SELECT COALESCE(duration, 60) INTO v_duration
  FROM services
  WHERE id = p_service_id AND outlet_id = p_outlet_id;

  IF v_duration IS NULL THEN
    RETURN v_slots;
  END IF;

  v_day_key := CASE EXTRACT(DOW FROM p_date::date)::integer
    WHEN 0 THEN 'sunday'
    WHEN 1 THEN 'monday'
    WHEN 2 THEN 'tuesday'
    WHEN 3 THEN 'wednesday'
    WHEN 4 THEN 'thursday'
    WHEN 5 THEN 'friday'
    ELSE 'saturday'
  END;
  v_today_hours := v_business_hours -> v_day_key;

  IF v_today_hours IS NULL OR (v_today_hours ? 'isOpen' AND (v_today_hours ->> 'isOpen')::boolean = false) THEN
    RETURN v_slots;
  END IF;

  v_open := public.parse_time_to_minutes(v_today_hours ->> 'open');
  v_close := public.parse_time_to_minutes(v_today_hours ->> 'close');
  IF v_close <= v_open THEN
    RETURN v_slots;
  END IF;

  v_minutes := v_open;
  WHILE v_minutes < v_close LOOP
    v_slot_end := v_minutes + v_duration;
    IF v_slot_end > v_close THEN
      EXIT;
    END IF;

    SELECT EXISTS (
      SELECT 1
      FROM appointments a
      WHERE a.outlet_id = p_outlet_id
        AND a.date = p_date
        AND COALESCE(a.status, '') NOT IN ('cancelled', 'no-show')
        AND (
          p_staff_id IS NULL
          OR btrim(p_staff_id) = ''
          OR a.staff_id = p_staff_id
        )
        AND v_minutes < CASE
          WHEN public.parse_time_to_minutes(COALESCE(a.end_time, a.time))
               > public.parse_time_to_minutes(a.time)
          THEN public.parse_time_to_minutes(COALESCE(a.end_time, a.time))
          ELSE public.parse_time_to_minutes(a.time) + v_duration
        END
        AND v_slot_end > public.parse_time_to_minutes(a.time)
    ) INTO v_overlaps;

    IF NOT v_overlaps THEN
      v_hh := lpad((v_minutes / 60)::text, 2, '0');
      v_mm := lpad((v_minutes % 60)::text, 2, '0');
      v_slots := array_append(v_slots, v_hh || ':' || v_mm);
    END IF;

    v_minutes := v_minutes + 30;
  END LOOP;

  RETURN v_slots;
END;
$$;


ALTER FUNCTION "public"."get_public_available_slots"("p_outlet_id" "text", "p_service_id" "text", "p_date" "text", "p_staff_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_public_outlet"("p_outlet_id" "text") RETURNS TABLE("outlet_id" "text", "name" "text", "address_display" "text", "phone_number" "text", "phone" "text", "timezone" "text", "business_hours" "jsonb", "reviews" "jsonb", "service_categories" "jsonb", "booking_slug" "text", "is_active" boolean)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT
    o.outlet_id,
    o.name,
    o.address_display,
    o.phone_number,
    o.phone,
    o.timezone,
    o.business_hours,
    o.reviews,
    o.service_categories,
    o.booking_slug,
    o.is_active
  FROM public.outlets o
  WHERE o.outlet_id = btrim(COALESCE(p_outlet_id, ''))
    AND COALESCE(o.is_active, true) = true
  LIMIT 1;
$$;


ALTER FUNCTION "public"."get_public_outlet"("p_outlet_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."google_api_rate_limit_hit"("p_bucket" "text", "p_limit" integer, "p_window_seconds" integer) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_count integer;
BEGIN
  INSERT INTO public.google_api_rate_limits (bucket, window_started_at, request_count)
  VALUES (p_bucket, now(), 1)
  ON CONFLICT (bucket) DO UPDATE
  SET
    window_started_at = CASE
      WHEN public.google_api_rate_limits.window_started_at < now() - make_interval(secs => p_window_seconds)
        THEN now()
      ELSE public.google_api_rate_limits.window_started_at
    END,
    request_count = CASE
      WHEN public.google_api_rate_limits.window_started_at < now() - make_interval(secs => p_window_seconds)
        THEN 1
      ELSE public.google_api_rate_limits.request_count + 1
    END
  RETURNING request_count INTO v_count;

  RETURN v_count <= p_limit;
END;
$$;


ALTER FUNCTION "public"."google_api_rate_limit_hit"("p_bucket" "text", "p_limit" integer, "p_window_seconds" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."google_business_purge_expired"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  DELETE FROM public.google_oauth_states WHERE expires_at < now();
  DELETE FROM public.google_review_cursors WHERE expires_at < now();
  DELETE FROM public.google_review_page_cache WHERE expires_at < now();
END;
$$;


ALTER FUNCTION "public"."google_business_purge_expired"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_outlet_role"("p_outlet_id" "text", "p_roles" "text"[]) RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT public.is_current_account_enabled() AND EXISTS(
    SELECT 1 FROM public.outlet_members WHERE outlet_id=p_outlet_id AND user_id=auth.uid() AND status='active' AND role=ANY(p_roles)
  )
$$;


ALTER FUNCTION "public"."has_outlet_role"("p_outlet_id" "text", "p_roles" "text"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_current_account_enabled"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT auth.uid() IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.platform_account_controls c
    WHERE c.user_id = auth.uid() AND c.status = 'suspended'
  )
$$;


ALTER FUNCTION "public"."is_current_account_enabled"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_outlet_member"("p_outlet_id" "text") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT public.is_current_account_enabled() AND EXISTS(
    SELECT 1 FROM public.outlet_members WHERE outlet_id=p_outlet_id AND user_id=auth.uid() AND status='active'
  )
$$;


ALTER FUNCTION "public"."is_outlet_member"("p_outlet_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_platform_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
 SELECT EXISTS(SELECT 1 FROM public.platform_admins WHERE user_id=auth.uid() AND status='active') $$;


ALTER FUNCTION "public"."is_platform_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_portal_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE uid = auth.uid()::text
      AND lower(COALESCE(role, '')) IN ('admin', 'platform_admin')
  );
$$;


ALTER FUNCTION "public"."is_portal_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_portal_platform_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$ SELECT public.is_platform_admin() $$;


ALTER FUNCTION "public"."is_portal_platform_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."merchant_account_deletion_request_status"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_row public.platform_account_deletion_requests%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT * INTO v_row
  FROM public.platform_account_deletion_requests
  WHERE requesting_user_uid = v_uid
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('has_request', false);
  END IF;

  RETURN jsonb_build_object(
    'has_request', true,
    'id', v_row.id,
    'status', v_row.status,
    'created_at', v_row.created_at,
    'processed_at', v_row.processed_at,
    'active', v_row.status IN ('pending', 'in_review')
  );
END $$;


ALTER FUNCTION "public"."merchant_account_deletion_request_status"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."merchant_adjust_client_credit"("p_client_id" "text", "p_outlet_id" "text", "p_type" "text", "p_amount" numeric, "p_staff_remark" "text" DEFAULT NULL::"text", "p_staff_name" "text" DEFAULT NULL::"text", "p_transaction_id" "text" DEFAULT NULL::"text") RETURNS numeric
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_outlet text;
  v_prev numeric;
  v_new numeric;
  v_delta numeric;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive.' USING ERRCODE = '22023';
  END IF;

  IF NOT (
    public.is_portal_platform_admin()
    OR public.current_portal_outlet_id() = p_outlet_id
  ) THEN
    RAISE EXCEPTION 'Not allowed for this outlet.' USING ERRCODE = '42501';
  END IF;

  SELECT outlet_id, COALESCE(credit, 0) INTO v_outlet, v_prev
  FROM clients WHERE id = p_client_id FOR UPDATE;

  IF v_outlet IS NULL OR v_outlet <> p_outlet_id THEN
    RAISE EXCEPTION 'Client not found for outlet.' USING ERRCODE = 'P0002';
  END IF;

  IF lower(p_type) = 'topup' THEN
    v_delta := p_amount;
  ELSE
    v_delta := -p_amount;
  END IF;

  v_new := v_prev + v_delta;
  IF v_new < 0 THEN
    RAISE EXCEPTION 'Insufficient credit balance.' USING ERRCODE = '22023';
  END IF;

  UPDATE clients SET credit = v_new WHERE id = p_client_id;

  INSERT INTO credit_history (
    id, client_id, outlet_id, type, amount, new_balance,
    staff_remark, staff_name, timestamp, transaction_id
  ) VALUES (
    replace(gen_random_uuid()::text, '-', ''),
    p_client_id, p_outlet_id, p_type, p_amount, v_new,
    COALESCE(NULLIF(btrim(p_staff_remark), ''), CASE WHEN lower(p_type) = 'topup' THEN 'Top up' ELSE 'Deduction' END),
    p_staff_name,
    now(),
    p_transaction_id
  );

  RETURN v_new;
END;
$$;


ALTER FUNCTION "public"."merchant_adjust_client_credit"("p_client_id" "text", "p_outlet_id" "text", "p_type" "text", "p_amount" numeric, "p_staff_remark" "text", "p_staff_name" "text", "p_transaction_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."merchant_adjust_client_outstanding"("p_client_id" "text", "p_outlet_id" "text", "p_type" "text", "p_amount" numeric, "p_timestamp" timestamp with time zone DEFAULT "now"()) RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_outlet text;
  v_prev numeric;
  v_new numeric;
  v_delta numeric;
  v_id text;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive.' USING ERRCODE = '22023';
  END IF;

  IF NOT (
    public.is_portal_platform_admin()
    OR public.current_portal_outlet_id() = p_outlet_id
  ) THEN
    RAISE EXCEPTION 'Not allowed for this outlet.' USING ERRCODE = '42501';
  END IF;

  SELECT outlet_id, COALESCE(outstanding, 0) INTO v_outlet, v_prev
  FROM clients WHERE id = p_client_id FOR UPDATE;

  IF v_outlet IS NULL OR v_outlet <> p_outlet_id THEN
    RAISE EXCEPTION 'Client not found for outlet.' USING ERRCODE = 'P0002';
  END IF;

  IF p_type = 'Add' THEN
    v_delta := p_amount;
  ELSE
    v_delta := -p_amount;
  END IF;

  v_new := GREATEST(0, v_prev + v_delta);
  UPDATE clients SET outstanding = v_new WHERE id = p_client_id;

  v_id := replace(gen_random_uuid()::text, '-', '');
  INSERT INTO outstanding_transactions (
    id, client_id, outlet_id, type, amount, previous_balance, new_balance,
    timestamp, is_manual
  ) VALUES (
    v_id, p_client_id, p_outlet_id, p_type, p_amount, v_prev, v_new,
    COALESCE(p_timestamp, now()), true
  );

  RETURN v_id;
END;
$$;


ALTER FUNCTION "public"."merchant_adjust_client_outstanding"("p_client_id" "text", "p_outlet_id" "text", "p_type" "text", "p_amount" numeric, "p_timestamp" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."merchant_adjust_client_points"("p_client_id" "text", "p_outlet_id" "text", "p_type" "text", "p_amount" numeric, "p_is_manual" boolean DEFAULT true, "p_description" "text" DEFAULT NULL::"text") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_outlet text;
  v_prev integer;
  v_new integer;
  v_delta integer;
  v_id text;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive.' USING ERRCODE = '22023';
  END IF;

  IF NOT (
    public.is_portal_platform_admin()
    OR public.current_portal_outlet_id() = p_outlet_id
  ) THEN
    RAISE EXCEPTION 'Not allowed for this outlet.' USING ERRCODE = '42501';
  END IF;

  SELECT outlet_id, COALESCE(points, 0) INTO v_outlet, v_prev
  FROM clients WHERE id = p_client_id FOR UPDATE;

  IF v_outlet IS NULL OR v_outlet <> p_outlet_id THEN
    RAISE EXCEPTION 'Client not found for outlet.' USING ERRCODE = 'P0002';
  END IF;

  IF lower(p_type) LIKE 'topup%' OR p_type = 'Topup' THEN
    v_delta := p_amount::integer;
  ELSE
    v_delta := -p_amount::integer;
  END IF;

  v_new := GREATEST(0, v_prev + v_delta);
  UPDATE clients SET points = v_new WHERE id = p_client_id;

  v_id := replace(gen_random_uuid()::text, '-', '');
  INSERT INTO point_transactions (
    id, client_id, outlet_id, type, amount, previous_balance, new_balance,
    timestamp, is_manual, description
  ) VALUES (
    v_id, p_client_id, p_outlet_id, p_type, p_amount, v_prev, v_new,
    now(), COALESCE(p_is_manual, true), p_description
  );

  RETURN v_id;
END;
$$;


ALTER FUNCTION "public"."merchant_adjust_client_points"("p_client_id" "text", "p_outlet_id" "text", "p_type" "text", "p_amount" numeric, "p_is_manual" boolean, "p_description" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."merchant_credit_points_for_sale"("p_client_id" "text", "p_sale_id" "text", "p_points" integer, "p_outlet_id" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_outlet text;
  v_prev numeric;
  v_new numeric;
  v_txn_id text;
BEGIN
  IF p_points IS NULL OR p_points <= 0 THEN
    RETURN false;
  END IF;

  IF NOT (
    public.is_portal_platform_admin()
    OR public.current_portal_outlet_id() = p_outlet_id
  ) THEN
    RAISE EXCEPTION 'Not allowed for this outlet.' USING ERRCODE = '42501';
  END IF;

  SELECT outlet_id, COALESCE(points, 0)
  INTO v_outlet, v_prev
  FROM clients
  WHERE id = p_client_id
  FOR UPDATE;

  IF v_outlet IS NULL OR v_outlet <> p_outlet_id THEN
    RAISE EXCEPTION 'Client not found for outlet.' USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO points_credits (client_id, sale_id, points)
  VALUES (p_client_id, p_sale_id, p_points)
  ON CONFLICT (client_id, sale_id) DO NOTHING;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  v_new := v_prev + p_points;
  UPDATE clients SET points = v_new WHERE id = p_client_id;

  v_txn_id := replace(gen_random_uuid()::text, '-', '');
  INSERT INTO point_transactions (
    id, client_id, outlet_id, type, amount, previous_balance, new_balance,
    timestamp, is_manual, description
  ) VALUES (
    v_txn_id,
    p_client_id,
    p_outlet_id,
    'Topup',
    p_points,
    v_prev,
    v_new,
    now(),
    false,
    'Sale #' || p_sale_id
  );

  RETURN true;
END;
$$;


ALTER FUNCTION "public"."merchant_credit_points_for_sale"("p_client_id" "text", "p_sale_id" "text", "p_points" integer, "p_outlet_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."merchant_dashboard_aggregates"("p_outlet_id" "text", "p_month_start" "date", "p_month_end" "date", "p_week_start" "date", "p_week_end" "date", "p_today" "date", "p_yesterday" "date", "p_prev_week_start" "date", "p_prev_week_end" "date", "p_prev_month_start" "date", "p_prev_month_end" "date") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_result jsonb;
  v_revenue numeric := 0;
  v_expenses numeric := 0;
  v_expense_count integer := 0;
  v_client_count integer := 0;
  v_appt_count integer := 0;
  v_outstanding_total numeric := 0;
  v_outstanding_count integer := 0;
  v_week_txn_count integer := 0;
  v_week_sales numeric := 0;
  v_month_sale_count integer := 0;
BEGIN
  IF p_outlet_id IS NULL OR btrim(p_outlet_id) = '' THEN
    RAISE EXCEPTION 'outlet_id is required.' USING ERRCODE = '22023';
  END IF;

  IF NOT (
    public.is_portal_platform_admin()
    OR public.current_portal_outlet_id() = p_outlet_id
  ) THEN
    RAISE EXCEPTION 'Not allowed for this outlet.' USING ERRCODE = '42501';
  END IF;

  -- Client count (full CRM headcount; matches Dashboard clients.length)
  SELECT COUNT(*)::integer INTO v_client_count
  FROM public.clients c
  WHERE c.outlet_id = p_outlet_id;

  -- Appointments this month (exclude cancelled + synthetic on-duty rows)
  SELECT COUNT(*)::integer INTO v_appt_count
  FROM public.appointments a
  WHERE a.outlet_id = p_outlet_id
    AND a.date >= p_month_start::text
    AND a.date <= p_month_end::text
    AND COALESCE(lower(a.status), '') <> 'cancelled'
    AND a.id NOT LIKE 'app_onduty_%';

  -- Month revenue (Dashboard definition)
  SELECT COALESCE(SUM(t.amount), 0) INTO v_revenue
  FROM public.transactions t
  WHERE t.outlet_id = p_outlet_id
    AND t.type = 'SALE'
    AND lower(COALESCE(t.status, '')) NOT IN ('void', 'voided')
    AND COALESCE(t.category, '') NOT IN ('Voucher', 'Redemption')
    AND (timezone('Asia/Kuala_Lumpur', t.date))::date >= p_month_start
    AND (timezone('Asia/Kuala_Lumpur', t.date))::date <= p_month_end;

  -- Month expenses (Dashboard definition: void status excluded)
  SELECT COALESCE(SUM(t.amount), 0), COUNT(*)::integer
  INTO v_expenses, v_expense_count
  FROM public.transactions t
  WHERE t.outlet_id = p_outlet_id
    AND t.type = 'EXPENSE'
    AND lower(COALESCE(t.status, '')) NOT IN ('void', 'voided')
    AND (timezone('Asia/Kuala_Lumpur', t.date))::date >= p_month_start
    AND (timezone('Asia/Kuala_Lumpur', t.date))::date <= p_month_end;

  -- Outstanding from month sales (includes Voucher/Redemption; void excluded)
  SELECT
    COALESCE(SUM(
      CASE
        WHEN COALESCE(t.payment_status, '') = 'partial' OR COALESCE(t.outstanding, 0) > 0
          THEN COALESCE(t.outstanding, t.amount, 0)
        ELSE 0
      END
    ), 0),
    COALESCE(SUM(
      CASE
        WHEN COALESCE(t.payment_status, '') = 'partial' OR COALESCE(t.outstanding, 0) > 0
          THEN 1 ELSE 0
      END
    ), 0)::integer
  INTO v_outstanding_total, v_outstanding_count
  FROM public.transactions t
  WHERE t.outlet_id = p_outlet_id
    AND t.type = 'SALE'
    AND lower(COALESCE(t.status, '')) NOT IN ('void', 'voided')
    AND (timezone('Asia/Kuala_Lumpur', t.date))::date >= p_month_start
    AND (timezone('Asia/Kuala_Lumpur', t.date))::date <= p_month_end;

  -- Week sales totals for chart footer
  SELECT COALESCE(SUM(t.amount), 0), COUNT(*)::integer
  INTO v_week_sales, v_week_txn_count
  FROM public.transactions t
  WHERE t.outlet_id = p_outlet_id
    AND t.type = 'SALE'
    AND lower(COALESCE(t.status, '')) NOT IN ('void', 'voided')
    AND COALESCE(t.category, '') NOT IN ('Voucher', 'Redemption')
    AND (timezone('Asia/Kuala_Lumpur', t.date))::date >= p_week_start
    AND (timezone('Asia/Kuala_Lumpur', t.date))::date <= p_week_end;

  SELECT COUNT(*)::integer INTO v_month_sale_count
  FROM public.transactions t
  WHERE t.outlet_id = p_outlet_id
    AND t.type = 'SALE'
    AND lower(COALESCE(t.status, '')) NOT IN ('void', 'voided')
    AND (timezone('Asia/Kuala_Lumpur', t.date))::date >= p_month_start
    AND (timezone('Asia/Kuala_Lumpur', t.date))::date <= p_month_end;

  SELECT jsonb_build_object(
    'revenue', v_revenue,
    'expenses', v_expenses,
    'expense_txn_count', v_expense_count,
    'profit', v_revenue - v_expenses,
    'client_count', v_client_count,
    'appointment_count', v_appt_count,
    'outstanding_total', v_outstanding_total,
    'outstanding_count', v_outstanding_count,
    'month_sale_count', v_month_sale_count,
    'week_sales', v_week_sales,
    'week_txn_count', v_week_txn_count,
    'payment_summary', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('method', method, 'amount', amount) ORDER BY amount DESC)
      FROM (
        SELECT COALESCE(NULLIF(btrim(t.payment_method), ''), 'Other') AS method,
               SUM(t.amount) AS amount
        FROM public.transactions t
        WHERE t.outlet_id = p_outlet_id
          AND t.type = 'SALE'
          AND lower(COALESCE(t.status, '')) NOT IN ('void', 'voided')
          AND (timezone('Asia/Kuala_Lumpur', t.date))::date >= p_month_start
          AND (timezone('Asia/Kuala_Lumpur', t.date))::date <= p_month_end
        GROUP BY 1
      ) p
    ), '[]'::jsonb),
    'category_summary', jsonb_build_object(
      'service', COALESCE((
        SELECT SUM(
          CASE
            WHEN t.items IS NULL OR t.items = '[]'::jsonb THEN t.amount
            ELSE COALESCE((item->>'price')::numeric, 0)
              * COALESCE(NULLIF((item->>'quantity')::numeric, 0), 1)
          END
        )
        FROM public.transactions t
        LEFT JOIN LATERAL jsonb_array_elements(
          CASE WHEN t.items IS NULL OR t.items = '[]'::jsonb THEN '[{"type":"service"}]'::jsonb ELSE t.items END
        ) item ON TRUE
        WHERE t.outlet_id = p_outlet_id
          AND t.type = 'SALE'
          AND lower(COALESCE(t.status, '')) NOT IN ('void', 'voided')
          AND (timezone('Asia/Kuala_Lumpur', t.date))::date >= p_month_start
          AND (timezone('Asia/Kuala_Lumpur', t.date))::date <= p_month_end
          AND NOT (COALESCE(t.payment_status, '') = 'partial' OR COALESCE(t.outstanding, 0) > 0)
          AND NOT (COALESCE(t.category, '') = 'Redemption' OR lower(COALESCE(t.description, '')) LIKE '%discount%')
          AND (t.items IS NULL OR t.items = '[]'::jsonb OR item->>'type' = 'service')
      ), 0),
      'product', COALESCE((
        SELECT SUM(
          COALESCE((item->>'price')::numeric, 0)
          * COALESCE(NULLIF((item->>'quantity')::numeric, 0), 1)
        )
        FROM public.transactions t
        CROSS JOIN LATERAL jsonb_array_elements(COALESCE(t.items, '[]'::jsonb)) item
        WHERE t.outlet_id = p_outlet_id
          AND t.type = 'SALE'
          AND lower(COALESCE(t.status, '')) NOT IN ('void', 'voided')
          AND (timezone('Asia/Kuala_Lumpur', t.date))::date >= p_month_start
          AND (timezone('Asia/Kuala_Lumpur', t.date))::date <= p_month_end
          AND NOT (COALESCE(t.payment_status, '') = 'partial' OR COALESCE(t.outstanding, 0) > 0)
          AND item->>'type' = 'product'
      ), 0),
      'package', COALESCE((
        SELECT SUM(
          COALESCE((item->>'price')::numeric, 0)
          * COALESCE(NULLIF((item->>'quantity')::numeric, 0), 1)
        )
        FROM public.transactions t
        CROSS JOIN LATERAL jsonb_array_elements(COALESCE(t.items, '[]'::jsonb)) item
        WHERE t.outlet_id = p_outlet_id
          AND t.type = 'SALE'
          AND lower(COALESCE(t.status, '')) NOT IN ('void', 'voided')
          AND (timezone('Asia/Kuala_Lumpur', t.date))::date >= p_month_start
          AND (timezone('Asia/Kuala_Lumpur', t.date))::date <= p_month_end
          AND NOT (COALESCE(t.payment_status, '') = 'partial' OR COALESCE(t.outstanding, 0) > 0)
          AND item->>'type' = 'package'
      ), 0),
      'discount', COALESCE((
        SELECT SUM(t.amount)
        FROM public.transactions t
        WHERE t.outlet_id = p_outlet_id
          AND t.type = 'SALE'
          AND lower(COALESCE(t.status, '')) NOT IN ('void', 'voided')
          AND (timezone('Asia/Kuala_Lumpur', t.date))::date >= p_month_start
          AND (timezone('Asia/Kuala_Lumpur', t.date))::date <= p_month_end
          AND NOT (COALESCE(t.payment_status, '') = 'partial' OR COALESCE(t.outstanding, 0) > 0)
          AND (COALESCE(t.category, '') = 'Redemption' OR lower(COALESCE(t.description, '')) LIKE '%discount%')
      ), 0),
      'outstanding', v_outstanding_total
    ),
    'top_selling', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'name', name,
        'type', item_type,
        'quantity', quantity,
        'amount', amount
      ) ORDER BY quantity DESC)
      FROM (
        SELECT
          COALESCE(item->>'name', 'Item') AS name,
          COALESCE(item->>'type', 'service') AS item_type,
          SUM(COALESCE(NULLIF((item->>'quantity')::numeric, 0), 1)) AS quantity,
          SUM(
            COALESCE((item->>'price')::numeric, 0)
            * COALESCE(NULLIF((item->>'quantity')::numeric, 0), 1)
          ) AS amount
        FROM public.transactions t
        CROSS JOIN LATERAL jsonb_array_elements(COALESCE(t.items, '[]'::jsonb)) item
        WHERE t.outlet_id = p_outlet_id
          AND t.type = 'SALE'
          AND lower(COALESCE(t.status, '')) NOT IN ('void', 'voided')
          AND COALESCE(t.category, '') <> 'Redemption'
          AND lower(COALESCE(t.description, '')) NOT LIKE '%discount%'
          AND (timezone('Asia/Kuala_Lumpur', t.date))::date >= p_month_start
          AND (timezone('Asia/Kuala_Lumpur', t.date))::date <= p_month_end
        GROUP BY 1, 2
        ORDER BY quantity DESC
        LIMIT 5
      ) top
    ), '[]'::jsonb),
    'week_chart', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('day', dlabel, 'sales', sales) ORDER BY dord)
      FROM (
        SELECT
          EXTRACT(ISODOW FROM d)::integer AS dord,
          CASE EXTRACT(ISODOW FROM d)::integer
            WHEN 1 THEN 'Mon' WHEN 2 THEN 'Tue' WHEN 3 THEN 'Wed'
            WHEN 4 THEN 'Thu' WHEN 5 THEN 'Fri' WHEN 6 THEN 'Sat' ELSE 'Sun'
          END AS dlabel,
          COALESCE((
            SELECT SUM(t.amount)
            FROM public.transactions t
            WHERE t.outlet_id = p_outlet_id
              AND t.type = 'SALE'
              AND lower(COALESCE(t.status, '')) NOT IN ('void', 'voided')
              AND COALESCE(t.category, '') NOT IN ('Voucher', 'Redemption')
              AND (timezone('Asia/Kuala_Lumpur', t.date))::date = d
          ), 0) AS sales
        FROM generate_series(p_week_start, p_week_end, '1 day'::interval) AS g(d)
      ) days
    ), '[]'::jsonb),
    'periods', jsonb_build_object(
      'today', jsonb_build_object(
        'total', public._merchant_revenue_between(p_outlet_id, p_today, p_today),
        'prev', public._merchant_revenue_between(p_outlet_id, p_yesterday, p_yesterday)
      ),
      'week', jsonb_build_object(
        'total', public._merchant_revenue_between(p_outlet_id, p_week_start, p_week_end),
        'prev', public._merchant_revenue_between(p_outlet_id, p_prev_week_start, p_prev_week_end)
      ),
      'month', jsonb_build_object(
        'total', public._merchant_revenue_between(p_outlet_id, p_month_start, p_month_end),
        'prev', public._merchant_revenue_between(p_outlet_id, p_prev_month_start, p_prev_month_end)
      )
    ),
    'visitors', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'client_id', client_id,
        'name', name,
        'spent', spent,
        'points', points
      ) ORDER BY spent DESC)
      FROM (
        SELECT
          t.client_id,
          COALESCE(c.name, 'Unknown') AS name,
          SUM(t.amount) AS spent,
          COALESCE(c.points, 0) AS points
        FROM public.transactions t
        JOIN public.clients c ON c.id = t.client_id AND c.outlet_id = p_outlet_id
        WHERE t.outlet_id = p_outlet_id
          AND t.type = 'SALE'
          AND lower(COALESCE(t.status, '')) NOT IN ('void', 'voided')
          AND t.client_id IS NOT NULL
          AND (timezone('Asia/Kuala_Lumpur', t.date))::date >= p_month_start
          AND (timezone('Asia/Kuala_Lumpur', t.date))::date <= p_month_end
        GROUP BY t.client_id, c.name, c.points
        ORDER BY spent DESC
        LIMIT 10
      ) v
    ), '[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."merchant_dashboard_aggregates"("p_outlet_id" "text", "p_month_start" "date", "p_month_end" "date", "p_week_start" "date", "p_week_end" "date", "p_today" "date", "p_yesterday" "date", "p_prev_week_start" "date", "p_prev_week_end" "date", "p_prev_month_start" "date", "p_prev_month_end" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."merchant_monthly_report_summary"("p_outlet_id" "text", "p_year" integer, "p_month" integer) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_start timestamptz;
  v_end timestamptz;
  v_collection_total numeric := 0;
  v_voided_count integer := 0;
  v_voided_sales numeric := 0;
  v_total_count integer := 0;
  v_total_expenses numeric := 0;
  v_customer_pax integer := 0;
  v_service numeric := 0;
  v_product numeric := 0;
  v_package numeric := 0;
BEGIN
  IF p_outlet_id IS NULL OR btrim(p_outlet_id) = '' THEN
    RAISE EXCEPTION 'outlet_id is required.' USING ERRCODE = '22023';
  END IF;
  IF p_year IS NULL OR p_month IS NULL OR p_month < 1 OR p_month > 12 THEN
    RAISE EXCEPTION 'Invalid year/month.' USING ERRCODE = '22023';
  END IF;

  IF NOT (
    public.is_portal_platform_admin()
    OR public.current_portal_outlet_id() = p_outlet_id
  ) THEN
    RAISE EXCEPTION 'Not allowed for this outlet.' USING ERRCODE = '42501';
  END IF;

  v_start := make_timestamptz(p_year, p_month, 1, 0, 0, 0, 'Asia/Kuala_Lumpur');
  v_end := (v_start + INTERVAL '1 month') - INTERVAL '1 millisecond';

  SELECT
    COALESCE(SUM(CASE
      WHEN NOT (lower(COALESCE(t.status, '')) = 'voided' OR COALESCE(t.voided, false))
        THEN t.amount ELSE 0 END), 0),
    COUNT(*) FILTER (
      WHERE NOT (lower(COALESCE(t.status, '')) = 'voided' OR COALESCE(t.voided, false))
    )::integer,
    COUNT(*) FILTER (
      WHERE lower(COALESCE(t.status, '')) = 'voided' OR COALESCE(t.voided, false)
    )::integer,
    COALESCE(SUM(CASE
      WHEN lower(COALESCE(t.status, '')) = 'voided' OR COALESCE(t.voided, false)
        THEN t.amount ELSE 0 END), 0),
    COUNT(DISTINCT t.client_id) FILTER (
      WHERE t.client_id IS NOT NULL
        AND NOT (lower(COALESCE(t.status, '')) = 'voided' OR COALESCE(t.voided, false))
    )::integer
  INTO v_collection_total, v_total_count, v_voided_count, v_voided_sales, v_customer_pax
  FROM public.transactions t
  WHERE t.outlet_id = p_outlet_id
    AND t.type = 'SALE'
    AND t.date >= v_start
    AND t.date <= v_end;

  SELECT
    COALESCE(SUM(CASE WHEN item->>'type' = 'service' THEN
      COALESCE((item->>'price')::numeric, 0) * COALESCE(NULLIF((item->>'quantity')::numeric, 0), 1)
    ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN item->>'type' = 'product' THEN
      COALESCE((item->>'price')::numeric, 0) * COALESCE(NULLIF((item->>'quantity')::numeric, 0), 1)
    ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN item->>'type' = 'package' THEN
      COALESCE((item->>'price')::numeric, 0) * COALESCE(NULLIF((item->>'quantity')::numeric, 0), 1)
    ELSE 0 END), 0)
  INTO v_service, v_product, v_package
  FROM public.transactions t
  CROSS JOIN LATERAL jsonb_array_elements(COALESCE(t.items, '[]'::jsonb)) item
  WHERE t.outlet_id = p_outlet_id
    AND t.type = 'SALE'
    AND t.date >= v_start
    AND t.date <= v_end
    AND NOT (lower(COALESCE(t.status, '')) = 'voided' OR COALESCE(t.voided, false));

  SELECT COALESCE(SUM(t.amount), 0) INTO v_total_expenses
  FROM public.transactions t
  WHERE t.outlet_id = p_outlet_id
    AND t.type = 'EXPENSE'
    AND t.date >= v_start
    AND t.date <= v_end;

  RETURN jsonb_build_object(
    'collection_total', v_collection_total,
    'sales_total', v_collection_total,
    'total_count', v_total_count,
    'voided_count', v_voided_count,
    'voided_sales', v_voided_sales,
    'customer_pax', v_customer_pax,
    'service', v_service,
    'product', v_product,
    'package', v_package,
    'total_expenses', v_total_expenses,
    'total_collection', v_collection_total,
    'closing_balance', v_collection_total - v_total_expenses,
    'average_sales', CASE WHEN v_total_count > 0 THEN v_collection_total / v_total_count ELSE 0 END,
    'collection', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('name', method, 'value', amount) ORDER BY amount DESC)
      FROM (
        SELECT COALESCE(NULLIF(btrim(t.payment_method), ''), 'Other') AS method,
               SUM(t.amount) AS amount
        FROM public.transactions t
        WHERE t.outlet_id = p_outlet_id
          AND t.type = 'SALE'
          AND t.date >= v_start
          AND t.date <= v_end
          AND NOT (lower(COALESCE(t.status, '')) = 'voided' OR COALESCE(t.voided, false))
        GROUP BY 1
      ) c
    ), '[]'::jsonb),
    'expenses', COALESCE((
      SELECT jsonb_object_agg(cat, amt)
      FROM (
        SELECT
          CASE
            WHEN btrim(COALESCE(t.category, '')) IN ('Rent','Supplies','Utilities','Marketing','Payroll','Commission')
              THEN btrim(t.category)
            ELSE 'Other'
          END AS cat,
          SUM(t.amount) AS amt
        FROM public.transactions t
        WHERE t.outlet_id = p_outlet_id
          AND t.type = 'EXPENSE'
          AND t.date >= v_start
          AND t.date <= v_end
        GROUP BY 1
      ) e
    ), '{}'::jsonb)
  );
END;
$$;


ALTER FUNCTION "public"."merchant_monthly_report_summary"("p_outlet_id" "text", "p_year" integer, "p_month" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."merchant_reverse_manual_point_transaction"("p_transaction_id" "text", "p_outlet_id" "text") RETURNS numeric
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_txn point_transactions%ROWTYPE;
  v_client_outlet text;
  v_prev integer;
  v_delta integer;
  v_new integer;
  v_total_remaining integer;
  v_run integer;
  v_row_delta integer;
  r RECORD;
BEGIN
  IF p_transaction_id IS NULL OR length(trim(p_transaction_id)) = 0 THEN
    RAISE EXCEPTION 'Transaction id is required.' USING ERRCODE = '22023';
  END IF;

  IF NOT (
    public.is_portal_platform_admin()
    OR public.current_portal_outlet_id() = p_outlet_id
  ) THEN
    RAISE EXCEPTION 'Not allowed for this outlet.' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_txn
  FROM point_transactions
  WHERE id = p_transaction_id
    AND outlet_id = p_outlet_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Point transaction not found.' USING ERRCODE = 'P0002';
  END IF;

  IF COALESCE(v_txn.is_manual, false) IS NOT TRUE THEN
    RAISE EXCEPTION 'Only manual point adjustments can be deleted.' USING ERRCODE = '22023';
  END IF;

  IF NOT (
    v_txn.type = 'Topup'
    OR v_txn.type = 'Redeem'
    OR lower(v_txn.type) LIKE 'topup%'
    OR lower(v_txn.type) LIKE 'redeem%'
  ) THEN
    RAISE EXCEPTION 'Only manual Topup or Redeem adjustments can be deleted.' USING ERRCODE = '22023';
  END IF;

  SELECT outlet_id, COALESCE(points, 0)::integer
  INTO v_client_outlet, v_prev
  FROM clients
  WHERE id = v_txn.client_id
  FOR UPDATE;

  IF v_client_outlet IS NULL OR v_client_outlet <> p_outlet_id THEN
    RAISE EXCEPTION 'Client not found for outlet.' USING ERRCODE = 'P0002';
  END IF;

  IF lower(v_txn.type) LIKE 'topup%' OR v_txn.type = 'Topup' THEN
    v_delta := v_txn.amount::integer;
  ELSE
    v_delta := -v_txn.amount::integer;
  END IF;

  -- balance_after_delete = current_balance - deleted_transaction_delta
  v_new := v_prev - v_delta;

  IF v_new < 0 THEN
    RAISE EXCEPTION 'Cannot delete this adjustment. Removing this Top Up would reduce the member''s balance below zero.'
      USING ERRCODE = '22023';
  END IF;

  DELETE FROM point_transactions
  WHERE id = p_transaction_id
    AND outlet_id = p_outlet_id;

  UPDATE clients
  SET points = v_new
  WHERE id = v_txn.client_id;

  -- Recalculate stored balance snapshots for remaining ledger rows (chronological).
  SELECT COALESCE(SUM(
    CASE
      WHEN type = 'Topup' OR lower(type) LIKE 'topup%' THEN amount::integer
      ELSE -amount::integer
    END
  ), 0)
  INTO v_total_remaining
  FROM point_transactions
  WHERE client_id = v_txn.client_id
    AND outlet_id = p_outlet_id;

  v_run := v_new - v_total_remaining;

  FOR r IN
    SELECT id, type, amount
    FROM point_transactions
    WHERE client_id = v_txn.client_id
      AND outlet_id = p_outlet_id
    ORDER BY timestamp ASC, id ASC
  LOOP
    IF r.type = 'Topup' OR lower(r.type) LIKE 'topup%' THEN
      v_row_delta := r.amount::integer;
    ELSE
      v_row_delta := -r.amount::integer;
    END IF;

    UPDATE point_transactions
    SET
      previous_balance = v_run,
      new_balance = v_run + v_row_delta
    WHERE id = r.id;

    v_run := v_run + v_row_delta;
  END LOOP;

  RETURN v_new;
END;
$$;


ALTER FUNCTION "public"."merchant_reverse_manual_point_transaction"("p_transaction_id" "text", "p_outlet_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."minutes_to_booking_time"("p_minutes" integer) RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    AS $$
  SELECT lpad((((p_minutes / 60) % 24))::text, 2, '0') || ':' || lpad((p_minutes % 60)::text, 2, '0');
$$;


ALTER FUNCTION "public"."minutes_to_booking_time"("p_minutes" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."parse_time_to_minutes"("time_str" "text") RETURNS integer
    LANGUAGE "plpgsql" IMMUTABLE
    SET "search_path" TO 'public'
    AS $$
DECLARE
  parts text[];
  h integer;
  m integer;
BEGIN
  IF time_str IS NULL OR btrim(time_str) = '' THEN
    RETURN 0;
  END IF;
  parts := string_to_array(btrim(time_str), ':');
  h := COALESCE(NULLIF(parts[1], '')::integer, 0);
  m := COALESCE(NULLIF(parts[2], '')::integer, 0);
  RETURN h * 60 + m;
EXCEPTION WHEN OTHERS THEN
  RETURN 0;
END;
$$;


ALTER FUNCTION "public"."parse_time_to_minutes"("time_str" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."platform_account_deletion_requests_page"("p_search" "text" DEFAULT NULL::"text", "p_status" "text" DEFAULT NULL::"text", "p_source" "text" DEFAULT NULL::"text", "p_limit" integer DEFAULT 25, "p_offset" integer DEFAULT 0) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_rows jsonb;
  v_total bigint;
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Platform administrator access required';
  END IF;

  SELECT count(*) INTO v_total
  FROM public.platform_account_deletion_requests r
  LEFT JOIN public.outlets o ON o.outlet_id = r.outlet_id
  WHERE (p_status IS NULL OR p_status = '' OR r.status = p_status)
    AND (p_source IS NULL OR p_source = '' OR r.source = p_source)
    AND (
      p_search IS NULL OR p_search = '' OR
      r.email ILIKE '%' || p_search || '%' OR
      coalesce(r.requester_name, '') ILIKE '%' || p_search || '%' OR
      coalesce(r.business_name, '') ILIKE '%' || p_search || '%' OR
      coalesce(o.name, '') ILIKE '%' || p_search || '%' OR
      r.id::text ILIKE '%' || p_search || '%'
    );

  SELECT coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_rows
  FROM (
    SELECT
      r.id,
      r.requesting_user_uid,
      r.outlet_id,
      coalesce(o.name, r.outlet_id) AS outlet_name,
      r.email,
      r.requester_name,
      r.business_name,
      r.reason,
      r.status,
      r.source,
      r.processing_notes,
      r.processed_by,
      p.email AS processed_by_email,
      r.processed_at,
      r.created_at,
      r.updated_at
    FROM public.platform_account_deletion_requests r
    LEFT JOIN public.outlets o ON o.outlet_id = r.outlet_id
    LEFT JOIN public.profiles p ON p.id = r.processed_by
    WHERE (p_status IS NULL OR p_status = '' OR r.status = p_status)
      AND (p_source IS NULL OR p_source = '' OR r.source = p_source)
      AND (
        p_search IS NULL OR p_search = '' OR
        r.email ILIKE '%' || p_search || '%' OR
        coalesce(r.requester_name, '') ILIKE '%' || p_search || '%' OR
        coalesce(r.business_name, '') ILIKE '%' || p_search || '%' OR
        coalesce(o.name, '') ILIKE '%' || p_search || '%' OR
        r.id::text ILIKE '%' || p_search || '%'
      )
    ORDER BY r.created_at DESC
    LIMIT greatest(1, least(coalesce(p_limit, 25), 100))
    OFFSET greatest(coalesce(p_offset, 0), 0)
  ) t;

  RETURN jsonb_build_object('rows', v_rows, 'total', v_total);
END $$;


ALTER FUNCTION "public"."platform_account_deletion_requests_page"("p_search" "text", "p_status" "text", "p_source" "text", "p_limit" integer, "p_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."platform_activity_page"("p_kind" "text", "p_start_date" "date", "p_end_date" "date", "p_outlet_id" "text" DEFAULT NULL::"text", "p_limit" integer DEFAULT 25, "p_offset" integer DEFAULT 0) RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
DECLARE v_rows jsonb; v_total bigint;
BEGIN
  IF NOT public.is_platform_admin() THEN RAISE EXCEPTION 'Platform administrator access required'; END IF;
  IF p_start_date IS NULL OR p_end_date IS NULL OR p_end_date < p_start_date OR p_end_date - p_start_date > 366 THEN RAISE EXCEPTION 'Choose a valid range of at most 367 days'; END IF;
  IF p_kind NOT IN ('bookings_created','appointments_scheduled','appointments_completed','appointments_cancelled','failed_operations','failed_messages','unresolved_support') THEN RAISE EXCEPTION 'Unsupported activity kind'; END IF;
 WITH bounds AS (SELECT o.outlet_id,o.name,CASE WHEN EXISTS(SELECT 1 FROM pg_timezone_names z WHERE z.name=o.timezone) THEN o.timezone ELSE 'UTC' END tz,p_start_date::timestamp AT TIME ZONE (CASE WHEN EXISTS(SELECT 1 FROM pg_timezone_names z WHERE z.name=o.timezone) THEN o.timezone ELSE 'UTC' END) utc_start,(p_end_date+1)::timestamp AT TIME ZONE (CASE WHEN EXISTS(SELECT 1 FROM pg_timezone_names z WHERE z.name=o.timezone) THEN o.timezone ELSE 'UTC' END) utc_end FROM public.outlets o WHERE p_outlet_id IS NULL OR o.outlet_id=p_outlet_id), activity AS (
  SELECT a.id,b.outlet_id,b.name outlet_name,a.status state,a.created_at occurred_at,a.date||' '||a.time scheduled_for,a.source,NULL::text detail FROM public.appointments a JOIN bounds b ON b.outlet_id=a.outlet_id WHERE p_kind='bookings_created' AND a.created_at>=b.utc_start AND a.created_at < b.utc_end
  UNION ALL SELECT a.id,b.outlet_id,b.name,a.status,a.created_at,a.date||' '||a.time,a.source,NULL FROM public.appointments a JOIN bounds b ON b.outlet_id=a.outlet_id WHERE p_kind='appointments_scheduled' AND a.date~'^\d{4}-\d{2}-\d{2}$' AND a.date::date BETWEEN p_start_date AND p_end_date
  UNION ALL SELECT a.id,b.outlet_id,b.name,a.status,a.completed_at,a.date||' '||a.time,a.source,NULL FROM public.appointments a JOIN bounds b ON b.outlet_id=a.outlet_id WHERE p_kind='appointments_completed' AND a.completed_at>=b.utc_start AND a.completed_at < b.utc_end
  UNION ALL SELECT a.id,b.outlet_id,b.name,a.status,a.cancelled_at,a.date||' '||a.time,a.source,NULL FROM public.appointments a JOIN bounds b ON b.outlet_id=a.outlet_id WHERE p_kind='appointments_cancelled' AND a.cancelled_at>=b.utc_start AND a.cancelled_at < b.utc_end
  UNION ALL SELECT op.id::text,coalesce(op.outlet_id,''),coalesce(b.name,'Platform'),op.state,coalesce(op.completed_at,op.started_at),NULL,op.action,public.platform_sanitize_error(op.result->>'error') FROM public.platform_admin_operations op LEFT JOIN bounds b ON b.outlet_id=op.outlet_id WHERE p_kind='failed_operations' AND op.state IN ('failed','partial') AND (p_outlet_id IS NULL OR op.outlet_id=p_outlet_id) AND op.started_at>=coalesce(b.utc_start,p_start_date::timestamp AT TIME ZONE 'UTC') AND op.started_at < coalesce(b.utc_end,(p_end_date+1)::timestamp AT TIME ZONE 'UTC')
  UNION ALL SELECT d.id,d.outlet_id,b.name,d.status,d.updated_at,NULL,d.channel,public.platform_sanitize_error(d.last_error) FROM public.marketing_campaign_deliveries d JOIN bounds b ON b.outlet_id=d.outlet_id WHERE p_kind='failed_messages' AND d.status='failed' AND d.updated_at>=b.utc_start AND d.updated_at < b.utc_end
  UNION ALL SELECT c.id::text,c.outlet_id,b.name,c.status,c.updated_at,NULL,c.category,c.subject FROM public.platform_support_cases c JOIN bounds b ON b.outlet_id=c.outlet_id WHERE p_kind='unresolved_support' AND c.status<>'resolved'
 ) SELECT count(*) INTO v_total FROM activity;
 WITH bounds AS (SELECT o.outlet_id,o.name,CASE WHEN EXISTS(SELECT 1 FROM pg_timezone_names z WHERE z.name=o.timezone) THEN o.timezone ELSE 'UTC' END tz,p_start_date::timestamp AT TIME ZONE (CASE WHEN EXISTS(SELECT 1 FROM pg_timezone_names z WHERE z.name=o.timezone) THEN o.timezone ELSE 'UTC' END) utc_start,(p_end_date+1)::timestamp AT TIME ZONE (CASE WHEN EXISTS(SELECT 1 FROM pg_timezone_names z WHERE z.name=o.timezone) THEN o.timezone ELSE 'UTC' END) utc_end FROM public.outlets o WHERE p_outlet_id IS NULL OR o.outlet_id=p_outlet_id), activity AS (
  SELECT a.id,b.outlet_id,b.name outlet_name,a.status state,a.created_at occurred_at,a.date||' '||a.time scheduled_for,a.source,NULL::text detail FROM public.appointments a JOIN bounds b ON b.outlet_id=a.outlet_id WHERE p_kind='bookings_created' AND a.created_at>=b.utc_start AND a.created_at < b.utc_end
  UNION ALL SELECT a.id,b.outlet_id,b.name,a.status,a.created_at,a.date||' '||a.time,a.source,NULL FROM public.appointments a JOIN bounds b ON b.outlet_id=a.outlet_id WHERE p_kind='appointments_scheduled' AND a.date~'^\d{4}-\d{2}-\d{2}$' AND a.date::date BETWEEN p_start_date AND p_end_date
  UNION ALL SELECT a.id,b.outlet_id,b.name,a.status,a.completed_at,a.date||' '||a.time,a.source,NULL FROM public.appointments a JOIN bounds b ON b.outlet_id=a.outlet_id WHERE p_kind='appointments_completed' AND a.completed_at>=b.utc_start AND a.completed_at < b.utc_end
  UNION ALL SELECT a.id,b.outlet_id,b.name,a.status,a.cancelled_at,a.date||' '||a.time,a.source,NULL FROM public.appointments a JOIN bounds b ON b.outlet_id=a.outlet_id WHERE p_kind='appointments_cancelled' AND a.cancelled_at>=b.utc_start AND a.cancelled_at < b.utc_end
  UNION ALL SELECT op.id::text,coalesce(op.outlet_id,''),coalesce(b.name,'Platform'),op.state,coalesce(op.completed_at,op.started_at),NULL,op.action,public.platform_sanitize_error(op.result->>'error') FROM public.platform_admin_operations op LEFT JOIN bounds b ON b.outlet_id=op.outlet_id WHERE p_kind='failed_operations' AND op.state IN ('failed','partial') AND (p_outlet_id IS NULL OR op.outlet_id=p_outlet_id) AND op.started_at>=coalesce(b.utc_start,p_start_date::timestamp AT TIME ZONE 'UTC') AND op.started_at < coalesce(b.utc_end,(p_end_date+1)::timestamp AT TIME ZONE 'UTC')
  UNION ALL SELECT d.id,d.outlet_id,b.name,d.status,d.updated_at,NULL,d.channel,public.platform_sanitize_error(d.last_error) FROM public.marketing_campaign_deliveries d JOIN bounds b ON b.outlet_id=d.outlet_id WHERE p_kind='failed_messages' AND d.status='failed' AND d.updated_at>=b.utc_start AND d.updated_at < b.utc_end
  UNION ALL SELECT c.id::text,c.outlet_id,b.name,c.status,c.updated_at,NULL,c.category,c.subject FROM public.platform_support_cases c JOIN bounds b ON b.outlet_id=c.outlet_id WHERE p_kind='unresolved_support' AND c.status<>'resolved'
 ) SELECT coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) INTO v_rows FROM (SELECT * FROM activity ORDER BY occurred_at DESC NULLS LAST,id LIMIT least(greatest(p_limit,1),100) OFFSET greatest(p_offset,0)) x;
 RETURN jsonb_build_object('rows',v_rows,'total',v_total);
END $_$;


ALTER FUNCTION "public"."platform_activity_page"("p_kind" "text", "p_start_date" "date", "p_end_date" "date", "p_outlet_id" "text", "p_limit" integer, "p_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."platform_add_support_reference"("p_case_id" "uuid", "p_type" "text", "p_reference_id" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE v_case public.platform_support_cases%rowtype; v_id uuid; v_email text;
BEGIN
  IF NOT public.is_platform_admin() THEN RAISE EXCEPTION 'Platform administrator access required'; END IF;
  SELECT * INTO v_case FROM public.platform_support_cases WHERE id=p_case_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Support case not found'; END IF;
  IF NOT public.platform_reference_belongs_to_outlet(v_case.outlet_id,p_type,p_reference_id) THEN RAISE EXCEPTION 'Referenced record does not belong to the selected outlet'; END IF;
  INSERT INTO public.platform_support_case_references(case_id,outlet_id,entity_type,reference_id,created_by)
  VALUES(p_case_id,v_case.outlet_id,p_type,p_reference_id,auth.uid()) RETURNING id INTO v_id;
  SELECT email INTO v_email FROM public.profiles WHERE id=auth.uid();
  INSERT INTO public.platform_support_case_events(case_id,event_type,actor_uid,actor_email,after_value)
  VALUES(p_case_id,'reference_added',auth.uid(),v_email,jsonb_build_object('type',p_type,'id',p_reference_id));
  UPDATE public.platform_support_cases SET updated_at=now() WHERE id=p_case_id;
  RETURN v_id;
END $$;


ALTER FUNCTION "public"."platform_add_support_reference"("p_case_id" "uuid", "p_type" "text", "p_reference_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."platform_create_support_case"("p_outlet_id" "text", "p_category" "text", "p_priority" "text", "p_subject" "text", "p_description" "text", "p_assigned_to" "uuid" DEFAULT NULL::"uuid", "p_references" "jsonb" DEFAULT '[]'::"jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE v_id uuid; v_ref jsonb; v_email text;
BEGIN
  IF NOT public.is_platform_admin() THEN RAISE EXCEPTION 'Platform administrator access required'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.outlets WHERE outlet_id=p_outlet_id) THEN RAISE EXCEPTION 'Outlet not found'; END IF;
  IF p_category NOT IN ('account','access','booking','sales','integration','operations','other') THEN RAISE EXCEPTION 'Invalid support category'; END IF;
  IF p_priority NOT IN ('low','normal','high','urgent') THEN RAISE EXCEPTION 'Invalid support priority'; END IF;
  IF p_assigned_to IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.platform_admins WHERE user_id=p_assigned_to AND status='active') THEN RAISE EXCEPTION 'Assignee is not an eligible platform operator'; END IF;
  IF jsonb_typeof(coalesce(p_references,'[]'::jsonb))<>'array' OR jsonb_array_length(coalesce(p_references,'[]'::jsonb))>20 THEN RAISE EXCEPTION 'References must be an array of at most 20 items'; END IF;
  INSERT INTO public.platform_support_cases(outlet_id,category,priority,subject,description,assigned_to,created_by)
  VALUES(p_outlet_id,p_category,p_priority,trim(p_subject),trim(p_description),p_assigned_to,auth.uid()) RETURNING id INTO v_id;
  SELECT email INTO v_email FROM public.profiles WHERE id=auth.uid();
  INSERT INTO public.platform_support_case_events(case_id,event_type,actor_uid,actor_email,after_value)
  VALUES(v_id,'created',auth.uid(),v_email,jsonb_build_object('status','open','priority',p_priority,'assigned_to',p_assigned_to));
  FOR v_ref IN SELECT value FROM jsonb_array_elements(coalesce(p_references,'[]'::jsonb)) LOOP
    IF NOT public.platform_reference_belongs_to_outlet(p_outlet_id,v_ref->>'type',v_ref->>'id') THEN RAISE EXCEPTION 'Referenced record does not belong to the selected outlet'; END IF;
    INSERT INTO public.platform_support_case_references(case_id,outlet_id,entity_type,reference_id,created_by)
    VALUES(v_id,p_outlet_id,v_ref->>'type',v_ref->>'id',auth.uid());
  END LOOP;
  INSERT INTO public.platform_audit_events(outlet_id,action,affected_target,actor_uid,actor_email,metadata,source,outcome)
  VALUES(p_outlet_id,'support case created',v_id::text,auth.uid()::text,v_email,jsonb_build_object('category',p_category,'priority',p_priority),'support-rpc','succeeded');
  RETURN v_id;
END $$;


ALTER FUNCTION "public"."platform_create_support_case"("p_outlet_id" "text", "p_category" "text", "p_priority" "text", "p_subject" "text", "p_description" "text", "p_assigned_to" "uuid", "p_references" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."platform_delete_outlet"("p_outlet_id" "text", "p_reason" "text", "p_confirm_name" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
DECLARE
  v_name text;
  v_shop text;
  v_email text;
  v_confirm text := lower(trim(coalesce(p_confirm_name, '')));
  v_user_ids uuid[] := '{}';
  v_audit uuid;
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Platform administrator access required';
  END IF;
  IF length(trim(coalesce(p_reason, ''))) < 3 THEN
    RAISE EXCEPTION 'A deletion reason is required';
  END IF;
  IF p_outlet_id IS NULL OR length(trim(p_outlet_id)) = 0 THEN
    RAISE EXCEPTION 'Outlet id is required';
  END IF;

  SELECT name, settings->>'shopName', email
    INTO v_name, v_shop, v_email
  FROM public.outlets
  WHERE outlet_id = p_outlet_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Outlet not found';
  END IF;

  IF v_confirm NOT IN (
    lower(trim(coalesce(v_name, ''))),
    lower(trim(coalesce(v_shop, ''))),
    lower(trim(p_outlet_id))
  ) OR v_confirm = '' THEN
    RAISE EXCEPTION 'Type the outlet name to confirm deletion';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.outlet_members om
    JOIN public.platform_admins pa ON pa.user_id = om.user_id AND pa.status = 'active'
    WHERE om.outlet_id = p_outlet_id
  ) THEN
    RAISE EXCEPTION 'This workspace includes a platform administrator and cannot be deleted';
  END IF;

  SELECT coalesce(array_agg(DISTINCT user_id), '{}')
    INTO v_user_ids
  FROM (
    SELECT user_id FROM public.outlet_members WHERE outlet_id = p_outlet_id
    UNION
    SELECT uid::uuid
    FROM public.users
    WHERE outlet_id = p_outlet_id
      AND uid ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  ) members;

  DELETE FROM public.merchant_onboarding_drafts WHERE auth_user_id = ANY (v_user_ids);
  UPDATE public.users
    SET outlet_id = NULL
    WHERE outlet_id = p_outlet_id;

  DELETE FROM public.credit_history WHERE outlet_id = p_outlet_id;
  DELETE FROM public.point_transactions WHERE outlet_id = p_outlet_id;
  DELETE FROM public.outstanding_transactions WHERE outlet_id = p_outlet_id;
  DELETE FROM public.appointments WHERE outlet_id = p_outlet_id;
  DELETE FROM public.transactions WHERE outlet_id = p_outlet_id;
  DELETE FROM public.vouchers WHERE outlet_id = p_outlet_id;
  DELETE FROM public.packages WHERE outlet_id = p_outlet_id;
  DELETE FROM public.products WHERE outlet_id = p_outlet_id;
  DELETE FROM public.rewards WHERE outlet_id = p_outlet_id;
  DELETE FROM public.services WHERE outlet_id = p_outlet_id;
  DELETE FROM public.staff WHERE outlet_id = p_outlet_id;
  DELETE FROM public.frontend_customers WHERE outlet_id = p_outlet_id;
  DELETE FROM public.clients WHERE outlet_id = p_outlet_id;
  DELETE FROM public.api_integrations WHERE outlet_id = p_outlet_id;
  DELETE FROM public.audit_logs WHERE outlet_id = p_outlet_id;
  DELETE FROM public.merchant_provision_requests WHERE outlet_id = p_outlet_id;
  DELETE FROM public.billing_customers WHERE outlet_id = p_outlet_id;
  DELETE FROM public.outlet_subscriptions WHERE outlet_id = p_outlet_id;
  UPDATE public.platform_admin_operations SET outlet_id = NULL WHERE outlet_id = p_outlet_id;

  INSERT INTO public.platform_audit_events(
    outlet_id, action, affected_target, actor_uid, actor_email, reason, metadata, source, outcome
  ) VALUES (
    p_outlet_id,
    'outlet deleted',
    coalesce(v_name, p_outlet_id),
    auth.uid()::text,
    (SELECT email FROM public.profiles WHERE id = auth.uid()),
    trim(p_reason),
    jsonb_build_object(
      'former_outlet_id', p_outlet_id,
      'former_email', v_email,
      'released_auth_users', to_jsonb(v_user_ids),
      'restart_allowed', true
    ),
    'platform-rpc',
    'succeeded'
  ) RETURNING id INTO v_audit;

  DELETE FROM public.outlets WHERE outlet_id = p_outlet_id;

  RETURN jsonb_build_object(
    'deleted', true,
    'outlet_id', p_outlet_id,
    'released_user_count', coalesce(cardinality(v_user_ids), 0),
    'audit_id', v_audit
  );
END;
$_$;


ALTER FUNCTION "public"."platform_delete_outlet"("p_outlet_id" "text", "p_reason" "text", "p_confirm_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."platform_global_search"("p_query" "text", "p_limit_per_group" integer DEFAULT 5) RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
DECLARE
  v_query text := left(lower(trim(coalesce(p_query, ''))), 120);
  v_escaped text;
  v_contains text;
  v_prefix text;
  v_limit integer := least(greatest(coalesce(p_limit_per_group, 5), 1), 10);
  v_results jsonb;
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Platform administrator access required';
  END IF;
  IF length(v_query) < 2 THEN
    RETURN jsonb_build_object('results', '[]'::jsonb, 'minimum_query_length', 2);
  END IF;

  -- Escape LIKE metacharacters. The raw query is never written to audit/monitoring tables.
  v_escaped := replace(replace(replace(v_query, '\', '\\'), '%', '\%'), '_', '\_');
  v_contains := '%' || v_escaped || '%';
  v_prefix := v_escaped || '%';

  WITH candidates AS (
    SELECT 'outlet'::text entity_type, o.outlet_id entity_id,
      coalesce(nullif(o.name, ''), o.outlet_id) title,
      CASE WHEN lower(o.outlet_id) LIKE v_contains ESCAPE '\' THEN o.outlet_id ELSE coalesce(nullif(o.name, ''), o.outlet_id) END matched_text,
      o.outlet_id, coalesce(nullif(o.name, ''), o.outlet_id) outlet_name,
      coalesce(o.access_status, o.status, 'unknown') status, coalesce(o.updated_at, o.created_at) occurred_at,
      CASE WHEN lower(o.outlet_id) = v_query THEN 0 WHEN lower(o.outlet_id) LIKE v_prefix ESCAPE '\' THEN 1 ELSE 2 END match_rank
    FROM public.outlets o
    WHERE lower(o.outlet_id) LIKE v_contains ESCAPE '\' OR lower(coalesce(o.name, '')) LIKE v_contains ESCAPE '\'

    UNION ALL
    SELECT 'user', u.uid,
      coalesce(nullif(u.display_name, ''), nullif(u.email, ''), u.uid),
      CASE WHEN lower(coalesce(u.email, '')) LIKE v_contains ESCAPE '\' THEN coalesce(u.email, u.uid) ELSE coalesce(nullif(u.display_name, ''), u.uid) END,
      m.outlet_id, coalesce(nullif(o.name, ''), m.outlet_id),
      coalesce(c.status, m.status, 'active'), u.created_at,
      CASE WHEN lower(coalesce(u.email, '')) = v_query THEN 0 WHEN lower(coalesce(u.email, '')) LIKE v_prefix ESCAPE '\' THEN 1 ELSE 2 END
    FROM public.outlet_members m
    JOIN public.users u ON u.uid = m.user_id::text
    JOIN public.outlets o ON o.outlet_id = m.outlet_id
    LEFT JOIN public.platform_account_controls c ON c.user_id = m.user_id
    WHERE m.status <> 'removed' AND (
      lower(coalesce(u.email, '')) LIKE v_contains ESCAPE '\'
      OR lower(coalesce(u.display_name, '')) LIKE v_contains ESCAPE '\'
    )

    UNION ALL
    SELECT 'booking', a.id, 'Booking ' || a.id, a.id,
      a.outlet_id, coalesce(nullif(o.name, ''), a.outlet_id), coalesce(a.status, 'unknown'),
      coalesce(a.updated_at, a.created_at),
      CASE WHEN lower(a.id) = v_query THEN 0 ELSE 1 END
    FROM public.appointments a
    JOIN public.outlets o ON o.outlet_id = a.outlet_id
    WHERE lower(a.id) LIKE v_prefix ESCAPE '\'

    UNION ALL
    SELECT 'sale', t.id, 'Sale ' || t.id, t.id,
      t.outlet_id, coalesce(nullif(o.name, ''), t.outlet_id), coalesce(t.status, t.payment_status, t.type, 'unknown'),
      t.created_at,
      CASE WHEN lower(t.id) = v_query THEN 0 ELSE 1 END
    FROM public.transactions t
    JOIN public.outlets o ON o.outlet_id = t.outlet_id
    WHERE lower(t.id) LIKE v_prefix ESCAPE '\'

    UNION ALL
    SELECT 'support_case', c.id::text, 'Case ' || c.id::text, c.id::text,
      c.outlet_id, coalesce(nullif(o.name, ''), c.outlet_id), c.status, c.updated_at,
      CASE WHEN lower(c.id::text) = v_query THEN 0 ELSE 1 END
    FROM public.platform_support_cases c
    JOIN public.outlets o ON o.outlet_id = c.outlet_id
    WHERE lower(c.id::text) LIKE v_prefix ESCAPE '\'

    UNION ALL
    SELECT 'operation', op.id::text, 'Operation ' || op.id::text, op.id::text,
      op.outlet_id, coalesce(nullif(o.name, ''), op.outlet_id, 'Platform'), op.state,
      coalesce(op.completed_at, op.started_at),
      CASE WHEN lower(op.id::text) = v_query THEN 0 ELSE 1 END
    FROM public.platform_admin_operations op
    LEFT JOIN public.outlets o ON o.outlet_id = op.outlet_id
    WHERE lower(op.id::text) LIKE v_prefix ESCAPE '\'

    UNION ALL
    SELECT 'operation', e.correlation_id, 'Correlation ' || e.correlation_id, e.correlation_id,
      e.outlet_id, coalesce(nullif(o.name, ''), e.outlet_id, 'Platform'), e.severity,
      e.occurred_at,
      CASE WHEN lower(e.correlation_id) = v_query THEN 0 ELSE 1 END
    FROM public.platform_monitoring_events e
    LEFT JOIN public.outlets o ON o.outlet_id = e.outlet_id
    WHERE e.correlation_id IS NOT NULL AND lower(e.correlation_id) LIKE v_prefix ESCAPE '\'

    UNION ALL
    SELECT 'audit', e.id::text, 'Audit ' || e.id::text, e.id::text,
      e.outlet_id, coalesce(nullif(o.name, ''), e.outlet_id, 'Platform'), e.outcome,
      e.occurred_at,
      CASE WHEN lower(e.id::text) = v_query THEN 0 ELSE 1 END
    FROM public.platform_audit_events e
    LEFT JOIN public.outlets o ON o.outlet_id = e.outlet_id
    WHERE lower(e.id::text) LIKE v_prefix ESCAPE '\'
       OR (e.operation_id IS NOT NULL AND lower(e.operation_id::text) LIKE v_prefix ESCAPE '\')
  ), ranked AS (
    SELECT candidates.*,
      row_number() OVER (PARTITION BY entity_type ORDER BY match_rank, occurred_at DESC NULLS LAST, entity_id) group_position
    FROM candidates
  )
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'entity_type', entity_type,
    'entity_id', entity_id,
    'title', title,
    'matched_text', matched_text,
    'outlet_id', outlet_id,
    'outlet_name', outlet_name,
    'status', status,
    'occurred_at', occurred_at
  ) ORDER BY entity_type, group_position), '[]'::jsonb)
  INTO v_results
  FROM ranked
  WHERE group_position <= v_limit;

  RETURN jsonb_build_object('results', v_results, 'limit_per_group', v_limit);
END;
$$;


ALTER FUNCTION "public"."platform_global_search"("p_query" "text", "p_limit_per_group" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."platform_integrations_page"("p_outlet_id" "text" DEFAULT NULL::"text", "p_type" "text" DEFAULT NULL::"text", "p_state" "text" DEFAULT NULL::"text", "p_limit" integer DEFAULT 25, "p_offset" integer DEFAULT 0) RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE v_rows jsonb; v_total bigint;
BEGIN
 IF NOT public.is_platform_admin() THEN RAISE EXCEPTION 'Platform administrator access required'; END IF;
 WITH latest_marketing AS (SELECT DISTINCT ON(outlet_id,channel) outlet_id,channel,status,sent_at,last_error,updated_at FROM public.marketing_campaign_deliveries ORDER BY outlet_id,channel,updated_at DESC), integrations AS (
  SELECT g.outlet_id,o.name outlet_name,'google_business' integration_type,CASE WHEN g.status='connected' AND g.last_synced_at IS NOT NULL THEN 'verified' WHEN g.status='connected' THEN 'connected_unverified' ELSE g.status END state,g.last_synced_at last_verified_success,g.last_error_at latest_error_at,public.platform_sanitize_error(g.last_error_message) latest_error,'Google sync evidence' detail FROM public.google_business_connections g JOIN public.outlets o ON o.outlet_id=g.outlet_id
  UNION ALL SELECT a.outlet_id,o.name,'chatbot_api','configured_unverified',NULL,NULL,NULL,'Saved API/webhook configuration is not a health check' FROM public.api_integrations a JOIN public.outlets o ON o.outlet_id=a.outlet_id WHERE a.api_key_hash IS NOT NULL OR a.webhook_url IS NOT NULL
  UNION ALL SELECT m.outlet_id,o.name,'marketing_'||m.channel,CASE WHEN m.status='sent' THEN 'provider_accepted' ELSE m.status END,NULL,CASE WHEN m.status='failed' THEN m.updated_at END,public.platform_sanitize_error(m.last_error),'Provider acceptance is tracked; confirmed delivery is not instrumented' FROM latest_marketing m JOIN public.outlets o ON o.outlet_id=m.outlet_id
  UNION ALL SELECT o.outlet_id,o.name,'reminders',CASE WHEN lower(coalesce(o.settings->>'reminderEnabled','false'))='true' THEN 'simulated' ELSE 'disabled' END,NULL,NULL,NULL,'Reminder actions are simulated; no provider delivery evidence exists' FROM public.outlets o
 ), filtered AS (SELECT * FROM integrations i WHERE (p_outlet_id IS NULL OR i.outlet_id=p_outlet_id) AND (p_type IS NULL OR i.integration_type=p_type) AND (p_state IS NULL OR i.state=p_state))
 SELECT count(*) INTO v_total FROM filtered;
 WITH latest_marketing AS (SELECT DISTINCT ON(outlet_id,channel) outlet_id,channel,status,sent_at,last_error,updated_at FROM public.marketing_campaign_deliveries ORDER BY outlet_id,channel,updated_at DESC), integrations AS (
  SELECT g.outlet_id,o.name outlet_name,'google_business' integration_type,CASE WHEN g.status='connected' AND g.last_synced_at IS NOT NULL THEN 'verified' WHEN g.status='connected' THEN 'connected_unverified' ELSE g.status END state,g.last_synced_at last_verified_success,g.last_error_at latest_error_at,public.platform_sanitize_error(g.last_error_message) latest_error,'Google sync evidence' detail FROM public.google_business_connections g JOIN public.outlets o ON o.outlet_id=g.outlet_id
  UNION ALL SELECT a.outlet_id,o.name,'chatbot_api','configured_unverified',NULL,NULL,NULL,'Saved API/webhook configuration is not a health check' FROM public.api_integrations a JOIN public.outlets o ON o.outlet_id=a.outlet_id WHERE a.api_key_hash IS NOT NULL OR a.webhook_url IS NOT NULL
  UNION ALL SELECT m.outlet_id,o.name,'marketing_'||m.channel,CASE WHEN m.status='sent' THEN 'provider_accepted' ELSE m.status END,NULL,CASE WHEN m.status='failed' THEN m.updated_at END,public.platform_sanitize_error(m.last_error),'Provider acceptance is tracked; confirmed delivery is not instrumented' FROM latest_marketing m JOIN public.outlets o ON o.outlet_id=m.outlet_id
  UNION ALL SELECT o.outlet_id,o.name,'reminders',CASE WHEN lower(coalesce(o.settings->>'reminderEnabled','false'))='true' THEN 'simulated' ELSE 'disabled' END,NULL,NULL,NULL,'Reminder actions are simulated; no provider delivery evidence exists' FROM public.outlets o
 ), filtered AS (SELECT * FROM integrations i WHERE (p_outlet_id IS NULL OR i.outlet_id=p_outlet_id) AND (p_type IS NULL OR i.integration_type=p_type) AND (p_state IS NULL OR i.state=p_state))
 SELECT coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) INTO v_rows FROM (SELECT * FROM filtered ORDER BY coalesce(latest_error_at,last_verified_success) DESC NULLS LAST,outlet_name,integration_type LIMIT least(greatest(p_limit,1),100) OFFSET greatest(p_offset,0)) x;
 RETURN jsonb_build_object('rows',v_rows,'total',v_total);
END $$;


ALTER FUNCTION "public"."platform_integrations_page"("p_outlet_id" "text", "p_type" "text", "p_state" "text", "p_limit" integer, "p_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."platform_jobs_page"("p_outlet_id" "text" DEFAULT NULL::"text", "p_type" "text" DEFAULT NULL::"text", "p_state" "text" DEFAULT NULL::"text", "p_from" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_to" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_limit" integer DEFAULT 25, "p_offset" integer DEFAULT 0) RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE v_rows jsonb; v_total bigint;
BEGIN
 IF NOT public.is_platform_admin() THEN RAISE EXCEPTION 'Platform administrator access required'; END IF;
 WITH jobs AS (
  SELECT op.id::text reference_id, op.outlet_id, 'platform_'||op.action job_type, CASE op.state WHEN 'started' THEN 'running' ELSE op.state END state, op.started_at, op.completed_at, op.attempt_count, public.platform_sanitize_error(op.result->>'error') error FROM public.platform_admin_operations op
  UNION ALL SELECT d.id, d.outlet_id, 'marketing_'||d.channel, CASE d.status WHEN 'queued' THEN 'pending' WHEN 'processing' THEN 'running' WHEN 'sent' THEN 'provider_accepted' ELSE d.status END, d.queued_at, coalesce(d.sent_at, d.processed_at), d.attempt_count, public.platform_sanitize_error(d.last_error) FROM public.marketing_campaign_deliveries d
  UNION ALL SELECT e.correlation_id, e.outlet_id, 'monitoring_'||e.service, 'event', e.occurred_at, e.occurred_at, 1, public.platform_sanitize_error(e.message) FROM public.platform_monitoring_events e
  UNION ALL SELECT b.id, b.outlet_id, 'billing_'||b.event_type, 'received', b.received_at, b.received_at, 1, NULL FROM public.billing_events b
 ), filtered AS (SELECT * FROM jobs j WHERE (p_outlet_id IS NULL OR j.outlet_id=p_outlet_id) AND (p_type IS NULL OR j.job_type=p_type) AND (p_state IS NULL OR j.state=p_state) AND (p_from IS NULL OR j.started_at >= p_from) AND (p_to IS NULL OR j.started_at < p_to))
 SELECT count(*) INTO v_total FROM filtered;
 WITH jobs AS (
  SELECT op.id::text reference_id, op.outlet_id, 'platform_'||op.action job_type, CASE op.state WHEN 'started' THEN 'running' ELSE op.state END state, op.started_at, op.completed_at, op.attempt_count, public.platform_sanitize_error(op.result->>'error') error FROM public.platform_admin_operations op
  UNION ALL SELECT d.id, d.outlet_id, 'marketing_'||d.channel, CASE d.status WHEN 'queued' THEN 'pending' WHEN 'processing' THEN 'running' WHEN 'sent' THEN 'provider_accepted' ELSE d.status END, d.queued_at, coalesce(d.sent_at, d.processed_at), d.attempt_count, public.platform_sanitize_error(d.last_error) FROM public.marketing_campaign_deliveries d
  UNION ALL SELECT e.correlation_id, e.outlet_id, 'monitoring_'||e.service, 'event', e.occurred_at, e.occurred_at, 1, public.platform_sanitize_error(e.message) FROM public.platform_monitoring_events e
  UNION ALL SELECT b.id, b.outlet_id, 'billing_'||b.event_type, 'received', b.received_at, b.received_at, 1, NULL FROM public.billing_events b
 ), filtered AS (SELECT * FROM jobs j WHERE (p_outlet_id IS NULL OR j.outlet_id=p_outlet_id) AND (p_type IS NULL OR j.job_type=p_type) AND (p_state IS NULL OR j.state=p_state) AND (p_from IS NULL OR j.started_at >= p_from) AND (p_to IS NULL OR j.started_at < p_to))
 SELECT coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) INTO v_rows FROM (SELECT f.*, o.name outlet_name FROM filtered f LEFT JOIN public.outlets o ON o.outlet_id=f.outlet_id ORDER BY f.started_at DESC, f.reference_id LIMIT least(greatest(p_limit,1),100) OFFSET greatest(p_offset,0)) x;
 RETURN jsonb_build_object('rows', v_rows, 'total', v_total, 'retries_enabled', false, 'scheduler_instrumentation', 'not_instrumented');
END $$;


ALTER FUNCTION "public"."platform_jobs_page"("p_outlet_id" "text", "p_type" "text", "p_state" "text", "p_from" timestamp with time zone, "p_to" timestamp with time zone, "p_limit" integer, "p_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."platform_manage_outlet_member"("p_outlet_id" "text", "p_user_id" "uuid", "p_action" "text", "p_role" "text" DEFAULT NULL::"text", "p_reason" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE v_member public.outlet_members%rowtype; v_before jsonb; v_after jsonb; v_email text; v_audit uuid;
BEGIN
  IF NOT public.is_platform_admin() THEN RAISE EXCEPTION 'Platform administrator access required'; END IF;
  IF p_user_id=auth.uid() THEN RAISE EXCEPTION 'You cannot change your own platform access'; END IF;
  IF EXISTS(SELECT 1 FROM public.platform_admins WHERE user_id=p_user_id AND status='active') THEN RAISE EXCEPTION 'Platform administrators are protected from outlet account actions'; END IF;
  SELECT * INTO v_member FROM public.outlet_members WHERE outlet_id=p_outlet_id AND user_id=p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Outlet membership not found'; END IF;
  IF v_member.role='owner' THEN RAISE EXCEPTION 'Transfer ownership before changing or removing the owner'; END IF;
  v_before:=jsonb_build_object('role',v_member.role,'status',v_member.status);
  IF p_action='change_role' THEN
    IF p_role NOT IN ('admin','manager','cashier') THEN RAISE EXCEPTION 'Invalid outlet role'; END IF;
    UPDATE public.outlet_members SET role=p_role,updated_at=now() WHERE id=v_member.id;
    UPDATE public.users SET role=p_role WHERE uid=p_user_id::text AND outlet_id=p_outlet_id;
  ELSIF p_action='suspend_membership' THEN
    UPDATE public.outlet_members SET status='suspended',updated_at=now() WHERE id=v_member.id;
  ELSIF p_action='reactivate_membership' THEN
    UPDATE public.outlet_members SET status='active',updated_at=now() WHERE id=v_member.id;
  ELSIF p_action='remove_membership' THEN
    UPDATE public.outlet_members SET status='removed',updated_at=now() WHERE id=v_member.id;
    UPDATE public.users SET outlet_id=NULL WHERE uid=p_user_id::text AND outlet_id=p_outlet_id;
  ELSE RAISE EXCEPTION 'Unsupported membership action'; END IF;
  SELECT email INTO v_email FROM public.users WHERE uid=p_user_id::text;
  SELECT jsonb_build_object('role',role,'status',status) INTO v_after FROM public.outlet_members WHERE id=v_member.id;
  INSERT INTO public.platform_audit_events(outlet_id,action,affected_target,actor_uid,actor_email,reason,metadata,source,outcome)
  VALUES (p_outlet_id,p_action,coalesce(v_email,p_user_id::text),auth.uid()::text,(SELECT email FROM public.profiles WHERE id=auth.uid()),nullif(trim(coalesce(p_reason,'')),''),
    jsonb_build_object('before',v_before,'after',v_after),'platform-rpc','succeeded')
  RETURNING id INTO v_audit;
  RETURN jsonb_build_object('success',true,'audit_id',v_audit,'before',v_before,'after',v_after);
END $$;


ALTER FUNCTION "public"."platform_manage_outlet_member"("p_outlet_id" "text", "p_user_id" "uuid", "p_action" "text", "p_role" "text", "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."platform_monitoring_events_page"("p_limit" integer DEFAULT 50, "p_offset" integer DEFAULT 0) RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_rows jsonb;
  v_total bigint;
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Platform administrator access required';
  END IF;
  SELECT count(*) INTO v_total FROM public.platform_monitoring_events;
  SELECT coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) INTO v_rows FROM (
    SELECT
      e.id,
      e.service,
      e.severity,
      e.event_type,
      public.platform_sanitize_error(e.message) AS message,
      public.platform_sanitize_jsonb(e.metadata) AS metadata,
      e.outlet_id,
      e.correlation_id,
      e.occurred_at
    FROM public.platform_monitoring_events e
    ORDER BY e.occurred_at DESC, e.id
    LIMIT least(greatest(coalesce(p_limit, 50), 1), 200)
    OFFSET greatest(coalesce(p_offset, 0), 0)
  ) x;
  RETURN jsonb_build_object('rows', v_rows, 'total', v_total);
END;
$$;


ALTER FUNCTION "public"."platform_monitoring_events_page"("p_limit" integer, "p_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."platform_onboarding_page"("p_stage" "text" DEFAULT NULL::"text", "p_search" "text" DEFAULT NULL::"text", "p_limit" integer DEFAULT 25, "p_offset" integer DEFAULT 0) RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE v_rows jsonb; v_total bigint;
BEGIN
 IF NOT public.is_platform_admin() THEN RAISE EXCEPTION 'Platform administrator access required'; END IF;
 WITH readiness AS (
  SELECT o.outlet_id,o.name,o.timezone,o.onboarding_status,o.access_status,o.updated_at,
   (o.owner_user_id IS NOT NULL OR EXISTS(SELECT 1 FROM public.outlet_members m WHERE m.outlet_id=o.outlet_id AND m.role='owner' AND m.status='active')) owner_assigned,
   (length(trim(coalesce(o.name,'')))>=2 AND coalesce(nullif(trim(o.email),''),nullif(trim(o.phone),''),nullif(trim(o.phone_number),'')) IS NOT NULL
    AND (coalesce(o.settings->>'serviceLocationType','')<>'physical' OR coalesce(nullif(trim(o.address_display),''),nullif(trim(o.address->>'addressDisplay'),'')) IS NOT NULL)) business_details,
    EXISTS(SELECT 1 FROM jsonb_each(CASE WHEN jsonb_typeof(o.business_hours)='object' THEN o.business_hours ELSE '{}'::jsonb END) h WHERE lower(coalesce(h.value->>'isOpen','true'))='true' AND h.value->>'open' IS NOT NULL AND h.value->>'close' IS NOT NULL AND h.value->>'open'<>h.value->>'close') operating_hours,
   EXISTS(SELECT 1 FROM public.services s WHERE s.outlet_id=o.outlet_id AND coalesce(s.is_visible,true) AND coalesce(s.duration,0)>0) bookable_services,
   EXISTS(SELECT 1 FROM public.staff st WHERE st.outlet_id=o.outlet_id) staff_configured,
   (nullif(trim(o.booking_slug),'') IS NOT NULL AND coalesce(o.is_active,true)) booking_path,
   EXISTS(SELECT 1 FROM public.appointments a WHERE a.outlet_id=o.outlet_id AND a.source='public-booking' AND a.client_id IS NOT NULL) first_real_booking
  FROM public.outlets o
 ), shaped AS (
  SELECT r.*,(owner_assigned AND business_details AND operating_hours AND bookable_services AND booking_path) configuration_ready,
   CASE WHEN owner_assigned AND business_details AND operating_hours AND bookable_services AND booking_path AND onboarding_status='complete' AND first_real_booking THEN 'activated'
        WHEN owner_assigned AND business_details AND operating_hours AND bookable_services AND booking_path THEN 'ready' ELSE 'pending' END stage,
   to_jsonb(array_remove(ARRAY[CASE WHEN NOT owner_assigned THEN 'Owner not assigned' END,CASE WHEN NOT business_details THEN 'Required business details missing' END,CASE WHEN NOT operating_hours THEN 'Operating hours not configured' END,CASE WHEN NOT bookable_services THEN 'No visible bookable service' END,CASE WHEN NOT booking_path THEN 'Public booking path unavailable' END,CASE WHEN NOT first_real_booking THEN 'No verified real customer booking' END],NULL)) missing_requirements
  FROM readiness r
 )
 SELECT count(*) INTO v_total FROM shaped s WHERE (p_stage IS NULL OR s.stage=p_stage) AND (nullif(trim(coalesce(p_search,'')),'') IS NULL OR s.name ILIKE '%'||trim(p_search)||'%' OR s.outlet_id ILIKE '%'||trim(p_search)||'%');
 WITH readiness AS (
  SELECT o.outlet_id,o.name,o.timezone,o.onboarding_status,o.access_status,o.updated_at,
   (o.owner_user_id IS NOT NULL OR EXISTS(SELECT 1 FROM public.outlet_members m WHERE m.outlet_id=o.outlet_id AND m.role='owner' AND m.status='active')) owner_assigned,
   (length(trim(coalesce(o.name,'')))>=2 AND coalesce(nullif(trim(o.email),''),nullif(trim(o.phone),''),nullif(trim(o.phone_number),'')) IS NOT NULL AND (coalesce(o.settings->>'serviceLocationType','')<>'physical' OR coalesce(nullif(trim(o.address_display),''),nullif(trim(o.address->>'addressDisplay'),'')) IS NOT NULL)) business_details,
    EXISTS(SELECT 1 FROM jsonb_each(CASE WHEN jsonb_typeof(o.business_hours)='object' THEN o.business_hours ELSE '{}'::jsonb END) h WHERE lower(coalesce(h.value->>'isOpen','true'))='true' AND h.value->>'open' IS NOT NULL AND h.value->>'close' IS NOT NULL AND h.value->>'open'<>h.value->>'close') operating_hours,
   EXISTS(SELECT 1 FROM public.services s WHERE s.outlet_id=o.outlet_id AND coalesce(s.is_visible,true) AND coalesce(s.duration,0)>0) bookable_services,
   EXISTS(SELECT 1 FROM public.staff st WHERE st.outlet_id=o.outlet_id) staff_configured,
   (nullif(trim(o.booking_slug),'') IS NOT NULL AND coalesce(o.is_active,true)) booking_path,
   EXISTS(SELECT 1 FROM public.appointments a WHERE a.outlet_id=o.outlet_id AND a.source='public-booking' AND a.client_id IS NOT NULL) first_real_booking
  FROM public.outlets o
 ), shaped AS (
  SELECT r.*,(owner_assigned AND business_details AND operating_hours AND bookable_services AND booking_path) configuration_ready,
   CASE WHEN owner_assigned AND business_details AND operating_hours AND bookable_services AND booking_path AND onboarding_status='complete' AND first_real_booking THEN 'activated' WHEN owner_assigned AND business_details AND operating_hours AND bookable_services AND booking_path THEN 'ready' ELSE 'pending' END stage,
   to_jsonb(array_remove(ARRAY[CASE WHEN NOT owner_assigned THEN 'Owner not assigned' END,CASE WHEN NOT business_details THEN 'Required business details missing' END,CASE WHEN NOT operating_hours THEN 'Operating hours not configured' END,CASE WHEN NOT bookable_services THEN 'No visible bookable service' END,CASE WHEN NOT booking_path THEN 'Public booking path unavailable' END,CASE WHEN NOT first_real_booking THEN 'No verified real customer booking' END],NULL)) missing_requirements
  FROM readiness r
 ) SELECT coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) INTO v_rows FROM (SELECT * FROM shaped s WHERE (p_stage IS NULL OR s.stage=p_stage) AND (nullif(trim(coalesce(p_search,'')),'') IS NULL OR s.name ILIKE '%'||trim(p_search)||'%' OR s.outlet_id ILIKE '%'||trim(p_search)||'%') ORDER BY CASE s.stage WHEN 'pending' THEN 0 WHEN 'ready' THEN 1 ELSE 2 END,s.updated_at DESC,s.outlet_id LIMIT least(greatest(p_limit,1),100) OFFSET greatest(p_offset,0)) x;
 RETURN jsonb_build_object('rows',v_rows,'total',v_total,'staff_requirement','not_required_by_current_booking_model');
END $$;


ALTER FUNCTION "public"."platform_onboarding_page"("p_stage" "text", "p_search" "text", "p_limit" integer, "p_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."platform_operations_overview"("p_start_date" "date", "p_end_date" "date", "p_outlet_id" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
DECLARE v_result jsonb;
BEGIN
 IF NOT public.is_platform_admin() THEN RAISE EXCEPTION 'Platform administrator access required'; END IF;
 IF p_start_date IS NULL OR p_end_date IS NULL OR p_end_date < p_start_date OR p_end_date - p_start_date > 366 THEN RAISE EXCEPTION 'Choose a valid range of at most 367 days'; END IF;
 WITH outlet_bounds AS (
  SELECT o.*,CASE WHEN EXISTS(SELECT 1 FROM pg_timezone_names z WHERE z.name=o.timezone) THEN o.timezone ELSE 'UTC' END effective_timezone,
   p_start_date::timestamp AT TIME ZONE (CASE WHEN EXISTS(SELECT 1 FROM pg_timezone_names z WHERE z.name=o.timezone) THEN o.timezone ELSE 'UTC' END) utc_start,
   (p_end_date+1)::timestamp AT TIME ZONE (CASE WHEN EXISTS(SELECT 1 FROM pg_timezone_names z WHERE z.name=o.timezone) THEN o.timezone ELSE 'UTC' END) utc_end
  FROM public.outlets o WHERE p_outlet_id IS NULL OR o.outlet_id=p_outlet_id
 ), metrics AS (
  SELECT
   count(*) FILTER(WHERE status='active' AND access_status='active' AND onboarding_status='complete') active_outlets,
   (SELECT count(*) FROM public.appointments a JOIN outlet_bounds o ON o.outlet_id=a.outlet_id WHERE a.created_at>=o.utc_start AND a.created_at < o.utc_end) bookings_created,
   (SELECT count(*) FROM public.appointments a JOIN outlet_bounds o ON o.outlet_id=a.outlet_id WHERE a.date~'^\d{4}-\d{2}-\d{2}$' AND a.date::date BETWEEN p_start_date AND p_end_date) appointments_scheduled,
   (SELECT count(*) FROM public.appointments a JOIN outlet_bounds o ON o.outlet_id=a.outlet_id WHERE a.completed_at>=o.utc_start AND a.completed_at < o.utc_end) appointments_completed,
   (SELECT count(*) FROM public.appointments a JOIN outlet_bounds o ON o.outlet_id=a.outlet_id WHERE a.cancelled_at>=o.utc_start AND a.cancelled_at < o.utc_end) appointments_cancelled,
   (SELECT count(*) FROM public.platform_admin_operations op LEFT JOIN outlet_bounds o ON o.outlet_id=op.outlet_id WHERE (p_outlet_id IS NULL OR op.outlet_id=p_outlet_id) AND op.state IN ('failed','partial') AND op.started_at>=coalesce(o.utc_start,p_start_date::timestamp AT TIME ZONE 'UTC') AND op.started_at < coalesce(o.utc_end,(p_end_date+1)::timestamp AT TIME ZONE 'UTC')) failed_operations,
   (SELECT count(*) FROM public.marketing_campaign_deliveries d JOIN outlet_bounds o ON o.outlet_id=d.outlet_id WHERE d.status='failed' AND d.updated_at>=o.utc_start AND d.updated_at < o.utc_end) failed_messages,
   (SELECT count(*) FROM public.platform_support_cases c WHERE c.status<>'resolved' AND (p_outlet_id IS NULL OR c.outlet_id=p_outlet_id)) unresolved_support
  FROM outlet_bounds
 ), attention AS (
  SELECT * FROM (
   SELECT c.outlet_id,o.name outlet_name,'support' issue_type,CASE c.priority WHEN 'urgent' THEN 'critical' WHEN 'high' THEN 'error' ELSE 'warning' END severity,c.subject issue,c.updated_at occurred_at,'/admin/support?case='||c.id destination
   FROM public.platform_support_cases c JOIN outlet_bounds o ON o.outlet_id=c.outlet_id WHERE c.status<>'resolved'
   UNION ALL
   SELECT e.outlet_id,o.name,'monitoring',e.severity,public.platform_sanitize_error(e.message),e.occurred_at,'/admin/integrations-jobs?tab=jobs' FROM public.platform_monitoring_events e JOIN outlet_bounds o ON o.outlet_id=e.outlet_id WHERE e.severity IN ('error','critical')
   UNION ALL
    SELECT op.outlet_id,o.name,'operation',CASE WHEN op.state='failed' THEN 'error' ELSE 'warning' END,op.action||' '||op.state,coalesce(op.completed_at,op.started_at),'/admin/integrations-jobs?tab=jobs' FROM public.platform_admin_operations op JOIN outlet_bounds o ON o.outlet_id=op.outlet_id WHERE op.state IN ('failed','partial')
    UNION ALL
    SELECT o.outlet_id,o.name,'onboarding','warning','Onboarding requirements are incomplete',o.updated_at,'/admin/onboarding?stage=pending&outlet='||o.outlet_id
    FROM outlet_bounds o WHERE NOT (
     (o.owner_user_id IS NOT NULL OR EXISTS(SELECT 1 FROM public.outlet_members m WHERE m.outlet_id=o.outlet_id AND m.role='owner' AND m.status='active'))
     AND length(trim(coalesce(o.name,'')))>=2
     AND coalesce(nullif(trim(o.email),''),nullif(trim(o.phone),''),nullif(trim(o.phone_number),'')) IS NOT NULL
     AND (coalesce(o.settings->>'serviceLocationType','')<>'physical' OR coalesce(nullif(trim(o.address_display),''),nullif(trim(o.address->>'addressDisplay'),'')) IS NOT NULL)
     AND EXISTS(SELECT 1 FROM jsonb_each(CASE WHEN jsonb_typeof(o.business_hours)='object' THEN o.business_hours ELSE '{}'::jsonb END) h WHERE lower(coalesce(h.value->>'isOpen','true'))='true' AND h.value->>'open' IS NOT NULL AND h.value->>'close' IS NOT NULL AND h.value->>'open'<>h.value->>'close')
     AND EXISTS(SELECT 1 FROM public.services s WHERE s.outlet_id=o.outlet_id AND coalesce(s.is_visible,true) AND coalesce(s.duration,0)>0)
     AND nullif(trim(o.booking_slug),'') IS NOT NULL AND coalesce(o.is_active,true)
    )
  ) u ORDER BY occurred_at DESC LIMIT 25
 ), onboarding_attention AS (
  SELECT count(*) n FROM outlet_bounds o WHERE NOT (
   (o.owner_user_id IS NOT NULL OR EXISTS(SELECT 1 FROM public.outlet_members m WHERE m.outlet_id=o.outlet_id AND m.role='owner' AND m.status='active'))
    AND length(trim(coalesce(o.name,'')))>=2
    AND coalesce(nullif(trim(o.email),''),nullif(trim(o.phone),''),nullif(trim(o.phone_number),'')) IS NOT NULL
    AND (coalesce(o.settings->>'serviceLocationType','')<>'physical' OR coalesce(nullif(trim(o.address_display),''),nullif(trim(o.address->>'addressDisplay'),'')) IS NOT NULL)
    AND EXISTS(SELECT 1 FROM jsonb_each(CASE WHEN jsonb_typeof(o.business_hours)='object' THEN o.business_hours ELSE '{}'::jsonb END) h WHERE lower(coalesce(h.value->>'isOpen','true'))='true' AND h.value->>'open' IS NOT NULL AND h.value->>'close' IS NOT NULL AND h.value->>'open'<>h.value->>'close')
   AND EXISTS(SELECT 1 FROM public.services s WHERE s.outlet_id=o.outlet_id AND coalesce(s.is_visible,true) AND coalesce(s.duration,0)>0)
   AND nullif(trim(o.booking_slug),'') IS NOT NULL AND coalesce(o.is_active,true)
  )
 ) SELECT jsonb_build_object('metrics',to_jsonb(metrics),'onboarding_attention',(SELECT n FROM onboarding_attention),'attention',coalesce((SELECT jsonb_agg(to_jsonb(attention)) FROM attention),'[]'::jsonb),'refreshed_at',now(),'range_timezone_rule','Each outlet local calendar range; invalid/missing timezone falls back to UTC','active_outlet_definition','status active + portal access active + onboarding complete','cancellation_definition','cancelled_at only; historical rows without a cancellation timestamp are excluded') INTO v_result FROM metrics;
 RETURN v_result;
END $_$;


ALTER FUNCTION "public"."platform_operations_overview"("p_start_date" "date", "p_end_date" "date", "p_outlet_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."platform_outlet_inspector"("p_outlet_id" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
DECLARE
  v_summary jsonb;
  v_accounts jsonb;
  v_billing jsonb;
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Platform administrator access required';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.outlets WHERE outlet_id = p_outlet_id) THEN
    RAISE EXCEPTION 'Outlet not found';
  END IF;

  WITH target AS (
    SELECT * FROM public.outlets WHERE outlet_id = p_outlet_id
  ), owner_account AS (
    SELECT m.user_id,
      coalesce(nullif(p.full_name, ''), nullif(u.display_name, '')) owner_name,
      coalesce(nullif(p.email, ''), nullif(u.email, ''), au.email) owner_email
    FROM target o
    JOIN public.outlet_members m ON m.outlet_id = o.outlet_id AND m.status = 'active'
    LEFT JOIN public.profiles p ON p.id = m.user_id
    LEFT JOIN public.users u ON u.uid = m.user_id::text
    LEFT JOIN auth.users au ON au.id = m.user_id
    WHERE m.role = 'owner' OR m.user_id = o.owner_user_id
    ORDER BY (m.user_id = o.owner_user_id) DESC, m.created_at
    LIMIT 1
  ), recent AS (
    SELECT * FROM (
      SELECT 'booking'::text type, a.id reference, a.status, coalesce(a.updated_at, a.created_at) occurred_at
      FROM public.appointments a WHERE a.outlet_id = p_outlet_id
      UNION ALL
      SELECT 'sale', t.id, coalesce(t.status, t.payment_status, t.type), t.created_at
      FROM public.transactions t WHERE t.outlet_id = p_outlet_id
      UNION ALL
      SELECT 'support', c.id::text, c.status, c.updated_at
      FROM public.platform_support_cases c WHERE c.outlet_id = p_outlet_id
      UNION ALL
      SELECT 'audit', e.id::text, e.outcome, e.occurred_at
      FROM public.platform_audit_events e WHERE e.outlet_id = p_outlet_id
    ) activity
    ORDER BY occurred_at DESC NULLS LAST
    LIMIT 8
  ), activity_json AS (
    SELECT coalesce(jsonb_agg(to_jsonb(recent) ORDER BY occurred_at DESC NULLS LAST), '[]'::jsonb) value FROM recent
  )
  SELECT jsonb_build_object(
    'outlet_id', o.outlet_id,
    'name', coalesce(nullif(o.name, ''), o.outlet_id),
    'portal_status', coalesce(o.access_status, o.status, 'unknown'),
    'onboarding_status', coalesce(o.onboarding_status, 'unknown'),
    'last_activity_at', greatest(
      o.updated_at,
      (SELECT max(coalesce(a.updated_at, a.created_at)) FROM public.appointments a WHERE a.outlet_id = o.outlet_id),
      (SELECT max(t.created_at) FROM public.transactions t WHERE t.outlet_id = o.outlet_id),
      (SELECT max(e.occurred_at) FROM public.platform_audit_events e WHERE e.outlet_id = o.outlet_id)
    ),
    'owner_name', owner.owner_name,
    'owner_email', owner.owner_email,
    'email', nullif(o.email, ''),
    'phone', coalesce(nullif(o.phone, ''), nullif(o.phone_number, '')),
    'booking_slug', nullif(o.booking_slug, ''),
    'timezone', nullif(o.timezone, ''),
    'business_hours_status', CASE
      WHEN o.business_hours IS NULL THEN 'missing'
      WHEN jsonb_typeof(o.business_hours) <> 'object' THEN 'unknown'
      WHEN EXISTS (
        SELECT 1 FROM jsonb_each(o.business_hours) h
        WHERE lower(coalesce(h.value->>'isOpen', 'true')) = 'true'
          AND nullif(h.value->>'open', '') IS NOT NULL
          AND nullif(h.value->>'close', '') IS NOT NULL
      ) THEN 'configured' ELSE 'missing' END,
    'active_user_count', (
      SELECT count(*) FROM public.outlet_members m
      LEFT JOIN public.platform_account_controls c ON c.user_id = m.user_id
      WHERE m.outlet_id = o.outlet_id AND m.status = 'active' AND coalesce(c.status, 'active') = 'active'
    ),
    'recent_activity', activity_json.value
  ) INTO v_summary
  FROM target o
  LEFT JOIN owner_account owner ON true
  CROSS JOIN activity_json;

  SELECT coalesce(jsonb_agg(to_jsonb(account_row) ORDER BY
    CASE account_row.role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 WHEN 'manager' THEN 2 ELSE 3 END,
    account_row.name, account_row.email
  ), '[]'::jsonb)
  INTO v_accounts
  FROM (
    SELECT m.user_id::text id,
      coalesce(nullif(p.full_name, ''), nullif(u.display_name, ''), nullif(au.raw_user_meta_data->>'full_name', '')) name,
      coalesce(nullif(p.email, ''), nullif(u.email, ''), au.email) email,
      m.role,
      m.status membership_status,
      coalesce(c.status, 'active') account_status,
      au.last_sign_in_at,
      CASE
        WHEN au.invited_at IS NOT NULL AND au.confirmed_at IS NULL THEN 'invited'
        WHEN au.confirmed_at IS NULL THEN 'pending'
        ELSE 'accepted'
      END invitation_state
    FROM public.outlet_members m
    LEFT JOIN public.profiles p ON p.id = m.user_id
    LEFT JOIN public.users u ON u.uid = m.user_id::text
    LEFT JOIN auth.users au ON au.id = m.user_id
    LEFT JOIN public.platform_account_controls c ON c.user_id = m.user_id
    WHERE m.outlet_id = p_outlet_id AND m.status <> 'removed'
  ) account_row;

  SELECT to_jsonb(subscription_row) INTO v_billing
  FROM (
    SELECT s.provider, s.status, s.trial_end, s.current_period_start, s.current_period_end,
      s.unit_amount, s.currency, s.recurring_interval, s.interval_count, s.quantity,
      s.discount_percent, coalesce(s.mrr_reliable, false) mrr_reliable
    FROM public.outlet_subscriptions s
    WHERE s.outlet_id = p_outlet_id
    ORDER BY s.updated_at DESC
    LIMIT 1
  ) subscription_row;

  RETURN jsonb_build_object(
    'summary', v_summary,
    'accounts', v_accounts,
    'billing', v_billing
  );
END;
$$;


ALTER FUNCTION "public"."platform_outlet_inspector"("p_outlet_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."platform_reference_belongs_to_outlet"("p_outlet_id" "text", "p_type" "text", "p_reference_id" "text") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  CASE p_type
    WHEN 'booking' THEN RETURN EXISTS(SELECT 1 FROM public.appointments WHERE outlet_id=p_outlet_id AND id=p_reference_id);
    WHEN 'sale' THEN RETURN EXISTS(SELECT 1 FROM public.transactions WHERE outlet_id=p_outlet_id AND id=p_reference_id);
    WHEN 'operation' THEN RETURN EXISTS(SELECT 1 FROM public.platform_admin_operations WHERE outlet_id=p_outlet_id AND id::text=p_reference_id);
    WHEN 'integration' THEN
      RETURN (p_reference_id='google-business' AND EXISTS(SELECT 1 FROM public.google_business_connections WHERE outlet_id=p_outlet_id))
        OR (p_reference_id='chatbot-api' AND EXISTS(SELECT 1 FROM public.api_integrations WHERE outlet_id=p_outlet_id))
        OR (p_reference_id='marketing' AND EXISTS(SELECT 1 FROM public.marketing_campaigns WHERE outlet_id=p_outlet_id))
        OR (p_reference_id='reminders' AND EXISTS(SELECT 1 FROM public.outlets WHERE outlet_id=p_outlet_id));
    ELSE RETURN false;
  END CASE;
END $$;


ALTER FUNCTION "public"."platform_reference_belongs_to_outlet"("p_outlet_id" "text", "p_type" "text", "p_reference_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."platform_remote_access"("p_outlet_id" "text", "p_action" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE v_name text; v_access text; v_audit uuid;
BEGIN
  IF NOT public.is_platform_admin() THEN RAISE EXCEPTION 'Platform administrator access required'; END IF;
  IF p_action NOT IN ('enter','exit','validate') THEN RAISE EXCEPTION 'Unsupported remote access action'; END IF;
  SELECT name,access_status INTO v_name,v_access FROM public.outlets WHERE outlet_id=p_outlet_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Outlet not found'; END IF;
  IF p_action<>'validate' THEN
    INSERT INTO public.platform_audit_events(outlet_id,action,affected_target,actor_uid,actor_email,metadata,source,outcome)
    VALUES (p_outlet_id,'remote access '||p_action,coalesce(v_name,p_outlet_id),auth.uid()::text,(SELECT email FROM public.profiles WHERE id=auth.uid()),
      jsonb_build_object('mode','inspection with existing platform-admin capabilities'),'platform-rpc','succeeded')
    RETURNING id INTO v_audit;
  END IF;
  RETURN jsonb_build_object('outlet_id',p_outlet_id,'outlet_name',v_name,'access_status',v_access,'audit_id',v_audit);
END $$;


ALTER FUNCTION "public"."platform_remote_access"("p_outlet_id" "text", "p_action" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."platform_sanitize_error"("p_value" "text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    SET "search_path" TO 'public'
    AS $$
  SELECT left(
    regexp_replace(
      regexp_replace(
        regexp_replace(coalesce(p_value,''),'(?i)bearer[[:space:]]+[a-z0-9._~+/-]+=*','Bearer [REDACTED]','g'),
        '(?i)(access_token|refresh_token|client_secret|authorization)([[:space:]]*[:=][[:space:]]*)[^,[:space:]}]+','\1\2[REDACTED]','g'),
      '(sk|pk|whsec)_[A-Za-z0-9_-]+','[REDACTED_KEY]','g'),
    500)
$$;


ALTER FUNCTION "public"."platform_sanitize_error"("p_value" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."platform_sanitize_jsonb"("p_value" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" IMMUTABLE
    SET "search_path" TO 'public'
    AS $_$
DECLARE
  v_result jsonb;
BEGIN
  IF p_value IS NULL THEN
    RETURN '{}'::jsonb;
  END IF;
  CASE jsonb_typeof(p_value)
    WHEN 'string' THEN
      RETURN to_jsonb(public.platform_sanitize_error(p_value #>> '{}'));
    WHEN 'array' THEN
      SELECT coalesce(jsonb_agg(public.platform_sanitize_jsonb(elem)), '[]'::jsonb)
        INTO v_result
        FROM jsonb_array_elements(p_value) AS elem;
      RETURN v_result;
    WHEN 'object' THEN
      SELECT coalesce(jsonb_object_agg(
        e.key,
        CASE
          WHEN e.key ~* '^(access_token|refresh_token|client_secret|authorization|api[_-]?key|token|password|secret|signing_secret)$'
            THEN to_jsonb('[REDACTED]'::text)
          ELSE public.platform_sanitize_jsonb(e.value)
        END
      ), '{}'::jsonb)
        INTO v_result
        FROM jsonb_each(p_value) AS e;
      RETURN v_result;
    ELSE
      RETURN p_value;
  END CASE;
END;
$_$;


ALTER FUNCTION "public"."platform_sanitize_jsonb"("p_value" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."platform_set_outlet_access"("p_outlet_id" "text", "p_enabled" boolean, "p_reason" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE v_before text; v_after text := CASE WHEN p_enabled THEN 'active' ELSE 'suspended' END; v_name text; v_audit uuid;
BEGIN
  IF NOT public.is_platform_admin() THEN RAISE EXCEPTION 'Platform administrator access required'; END IF;
  IF NOT p_enabled AND length(trim(coalesce(p_reason,''))) < 3 THEN RAISE EXCEPTION 'A suspension reason is required'; END IF;
  SELECT access_status,name INTO v_before,v_name FROM public.outlets WHERE outlet_id=p_outlet_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Outlet not found'; END IF;
  UPDATE public.outlets SET access_status=v_after,updated_at=now()
  WHERE outlet_id=p_outlet_id AND access_status IS DISTINCT FROM v_after;
  INSERT INTO public.platform_audit_events(outlet_id,action,affected_target,actor_uid,actor_email,reason,metadata,source,outcome)
  VALUES (p_outlet_id,CASE WHEN p_enabled THEN 'portal restored' ELSE 'portal suspended' END,
    coalesce(v_name,p_outlet_id),auth.uid()::text,(SELECT email FROM public.profiles WHERE id=auth.uid()),nullif(trim(coalesce(p_reason,'')),''),
    jsonb_build_object('before',v_before,'after',v_after,'public_booking_unchanged',true),'platform-rpc','succeeded')
  RETURNING id INTO v_audit;
  RETURN jsonb_build_object('outlet_id',p_outlet_id,'previous_state',v_before,'new_state',v_after,'changed',v_before IS DISTINCT FROM v_after,'audit_id',v_audit);
END $$;


ALTER FUNCTION "public"."platform_set_outlet_access"("p_outlet_id" "text", "p_enabled" boolean, "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."platform_support_case_detail"("p_case_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE v_case jsonb; v_refs jsonb; v_events jsonb;
BEGIN
 IF NOT public.is_platform_admin() THEN RAISE EXCEPTION 'Platform administrator access required'; END IF;
 SELECT to_jsonb(x) INTO v_case FROM (SELECT c.*,o.name outlet_name,coalesce(p.full_name,p.email) assigned_name FROM public.platform_support_cases c JOIN public.outlets o ON o.outlet_id=c.outlet_id LEFT JOIN public.profiles p ON p.id=c.assigned_to WHERE c.id=p_case_id) x;
 IF v_case IS NULL THEN RAISE EXCEPTION 'Support case not found'; END IF;
 SELECT coalesce(jsonb_agg(to_jsonb(r) ORDER BY r.created_at),'[]'::jsonb) INTO v_refs FROM public.platform_support_case_references r WHERE r.case_id=p_case_id;
 SELECT coalesce(jsonb_agg(to_jsonb(e) ORDER BY e.created_at DESC),'[]'::jsonb) INTO v_events FROM public.platform_support_case_events e WHERE e.case_id=p_case_id;
 RETURN jsonb_build_object('case',v_case,'references',v_refs,'events',v_events);
END $$;


ALTER FUNCTION "public"."platform_support_case_detail"("p_case_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."platform_support_cases_page"("p_search" "text" DEFAULT NULL::"text", "p_status" "text" DEFAULT NULL::"text", "p_priority" "text" DEFAULT NULL::"text", "p_category" "text" DEFAULT NULL::"text", "p_outlet_id" "text" DEFAULT NULL::"text", "p_limit" integer DEFAULT 25, "p_offset" integer DEFAULT 0) RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE v_rows jsonb; v_total bigint;
BEGIN
 IF NOT public.is_platform_admin() THEN RAISE EXCEPTION 'Platform administrator access required'; END IF;
 SELECT count(*) INTO v_total FROM public.platform_support_cases c JOIN public.outlets o ON o.outlet_id=c.outlet_id WHERE
  (p_status IS NULL OR c.status=p_status) AND (p_priority IS NULL OR c.priority=p_priority) AND
  (p_category IS NULL OR c.category=p_category) AND (p_outlet_id IS NULL OR c.outlet_id=p_outlet_id) AND
  (nullif(trim(coalesce(p_search,'')),'') IS NULL OR c.subject ILIKE '%'||trim(p_search)||'%' OR c.id::text ILIKE '%'||trim(p_search)||'%' OR o.name ILIKE '%'||trim(p_search)||'%');
 SELECT coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) INTO v_rows FROM (
  SELECT c.id,c.outlet_id,o.name outlet_name,c.category,c.priority,c.subject,c.status,c.assigned_to,
   coalesce(p.full_name,p.email) assigned_name,c.resolution_summary,c.created_at,c.updated_at,c.resolved_at
  FROM public.platform_support_cases c JOIN public.outlets o ON o.outlet_id=c.outlet_id
  LEFT JOIN public.profiles p ON p.id=c.assigned_to WHERE
   (p_status IS NULL OR c.status=p_status) AND (p_priority IS NULL OR c.priority=p_priority) AND
   (p_category IS NULL OR c.category=p_category) AND (p_outlet_id IS NULL OR c.outlet_id=p_outlet_id) AND
   (nullif(trim(coalesce(p_search,'')),'') IS NULL OR c.subject ILIKE '%'||trim(p_search)||'%' OR c.id::text ILIKE '%'||trim(p_search)||'%' OR o.name ILIKE '%'||trim(p_search)||'%')
  ORDER BY CASE c.priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END,c.updated_at DESC,c.id
  LIMIT least(greatest(p_limit,1),100) OFFSET greatest(p_offset,0)
 ) x;
 RETURN jsonb_build_object('rows',v_rows,'total',v_total);
END $$;


ALTER FUNCTION "public"."platform_support_cases_page"("p_search" "text", "p_status" "text", "p_priority" "text", "p_category" "text", "p_outlet_id" "text", "p_limit" integer, "p_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."platform_support_operators"() RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE v_rows jsonb; BEGIN
 IF NOT public.is_platform_admin() THEN RAISE EXCEPTION 'Platform administrator access required'; END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',pa.user_id,'name',coalesce(p.full_name,p.email,pa.user_id::text),'email',p.email) ORDER BY coalesce(p.full_name,p.email)),'[]'::jsonb)
 INTO v_rows FROM public.platform_admins pa LEFT JOIN public.profiles p ON p.id=pa.user_id WHERE pa.status='active'; RETURN v_rows;
END $$;


ALTER FUNCTION "public"."platform_support_operators"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."platform_transfer_outlet_ownership"("p_outlet_id" "text", "p_current_owner" "uuid", "p_new_owner" "uuid", "p_reason" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE v_actual_owner uuid; v_old_role text; v_new_role text; v_audit uuid;
BEGIN
  IF NOT public.is_platform_admin() THEN RAISE EXCEPTION 'Platform administrator access required'; END IF;
  IF p_current_owner=p_new_owner THEN RAISE EXCEPTION 'Choose a different new owner'; END IF;
  IF length(trim(coalesce(p_reason,'')))<3 THEN RAISE EXCEPTION 'A transfer reason is required'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_outlet_id,0));
  SELECT owner_user_id INTO v_actual_owner FROM public.outlets WHERE outlet_id=p_outlet_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Outlet not found'; END IF;
  SELECT role INTO v_old_role FROM public.outlet_members WHERE outlet_id=p_outlet_id AND user_id=p_current_owner AND status='active' FOR UPDATE;
  SELECT role INTO v_new_role FROM public.outlet_members WHERE outlet_id=p_outlet_id AND user_id=p_new_owner AND status='active' FOR UPDATE;
  IF v_old_role IS NULL OR v_new_role IS NULL THEN RAISE EXCEPTION 'Both accounts must be active members of the selected outlet'; END IF;
  IF v_old_role<>'owner' OR (v_actual_owner IS NOT NULL AND v_actual_owner<>p_current_owner) THEN RAISE EXCEPTION 'Current ownership changed; reload and try again'; END IF;
  IF v_new_role='owner' THEN RAISE EXCEPTION 'Selected account is already the owner'; END IF;
  UPDATE public.outlet_members SET role='admin',updated_at=now() WHERE outlet_id=p_outlet_id AND user_id=p_current_owner;
  UPDATE public.outlet_members SET role='owner',updated_at=now() WHERE outlet_id=p_outlet_id AND user_id=p_new_owner;
  UPDATE public.outlets SET owner_user_id=p_new_owner,updated_at=now() WHERE outlet_id=p_outlet_id;
  UPDATE public.users SET role='admin' WHERE uid=p_current_owner::text AND outlet_id=p_outlet_id;
  UPDATE public.users SET role='admin' WHERE uid=p_new_owner::text AND outlet_id=p_outlet_id;
  INSERT INTO public.platform_audit_events(outlet_id,action,affected_target,actor_uid,actor_email,reason,metadata,source,outcome)
  VALUES (p_outlet_id,'ownership transferred',p_outlet_id,auth.uid()::text,(SELECT email FROM public.profiles WHERE id=auth.uid()),p_reason,
    jsonb_build_object('old_owner',p_current_owner,'new_owner',p_new_owner,'previous_owner_role','owner','previous_owner_new_role','admin'),'platform-rpc','succeeded')
  RETURNING id INTO v_audit;
  RETURN jsonb_build_object('outlet_id',p_outlet_id,'old_owner',p_current_owner,'new_owner',p_new_owner,'audit_id',v_audit);
END $$;


ALTER FUNCTION "public"."platform_transfer_outlet_ownership"("p_outlet_id" "text", "p_current_owner" "uuid", "p_new_owner" "uuid", "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."platform_update_account_deletion_request"("p_request_id" "uuid", "p_status" "text", "p_processing_notes" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_row public.platform_account_deletion_requests%ROWTYPE;
  v_email text;
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Platform administrator access required';
  END IF;

  IF p_status NOT IN ('pending', 'in_review', 'completed', 'rejected') THEN
    RAISE EXCEPTION 'Invalid request status';
  END IF;

  SELECT * INTO v_row
  FROM public.platform_account_deletion_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Account deletion request not found';
  END IF;

  UPDATE public.platform_account_deletion_requests
  SET
    status = p_status,
    processing_notes = coalesce(nullif(trim(coalesce(p_processing_notes, '')), ''), processing_notes),
    processed_by = CASE WHEN p_status IN ('completed', 'rejected') THEN auth.uid() ELSE processed_by END,
    processed_at = CASE WHEN p_status IN ('completed', 'rejected') THEN now() ELSE processed_at END
  WHERE id = p_request_id;

  IF p_status = 'completed'
     AND v_row.status IS DISTINCT FROM 'completed'
     AND v_row.requesting_user_uid IS NOT NULL THEN
    UPDATE auth.users
    SET banned_until = 'infinity'
    WHERE id = v_row.requesting_user_uid;
    DELETE FROM auth.sessions WHERE user_id = v_row.requesting_user_uid;
    DELETE FROM auth.refresh_tokens WHERE user_id = v_row.requesting_user_uid;
  END IF;

  SELECT email INTO v_email FROM public.profiles WHERE id = auth.uid();

  INSERT INTO public.platform_audit_events (
    outlet_id, action, affected_target, actor_uid, actor_email, metadata, source, outcome
  ) VALUES (
    v_row.outlet_id,
    'account deletion request updated',
    p_request_id::text,
    auth.uid()::text,
    v_email,
    jsonb_build_object('from_status', v_row.status, 'to_status', p_status, 'sessions_revoked', p_status = 'completed'),
    'account-deletion-rpc',
    'succeeded'
  );
END $$;


ALTER FUNCTION "public"."platform_update_account_deletion_request"("p_request_id" "uuid", "p_status" "text", "p_processing_notes" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."platform_update_support_case"("p_case_id" "uuid", "p_action" "text", "p_status" "text" DEFAULT NULL::"text", "p_assigned_to" "uuid" DEFAULT NULL::"uuid", "p_note" "text" DEFAULT NULL::"text", "p_resolution_summary" "text" DEFAULT NULL::"text", "p_expected_updated_at" timestamp with time zone DEFAULT NULL::timestamp with time zone) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE v_case public.platform_support_cases%rowtype; v_email text; v_before jsonb; v_after jsonb;
BEGIN
  IF NOT public.is_platform_admin() THEN RAISE EXCEPTION 'Platform administrator access required'; END IF;
  SELECT * INTO v_case FROM public.platform_support_cases WHERE id=p_case_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Support case not found'; END IF;
  IF p_expected_updated_at IS NOT NULL AND v_case.updated_at<>p_expected_updated_at THEN RAISE EXCEPTION 'Support case changed; reload before updating'; END IF;
  SELECT email INTO v_email FROM public.profiles WHERE id=auth.uid();
  v_before:=jsonb_build_object('status',v_case.status,'assigned_to',v_case.assigned_to,'resolution_summary',v_case.resolution_summary);
  IF p_action='assign' THEN
    IF p_assigned_to IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.platform_admins WHERE user_id=p_assigned_to AND status='active') THEN RAISE EXCEPTION 'Assignee is not an eligible platform operator'; END IF;
    UPDATE public.platform_support_cases SET assigned_to=p_assigned_to,updated_at=now() WHERE id=p_case_id;
    INSERT INTO public.platform_support_case_events(case_id,event_type,actor_uid,actor_email,before_value,after_value)
    VALUES(p_case_id,'assignment_changed',auth.uid(),v_email,jsonb_build_object('assigned_to',v_case.assigned_to),jsonb_build_object('assigned_to',p_assigned_to));
  ELSIF p_action='set_status' THEN
    IF p_status IS NULL OR p_status NOT IN ('open','in_progress','waiting_on_merchant') OR v_case.status='resolved' THEN RAISE EXCEPTION 'Invalid status transition'; END IF;
    UPDATE public.platform_support_cases SET status=p_status,updated_at=now() WHERE id=p_case_id;
    INSERT INTO public.platform_support_case_events(case_id,event_type,actor_uid,actor_email,before_value,after_value)
    VALUES(p_case_id,'status_changed',auth.uid(),v_email,jsonb_build_object('status',v_case.status),jsonb_build_object('status',p_status));
  ELSIF p_action='add_note' THEN
    IF char_length(trim(coalesce(p_note,'')))<2 THEN RAISE EXCEPTION 'Internal note is required'; END IF;
    UPDATE public.platform_support_cases SET updated_at=now() WHERE id=p_case_id;
    INSERT INTO public.platform_support_case_events(case_id,event_type,actor_uid,actor_email,note)
    VALUES(p_case_id,'internal_note',auth.uid(),v_email,left(trim(p_note),5000));
  ELSIF p_action='resolve' THEN
    IF v_case.status='resolved' OR char_length(trim(coalesce(p_resolution_summary,'')))<3 THEN RAISE EXCEPTION 'Resolution summary is required'; END IF;
    UPDATE public.platform_support_cases SET status='resolved',resolution_summary=left(trim(p_resolution_summary),5000),resolved_at=now(),updated_at=now() WHERE id=p_case_id;
    INSERT INTO public.platform_support_case_events(case_id,event_type,actor_uid,actor_email,before_value,after_value,note)
    VALUES(p_case_id,'resolved',auth.uid(),v_email,jsonb_build_object('status',v_case.status),jsonb_build_object('status','resolved'),left(trim(p_resolution_summary),5000));
  ELSIF p_action='reopen' THEN
    IF v_case.status<>'resolved' THEN RAISE EXCEPTION 'Only resolved cases can be reopened'; END IF;
    UPDATE public.platform_support_cases SET status='open',resolution_summary=NULL,resolved_at=NULL,updated_at=now() WHERE id=p_case_id;
    INSERT INTO public.platform_support_case_events(case_id,event_type,actor_uid,actor_email,before_value,after_value,note)
    VALUES(p_case_id,'reopened',auth.uid(),v_email,jsonb_build_object('status','resolved'),jsonb_build_object('status','open'),nullif(trim(coalesce(p_note,'')),''));
  ELSE RAISE EXCEPTION 'Unsupported support action'; END IF;
  SELECT jsonb_build_object('status',status,'assigned_to',assigned_to,'resolution_summary',resolution_summary,'updated_at',updated_at) INTO v_after FROM public.platform_support_cases WHERE id=p_case_id;
  INSERT INTO public.platform_audit_events(outlet_id,action,affected_target,actor_uid,actor_email,metadata,source,outcome)
  VALUES(v_case.outlet_id,'support case '||p_action,p_case_id::text,auth.uid()::text,v_email,jsonb_build_object('before',v_before,'after',v_after),'support-rpc','succeeded');
  RETURN v_after;
END $$;


ALTER FUNCTION "public"."platform_update_support_case"("p_case_id" "uuid", "p_action" "text", "p_status" "text", "p_assigned_to" "uuid", "p_note" "text", "p_resolution_summary" "text", "p_expected_updated_at" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."public_voucher_confirm_redemption"("p_voucher_id" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v vouchers%ROWTYPE;
BEGIN
  SELECT * INTO v FROM vouchers WHERE id = p_voucher_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Voucher not found.';
  END IF;
  IF v.status = 'redeemed' THEN
    RETURN;
  END IF;
  IF v.status IS DISTINCT FROM 'sold' THEN
    RAISE EXCEPTION 'Voucher must be purchased before redemption.';
  END IF;
  UPDATE vouchers
  SET status = 'redeemed',
      redeemed_at = now()
  WHERE id = p_voucher_id;
END;
$$;


ALTER FUNCTION "public"."public_voucher_confirm_redemption"("p_voucher_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."public_voucher_purchase"("p_voucher_id" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v vouchers%ROWTYPE;
  new_redemption TEXT;
  new_code TEXT;
BEGIN
  SELECT * INTO v FROM vouchers WHERE id = p_voucher_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Voucher not found.';
  END IF;
  IF v.status IS DISTINCT FROM 'active' THEN
    RAISE EXCEPTION 'Voucher is no longer available.';
  END IF;
  IF v.expiry_date IS NOT NULL AND length(trim(v.expiry_date)) > 0 THEN
    IF (v.expiry_date::date + time '23:59:59') < now() THEN
      RAISE EXCEPTION 'Voucher has expired and can no longer be purchased.';
    END IF;
  END IF;
  IF v.secret_code IS NOT NULL AND v.redemption_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'redemptionId', v.redemption_id,
      'secretCode', v.secret_code
    );
  END IF;

  new_redemption := 'rv-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12);
  new_code := lpad((floor(random() * 1000000))::int::text, 6, '0');

  UPDATE vouchers
  SET redemption_id = new_redemption,
      secret_code = new_code
  WHERE id = p_voucher_id;

  RETURN jsonb_build_object(
    'redemptionId', new_redemption,
    'secretCode', new_code
  );
END;
$$;


ALTER FUNCTION "public"."public_voucher_purchase"("p_voucher_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."recalc_client_last_renewal"("p_outlet_id" "text", "p_client_id" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_latest record;
BEGIN
  IF nullif(trim(coalesce(p_outlet_id, '')), '') IS NULL
     OR nullif(trim(coalesce(p_client_id, '')), '') IS NULL THEN
    RETURN;
  END IF;

  SELECT t.date, t.amount
  INTO v_latest
  FROM public.transactions t
  WHERE t.outlet_id = p_outlet_id
    AND t.client_id = p_client_id
    AND t.type = 'SALE'
    AND t.category = 'Membership Renewal'
    AND coalesce(t.voided, false) = false
    AND lower(coalesce(t.status, '')) <> 'voided'
  ORDER BY t.date DESC
  LIMIT 1;

  IF FOUND THEN
    UPDATE public.clients
    SET
      last_renewed_at = v_latest.date,
      last_renewal_amount = v_latest.amount
    WHERE id = p_client_id
      AND outlet_id = p_outlet_id;
  ELSE
    UPDATE public.clients
    SET
      last_renewed_at = NULL,
      last_renewal_amount = NULL
    WHERE id = p_client_id
      AND outlet_id = p_outlet_id;
  END IF;
END;
$$;


ALTER FUNCTION "public"."recalc_client_last_renewal"("p_outlet_id" "text", "p_client_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reject_immutable_platform_event_change"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RAISE EXCEPTION 'Platform event records are append-only';
END;
$$;


ALTER FUNCTION "public"."reject_immutable_platform_event_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reject_support_history_change"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$ BEGIN RAISE EXCEPTION 'Support history is append-only'; END $$;


ALTER FUNCTION "public"."reject_support_history_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."renew_member_membership"("p_client_id" "text", "p_amount" numeric, "p_payment_method" "text" DEFAULT 'Cash'::"text", "p_operator_name" "text" DEFAULT NULL::"text", "p_renewed_at" timestamp with time zone DEFAULT NULL::timestamp with time zone) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_outlet_id text := public.current_portal_outlet_id();
  v_client public.clients%rowtype;
  v_transaction_id text := replace(gen_random_uuid()::text, '-', '');
  v_amount numeric := round(coalesce(p_amount, 0), 2);
  v_payment_method text := nullif(trim(coalesce(p_payment_method, '')), '');
  v_operator text := nullif(trim(coalesce(p_operator_name, '')), '');
  v_description text;
  v_items jsonb;
  v_renewed_at timestamptz := coalesce(p_renewed_at, now());
BEGIN
  IF auth.uid() IS NULL OR v_outlet_id IS NULL THEN
    RAISE EXCEPTION 'Authenticated outlet membership required';
  END IF;
  IF nullif(trim(coalesce(p_client_id, '')), '') IS NULL THEN
    RAISE EXCEPTION 'Client id is required';
  END IF;
  IF v_amount IS NULL OR v_amount <= 0 THEN
    RAISE EXCEPTION 'Renewal amount must be greater than 0';
  END IF;
  IF v_amount <> round(v_amount, 2) THEN
    RAISE EXCEPTION 'Renewal amount may have at most 2 decimal places';
  END IF;
  IF v_payment_method IS NULL THEN
    v_payment_method := 'Cash';
  END IF;

  SELECT * INTO v_client
  FROM public.clients
  WHERE id = p_client_id AND outlet_id = v_outlet_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Member not found in active outlet';
  END IF;

  v_description := 'Membership Renewal - ' || coalesce(nullif(trim(v_client.name), ''), 'Member');
  v_items := jsonb_build_array(
    jsonb_build_object(
      'id', 'membership_renewal',
      'name', 'Membership Renewal',
      'price', v_amount,
      'quantity', 1,
      'type', 'service',
      'points', 0
    )
  );

  INSERT INTO public.transactions (
    id, outlet_id, date, type, client_id, items, amount, category, description,
    payment_method, status, voided, remarks, payment_status, outstanding
  ) VALUES (
    v_transaction_id,
    v_outlet_id,
    v_renewed_at,
    'SALE',
    v_client.id,
    v_items,
    v_amount,
    'Membership Renewal',
    v_description,
    v_payment_method,
    'completed',
    false,
    CASE WHEN v_operator IS NULL THEN NULL ELSE 'Renewed by ' || v_operator END,
    'paid',
    0
  );

  UPDATE public.clients
  SET
    last_renewed_at = v_renewed_at,
    last_renewal_amount = v_amount
  WHERE id = v_client.id AND outlet_id = v_outlet_id;

  INSERT INTO public.audit_logs(outlet_id, actor_user_id, action, target_type, target_id, metadata)
  VALUES (
    v_outlet_id,
    auth.uid(),
    'member_membership_renewed',
    'client',
    v_client.id,
    jsonb_build_object(
      'transaction_id', v_transaction_id,
      'amount', v_amount,
      'payment_method', v_payment_method,
      'operator_name', v_operator,
      'member_name', v_client.name,
      'renewed_at', v_renewed_at
    )
  );

  RETURN jsonb_build_object(
    'transaction_id', v_transaction_id,
    'client_id', v_client.id,
    'amount', v_amount,
    'last_renewed_at', v_renewed_at,
    'last_renewal_amount', v_amount,
    'payment_method', v_payment_method,
    'description', v_description,
    'category', 'Membership Renewal',
    'date', v_renewed_at,
    'remarks', CASE WHEN v_operator IS NULL THEN NULL ELSE 'Renewed by ' || v_operator END
  );
END;
$$;


ALTER FUNCTION "public"."renew_member_membership"("p_client_id" "text", "p_amount" numeric, "p_payment_method" "text", "p_operator_name" "text", "p_renewed_at" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."resolve_merchant_access"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE m record; a boolean;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  PERFORM public.ensure_identity_profiles();
  IF NOT public.is_current_account_enabled() THEN
    RETURN jsonb_build_object('state', 'membership_suspended', 'outlet_id', null, 'role', null, 'scope', 'global_account', 'registration_pending', false);
  END IF;
  a := public.is_platform_admin();
  IF a THEN
    RETURN jsonb_build_object('state', 'platform_admin', 'outlet_id', null, 'role', null, 'registration_pending', false);
  END IF;
  SELECT om.outlet_id, om.role, om.status AS membership_status, o.access_status, o.onboarding_status,
         coalesce(o.settings->>'merchantSetupPending', '') = 'true' AS registration_pending
    INTO m
  FROM public.outlet_members om
  JOIN public.outlets o ON o.outlet_id = om.outlet_id
  WHERE om.user_id = auth.uid() AND om.status = 'active'
  ORDER BY om.created_at
  LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('state', 'no_workspace', 'outlet_id', null, 'role', null, 'registration_pending', true);
  END IF;
  RETURN jsonb_build_object(
    'state', CASE
      WHEN m.membership_status <> 'active' THEN 'membership_suspended'
      WHEN m.access_status <> 'active' THEN 'outlet_suspended'
      WHEN m.onboarding_status <> 'complete' THEN 'onboarding'
      ELSE 'active'
    END,
    'outlet_id', m.outlet_id,
    'role', m.role,
    'onboarding_status', m.onboarding_status,
    'access_status', m.access_status,
    'registration_pending', m.registration_pending
  );
END;
$$;


ALTER FUNCTION "public"."resolve_merchant_access"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."resolve_public_booking_outlet"("p_segment" "text") RETURNS "text"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_segment text := btrim(COALESCE(p_segment, ''));
  v_outlet text;
BEGIN
  IF v_segment = '' THEN RETURN NULL; END IF;
  BEGIN
    v_segment := replace(v_segment, '%2F', '/');
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  SELECT outlet_id INTO v_outlet
  FROM public.outlets
  WHERE outlet_id = v_segment AND COALESCE(is_active, true) = true
  LIMIT 1;
  IF v_outlet IS NOT NULL THEN RETURN v_outlet; END IF;

  SELECT outlet_id INTO v_outlet
  FROM public.outlets
  WHERE lower(COALESCE(booking_slug, '')) = lower(v_segment)
    AND COALESCE(is_active, true) = true
  LIMIT 1;
  IF v_outlet IS NOT NULL THEN RETURN v_outlet; END IF;

  BEGIN
    SELECT outlet_id INTO v_outlet
    FROM public.outlets
    WHERE COALESCE(is_active, true) = true
      AND (
        lower(public.booking_slug_from_name(name)) = lower(v_segment)
        OR lower(public.slugify_booking_name(name)) = lower(v_segment)
      )
    ORDER BY updated_at DESC NULLS LAST
    LIMIT 1;
  EXCEPTION WHEN undefined_function THEN
    NULL;
  END;

  RETURN v_outlet;
END;
$$;


ALTER FUNCTION "public"."resolve_public_booking_outlet"("p_segment" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_outlet_member_status"("p_member_id" "uuid", "p_status" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE m public.outlet_members%rowtype; BEGIN SELECT * INTO m FROM public.outlet_members WHERE id=p_member_id FOR UPDATE;
 IF p_status NOT IN ('active','suspended','removed') OR NOT public.can_manage_outlet_accounts(m.outlet_id) OR m.role='owner' OR m.user_id=auth.uid() THEN RAISE EXCEPTION 'Status change not permitted'; END IF;
 UPDATE public.outlet_members SET status=p_status,updated_at=now() WHERE id=p_member_id; INSERT INTO public.audit_logs(outlet_id,actor_user_id,action,target_type,target_id,metadata) VALUES(m.outlet_id,auth.uid(),'member.status_changed','outlet_member',p_member_id::text,jsonb_build_object('status',p_status)); END $$;


ALTER FUNCTION "public"."set_outlet_member_status"("p_member_id" "uuid", "p_status" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."slugify_booking_name"("value" "text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    SET "search_path" TO 'public'
    AS $$
  SELECT trim(both '-' from regexp_replace(lower(coalesce(value, '')), '[^a-z0-9]+', '-', 'g'));
$$;


ALTER FUNCTION "public"."slugify_booking_name"("value" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."staff_free_for_slot"("p_outlet_id" "text", "p_staff_id" "text", "p_date" "text", "p_start_minutes" integer, "p_end_minutes" integer) RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT NOT EXISTS (
    SELECT 1
    FROM public.appointments a
    WHERE a.outlet_id = p_outlet_id
      AND a.staff_id = p_staff_id
      AND a.date = p_date
      AND lower(coalesce(a.status, '')) NOT IN ('cancelled', 'no-show', 'no_show', 'canceled')
      AND p_start_minutes < (
        CASE
          WHEN public.parse_time_to_minutes(coalesce(nullif(a.end_time, ''), a.time))
               > public.parse_time_to_minutes(a.time)
          THEN public.parse_time_to_minutes(coalesce(nullif(a.end_time, ''), a.time))
          ELSE public.parse_time_to_minutes(a.time) + coalesce(
            (SELECT s.duration FROM public.services s WHERE s.id = a.service_id),
            30
          )
        END
      )
      AND public.parse_time_to_minutes(a.time) < p_end_minutes
  );
$$;


ALTER FUNCTION "public"."staff_free_for_slot"("p_outlet_id" "text", "p_staff_id" "text", "p_date" "text", "p_start_minutes" integer, "p_end_minutes" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."submit_merchant_account_deletion_request"("p_reason" "text" DEFAULT NULL::"text", "p_source" "text" DEFAULT 'merchant_portal'::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text;
  v_outlet_id text;
  v_name text;
  v_business text;
  v_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_source NOT IN ('merchant_portal', 'android') THEN
    RAISE EXCEPTION 'Invalid request source';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.platform_admins
    WHERE user_id = v_uid AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Platform administrator accounts cannot be deleted through the merchant app';
  END IF;

  SELECT u.email, u.outlet_id, u.display_name, o.name
  INTO v_email, v_outlet_id, v_name, v_business
  FROM public.users u
  LEFT JOIN public.outlets o ON o.outlet_id = u.outlet_id
  WHERE u.uid = v_uid::text;

  IF v_email IS NULL OR trim(v_email) = '' THEN
    SELECT email INTO v_email FROM auth.users WHERE id = v_uid;
  END IF;

  IF v_email IS NULL OR trim(v_email) = '' THEN
    RAISE EXCEPTION 'Account email could not be resolved';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.platform_account_deletion_requests
    WHERE requesting_user_uid = v_uid AND status IN ('pending', 'in_review')
  ) THEN
    RAISE EXCEPTION 'An account deletion request is already in progress for this account';
  END IF;

  INSERT INTO public.platform_account_deletion_requests (
    requesting_user_uid, outlet_id, email, requester_name, business_name,
    reason, status, source
  ) VALUES (
    v_uid, v_outlet_id, lower(trim(v_email)), v_name, v_business,
    nullif(trim(coalesce(p_reason, '')), ''), 'pending', p_source
  ) RETURNING id INTO v_id;

  INSERT INTO public.platform_audit_events (
    outlet_id, action, affected_target, actor_uid, actor_email, metadata, source, outcome
  ) VALUES (
    v_outlet_id,
    'account deletion requested',
    v_id::text,
    v_uid::text,
    v_email,
    jsonb_build_object('source', p_source),
    'account-deletion-rpc',
    'succeeded'
  );

  RETURN v_id;
END $$;


ALTER FUNCTION "public"."submit_merchant_account_deletion_request"("p_reason" "text", "p_source" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."submit_public_account_deletion_request"("p_email" "text", "p_requester_name" "text" DEFAULT NULL::"text", "p_business_name" "text" DEFAULT NULL::"text", "p_reason" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
DECLARE
  v_email text := lower(trim(coalesce(p_email, '')));
  v_id uuid;
  v_uid uuid;
  v_outlet_id text;
BEGIN
  IF v_email = '' OR position('@' in v_email) = 0 THEN
    RAISE EXCEPTION 'A valid account email is required';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.platform_account_deletion_requests
    WHERE lower(email) = v_email AND status IN ('pending', 'in_review')
  ) THEN
    RAISE EXCEPTION 'An account deletion request is already in progress for this email address';
  END IF;

  SELECT u.uid::uuid, u.outlet_id
  INTO v_uid, v_outlet_id
  FROM public.users u
  WHERE lower(coalesce(u.email, '')) = v_email
    AND u.uid ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  ORDER BY u.created_at DESC NULLS LAST
  LIMIT 1;

  INSERT INTO public.platform_account_deletion_requests (
    requesting_user_uid, outlet_id, email, requester_name, business_name,
    reason, status, source
  ) VALUES (
    v_uid, v_outlet_id, v_email,
    nullif(trim(coalesce(p_requester_name, '')), ''),
    nullif(trim(coalesce(p_business_name, '')), ''),
    nullif(trim(coalesce(p_reason, '')), ''),
    'pending', 'web'
  ) RETURNING id INTO v_id;

  RETURN v_id;
END $_$;


ALTER FUNCTION "public"."submit_public_account_deletion_request"("p_email" "text", "p_requester_name" "text", "p_business_name" "text", "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."submit_public_review"("p_outlet_id" "text", "p_author" "text" DEFAULT NULL::"text", "p_text" "text" DEFAULT NULL::"text", "p_rating" integer DEFAULT 5) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_uid text;
  v_author text;
  v_text text;
  v_rating integer;
  v_reviews jsonb;
  v_entry jsonb;
BEGIN
  v_uid := auth.uid()::text;
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Sign in to leave a review.'
      USING ERRCODE = '42501';
  END IF;

  v_text := btrim(COALESCE(p_text, ''));
  IF btrim(COALESCE(p_outlet_id, '')) = '' OR char_length(v_text) < 3 THEN
    RAISE EXCEPTION 'outletId and a short review text are required.'
      USING ERRCODE = '22023';
  END IF;

  IF char_length(v_text) > 2000 THEN
    RAISE EXCEPTION 'Review text too long.'
      USING ERRCODE = '22023';
  END IF;

  v_rating := COALESCE(p_rating, 5);
  IF v_rating < 1 THEN v_rating := 1; END IF;
  IF v_rating > 5 THEN v_rating := 5; END IF;

  v_author := btrim(COALESCE(p_author, ''));
  IF v_author = '' THEN
    v_author := COALESCE(
      NULLIF(btrim(COALESCE(auth.jwt() ->> 'email', '')), ''),
      'Guest'
    );
    IF position('@' in v_author) > 0 THEN
      v_author := split_part(v_author, '@', 1);
    END IF;
  END IF;
  v_author := left(v_author, 80);

  IF NOT EXISTS (
    SELECT 1 FROM outlets
    WHERE outlet_id = p_outlet_id AND COALESCE(is_active, true) = true
  ) THEN
    RAISE EXCEPTION 'Outlet not found.'
      USING ERRCODE = 'P0002';
  END IF;

  SELECT COALESCE(reviews, '[]'::jsonb) INTO v_reviews
  FROM outlets WHERE outlet_id = p_outlet_id;

  IF jsonb_typeof(v_reviews) <> 'array' THEN
    v_reviews := '[]'::jsonb;
  END IF;

  v_entry := jsonb_build_object(
    'author', v_author,
    'text', v_text,
    'rating', v_rating,
    'createdAt', to_jsonb(now() AT TIME ZONE 'utc'),
    'uid', v_uid
  );

  UPDATE outlets
  SET reviews = v_reviews || jsonb_build_array(v_entry),
      updated_at = now()
  WHERE outlet_id = p_outlet_id;

  RETURN jsonb_build_object('success', true);
END;
$$;


ALTER FUNCTION "public"."submit_public_review"("p_outlet_id" "text", "p_author" "text", "p_text" "text", "p_rating" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."text_or_null"("value" "text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    AS $$ SELECT nullif(btrim(coalesce(value, ''), E' \t\r\n'), ''); $$;


ALTER FUNCTION "public"."text_or_null"("value" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."touch_account_deletion_request_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;


ALTER FUNCTION "public"."touch_account_deletion_request_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."track_appointment_lifecycle"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF lower(coalesce(NEW.status,''))='cancelled' AND NEW.cancelled_at IS NULL THEN NEW.cancelled_at:=now(); END IF;
    IF lower(coalesce(NEW.status,''))='completed' AND NEW.completed_at IS NULL THEN NEW.completed_at:=now(); END IF;
  END IF;
  NEW.updated_at:=now();
  RETURN NEW;
END $$;


ALTER FUNCTION "public"."track_appointment_lifecycle"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."transfer_outlet_ownership"("p_outlet_id" "text", "p_new_owner" "uuid", "p_confirmation" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE old_owner uuid:=auth.uid(); BEGIN IF p_confirmation<>'TRANSFER' OR NOT public.has_outlet_role(p_outlet_id,ARRAY['owner']) OR p_new_owner=old_owner THEN RAISE EXCEPTION 'Ownership transfer not permitted'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.outlet_members WHERE outlet_id=p_outlet_id AND user_id=p_new_owner AND status='active') THEN RAISE EXCEPTION 'New owner must be an active member'; END IF;
 UPDATE public.outlet_members SET role='admin',updated_at=now() WHERE outlet_id=p_outlet_id AND user_id=old_owner AND role='owner'; UPDATE public.outlet_members SET role='owner',updated_at=now() WHERE outlet_id=p_outlet_id AND user_id=p_new_owner;
 UPDATE public.outlets SET owner_user_id=p_new_owner,updated_at=now() WHERE outlet_id=p_outlet_id; INSERT INTO public.audit_logs(outlet_id,actor_user_id,action,target_type,target_id,metadata) VALUES(p_outlet_id,old_owner,'outlet.ownership_transferred','outlet',p_outlet_id,jsonb_build_object('new_owner',p_new_owner)); END $$;


ALTER FUNCTION "public"."transfer_outlet_ownership"("p_outlet_id" "text", "p_new_owner" "uuid", "p_confirmation" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."upsert_frontend_customer_profile"("p_email" "text" DEFAULT NULL::"text", "p_name" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_uid text;
  v_email text;
  v_name text;
BEGIN
  v_uid := auth.uid()::text;
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Sign in required.'
      USING ERRCODE = '42501';
  END IF;

  v_email := lower(btrim(COALESCE(p_email, COALESCE(auth.jwt() ->> 'email', ''))));
  v_name := btrim(COALESCE(p_name, ''));
  IF v_name = '' AND v_email <> '' THEN
    v_name := split_part(v_email, '@', 1);
  END IF;

  INSERT INTO frontend_customers (
    id, name, email, source, booking_history_refs, created_at, updated_at
  ) VALUES (
    v_uid,
    NULLIF(v_name, ''),
    NULLIF(v_email, ''),
    'public-booking',
    '[]'::jsonb,
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    name = COALESCE(EXCLUDED.name, frontend_customers.name),
    email = COALESCE(EXCLUDED.email, frontend_customers.email),
    updated_at = now();

  RETURN jsonb_build_object('success', true, 'id', v_uid);
END;
$$;


ALTER FUNCTION "public"."upsert_frontend_customer_profile"("p_email" "text", "p_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."void_sale_and_remove_linked_appointments"("p_transaction_id" "text", "p_reason" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_outlet_id text := public.current_portal_outlet_id();
  v_tx public.transactions%rowtype;
  v_ids text[];
BEGIN
  IF auth.uid() IS NULL OR v_outlet_id IS NULL THEN
    RAISE EXCEPTION 'Authenticated outlet membership required';
  END IF;
  IF length(trim(coalesce(p_reason, ''))) < 3 THEN
    RAISE EXCEPTION 'A void reason is required';
  END IF;

  SELECT * INTO v_tx
  FROM public.transactions
  WHERE id = p_transaction_id AND outlet_id = v_outlet_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction not found in active outlet';
  END IF;
  IF v_tx.voided OR v_tx.status = 'voided' THEN
    RAISE EXCEPTION 'Transaction is already voided';
  END IF;

  SELECT coalesce(array_agg(id), '{}') INTO v_ids
  FROM public.appointments
  WHERE outlet_id = v_outlet_id
    AND (sale_id = p_transaction_id OR source_sale_id = p_transaction_id);

  UPDATE public.transactions
  SET status = 'voided', voided = true
  WHERE id = p_transaction_id AND outlet_id = v_outlet_id;

  DELETE FROM public.transactions
  WHERE outlet_id = v_outlet_id
    AND parent_sale_id = p_transaction_id
    AND category = 'Commission';

  DELETE FROM public.appointments
  WHERE outlet_id = v_outlet_id AND id = ANY (v_ids);

  -- Membership renewal metadata must follow authoritative SALE history.
  IF v_tx.category = 'Membership Renewal'
     AND nullif(trim(coalesce(v_tx.client_id, '')), '') IS NOT NULL THEN
    PERFORM public.recalc_client_last_renewal(v_outlet_id, v_tx.client_id);
  END IF;

  INSERT INTO public.audit_logs(outlet_id, actor_user_id, action, target_type, target_id, reason, metadata)
  VALUES (
    v_outlet_id,
    auth.uid(),
    'sale_voided',
    'transaction',
    p_transaction_id,
    trim(p_reason),
    jsonb_build_object(
      'appointment_ids', to_jsonb(v_ids),
      'category', v_tx.category,
      'client_id', v_tx.client_id
    )
  );

  RETURN jsonb_build_object(
    'transaction_id', p_transaction_id,
    'appointment_ids', to_jsonb(v_ids),
    'client_id', v_tx.client_id,
    'category', v_tx.category
  );
END;
$$;


ALTER FUNCTION "public"."void_sale_and_remove_linked_appointments"("p_transaction_id" "text", "p_reason" "text") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."api_integrations" (
    "outlet_id" "text" NOT NULL,
    "api_key_hash" "text",
    "key_prefix" "text",
    "webhook_url" "text",
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."api_integrations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."appointments" (
    "id" "text" NOT NULL,
    "outlet_id" "text" NOT NULL,
    "client_id" "text",
    "staff_id" "text",
    "service_id" "text",
    "date" "text" NOT NULL,
    "time" "text" NOT NULL,
    "end_time" "text",
    "status" "text" DEFAULT 'scheduled'::"text",
    "reminder_sent" boolean DEFAULT false,
    "is_on_duty" boolean DEFAULT false,
    "source_sale_id" "text",
    "sale_id" "text",
    "source" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "customer_id" "text",
    "payment_status" "text",
    "completed_at" timestamp with time zone,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "cancelled_at" timestamp with time zone
);

ALTER TABLE ONLY "public"."appointments" REPLICA IDENTITY FULL;


ALTER TABLE "public"."appointments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."audit_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "outlet_id" "text",
    "actor_user_id" "uuid",
    "action" "text" NOT NULL,
    "target_type" "text" NOT NULL,
    "target_id" "text",
    "reason" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."audit_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."billing_customers" (
    "outlet_id" "text" NOT NULL,
    "stripe_customer_id" "text",
    "email" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "provider" "text" DEFAULT 'hitpay'::"text" NOT NULL,
    "hitpay_customer_id" "text",
    CONSTRAINT "billing_customers_provider_check" CHECK (("provider" = ANY (ARRAY['hitpay'::"text", 'stripe'::"text"])))
);


ALTER TABLE "public"."billing_customers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."billing_events" (
    "id" "text" NOT NULL,
    "event_type" "text" NOT NULL,
    "outlet_id" "text",
    "stripe_created_at" timestamp with time zone,
    "livemode" boolean DEFAULT false NOT NULL,
    "payload" "jsonb" NOT NULL,
    "received_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "provider" "text" DEFAULT 'hitpay'::"text" NOT NULL
);


ALTER TABLE "public"."billing_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."clients" (
    "id" "text" NOT NULL,
    "outlet_id" "text" NOT NULL,
    "name" "text" DEFAULT ''::"text" NOT NULL,
    "email" "text" DEFAULT ''::"text",
    "phone" "text" DEFAULT ''::"text",
    "notes" "text" DEFAULT ''::"text",
    "points" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "voucher_count" integer DEFAULT 0,
    "credit" numeric(12,2) DEFAULT 0,
    "outstanding" numeric(12,2) DEFAULT 0,
    "birthday" "text",
    "gender" "text",
    "source" "text",
    "ic" "text",
    "marital" "text",
    "tag" "text",
    "ethnic" "text",
    "member_tier" "text",
    "last_import_id" "text",
    "marketing_email_consent" boolean DEFAULT false NOT NULL,
    "marketing_sms_consent" boolean DEFAULT false NOT NULL,
    "marketing_whatsapp_consent" boolean DEFAULT false NOT NULL,
    "marketing_unsubscribed_at" timestamp with time zone,
    "last_renewed_at" timestamp with time zone,
    "last_renewal_amount" numeric
);

ALTER TABLE ONLY "public"."clients" REPLICA IDENTITY FULL;


ALTER TABLE "public"."clients" OWNER TO "postgres";


COMMENT ON COLUMN "public"."clients"."last_renewed_at" IS 'Timestamp of the most recent membership renewal (join date remains created_at).';



COMMENT ON COLUMN "public"."clients"."last_renewal_amount" IS 'Amount charged for the most recent membership renewal (RM).';



CREATE TABLE IF NOT EXISTS "public"."credit_history" (
    "id" "text" DEFAULT "replace"(("gen_random_uuid"())::"text", '-'::"text", ''::"text") NOT NULL,
    "client_id" "text" NOT NULL,
    "outlet_id" "text",
    "type" "text" NOT NULL,
    "amount" numeric(12,2) DEFAULT 0,
    "new_balance" numeric(12,2) DEFAULT 0,
    "staff_remark" "text",
    "staff_name" "text",
    "timestamp" timestamp with time zone DEFAULT "now"(),
    "transaction_id" "text"
);


ALTER TABLE "public"."credit_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."customer_profiles" (
    "user_id" "uuid" NOT NULL,
    "preferences" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."customer_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."frontend_customers" (
    "id" "text" NOT NULL,
    "outlet_id" "text",
    "name" "text",
    "phone" "text",
    "email" "text",
    "client_id" "text",
    "booking_history_refs" "jsonb" DEFAULT '[]'::"jsonb",
    "last_appointment_id" "text",
    "last_booked_at" timestamp with time zone,
    "source" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."frontend_customers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."google_api_rate_limits" (
    "bucket" "text" NOT NULL,
    "window_started_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "request_count" integer DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."google_api_rate_limits" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."google_business_connections" (
    "outlet_id" "text" NOT NULL,
    "status" "text" DEFAULT 'pending_location'::"text" NOT NULL,
    "google_account_name" "text",
    "google_location_name" "text",
    "location_title" "text",
    "location_address" "text",
    "maps_uri" "text",
    "refresh_token_encrypted" "text",
    "access_token_encrypted" "text",
    "access_token_expires_at" timestamp with time zone,
    "granted_scope" "text",
    "show_on_booking_page" boolean DEFAULT false NOT NULL,
    "average_rating" numeric(3,2),
    "total_review_count" integer,
    "last_synced_at" timestamp with time zone,
    "last_error_code" "text",
    "last_error_message" "text",
    "last_error_at" timestamp with time zone,
    "connected_by" "uuid",
    "connected_email" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "google_place_id" "text",
    "connection_provider" "text",
    CONSTRAINT "google_business_connections_provider_check" CHECK ((("connection_provider" IS NULL) OR ("connection_provider" = ANY (ARRAY['google_places'::"text", 'google_business_profile'::"text"])))),
    CONSTRAINT "google_business_connections_status_check" CHECK (("status" = ANY (ARRAY['pending_location'::"text", 'connected'::"text", 'needs_reauth'::"text", 'error'::"text"])))
);

ALTER TABLE ONLY "public"."google_business_connections" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."google_business_connections" OWNER TO "postgres";


COMMENT ON TABLE "public"."google_business_connections" IS 'Outlet to Google Business Profile location mapping plus encrypted OAuth tokens. Service role only.';



COMMENT ON COLUMN "public"."google_business_connections"."google_place_id" IS 'Google Place ID for the listing. Primary identifier for google_places connections; optional metadata for Business Profile.';



COMMENT ON COLUMN "public"."google_business_connections"."connection_provider" IS 'google_places (default public listing) or google_business_profile (OAuth managed location).';



CREATE TABLE IF NOT EXISTS "public"."google_oauth_states" (
    "state" "text" NOT NULL,
    "outlet_id" "text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "return_to" "text",
    "consumed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone NOT NULL
);

ALTER TABLE ONLY "public"."google_oauth_states" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."google_oauth_states" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."google_review_cursors" (
    "cursor_id" "text" NOT NULL,
    "outlet_id" "text" NOT NULL,
    "order_by" "text" NOT NULL,
    "page_token" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone NOT NULL
);

ALTER TABLE ONLY "public"."google_review_cursors" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."google_review_cursors" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."google_review_page_cache" (
    "outlet_id" "text" NOT NULL,
    "order_by" "text" NOT NULL,
    "page_key" "text" NOT NULL,
    "payload" "jsonb" NOT NULL,
    "fetched_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone NOT NULL
);

ALTER TABLE ONLY "public"."google_review_page_cache" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."google_review_page_cache" OWNER TO "postgres";


COMMENT ON TABLE "public"."google_review_page_cache" IS 'Temporary cache of Google review pages. Rows expire quickly and are deleted on disconnect; not a permanent copy.';



CREATE TABLE IF NOT EXISTS "public"."marketing_audiences" (
    "id" "text" DEFAULT "replace"(("gen_random_uuid"())::"text", '-'::"text", ''::"text") NOT NULL,
    "outlet_id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "criteria" "jsonb" DEFAULT '{"type": "all"}'::"jsonb" NOT NULL,
    "created_by" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."marketing_audiences" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."marketing_campaign_deliveries" (
    "id" "text" DEFAULT "replace"(("gen_random_uuid"())::"text", '-'::"text", ''::"text") NOT NULL,
    "outlet_id" "text" NOT NULL,
    "campaign_id" "text" NOT NULL,
    "client_id" "text" NOT NULL,
    "channel" "text" NOT NULL,
    "recipient_masked" "text",
    "status" "text" DEFAULT 'queued'::"text" NOT NULL,
    "provider" "text",
    "provider_message_id" "text",
    "attempt_count" integer DEFAULT 0 NOT NULL,
    "last_error" "text",
    "queued_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "processed_at" timestamp with time zone,
    "sent_at" timestamp with time zone,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "marketing_campaign_deliveries_channel_check" CHECK (("channel" = ANY (ARRAY['email'::"text", 'sms'::"text", 'whatsapp'::"text"]))),
    CONSTRAINT "marketing_campaign_deliveries_status_check" CHECK (("status" = ANY (ARRAY['queued'::"text", 'processing'::"text", 'sent'::"text", 'failed'::"text", 'skipped'::"text"])))
);


ALTER TABLE "public"."marketing_campaign_deliveries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."marketing_campaigns" (
    "id" "text" DEFAULT "replace"(("gen_random_uuid"())::"text", '-'::"text", ''::"text") NOT NULL,
    "outlet_id" "text" NOT NULL,
    "audience_id" "text",
    "name" "text" NOT NULL,
    "objective" "text" DEFAULT 'promotion'::"text" NOT NULL,
    "channel" "text" NOT NULL,
    "subject" "text",
    "message" "text" NOT NULL,
    "offer" "jsonb" DEFAULT '{"type": "none"}'::"jsonb" NOT NULL,
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "scheduled_at" timestamp with time zone,
    "created_by" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "marketing_campaign_schedule_required" CHECK ((("status" <> 'scheduled'::"text") OR ("scheduled_at" IS NOT NULL))),
    CONSTRAINT "marketing_campaigns_channel_check" CHECK (("channel" = ANY (ARRAY['email'::"text", 'sms'::"text", 'whatsapp'::"text", 'share_link'::"text"]))),
    CONSTRAINT "marketing_campaigns_objective_check" CHECK (("objective" = ANY (ARRAY['promotion'::"text", 'rebooking'::"text", 'retention'::"text", 'announcement'::"text"]))),
    CONSTRAINT "marketing_campaigns_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'scheduled'::"text", 'paused'::"text", 'completed'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."marketing_campaigns" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."merchant_onboarding_drafts" (
    "auth_user_id" "uuid" NOT NULL,
    "current_step" "text" DEFAULT 'account-type'::"text" NOT NULL,
    "account_type" "text",
    "payload" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "completed_at" timestamp with time zone
);


ALTER TABLE "public"."merchant_onboarding_drafts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."merchant_provision_requests" (
    "request_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "outlet_id" "text",
    "error_code" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."merchant_provision_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."onboarding_states" (
    "outlet_id" "text" NOT NULL,
    "current_step" "text" DEFAULT 'business'::"text" NOT NULL,
    "completed_steps" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "first_service_created" boolean DEFAULT false NOT NULL,
    "team_configured" boolean DEFAULT false NOT NULL,
    "operations_configured" boolean DEFAULT false NOT NULL,
    "booking_published" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."onboarding_states" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."outlet_invitations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "outlet_id" "text" NOT NULL,
    "email" "text" NOT NULL,
    "role" "text" NOT NULL,
    "token_hash" "text" NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "accepted_at" timestamp with time zone,
    "accepted_by" "uuid",
    "created_by" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "invited_by" "uuid",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "outlet_invitations_role_check" CHECK (("role" = ANY (ARRAY['admin'::"text", 'manager'::"text", 'cashier'::"text"])))
);


ALTER TABLE "public"."outlet_invitations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."outlet_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "outlet_id" "text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "invited_by" "uuid",
    "joined_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "outlet_members_role_check" CHECK (("role" = ANY (ARRAY['owner'::"text", 'admin'::"text", 'manager'::"text", 'cashier'::"text"]))),
    CONSTRAINT "outlet_members_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'suspended'::"text", 'removed'::"text"])))
);


ALTER TABLE "public"."outlet_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."outlet_subscriptions" (
    "id" "text" NOT NULL,
    "outlet_id" "text" NOT NULL,
    "stripe_customer_id" "text",
    "stripe_price_id" "text",
    "status" "text" NOT NULL,
    "cancel_at_period_end" boolean DEFAULT false NOT NULL,
    "current_period_start" timestamp with time zone,
    "current_period_end" timestamp with time zone,
    "trial_end" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "unit_amount" bigint,
    "currency" "text",
    "recurring_interval" "text",
    "interval_count" integer,
    "quantity" integer,
    "discount_percent" numeric,
    "mrr_reliable" boolean,
    "provider" "text" DEFAULT 'hitpay'::"text" NOT NULL,
    "hitpay_recurring_id" "text",
    "hitpay_plan_id" "text",
    CONSTRAINT "outlet_subscriptions_provider_check" CHECK (("provider" = ANY (ARRAY['hitpay'::"text", 'stripe'::"text"])))
);


ALTER TABLE "public"."outlet_subscriptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."outlets" (
    "outlet_id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "address" "jsonb",
    "address_display" "text",
    "phone_number" "text",
    "phone" "text",
    "email" "text",
    "timezone" "text",
    "business_hours" "jsonb",
    "reviews" "jsonb",
    "settings" "jsonb",
    "service_categories" "jsonb",
    "booking_slug" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "website" "text",
    "owner_user_id" "uuid",
    "business_type" "text",
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "onboarding_status" "text" DEFAULT 'incomplete'::"text" NOT NULL,
    "access_status" "text" DEFAULT 'active'::"text" NOT NULL,
    "account_limit" integer DEFAULT 3 NOT NULL,
    CONSTRAINT "outlets_account_limit_check" CHECK (("account_limit" >= 1))
);

ALTER TABLE ONLY "public"."outlets" REPLICA IDENTITY FULL;


ALTER TABLE "public"."outlets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."outstanding_transactions" (
    "id" "text" NOT NULL,
    "client_id" "text" NOT NULL,
    "outlet_id" "text" NOT NULL,
    "type" "text" NOT NULL,
    "amount" numeric(12,2) DEFAULT 0,
    "previous_balance" numeric(12,2) DEFAULT 0,
    "new_balance" numeric(12,2) DEFAULT 0,
    "timestamp" timestamp with time zone DEFAULT "now"(),
    "is_manual" boolean DEFAULT false,
    "description" "text"
);


ALTER TABLE "public"."outstanding_transactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."packages" (
    "id" "text" NOT NULL,
    "outlet_id" "text" NOT NULL,
    "name" "text" DEFAULT ''::"text" NOT NULL,
    "price" numeric(12,2) DEFAULT 0,
    "points" integer DEFAULT 0,
    "category" "text" DEFAULT ''::"text",
    "services" "jsonb",
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);

ALTER TABLE ONLY "public"."packages" REPLICA IDENTITY FULL;


ALTER TABLE "public"."packages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."platform_account_controls" (
    "user_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "reason" "text",
    "changed_by" "uuid",
    "changed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "sessions_blocked_at" timestamp with time zone,
    CONSTRAINT "platform_account_controls_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'suspended'::"text"])))
);


ALTER TABLE "public"."platform_account_controls" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."platform_account_deletion_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "requesting_user_uid" "uuid",
    "outlet_id" "text",
    "email" "text" NOT NULL,
    "requester_name" "text",
    "business_name" "text",
    "reason" "text",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "source" "text" NOT NULL,
    "processing_notes" "text",
    "processed_by" "uuid",
    "processed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "platform_account_deletion_requests_email_check" CHECK (("char_length"(TRIM(BOTH FROM "email")) >= 5)),
    CONSTRAINT "platform_account_deletion_requests_processing_notes_check" CHECK ((("processing_notes" IS NULL) OR ("char_length"("processing_notes") <= 5000))),
    CONSTRAINT "platform_account_deletion_requests_reason_check" CHECK ((("reason" IS NULL) OR ("char_length"("reason") <= 2000))),
    CONSTRAINT "platform_account_deletion_requests_source_check" CHECK (("source" = ANY (ARRAY['merchant_portal'::"text", 'android'::"text", 'web'::"text"]))),
    CONSTRAINT "platform_account_deletion_requests_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'in_review'::"text", 'completed'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."platform_account_deletion_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."platform_admin_operations" (
    "id" "uuid" NOT NULL,
    "action" "text" NOT NULL,
    "target_id" "text" NOT NULL,
    "outlet_id" "text",
    "actor_uid" "uuid" NOT NULL,
    "state" "text" NOT NULL,
    "result" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "started_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "completed_at" timestamp with time zone,
    "attempt_count" integer DEFAULT 1 NOT NULL,
    CONSTRAINT "platform_admin_operations_attempt_count_check" CHECK (("attempt_count" >= 1)),
    CONSTRAINT "platform_admin_operations_state_check" CHECK (("state" = ANY (ARRAY['started'::"text", 'succeeded'::"text", 'failed'::"text", 'partial'::"text"])))
);


ALTER TABLE "public"."platform_admin_operations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."platform_admins" (
    "user_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."platform_admins" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."platform_audit_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "outlet_id" "text",
    "action" "text" NOT NULL,
    "affected_target" "text" NOT NULL,
    "actor_uid" "text",
    "actor_email" "text",
    "reason" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "source" "text" DEFAULT 'merchant-portal'::"text" NOT NULL,
    "occurred_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "outcome" "text" DEFAULT 'succeeded'::"text" NOT NULL,
    "operation_id" "uuid",
    CONSTRAINT "platform_audit_events_outcome_check" CHECK (("outcome" = ANY (ARRAY['succeeded'::"text", 'failed'::"text", 'partial'::"text"])))
);


ALTER TABLE "public"."platform_audit_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."platform_monitoring_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "service" "text" NOT NULL,
    "severity" "text" NOT NULL,
    "event_type" "text" NOT NULL,
    "message" "text" NOT NULL,
    "outlet_id" "text",
    "correlation_id" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "occurred_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "platform_monitoring_events_severity_check" CHECK (("severity" = ANY (ARRAY['info'::"text", 'warning'::"text", 'error'::"text", 'critical'::"text"])))
);


ALTER TABLE "public"."platform_monitoring_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."platform_support_case_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "case_id" "uuid" NOT NULL,
    "event_type" "text" NOT NULL,
    "actor_uid" "uuid" NOT NULL,
    "actor_email" "text",
    "note" "text",
    "before_value" "jsonb",
    "after_value" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "platform_support_case_events_event_type_check" CHECK (("event_type" = ANY (ARRAY['created'::"text", 'assignment_changed'::"text", 'status_changed'::"text", 'internal_note'::"text", 'resolved'::"text", 'reopened'::"text", 'reference_added'::"text"])))
);


ALTER TABLE "public"."platform_support_case_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."platform_support_case_references" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "case_id" "uuid" NOT NULL,
    "outlet_id" "text",
    "entity_type" "text" NOT NULL,
    "reference_id" "text" NOT NULL,
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "platform_support_case_references_entity_type_check" CHECK (("entity_type" = ANY (ARRAY['booking'::"text", 'sale'::"text", 'integration'::"text", 'operation'::"text"])))
);


ALTER TABLE "public"."platform_support_case_references" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."platform_support_cases" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "outlet_id" "text",
    "category" "text" NOT NULL,
    "priority" "text" NOT NULL,
    "subject" "text" NOT NULL,
    "description" "text" NOT NULL,
    "status" "text" DEFAULT 'open'::"text" NOT NULL,
    "assigned_to" "uuid",
    "resolution_summary" "text",
    "created_by" "uuid" NOT NULL,
    "resolved_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "platform_support_cases_category_check" CHECK (("category" = ANY (ARRAY['account'::"text", 'access'::"text", 'booking'::"text", 'sales'::"text", 'integration'::"text", 'operations'::"text", 'other'::"text"]))),
    CONSTRAINT "platform_support_cases_description_check" CHECK ((("char_length"("description") >= 3) AND ("char_length"("description") <= 5000))),
    CONSTRAINT "platform_support_cases_priority_check" CHECK (("priority" = ANY (ARRAY['low'::"text", 'normal'::"text", 'high'::"text", 'urgent'::"text"]))),
    CONSTRAINT "platform_support_cases_status_check" CHECK (("status" = ANY (ARRAY['open'::"text", 'in_progress'::"text", 'waiting_on_merchant'::"text", 'resolved'::"text"]))),
    CONSTRAINT "platform_support_cases_subject_check" CHECK ((("char_length"("subject") >= 3) AND ("char_length"("subject") <= 160)))
);


ALTER TABLE "public"."platform_support_cases" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."point_transactions" (
    "id" "text" NOT NULL,
    "client_id" "text" NOT NULL,
    "outlet_id" "text" NOT NULL,
    "type" "text" NOT NULL,
    "amount" numeric(12,2) DEFAULT 0,
    "previous_balance" numeric(12,2) DEFAULT 0,
    "new_balance" numeric(12,2) DEFAULT 0,
    "timestamp" timestamp with time zone DEFAULT "now"(),
    "is_manual" boolean DEFAULT false,
    "description" "text"
);


ALTER TABLE "public"."point_transactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."points_credits" (
    "client_id" "text" NOT NULL,
    "sale_id" "text" NOT NULL,
    "points" integer NOT NULL,
    "credited_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."points_credits" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."products" (
    "id" "text" NOT NULL,
    "outlet_id" "text" NOT NULL,
    "name" "text" DEFAULT ''::"text" NOT NULL,
    "price" numeric(12,2) DEFAULT 0,
    "stock" integer DEFAULT 0,
    "category" "text" DEFAULT ''::"text",
    "fixed_commission_amount" numeric(12,2)
);

ALTER TABLE ONLY "public"."products" REPLICA IDENTITY FULL;


ALTER TABLE "public"."products" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "email" "text",
    "full_name" "text",
    "phone" "text",
    "avatar_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."rewards" (
    "id" "text" NOT NULL,
    "outlet_id" "text" NOT NULL,
    "name" "text" DEFAULT ''::"text" NOT NULL,
    "cost" integer DEFAULT 0,
    "icon" "text" DEFAULT ''::"text"
);

ALTER TABLE ONLY "public"."rewards" REPLICA IDENTITY FULL;


ALTER TABLE "public"."rewards" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."services" (
    "id" "text" NOT NULL,
    "outlet_id" "text" NOT NULL,
    "name" "text" DEFAULT ''::"text" NOT NULL,
    "price" numeric(12,2) DEFAULT 0,
    "duration" integer DEFAULT 60,
    "category" "text" DEFAULT ''::"text",
    "category_id" "text",
    "points" integer DEFAULT 0,
    "is_commissionable" boolean DEFAULT false,
    "description" "text",
    "image_url" "text",
    "icon_id" "text",
    "display_order" integer DEFAULT 0,
    "redeem_points_enabled" boolean DEFAULT false,
    "redeem_points" integer DEFAULT 0,
    "is_visible" boolean DEFAULT true,
    "is_promotion" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"()
);

ALTER TABLE ONLY "public"."services" REPLICA IDENTITY FULL;


ALTER TABLE "public"."services" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."staff" (
    "id" "text" NOT NULL,
    "outlet_id" "text" NOT NULL,
    "name" "text" DEFAULT ''::"text" NOT NULL,
    "role" "text",
    "email" "text" DEFAULT ''::"text",
    "phone" "text" DEFAULT ''::"text",
    "profile_picture" "text",
    "photo_url" "text",
    "qualified_services" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "weekly_hours" "jsonb",
    "permissions" "jsonb"
);

ALTER TABLE ONLY "public"."staff" REPLICA IDENTITY FULL;


ALTER TABLE "public"."staff" OWNER TO "postgres";


COMMENT ON COLUMN "public"."staff"."weekly_hours" IS 'Per-day hours: { monday: { open, close, isOpen }, ... }. Null = not configured.';



COMMENT ON COLUMN "public"."staff"."permissions" IS 'Capability flags for this staff profile (portal/pos/feature access intent).';



CREATE TABLE IF NOT EXISTS "public"."transactions" (
    "id" "text" NOT NULL,
    "outlet_id" "text" NOT NULL,
    "date" timestamp with time zone DEFAULT "now"() NOT NULL,
    "type" "text" NOT NULL,
    "client_id" "text",
    "items" "jsonb",
    "amount" numeric(12,2) DEFAULT 0,
    "category" "text" DEFAULT ''::"text",
    "description" "text" DEFAULT ''::"text",
    "payment_method" "text",
    "parent_sale_id" "text",
    "status" "text",
    "voided" boolean DEFAULT false,
    "remarks" "text",
    "payment_status" "text",
    "outstanding" numeric(12,2) DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"()
);

ALTER TABLE ONLY "public"."transactions" REPLICA IDENTITY FULL;


ALTER TABLE "public"."transactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "uid" "text" NOT NULL,
    "email" "text",
    "outlet_id" "text",
    "role" "text" DEFAULT 'cashier'::"text",
    "display_name" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."users" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."vouchers" (
    "id" "text" NOT NULL,
    "outlet_id" "text" NOT NULL,
    "name" "text" DEFAULT ''::"text" NOT NULL,
    "price" numeric(12,2) DEFAULT 0,
    "service_ids" "jsonb" DEFAULT '[]'::"jsonb",
    "expiry_date" "text",
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "slug" "text",
    "redemption_id" "text",
    "secret_code" "text",
    "purchased_at" timestamp with time zone,
    "redeemed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"()
);

ALTER TABLE ONLY "public"."vouchers" REPLICA IDENTITY FULL;


ALTER TABLE "public"."vouchers" OWNER TO "postgres";


ALTER TABLE ONLY "public"."api_integrations"
    ADD CONSTRAINT "api_integrations_pkey" PRIMARY KEY ("outlet_id");



ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."billing_customers"
    ADD CONSTRAINT "billing_customers_pkey" PRIMARY KEY ("outlet_id");



ALTER TABLE ONLY "public"."billing_customers"
    ADD CONSTRAINT "billing_customers_stripe_customer_id_key" UNIQUE ("stripe_customer_id");



ALTER TABLE ONLY "public"."billing_events"
    ADD CONSTRAINT "billing_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."credit_history"
    ADD CONSTRAINT "credit_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customer_profiles"
    ADD CONSTRAINT "customer_profiles_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."frontend_customers"
    ADD CONSTRAINT "frontend_customers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."google_api_rate_limits"
    ADD CONSTRAINT "google_api_rate_limits_pkey" PRIMARY KEY ("bucket");



ALTER TABLE ONLY "public"."google_business_connections"
    ADD CONSTRAINT "google_business_connections_pkey" PRIMARY KEY ("outlet_id");



ALTER TABLE ONLY "public"."google_oauth_states"
    ADD CONSTRAINT "google_oauth_states_pkey" PRIMARY KEY ("state");



ALTER TABLE ONLY "public"."google_review_cursors"
    ADD CONSTRAINT "google_review_cursors_pkey" PRIMARY KEY ("cursor_id");



ALTER TABLE ONLY "public"."google_review_page_cache"
    ADD CONSTRAINT "google_review_page_cache_pkey" PRIMARY KEY ("outlet_id", "order_by", "page_key");



ALTER TABLE ONLY "public"."marketing_audiences"
    ADD CONSTRAINT "marketing_audiences_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."marketing_campaign_deliveries"
    ADD CONSTRAINT "marketing_campaign_deliveries_campaign_id_client_id_channel_key" UNIQUE ("campaign_id", "client_id", "channel");



ALTER TABLE ONLY "public"."marketing_campaign_deliveries"
    ADD CONSTRAINT "marketing_campaign_deliveries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."marketing_campaigns"
    ADD CONSTRAINT "marketing_campaigns_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."merchant_onboarding_drafts"
    ADD CONSTRAINT "merchant_onboarding_drafts_pkey" PRIMARY KEY ("auth_user_id");



ALTER TABLE ONLY "public"."merchant_provision_requests"
    ADD CONSTRAINT "merchant_provision_requests_pkey" PRIMARY KEY ("request_id");



ALTER TABLE ONLY "public"."onboarding_states"
    ADD CONSTRAINT "onboarding_states_pkey" PRIMARY KEY ("outlet_id");



ALTER TABLE ONLY "public"."outlet_invitations"
    ADD CONSTRAINT "outlet_invitations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."outlet_invitations"
    ADD CONSTRAINT "outlet_invitations_token_hash_key" UNIQUE ("token_hash");



ALTER TABLE ONLY "public"."outlet_members"
    ADD CONSTRAINT "outlet_members_outlet_id_user_id_key" UNIQUE ("outlet_id", "user_id");



ALTER TABLE ONLY "public"."outlet_members"
    ADD CONSTRAINT "outlet_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."outlet_subscriptions"
    ADD CONSTRAINT "outlet_subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."outlets"
    ADD CONSTRAINT "outlets_pkey" PRIMARY KEY ("outlet_id");



ALTER TABLE ONLY "public"."outstanding_transactions"
    ADD CONSTRAINT "outstanding_transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."packages"
    ADD CONSTRAINT "packages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."platform_account_controls"
    ADD CONSTRAINT "platform_account_controls_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."platform_account_deletion_requests"
    ADD CONSTRAINT "platform_account_deletion_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."platform_admin_operations"
    ADD CONSTRAINT "platform_admin_operations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."platform_admins"
    ADD CONSTRAINT "platform_admins_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."platform_audit_events"
    ADD CONSTRAINT "platform_audit_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."platform_monitoring_events"
    ADD CONSTRAINT "platform_monitoring_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."platform_support_case_events"
    ADD CONSTRAINT "platform_support_case_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."platform_support_case_references"
    ADD CONSTRAINT "platform_support_case_referen_case_id_entity_type_reference_key" UNIQUE ("case_id", "entity_type", "reference_id");



ALTER TABLE ONLY "public"."platform_support_case_references"
    ADD CONSTRAINT "platform_support_case_references_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."platform_support_cases"
    ADD CONSTRAINT "platform_support_cases_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."point_transactions"
    ADD CONSTRAINT "point_transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."points_credits"
    ADD CONSTRAINT "points_credits_pkey" PRIMARY KEY ("client_id", "sale_id");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rewards"
    ADD CONSTRAINT "rewards_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."services"
    ADD CONSTRAINT "services_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."staff"
    ADD CONSTRAINT "staff_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("uid");



ALTER TABLE ONLY "public"."vouchers"
    ADD CONSTRAINT "vouchers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."vouchers"
    ADD CONSTRAINT "vouchers_slug_key" UNIQUE ("slug");



CREATE UNIQUE INDEX "idx_account_deletion_requests_active_email" ON "public"."platform_account_deletion_requests" USING "btree" ("lower"("email")) WHERE ("status" = ANY (ARRAY['pending'::"text", 'in_review'::"text"]));



CREATE UNIQUE INDEX "idx_account_deletion_requests_active_user" ON "public"."platform_account_deletion_requests" USING "btree" ("requesting_user_uid") WHERE (("requesting_user_uid" IS NOT NULL) AND ("status" = ANY (ARRAY['pending'::"text", 'in_review'::"text"])));



CREATE INDEX "idx_account_deletion_requests_email" ON "public"."platform_account_deletion_requests" USING "btree" ("lower"("email"), "created_at" DESC);



CREATE INDEX "idx_account_deletion_requests_status" ON "public"."platform_account_deletion_requests" USING "btree" ("status", "created_at" DESC);



CREATE INDEX "idx_account_deletion_requests_user" ON "public"."platform_account_deletion_requests" USING "btree" ("requesting_user_uid", "created_at" DESC) WHERE ("requesting_user_uid" IS NOT NULL);



CREATE INDEX "idx_appointments_outlet_cancelled_at" ON "public"."appointments" USING "btree" ("outlet_id", "cancelled_at" DESC) WHERE ("cancelled_at" IS NOT NULL);



CREATE INDEX "idx_appointments_outlet_completed_at" ON "public"."appointments" USING "btree" ("outlet_id", "completed_at" DESC) WHERE ("completed_at" IS NOT NULL);



CREATE INDEX "idx_appointments_outlet_created_at" ON "public"."appointments" USING "btree" ("outlet_id", "created_at" DESC);



CREATE INDEX "idx_appointments_outlet_date" ON "public"."appointments" USING "btree" ("outlet_id", "date");



CREATE INDEX "idx_appointments_outlet_date_staff" ON "public"."appointments" USING "btree" ("outlet_id", "date", "staff_id");



CREATE INDEX "idx_appointments_outlet_date_staff_status" ON "public"."appointments" USING "btree" ("outlet_id", "date", "staff_id", "status");



CREATE INDEX "idx_appointments_outlet_sale_id" ON "public"."appointments" USING "btree" ("outlet_id", "sale_id") WHERE ("sale_id" IS NOT NULL);



CREATE INDEX "idx_appointments_outlet_source_sale_id" ON "public"."appointments" USING "btree" ("outlet_id", "source_sale_id") WHERE ("source_sale_id" IS NOT NULL);



CREATE INDEX "idx_appointments_reference_prefix" ON "public"."appointments" USING "btree" ("lower"("id") "text_pattern_ops");



CREATE INDEX "idx_clients_outlet" ON "public"."clients" USING "btree" ("outlet_id");



CREATE INDEX "idx_clients_outlet_import" ON "public"."clients" USING "btree" ("outlet_id", "last_import_id");



CREATE INDEX "idx_clients_outlet_phone" ON "public"."clients" USING "btree" ("outlet_id", "phone");



CREATE INDEX "idx_credit_history_client" ON "public"."credit_history" USING "btree" ("client_id", "timestamp" DESC);



CREATE INDEX "idx_frontend_customers_outlet_phone" ON "public"."frontend_customers" USING "btree" ("outlet_id", "phone");



CREATE INDEX "idx_google_oauth_states_expires" ON "public"."google_oauth_states" USING "btree" ("expires_at");



CREATE INDEX "idx_google_review_cursors_expires" ON "public"."google_review_cursors" USING "btree" ("expires_at");



CREATE INDEX "idx_google_review_cursors_outlet" ON "public"."google_review_cursors" USING "btree" ("outlet_id");



CREATE INDEX "idx_google_review_page_cache_expires" ON "public"."google_review_page_cache" USING "btree" ("expires_at");



CREATE INDEX "idx_marketing_audiences_outlet_updated" ON "public"."marketing_audiences" USING "btree" ("outlet_id", "updated_at" DESC);



CREATE INDEX "idx_marketing_campaigns_outlet_status_updated" ON "public"."marketing_campaigns" USING "btree" ("outlet_id", "status", "updated_at" DESC);



CREATE INDEX "idx_marketing_deliveries_campaign" ON "public"."marketing_campaign_deliveries" USING "btree" ("campaign_id", "status");



CREATE INDEX "idx_marketing_deliveries_outlet_status_time" ON "public"."marketing_campaign_deliveries" USING "btree" ("outlet_id", "status", "updated_at" DESC);



CREATE INDEX "idx_marketing_deliveries_worker" ON "public"."marketing_campaign_deliveries" USING "btree" ("status", "queued_at") WHERE ("status" = ANY (ARRAY['queued'::"text", 'failed'::"text"]));



CREATE INDEX "idx_monitoring_correlation_prefix" ON "public"."platform_monitoring_events" USING "btree" ("lower"("correlation_id") "text_pattern_ops") WHERE ("correlation_id" IS NOT NULL);



CREATE INDEX "idx_outlet_subscriptions_hitpay_recurring" ON "public"."outlet_subscriptions" USING "btree" ("hitpay_recurring_id");



CREATE INDEX "idx_outlet_subscriptions_outlet" ON "public"."outlet_subscriptions" USING "btree" ("outlet_id");



CREATE INDEX "idx_outlet_subscriptions_status" ON "public"."outlet_subscriptions" USING "btree" ("status");



CREATE INDEX "idx_outlets_booking_slug" ON "public"."outlets" USING "btree" ("booking_slug");



CREATE INDEX "idx_outlets_is_active" ON "public"."outlets" USING "btree" ("is_active");



CREATE INDEX "idx_outlets_name_trgm" ON "public"."outlets" USING "gin" ("lower"("name") "public"."gin_trgm_ops");



CREATE INDEX "idx_outstanding_transactions_client" ON "public"."outstanding_transactions" USING "btree" ("client_id", "timestamp" DESC);



CREATE INDEX "idx_packages_outlet" ON "public"."packages" USING "btree" ("outlet_id");



CREATE INDEX "idx_platform_audit_filters" ON "public"."platform_audit_events" USING "btree" ("action", "actor_uid", "outlet_id", "occurred_at" DESC);



CREATE INDEX "idx_platform_audit_occurred" ON "public"."platform_audit_events" USING "btree" ("occurred_at" DESC);



CREATE INDEX "idx_platform_audit_outlet" ON "public"."platform_audit_events" USING "btree" ("outlet_id", "occurred_at" DESC);



CREATE INDEX "idx_platform_monitoring_occurred" ON "public"."platform_monitoring_events" USING "btree" ("occurred_at" DESC);



CREATE INDEX "idx_platform_monitoring_outlet_time" ON "public"."platform_monitoring_events" USING "btree" ("outlet_id", "occurred_at" DESC);



CREATE INDEX "idx_platform_monitoring_severity" ON "public"."platform_monitoring_events" USING "btree" ("severity", "occurred_at" DESC);



CREATE INDEX "idx_platform_operations_filters" ON "public"."platform_admin_operations" USING "btree" ("state", "outlet_id", "started_at" DESC);



CREATE INDEX "idx_point_transactions_client" ON "public"."point_transactions" USING "btree" ("client_id", "timestamp" DESC);



CREATE INDEX "idx_products_outlet" ON "public"."products" USING "btree" ("outlet_id");



CREATE INDEX "idx_rewards_outlet" ON "public"."rewards" USING "btree" ("outlet_id");



CREATE INDEX "idx_services_outlet" ON "public"."services" USING "btree" ("outlet_id");



CREATE INDEX "idx_services_outlet_category" ON "public"."services" USING "btree" ("outlet_id", "category");



CREATE INDEX "idx_services_outlet_visible" ON "public"."services" USING "btree" ("outlet_id", "is_visible");



CREATE INDEX "idx_staff_outlet" ON "public"."staff" USING "btree" ("outlet_id");



CREATE INDEX "idx_support_case_events_case" ON "public"."platform_support_case_events" USING "btree" ("case_id", "created_at" DESC);



CREATE INDEX "idx_support_cases_assignee" ON "public"."platform_support_cases" USING "btree" ("assigned_to", "status", "updated_at" DESC);



CREATE INDEX "idx_support_cases_filters" ON "public"."platform_support_cases" USING "btree" ("status", "priority", "updated_at" DESC);



CREATE INDEX "idx_support_cases_outlet" ON "public"."platform_support_cases" USING "btree" ("outlet_id", "updated_at" DESC);



CREATE INDEX "idx_support_refs_case" ON "public"."platform_support_case_references" USING "btree" ("case_id");



CREATE INDEX "idx_transactions_outlet_client" ON "public"."transactions" USING "btree" ("outlet_id", "client_id");



CREATE INDEX "idx_transactions_outlet_date" ON "public"."transactions" USING "btree" ("outlet_id", "date" DESC);



CREATE INDEX "idx_transactions_outlet_type" ON "public"."transactions" USING "btree" ("outlet_id", "type");



CREATE INDEX "idx_transactions_outlet_type_date" ON "public"."transactions" USING "btree" ("outlet_id", "type", "date" DESC);



CREATE INDEX "idx_transactions_parent_sale" ON "public"."transactions" USING "btree" ("parent_sale_id");



CREATE INDEX "idx_transactions_reference_prefix" ON "public"."transactions" USING "btree" ("lower"("id") "text_pattern_ops");



CREATE INDEX "idx_users_display_name_trgm" ON "public"."users" USING "gin" ("lower"("display_name") "public"."gin_trgm_ops");



CREATE INDEX "idx_users_email_trgm" ON "public"."users" USING "gin" ("lower"("email") "public"."gin_trgm_ops");



CREATE INDEX "idx_users_outlet" ON "public"."users" USING "btree" ("outlet_id");



CREATE INDEX "idx_vouchers_outlet" ON "public"."vouchers" USING "btree" ("outlet_id");



CREATE INDEX "idx_vouchers_redemption" ON "public"."vouchers" USING "btree" ("redemption_id");



CREATE INDEX "idx_vouchers_slug" ON "public"."vouchers" USING "btree" ("slug");



CREATE INDEX "outlet_invitations_email_idx" ON "public"."outlet_invitations" USING "btree" ("lower"("email"));



CREATE INDEX "outlet_invitations_outlet_idx" ON "public"."outlet_invitations" USING "btree" ("outlet_id");



CREATE UNIQUE INDEX "outlet_invitations_pending_unique" ON "public"."outlet_invitations" USING "btree" ("outlet_id", "lower"("email")) WHERE ("status" = 'pending'::"text");



CREATE UNIQUE INDEX "outlets_booking_slug_lower_unique" ON "public"."outlets" USING "btree" ("lower"("booking_slug")) WHERE (("booking_slug" IS NOT NULL) AND ("booking_slug" <> ''::"text"));



CREATE OR REPLACE TRIGGER "account_deletion_requests_touch_updated_at" BEFORE UPDATE ON "public"."platform_account_deletion_requests" FOR EACH ROW EXECUTE FUNCTION "public"."touch_account_deletion_request_updated_at"();



CREATE OR REPLACE TRIGGER "appointments_reject_staff_overlap" BEFORE INSERT ON "public"."appointments" FOR EACH ROW EXECUTE FUNCTION "public"."appointments_reject_staff_overlap"();



CREATE OR REPLACE TRIGGER "appointments_reject_staff_overlap_update" BEFORE UPDATE ON "public"."appointments" FOR EACH ROW EXECUTE FUNCTION "public"."appointments_reject_staff_overlap"();



CREATE OR REPLACE TRIGGER "appointments_track_lifecycle" BEFORE UPDATE ON "public"."appointments" FOR EACH ROW EXECUTE FUNCTION "public"."track_appointment_lifecycle"();



CREATE OR REPLACE TRIGGER "billing_events_immutable" BEFORE DELETE OR UPDATE ON "public"."billing_events" FOR EACH ROW EXECUTE FUNCTION "public"."reject_immutable_platform_event_change"();



CREATE OR REPLACE TRIGGER "platform_audit_immutable" BEFORE DELETE OR UPDATE ON "public"."platform_audit_events" FOR EACH ROW EXECUTE FUNCTION "public"."reject_immutable_platform_event_change"();



CREATE OR REPLACE TRIGGER "platform_monitoring_immutable" BEFORE DELETE OR UPDATE ON "public"."platform_monitoring_events" FOR EACH ROW EXECUTE FUNCTION "public"."reject_immutable_platform_event_change"();



CREATE OR REPLACE TRIGGER "support_events_immutable" BEFORE DELETE OR UPDATE ON "public"."platform_support_case_events" FOR EACH ROW EXECUTE FUNCTION "public"."reject_support_history_change"();



CREATE OR REPLACE TRIGGER "support_references_immutable" BEFORE DELETE OR UPDATE ON "public"."platform_support_case_references" FOR EACH ROW EXECUTE FUNCTION "public"."reject_support_history_change"();



ALTER TABLE ONLY "public"."api_integrations"
    ADD CONSTRAINT "api_integrations_outlet_id_fkey" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlets"("outlet_id");



ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_outlet_id_fkey" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlets"("outlet_id");



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_outlet_id_fkey" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlets"("outlet_id");



ALTER TABLE ONLY "public"."billing_customers"
    ADD CONSTRAINT "billing_customers_outlet_id_fkey" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlets"("outlet_id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."billing_events"
    ADD CONSTRAINT "billing_events_outlet_id_fkey" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlets"("outlet_id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_outlet_id_fkey" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlets"("outlet_id");



ALTER TABLE ONLY "public"."credit_history"
    ADD CONSTRAINT "credit_history_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."credit_history"
    ADD CONSTRAINT "credit_history_outlet_id_fkey" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlets"("outlet_id");



ALTER TABLE ONLY "public"."customer_profiles"
    ADD CONSTRAINT "customer_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."frontend_customers"
    ADD CONSTRAINT "frontend_customers_outlet_id_fkey" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlets"("outlet_id");



ALTER TABLE ONLY "public"."google_business_connections"
    ADD CONSTRAINT "google_business_connections_connected_by_fkey" FOREIGN KEY ("connected_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."google_business_connections"
    ADD CONSTRAINT "google_business_connections_outlet_id_fkey" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlets"("outlet_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."google_oauth_states"
    ADD CONSTRAINT "google_oauth_states_outlet_id_fkey" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlets"("outlet_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."google_oauth_states"
    ADD CONSTRAINT "google_oauth_states_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."google_review_cursors"
    ADD CONSTRAINT "google_review_cursors_outlet_id_fkey" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlets"("outlet_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."google_review_page_cache"
    ADD CONSTRAINT "google_review_page_cache_outlet_id_fkey" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlets"("outlet_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."marketing_audiences"
    ADD CONSTRAINT "marketing_audiences_outlet_id_fkey" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlets"("outlet_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."marketing_campaign_deliveries"
    ADD CONSTRAINT "marketing_campaign_deliveries_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "public"."marketing_campaigns"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."marketing_campaign_deliveries"
    ADD CONSTRAINT "marketing_campaign_deliveries_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."marketing_campaign_deliveries"
    ADD CONSTRAINT "marketing_campaign_deliveries_outlet_id_fkey" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlets"("outlet_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."marketing_campaigns"
    ADD CONSTRAINT "marketing_campaigns_audience_id_fkey" FOREIGN KEY ("audience_id") REFERENCES "public"."marketing_audiences"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."marketing_campaigns"
    ADD CONSTRAINT "marketing_campaigns_outlet_id_fkey" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlets"("outlet_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."merchant_onboarding_drafts"
    ADD CONSTRAINT "merchant_onboarding_drafts_auth_user_id_fkey" FOREIGN KEY ("auth_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."merchant_provision_requests"
    ADD CONSTRAINT "merchant_provision_requests_outlet_id_fkey" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlets"("outlet_id");



ALTER TABLE ONLY "public"."merchant_provision_requests"
    ADD CONSTRAINT "merchant_provision_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."onboarding_states"
    ADD CONSTRAINT "onboarding_states_outlet_id_fkey" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlets"("outlet_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."outlet_invitations"
    ADD CONSTRAINT "outlet_invitations_accepted_by_fkey" FOREIGN KEY ("accepted_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."outlet_invitations"
    ADD CONSTRAINT "outlet_invitations_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("uid");



ALTER TABLE ONLY "public"."outlet_invitations"
    ADD CONSTRAINT "outlet_invitations_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."outlet_invitations"
    ADD CONSTRAINT "outlet_invitations_outlet_id_fkey" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlets"("outlet_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."outlet_members"
    ADD CONSTRAINT "outlet_members_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."outlet_members"
    ADD CONSTRAINT "outlet_members_outlet_id_fkey" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlets"("outlet_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."outlet_members"
    ADD CONSTRAINT "outlet_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."outlet_subscriptions"
    ADD CONSTRAINT "outlet_subscriptions_outlet_id_fkey" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlets"("outlet_id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."outlets"
    ADD CONSTRAINT "outlets_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."outstanding_transactions"
    ADD CONSTRAINT "outstanding_transactions_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."outstanding_transactions"
    ADD CONSTRAINT "outstanding_transactions_outlet_id_fkey" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlets"("outlet_id");



ALTER TABLE ONLY "public"."packages"
    ADD CONSTRAINT "packages_outlet_id_fkey" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlets"("outlet_id");



ALTER TABLE ONLY "public"."platform_account_controls"
    ADD CONSTRAINT "platform_account_controls_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."platform_account_controls"
    ADD CONSTRAINT "platform_account_controls_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."platform_account_deletion_requests"
    ADD CONSTRAINT "platform_account_deletion_requests_outlet_id_fkey" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlets"("outlet_id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."platform_account_deletion_requests"
    ADD CONSTRAINT "platform_account_deletion_requests_processed_by_fkey" FOREIGN KEY ("processed_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."platform_account_deletion_requests"
    ADD CONSTRAINT "platform_account_deletion_requests_requesting_user_uid_fkey" FOREIGN KEY ("requesting_user_uid") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."platform_admin_operations"
    ADD CONSTRAINT "platform_admin_operations_actor_uid_fkey" FOREIGN KEY ("actor_uid") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."platform_admins"
    ADD CONSTRAINT "platform_admins_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."platform_support_case_events"
    ADD CONSTRAINT "platform_support_case_events_actor_uid_fkey" FOREIGN KEY ("actor_uid") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."platform_support_case_events"
    ADD CONSTRAINT "platform_support_case_events_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "public"."platform_support_cases"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."platform_support_case_references"
    ADD CONSTRAINT "platform_support_case_references_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "public"."platform_support_cases"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."platform_support_case_references"
    ADD CONSTRAINT "platform_support_case_references_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."platform_support_case_references"
    ADD CONSTRAINT "platform_support_case_references_outlet_id_fkey" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlets"("outlet_id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."platform_support_cases"
    ADD CONSTRAINT "platform_support_cases_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "public"."platform_admins"("user_id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."platform_support_cases"
    ADD CONSTRAINT "platform_support_cases_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."platform_support_cases"
    ADD CONSTRAINT "platform_support_cases_outlet_id_fkey" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlets"("outlet_id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."point_transactions"
    ADD CONSTRAINT "point_transactions_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."point_transactions"
    ADD CONSTRAINT "point_transactions_outlet_id_fkey" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlets"("outlet_id");



ALTER TABLE ONLY "public"."points_credits"
    ADD CONSTRAINT "points_credits_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_outlet_id_fkey" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlets"("outlet_id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rewards"
    ADD CONSTRAINT "rewards_outlet_id_fkey" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlets"("outlet_id");



ALTER TABLE ONLY "public"."services"
    ADD CONSTRAINT "services_outlet_id_fkey" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlets"("outlet_id");



ALTER TABLE ONLY "public"."staff"
    ADD CONSTRAINT "staff_outlet_id_fkey" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlets"("outlet_id");



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_outlet_id_fkey" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlets"("outlet_id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_outlet_id_fkey" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlets"("outlet_id");



ALTER TABLE ONLY "public"."vouchers"
    ADD CONSTRAINT "vouchers_outlet_id_fkey" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlets"("outlet_id");



ALTER TABLE "public"."api_integrations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "api_integrations_merchant_select" ON "public"."api_integrations" FOR SELECT TO "authenticated" USING ((("public"."is_portal_platform_admin"() OR ("outlet_id" = "public"."current_portal_outlet_id"())) AND "public"."is_current_account_enabled"()));



CREATE POLICY "api_integrations_merchant_update" ON "public"."api_integrations" FOR UPDATE TO "authenticated" USING ((("public"."is_portal_platform_admin"() OR ("outlet_id" = "public"."current_portal_outlet_id"())) AND "public"."is_current_account_enabled"())) WITH CHECK ((("public"."is_portal_platform_admin"() OR ("outlet_id" = "public"."current_portal_outlet_id"())) AND "public"."is_current_account_enabled"()));



CREATE POLICY "api_integrations_merchant_upsert" ON "public"."api_integrations" FOR INSERT TO "authenticated" WITH CHECK ((("public"."is_portal_platform_admin"() OR ("outlet_id" = "public"."current_portal_outlet_id"())) AND "public"."is_current_account_enabled"()));



CREATE POLICY "api_integrations_service_role" ON "public"."api_integrations" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "public"."appointments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "appointments_merchant_delete" ON "public"."appointments" FOR DELETE TO "authenticated" USING ((("public"."is_portal_platform_admin"() OR ("outlet_id" = "public"."current_portal_outlet_id"())) AND "public"."is_current_account_enabled"()));



CREATE POLICY "appointments_merchant_insert" ON "public"."appointments" FOR INSERT TO "authenticated" WITH CHECK ((("public"."is_portal_platform_admin"() OR ("outlet_id" = "public"."current_portal_outlet_id"())) AND "public"."is_current_account_enabled"()));



CREATE POLICY "appointments_merchant_select" ON "public"."appointments" FOR SELECT TO "authenticated" USING ((("public"."is_portal_platform_admin"() OR ("outlet_id" = "public"."current_portal_outlet_id"())) AND "public"."is_current_account_enabled"()));



CREATE POLICY "appointments_merchant_update" ON "public"."appointments" FOR UPDATE TO "authenticated" USING ((("public"."is_portal_platform_admin"() OR ("outlet_id" = "public"."current_portal_outlet_id"())) AND "public"."is_current_account_enabled"())) WITH CHECK ((("public"."is_portal_platform_admin"() OR ("outlet_id" = "public"."current_portal_outlet_id"())) AND "public"."is_current_account_enabled"()));



CREATE POLICY "appointments_service_role" ON "public"."appointments" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "public"."audit_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "audit_logs_read" ON "public"."audit_logs" FOR SELECT TO "authenticated" USING ((("public"."can_manage_outlet_accounts"("outlet_id") OR "public"."is_platform_admin"()) AND "public"."is_current_account_enabled"()));



ALTER TABLE "public"."billing_customers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."billing_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."clients" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "clients_merchant_delete" ON "public"."clients" FOR DELETE TO "authenticated" USING ((("public"."is_platform_admin"() OR "public"."is_outlet_member"("outlet_id")) AND "public"."is_current_account_enabled"()));



CREATE POLICY "clients_merchant_insert" ON "public"."clients" FOR INSERT TO "authenticated" WITH CHECK ((("public"."is_platform_admin"() OR "public"."is_outlet_member"("outlet_id")) AND "public"."is_current_account_enabled"()));



CREATE POLICY "clients_merchant_select" ON "public"."clients" FOR SELECT TO "authenticated" USING ((("public"."is_platform_admin"() OR "public"."is_outlet_member"("outlet_id")) AND "public"."is_current_account_enabled"()));



CREATE POLICY "clients_merchant_update" ON "public"."clients" FOR UPDATE TO "authenticated" USING ((("public"."is_platform_admin"() OR "public"."is_outlet_member"("outlet_id")) AND "public"."is_current_account_enabled"())) WITH CHECK ((("public"."is_platform_admin"() OR "public"."is_outlet_member"("outlet_id")) AND "public"."is_current_account_enabled"()));



CREATE POLICY "clients_service_role" ON "public"."clients" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "public"."credit_history" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "credit_history_merchant_all" ON "public"."credit_history" TO "authenticated" USING ((("public"."is_portal_platform_admin"() OR ("outlet_id" = "public"."current_portal_outlet_id"()) OR (EXISTS ( SELECT 1
   FROM "public"."clients" "c"
  WHERE (("c"."id" = "credit_history"."client_id") AND ("c"."outlet_id" = "public"."current_portal_outlet_id"()))))) AND "public"."is_current_account_enabled"())) WITH CHECK ((("public"."is_portal_platform_admin"() OR ("outlet_id" = "public"."current_portal_outlet_id"()) OR (EXISTS ( SELECT 1
   FROM "public"."clients" "c"
  WHERE (("c"."id" = "credit_history"."client_id") AND ("c"."outlet_id" = "public"."current_portal_outlet_id"()))))) AND "public"."is_current_account_enabled"()));



CREATE POLICY "credit_history_service_role" ON "public"."credit_history" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "public"."customer_profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "customer_profiles_own" ON "public"."customer_profiles" TO "authenticated" USING ((("user_id" = "auth"."uid"()) AND "public"."is_current_account_enabled"())) WITH CHECK ((("user_id" = "auth"."uid"()) AND "public"."is_current_account_enabled"()));



ALTER TABLE "public"."frontend_customers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "frontend_customers_select_own" ON "public"."frontend_customers" FOR SELECT TO "authenticated" USING ((("id" = ("auth"."uid"())::"text") AND "public"."is_current_account_enabled"()));



CREATE POLICY "frontend_customers_service_role" ON "public"."frontend_customers" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "public"."google_api_rate_limits" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."google_business_connections" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."google_oauth_states" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."google_review_cursors" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."google_review_page_cache" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."marketing_audiences" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "marketing_audiences_admin_write" ON "public"."marketing_audiences" TO "authenticated" USING ((("public"."is_portal_platform_admin"() OR (("outlet_id" = "public"."current_portal_outlet_id"()) AND "public"."is_portal_admin"())) AND "public"."is_current_account_enabled"())) WITH CHECK ((("public"."is_portal_platform_admin"() OR (("outlet_id" = "public"."current_portal_outlet_id"()) AND "public"."is_portal_admin"())) AND "public"."is_current_account_enabled"()));



CREATE POLICY "marketing_audiences_merchant_select" ON "public"."marketing_audiences" FOR SELECT TO "authenticated" USING ((("public"."is_portal_platform_admin"() OR ("outlet_id" = "public"."current_portal_outlet_id"())) AND "public"."is_current_account_enabled"()));



ALTER TABLE "public"."marketing_campaign_deliveries" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."marketing_campaigns" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "marketing_campaigns_admin_write" ON "public"."marketing_campaigns" TO "authenticated" USING ((("public"."is_portal_platform_admin"() OR (("outlet_id" = "public"."current_portal_outlet_id"()) AND "public"."is_portal_admin"())) AND "public"."is_current_account_enabled"())) WITH CHECK ((("public"."is_portal_platform_admin"() OR (("outlet_id" = "public"."current_portal_outlet_id"()) AND "public"."is_portal_admin"())) AND "public"."is_current_account_enabled"()));



CREATE POLICY "marketing_campaigns_merchant_select" ON "public"."marketing_campaigns" FOR SELECT TO "authenticated" USING ((("public"."is_portal_platform_admin"() OR ("outlet_id" = "public"."current_portal_outlet_id"())) AND "public"."is_current_account_enabled"()));



CREATE POLICY "marketing_deliveries_merchant_select" ON "public"."marketing_campaign_deliveries" FOR SELECT TO "authenticated" USING ((("public"."is_portal_platform_admin"() OR ("outlet_id" = "public"."current_portal_outlet_id"())) AND "public"."is_current_account_enabled"()));



CREATE POLICY "marketing_deliveries_service_manage" ON "public"."marketing_campaign_deliveries" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "public"."merchant_onboarding_drafts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "merchant_onboarding_drafts_own" ON "public"."merchant_onboarding_drafts" TO "authenticated" USING ((("auth_user_id" = "auth"."uid"()) AND "public"."is_current_account_enabled"())) WITH CHECK ((("auth_user_id" = "auth"."uid"()) AND "public"."is_current_account_enabled"()));



ALTER TABLE "public"."merchant_provision_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."onboarding_states" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "onboarding_states_access" ON "public"."onboarding_states" FOR SELECT TO "authenticated" USING (("public"."is_outlet_member"("outlet_id") AND "public"."is_current_account_enabled"()));



CREATE POLICY "onboarding_states_manage" ON "public"."onboarding_states" FOR UPDATE TO "authenticated" USING (("public"."has_outlet_role"("outlet_id", ARRAY['owner'::"text", 'admin'::"text"]) AND "public"."is_current_account_enabled"())) WITH CHECK (("public"."has_outlet_role"("outlet_id", ARRAY['owner'::"text", 'admin'::"text"]) AND "public"."is_current_account_enabled"()));



ALTER TABLE "public"."outlet_invitations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "outlet_invitations_admin_read" ON "public"."outlet_invitations" FOR SELECT TO "authenticated" USING ((("public"."can_manage_outlet_accounts"("outlet_id") OR "public"."is_platform_admin"()) AND "public"."is_current_account_enabled"()));



ALTER TABLE "public"."outlet_members" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "outlet_members_read" ON "public"."outlet_members" FOR SELECT TO "authenticated" USING ((("public"."is_outlet_member"("outlet_id") OR "public"."is_platform_admin"()) AND "public"."is_current_account_enabled"()));



ALTER TABLE "public"."outlet_subscriptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."outlets" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "outlets_all_service_role" ON "public"."outlets" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "outlets_member_select" ON "public"."outlets" FOR SELECT TO "authenticated" USING ((("public"."is_outlet_member"("outlet_id") OR "public"."is_platform_admin"()) AND "public"."is_current_account_enabled"()));



CREATE POLICY "outlets_merchant_update" ON "public"."outlets" FOR UPDATE TO "authenticated" USING ((("public"."is_portal_platform_admin"() OR ("outlet_id" = "public"."current_portal_outlet_id"())) AND "public"."is_current_account_enabled"())) WITH CHECK ((("public"."is_portal_platform_admin"() OR ("outlet_id" = "public"."current_portal_outlet_id"())) AND "public"."is_current_account_enabled"()));



CREATE POLICY "outlets_public_select_active" ON "public"."outlets" FOR SELECT TO "authenticated", "anon" USING ((COALESCE("is_active", true) = true));



ALTER TABLE "public"."outstanding_transactions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "outstanding_transactions_merchant_all" ON "public"."outstanding_transactions" TO "authenticated" USING ((("public"."is_portal_platform_admin"() OR ("outlet_id" = "public"."current_portal_outlet_id"())) AND "public"."is_current_account_enabled"())) WITH CHECK ((("public"."is_portal_platform_admin"() OR ("outlet_id" = "public"."current_portal_outlet_id"())) AND "public"."is_current_account_enabled"()));



CREATE POLICY "outstanding_transactions_service_role" ON "public"."outstanding_transactions" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "public"."packages" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "packages_merchant_all" ON "public"."packages" TO "authenticated" USING ((("public"."is_portal_platform_admin"() OR ("outlet_id" = "public"."current_portal_outlet_id"())) AND "public"."is_current_account_enabled"())) WITH CHECK ((("public"."is_portal_platform_admin"() OR ("outlet_id" = "public"."current_portal_outlet_id"())) AND "public"."is_current_account_enabled"()));



CREATE POLICY "packages_service_role" ON "public"."packages" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "public"."platform_account_controls" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."platform_account_deletion_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."platform_admin_operations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "platform_admin_read_account_controls" ON "public"."platform_account_controls" FOR SELECT TO "authenticated" USING ("public"."is_platform_admin"());



CREATE POLICY "platform_admin_read_account_deletion_requests" ON "public"."platform_account_deletion_requests" FOR SELECT TO "authenticated" USING (( SELECT "public"."is_platform_admin"() AS "is_platform_admin"));



CREATE POLICY "platform_admin_read_audit" ON "public"."platform_audit_events" FOR SELECT TO "authenticated" USING (("public"."is_portal_platform_admin"() AND "public"."is_current_account_enabled"()));



CREATE POLICY "platform_admin_read_billing_customers" ON "public"."billing_customers" FOR SELECT TO "authenticated" USING (("public"."is_portal_platform_admin"() AND "public"."is_current_account_enabled"()));



CREATE POLICY "platform_admin_read_billing_events" ON "public"."billing_events" FOR SELECT TO "authenticated" USING (("public"."is_portal_platform_admin"() AND "public"."is_current_account_enabled"()));



CREATE POLICY "platform_admin_read_monitoring" ON "public"."platform_monitoring_events" FOR SELECT TO "authenticated" USING (("public"."is_portal_platform_admin"() AND "public"."is_current_account_enabled"()));



CREATE POLICY "platform_admin_read_operations" ON "public"."platform_admin_operations" FOR SELECT TO "authenticated" USING (("public"."is_platform_admin"() AND "public"."is_current_account_enabled"()));



CREATE POLICY "platform_admin_read_subscriptions" ON "public"."outlet_subscriptions" FOR SELECT TO "authenticated" USING (("public"."is_portal_platform_admin"() AND "public"."is_current_account_enabled"()));



CREATE POLICY "platform_admin_read_support_cases" ON "public"."platform_support_cases" FOR SELECT TO "authenticated" USING (( SELECT "public"."is_platform_admin"() AS "is_platform_admin"));



CREATE POLICY "platform_admin_read_support_events" ON "public"."platform_support_case_events" FOR SELECT TO "authenticated" USING (( SELECT "public"."is_platform_admin"() AS "is_platform_admin"));



CREATE POLICY "platform_admin_read_support_references" ON "public"."platform_support_case_references" FOR SELECT TO "authenticated" USING (( SELECT "public"."is_platform_admin"() AS "is_platform_admin"));



CREATE POLICY "platform_admin_self" ON "public"."platform_admins" FOR SELECT TO "authenticated" USING ((("user_id" = "auth"."uid"()) AND "public"."is_current_account_enabled"()));



ALTER TABLE "public"."platform_admins" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."platform_audit_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."platform_monitoring_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."platform_support_case_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."platform_support_case_references" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."platform_support_cases" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."point_transactions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "point_transactions_merchant_all" ON "public"."point_transactions" TO "authenticated" USING ((("public"."is_portal_platform_admin"() OR ("outlet_id" = "public"."current_portal_outlet_id"())) AND "public"."is_current_account_enabled"())) WITH CHECK ((("public"."is_portal_platform_admin"() OR ("outlet_id" = "public"."current_portal_outlet_id"())) AND "public"."is_current_account_enabled"()));



CREATE POLICY "point_transactions_service_role" ON "public"."point_transactions" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "public"."points_credits" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "points_credits_merchant_all" ON "public"."points_credits" TO "authenticated" USING ((("public"."is_portal_platform_admin"() OR (EXISTS ( SELECT 1
   FROM "public"."clients" "c"
  WHERE (("c"."id" = "points_credits"."client_id") AND ("c"."outlet_id" = "public"."current_portal_outlet_id"()))))) AND "public"."is_current_account_enabled"())) WITH CHECK ((("public"."is_portal_platform_admin"() OR (EXISTS ( SELECT 1
   FROM "public"."clients" "c"
  WHERE (("c"."id" = "points_credits"."client_id") AND ("c"."outlet_id" = "public"."current_portal_outlet_id"()))))) AND "public"."is_current_account_enabled"()));



CREATE POLICY "points_credits_service_role" ON "public"."points_credits" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "public"."products" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "products_merchant_all" ON "public"."products" TO "authenticated" USING ((("public"."is_portal_platform_admin"() OR ("outlet_id" = "public"."current_portal_outlet_id"())) AND "public"."is_current_account_enabled"())) WITH CHECK ((("public"."is_portal_platform_admin"() OR ("outlet_id" = "public"."current_portal_outlet_id"())) AND "public"."is_current_account_enabled"()));



CREATE POLICY "products_service_role" ON "public"."products" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_own" ON "public"."profiles" TO "authenticated" USING ((("id" = "auth"."uid"()) AND "public"."is_current_account_enabled"())) WITH CHECK ((("id" = "auth"."uid"()) AND "public"."is_current_account_enabled"()));



ALTER TABLE "public"."rewards" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "rewards_merchant_all" ON "public"."rewards" TO "authenticated" USING ((("public"."is_portal_platform_admin"() OR ("outlet_id" = "public"."current_portal_outlet_id"())) AND "public"."is_current_account_enabled"())) WITH CHECK ((("public"."is_portal_platform_admin"() OR ("outlet_id" = "public"."current_portal_outlet_id"())) AND "public"."is_current_account_enabled"()));



CREATE POLICY "rewards_service_role" ON "public"."rewards" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_manage_account_deletion_requests" ON "public"."platform_account_deletion_requests" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_manage_support_cases" ON "public"."platform_support_cases" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_manage_support_events" ON "public"."platform_support_case_events" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_manage_support_references" ON "public"."platform_support_case_references" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_audit_insert" ON "public"."platform_audit_events" FOR INSERT TO "service_role" WITH CHECK (true);



CREATE POLICY "service_role_billing_customers" ON "public"."billing_customers" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_billing_events_insert" ON "public"."billing_events" FOR INSERT TO "service_role" WITH CHECK (true);



CREATE POLICY "service_role_manage_operations" ON "public"."platform_admin_operations" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_monitoring_insert" ON "public"."platform_monitoring_events" FOR INSERT TO "service_role" WITH CHECK (true);



CREATE POLICY "service_role_subscriptions" ON "public"."outlet_subscriptions" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "public"."services" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "services_merchant_delete" ON "public"."services" FOR DELETE TO "authenticated" USING ((("public"."is_portal_platform_admin"() OR ("outlet_id" = "public"."current_portal_outlet_id"())) AND "public"."is_current_account_enabled"()));



CREATE POLICY "services_merchant_insert" ON "public"."services" FOR INSERT TO "authenticated" WITH CHECK ((("public"."is_portal_platform_admin"() OR ("outlet_id" = "public"."current_portal_outlet_id"())) AND "public"."is_current_account_enabled"()));



CREATE POLICY "services_merchant_select" ON "public"."services" FOR SELECT TO "authenticated" USING ((("public"."is_portal_platform_admin"() OR (("public"."current_portal_outlet_id"() IS NOT NULL) AND ("outlet_id" = "public"."current_portal_outlet_id"()))) AND "public"."is_current_account_enabled"()));



CREATE POLICY "services_merchant_update" ON "public"."services" FOR UPDATE TO "authenticated" USING ((("public"."is_portal_platform_admin"() OR ("outlet_id" = "public"."current_portal_outlet_id"())) AND "public"."is_current_account_enabled"())) WITH CHECK ((("public"."is_portal_platform_admin"() OR ("outlet_id" = "public"."current_portal_outlet_id"())) AND "public"."is_current_account_enabled"()));



CREATE POLICY "services_public_select_visible" ON "public"."services" FOR SELECT TO "authenticated", "anon" USING (((COALESCE("is_visible", true) = true) AND "public"."is_current_account_enabled"()));



CREATE POLICY "services_service_role" ON "public"."services" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "public"."staff" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "staff_anon_booking_select" ON "public"."staff" FOR SELECT TO "anon" USING (true);



CREATE POLICY "staff_authenticated_select" ON "public"."staff" FOR SELECT TO "authenticated" USING (("public"."is_current_account_enabled"() AND ("public"."is_portal_platform_admin"() OR "public"."is_platform_admin"() OR "public"."is_outlet_member"("outlet_id") OR ("outlet_id" = "public"."current_portal_outlet_id"()))));



CREATE POLICY "staff_merchant_delete" ON "public"."staff" FOR DELETE TO "authenticated" USING ((("public"."is_portal_platform_admin"() OR ("outlet_id" = "public"."current_portal_outlet_id"())) AND "public"."is_current_account_enabled"()));



CREATE POLICY "staff_merchant_insert" ON "public"."staff" FOR INSERT TO "authenticated" WITH CHECK ((("public"."is_portal_platform_admin"() OR ("outlet_id" = "public"."current_portal_outlet_id"())) AND "public"."is_current_account_enabled"()));



CREATE POLICY "staff_merchant_update" ON "public"."staff" FOR UPDATE TO "authenticated" USING ((("public"."is_portal_platform_admin"() OR ("outlet_id" = "public"."current_portal_outlet_id"())) AND "public"."is_current_account_enabled"())) WITH CHECK ((("public"."is_portal_platform_admin"() OR ("outlet_id" = "public"."current_portal_outlet_id"())) AND "public"."is_current_account_enabled"()));



CREATE POLICY "staff_service_role" ON "public"."staff" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "public"."transactions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "transactions_merchant_delete" ON "public"."transactions" FOR DELETE TO "authenticated" USING ((("public"."is_portal_platform_admin"() OR (("outlet_id" = "public"."current_portal_outlet_id"()) AND ("public"."is_portal_admin"() OR ("type" = 'SALE'::"text") OR (("type" = 'EXPENSE'::"text") AND ("category" = 'Commission'::"text") AND ("parent_sale_id" IS NOT NULL))))) AND "public"."is_current_account_enabled"()));



CREATE POLICY "transactions_merchant_insert" ON "public"."transactions" FOR INSERT TO "authenticated" WITH CHECK ((("public"."is_portal_platform_admin"() OR (("outlet_id" = "public"."current_portal_outlet_id"()) AND ("public"."is_portal_admin"() OR ("type" = 'SALE'::"text") OR (("type" = 'EXPENSE'::"text") AND ("category" = 'Commission'::"text") AND ("parent_sale_id" IS NOT NULL))))) AND "public"."is_current_account_enabled"()));



CREATE POLICY "transactions_merchant_select" ON "public"."transactions" FOR SELECT TO "authenticated" USING ((("public"."is_portal_platform_admin"() OR (("outlet_id" = "public"."current_portal_outlet_id"()) AND ("public"."is_portal_admin"() OR ("type" = 'SALE'::"text") OR (("type" = 'EXPENSE'::"text") AND ("category" = 'Commission'::"text") AND ("parent_sale_id" IS NOT NULL))))) AND "public"."is_current_account_enabled"()));



CREATE POLICY "transactions_merchant_update" ON "public"."transactions" FOR UPDATE TO "authenticated" USING ((("public"."is_portal_platform_admin"() OR (("outlet_id" = "public"."current_portal_outlet_id"()) AND ("public"."is_portal_admin"() OR ("type" = 'SALE'::"text")))) AND "public"."is_current_account_enabled"())) WITH CHECK ((("public"."is_portal_platform_admin"() OR (("outlet_id" = "public"."current_portal_outlet_id"()) AND ("public"."is_portal_admin"() OR ("type" = 'SALE'::"text")))) AND "public"."is_current_account_enabled"()));



CREATE POLICY "transactions_service_role" ON "public"."transactions" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "users_platform_admin_manage" ON "public"."users" TO "authenticated" USING (("public"."is_portal_platform_admin"() AND "public"."is_current_account_enabled"())) WITH CHECK (("public"."is_portal_platform_admin"() AND "public"."is_current_account_enabled"()));



CREATE POLICY "users_select_own" ON "public"."users" FOR SELECT TO "authenticated" USING ((("uid" = ("auth"."uid"())::"text") AND "public"."is_current_account_enabled"()));



CREATE POLICY "users_service_role" ON "public"."users" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "public"."vouchers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "vouchers_anon_catalog" ON "public"."vouchers" FOR SELECT TO "anon" USING (true);



CREATE POLICY "vouchers_authenticated_select" ON "public"."vouchers" FOR SELECT TO "authenticated" USING (("public"."is_current_account_enabled"() AND ("public"."is_portal_platform_admin"() OR "public"."is_platform_admin"() OR "public"."is_outlet_member"("outlet_id") OR ("outlet_id" = "public"."current_portal_outlet_id"()))));



CREATE POLICY "vouchers_merchant_delete" ON "public"."vouchers" FOR DELETE TO "authenticated" USING ((("public"."is_portal_platform_admin"() OR ("outlet_id" = "public"."current_portal_outlet_id"())) AND "public"."is_current_account_enabled"()));



CREATE POLICY "vouchers_merchant_insert" ON "public"."vouchers" FOR INSERT TO "authenticated" WITH CHECK ((("public"."is_portal_platform_admin"() OR ("outlet_id" = "public"."current_portal_outlet_id"())) AND "public"."is_current_account_enabled"()));



CREATE POLICY "vouchers_merchant_update" ON "public"."vouchers" FOR UPDATE TO "authenticated" USING ((("public"."is_portal_platform_admin"() OR ("outlet_id" = "public"."current_portal_outlet_id"())) AND "public"."is_current_account_enabled"())) WITH CHECK ((("public"."is_portal_platform_admin"() OR ("outlet_id" = "public"."current_portal_outlet_id"())) AND "public"."is_current_account_enabled"()));



CREATE POLICY "vouchers_service_role" ON "public"."vouchers" TO "service_role" USING (true) WITH CHECK (true);



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



REVOKE ALL ON FUNCTION "public"."_merchant_revenue_between"("p_outlet_id" "text", "p_start" "date", "p_end" "date") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."_merchant_revenue_between"("p_outlet_id" "text", "p_start" "date", "p_end" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."_merchant_revenue_between"("p_outlet_id" "text", "p_start" "date", "p_end" "date") TO "service_role";



REVOKE ALL ON FUNCTION "public"."abandon_pending_merchant_workspace"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."abandon_pending_merchant_workspace"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."abandon_pending_merchant_workspace"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."accept_outlet_invitation"("invitation_token" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."accept_outlet_invitation"("invitation_token" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."accept_outlet_invitation"("invitation_token" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."accept_outlet_invitation"("invitation_token" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."append_platform_audit_event"("p_outlet_id" "text", "p_action" "text", "p_affected_target" "text", "p_reason" "text", "p_metadata" "jsonb", "p_source" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."append_platform_audit_event"("p_outlet_id" "text", "p_action" "text", "p_affected_target" "text", "p_reason" "text", "p_metadata" "jsonb", "p_source" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."append_platform_audit_event"("p_outlet_id" "text", "p_action" "text", "p_affected_target" "text", "p_reason" "text", "p_metadata" "jsonb", "p_source" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."appointments_reject_staff_overlap"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."appointments_reject_staff_overlap"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."booking_slug_from_name"("value" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."booking_slug_from_name"("value" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."booking_slug_from_name"("value" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."booking_slug_from_name"("value" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."can_manage_outlet_accounts"("p_outlet_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."can_manage_outlet_accounts"("p_outlet_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_manage_outlet_accounts"("p_outlet_id" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."can_manage_outlet_integrations"("p_outlet_id" "text", "p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."can_manage_outlet_integrations"("p_outlet_id" "text", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_manage_outlet_integrations"("p_outlet_id" "text", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_manage_outlet_integrations"("p_outlet_id" "text", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."change_outlet_member_role"("p_member_id" "uuid", "p_role" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."change_outlet_member_role"("p_member_id" "uuid", "p_role" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."change_outlet_member_role"("p_member_id" "uuid", "p_role" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."complete_merchant_onboarding"("payload" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."complete_merchant_onboarding"("payload" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."complete_merchant_onboarding"("payload" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."complete_merchant_onboarding"("payload" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."complete_pos_sale"("p_transaction" "jsonb", "p_appointment_id" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."complete_pos_sale"("p_transaction" "jsonb", "p_appointment_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."complete_pos_sale"("p_transaction" "jsonb", "p_appointment_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_merchant_workspace"("p_request_id" "uuid", "p_business_name" "text", "p_business_type" "text", "p_phone" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_merchant_workspace"("p_request_id" "uuid", "p_business_name" "text", "p_business_type" "text", "p_phone" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_merchant_workspace"("p_request_id" "uuid", "p_business_name" "text", "p_business_type" "text", "p_phone" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."create_outlet_invitation"("invitee_email" "text", "invitation_role" "text", "valid_hours" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_outlet_invitation"("invitee_email" "text", "invitation_role" "text", "valid_hours" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."create_outlet_invitation"("invitee_email" "text", "invitation_role" "text", "valid_hours" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_outlet_invitation"("invitee_email" "text", "invitation_role" "text", "valid_hours" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."create_public_booking"("p_outlet_id" "text", "p_service_id" "text", "p_date" "text", "p_time" "text", "p_customer_name" "text", "p_phone" "text", "p_email" "text", "p_staff_id" "text", "p_auth_uid" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_public_booking"("p_outlet_id" "text", "p_service_id" "text", "p_date" "text", "p_time" "text", "p_customer_name" "text", "p_phone" "text", "p_email" "text", "p_staff_id" "text", "p_auth_uid" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_public_booking"("p_outlet_id" "text", "p_service_id" "text", "p_date" "text", "p_time" "text", "p_customer_name" "text", "p_phone" "text", "p_email" "text", "p_staff_id" "text", "p_auth_uid" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_public_booking"("p_outlet_id" "text", "p_service_id" "text", "p_date" "text", "p_time" "text", "p_customer_name" "text", "p_phone" "text", "p_email" "text", "p_staff_id" "text", "p_auth_uid" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."create_public_booking_batch"("p_outlet_id" "text", "p_date" "text", "p_time" "text", "p_customer_name" "text", "p_phone" "text", "p_items" "jsonb", "p_email" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_public_booking_batch"("p_outlet_id" "text", "p_date" "text", "p_time" "text", "p_customer_name" "text", "p_phone" "text", "p_items" "jsonb", "p_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_public_booking_batch"("p_outlet_id" "text", "p_date" "text", "p_time" "text", "p_customer_name" "text", "p_phone" "text", "p_items" "jsonb", "p_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_public_booking_batch"("p_outlet_id" "text", "p_date" "text", "p_time" "text", "p_customer_name" "text", "p_phone" "text", "p_items" "jsonb", "p_email" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."current_portal_outlet_id"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."current_portal_outlet_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."current_portal_outlet_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_portal_outlet_id"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."delete_appointment_and_linked_sale"("p_appointment_id" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."delete_appointment_and_linked_sale"("p_appointment_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_appointment_and_linked_sale"("p_appointment_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."ensure_customer_profile"() TO "anon";
GRANT ALL ON FUNCTION "public"."ensure_customer_profile"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."ensure_customer_profile"() TO "service_role";



GRANT ALL ON FUNCTION "public"."ensure_identity_profiles"() TO "anon";
GRANT ALL ON FUNCTION "public"."ensure_identity_profiles"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."ensure_identity_profiles"() TO "service_role";



GRANT ALL ON FUNCTION "public"."ensure_merchant_workspace"() TO "anon";
GRANT ALL ON FUNCTION "public"."ensure_merchant_workspace"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."ensure_merchant_workspace"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_public_available_slots"("p_outlet_id" "text", "p_service_id" "text", "p_date" "text", "p_staff_id" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_public_available_slots"("p_outlet_id" "text", "p_service_id" "text", "p_date" "text", "p_staff_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_public_available_slots"("p_outlet_id" "text", "p_service_id" "text", "p_date" "text", "p_staff_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_public_available_slots"("p_outlet_id" "text", "p_service_id" "text", "p_date" "text", "p_staff_id" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_public_outlet"("p_outlet_id" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_public_outlet"("p_outlet_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_public_outlet"("p_outlet_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_public_outlet"("p_outlet_id" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."google_api_rate_limit_hit"("p_bucket" "text", "p_limit" integer, "p_window_seconds" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."google_api_rate_limit_hit"("p_bucket" "text", "p_limit" integer, "p_window_seconds" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."google_api_rate_limit_hit"("p_bucket" "text", "p_limit" integer, "p_window_seconds" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."google_api_rate_limit_hit"("p_bucket" "text", "p_limit" integer, "p_window_seconds" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."google_business_purge_expired"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."google_business_purge_expired"() TO "anon";
GRANT ALL ON FUNCTION "public"."google_business_purge_expired"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."google_business_purge_expired"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."has_outlet_role"("p_outlet_id" "text", "p_roles" "text"[]) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."has_outlet_role"("p_outlet_id" "text", "p_roles" "text"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_outlet_role"("p_outlet_id" "text", "p_roles" "text"[]) TO "service_role";



REVOKE ALL ON FUNCTION "public"."is_current_account_enabled"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_current_account_enabled"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_current_account_enabled"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_current_account_enabled"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."is_outlet_member"("p_outlet_id" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_outlet_member"("p_outlet_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_outlet_member"("p_outlet_id" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."is_platform_admin"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_platform_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_platform_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_platform_admin"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."is_portal_admin"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_portal_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_portal_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_portal_admin"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."is_portal_platform_admin"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_portal_platform_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_portal_platform_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_portal_platform_admin"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."merchant_account_deletion_request_status"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."merchant_account_deletion_request_status"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."merchant_account_deletion_request_status"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."merchant_adjust_client_credit"("p_client_id" "text", "p_outlet_id" "text", "p_type" "text", "p_amount" numeric, "p_staff_remark" "text", "p_staff_name" "text", "p_transaction_id" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."merchant_adjust_client_credit"("p_client_id" "text", "p_outlet_id" "text", "p_type" "text", "p_amount" numeric, "p_staff_remark" "text", "p_staff_name" "text", "p_transaction_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."merchant_adjust_client_credit"("p_client_id" "text", "p_outlet_id" "text", "p_type" "text", "p_amount" numeric, "p_staff_remark" "text", "p_staff_name" "text", "p_transaction_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."merchant_adjust_client_credit"("p_client_id" "text", "p_outlet_id" "text", "p_type" "text", "p_amount" numeric, "p_staff_remark" "text", "p_staff_name" "text", "p_transaction_id" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."merchant_adjust_client_outstanding"("p_client_id" "text", "p_outlet_id" "text", "p_type" "text", "p_amount" numeric, "p_timestamp" timestamp with time zone) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."merchant_adjust_client_outstanding"("p_client_id" "text", "p_outlet_id" "text", "p_type" "text", "p_amount" numeric, "p_timestamp" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."merchant_adjust_client_outstanding"("p_client_id" "text", "p_outlet_id" "text", "p_type" "text", "p_amount" numeric, "p_timestamp" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."merchant_adjust_client_outstanding"("p_client_id" "text", "p_outlet_id" "text", "p_type" "text", "p_amount" numeric, "p_timestamp" timestamp with time zone) TO "service_role";



REVOKE ALL ON FUNCTION "public"."merchant_adjust_client_points"("p_client_id" "text", "p_outlet_id" "text", "p_type" "text", "p_amount" numeric, "p_is_manual" boolean, "p_description" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."merchant_adjust_client_points"("p_client_id" "text", "p_outlet_id" "text", "p_type" "text", "p_amount" numeric, "p_is_manual" boolean, "p_description" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."merchant_adjust_client_points"("p_client_id" "text", "p_outlet_id" "text", "p_type" "text", "p_amount" numeric, "p_is_manual" boolean, "p_description" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."merchant_adjust_client_points"("p_client_id" "text", "p_outlet_id" "text", "p_type" "text", "p_amount" numeric, "p_is_manual" boolean, "p_description" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."merchant_credit_points_for_sale"("p_client_id" "text", "p_sale_id" "text", "p_points" integer, "p_outlet_id" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."merchant_credit_points_for_sale"("p_client_id" "text", "p_sale_id" "text", "p_points" integer, "p_outlet_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."merchant_credit_points_for_sale"("p_client_id" "text", "p_sale_id" "text", "p_points" integer, "p_outlet_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."merchant_credit_points_for_sale"("p_client_id" "text", "p_sale_id" "text", "p_points" integer, "p_outlet_id" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."merchant_dashboard_aggregates"("p_outlet_id" "text", "p_month_start" "date", "p_month_end" "date", "p_week_start" "date", "p_week_end" "date", "p_today" "date", "p_yesterday" "date", "p_prev_week_start" "date", "p_prev_week_end" "date", "p_prev_month_start" "date", "p_prev_month_end" "date") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."merchant_dashboard_aggregates"("p_outlet_id" "text", "p_month_start" "date", "p_month_end" "date", "p_week_start" "date", "p_week_end" "date", "p_today" "date", "p_yesterday" "date", "p_prev_week_start" "date", "p_prev_week_end" "date", "p_prev_month_start" "date", "p_prev_month_end" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."merchant_dashboard_aggregates"("p_outlet_id" "text", "p_month_start" "date", "p_month_end" "date", "p_week_start" "date", "p_week_end" "date", "p_today" "date", "p_yesterday" "date", "p_prev_week_start" "date", "p_prev_week_end" "date", "p_prev_month_start" "date", "p_prev_month_end" "date") TO "service_role";



REVOKE ALL ON FUNCTION "public"."merchant_monthly_report_summary"("p_outlet_id" "text", "p_year" integer, "p_month" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."merchant_monthly_report_summary"("p_outlet_id" "text", "p_year" integer, "p_month" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."merchant_monthly_report_summary"("p_outlet_id" "text", "p_year" integer, "p_month" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."merchant_reverse_manual_point_transaction"("p_transaction_id" "text", "p_outlet_id" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."merchant_reverse_manual_point_transaction"("p_transaction_id" "text", "p_outlet_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."merchant_reverse_manual_point_transaction"("p_transaction_id" "text", "p_outlet_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."merchant_reverse_manual_point_transaction"("p_transaction_id" "text", "p_outlet_id" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."minutes_to_booking_time"("p_minutes" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."minutes_to_booking_time"("p_minutes" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."parse_time_to_minutes"("time_str" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."parse_time_to_minutes"("time_str" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."parse_time_to_minutes"("time_str" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."platform_account_deletion_requests_page"("p_search" "text", "p_status" "text", "p_source" "text", "p_limit" integer, "p_offset" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."platform_account_deletion_requests_page"("p_search" "text", "p_status" "text", "p_source" "text", "p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."platform_account_deletion_requests_page"("p_search" "text", "p_status" "text", "p_source" "text", "p_limit" integer, "p_offset" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."platform_activity_page"("p_kind" "text", "p_start_date" "date", "p_end_date" "date", "p_outlet_id" "text", "p_limit" integer, "p_offset" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."platform_activity_page"("p_kind" "text", "p_start_date" "date", "p_end_date" "date", "p_outlet_id" "text", "p_limit" integer, "p_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."platform_activity_page"("p_kind" "text", "p_start_date" "date", "p_end_date" "date", "p_outlet_id" "text", "p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."platform_activity_page"("p_kind" "text", "p_start_date" "date", "p_end_date" "date", "p_outlet_id" "text", "p_limit" integer, "p_offset" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."platform_add_support_reference"("p_case_id" "uuid", "p_type" "text", "p_reference_id" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."platform_add_support_reference"("p_case_id" "uuid", "p_type" "text", "p_reference_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."platform_add_support_reference"("p_case_id" "uuid", "p_type" "text", "p_reference_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."platform_add_support_reference"("p_case_id" "uuid", "p_type" "text", "p_reference_id" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."platform_create_support_case"("p_outlet_id" "text", "p_category" "text", "p_priority" "text", "p_subject" "text", "p_description" "text", "p_assigned_to" "uuid", "p_references" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."platform_create_support_case"("p_outlet_id" "text", "p_category" "text", "p_priority" "text", "p_subject" "text", "p_description" "text", "p_assigned_to" "uuid", "p_references" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."platform_create_support_case"("p_outlet_id" "text", "p_category" "text", "p_priority" "text", "p_subject" "text", "p_description" "text", "p_assigned_to" "uuid", "p_references" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."platform_create_support_case"("p_outlet_id" "text", "p_category" "text", "p_priority" "text", "p_subject" "text", "p_description" "text", "p_assigned_to" "uuid", "p_references" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."platform_delete_outlet"("p_outlet_id" "text", "p_reason" "text", "p_confirm_name" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."platform_delete_outlet"("p_outlet_id" "text", "p_reason" "text", "p_confirm_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."platform_delete_outlet"("p_outlet_id" "text", "p_reason" "text", "p_confirm_name" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."platform_global_search"("p_query" "text", "p_limit_per_group" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."platform_global_search"("p_query" "text", "p_limit_per_group" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."platform_global_search"("p_query" "text", "p_limit_per_group" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."platform_integrations_page"("p_outlet_id" "text", "p_type" "text", "p_state" "text", "p_limit" integer, "p_offset" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."platform_integrations_page"("p_outlet_id" "text", "p_type" "text", "p_state" "text", "p_limit" integer, "p_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."platform_integrations_page"("p_outlet_id" "text", "p_type" "text", "p_state" "text", "p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."platform_integrations_page"("p_outlet_id" "text", "p_type" "text", "p_state" "text", "p_limit" integer, "p_offset" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."platform_jobs_page"("p_outlet_id" "text", "p_type" "text", "p_state" "text", "p_from" timestamp with time zone, "p_to" timestamp with time zone, "p_limit" integer, "p_offset" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."platform_jobs_page"("p_outlet_id" "text", "p_type" "text", "p_state" "text", "p_from" timestamp with time zone, "p_to" timestamp with time zone, "p_limit" integer, "p_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."platform_jobs_page"("p_outlet_id" "text", "p_type" "text", "p_state" "text", "p_from" timestamp with time zone, "p_to" timestamp with time zone, "p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."platform_jobs_page"("p_outlet_id" "text", "p_type" "text", "p_state" "text", "p_from" timestamp with time zone, "p_to" timestamp with time zone, "p_limit" integer, "p_offset" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."platform_manage_outlet_member"("p_outlet_id" "text", "p_user_id" "uuid", "p_action" "text", "p_role" "text", "p_reason" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."platform_manage_outlet_member"("p_outlet_id" "text", "p_user_id" "uuid", "p_action" "text", "p_role" "text", "p_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."platform_manage_outlet_member"("p_outlet_id" "text", "p_user_id" "uuid", "p_action" "text", "p_role" "text", "p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."platform_manage_outlet_member"("p_outlet_id" "text", "p_user_id" "uuid", "p_action" "text", "p_role" "text", "p_reason" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."platform_monitoring_events_page"("p_limit" integer, "p_offset" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."platform_monitoring_events_page"("p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."platform_monitoring_events_page"("p_limit" integer, "p_offset" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."platform_onboarding_page"("p_stage" "text", "p_search" "text", "p_limit" integer, "p_offset" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."platform_onboarding_page"("p_stage" "text", "p_search" "text", "p_limit" integer, "p_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."platform_onboarding_page"("p_stage" "text", "p_search" "text", "p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."platform_onboarding_page"("p_stage" "text", "p_search" "text", "p_limit" integer, "p_offset" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."platform_operations_overview"("p_start_date" "date", "p_end_date" "date", "p_outlet_id" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."platform_operations_overview"("p_start_date" "date", "p_end_date" "date", "p_outlet_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."platform_operations_overview"("p_start_date" "date", "p_end_date" "date", "p_outlet_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."platform_operations_overview"("p_start_date" "date", "p_end_date" "date", "p_outlet_id" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."platform_outlet_inspector"("p_outlet_id" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."platform_outlet_inspector"("p_outlet_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."platform_outlet_inspector"("p_outlet_id" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."platform_reference_belongs_to_outlet"("p_outlet_id" "text", "p_type" "text", "p_reference_id" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."platform_reference_belongs_to_outlet"("p_outlet_id" "text", "p_type" "text", "p_reference_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."platform_reference_belongs_to_outlet"("p_outlet_id" "text", "p_type" "text", "p_reference_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."platform_reference_belongs_to_outlet"("p_outlet_id" "text", "p_type" "text", "p_reference_id" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."platform_remote_access"("p_outlet_id" "text", "p_action" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."platform_remote_access"("p_outlet_id" "text", "p_action" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."platform_remote_access"("p_outlet_id" "text", "p_action" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."platform_remote_access"("p_outlet_id" "text", "p_action" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."platform_sanitize_error"("p_value" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."platform_sanitize_error"("p_value" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."platform_sanitize_error"("p_value" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."platform_sanitize_error"("p_value" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."platform_sanitize_jsonb"("p_value" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."platform_sanitize_jsonb"("p_value" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."platform_sanitize_jsonb"("p_value" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."platform_sanitize_jsonb"("p_value" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."platform_set_outlet_access"("p_outlet_id" "text", "p_enabled" boolean, "p_reason" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."platform_set_outlet_access"("p_outlet_id" "text", "p_enabled" boolean, "p_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."platform_set_outlet_access"("p_outlet_id" "text", "p_enabled" boolean, "p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."platform_set_outlet_access"("p_outlet_id" "text", "p_enabled" boolean, "p_reason" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."platform_support_case_detail"("p_case_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."platform_support_case_detail"("p_case_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."platform_support_case_detail"("p_case_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."platform_support_case_detail"("p_case_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."platform_support_cases_page"("p_search" "text", "p_status" "text", "p_priority" "text", "p_category" "text", "p_outlet_id" "text", "p_limit" integer, "p_offset" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."platform_support_cases_page"("p_search" "text", "p_status" "text", "p_priority" "text", "p_category" "text", "p_outlet_id" "text", "p_limit" integer, "p_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."platform_support_cases_page"("p_search" "text", "p_status" "text", "p_priority" "text", "p_category" "text", "p_outlet_id" "text", "p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."platform_support_cases_page"("p_search" "text", "p_status" "text", "p_priority" "text", "p_category" "text", "p_outlet_id" "text", "p_limit" integer, "p_offset" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."platform_support_operators"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."platform_support_operators"() TO "anon";
GRANT ALL ON FUNCTION "public"."platform_support_operators"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."platform_support_operators"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."platform_transfer_outlet_ownership"("p_outlet_id" "text", "p_current_owner" "uuid", "p_new_owner" "uuid", "p_reason" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."platform_transfer_outlet_ownership"("p_outlet_id" "text", "p_current_owner" "uuid", "p_new_owner" "uuid", "p_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."platform_transfer_outlet_ownership"("p_outlet_id" "text", "p_current_owner" "uuid", "p_new_owner" "uuid", "p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."platform_transfer_outlet_ownership"("p_outlet_id" "text", "p_current_owner" "uuid", "p_new_owner" "uuid", "p_reason" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."platform_update_account_deletion_request"("p_request_id" "uuid", "p_status" "text", "p_processing_notes" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."platform_update_account_deletion_request"("p_request_id" "uuid", "p_status" "text", "p_processing_notes" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."platform_update_account_deletion_request"("p_request_id" "uuid", "p_status" "text", "p_processing_notes" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."platform_update_support_case"("p_case_id" "uuid", "p_action" "text", "p_status" "text", "p_assigned_to" "uuid", "p_note" "text", "p_resolution_summary" "text", "p_expected_updated_at" timestamp with time zone) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."platform_update_support_case"("p_case_id" "uuid", "p_action" "text", "p_status" "text", "p_assigned_to" "uuid", "p_note" "text", "p_resolution_summary" "text", "p_expected_updated_at" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."platform_update_support_case"("p_case_id" "uuid", "p_action" "text", "p_status" "text", "p_assigned_to" "uuid", "p_note" "text", "p_resolution_summary" "text", "p_expected_updated_at" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."platform_update_support_case"("p_case_id" "uuid", "p_action" "text", "p_status" "text", "p_assigned_to" "uuid", "p_note" "text", "p_resolution_summary" "text", "p_expected_updated_at" timestamp with time zone) TO "service_role";



REVOKE ALL ON FUNCTION "public"."public_voucher_confirm_redemption"("p_voucher_id" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."public_voucher_confirm_redemption"("p_voucher_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."public_voucher_confirm_redemption"("p_voucher_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."public_voucher_confirm_redemption"("p_voucher_id" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."public_voucher_purchase"("p_voucher_id" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."public_voucher_purchase"("p_voucher_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."public_voucher_purchase"("p_voucher_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."public_voucher_purchase"("p_voucher_id" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."recalc_client_last_renewal"("p_outlet_id" "text", "p_client_id" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."recalc_client_last_renewal"("p_outlet_id" "text", "p_client_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."recalc_client_last_renewal"("p_outlet_id" "text", "p_client_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."recalc_client_last_renewal"("p_outlet_id" "text", "p_client_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."reject_immutable_platform_event_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."reject_immutable_platform_event_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."reject_immutable_platform_event_change"() TO "service_role";



GRANT ALL ON FUNCTION "public"."reject_support_history_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."reject_support_history_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."reject_support_history_change"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."renew_member_membership"("p_client_id" "text", "p_amount" numeric, "p_payment_method" "text", "p_operator_name" "text", "p_renewed_at" timestamp with time zone) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."renew_member_membership"("p_client_id" "text", "p_amount" numeric, "p_payment_method" "text", "p_operator_name" "text", "p_renewed_at" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."renew_member_membership"("p_client_id" "text", "p_amount" numeric, "p_payment_method" "text", "p_operator_name" "text", "p_renewed_at" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."renew_member_membership"("p_client_id" "text", "p_amount" numeric, "p_payment_method" "text", "p_operator_name" "text", "p_renewed_at" timestamp with time zone) TO "service_role";



REVOKE ALL ON FUNCTION "public"."resolve_merchant_access"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."resolve_merchant_access"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."resolve_merchant_access"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."resolve_public_booking_outlet"("p_segment" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."resolve_public_booking_outlet"("p_segment" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."resolve_public_booking_outlet"("p_segment" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."resolve_public_booking_outlet"("p_segment" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "anon";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_outlet_member_status"("p_member_id" "uuid", "p_status" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."set_outlet_member_status"("p_member_id" "uuid", "p_status" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_outlet_member_status"("p_member_id" "uuid", "p_status" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."slugify_booking_name"("value" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."slugify_booking_name"("value" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."slugify_booking_name"("value" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."slugify_booking_name"("value" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."staff_free_for_slot"("p_outlet_id" "text", "p_staff_id" "text", "p_date" "text", "p_start_minutes" integer, "p_end_minutes" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."staff_free_for_slot"("p_outlet_id" "text", "p_staff_id" "text", "p_date" "text", "p_start_minutes" integer, "p_end_minutes" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."submit_merchant_account_deletion_request"("p_reason" "text", "p_source" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."submit_merchant_account_deletion_request"("p_reason" "text", "p_source" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."submit_merchant_account_deletion_request"("p_reason" "text", "p_source" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."submit_public_account_deletion_request"("p_email" "text", "p_requester_name" "text", "p_business_name" "text", "p_reason" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."submit_public_account_deletion_request"("p_email" "text", "p_requester_name" "text", "p_business_name" "text", "p_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."submit_public_account_deletion_request"("p_email" "text", "p_requester_name" "text", "p_business_name" "text", "p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."submit_public_account_deletion_request"("p_email" "text", "p_requester_name" "text", "p_business_name" "text", "p_reason" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."submit_public_review"("p_outlet_id" "text", "p_author" "text", "p_text" "text", "p_rating" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."submit_public_review"("p_outlet_id" "text", "p_author" "text", "p_text" "text", "p_rating" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."submit_public_review"("p_outlet_id" "text", "p_author" "text", "p_text" "text", "p_rating" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."submit_public_review"("p_outlet_id" "text", "p_author" "text", "p_text" "text", "p_rating" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."text_or_null"("value" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."text_or_null"("value" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."text_or_null"("value" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."text_or_null"("value" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."touch_account_deletion_request_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."touch_account_deletion_request_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."touch_account_deletion_request_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."track_appointment_lifecycle"() TO "anon";
GRANT ALL ON FUNCTION "public"."track_appointment_lifecycle"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."track_appointment_lifecycle"() TO "service_role";



GRANT ALL ON FUNCTION "public"."transfer_outlet_ownership"("p_outlet_id" "text", "p_new_owner" "uuid", "p_confirmation" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."transfer_outlet_ownership"("p_outlet_id" "text", "p_new_owner" "uuid", "p_confirmation" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."transfer_outlet_ownership"("p_outlet_id" "text", "p_new_owner" "uuid", "p_confirmation" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."upsert_frontend_customer_profile"("p_email" "text", "p_name" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."upsert_frontend_customer_profile"("p_email" "text", "p_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."upsert_frontend_customer_profile"("p_email" "text", "p_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."upsert_frontend_customer_profile"("p_email" "text", "p_name" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."void_sale_and_remove_linked_appointments"("p_transaction_id" "text", "p_reason" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."void_sale_and_remove_linked_appointments"("p_transaction_id" "text", "p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."void_sale_and_remove_linked_appointments"("p_transaction_id" "text", "p_reason" "text") TO "service_role";



GRANT ALL ON TABLE "public"."api_integrations" TO "anon";
GRANT ALL ON TABLE "public"."api_integrations" TO "authenticated";
GRANT ALL ON TABLE "public"."api_integrations" TO "service_role";



GRANT ALL ON TABLE "public"."appointments" TO "anon";
GRANT ALL ON TABLE "public"."appointments" TO "authenticated";
GRANT ALL ON TABLE "public"."appointments" TO "service_role";



GRANT ALL ON TABLE "public"."audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_logs" TO "service_role";



GRANT ALL ON TABLE "public"."billing_customers" TO "anon";
GRANT ALL ON TABLE "public"."billing_customers" TO "authenticated";
GRANT ALL ON TABLE "public"."billing_customers" TO "service_role";



GRANT ALL ON TABLE "public"."billing_events" TO "anon";
GRANT ALL ON TABLE "public"."billing_events" TO "authenticated";
GRANT ALL ON TABLE "public"."billing_events" TO "service_role";



GRANT ALL ON TABLE "public"."clients" TO "anon";
GRANT ALL ON TABLE "public"."clients" TO "authenticated";
GRANT ALL ON TABLE "public"."clients" TO "service_role";



GRANT ALL ON TABLE "public"."credit_history" TO "anon";
GRANT ALL ON TABLE "public"."credit_history" TO "authenticated";
GRANT ALL ON TABLE "public"."credit_history" TO "service_role";



GRANT ALL ON TABLE "public"."customer_profiles" TO "anon";
GRANT ALL ON TABLE "public"."customer_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."customer_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."frontend_customers" TO "anon";
GRANT ALL ON TABLE "public"."frontend_customers" TO "authenticated";
GRANT ALL ON TABLE "public"."frontend_customers" TO "service_role";



GRANT ALL ON TABLE "public"."google_api_rate_limits" TO "service_role";



GRANT ALL ON TABLE "public"."google_business_connections" TO "service_role";



GRANT ALL ON TABLE "public"."google_oauth_states" TO "service_role";



GRANT ALL ON TABLE "public"."google_review_cursors" TO "service_role";



GRANT ALL ON TABLE "public"."google_review_page_cache" TO "service_role";



GRANT ALL ON TABLE "public"."marketing_audiences" TO "anon";
GRANT ALL ON TABLE "public"."marketing_audiences" TO "authenticated";
GRANT ALL ON TABLE "public"."marketing_audiences" TO "service_role";



GRANT ALL ON TABLE "public"."marketing_campaign_deliveries" TO "anon";
GRANT ALL ON TABLE "public"."marketing_campaign_deliveries" TO "authenticated";
GRANT ALL ON TABLE "public"."marketing_campaign_deliveries" TO "service_role";



GRANT ALL ON TABLE "public"."marketing_campaigns" TO "anon";
GRANT ALL ON TABLE "public"."marketing_campaigns" TO "authenticated";
GRANT ALL ON TABLE "public"."marketing_campaigns" TO "service_role";



GRANT ALL ON TABLE "public"."merchant_onboarding_drafts" TO "anon";
GRANT ALL ON TABLE "public"."merchant_onboarding_drafts" TO "authenticated";
GRANT ALL ON TABLE "public"."merchant_onboarding_drafts" TO "service_role";



GRANT ALL ON TABLE "public"."merchant_provision_requests" TO "anon";
GRANT ALL ON TABLE "public"."merchant_provision_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."merchant_provision_requests" TO "service_role";



GRANT ALL ON TABLE "public"."onboarding_states" TO "anon";
GRANT ALL ON TABLE "public"."onboarding_states" TO "authenticated";
GRANT ALL ON TABLE "public"."onboarding_states" TO "service_role";



GRANT ALL ON TABLE "public"."outlet_invitations" TO "anon";
GRANT ALL ON TABLE "public"."outlet_invitations" TO "authenticated";
GRANT ALL ON TABLE "public"."outlet_invitations" TO "service_role";



GRANT ALL ON TABLE "public"."outlet_members" TO "anon";
GRANT ALL ON TABLE "public"."outlet_members" TO "authenticated";
GRANT ALL ON TABLE "public"."outlet_members" TO "service_role";



GRANT ALL ON TABLE "public"."outlet_subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."outlet_subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."outlet_subscriptions" TO "service_role";



GRANT ALL ON TABLE "public"."outlets" TO "anon";
GRANT ALL ON TABLE "public"."outlets" TO "authenticated";
GRANT ALL ON TABLE "public"."outlets" TO "service_role";



GRANT ALL ON TABLE "public"."outstanding_transactions" TO "anon";
GRANT ALL ON TABLE "public"."outstanding_transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."outstanding_transactions" TO "service_role";



GRANT ALL ON TABLE "public"."packages" TO "anon";
GRANT ALL ON TABLE "public"."packages" TO "authenticated";
GRANT ALL ON TABLE "public"."packages" TO "service_role";



GRANT ALL ON TABLE "public"."platform_account_controls" TO "service_role";
GRANT SELECT ON TABLE "public"."platform_account_controls" TO "authenticated";



GRANT ALL ON TABLE "public"."platform_account_deletion_requests" TO "service_role";
GRANT SELECT ON TABLE "public"."platform_account_deletion_requests" TO "authenticated";



GRANT ALL ON TABLE "public"."platform_admin_operations" TO "anon";
GRANT ALL ON TABLE "public"."platform_admin_operations" TO "authenticated";
GRANT ALL ON TABLE "public"."platform_admin_operations" TO "service_role";



GRANT ALL ON TABLE "public"."platform_admins" TO "anon";
GRANT ALL ON TABLE "public"."platform_admins" TO "authenticated";
GRANT ALL ON TABLE "public"."platform_admins" TO "service_role";



GRANT ALL ON TABLE "public"."platform_audit_events" TO "anon";
GRANT ALL ON TABLE "public"."platform_audit_events" TO "authenticated";
GRANT ALL ON TABLE "public"."platform_audit_events" TO "service_role";



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."platform_monitoring_events" TO "anon";
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."platform_monitoring_events" TO "authenticated";
GRANT ALL ON TABLE "public"."platform_monitoring_events" TO "service_role";



GRANT ALL ON TABLE "public"."platform_support_case_events" TO "service_role";
GRANT SELECT ON TABLE "public"."platform_support_case_events" TO "authenticated";



GRANT ALL ON TABLE "public"."platform_support_case_references" TO "service_role";
GRANT SELECT ON TABLE "public"."platform_support_case_references" TO "authenticated";



GRANT ALL ON TABLE "public"."platform_support_cases" TO "service_role";
GRANT SELECT ON TABLE "public"."platform_support_cases" TO "authenticated";



GRANT ALL ON TABLE "public"."point_transactions" TO "anon";
GRANT ALL ON TABLE "public"."point_transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."point_transactions" TO "service_role";



GRANT ALL ON TABLE "public"."points_credits" TO "anon";
GRANT ALL ON TABLE "public"."points_credits" TO "authenticated";
GRANT ALL ON TABLE "public"."points_credits" TO "service_role";



GRANT ALL ON TABLE "public"."products" TO "anon";
GRANT ALL ON TABLE "public"."products" TO "authenticated";
GRANT ALL ON TABLE "public"."products" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."rewards" TO "anon";
GRANT ALL ON TABLE "public"."rewards" TO "authenticated";
GRANT ALL ON TABLE "public"."rewards" TO "service_role";



GRANT ALL ON TABLE "public"."services" TO "anon";
GRANT ALL ON TABLE "public"."services" TO "authenticated";
GRANT ALL ON TABLE "public"."services" TO "service_role";



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."staff" TO "anon";
GRANT ALL ON TABLE "public"."staff" TO "authenticated";
GRANT ALL ON TABLE "public"."staff" TO "service_role";



GRANT SELECT("id") ON TABLE "public"."staff" TO "anon";



GRANT SELECT("outlet_id") ON TABLE "public"."staff" TO "anon";



GRANT SELECT("name") ON TABLE "public"."staff" TO "anon";



GRANT SELECT("role") ON TABLE "public"."staff" TO "anon";



GRANT SELECT("profile_picture") ON TABLE "public"."staff" TO "anon";



GRANT SELECT("photo_url") ON TABLE "public"."staff" TO "anon";



GRANT SELECT("qualified_services") ON TABLE "public"."staff" TO "anon";



GRANT ALL ON TABLE "public"."transactions" TO "anon";
GRANT ALL ON TABLE "public"."transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."transactions" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."vouchers" TO "anon";
GRANT ALL ON TABLE "public"."vouchers" TO "authenticated";
GRANT ALL ON TABLE "public"."vouchers" TO "service_role";



GRANT SELECT("id") ON TABLE "public"."vouchers" TO "anon";



GRANT SELECT("outlet_id") ON TABLE "public"."vouchers" TO "anon";



GRANT SELECT("name") ON TABLE "public"."vouchers" TO "anon";



GRANT SELECT("price") ON TABLE "public"."vouchers" TO "anon";



GRANT SELECT("service_ids") ON TABLE "public"."vouchers" TO "anon";



GRANT SELECT("expiry_date") ON TABLE "public"."vouchers" TO "anon";



GRANT SELECT("status") ON TABLE "public"."vouchers" TO "anon";



GRANT SELECT("slug") ON TABLE "public"."vouchers" TO "anon";



GRANT SELECT("purchased_at") ON TABLE "public"."vouchers" TO "anon";



GRANT SELECT("redeemed_at") ON TABLE "public"."vouchers" TO "anon";



GRANT SELECT("created_at") ON TABLE "public"."vouchers" TO "anon";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







