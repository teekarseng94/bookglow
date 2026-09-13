-- Step 1: authoritative superadmin access, audit, billing metadata, and account controls.

CREATE TABLE IF NOT EXISTS public.platform_account_controls (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  reason text,
  changed_by uuid REFERENCES auth.users(id),
  changed_at timestamptz NOT NULL DEFAULT now(),
  sessions_blocked_at timestamptz
);
ALTER TABLE public.platform_account_controls ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.platform_account_controls FROM anon, authenticated;
GRANT ALL ON public.platform_account_controls TO service_role;
CREATE POLICY "platform_admin_read_account_controls" ON public.platform_account_controls FOR SELECT TO authenticated USING (public.is_platform_admin());
GRANT SELECT ON public.platform_account_controls TO authenticated;

ALTER TABLE public.platform_audit_events
  ADD COLUMN IF NOT EXISTS outcome text NOT NULL DEFAULT 'succeeded'
    CHECK (outcome IN ('succeeded', 'failed', 'partial')),
  ADD COLUMN IF NOT EXISTS operation_id uuid;
CREATE INDEX IF NOT EXISTS idx_platform_audit_filters
  ON public.platform_audit_events(action, actor_uid, outlet_id, occurred_at DESC);

CREATE TABLE IF NOT EXISTS public.platform_admin_operations (
  id uuid PRIMARY KEY,
  action text NOT NULL,
  target_id text NOT NULL,
  outlet_id text,
  actor_uid uuid NOT NULL REFERENCES auth.users(id),
  state text NOT NULL CHECK (state IN ('started','succeeded','failed','partial')),
  result jsonb NOT NULL DEFAULT '{}'::jsonb,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
ALTER TABLE public.platform_admin_operations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "platform_admin_read_operations" ON public.platform_admin_operations FOR SELECT TO authenticated USING (public.is_platform_admin());
CREATE POLICY "service_role_manage_operations" ON public.platform_admin_operations FOR ALL TO service_role USING (true) WITH CHECK (true);
GRANT SELECT ON public.platform_admin_operations TO authenticated;
GRANT ALL ON public.platform_admin_operations TO service_role;

ALTER TABLE public.outlet_subscriptions
  ADD COLUMN IF NOT EXISTS unit_amount bigint,
  ADD COLUMN IF NOT EXISTS currency text,
  ADD COLUMN IF NOT EXISTS recurring_interval text,
  ADD COLUMN IF NOT EXISTS interval_count integer,
  ADD COLUMN IF NOT EXISTS quantity integer,
  ADD COLUMN IF NOT EXISTS discount_percent numeric,
  ADD COLUMN IF NOT EXISTS mrr_reliable boolean;

CREATE OR REPLACE FUNCTION public.is_current_account_enabled()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.platform_account_controls c
    WHERE c.user_id = auth.uid() AND c.status = 'suspended'
  )
$$;
REVOKE ALL ON FUNCTION public.is_current_account_enabled() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_current_account_enabled() TO authenticated;

