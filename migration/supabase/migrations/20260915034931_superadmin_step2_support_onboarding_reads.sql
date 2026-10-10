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

REVOKE ALL ON FUNCTION public.platform_create_support_case(text,text,text,text,text,uuid,jsonb),public.platform_update_support_case(uuid,text,text,uuid,text,text,timestamptz),public.platform_add_support_reference(uuid,text,text),public.platform_support_cases_page(text,text,text,text,text,integer,integer),public.platform_support_case_detail(uuid),public.platform_support_operators(),public.platform_onboarding_page(text,text,integer,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.platform_create_support_case(text,text,text,text,text,uuid,jsonb),public.platform_update_support_case(uuid,text,text,uuid,text,text,timestamptz),public.platform_add_support_reference(uuid,text,text),public.platform_support_cases_page(text,text,text,text,text,integer,integer),public.platform_support_case_detail(uuid),public.platform_support_operators(),public.platform_onboarding_page(text,text,integer,integer) TO authenticated;