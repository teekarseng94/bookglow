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