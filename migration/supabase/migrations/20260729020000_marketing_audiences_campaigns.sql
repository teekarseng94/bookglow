-- Marketing Phase 2: reusable audiences and campaign drafts/schedules.

CREATE TABLE IF NOT EXISTS marketing_audiences (
  id TEXT PRIMARY KEY DEFAULT replace(gen_random_uuid()::text, '-', ''),
  outlet_id TEXT NOT NULL REFERENCES outlets(outlet_id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  criteria JSONB NOT NULL DEFAULT '{"type":"all"}'::jsonb,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_marketing_audiences_outlet_updated
  ON marketing_audiences (outlet_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS marketing_campaigns (
  id TEXT PRIMARY KEY DEFAULT replace(gen_random_uuid()::text, '-', ''),
  outlet_id TEXT NOT NULL REFERENCES outlets(outlet_id) ON DELETE CASCADE,
  audience_id TEXT REFERENCES marketing_audiences(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  objective TEXT NOT NULL DEFAULT 'promotion'
    CHECK (objective IN ('promotion', 'rebooking', 'retention', 'announcement')),
  channel TEXT NOT NULL
    CHECK (channel IN ('email', 'sms', 'whatsapp', 'share_link')),
  subject TEXT,
  message TEXT NOT NULL,
  offer JSONB NOT NULL DEFAULT '{"type":"none"}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'scheduled', 'paused', 'completed', 'cancelled')),
  scheduled_at TIMESTAMPTZ,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT marketing_campaign_schedule_required
    CHECK (status <> 'scheduled' OR scheduled_at IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_outlet_status_updated
  ON marketing_campaigns (outlet_id, status, updated_at DESC);

ALTER TABLE marketing_audiences ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "marketing_audiences_merchant_select" ON marketing_audiences;
CREATE POLICY "marketing_audiences_merchant_select"
  ON marketing_audiences FOR SELECT TO authenticated
  USING (
    public.is_portal_platform_admin()
    OR outlet_id = public.current_portal_outlet_id()
  );

DROP POLICY IF EXISTS "marketing_audiences_admin_write" ON marketing_audiences;
CREATE POLICY "marketing_audiences_admin_write"
  ON marketing_audiences FOR ALL TO authenticated
  USING (
    public.is_portal_platform_admin()
    OR (outlet_id = public.current_portal_outlet_id() AND public.is_portal_admin())
  )
  WITH CHECK (
    public.is_portal_platform_admin()
    OR (outlet_id = public.current_portal_outlet_id() AND public.is_portal_admin())
  );

DROP POLICY IF EXISTS "marketing_campaigns_merchant_select" ON marketing_campaigns;
CREATE POLICY "marketing_campaigns_merchant_select"
  ON marketing_campaigns FOR SELECT TO authenticated
  USING (
    public.is_portal_platform_admin()
    OR outlet_id = public.current_portal_outlet_id()
  );

DROP POLICY IF EXISTS "marketing_campaigns_admin_write" ON marketing_campaigns;
CREATE POLICY "marketing_campaigns_admin_write"
  ON marketing_campaigns FOR ALL TO authenticated
  USING (
    public.is_portal_platform_admin()
    OR (outlet_id = public.current_portal_outlet_id() AND public.is_portal_admin())
  )
  WITH CHECK (
    public.is_portal_platform_admin()
    OR (outlet_id = public.current_portal_outlet_id() AND public.is_portal_admin())
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON marketing_audiences TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON marketing_campaigns TO authenticated;

