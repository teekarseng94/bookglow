-- Marketing Phase 3: consent-safe, idempotent delivery queue.

ALTER TABLE clients ADD COLUMN IF NOT EXISTS marketing_email_consent BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS marketing_sms_consent BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS marketing_whatsapp_consent BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS marketing_unsubscribed_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS marketing_campaign_deliveries (
  id TEXT PRIMARY KEY DEFAULT replace(gen_random_uuid()::text, '-', ''),
  outlet_id TEXT NOT NULL REFERENCES outlets(outlet_id) ON DELETE CASCADE,
  campaign_id TEXT NOT NULL REFERENCES marketing_campaigns(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'sms', 'whatsapp')),
  recipient_masked TEXT,
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'processing', 'sent', 'failed', 'skipped')),
  provider TEXT,
  provider_message_id TEXT,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  queued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, client_id, channel)
);

CREATE INDEX IF NOT EXISTS idx_marketing_deliveries_worker
  ON marketing_campaign_deliveries (status, queued_at)
  WHERE status IN ('queued', 'failed');

CREATE INDEX IF NOT EXISTS idx_marketing_deliveries_campaign
  ON marketing_campaign_deliveries (campaign_id, status);

ALTER TABLE marketing_campaign_deliveries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "marketing_deliveries_merchant_select" ON marketing_campaign_deliveries;
CREATE POLICY "marketing_deliveries_merchant_select"
  ON marketing_campaign_deliveries FOR SELECT TO authenticated
  USING (
    public.is_portal_platform_admin()
    OR outlet_id = public.current_portal_outlet_id()
  );

DROP POLICY IF EXISTS "marketing_deliveries_service_manage" ON marketing_campaign_deliveries;
CREATE POLICY "marketing_deliveries_service_manage"
  ON marketing_campaign_deliveries FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

GRANT SELECT ON marketing_campaign_deliveries TO authenticated;
GRANT ALL ON marketing_campaign_deliveries TO service_role;

