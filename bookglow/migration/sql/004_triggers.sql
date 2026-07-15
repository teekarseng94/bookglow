-- ============================================================
-- BookGlow: Firestore → Supabase Migration
-- 004_triggers.sql
--
-- Auto-update updated_at timestamps on modification.
-- ============================================================

-- Generic trigger function for updated_at
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to tables that have updated_at columns
CREATE TRIGGER set_updated_at_outlets
  BEFORE UPDATE ON outlets
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_api_integrations
  BEFORE UPDATE ON api_integrations
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_updated_at();
