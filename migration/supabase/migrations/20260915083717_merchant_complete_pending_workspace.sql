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
GRANT EXECUTE ON FUNCTION public.create_merchant_workspace(uuid, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_merchant_workspace() TO authenticated;