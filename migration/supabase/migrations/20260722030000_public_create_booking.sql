-- Public booking create (write): clients + frontend_customers + create_public_booking RPC
-- Matches Cloud Function createPublicBooking behavior.
-- Anon cannot INSERT into clients/appointments/frontend_customers; only call the RPC.

CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY,
  outlet_id TEXT NOT NULL REFERENCES outlets(outlet_id),
  name TEXT NOT NULL DEFAULT '',
  email TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  points INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clients_outlet_phone ON clients (outlet_id, phone);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "clients_service_role" ON clients;
CREATE POLICY "clients_service_role"
  ON clients FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE TABLE IF NOT EXISTS frontend_customers (
  id TEXT PRIMARY KEY,
  outlet_id TEXT REFERENCES outlets(outlet_id),
  name TEXT,
  phone TEXT,
  email TEXT,
  client_id TEXT,
  booking_history_refs JSONB DEFAULT '[]'::jsonb,
  last_appointment_id TEXT,
  last_booked_at TIMESTAMPTZ,
  source TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_frontend_customers_outlet_phone
  ON frontend_customers (outlet_id, phone);

ALTER TABLE frontend_customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "frontend_customers_service_role" ON frontend_customers;
CREATE POLICY "frontend_customers_service_role"
  ON frontend_customers FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

ALTER TABLE appointments ADD COLUMN IF NOT EXISTS customer_id TEXT;

CREATE OR REPLACE FUNCTION public.create_public_booking(
  p_outlet_id text,
  p_service_id text,
  p_date text,
  p_time text,
  p_customer_name text,
  p_phone text,
  p_email text DEFAULT NULL,
  p_staff_id text DEFAULT NULL,
  p_auth_uid text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_outlet_ok boolean;
  v_duration integer;
  v_name text;
  v_phone text;
  v_email text;
  v_date text;
  v_time text;
  v_staff_id text;
  v_client_id text;
  v_customer_id text;
  v_appointment_id text;
  v_end_time text;
  v_start_minutes integer;
  v_end_minutes integer;
  v_hh text;
  v_mm text;
  v_history jsonb;
BEGIN
  v_name := btrim(COALESCE(p_customer_name, ''));
  v_phone := btrim(COALESCE(p_phone, ''));
  v_email := btrim(COALESCE(p_email, ''));
  v_date := btrim(COALESCE(p_date, ''));
  v_time := btrim(COALESCE(p_time, ''));

  IF btrim(COALESCE(p_outlet_id, '')) = ''
     OR btrim(COALESCE(p_service_id, '')) = ''
     OR v_date = ''
     OR v_time = ''
     OR v_name = ''
     OR v_phone = '' THEN
    RAISE EXCEPTION 'outletId, serviceId, date, time, customerName, and phone are required.'
      USING ERRCODE = '22023';
  END IF;

  IF char_length(v_name) > 200 OR char_length(v_phone) > 40 OR char_length(v_email) > 200 THEN
    RAISE EXCEPTION 'Input too long.'
      USING ERRCODE = '22023';
  END IF;

  IF v_date !~ '^\d{4}-\d{2}-\d{2}$' THEN
    RAISE EXCEPTION 'Invalid date format.'
      USING ERRCODE = '22023';
  END IF;

  IF v_time !~ '^\d{1,2}:\d{2}$' THEN
    RAISE EXCEPTION 'Invalid time format.'
      USING ERRCODE = '22023';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM outlets
    WHERE outlet_id = p_outlet_id AND COALESCE(is_active, true) = true
  ) INTO v_outlet_ok;

  IF NOT v_outlet_ok THEN
    RAISE EXCEPTION 'Outlet not found.'
      USING ERRCODE = 'P0002';
  END IF;

  SELECT COALESCE(duration, 60) INTO v_duration
  FROM services
  WHERE id = p_service_id
    AND outlet_id = p_outlet_id
    AND COALESCE(is_visible, true) = true;

  IF v_duration IS NULL THEN
    RAISE EXCEPTION 'Service not found or does not belong to this outlet.'
      USING ERRCODE = 'P0002';
  END IF;

  -- Resolve staff: valid provided id → else first staff for outlet → else 'unassigned'
  v_staff_id := 'unassigned';
  IF p_staff_id IS NOT NULL AND btrim(p_staff_id) <> '' THEN
    IF EXISTS (
      SELECT 1 FROM staff
      WHERE id = btrim(p_staff_id)
        AND lower(btrim(outlet_id)) = lower(btrim(p_outlet_id))
    ) THEN
      v_staff_id := btrim(p_staff_id);
    ELSE
      SELECT id INTO v_staff_id
      FROM staff
      WHERE outlet_id = p_outlet_id
      ORDER BY name
      LIMIT 1;
      v_staff_id := COALESCE(v_staff_id, 'unassigned');
    END IF;
  ELSE
    SELECT id INTO v_staff_id
    FROM staff
    WHERE outlet_id = p_outlet_id
    ORDER BY name
    LIMIT 1;
    v_staff_id := COALESCE(v_staff_id, 'unassigned');
  END IF;

  -- Find or create CRM client by outlet + phone
  SELECT id INTO v_client_id
  FROM clients
  WHERE outlet_id = p_outlet_id AND phone = v_phone
  LIMIT 1;

  IF v_client_id IS NULL THEN
    v_client_id := replace(gen_random_uuid()::text, '-', '');
    INSERT INTO clients (id, outlet_id, name, email, phone, notes, points)
    VALUES (v_client_id, p_outlet_id, v_name, v_email, v_phone, 'Public booking', 0);
  END IF;

  -- Authenticated JWT only (ignore client-supplied p_auth_uid)
  IF auth.uid() IS NOT NULL THEN
    v_customer_id := auth.uid()::text;
    INSERT INTO frontend_customers (
      id, outlet_id, name, phone, email, client_id, source, created_at, updated_at
    ) VALUES (
      v_customer_id, p_outlet_id, v_name, v_phone, v_email, v_client_id, 'public-booking', now(), now()
    )
    ON CONFLICT (id) DO UPDATE SET
      outlet_id = EXCLUDED.outlet_id,
      name = EXCLUDED.name,
      phone = EXCLUDED.phone,
      email = EXCLUDED.email,
      client_id = EXCLUDED.client_id,
      updated_at = now();
  ELSE
    SELECT id INTO v_customer_id
    FROM frontend_customers
    WHERE outlet_id = p_outlet_id AND phone = v_phone
    LIMIT 1;

    IF v_customer_id IS NULL THEN
      v_customer_id := replace(gen_random_uuid()::text, '-', '');
      INSERT INTO frontend_customers (
        id, outlet_id, name, phone, email, client_id,
        booking_history_refs, source, created_at, updated_at
      ) VALUES (
        v_customer_id, p_outlet_id, v_name, v_phone, v_email, v_client_id,
        '[]'::jsonb, 'public-booking', now(), now()
      );
    ELSE
      UPDATE frontend_customers
      SET name = v_name,
          email = v_email,
          client_id = v_client_id,
          updated_at = now()
      WHERE id = v_customer_id;
    END IF;
  END IF;

  v_start_minutes := public.parse_time_to_minutes(v_time);
  v_end_minutes := v_start_minutes + v_duration;
  v_hh := lpad(((v_end_minutes / 60) % 24)::text, 2, '0');
  v_mm := lpad((v_end_minutes % 60)::text, 2, '0');
  v_end_time := v_hh || ':' || v_mm;

  v_appointment_id := replace(gen_random_uuid()::text, '-', '');
  INSERT INTO appointments (
    id, outlet_id, client_id, customer_id, staff_id, service_id,
    date, time, end_time, status, source, created_at
  ) VALUES (
    v_appointment_id, p_outlet_id, v_client_id, v_customer_id, v_staff_id, p_service_id,
    v_date, v_time, v_end_time, 'scheduled', 'public-booking', now()
  );

  SELECT COALESCE(booking_history_refs, '[]'::jsonb) INTO v_history
  FROM frontend_customers WHERE id = v_customer_id;

  IF jsonb_typeof(v_history) <> 'array' THEN
    v_history := '[]'::jsonb;
  END IF;

  UPDATE frontend_customers
  SET booking_history_refs = v_history || to_jsonb(v_appointment_id),
      last_appointment_id = v_appointment_id,
      last_booked_at = now(),
      updated_at = now()
  WHERE id = v_customer_id;

  RETURN jsonb_build_object(
    'success', true,
    'appointment_id', v_appointment_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_public_booking(text, text, text, text, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_public_booking(text, text, text, text, text, text, text, text, text) TO anon, authenticated;
