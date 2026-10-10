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
REVOKE ALL ON FUNCTION public.abandon_pending_merchant_workspace() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.abandon_pending_merchant_workspace() TO authenticated;