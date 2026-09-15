-- Replace Stripe-shaped required columns with HitPay-capable platform billing fields.
-- Stripe columns stay nullable so empty production rows are not rewritten.

ALTER TABLE public.billing_customers
  ALTER COLUMN stripe_customer_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'hitpay',
  ADD COLUMN IF NOT EXISTS hitpay_customer_id text;

ALTER TABLE public.billing_customers
  DROP CONSTRAINT IF EXISTS billing_customers_provider_check;
ALTER TABLE public.billing_customers
  ADD CONSTRAINT billing_customers_provider_check
  CHECK (provider IN ('hitpay', 'stripe'));

ALTER TABLE public.outlet_subscriptions
  ALTER COLUMN stripe_customer_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'hitpay',
  ADD COLUMN IF NOT EXISTS hitpay_recurring_id text,
  ADD COLUMN IF NOT EXISTS hitpay_plan_id text;

ALTER TABLE public.outlet_subscriptions
  DROP CONSTRAINT IF EXISTS outlet_subscriptions_provider_check;
ALTER TABLE public.outlet_subscriptions
  ADD CONSTRAINT outlet_subscriptions_provider_check
  CHECK (provider IN ('hitpay', 'stripe'));

CREATE INDEX IF NOT EXISTS idx_outlet_subscriptions_hitpay_recurring
  ON public.outlet_subscriptions(hitpay_recurring_id);

ALTER TABLE public.billing_events
  ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'hitpay';

-- Relabel billing job rows away from Stripe. Privileges on this function are preserved.
CREATE OR REPLACE FUNCTION public.platform_jobs_page(p_outlet_id text DEFAULT NULL,p_type text DEFAULT NULL,p_state text DEFAULT NULL,p_from timestamptz DEFAULT NULL,p_to timestamptz DEFAULT NULL,p_limit integer DEFAULT 25,p_offset integer DEFAULT 0)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE v_rows jsonb; v_total bigint;
BEGIN
 IF NOT public.is_platform_admin() THEN RAISE EXCEPTION 'Platform administrator access required'; END IF;
 WITH jobs AS (
  SELECT op.id::text reference_id,op.outlet_id,'platform_'||op.action job_type,CASE op.state WHEN 'started' THEN 'running' ELSE op.state END state,op.started_at,op.completed_at,op.attempt_count,public.platform_sanitize_error(op.result->>'error') error FROM public.platform_admin_operations op
  UNION ALL SELECT d.id,d.outlet_id,'marketing_'||d.channel,CASE d.status WHEN 'queued' THEN 'pending' WHEN 'processing' THEN 'running' WHEN 'sent' THEN 'provider_accepted' ELSE d.status END,d.queued_at,coalesce(d.sent_at,d.processed_at),d.attempt_count,public.platform_sanitize_error(d.last_error) FROM public.marketing_campaign_deliveries d
  UNION ALL SELECT e.correlation_id,e.outlet_id,'monitoring_'||e.service,'event',e.occurred_at,e.occurred_at,1,public.platform_sanitize_error(e.message) FROM public.platform_monitoring_events e
  UNION ALL SELECT b.id,b.outlet_id,'billing_'||b.event_type,'received',b.received_at,b.received_at,1,NULL FROM public.billing_events b
 ), filtered AS (SELECT * FROM jobs j WHERE (p_outlet_id IS NULL OR j.outlet_id=p_outlet_id) AND (p_type IS NULL OR j.job_type=p_type) AND (p_state IS NULL OR j.state=p_state) AND (p_from IS NULL OR j.started_at>=p_from) AND (p_to IS NULL OR j.started_at < p_to))
 SELECT count(*) INTO v_total FROM filtered;
 WITH jobs AS (
  SELECT op.id::text reference_id,op.outlet_id,'platform_'||op.action job_type,CASE op.state WHEN 'started' THEN 'running' ELSE op.state END state,op.started_at,op.completed_at,op.attempt_count,public.platform_sanitize_error(op.result->>'error') error FROM public.platform_admin_operations op
  UNION ALL SELECT d.id,d.outlet_id,'marketing_'||d.channel,CASE d.status WHEN 'queued' THEN 'pending' WHEN 'processing' THEN 'running' WHEN 'sent' THEN 'provider_accepted' ELSE d.status END,d.queued_at,coalesce(d.sent_at,d.processed_at),d.attempt_count,public.platform_sanitize_error(d.last_error) FROM public.marketing_campaign_deliveries d
  UNION ALL SELECT e.correlation_id,e.outlet_id,'monitoring_'||e.service,'event',e.occurred_at,e.occurred_at,1,public.platform_sanitize_error(e.message) FROM public.platform_monitoring_events e
  UNION ALL SELECT b.id,b.outlet_id,'billing_'||b.event_type,'received',b.received_at,b.received_at,1,NULL FROM public.billing_events b
 ), filtered AS (SELECT * FROM jobs j WHERE (p_outlet_id IS NULL OR j.outlet_id=p_outlet_id) AND (p_type IS NULL OR j.job_type=p_type) AND (p_state IS NULL OR j.state=p_state) AND (p_from IS NULL OR j.started_at>=p_from) AND (p_to IS NULL OR j.started_at < p_to))
 SELECT coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) INTO v_rows FROM (SELECT f.*,o.name outlet_name FROM filtered f LEFT JOIN public.outlets o ON o.outlet_id=f.outlet_id ORDER BY f.started_at DESC,f.reference_id LIMIT least(greatest(p_limit,1),100) OFFSET greatest(p_offset,0)) x;
 RETURN jsonb_build_object('rows',v_rows,'total',v_total,'retries_enabled',false,'scheduler_instrumentation','not_instrumented');
END $$;