CREATE OR REPLACE FUNCTION public.is_outlet_member(p_outlet_id text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT public.is_current_account_enabled() AND EXISTS(
    SELECT 1 FROM public.outlet_members WHERE outlet_id=p_outlet_id AND user_id=auth.uid() AND status='active'
  )
$$;
CREATE OR REPLACE FUNCTION public.has_outlet_role(p_outlet_id text,p_roles text[]) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT public.is_current_account_enabled() AND EXISTS(
    SELECT 1 FROM public.outlet_members WHERE outlet_id=p_outlet_id AND user_id=auth.uid() AND status='active' AND role=ANY(p_roles)
  )
$$;

-- Service-role Edge Functions use this explicit-user helper. Keep the global
-- account block in the authorization decision even when auth.uid() is absent.
CREATE OR REPLACE FUNCTION public.can_manage_outlet_integrations(p_outlet_id text, p_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
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
REVOKE ALL ON FUNCTION public.can_manage_outlet_integrations(text,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_manage_outlet_integrations(text,uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.resolve_merchant_access() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE m record; a boolean;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  PERFORM public.ensure_identity_profiles();
  IF NOT public.is_current_account_enabled() THEN
    RETURN jsonb_build_object('state','membership_suspended','outlet_id',null,'role',null,'scope','global_account');
  END IF;
  a:=public.is_platform_admin();
  IF a THEN RETURN jsonb_build_object('state','platform_admin','outlet_id',null,'role',null); END IF;
  SELECT om.outlet_id,om.role,om.status membership_status,o.access_status,o.onboarding_status INTO m
  FROM public.outlet_members om JOIN public.outlets o ON o.outlet_id=om.outlet_id
  WHERE om.user_id=auth.uid() ORDER BY om.created_at LIMIT 1;
  IF NOT FOUND THEN RETURN jsonb_build_object('state','no_workspace','outlet_id',null,'role',null); END IF;
  RETURN jsonb_build_object(
    'state',CASE WHEN m.membership_status<>'active' THEN 'membership_suspended'
                 WHEN m.access_status<>'active' THEN 'outlet_suspended'
                 WHEN m.onboarding_status<>'complete' THEN 'onboarding' ELSE 'active' END,
    'outlet_id',m.outlet_id,'role',m.role,'onboarding_status',m.onboarding_status,'access_status',m.access_status
  );
END $$;

CREATE OR REPLACE FUNCTION public.platform_set_outlet_access(
  p_outlet_id text, p_enabled boolean, p_reason text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
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

CREATE OR REPLACE FUNCTION public.platform_transfer_outlet_ownership(
  p_outlet_id text, p_current_owner uuid, p_new_owner uuid, p_reason text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
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

CREATE OR REPLACE FUNCTION public.platform_manage_outlet_member(
  p_outlet_id text, p_user_id uuid, p_action text, p_role text DEFAULT NULL, p_reason text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
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

CREATE OR REPLACE FUNCTION public.platform_remote_access(p_outlet_id text, p_action text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
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

REVOKE ALL ON FUNCTION public.platform_set_outlet_access(text,boolean,text), public.platform_transfer_outlet_ownership(text,uuid,uuid,text), public.platform_manage_outlet_member(text,uuid,text,text,text), public.platform_remote_access(text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.platform_set_outlet_access(text,boolean,text), public.platform_transfer_outlet_ownership(text,uuid,uuid,text), public.platform_manage_outlet_member(text,uuid,text,text,text), public.platform_remote_access(text,text) TO authenticated;

-- Existing sessions for globally suspended accounts must fail data access immediately.
DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT schemaname,tablename,policyname,cmd,qual,with_check FROM pg_policies
           WHERE schemaname='public' AND roles @> ARRAY['authenticated']::name[]
             AND tablename NOT IN ('platform_account_controls')
  LOOP
    IF r.cmd IN ('SELECT','DELETE') AND position('is_current_account_enabled' in coalesce(r.qual,''))=0 THEN
      EXECUTE format('ALTER POLICY %I ON %I.%I USING ((%s) AND public.is_current_account_enabled())',r.policyname,r.schemaname,r.tablename,coalesce(r.qual,'true'));
    ELSIF r.cmd IN ('UPDATE','ALL') AND position('is_current_account_enabled' in coalesce(r.qual,'')||coalesce(r.with_check,''))=0 THEN
      EXECUTE format('ALTER POLICY %I ON %I.%I USING ((%s) AND public.is_current_account_enabled()) WITH CHECK ((%s) AND public.is_current_account_enabled())',r.policyname,r.schemaname,r.tablename,coalesce(r.qual,'true'),coalesce(r.with_check,r.qual,'true'));
    ELSIF r.cmd='INSERT' AND position('is_current_account_enabled' in coalesce(r.with_check,''))=0 THEN
      EXECUTE format('ALTER POLICY %I ON %I.%I WITH CHECK ((%s) AND public.is_current_account_enabled())',r.policyname,r.schemaname,r.tablename,coalesce(r.with_check,'true'));
    END IF;
  END LOOP;
END $$;
