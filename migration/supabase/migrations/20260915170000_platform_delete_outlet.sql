-- Superadmin may permanently delete an outlet so the merchant email can start over.
-- Append-only audit/support/billing event rows are detached, not erased.

ALTER TABLE public.platform_support_cases
  ALTER COLUMN outlet_id DROP NOT NULL;
ALTER TABLE public.platform_support_cases
  DROP CONSTRAINT IF EXISTS platform_support_cases_outlet_id_fkey;
ALTER TABLE public.platform_support_cases
  ADD CONSTRAINT platform_support_cases_outlet_id_fkey
  FOREIGN KEY (outlet_id) REFERENCES public.outlets(outlet_id) ON DELETE SET NULL;

ALTER TABLE public.platform_support_case_references
  ALTER COLUMN outlet_id DROP NOT NULL;
ALTER TABLE public.platform_support_case_references
  DROP CONSTRAINT IF EXISTS platform_support_case_references_outlet_id_fkey;
ALTER TABLE public.platform_support_case_references
  ADD CONSTRAINT platform_support_case_references_outlet_id_fkey
  FOREIGN KEY (outlet_id) REFERENCES public.outlets(outlet_id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.platform_delete_outlet(
  p_outlet_id text,
  p_reason text,
  p_confirm_name text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

REVOKE ALL ON FUNCTION public.platform_delete_outlet(text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.platform_delete_outlet(text, text, text) TO authenticated;
