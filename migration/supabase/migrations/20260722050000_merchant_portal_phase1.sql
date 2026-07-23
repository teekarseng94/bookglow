-- Merchant portal Phase 1: portal users + outlet-scoped RLS for staff/services/appointments/outlets
-- Keeps public booking anon policies intact.
-- Portal staff must exist in public.users (uid = auth.uid()).

CREATE TABLE IF NOT EXISTS users (
  uid TEXT PRIMARY KEY,
  email TEXT,
  outlet_id TEXT REFERENCES outlets(outlet_id),
  role TEXT DEFAULT 'cashier',
  display_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_outlet ON users (outlet_id);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_select_own" ON users;
CREATE POLICY "users_select_own"
  ON users FOR SELECT
  TO authenticated
  USING (uid = auth.uid()::text);

DROP POLICY IF EXISTS "users_service_role" ON users;
CREATE POLICY "users_service_role"
  ON users FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

GRANT SELECT ON users TO authenticated;

-- Helpers (SECURITY DEFINER, fixed search_path)
CREATE OR REPLACE FUNCTION public.current_portal_outlet_id()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT outlet_id FROM public.users WHERE uid = auth.uid()::text LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_portal_platform_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE uid = auth.uid()::text
      AND (
        role = 'platform_admin'
        OR (lower(COALESCE(role, '')) = 'admin' AND outlet_id IS NULL)
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.is_portal_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE uid = auth.uid()::text
      AND lower(COALESCE(role, '')) IN ('admin', 'platform_admin')
  );
$$;

REVOKE ALL ON FUNCTION public.current_portal_outlet_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_portal_platform_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_portal_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_portal_outlet_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_portal_platform_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_portal_admin() TO authenticated;

-- Outlets: merchant can update own outlet; platform admin all
DROP POLICY IF EXISTS "outlets_merchant_update" ON outlets;
CREATE POLICY "outlets_merchant_update"
  ON outlets FOR UPDATE
  TO authenticated
  USING (
    public.is_portal_platform_admin()
    OR outlet_id = public.current_portal_outlet_id()
  )
  WITH CHECK (
    public.is_portal_platform_admin()
    OR outlet_id = public.current_portal_outlet_id()
  );

DROP POLICY IF EXISTS "outlets_merchant_select_all" ON outlets;
CREATE POLICY "outlets_merchant_select_all"
  ON outlets FOR SELECT
  TO authenticated
  USING (
    public.is_portal_platform_admin()
    OR outlet_id = public.current_portal_outlet_id()
    OR COALESCE(is_active, true) = true
  );

GRANT UPDATE ON outlets TO authenticated;

-- Staff: merchant CRUD own outlet (public SELECT already exists for booking)
DROP POLICY IF EXISTS "staff_merchant_insert" ON staff;
CREATE POLICY "staff_merchant_insert"
  ON staff FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_portal_platform_admin()
    OR outlet_id = public.current_portal_outlet_id()
  );

DROP POLICY IF EXISTS "staff_merchant_update" ON staff;
CREATE POLICY "staff_merchant_update"
  ON staff FOR UPDATE
  TO authenticated
  USING (
    public.is_portal_platform_admin()
    OR outlet_id = public.current_portal_outlet_id()
  )
  WITH CHECK (
    public.is_portal_platform_admin()
    OR outlet_id = public.current_portal_outlet_id()
  );

DROP POLICY IF EXISTS "staff_merchant_delete" ON staff;
CREATE POLICY "staff_merchant_delete"
  ON staff FOR DELETE
  TO authenticated
  USING (
    public.is_portal_platform_admin()
    OR outlet_id = public.current_portal_outlet_id()
  );

GRANT INSERT, UPDATE, DELETE ON staff TO authenticated;

-- Services: merchant can see all (incl. hidden) for own outlet; write own outlet
DROP POLICY IF EXISTS "services_merchant_select" ON services;
CREATE POLICY "services_merchant_select"
  ON services FOR SELECT
  TO authenticated
  USING (
    public.is_portal_platform_admin()
    OR (
      public.current_portal_outlet_id() IS NOT NULL
      AND outlet_id = public.current_portal_outlet_id()
    )
  );

DROP POLICY IF EXISTS "services_merchant_insert" ON services;
CREATE POLICY "services_merchant_insert"
  ON services FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_portal_platform_admin()
    OR outlet_id = public.current_portal_outlet_id()
  );

DROP POLICY IF EXISTS "services_merchant_update" ON services;
CREATE POLICY "services_merchant_update"
  ON services FOR UPDATE
  TO authenticated
  USING (
    public.is_portal_platform_admin()
    OR outlet_id = public.current_portal_outlet_id()
  )
  WITH CHECK (
    public.is_portal_platform_admin()
    OR outlet_id = public.current_portal_outlet_id()
  );

DROP POLICY IF EXISTS "services_merchant_delete" ON services;
CREATE POLICY "services_merchant_delete"
  ON services FOR DELETE
  TO authenticated
  USING (
    public.is_portal_platform_admin()
    OR outlet_id = public.current_portal_outlet_id()
  );

GRANT INSERT, UPDATE, DELETE ON services TO authenticated;

-- Appointments: merchant full CRUD own outlet (no anon table access)
DROP POLICY IF EXISTS "appointments_merchant_select" ON appointments;
CREATE POLICY "appointments_merchant_select"
  ON appointments FOR SELECT
  TO authenticated
  USING (
    public.is_portal_platform_admin()
    OR outlet_id = public.current_portal_outlet_id()
  );

DROP POLICY IF EXISTS "appointments_merchant_insert" ON appointments;
CREATE POLICY "appointments_merchant_insert"
  ON appointments FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_portal_platform_admin()
    OR outlet_id = public.current_portal_outlet_id()
  );

DROP POLICY IF EXISTS "appointments_merchant_update" ON appointments;
CREATE POLICY "appointments_merchant_update"
  ON appointments FOR UPDATE
  TO authenticated
  USING (
    public.is_portal_platform_admin()
    OR outlet_id = public.current_portal_outlet_id()
  )
  WITH CHECK (
    public.is_portal_platform_admin()
    OR outlet_id = public.current_portal_outlet_id()
  );

DROP POLICY IF EXISTS "appointments_merchant_delete" ON appointments;
CREATE POLICY "appointments_merchant_delete"
  ON appointments FOR DELETE
  TO authenticated
  USING (
    public.is_portal_platform_admin()
    OR outlet_id = public.current_portal_outlet_id()
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON appointments TO authenticated;
