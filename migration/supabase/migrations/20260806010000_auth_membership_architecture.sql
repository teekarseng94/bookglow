-- Bookglow identity/access architecture. Additive compatibility migration.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text, full_name text, phone text, avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.customer_profiles (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.outlets ADD COLUMN IF NOT EXISTS owner_user_id uuid REFERENCES auth.users(id);
ALTER TABLE public.outlets ADD COLUMN IF NOT EXISTS business_type text;
ALTER TABLE public.outlets ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';
ALTER TABLE public.outlets ADD COLUMN IF NOT EXISTS onboarding_status text NOT NULL DEFAULT 'incomplete';
ALTER TABLE public.outlets ADD COLUMN IF NOT EXISTS access_status text NOT NULL DEFAULT 'active';
ALTER TABLE public.outlets ADD COLUMN IF NOT EXISTS account_limit integer NOT NULL DEFAULT 3 CHECK (account_limit >= 1);

CREATE TABLE IF NOT EXISTS public.outlet_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), outlet_id text NOT NULL REFERENCES public.outlets(outlet_id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner','admin','manager','cashier')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','removed')),
  invited_by uuid REFERENCES auth.users(id), joined_at timestamptz DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(outlet_id,user_id)
);
ALTER TABLE public.outlet_invitations ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending';
ALTER TABLE public.outlet_invitations ADD COLUMN IF NOT EXISTS invited_by uuid REFERENCES auth.users(id);
ALTER TABLE public.outlet_invitations ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
CREATE UNIQUE INDEX IF NOT EXISTS outlet_invitations_pending_unique ON public.outlet_invitations(outlet_id,lower(email)) WHERE status='pending';

