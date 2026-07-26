-- Per-staff weekly availability + capability flags (Staff & Team page)
ALTER TABLE staff
  ADD COLUMN IF NOT EXISTS weekly_hours JSONB,
  ADD COLUMN IF NOT EXISTS permissions JSONB;

COMMENT ON COLUMN staff.weekly_hours IS
  'Per-day hours: { monday: { open, close, isOpen }, ... }. Null = not configured.';
COMMENT ON COLUMN staff.permissions IS
  'Capability flags for this staff profile (portal/pos/feature access intent).';
