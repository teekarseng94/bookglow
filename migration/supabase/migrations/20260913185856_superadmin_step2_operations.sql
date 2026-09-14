-- Step 2: evidence-backed platform operations, onboarding readiness, support,
-- and integration/job monitoring. No commercial entitlement model is added.

-- ---------------------------------------------------------------------------
-- Appointment lifecycle evidence. Historical cancelled rows are deliberately
-- not backfilled because updated_at is not proof of cancellation time.
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- Merchant support. Direct writes are intentionally unavailable; mutations
-- pass through audited platform-admin RPCs. Event history is append-only.
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- Read models. Every function checks platform identity and returns bounded,
-- server-filtered JSON. Customer names/contact fields are never selected.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.platform_support_cases_page(
 p_search text DEFAULT NULL,p_status text DEFAULT NULL,p_priority text DEFAULT NULL,p_category text DEFAULT NULL,
 p_outlet_id text DEFAULT NULL,p_limit integer DEFAULT 25,p_offset integer DEFAULT 0
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE v_rows jsonb; v_total bigint;
BEGIN
 IF NOT public.is_platform_admin() THEN RAISE EXCEPTION 'Platform administrator access required'; END IF;
 SELECT count(*) INTO v_total FROM public.platform_support_cases c JOIN public.outlets o ON o.outlet_id=c.outlet_id WHERE
  (p_status IS NULL OR c.status=p_status) AND (p_priority IS NULL OR c.priority=p_priority) AND
  (p_category IS NULL OR c.category=p_category) AND (p_outlet_id IS NULL OR c.outlet_id=p_outlet_id) AND
  (nullif(trim(coalesce(p_search,'')),'') IS NULL OR c.subject ILIKE '%'||trim(p_search)||'%' OR c.id::text ILIKE '%'||trim(p_search)||'%' OR o.name ILIKE '%'||trim(p_search)||'%');
 SELECT coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) INTO v_rows FROM (
  SELECT c.id,c.outlet_id,o.name outlet_name,c.category,c.priority,c.subject,c.status,c.assigned_to,
   coalesce(p.full_name,p.email) assigned_name,c.resolution_summary,c.created_at,c.updated_at,c.resolved_at
  FROM public.platform_support_cases c JOIN public.outlets o ON o.outlet_id=c.outlet_id
  LEFT JOIN public.profiles p ON p.id=c.assigned_to WHERE
   (p_status IS NULL OR c.status=p_status) AND (p_priority IS NULL OR c.priority=p_priority) AND
   (p_category IS NULL OR c.category=p_category) AND (p_outlet_id IS NULL OR c.outlet_id=p_outlet_id) AND
   (nullif(trim(coalesce(p_search,'')),'') IS NULL OR c.subject ILIKE '%'||trim(p_search)||'%' OR c.id::text ILIKE '%'||trim(p_search)||'%' OR o.name ILIKE '%'||trim(p_search)||'%')
  ORDER BY CASE c.priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END,c.updated_at DESC,c.id
  LIMIT least(greatest(p_limit,1),100) OFFSET greatest(p_offset,0)
 ) x;
 RETURN jsonb_build_object('rows',v_rows,'total',v_total);
END $$;

