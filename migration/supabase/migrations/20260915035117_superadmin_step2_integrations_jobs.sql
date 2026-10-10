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
 ), filtered AS (SELECT * FROM jobs j WHERE (p_outlet_id IS NULL OR j.outlet_id=p_outlet_id) AND (p_type IS NULL OR j.job_type=p_type) AND (p_state IS NULL OR j.state=p_state) AND (p_from IS NULL OR j.started_at>=p_from) AND (p_to IS NULL OR j.started_at < p_to))
 SELECT count(*) INTO v_total FROM filtered;
 WITH jobs AS (
  SELECT op.id::text reference_id,op.outlet_id,'platform_'||op.action job_type,CASE op.state WHEN 'started' THEN 'running' ELSE op.state END state,op.started_at,op.completed_at,op.attempt_count,public.platform_sanitize_error(op.result->>'error') error FROM public.platform_admin_operations op
  UNION ALL SELECT d.id,d.outlet_id,'marketing_'||d.channel,CASE d.status WHEN 'queued' THEN 'pending' WHEN 'processing' THEN 'running' WHEN 'sent' THEN 'provider_accepted' ELSE d.status END,d.queued_at,coalesce(d.sent_at,d.processed_at),d.attempt_count,public.platform_sanitize_error(d.last_error) FROM public.marketing_campaign_deliveries d
  UNION ALL SELECT e.correlation_id,e.outlet_id,'monitoring_'||e.service,'event',e.occurred_at,e.occurred_at,1,public.platform_sanitize_error(e.message) FROM public.platform_monitoring_events e
  UNION ALL SELECT b.id,b.outlet_id,'stripe_webhook_'||b.event_type,'received',b.received_at,b.received_at,1,NULL FROM public.billing_events b
 ), filtered AS (SELECT * FROM jobs j WHERE (p_outlet_id IS NULL OR j.outlet_id=p_outlet_id) AND (p_type IS NULL OR j.job_type=p_type) AND (p_state IS NULL OR j.state=p_state) AND (p_from IS NULL OR j.started_at>=p_from) AND (p_to IS NULL OR j.started_at < p_to))
 SELECT coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) INTO v_rows FROM (SELECT f.*,o.name outlet_name FROM filtered f LEFT JOIN public.outlets o ON o.outlet_id=f.outlet_id ORDER BY f.started_at DESC,f.reference_id LIMIT least(greatest(p_limit,1),100) OFFSET greatest(p_offset,0)) x;
 RETURN jsonb_build_object('rows',v_rows,'total',v_total,'retries_enabled',false,'scheduler_instrumentation','not_instrumented');
END $$;

REVOKE ALL ON FUNCTION public.platform_integrations_page(text,text,text,integer,integer),public.platform_jobs_page(text,text,text,timestamptz,timestamptz,integer,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.platform_integrations_page(text,text,text,integer,integer),public.platform_jobs_page(text,text,text,timestamptz,timestamptz,integer,integer) TO authenticated;