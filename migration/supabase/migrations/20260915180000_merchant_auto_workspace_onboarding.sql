-- New merchant accounts get an outlet immediately. Incomplete setup stays
-- resumable: login sends the owner back to onboarding instead of a dead end.

CREATE OR REPLACE FUNCTION public.ensure_merchant_workspace()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
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

CREATE OR REPLACE FUNCTION public.abandon_pending_merchant_workspace()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

CREATE OR REPLACE FUNCTION public.create_merchant_workspace(
  p_request_id uuid, p_business_name text, p_business_type text, p_phone text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_req public.merchant_provision_requests%rowtype;
  v_outlet text;
  v_email text;
  v_slug text;
  v_slug_base text;
  v_pending boolean := false;
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

  v_slug_base := coalesce(nullif(public.slugify_booking_name(trim(p_business_name)), ''), 'business');

  IF v_outlet IS NOT NULL AND v_pending THEN
    v_slug := v_slug_base || '-' || substr(v_outlet, -6);
    WHILE EXISTS (
      SELECT 1 FROM public.outlets WHERE lower(booking_slug) = lower(v_slug) AND outlet_id <> v_outlet
    ) LOOP
      v_slug := v_slug_base || '-' || substr(encode(gen_random_bytes(4), 'hex'), 1, 8);
    END LOOP;

    UPDATE public.outlets SET
      name = trim(p_business_name),
      email = v_email,
      phone = p_phone,
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
  v_slug := v_slug_base || '-' || substr(v_outlet, -6);
  WHILE EXISTS (SELECT 1 FROM public.outlets WHERE lower(booking_slug) = lower(v_slug)) LOOP
    v_slug := v_slug_base || '-' || substr(encode(gen_random_bytes(4), 'hex'), 1, 8);
  END LOOP;

  INSERT INTO public.outlets(
    outlet_id, name, email, phone, business_type, owner_user_id, booking_slug,
    is_active, status, onboarding_status, access_status, account_limit, settings
  ) VALUES (
    v_outlet, trim(p_business_name), v_email, p_phone, p_business_type, v_uid, v_slug,
    true, 'active', 'incomplete', 'active', 3,
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

CREATE OR REPLACE FUNCTION public.resolve_merchant_access()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

CREATE OR REPLACE FUNCTION public.accept_outlet_invitation(invitation_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
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

REVOKE ALL ON FUNCTION public.ensure_merchant_workspace() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.abandon_pending_merchant_workspace() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_merchant_workspace() TO authenticated;
GRANT EXECUTE ON FUNCTION public.abandon_pending_merchant_workspace() TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_merchant_workspace(uuid, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_merchant_access() TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_outlet_invitation(text) TO authenticated;
