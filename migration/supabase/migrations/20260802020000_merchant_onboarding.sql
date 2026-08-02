-- Secure merchant registration, resumable onboarding, and invitation acceptance.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.outlets ADD COLUMN IF NOT EXISTS website text;

CREATE UNIQUE INDEX IF NOT EXISTS outlets_booking_slug_lower_unique
  ON public.outlets (lower(booking_slug)) WHERE booking_slug IS NOT NULL AND booking_slug <> '';

CREATE TABLE IF NOT EXISTS public.merchant_onboarding_drafts (
  auth_user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  current_step text NOT NULL DEFAULT 'account-type',
  account_type text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.outlet_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id text NOT NULL REFERENCES public.outlets(outlet_id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'manager', 'cashier')),
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  accepted_by uuid REFERENCES auth.users(id),
  created_by text REFERENCES public.users(uid),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS outlet_invitations_outlet_idx ON public.outlet_invitations(outlet_id);
CREATE INDEX IF NOT EXISTS outlet_invitations_email_idx ON public.outlet_invitations(lower(email));

ALTER TABLE public.merchant_onboarding_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outlet_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS merchant_onboarding_drafts_own ON public.merchant_onboarding_drafts;
CREATE POLICY merchant_onboarding_drafts_own ON public.merchant_onboarding_drafts
  FOR ALL TO authenticated
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

DROP POLICY IF EXISTS outlet_invitations_admin_read ON public.outlet_invitations;
CREATE POLICY outlet_invitations_admin_read ON public.outlet_invitations
  FOR SELECT TO authenticated
  USING (outlet_id = public.current_portal_outlet_id() AND public.is_portal_admin());

GRANT SELECT, INSERT, UPDATE ON public.merchant_onboarding_drafts TO authenticated;
GRANT SELECT ON public.outlet_invitations TO authenticated;

CREATE OR REPLACE FUNCTION public.slugify_booking_name(value text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public
AS $$
  SELECT trim(both '-' from regexp_replace(lower(coalesce(value, '')), '[^a-z0-9]+', '-', 'g'));
$$;

CREATE OR REPLACE FUNCTION public.complete_merchant_onboarding(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
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
  -- Serialize completion per Auth user so concurrent submissions cannot create
  -- multiple outlets before the public.users mapping becomes visible.
  PERFORM pg_advisory_xact_lock(hashtextextended(v_uid::text, 0));
  IF coalesce(payload->>'accountType', '') <> 'create' THEN
    RAISE EXCEPTION 'Joining an existing business requires a verified invitation';
  END IF;
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
  IF NOT (coalesce(payload->'businessCategories', '[]'::jsonb) ? coalesce(payload->>'primaryBusinessCategory', '')) THEN
    RAISE EXCEPTION 'Primary business category must be selected from the business categories';
  END IF;
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

CREATE OR REPLACE FUNCTION public.accept_outlet_invitation(invitation_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth
AS $$
DECLARE v_uid uuid := auth.uid(); v_email text; v_inv public.outlet_invitations%rowtype;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT lower(email) INTO v_email FROM auth.users WHERE id = v_uid;
  SELECT * INTO v_inv FROM public.outlet_invitations
    WHERE token_hash = encode(extensions.digest(invitation_token, 'sha256'), 'hex') FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invalid invitation'; END IF;
  IF v_inv.accepted_at IS NOT NULL THEN RAISE EXCEPTION 'Invitation already accepted'; END IF;
  IF v_inv.expires_at <= now() THEN RAISE EXCEPTION 'Invitation expired'; END IF;
  IF lower(v_inv.email) <> v_email THEN RAISE EXCEPTION 'Invitation email does not match signed-in account'; END IF;
  IF EXISTS (SELECT 1 FROM public.users WHERE uid = v_uid::text AND outlet_id IS NOT NULL) THEN RAISE EXCEPTION 'Account already belongs to a workspace'; END IF;
  INSERT INTO public.users(uid,email,outlet_id,role,display_name,created_at)
  VALUES(v_uid::text,v_email,v_inv.outlet_id,v_inv.role,coalesce(auth.jwt()->'user_metadata'->>'full_name',split_part(v_email,'@',1)),now())
  ON CONFLICT(uid) DO UPDATE SET email=excluded.email,outlet_id=excluded.outlet_id,role=excluded.role,display_name=excluded.display_name;
  UPDATE public.outlet_invitations SET accepted_at=now(),accepted_by=v_uid WHERE id=v_inv.id;
  RETURN jsonb_build_object('outlet_id',v_inv.outlet_id,'role',v_inv.role);
END;
$$;

CREATE OR REPLACE FUNCTION public.create_outlet_invitation(invitee_email text, invitation_role text DEFAULT 'cashier', valid_hours integer DEFAULT 168)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
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

REVOKE ALL ON FUNCTION public.slugify_booking_name(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.complete_merchant_onboarding(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.accept_outlet_invitation(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_outlet_invitation(text,text,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_merchant_onboarding(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_outlet_invitation(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_outlet_invitation(text,text,integer) TO authenticated;
