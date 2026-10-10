-- Step 2 schema: appointment lifecycle, support tables, and support mutation RPCs.

ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;

CREATE OR REPLACE FUNCTION public.track_appointment_lifecycle()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF lower(coalesce(NEW.status,''))='cancelled' AND NEW.cancelled_at IS NULL THEN NEW.cancelled_at:=now(); END IF;
    IF lower(coalesce(NEW.status,''))='completed' AND NEW.completed_at IS NULL THEN NEW.completed_at:=now(); END IF;
  END IF;
  NEW.updated_at:=now();
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS appointments_track_lifecycle ON public.appointments;
CREATE TRIGGER appointments_track_lifecycle BEFORE UPDATE ON public.appointments
FOR EACH ROW EXECUTE FUNCTION public.track_appointment_lifecycle();
CREATE INDEX IF NOT EXISTS idx_appointments_outlet_created_at ON public.appointments(outlet_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_appointments_outlet_completed_at ON public.appointments(outlet_id,completed_at DESC) WHERE completed_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_appointments_outlet_cancelled_at ON public.appointments(outlet_id,cancelled_at DESC) WHERE cancelled_at IS NOT NULL;

ALTER TABLE public.platform_admin_operations ADD COLUMN IF NOT EXISTS attempt_count integer NOT NULL DEFAULT 1 CHECK(attempt_count>=1);
CREATE INDEX IF NOT EXISTS idx_platform_operations_filters ON public.platform_admin_operations(state,outlet_id,started_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_monitoring_outlet_time ON public.platform_monitoring_events(outlet_id,occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketing_deliveries_outlet_status_time ON public.marketing_campaign_deliveries(outlet_id,status,updated_at DESC);

CREATE OR REPLACE FUNCTION public.platform_sanitize_error(p_value text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path=public AS $$
  SELECT left(
    regexp_replace(
      regexp_replace(
        regexp_replace(coalesce(p_value,''),'(?i)bearer[[:space:]]+[a-z0-9._~+/-]+=*','Bearer [REDACTED]','g'),
        '(?i)(access_token|refresh_token|client_secret|authorization)([[:space:]]*[:=][[:space:]]*)[^,[:space:]}]+','\1\2[REDACTED]','g'),
      '(sk|pk|whsec)_[A-Za-z0-9_-]+','[REDACTED_KEY]','g'),
    500)
$$;
REVOKE ALL ON FUNCTION public.platform_sanitize_error(text) FROM PUBLIC;

CREATE TABLE IF NOT EXISTS public.platform_support_cases(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id text NOT NULL REFERENCES public.outlets(outlet_id) ON DELETE RESTRICT,
  category text NOT NULL CHECK(category IN ('account','access','booking','sales','integration','operations','other')),
  priority text NOT NULL CHECK(priority IN ('low','normal','high','urgent')),
  subject text NOT NULL CHECK(char_length(subject) BETWEEN 3 AND 160),
  description text NOT NULL CHECK(char_length(description) BETWEEN 3 AND 5000),
  status text NOT NULL DEFAULT 'open' CHECK(status IN ('open','in_progress','waiting_on_merchant','resolved')),
  assigned_to uuid REFERENCES public.platform_admins(user_id) ON DELETE SET NULL,
  resolution_summary text,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.platform_support_case_references(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.platform_support_cases(id) ON DELETE RESTRICT,
  outlet_id text NOT NULL REFERENCES public.outlets(outlet_id) ON DELETE RESTRICT,
  entity_type text NOT NULL CHECK(entity_type IN ('booking','sale','integration','operation')),
  reference_id text NOT NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(case_id,entity_type,reference_id)
);
CREATE TABLE IF NOT EXISTS public.platform_support_case_events(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.platform_support_cases(id) ON DELETE RESTRICT,
  event_type text NOT NULL CHECK(event_type IN ('created','assignment_changed','status_changed','internal_note','resolved','reopened','reference_added')),
  actor_uid uuid NOT NULL REFERENCES auth.users(id),
  actor_email text,
  note text,
  before_value jsonb,
  after_value jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_support_cases_filters ON public.platform_support_cases(status,priority,updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_cases_outlet ON public.platform_support_cases(outlet_id,updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_cases_assignee ON public.platform_support_cases(assigned_to,status,updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_case_events_case ON public.platform_support_case_events(case_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_refs_case ON public.platform_support_case_references(case_id);

ALTER TABLE public.platform_support_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_support_case_references ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_support_case_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.platform_support_cases,public.platform_support_case_references,public.platform_support_case_events FROM anon,authenticated;
GRANT SELECT ON public.platform_support_cases,public.platform_support_case_references,public.platform_support_case_events TO authenticated;
GRANT ALL ON public.platform_support_cases,public.platform_support_case_references,public.platform_support_case_events TO service_role;
CREATE POLICY platform_admin_read_support_cases ON public.platform_support_cases FOR SELECT TO authenticated USING((select public.is_platform_admin()));
CREATE POLICY platform_admin_read_support_references ON public.platform_support_case_references FOR SELECT TO authenticated USING((select public.is_platform_admin()));
CREATE POLICY platform_admin_read_support_events ON public.platform_support_case_events FOR SELECT TO authenticated USING((select public.is_platform_admin()));
CREATE POLICY service_manage_support_cases ON public.platform_support_cases FOR ALL TO service_role USING(true) WITH CHECK(true);
CREATE POLICY service_manage_support_references ON public.platform_support_case_references FOR ALL TO service_role USING(true) WITH CHECK(true);
CREATE POLICY service_manage_support_events ON public.platform_support_case_events FOR ALL TO service_role USING(true) WITH CHECK(true);

CREATE OR REPLACE FUNCTION public.reject_support_history_change()
RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN RAISE EXCEPTION 'Support history is append-only'; END $$;
CREATE TRIGGER support_events_immutable BEFORE UPDATE OR DELETE ON public.platform_support_case_events FOR EACH ROW EXECUTE FUNCTION public.reject_support_history_change();
CREATE TRIGGER support_references_immutable BEFORE UPDATE OR DELETE ON public.platform_support_case_references FOR EACH ROW EXECUTE FUNCTION public.reject_support_history_change();

CREATE OR REPLACE FUNCTION public.platform_reference_belongs_to_outlet(p_outlet_id text,p_type text,p_reference_id text)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
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
REVOKE ALL ON FUNCTION public.platform_reference_belongs_to_outlet(text,text,text) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.platform_create_support_case(
  p_outlet_id text,p_category text,p_priority text,p_subject text,p_description text,
  p_assigned_to uuid DEFAULT NULL,p_references jsonb DEFAULT '[]'::jsonb
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
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

CREATE OR REPLACE FUNCTION public.platform_update_support_case(
  p_case_id uuid,p_action text,p_status text DEFAULT NULL,p_assigned_to uuid DEFAULT NULL,
  p_note text DEFAULT NULL,p_resolution_summary text DEFAULT NULL,p_expected_updated_at timestamptz DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
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

CREATE OR REPLACE FUNCTION public.platform_add_support_reference(p_case_id uuid,p_type text,p_reference_id text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
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