CREATE TABLE IF NOT EXISTS public.onboarding_states (
  outlet_id text PRIMARY KEY REFERENCES public.outlets(outlet_id) ON DELETE CASCADE,
  current_step text NOT NULL DEFAULT 'business', completed_steps jsonb NOT NULL DEFAULT '[]',
  first_service_created boolean NOT NULL DEFAULT false, team_configured boolean NOT NULL DEFAULT false,
  operations_configured boolean NOT NULL DEFAULT false, booking_published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.merchant_provision_requests (
  request_id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES auth.users(id), status text NOT NULL DEFAULT 'pending',
  outlet_id text REFERENCES public.outlets(outlet_id), error_code text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.platform_admins (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active', created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), outlet_id text REFERENCES public.outlets(outlet_id),
  actor_user_id uuid REFERENCES auth.users(id), action text NOT NULL, target_type text NOT NULL,
  target_id text, reason text, metadata jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY; ALTER TABLE public.customer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outlet_members ENABLE ROW LEVEL SECURITY; ALTER TABLE public.onboarding_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchant_provision_requests ENABLE ROW LEVEL SECURITY; ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_platform_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT EXISTS(SELECT 1 FROM public.platform_admins WHERE user_id=auth.uid() AND status='active') $$;
CREATE OR REPLACE FUNCTION public.is_outlet_member(p_outlet_id text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT EXISTS(SELECT 1 FROM public.outlet_members WHERE outlet_id=p_outlet_id AND user_id=auth.uid() AND status='active') $$;
CREATE OR REPLACE FUNCTION public.has_outlet_role(p_outlet_id text,p_roles text[]) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT EXISTS(SELECT 1 FROM public.outlet_members WHERE outlet_id=p_outlet_id AND user_id=auth.uid() AND status='active' AND role=ANY(p_roles)) $$;
CREATE OR REPLACE FUNCTION public.can_manage_outlet_accounts(p_outlet_id text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT public.has_outlet_role(p_outlet_id,ARRAY['owner','admin']) $$;
CREATE OR REPLACE FUNCTION public.is_portal_platform_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT public.is_platform_admin() $$;
REVOKE ALL ON FUNCTION public.is_platform_admin() FROM PUBLIC; GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_outlet_member(text), public.has_outlet_role(text,text[]), public.can_manage_outlet_accounts(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.ensure_identity_profiles() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,auth AS $$
DECLARE u auth.users%rowtype;
BEGIN SELECT * INTO u FROM auth.users WHERE id=auth.uid(); IF NOT FOUND THEN RAISE EXCEPTION 'Authentication required'; END IF;
 INSERT INTO public.profiles(id,email,full_name,phone,avatar_url) VALUES(u.id,u.email,u.raw_user_meta_data->>'full_name',u.raw_user_meta_data->>'phone',u.raw_user_meta_data->>'avatar_url')
 ON CONFLICT(id) DO UPDATE SET email=excluded.email,updated_at=now();
 RETURN jsonb_build_object('user_id',u.id); END $$;

CREATE OR REPLACE FUNCTION public.ensure_customer_profile() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_uid uuid:=auth.uid(); BEGIN IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
 PERFORM public.ensure_identity_profiles(); INSERT INTO public.customer_profiles(user_id) VALUES(v_uid) ON CONFLICT(user_id) DO UPDATE SET updated_at=now();
 RETURN jsonb_build_object('user_id',v_uid); END $$;

CREATE OR REPLACE FUNCTION public.create_merchant_workspace(p_request_id uuid,p_business_name text,p_business_type text,p_phone text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,auth AS $$
DECLARE v_uid uuid:=auth.uid(); v_req public.merchant_provision_requests%rowtype; v_outlet text; v_email text;
BEGIN IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
 IF length(trim(coalesce(p_business_name,'')))<2 THEN RAISE EXCEPTION 'Business name is required'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(v_uid::text,0));
 SELECT * INTO v_req FROM public.merchant_provision_requests WHERE request_id=p_request_id FOR UPDATE;
 IF FOUND THEN IF v_req.user_id<>v_uid THEN RAISE EXCEPTION 'Provision request belongs to another user'; END IF;
   IF v_req.status='succeeded' THEN RETURN (SELECT jsonb_build_object('outlet_id',o.outlet_id,'booking_slug',o.booking_slug,'idempotent',true,'role','owner','onboarding_status',o.onboarding_status,'current_step',s.current_step,'access_status',o.access_status) FROM public.outlets o LEFT JOIN public.onboarding_states s ON s.outlet_id=o.outlet_id WHERE o.outlet_id=v_req.outlet_id); END IF;
 ELSE INSERT INTO public.merchant_provision_requests(request_id,user_id) VALUES(p_request_id,v_uid); END IF;
 IF EXISTS(SELECT 1 FROM public.outlet_members WHERE user_id=v_uid AND role='owner' AND status='active') THEN RAISE EXCEPTION 'An owner workspace already exists'; END IF;
 SELECT email INTO v_email FROM auth.users WHERE id=v_uid; PERFORM public.ensure_identity_profiles();
 v_outlet:='outlet_'||replace(gen_random_uuid()::text,'-','');
 INSERT INTO public.outlets(outlet_id,name,email,phone,business_type,owner_user_id,booking_slug,is_active,status,onboarding_status,access_status,account_limit,settings)
 VALUES(v_outlet,trim(p_business_name),v_email,p_phone,p_business_type,v_uid,public.slugify_booking_name(p_business_name)||'-'||substr(v_outlet,-6),true,'active','incomplete','active',3,'{}');
 INSERT INTO public.outlet_members(outlet_id,user_id,role,status) VALUES(v_outlet,v_uid,'owner','active');
 INSERT INTO public.onboarding_states(outlet_id) VALUES(v_outlet);
 INSERT INTO public.users(uid,email,outlet_id,role,display_name) VALUES(v_uid::text,v_email,v_outlet,'admin',coalesce((SELECT full_name FROM public.profiles WHERE id=v_uid),split_part(v_email,'@',1))) ON CONFLICT(uid) DO UPDATE SET outlet_id=excluded.outlet_id,role='admin';
 INSERT INTO public.audit_logs(outlet_id,actor_user_id,action,target_type,target_id) VALUES(v_outlet,v_uid,'merchant.workspace_created','outlet',v_outlet);
 UPDATE public.merchant_provision_requests SET status='succeeded',outlet_id=v_outlet,updated_at=now() WHERE request_id=p_request_id;
 RETURN jsonb_build_object('outlet_id',v_outlet,'booking_slug',public.slugify_booking_name(p_business_name)||'-'||substr(v_outlet,-6),'idempotent',false,'role','owner','onboarding_status','incomplete','current_step','business','access_status','active');
END $$;

CREATE OR REPLACE FUNCTION public.resolve_merchant_access() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE m record; a boolean;
BEGIN IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF; PERFORM public.ensure_identity_profiles();
 a:=public.is_platform_admin(); IF a THEN RETURN jsonb_build_object('state','platform_admin','outlet_id',null,'role',null); END IF;
 SELECT om.outlet_id,om.role,om.status membership_status,o.access_status,o.onboarding_status INTO m FROM public.outlet_members om JOIN public.outlets o ON o.outlet_id=om.outlet_id WHERE om.user_id=auth.uid() ORDER BY om.created_at LIMIT 1;
 IF NOT FOUND THEN RETURN jsonb_build_object('state','no_workspace','outlet_id',null,'role',null); END IF;
 RETURN jsonb_build_object('state',CASE WHEN m.membership_status<>'active' THEN 'membership_suspended' WHEN m.access_status<>'active' THEN 'outlet_suspended' WHEN m.onboarding_status<>'complete' THEN 'onboarding' ELSE 'active' END,'outlet_id',m.outlet_id,'role',m.role,'onboarding_status',m.onboarding_status,'access_status',m.access_status);
END $$;

CREATE OR REPLACE FUNCTION public.change_outlet_member_role(p_member_id uuid,p_role text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE m public.outlet_members%rowtype; BEGIN SELECT * INTO m FROM public.outlet_members WHERE id=p_member_id FOR UPDATE;
 IF p_role NOT IN ('admin','manager','cashier') OR NOT public.can_manage_outlet_accounts(m.outlet_id) OR m.role='owner' OR m.user_id=auth.uid() THEN RAISE EXCEPTION 'Role change not permitted'; END IF;
 UPDATE public.outlet_members SET role=p_role,updated_at=now() WHERE id=p_member_id; INSERT INTO public.audit_logs(outlet_id,actor_user_id,action,target_type,target_id,metadata) VALUES(m.outlet_id,auth.uid(),'member.role_changed','outlet_member',p_member_id::text,jsonb_build_object('role',p_role)); END $$;
CREATE OR REPLACE FUNCTION public.set_outlet_member_status(p_member_id uuid,p_status text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE m public.outlet_members%rowtype; BEGIN SELECT * INTO m FROM public.outlet_members WHERE id=p_member_id FOR UPDATE;
 IF p_status NOT IN ('active','suspended','removed') OR NOT public.can_manage_outlet_accounts(m.outlet_id) OR m.role='owner' OR m.user_id=auth.uid() THEN RAISE EXCEPTION 'Status change not permitted'; END IF;
 UPDATE public.outlet_members SET status=p_status,updated_at=now() WHERE id=p_member_id; INSERT INTO public.audit_logs(outlet_id,actor_user_id,action,target_type,target_id,metadata) VALUES(m.outlet_id,auth.uid(),'member.status_changed','outlet_member',p_member_id::text,jsonb_build_object('status',p_status)); END $$;

CREATE OR REPLACE FUNCTION public.accept_outlet_invitation(invitation_token text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,auth AS $$
DECLARE v_uid uuid:=auth.uid(); v_email text; inv public.outlet_invitations%rowtype; v_limit int; v_count int;
BEGIN IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF; SELECT lower(email) INTO v_email FROM auth.users WHERE id=v_uid;
 SELECT * INTO inv FROM public.outlet_invitations WHERE token_hash=encode(extensions.digest(invitation_token,'sha256'),'hex') FOR UPDATE;
 IF NOT FOUND OR inv.status<>'pending' OR inv.accepted_at IS NOT NULL THEN RAISE EXCEPTION 'Invitation is invalid or already accepted'; END IF;
 IF inv.expires_at<=now() THEN UPDATE public.outlet_invitations SET status='expired',updated_at=now() WHERE id=inv.id; RAISE EXCEPTION 'Invitation expired'; END IF;
 IF lower(inv.email)<>v_email THEN RAISE EXCEPTION 'Invitation email does not match signed-in account'; END IF;
 SELECT account_limit INTO v_limit FROM public.outlets WHERE outlet_id=inv.outlet_id AND access_status='active' AND status='active' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Outlet is unavailable'; END IF; SELECT count(*) INTO v_count FROM public.outlet_members WHERE outlet_id=inv.outlet_id AND status='active';
 IF v_count>=v_limit THEN RAISE EXCEPTION 'Outlet account limit reached'; END IF; PERFORM public.ensure_identity_profiles();
 INSERT INTO public.outlet_members(outlet_id,user_id,role,status,invited_by) VALUES(inv.outlet_id,v_uid,inv.role,'active',inv.invited_by) ON CONFLICT(outlet_id,user_id) DO NOTHING;
 UPDATE public.outlet_invitations SET status='accepted',accepted_at=now(),accepted_by=v_uid,updated_at=now() WHERE id=inv.id;
 INSERT INTO public.audit_logs(outlet_id,actor_user_id,action,target_type,target_id,metadata) VALUES(inv.outlet_id,v_uid,'member.invitation_accepted','outlet_member',v_uid::text,jsonb_build_object('role',inv.role));
 RETURN jsonb_build_object('outlet_id',inv.outlet_id,'role',inv.role); END $$;

CREATE OR REPLACE FUNCTION public.transfer_outlet_ownership(p_outlet_id text,p_new_owner uuid,p_confirmation text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE old_owner uuid:=auth.uid(); BEGIN IF p_confirmation<>'TRANSFER' OR NOT public.has_outlet_role(p_outlet_id,ARRAY['owner']) OR p_new_owner=old_owner THEN RAISE EXCEPTION 'Ownership transfer not permitted'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.outlet_members WHERE outlet_id=p_outlet_id AND user_id=p_new_owner AND status='active') THEN RAISE EXCEPTION 'New owner must be an active member'; END IF;
 UPDATE public.outlet_members SET role='admin',updated_at=now() WHERE outlet_id=p_outlet_id AND user_id=old_owner AND role='owner'; UPDATE public.outlet_members SET role='owner',updated_at=now() WHERE outlet_id=p_outlet_id AND user_id=p_new_owner;
 UPDATE public.outlets SET owner_user_id=p_new_owner,updated_at=now() WHERE outlet_id=p_outlet_id; INSERT INTO public.audit_logs(outlet_id,actor_user_id,action,target_type,target_id,metadata) VALUES(p_outlet_id,old_owner,'outlet.ownership_transferred','outlet',p_outlet_id,jsonb_build_object('new_owner',p_new_owner)); END $$;

DROP POLICY IF EXISTS profiles_own ON public.profiles; CREATE POLICY profiles_own ON public.profiles FOR ALL TO authenticated USING(id=auth.uid()) WITH CHECK(id=auth.uid());
DROP POLICY IF EXISTS customer_profiles_own ON public.customer_profiles; CREATE POLICY customer_profiles_own ON public.customer_profiles FOR ALL TO authenticated USING(user_id=auth.uid()) WITH CHECK(user_id=auth.uid());
DROP POLICY IF EXISTS outlet_members_read ON public.outlet_members; CREATE POLICY outlet_members_read ON public.outlet_members FOR SELECT TO authenticated USING(public.is_outlet_member(outlet_id) OR public.is_platform_admin());
DROP POLICY IF EXISTS outlet_invitations_admin_read ON public.outlet_invitations; CREATE POLICY outlet_invitations_admin_read ON public.outlet_invitations FOR SELECT TO authenticated USING(public.can_manage_outlet_accounts(outlet_id) OR public.is_platform_admin());
DROP POLICY IF EXISTS platform_admin_self ON public.platform_admins; CREATE POLICY platform_admin_self ON public.platform_admins FOR SELECT TO authenticated USING(user_id=auth.uid());
DROP POLICY IF EXISTS audit_logs_read ON public.audit_logs; CREATE POLICY audit_logs_read ON public.audit_logs FOR SELECT TO authenticated USING(public.can_manage_outlet_accounts(outlet_id) OR public.is_platform_admin());
DROP POLICY IF EXISTS onboarding_states_access ON public.onboarding_states; CREATE POLICY onboarding_states_access ON public.onboarding_states FOR SELECT TO authenticated USING(public.is_outlet_member(outlet_id));
DROP POLICY IF EXISTS onboarding_states_manage ON public.onboarding_states; CREATE POLICY onboarding_states_manage ON public.onboarding_states FOR UPDATE TO authenticated USING(public.has_outlet_role(outlet_id,ARRAY['owner','admin'])) WITH CHECK(public.has_outlet_role(outlet_id,ARRAY['owner','admin']));
DROP POLICY IF EXISTS "outlets_merchant_select_all" ON public.outlets; DROP POLICY IF EXISTS "outlets_member_select" ON public.outlets; CREATE POLICY "outlets_member_select" ON public.outlets FOR SELECT TO authenticated USING(public.is_outlet_member(outlet_id) OR public.is_platform_admin());
GRANT SELECT,INSERT,UPDATE ON public.profiles,public.customer_profiles TO authenticated; GRANT SELECT ON public.outlet_members,public.platform_admins,public.audit_logs,public.onboarding_states TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_identity_profiles(),public.ensure_customer_profile(),public.create_merchant_workspace(uuid,text,text,text),public.resolve_merchant_access(),public.change_outlet_member_role(uuid,text),public.set_outlet_member_status(uuid,text),public.accept_outlet_invitation(text),public.transfer_outlet_ownership(text,uuid,text) TO authenticated;

-- Backfill current single-outlet identities without deleting the compatibility users table.
INSERT INTO public.outlet_members(outlet_id,user_id,role,status)
SELECT u.outlet_id,au.id,CASE WHEN lower(u.role)='admin' THEN 'owner' WHEN lower(u.role)='manager' THEN 'manager' ELSE 'cashier' END,'active'
FROM public.users u JOIN auth.users au ON au.id::text=u.uid WHERE u.outlet_id IS NOT NULL
ON CONFLICT(outlet_id,user_id) DO NOTHING;
