-- Public booking domain: staff (read-safe for anon)
-- Applied to project uecphpjymbgtttrizhgy (bookglow).

CREATE TABLE IF NOT EXISTS staff (
  id TEXT PRIMARY KEY,
  outlet_id TEXT NOT NULL REFERENCES outlets(outlet_id),
  name TEXT NOT NULL DEFAULT '',
  role TEXT,
  email TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  profile_picture TEXT,
  photo_url TEXT,
  qualified_services JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_staff_outlet ON staff (outlet_id);

ALTER TABLE staff ENABLE ROW LEVEL SECURITY;

-- Public booking: anon may read staff (matches Firestore public staff read).
DROP POLICY IF EXISTS "staff_public_select" ON staff;
CREATE POLICY "staff_public_select"
  ON staff FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "staff_service_role" ON staff;
CREATE POLICY "staff_service_role"
  ON staff FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

GRANT SELECT ON staff TO anon, authenticated;
