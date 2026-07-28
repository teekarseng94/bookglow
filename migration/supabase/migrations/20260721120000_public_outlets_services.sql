-- Public booking domain: outlets + services (read-safe for anon)
-- Applied via MCP to project uecphpjymbgtttrizhgy (bookglow / Sohokaki Org).

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS outlets (
  outlet_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  address JSONB,
  address_display TEXT,
  phone_number TEXT,
  phone TEXT,
  email TEXT,
  timezone TEXT,
  business_hours JSONB,
  reviews JSONB,
  settings JSONB,
  service_categories JSONB,
  booking_slug TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS services (
  id TEXT PRIMARY KEY,
  outlet_id TEXT NOT NULL REFERENCES outlets(outlet_id),
  name TEXT NOT NULL DEFAULT '',
  price NUMERIC(12,2) DEFAULT 0,
  duration INTEGER DEFAULT 60,
  category TEXT DEFAULT '',
  category_id TEXT,
  points INTEGER DEFAULT 0,
  is_commissionable BOOLEAN DEFAULT false,
  description TEXT,
  image_url TEXT,
  icon_id TEXT,
  display_order INTEGER DEFAULT 0,
  redeem_points_enabled BOOLEAN DEFAULT false,
  redeem_points INTEGER DEFAULT 0,
  is_visible BOOLEAN DEFAULT true,
  is_promotion BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_outlets_booking_slug ON outlets (booking_slug);
CREATE INDEX IF NOT EXISTS idx_outlets_is_active ON outlets (is_active);
CREATE INDEX IF NOT EXISTS idx_services_outlet ON services (outlet_id);
CREATE INDEX IF NOT EXISTS idx_services_outlet_visible ON services (outlet_id, is_visible);
CREATE INDEX IF NOT EXISTS idx_services_outlet_category ON services (outlet_id, category);

ALTER TABLE outlets ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;

-- Public booking: anon may read active outlets and visible services only.
DROP POLICY IF EXISTS "outlets_public_select_active" ON outlets;
CREATE POLICY "outlets_public_select_active"
  ON outlets FOR SELECT
  TO anon, authenticated
  USING (COALESCE(is_active, true) = true);

DROP POLICY IF EXISTS "outlets_all_service_role" ON outlets;
CREATE POLICY "outlets_all_service_role"
  ON outlets FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "services_public_select_visible" ON services;
CREATE POLICY "services_public_select_visible"
  ON services FOR SELECT
  TO anon, authenticated
  USING (COALESCE(is_visible, true) = true);

DROP POLICY IF EXISTS "services_service_role" ON services;
CREATE POLICY "services_service_role"
  ON services FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

GRANT SELECT ON outlets TO anon, authenticated;
GRANT SELECT ON services TO anon, authenticated;
