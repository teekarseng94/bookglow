CREATE OR REPLACE FUNCTION public.platform_operations_overview(p_start_date date,p_end_date date,p_outlet_id text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE v_result jsonb;
BEGIN
 IF NOT public.is_platform_admin() THEN RAISE EXCEPTION 'Platform administrator access required'; END IF;
 IF p_start_date IS NULL OR p_end_date IS NULL OR p_end_date < p_start_date OR p_end_date - p_start_date > 366 THEN RAISE EXCEPTION 'Choose a valid range of at most 367 days'; END IF;
 WITH outlet_bounds AS (
  SELECT o.*,CASE WHEN EXISTS(SELECT 1 FROM pg_timezone_names z WHERE z.name=o.timezone) THEN o.timezone ELSE 'UTC' END effective_timezone,
   p_start_date::timestamp AT TIME ZONE (CASE WHEN EXISTS(SELECT 1 FROM pg_timezone_names z WHERE z.name=o.timezone) THEN o.timezone ELSE 'UTC' END) utc_start,
   (p_end_date+1)::timestamp AT TIME ZONE (CASE WHEN EXISTS(SELECT 1 FROM pg_timezone_names z WHERE z.name=o.timezone) THEN o.timezone ELSE 'UTC' END) utc_end
  FROM public.outlets o WHERE p_outlet_id IS NULL OR o.outlet_id=p_outlet_id
 ), metrics AS (
  SELECT
   count(*) FILTER(WHERE status='active' AND access_status='active' AND onboarding_status='complete') active_outlets,
   (SELECT count(*) FROM public.appointments a JOIN outlet_bounds o ON o.outlet_id=a.outlet_id WHERE a.created_at>=o.utc_start AND a.created_at < o.utc_end) bookings_created,
   (SELECT count(*) FROM public.appointments a JOIN outlet_bounds o ON o.outlet_id=a.outlet_id WHERE a.date~'^\d{4}-\d{2}-\d{2}$' AND a.date::date BETWEEN p_start_date AND p_end_date) appointments_scheduled,
   (SELECT count(*) FROM public.appointments a JOIN outlet_bounds o ON o.outlet_id=a.outlet_id WHERE a.completed_at>=o.utc_start AND a.completed_at < o.utc_end) appointments_completed,
   (SELECT count(*) FROM public.appointments a JOIN outlet_bounds o ON o.outlet_id=a.outlet_id WHERE a.cancelled_at>=o.utc_start AND a.cancelled_at < o.utc_end) appointments_cancelled,
   (SELECT count(*) FROM public.platform_admin_operations op LEFT JOIN outlet_bounds o ON o.outlet_id=op.outlet_id WHERE (p_outlet_id IS NULL OR op.outlet_id=p_outlet_id) AND op.state IN ('failed','partial') AND op.started_at>=coalesce(o.utc_start,p_start_date::timestamp AT TIME ZONE 'UTC') AND op.started_at < coalesce(o.utc_end,(p_end_date+1)::timestamp AT TIME ZONE 'UTC')) failed_operations,
   (SELECT count(*) FROM public.marketing_campaign_deliveries d JOIN outlet_bounds o ON o.outlet_id=d.outlet_id WHERE d.status='failed' AND d.updated_at>=o.utc_start AND d.updated_at < o.utc_end) failed_messages,
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

REVOKE ALL ON FUNCTION public.platform_operations_overview(date,date,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.platform_operations_overview(date,date,text) TO authenticated;