-- Public booking: appointments (internal) + get_public_available_slots RPC
-- Matches Cloud Function getPublicAvailableSlots behavior.
-- Anon cannot SELECT appointments directly; only call the RPC for HH:mm slots.

CREATE TABLE IF NOT EXISTS appointments (
  id TEXT PRIMARY KEY,
  outlet_id TEXT NOT NULL REFERENCES outlets(outlet_id),
  client_id TEXT,
  staff_id TEXT,
  service_id TEXT,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  end_time TEXT,
  status TEXT DEFAULT 'scheduled',
  reminder_sent BOOLEAN DEFAULT false,
  is_on_duty BOOLEAN DEFAULT false,
  source_sale_id TEXT,
  sale_id TEXT,
  source TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_appointments_outlet_date ON appointments (outlet_id, date);
CREATE INDEX IF NOT EXISTS idx_appointments_outlet_date_staff ON appointments (outlet_id, date, staff_id);

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- No anon/authenticated SELECT policies — public access only via RPC below.
DROP POLICY IF EXISTS "appointments_service_role" ON appointments;
CREATE POLICY "appointments_service_role"
  ON appointments FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.parse_time_to_minutes(time_str text)
RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  parts text[];
  h integer;
  m integer;
BEGIN
  IF time_str IS NULL OR btrim(time_str) = '' THEN
    RETURN 0;
  END IF;
  parts := string_to_array(btrim(time_str), ':');
  h := COALESCE(NULLIF(parts[1], '')::integer, 0);
  m := COALESCE(NULLIF(parts[2], '')::integer, 0);
  RETURN h * 60 + m;
EXCEPTION WHEN OTHERS THEN
  RETURN 0;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_public_available_slots(
  p_outlet_id text,
  p_service_id text,
  p_date text,
  p_staff_id text DEFAULT NULL
)
RETURNS text[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_business_hours jsonb;
  v_duration integer;
  v_day_key text;
  v_today_hours jsonb;
  v_open integer;
  v_close integer;
  v_minutes integer;
  v_slot_end integer;
  v_slots text[] := ARRAY[]::text[];
  v_hh text;
  v_mm text;
  v_overlaps boolean;
BEGIN
  IF p_outlet_id IS NULL OR btrim(p_outlet_id) = ''
     OR p_service_id IS NULL OR btrim(p_service_id) = ''
     OR p_date IS NULL OR btrim(p_date) = '' THEN
    RETURN v_slots;
  END IF;

  SELECT business_hours INTO v_business_hours
  FROM outlets
  WHERE outlet_id = p_outlet_id AND COALESCE(is_active, true) = true;

  IF v_business_hours IS NULL THEN
    RETURN v_slots;
  END IF;

  SELECT COALESCE(duration, 60) INTO v_duration
  FROM services
  WHERE id = p_service_id AND outlet_id = p_outlet_id;

  IF v_duration IS NULL THEN
    RETURN v_slots;
  END IF;

  v_day_key := CASE EXTRACT(DOW FROM p_date::date)::integer
    WHEN 0 THEN 'sunday'
    WHEN 1 THEN 'monday'
    WHEN 2 THEN 'tuesday'
    WHEN 3 THEN 'wednesday'
    WHEN 4 THEN 'thursday'
    WHEN 5 THEN 'friday'
    ELSE 'saturday'
  END;
  v_today_hours := v_business_hours -> v_day_key;

  IF v_today_hours IS NULL OR (v_today_hours ? 'isOpen' AND (v_today_hours ->> 'isOpen')::boolean = false) THEN
    RETURN v_slots;
  END IF;

  v_open := public.parse_time_to_minutes(v_today_hours ->> 'open');
  v_close := public.parse_time_to_minutes(v_today_hours ->> 'close');
  IF v_close <= v_open THEN
    RETURN v_slots;
  END IF;

  v_minutes := v_open;
  WHILE v_minutes < v_close LOOP
    v_slot_end := v_minutes + v_duration;
    IF v_slot_end > v_close THEN
      EXIT;
    END IF;

    SELECT EXISTS (
      SELECT 1
      FROM appointments a
      WHERE a.outlet_id = p_outlet_id
        AND a.date = p_date
        AND COALESCE(a.status, '') NOT IN ('cancelled', 'no-show')
        AND (
          p_staff_id IS NULL
          OR btrim(p_staff_id) = ''
          OR a.staff_id = p_staff_id
        )
        AND v_minutes < CASE
          WHEN public.parse_time_to_minutes(COALESCE(a.end_time, a.time))
               > public.parse_time_to_minutes(a.time)
          THEN public.parse_time_to_minutes(COALESCE(a.end_time, a.time))
          ELSE public.parse_time_to_minutes(a.time) + v_duration
        END
        AND v_slot_end > public.parse_time_to_minutes(a.time)
    ) INTO v_overlaps;

    IF NOT v_overlaps THEN
      v_hh := lpad((v_minutes / 60)::text, 2, '0');
      v_mm := lpad((v_minutes % 60)::text, 2, '0');
      v_slots := array_append(v_slots, v_hh || ':' || v_mm);
    END IF;

    v_minutes := v_minutes + 30;
  END LOOP;

  RETURN v_slots;
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_available_slots(text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_available_slots(text, text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.parse_time_to_minutes(text) TO anon, authenticated;