CREATE OR REPLACE FUNCTION public.platform_support_case_detail(p_case_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE v_case jsonb; v_refs jsonb; v_events jsonb;
BEGIN
 IF NOT public.is_platform_admin() THEN RAISE EXCEPTION 'Platform administrator access required'; END IF;
 SELECT to_jsonb(x) INTO v_case FROM (SELECT c.*,o.name outlet_name,coalesce(p.full_name,p.email) assigned_name FROM public.platform_support_cases c JOIN public.outlets o ON o.outlet_id=c.outlet_id LEFT JOIN public.profiles p ON p.id=c.assigned_to WHERE c.id=p_case_id) x;
 IF v_case IS NULL THEN RAISE EXCEPTION 'Support case not found'; END IF;
 SELECT coalesce(jsonb_agg(to_jsonb(r) ORDER BY r.created_at),'[]'::jsonb) INTO v_refs FROM public.platform_support_case_references r WHERE r.case_id=p_case_id;
 SELECT coalesce(jsonb_agg(to_jsonb(e) ORDER BY e.created_at DESC),'[]'::jsonb) INTO v_events FROM public.platform_support_case_events e WHERE e.case_id=p_case_id;
 RETURN jsonb_build_object('case',v_case,'references',v_refs,'events',v_events);
END $$;

CREATE OR REPLACE FUNCTION public.platform_support_operators()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE v_rows jsonb; BEGIN
 IF NOT public.is_platform_admin() THEN RAISE EXCEPTION 'Platform administrator access required'; END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',pa.user_id,'name',coalesce(p.full_name,p.email,pa.user_id::text),'email',p.email) ORDER BY coalesce(p.full_name,p.email)),'[]'::jsonb)
 INTO v_rows FROM public.platform_admins pa LEFT JOIN public.profiles p ON p.id=pa.user_id WHERE pa.status='active'; RETURN v_rows;
END $$;

CREATE OR REPLACE FUNCTION public.platform_onboarding_page(
 p_stage text DEFAULT NULL,p_search text DEFAULT NULL,p_limit integer DEFAULT 25,p_offset integer DEFAULT 0
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE v_rows jsonb; v_total bigint;
BEGIN
 IF NOT public.is_platform_admin() THEN RAISE EXCEPTION 'Platform administrator access required'; END IF;
 WITH readiness AS (
  SELECT o.outlet_id,o.name,o.timezone,o.onboarding_status,o.access_status,o.updated_at,
   (o.owner_user_id IS NOT NULL OR EXISTS(SELECT 1 FROM public.outlet_members m WHERE m.outlet_id=o.outlet_id AND m.role='owner' AND m.status='active')) owner_assigned,
   (length(trim(coalesce(o.name,'')))>=2 AND coalesce(nullif(trim(o.email),''),nullif(trim(o.phone),''),nullif(trim(o.phone_number),'')) IS NOT NULL
    AND (coalesce(o.settings->>'serviceLocationType','')<>'physical' OR coalesce(nullif(trim(o.address_display),''),nullif(trim(o.address->>'addressDisplay'),'')) IS NOT NULL)) business_details,
    EXISTS(SELECT 1 FROM jsonb_each(CASE WHEN jsonb_typeof(o.business_hours)='object' THEN o.business_hours ELSE '{}'::jsonb END) h WHERE lower(coalesce(h.value->>'isOpen','true'))='true' AND h.value->>'open' IS NOT NULL AND h.value->>'close' IS NOT NULL AND h.value->>'open'<>h.value->>'close') operating_hours,
   EXISTS(SELECT 1 FROM public.services s WHERE s.outlet_id=o.outlet_id AND coalesce(s.is_visible,true) AND coalesce(s.duration,0)>0) bookable_services,
   EXISTS(SELECT 1 FROM public.staff st WHERE st.outlet_id=o.outlet_id) staff_configured,
   (nullif(trim(o.booking_slug),'') IS NOT NULL AND coalesce(o.is_active,true)) booking_path,
   EXISTS(SELECT 1 FROM public.appointments a WHERE a.outlet_id=o.outlet_id AND a.source='public-booking' AND a.client_id IS NOT NULL) first_real_booking
  FROM public.outlets o
 ), shaped AS (
  SELECT r.*,(owner_assigned AND business_details AND operating_hours AND bookable_services AND booking_path) configuration_ready,
   CASE WHEN owner_assigned AND business_details AND operating_hours AND bookable_services AND booking_path AND onboarding_status='complete' AND first_real_booking THEN 'activated'
        WHEN owner_assigned AND business_details AND operating_hours AND bookable_services AND booking_path THEN 'ready' ELSE 'pending' END stage,
   to_jsonb(array_remove(ARRAY[CASE WHEN NOT owner_assigned THEN 'Owner not assigned' END,CASE WHEN NOT business_details THEN 'Required business details missing' END,CASE WHEN NOT operating_hours THEN 'Operating hours not configured' END,CASE WHEN NOT bookable_services THEN 'No visible bookable service' END,CASE WHEN NOT booking_path THEN 'Public booking path unavailable' END,CASE WHEN NOT first_real_booking THEN 'No verified real customer booking' END],NULL)) missing_requirements
  FROM readiness r
 )
 SELECT count(*) INTO v_total FROM shaped s WHERE (p_stage IS NULL OR s.stage=p_stage) AND (nullif(trim(coalesce(p_search,'')),'') IS NULL OR s.name ILIKE '%'||trim(p_search)||'%' OR s.outlet_id ILIKE '%'||trim(p_search)||'%');
 WITH readiness AS (
  SELECT o.outlet_id,o.name,o.timezone,o.onboarding_status,o.access_status,o.updated_at,
   (o.owner_user_id IS NOT NULL OR EXISTS(SELECT 1 FROM public.outlet_members m WHERE m.outlet_id=o.outlet_id AND m.role='owner' AND m.status='active')) owner_assigned,
   (length(trim(coalesce(o.name,'')))>=2 AND coalesce(nullif(trim(o.email),''),nullif(trim(o.phone),''),nullif(trim(o.phone_number),'')) IS NOT NULL AND (coalesce(o.settings->>'serviceLocationType','')<>'physical' OR coalesce(nullif(trim(o.address_display),''),nullif(trim(o.address->>'addressDisplay'),'')) IS NOT NULL)) business_details,
    EXISTS(SELECT 1 FROM jsonb_each(CASE WHEN jsonb_typeof(o.business_hours)='object' THEN o.business_hours ELSE '{}'::jsonb END) h WHERE lower(coalesce(h.value->>'isOpen','true'))='true' AND h.value->>'open' IS NOT NULL AND h.value->>'close' IS NOT NULL AND h.value->>'open'<>h.value->>'close') operating_hours,
   EXISTS(SELECT 1 FROM public.services s WHERE s.outlet_id=o.outlet_id AND coalesce(s.is_visible,true) AND coalesce(s.duration,0)>0) bookable_services,
   EXISTS(SELECT 1 FROM public.staff st WHERE st.outlet_id=o.outlet_id) staff_configured,
   (nullif(trim(o.booking_slug),'') IS NOT NULL AND coalesce(o.is_active,true)) booking_path,
   EXISTS(SELECT 1 FROM public.appointments a WHERE a.outlet_id=o.outlet_id AND a.source='public-booking' AND a.client_id IS NOT NULL) first_real_booking
  FROM public.outlets o
 ), shaped AS (
  SELECT r.*,(owner_assigned AND business_details AND operating_hours AND bookable_services AND booking_path) configuration_ready,
   CASE WHEN owner_assigned AND business_details AND operating_hours AND bookable_services AND booking_path AND onboarding_status='complete' AND first_real_booking THEN 'activated' WHEN owner_assigned AND business_details AND operating_hours AND bookable_services AND booking_path THEN 'ready' ELSE 'pending' END stage,
   to_jsonb(array_remove(ARRAY[CASE WHEN NOT owner_assigned THEN 'Owner not assigned' END,CASE WHEN NOT business_details THEN 'Required business details missing' END,CASE WHEN NOT operating_hours THEN 'Operating hours not configured' END,CASE WHEN NOT bookable_services THEN 'No visible bookable service' END,CASE WHEN NOT booking_path THEN 'Public booking path unavailable' END,CASE WHEN NOT first_real_booking THEN 'No verified real customer booking' END],NULL)) missing_requirements
  FROM readiness r
 ) SELECT coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) INTO v_rows FROM (SELECT * FROM shaped s WHERE (p_stage IS NULL OR s.stage=p_stage) AND (nullif(trim(coalesce(p_search,'')),'') IS NULL OR s.name ILIKE '%'||trim(p_search)||'%' OR s.outlet_id ILIKE '%'||trim(p_search)||'%') ORDER BY CASE s.stage WHEN 'pending' THEN 0 WHEN 'ready' THEN 1 ELSE 2 END,s.updated_at DESC,s.outlet_id LIMIT least(greatest(p_limit,1),100) OFFSET greatest(p_offset,0)) x;
 RETURN jsonb_build_object('rows',v_rows,'total',v_total,'staff_requirement','not_required_by_current_booking_model');
END $$;

CREATE OR REPLACE FUNCTION public.platform_operations_overview(p_start_date date,p_end_date date,p_outlet_id text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE v_result jsonb;
BEGIN
 IF NOT public.is_platform_admin() THEN RAISE EXCEPTION 'Platform administrator access required'; END IF;
 IF p_start_date IS NULL OR p_end_date IS NULL OR p_end_date<p_start_date OR p_end_date-p_start_date>366 THEN RAISE EXCEPTION 'Choose a valid range of at most 367 days'; END IF;
 WITH outlet_bounds AS (
  SELECT o.*,CASE WHEN EXISTS(SELECT 1 FROM pg_timezone_names z WHERE z.name=o.timezone) THEN o.timezone ELSE 'UTC' END effective_timezone,
   p_start_date::timestamp AT TIME ZONE (CASE WHEN EXISTS(SELECT 1 FROM pg_timezone_names z WHERE z.name=o.timezone) THEN o.timezone ELSE 'UTC' END) utc_start,
   (p_end_date+1)::timestamp AT TIME ZONE (CASE WHEN EXISTS(SELECT 1 FROM pg_timezone_names z WHERE z.name=o.timezone) THEN o.timezone ELSE 'UTC' END) utc_end
  FROM public.outlets o WHERE p_outlet_id IS NULL OR o.outlet_id=p_outlet_id
 ), metrics AS (
  SELECT
   count(*) FILTER(WHERE status='active' AND access_status='active' AND onboarding_status='complete') active_outlets,
   (SELECT count(*) FROM public.appointments a JOIN outlet_bounds o ON o.outlet_id=a.outlet_id WHERE a.created_at>=o.utc_start AND a.created_at<o.utc_end) bookings_created,
   (SELECT count(*) FROM public.appointments a JOIN outlet_bounds o ON o.outlet_id=a.outlet_id WHERE a.date~'^\d{4}-\d{2}-\d{2}$' AND a.date::date BETWEEN p_start_date AND p_end_date) appointments_scheduled,
   (SELECT count(*) FROM public.appointments a JOIN outlet_bounds o ON o.outlet_id=a.outlet_id WHERE a.completed_at>=o.utc_start AND a.completed_at<o.utc_end) appointments_completed,
   (SELECT count(*) FROM public.appointments a JOIN outlet_bounds o ON o.outlet_id=a.outlet_id WHERE a.cancelled_at>=o.utc_start AND a.cancelled_at<o.utc_end) appointments_cancelled,
   (SELECT count(*) FROM public.platform_admin_operations op LEFT JOIN outlet_bounds o ON o.outlet_id=op.outlet_id WHERE (p_outlet_id IS NULL OR op.outlet_id=p_outlet_id) AND op.state IN ('failed','partial') AND op.started_at>=coalesce(o.utc_start,p_start_date::timestamp AT TIME ZONE 'UTC') AND op.started_at<coalesce(o.utc_end,(p_end_date+1)::timestamp AT TIME ZONE 'UTC')) failed_operations,
   (SELECT count(*) FROM public.marketing_campaign_deliveries d JOIN outlet_bounds o ON o.outlet_id=d.outlet_id WHERE d.status='failed' AND d.updated_at>=o.utc_start AND d.updated_at<o.utc_end) failed_messages,
   (SELECT count(*) FROM public.platform_support_cases c WHERE c.status<>'resolved' AND (p_outlet_id IS NULL OR c.outlet_id=p_outlet_id)) unresolved_support
  FROM outlet_bounds
 ), attention AS (
  SELECT * FROM (
   SELECT c.outlet_id,o.name outlet_name,'support' issue_type,CASE c.priority WHEN 'urgent' THEN 'critical' WHEN 'high' THEN 'error' ELSE 'warning' END severity,c.subject issue,c.updated_at occurred_at,'/admin/support?case='||c.id destination
   FROM public.platform_support_cases c JOIN outlet_bounds o ON o.outlet_id=c.outlet_id WHERE c.status<>'resolved'
   UNION ALL
   SELECT e.outlet_id,o.name,'monitoring',e.severity,public.platform_sanitize_error(e.message),e.occurred_at,'/admin/integrations-jobs?tab=jobs' FROM public.platform_monitoring_events e JOIN outlet_bounds o ON o.outlet_id=e.outlet_id WHERE e.severity IN ('error','critical')
   UNION ALL
    SELECT op.outlet_id,o.name,'operation',CASE WHEN op.state='failed' THEN 'error' ELSE 'warning' END,op.action||' '||op.state,coalesce(op.completed_at,op.started_at),'/admin/integrations-jobs?tab=jobs' FROM public.platform_admin_operations op JOIN outlet_bounds o ON o.outlet_id=op.outlet_id WHERE op.state IN ('failed','partial')
    UNION ALL
    SELECT o.outlet_id,o.name,'onboarding','warning','Onboarding requirements are incomplete',o.updated_at,'/admin/onboarding?stage=pending&outlet='||o.outlet_id
    FROM outlet_bounds o WHERE NOT (
     (o.owner_user_id IS NOT NULL OR EXISTS(SELECT 1 FROM public.outlet_members m WHERE m.outlet_id=o.outlet_id AND m.role='owner' AND m.status='active'))
     AND length(trim(coalesce(o.name,'')))>=2
     AND coalesce(nullif(trim(o.email),''),nullif(trim(o.phone),''),nullif(trim(o.phone_number),'')) IS NOT NULL
     AND (coalesce(o.settings->>'serviceLocationType','')<>'physical' OR coalesce(nullif(trim(o.address_display),''),nullif(trim(o.address->>'addressDisplay'),'')) IS NOT NULL)
     AND EXISTS(SELECT 1 FROM jsonb_each(CASE WHEN jsonb_typeof(o.business_hours)='object' THEN o.business_hours ELSE '{}'::jsonb END) h WHERE lower(coalesce(h.value->>'isOpen','true'))='true' AND h.value->>'open' IS NOT NULL AND h.value->>'close' IS NOT NULL AND h.value->>'open'<>h.value->>'close')
     AND EXISTS(SELECT 1 FROM public.services s WHERE s.outlet_id=o.outlet_id AND coalesce(s.is_visible,true) AND coalesce(s.duration,0)>0)
     AND nullif(trim(o.booking_slug),'') IS NOT NULL AND coalesce(o.is_active,true)
    )
  ) u ORDER BY occurred_at DESC LIMIT 25
 ), onboarding_attention AS (
  SELECT count(*) n FROM outlet_bounds o WHERE NOT (
   (o.owner_user_id IS NOT NULL OR EXISTS(SELECT 1 FROM public.outlet_members m WHERE m.outlet_id=o.outlet_id AND m.role='owner' AND m.status='active'))
    AND length(trim(coalesce(o.name,'')))>=2
    AND coalesce(nullif(trim(o.email),''),nullif(trim(o.phone),''),nullif(trim(o.phone_number),'')) IS NOT NULL
    AND (coalesce(o.settings->>'serviceLocationType','')<>'physical' OR coalesce(nullif(trim(o.address_display),''),nullif(trim(o.address->>'addressDisplay'),'')) IS NOT NULL)
    AND EXISTS(SELECT 1 FROM jsonb_each(CASE WHEN jsonb_typeof(o.business_hours)='object' THEN o.business_hours ELSE '{}'::jsonb END) h WHERE lower(coalesce(h.value->>'isOpen','true'))='true' AND h.value->>'open' IS NOT NULL AND h.value->>'close' IS NOT NULL AND h.value->>'open'<>h.value->>'close')
   AND EXISTS(SELECT 1 FROM public.services s WHERE s.outlet_id=o.outlet_id AND coalesce(s.is_visible,true) AND coalesce(s.duration,0)>0)
   AND nullif(trim(o.booking_slug),'') IS NOT NULL AND coalesce(o.is_active,true)
  )
 ) SELECT jsonb_build_object('metrics',to_jsonb(metrics),'onboarding_attention',(SELECT n FROM onboarding_attention),'attention',coalesce((SELECT jsonb_agg(to_jsonb(attention)) FROM attention),'[]'::jsonb),'refreshed_at',now(),'range_timezone_rule','Each outlet local calendar range; invalid/missing timezone falls back to UTC','active_outlet_definition','status active + portal access active + onboarding complete','cancellation_definition','cancelled_at only; historical rows without a cancellation timestamp are excluded') INTO v_result FROM metrics;
 RETURN v_result;
END $$;

CREATE OR REPLACE FUNCTION public.platform_activity_page(p_kind text,p_start_date date,p_end_date date,p_outlet_id text DEFAULT NULL,p_limit integer DEFAULT 25,p_offset integer DEFAULT 0)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE v_rows jsonb; v_total bigint;
BEGIN
  IF NOT public.is_platform_admin() THEN RAISE EXCEPTION 'Platform administrator access required'; END IF;
  IF p_start_date IS NULL OR p_end_date IS NULL OR p_end_date<p_start_date OR p_end_date-p_start_date>366 THEN RAISE EXCEPTION 'Choose a valid range of at most 367 days'; END IF;
  IF p_kind NOT IN ('bookings_created','appointments_scheduled','appointments_completed','appointments_cancelled','failed_operations','failed_messages','unresolved_support') THEN RAISE EXCEPTION 'Unsupported activity kind'; END IF;
 WITH bounds AS (SELECT o.outlet_id,o.name,CASE WHEN EXISTS(SELECT 1 FROM pg_timezone_names z WHERE z.name=o.timezone) THEN o.timezone ELSE 'UTC' END tz,p_start_date::timestamp AT TIME ZONE (CASE WHEN EXISTS(SELECT 1 FROM pg_timezone_names z WHERE z.name=o.timezone) THEN o.timezone ELSE 'UTC' END) utc_start,(p_end_date+1)::timestamp AT TIME ZONE (CASE WHEN EXISTS(SELECT 1 FROM pg_timezone_names z WHERE z.name=o.timezone) THEN o.timezone ELSE 'UTC' END) utc_end FROM public.outlets o WHERE p_outlet_id IS NULL OR o.outlet_id=p_outlet_id), activity AS (
  SELECT a.id,b.outlet_id,b.name outlet_name,a.status state,a.created_at occurred_at,a.date||' '||a.time scheduled_for,a.source,NULL::text detail FROM public.appointments a JOIN bounds b ON b.outlet_id=a.outlet_id WHERE p_kind='bookings_created' AND a.created_at>=b.utc_start AND a.created_at<b.utc_end
  UNION ALL SELECT a.id,b.outlet_id,b.name,a.status,a.created_at,a.date||' '||a.time,a.source,NULL FROM public.appointments a JOIN bounds b ON b.outlet_id=a.outlet_id WHERE p_kind='appointments_scheduled' AND a.date~'^\d{4}-\d{2}-\d{2}$' AND a.date::date BETWEEN p_start_date AND p_end_date
  UNION ALL SELECT a.id,b.outlet_id,b.name,a.status,a.completed_at,a.date||' '||a.time,a.source,NULL FROM public.appointments a JOIN bounds b ON b.outlet_id=a.outlet_id WHERE p_kind='appointments_completed' AND a.completed_at>=b.utc_start AND a.completed_at<b.utc_end
  UNION ALL SELECT a.id,b.outlet_id,b.name,a.status,a.cancelled_at,a.date||' '||a.time,a.source,NULL FROM public.appointments a JOIN bounds b ON b.outlet_id=a.outlet_id WHERE p_kind='appointments_cancelled' AND a.cancelled_at>=b.utc_start AND a.cancelled_at<b.utc_end
  UNION ALL SELECT op.id::text,coalesce(op.outlet_id,''),coalesce(b.name,'Platform'),op.state,coalesce(op.completed_at,op.started_at),NULL,op.action,public.platform_sanitize_error(op.result->>'error') FROM public.platform_admin_operations op LEFT JOIN bounds b ON b.outlet_id=op.outlet_id WHERE p_kind='failed_operations' AND op.state IN ('failed','partial') AND (p_outlet_id IS NULL OR op.outlet_id=p_outlet_id) AND op.started_at>=coalesce(b.utc_start,p_start_date::timestamp AT TIME ZONE 'UTC') AND op.started_at<coalesce(b.utc_end,(p_end_date+1)::timestamp AT TIME ZONE 'UTC')
  UNION ALL SELECT d.id,d.outlet_id,b.name,d.status,d.updated_at,NULL,d.channel,public.platform_sanitize_error(d.last_error) FROM public.marketing_campaign_deliveries d JOIN bounds b ON b.outlet_id=d.outlet_id WHERE p_kind='failed_messages' AND d.status='failed' AND d.updated_at>=b.utc_start AND d.updated_at<b.utc_end
  UNION ALL SELECT c.id::text,c.outlet_id,b.name,c.status,c.updated_at,NULL,c.category,c.subject FROM public.platform_support_cases c JOIN bounds b ON b.outlet_id=c.outlet_id WHERE p_kind='unresolved_support' AND c.status<>'resolved'
 ) SELECT count(*) INTO v_total FROM activity;
 WITH bounds AS (SELECT o.outlet_id,o.name,CASE WHEN EXISTS(SELECT 1 FROM pg_timezone_names z WHERE z.name=o.timezone) THEN o.timezone ELSE 'UTC' END tz,p_start_date::timestamp AT TIME ZONE (CASE WHEN EXISTS(SELECT 1 FROM pg_timezone_names z WHERE z.name=o.timezone) THEN o.timezone ELSE 'UTC' END) utc_start,(p_end_date+1)::timestamp AT TIME ZONE (CASE WHEN EXISTS(SELECT 1 FROM pg_timezone_names z WHERE z.name=o.timezone) THEN o.timezone ELSE 'UTC' END) utc_end FROM public.outlets o WHERE p_outlet_id IS NULL OR o.outlet_id=p_outlet_id), activity AS (
  SELECT a.id,b.outlet_id,b.name outlet_name,a.status state,a.created_at occurred_at,a.date||' '||a.time scheduled_for,a.source,NULL::text detail FROM public.appointments a JOIN bounds b ON b.outlet_id=a.outlet_id WHERE p_kind='bookings_created' AND a.created_at>=b.utc_start AND a.created_at<b.utc_end
  UNION ALL SELECT a.id,b.outlet_id,b.name,a.status,a.created_at,a.date||' '||a.time,a.source,NULL FROM public.appointments a JOIN bounds b ON b.outlet_id=a.outlet_id WHERE p_kind='appointments_scheduled' AND a.date~'^\d{4}-\d{2}-\d{2}$' AND a.date::date BETWEEN p_start_date AND p_end_date
  UNION ALL SELECT a.id,b.outlet_id,b.name,a.status,a.completed_at,a.date||' '||a.time,a.source,NULL FROM public.appointments a JOIN bounds b ON b.outlet_id=a.outlet_id WHERE p_kind='appointments_completed' AND a.completed_at>=b.utc_start AND a.completed_at<b.utc_end
  UNION ALL SELECT a.id,b.outlet_id,b.name,a.status,a.cancelled_at,a.date||' '||a.time,a.source,NULL FROM public.appointments a JOIN bounds b ON b.outlet_id=a.outlet_id WHERE p_kind='appointments_cancelled' AND a.cancelled_at>=b.utc_start AND a.cancelled_at<b.utc_end
  UNION ALL SELECT op.id::text,coalesce(op.outlet_id,''),coalesce(b.name,'Platform'),op.state,coalesce(op.completed_at,op.started_at),NULL,op.action,public.platform_sanitize_error(op.result->>'error') FROM public.platform_admin_operations op LEFT JOIN bounds b ON b.outlet_id=op.outlet_id WHERE p_kind='failed_operations' AND op.state IN ('failed','partial') AND (p_outlet_id IS NULL OR op.outlet_id=p_outlet_id) AND op.started_at>=coalesce(b.utc_start,p_start_date::timestamp AT TIME ZONE 'UTC') AND op.started_at<coalesce(b.utc_end,(p_end_date+1)::timestamp AT TIME ZONE 'UTC')
  UNION ALL SELECT d.id,d.outlet_id,b.name,d.status,d.updated_at,NULL,d.channel,public.platform_sanitize_error(d.last_error) FROM public.marketing_campaign_deliveries d JOIN bounds b ON b.outlet_id=d.outlet_id WHERE p_kind='failed_messages' AND d.status='failed' AND d.updated_at>=b.utc_start AND d.updated_at<b.utc_end
  UNION ALL SELECT c.id::text,c.outlet_id,b.name,c.status,c.updated_at,NULL,c.category,c.subject FROM public.platform_support_cases c JOIN bounds b ON b.outlet_id=c.outlet_id WHERE p_kind='unresolved_support' AND c.status<>'resolved'
 ) SELECT coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) INTO v_rows FROM (SELECT * FROM activity ORDER BY occurred_at DESC NULLS LAST,id LIMIT least(greatest(p_limit,1),100) OFFSET greatest(p_offset,0)) x;
 RETURN jsonb_build_object('rows',v_rows,'total',v_total);
END $$;

CREATE OR REPLACE FUNCTION public.platform_integrations_page(p_outlet_id text DEFAULT NULL,p_type text DEFAULT NULL,p_state text DEFAULT NULL,p_limit integer DEFAULT 25,p_offset integer DEFAULT 0)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE v_rows jsonb; v_total bigint;
BEGIN
 IF NOT public.is_platform_admin() THEN RAISE EXCEPTION 'Platform administrator access required'; END IF;
 WITH latest_marketing AS (SELECT DISTINCT ON(outlet_id,channel) outlet_id,channel,status,sent_at,last_error,updated_at FROM public.marketing_campaign_deliveries ORDER BY outlet_id,channel,updated_at DESC), integrations AS (
  SELECT g.outlet_id,o.name outlet_name,'google_business' integration_type,CASE WHEN g.status='connected' AND g.last_synced_at IS NOT NULL THEN 'verified' WHEN g.status='connected' THEN 'connected_unverified' ELSE g.status END state,g.last_synced_at last_verified_success,g.last_error_at latest_error_at,public.platform_sanitize_error(g.last_error_message) latest_error,'Google sync evidence' detail FROM public.google_business_connections g JOIN public.outlets o ON o.outlet_id=g.outlet_id
  UNION ALL SELECT a.outlet_id,o.name,'chatbot_api','configured_unverified',NULL,NULL,NULL,'Saved API/webhook configuration is not a health check' FROM public.api_integrations a JOIN public.outlets o ON o.outlet_id=a.outlet_id WHERE a.api_key_hash IS NOT NULL OR a.webhook_url IS NOT NULL
  UNION ALL SELECT m.outlet_id,o.name,'marketing_'||m.channel,CASE WHEN m.status='sent' THEN 'provider_accepted' ELSE m.status END,NULL,CASE WHEN m.status='failed' THEN m.updated_at END,public.platform_sanitize_error(m.last_error),'Provider acceptance is tracked; confirmed delivery is not instrumented' FROM latest_marketing m JOIN public.outlets o ON o.outlet_id=m.outlet_id
  UNION ALL SELECT o.outlet_id,o.name,'reminders',CASE WHEN lower(coalesce(o.settings->>'reminderEnabled','false'))='true' THEN 'simulated' ELSE 'disabled' END,NULL,NULL,NULL,'Reminder actions are simulated; no provider delivery evidence exists' FROM public.outlets o
 ), filtered AS (SELECT * FROM integrations i WHERE (p_outlet_id IS NULL OR i.outlet_id=p_outlet_id) AND (p_type IS NULL OR i.integration_type=p_type) AND (p_state IS NULL OR i.state=p_state))
 SELECT count(*) INTO v_total FROM filtered;
 WITH latest_marketing AS (SELECT DISTINCT ON(outlet_id,channel) outlet_id,channel,status,sent_at,last_error,updated_at FROM public.marketing_campaign_deliveries ORDER BY outlet_id,channel,updated_at DESC), integrations AS (
  SELECT g.outlet_id,o.name outlet_name,'google_business' integration_type,CASE WHEN g.status='connected' AND g.last_synced_at IS NOT NULL THEN 'verified' WHEN g.status='connected' THEN 'connected_unverified' ELSE g.status END state,g.last_synced_at last_verified_success,g.last_error_at latest_error_at,public.platform_sanitize_error(g.last_error_message) latest_error,'Google sync evidence' detail FROM public.google_business_connections g JOIN public.outlets o ON o.outlet_id=g.outlet_id
  UNION ALL SELECT a.outlet_id,o.name,'chatbot_api','configured_unverified',NULL,NULL,NULL,'Saved API/webhook configuration is not a health check' FROM public.api_integrations a JOIN public.outlets o ON o.outlet_id=a.outlet_id WHERE a.api_key_hash IS NOT NULL OR a.webhook_url IS NOT NULL
  UNION ALL SELECT m.outlet_id,o.name,'marketing_'||m.channel,CASE WHEN m.status='sent' THEN 'provider_accepted' ELSE m.status END,NULL,CASE WHEN m.status='failed' THEN m.updated_at END,public.platform_sanitize_error(m.last_error),'Provider acceptance is tracked; confirmed delivery is not instrumented' FROM latest_marketing m JOIN public.outlets o ON o.outlet_id=m.outlet_id
  UNION ALL SELECT o.outlet_id,o.name,'reminders',CASE WHEN lower(coalesce(o.settings->>'reminderEnabled','false'))='true' THEN 'simulated' ELSE 'disabled' END,NULL,NULL,NULL,'Reminder actions are simulated; no provider delivery evidence exists' FROM public.outlets o
 ), filtered AS (SELECT * FROM integrations i WHERE (p_outlet_id IS NULL OR i.outlet_id=p_outlet_id) AND (p_type IS NULL OR i.integration_type=p_type) AND (p_state IS NULL OR i.state=p_state))
 SELECT coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) INTO v_rows FROM (SELECT * FROM filtered ORDER BY coalesce(latest_error_at,last_verified_success) DESC NULLS LAST,outlet_name,integration_type LIMIT least(greatest(p_limit,1),100) OFFSET greatest(p_offset,0)) x;
 RETURN jsonb_build_object('rows',v_rows,'total',v_total);
