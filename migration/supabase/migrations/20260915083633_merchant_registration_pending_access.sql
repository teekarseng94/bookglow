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
REVOKE ALL ON FUNCTION public.resolve_merchant_access() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resolve_merchant_access() TO authenticated;