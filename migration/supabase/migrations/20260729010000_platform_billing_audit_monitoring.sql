-- Stripe billing plus append-only platform audit and monitoring records.

CREATE TABLE IF NOT EXISTS public.billing_customers (
  outlet_id text PRIMARY KEY REFERENCES public.outlets(outlet_id) ON DELETE RESTRICT,
  stripe_customer_id text UNIQUE NOT NULL,
  email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.outlet_subscriptions (
  id text PRIMARY KEY,
  outlet_id text NOT NULL REFERENCES public.outlets(outlet_id) ON DELETE RESTRICT,
  stripe_customer_id text NOT NULL,
  stripe_price_id text,
  status text NOT NULL,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  current_period_start timestamptz,
  current_period_end timestamptz,
  trial_end timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_outlet_subscriptions_outlet ON public.outlet_subscriptions(outlet_id);
CREATE INDEX IF NOT EXISTS idx_outlet_subscriptions_status ON public.outlet_subscriptions(status);

CREATE TABLE IF NOT EXISTS public.billing_events (
  id text PRIMARY KEY,
  event_type text NOT NULL,
  outlet_id text REFERENCES public.outlets(outlet_id) ON DELETE SET NULL,
  stripe_created_at timestamptz,
  livemode boolean NOT NULL DEFAULT false,
  payload jsonb NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.platform_audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id text,
  action text NOT NULL,
  affected_target text NOT NULL,
  actor_uid text,
  actor_email text,
  reason text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  source text NOT NULL DEFAULT 'merchant-portal',
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_platform_audit_occurred ON public.platform_audit_events(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_audit_outlet ON public.platform_audit_events(outlet_id, occurred_at DESC);

CREATE TABLE IF NOT EXISTS public.platform_monitoring_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  event_type text NOT NULL,
  message text NOT NULL,
  outlet_id text,
  correlation_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_platform_monitoring_occurred ON public.platform_monitoring_events(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_monitoring_severity ON public.platform_monitoring_events(severity, occurred_at DESC);

CREATE OR REPLACE FUNCTION public.reject_immutable_platform_event_change()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  RAISE EXCEPTION 'Platform event records are append-only';
END;
$$;

DROP TRIGGER IF EXISTS platform_audit_immutable ON public.platform_audit_events;
CREATE TRIGGER platform_audit_immutable BEFORE UPDATE OR DELETE ON public.platform_audit_events
  FOR EACH ROW EXECUTE FUNCTION public.reject_immutable_platform_event_change();
DROP TRIGGER IF EXISTS platform_monitoring_immutable ON public.platform_monitoring_events;
CREATE TRIGGER platform_monitoring_immutable BEFORE UPDATE OR DELETE ON public.platform_monitoring_events
  FOR EACH ROW EXECUTE FUNCTION public.reject_immutable_platform_event_change();
DROP TRIGGER IF EXISTS billing_events_immutable ON public.billing_events;
CREATE TRIGGER billing_events_immutable BEFORE UPDATE OR DELETE ON public.billing_events
  FOR EACH ROW EXECUTE FUNCTION public.reject_immutable_platform_event_change();

ALTER TABLE public.billing_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outlet_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_monitoring_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "platform_admin_read_billing_customers" ON public.billing_customers FOR SELECT TO authenticated USING (public.is_portal_platform_admin());
CREATE POLICY "platform_admin_read_subscriptions" ON public.outlet_subscriptions FOR SELECT TO authenticated USING (public.is_portal_platform_admin());
CREATE POLICY "platform_admin_read_billing_events" ON public.billing_events FOR SELECT TO authenticated USING (public.is_portal_platform_admin());
CREATE POLICY "platform_admin_read_audit" ON public.platform_audit_events FOR SELECT TO authenticated USING (public.is_portal_platform_admin());
CREATE POLICY "platform_admin_read_monitoring" ON public.platform_monitoring_events FOR SELECT TO authenticated USING (public.is_portal_platform_admin());

CREATE POLICY "service_role_billing_customers" ON public.billing_customers FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_subscriptions" ON public.outlet_subscriptions FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_billing_events_insert" ON public.billing_events FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "service_role_audit_insert" ON public.platform_audit_events FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "service_role_monitoring_insert" ON public.platform_monitoring_events FOR INSERT TO service_role WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.append_platform_audit_event(
  p_outlet_id text, p_action text, p_affected_target text, p_reason text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb, p_source text DEFAULT 'merchant-portal'
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_id uuid;
  v_email text;
BEGIN
  IF NOT public.is_portal_platform_admin() THEN
    RAISE EXCEPTION 'Platform administrator access required';
  END IF;
  SELECT email INTO v_email FROM public.users WHERE uid = auth.uid()::text;
  INSERT INTO public.platform_audit_events (
    outlet_id, action, affected_target, actor_uid, actor_email, reason, metadata, source
  ) VALUES (
    p_outlet_id, p_action, p_affected_target, auth.uid()::text, v_email, p_reason,
    COALESCE(p_metadata, '{}'::jsonb), COALESCE(p_source, 'merchant-portal')
  ) RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.append_platform_audit_event(text, text, text, text, jsonb, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.append_platform_audit_event(text, text, text, text, jsonb, text) TO authenticated;
GRANT SELECT ON public.billing_customers, public.outlet_subscriptions, public.billing_events,
  public.platform_audit_events, public.platform_monitoring_events TO authenticated;