END $$;

CREATE OR REPLACE FUNCTION public.platform_jobs_page(p_outlet_id text DEFAULT NULL,p_type text DEFAULT NULL,p_state text DEFAULT NULL,p_from timestamptz DEFAULT NULL,p_to timestamptz DEFAULT NULL,p_limit integer DEFAULT 25,p_offset integer DEFAULT 0)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE v_rows jsonb; v_total bigint;
BEGIN
 IF NOT public.is_platform_admin() THEN RAISE EXCEPTION 'Platform administrator access required'; END IF;
 WITH jobs AS (
  SELECT op.id::text reference_id,op.outlet_id,'platform_'||op.action job_type,CASE op.state WHEN 'started' THEN 'running' ELSE op.state END state,op.started_at,op.completed_at,op.attempt_count,public.platform_sanitize_error(op.result->>'error') error FROM public.platform_admin_operations op
  UNION ALL SELECT d.id,d.outlet_id,'marketing_'||d.channel,CASE d.status WHEN 'queued' THEN 'pending' WHEN 'processing' THEN 'running' WHEN 'sent' THEN 'provider_accepted' ELSE d.status END,d.queued_at,coalesce(d.sent_at,d.processed_at),d.attempt_count,public.platform_sanitize_error(d.last_error) FROM public.marketing_campaign_deliveries d
  UNION ALL SELECT e.correlation_id,e.outlet_id,'monitoring_'||e.service,'event',e.occurred_at,e.occurred_at,1,public.platform_sanitize_error(e.message) FROM public.platform_monitoring_events e
  UNION ALL SELECT b.id,b.outlet_id,'stripe_webhook_'||b.event_type,'received',b.received_at,b.received_at,1,NULL FROM public.billing_events b
 ), filtered AS (SELECT * FROM jobs j WHERE (p_outlet_id IS NULL OR j.outlet_id=p_outlet_id) AND (p_type IS NULL OR j.job_type=p_type) AND (p_state IS NULL OR j.state=p_state) AND (p_from IS NULL OR j.started_at>=p_from) AND (p_to IS NULL OR j.started_at<p_to))
 SELECT count(*) INTO v_total FROM filtered;
 WITH jobs AS (
  SELECT op.id::text reference_id,op.outlet_id,'platform_'||op.action job_type,CASE op.state WHEN 'started' THEN 'running' ELSE op.state END state,op.started_at,op.completed_at,op.attempt_count,public.platform_sanitize_error(op.result->>'error') error FROM public.platform_admin_operations op
  UNION ALL SELECT d.id,d.outlet_id,'marketing_'||d.channel,CASE d.status WHEN 'queued' THEN 'pending' WHEN 'processing' THEN 'running' WHEN 'sent' THEN 'provider_accepted' ELSE d.status END,d.queued_at,coalesce(d.sent_at,d.processed_at),d.attempt_count,public.platform_sanitize_error(d.last_error) FROM public.marketing_campaign_deliveries d
  UNION ALL SELECT e.correlation_id,e.outlet_id,'monitoring_'||e.service,'event',e.occurred_at,e.occurred_at,1,public.platform_sanitize_error(e.message) FROM public.platform_monitoring_events e
  UNION ALL SELECT b.id,b.outlet_id,'stripe_webhook_'||b.event_type,'received',b.received_at,b.received_at,1,NULL FROM public.billing_events b
 ), filtered AS (SELECT * FROM jobs j WHERE (p_outlet_id IS NULL OR j.outlet_id=p_outlet_id) AND (p_type IS NULL OR j.job_type=p_type) AND (p_state IS NULL OR j.state=p_state) AND (p_from IS NULL OR j.started_at>=p_from) AND (p_to IS NULL OR j.started_at<p_to))
 SELECT coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) INTO v_rows FROM (SELECT f.*,o.name outlet_name FROM filtered f LEFT JOIN public.outlets o ON o.outlet_id=f.outlet_id ORDER BY f.started_at DESC,f.reference_id LIMIT least(greatest(p_limit,1),100) OFFSET greatest(p_offset,0)) x;
 RETURN jsonb_build_object('rows',v_rows,'total',v_total,'retries_enabled',false,'scheduler_instrumentation','not_instrumented');
END $$;

REVOKE ALL ON FUNCTION public.platform_create_support_case(text,text,text,text,text,uuid,jsonb),public.platform_update_support_case(uuid,text,text,uuid,text,text,timestamptz),public.platform_add_support_reference(uuid,text,text),public.platform_support_cases_page(text,text,text,text,text,integer,integer),public.platform_support_case_detail(uuid),public.platform_support_operators(),public.platform_onboarding_page(text,text,integer,integer),public.platform_operations_overview(date,date,text),public.platform_activity_page(text,date,date,text,integer,integer),public.platform_integrations_page(text,text,text,integer,integer),public.platform_jobs_page(text,text,text,timestamptz,timestamptz,integer,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.platform_create_support_case(text,text,text,text,text,uuid,jsonb),public.platform_update_support_case(uuid,text,text,uuid,text,text,timestamptz),public.platform_add_support_reference(uuid,text,text),public.platform_support_cases_page(text,text,text,text,text,integer,integer),public.platform_support_case_detail(uuid),public.platform_support_operators(),public.platform_onboarding_page(text,text,integer,integer),public.platform_operations_overview(date,date,text),public.platform_activity_page(text,date,date,text,integer,integer),public.platform_integrations_page(text,text,text,integer,integer),public.platform_jobs_page(text,text,text,timestamptz,timestamptz,integer,integer) TO authenticated;
