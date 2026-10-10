-- Two faults in the public booking path, both customer-facing.
--
-- 1. A multi-service booking sent one RPC call per service in parallel. Each
--    ran in its own transaction, so when the second was rejected the first was
--    already committed: the visitor saw "Booking failed" while an appointment
--    existed. Every service was also sent at the same start time, which cannot
--    work when they share a therapist.
--
-- 2. "Any available" did not look for an available therapist. It took the first
--    staff row by name and let the overlap trigger reject it, so a visitor was
--    turned away at a busy hour even when other therapists were free.
--
-- The whole visit now books in one transaction through
-- create_public_booking_batch. Services sharing a therapist are chained
-- back-to-back from the requested time; services on different therapists keep
-- the requested time and run in parallel.

CREATE OR REPLACE FUNCTION public.minutes_to_booking_time(p_minutes integer)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT lpad((((p_minutes / 60) % 24))::text, 2, '0') || ':' || lpad((p_minutes % 60)::text, 2, '0');
$$;

-- Used to choose a therapist, not to enforce anything: the insert trigger
-- appointments_reject_staff_overlap stays the authority on double booking.
CREATE OR REPLACE FUNCTION public.staff_free_for_slot(
  p_outlet_id text,
  p_staff_id text,
  p_date text,
  p_start_minutes integer,
  p_end_minutes integer
)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT NOT EXISTS (
    SELECT 1
    FROM public.appointments a
    WHERE a.outlet_id = p_outlet_id
      AND a.staff_id = p_staff_id
      AND a.date = p_date
      AND lower(coalesce(a.status, '')) NOT IN ('cancelled', 'no-show', 'no_show', 'canceled')
      AND p_start_minutes < (
        CASE
          WHEN public.parse_time_to_minutes(coalesce(nullif(a.end_time, ''), a.time))
               > public.parse_time_to_minutes(a.time)
          THEN public.parse_time_to_minutes(coalesce(nullif(a.end_time, ''), a.time))
          ELSE public.parse_time_to_minutes(a.time) + coalesce(
            (SELECT s.duration FROM public.services s WHERE s.id = a.service_id),
            30
          )
        END
      )
      AND public.parse_time_to_minutes(a.time) < p_end_minutes
  );
$$;

-- p_items: [{"service_id": "...", "staff_id": "..." | null}, ...] in the order
-- the visitor chose them. A blank or unknown staff_id means "any available".
CREATE OR REPLACE FUNCTION public.create_public_booking_batch(
  p_outlet_id text,
  p_date text,
  p_time text,
  p_customer_name text,
  p_phone text,
  p_items jsonb,
  p_email text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name text;
  v_phone text;
  v_email text;
  v_date text;
  v_time text;
  v_jwt_uid text;
  v_outlet_ok boolean;
  v_item_count integer;
  v_base_start integer;
  v_item jsonb;
  v_service_id text;
  v_service_name text;
  v_requested_staff text;
  v_staff_id text;
  v_duration integer;
  v_start integer;
  v_end integer;
  v_cursors jsonb := '{}'::jsonb;
  v_client_id text;
  v_customer_id text;
  v_appointment_id text;
  v_appointments jsonb := '[]'::jsonb;
  v_ids jsonb := '[]'::jsonb;
  v_history jsonb;
BEGIN
  v_name := btrim(coalesce(p_customer_name, ''));
  v_phone := btrim(coalesce(p_phone, ''));
  v_email := btrim(coalesce(p_email, ''));
  v_date := btrim(coalesce(p_date, ''));
  v_time := btrim(coalesce(p_time, ''));
  v_jwt_uid := auth.uid()::text;

  IF jsonb_typeof(p_items) <> 'array' THEN
    RAISE EXCEPTION 'Please select at least one service.' USING ERRCODE = '22023';
  END IF;
  v_item_count := jsonb_array_length(p_items);
  IF v_item_count < 1 OR v_item_count > 10 THEN
    RAISE EXCEPTION 'Please select between 1 and 10 services.' USING ERRCODE = '22023';
  END IF;

  IF btrim(coalesce(p_outlet_id, '')) = ''
     OR v_date = '' OR v_time = '' OR v_name = '' OR v_phone = '' THEN
    RAISE EXCEPTION 'outletId, date, time, customerName, and phone are required.'
      USING ERRCODE = '22023';
  END IF;

  IF char_length(v_name) > 200 OR char_length(v_phone) > 40 OR char_length(v_email) > 200 THEN
    RAISE EXCEPTION 'Input too long.' USING ERRCODE = '22023';
  END IF;

  IF v_date !~ '^\d{4}-\d{2}-\d{2}$' THEN
    RAISE EXCEPTION 'Invalid date format.' USING ERRCODE = '22023';
  END IF;

  IF v_time !~ '^\d{1,2}:\d{2}$' THEN
    RAISE EXCEPTION 'Invalid time format.' USING ERRCODE = '22023';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM outlets
    WHERE outlet_id = p_outlet_id AND coalesce(is_active, true) = true
  ) INTO v_outlet_ok;

  IF NOT v_outlet_ok THEN
    RAISE EXCEPTION 'Outlet not found.' USING ERRCODE = 'P0002';
  END IF;

  -- Serialises the whole outlet-day, so two visitors cannot be handed the same
  -- free therapist from the same read. Always taken before the per-staff lock
  -- in the insert trigger, so the two lock in a consistent order.
  PERFORM pg_advisory_xact_lock(hashtextextended(p_outlet_id || '|' || v_date, 0));

  v_base_start := public.parse_time_to_minutes(v_time);

  SELECT id INTO v_client_id
  FROM clients
  WHERE outlet_id = p_outlet_id AND phone = v_phone
  LIMIT 1;

  IF v_client_id IS NULL THEN
    v_client_id := replace(gen_random_uuid()::text, '-', '');
    INSERT INTO clients (id, outlet_id, name, email, phone, notes, points)
    VALUES (v_client_id, p_outlet_id, v_name, v_email, v_phone, 'Public booking', 0);
  END IF;

  -- Authenticated JWT only (a client-supplied id is never trusted).
  IF v_jwt_uid IS NOT NULL THEN
    v_customer_id := v_jwt_uid;
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
      SET name = v_name, email = v_email, client_id = v_client_id, updated_at = now()
      WHERE id = v_customer_id;
    END IF;
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    v_service_id := btrim(coalesce(v_item->>'service_id', ''));
    v_requested_staff := btrim(coalesce(v_item->>'staff_id', ''));

    IF v_service_id = '' THEN
      RAISE EXCEPTION 'A selected service is missing.' USING ERRCODE = '22023';
    END IF;

    SELECT coalesce(duration, 60), name INTO v_duration, v_service_name
    FROM services
    WHERE id = v_service_id
      AND outlet_id = p_outlet_id
      AND coalesce(is_visible, true) = true;

    IF v_duration IS NULL THEN
      RAISE EXCEPTION 'Service not found or does not belong to this outlet.'
        USING ERRCODE = 'P0002';
    END IF;

    IF v_requested_staff <> '' AND EXISTS (
      SELECT 1 FROM staff
      WHERE id = v_requested_staff
        AND lower(btrim(outlet_id)) = lower(btrim(p_outlet_id))
    ) THEN
      -- Named therapist: a second service with the same person follows the
      -- first instead of colliding with it.
      v_staff_id := v_requested_staff;
      v_start := coalesce((v_cursors->>v_staff_id)::integer, v_base_start);
    ELSE
      -- Any available: someone qualified and genuinely free, not already taken
      -- earlier in this same visit. An empty qualified_services means the
      -- therapist covers everything, matching the merchant and booking UIs.
      v_start := v_base_start;
      SELECT s.id INTO v_staff_id
      FROM staff s
      WHERE s.outlet_id = p_outlet_id
        AND (v_cursors->>s.id) IS NULL
        AND (
          s.qualified_services IS NULL
          OR jsonb_typeof(s.qualified_services) <> 'array'
          OR jsonb_array_length(s.qualified_services) = 0
          OR s.qualified_services ? v_service_id
        )
        AND public.staff_free_for_slot(p_outlet_id, s.id, v_date, v_start, v_start + v_duration)
      ORDER BY s.name
      LIMIT 1;

      IF v_staff_id IS NULL THEN
        RAISE EXCEPTION 'No therapist is free for % at that time. Please choose another time.',
          coalesce(nullif(v_service_name, ''), 'that service')
          USING ERRCODE = 'unique_violation';
      END IF;
    END IF;

    v_end := v_start + v_duration;
    v_appointment_id := replace(gen_random_uuid()::text, '-', '');

    INSERT INTO appointments (
      id, outlet_id, client_id, customer_id, staff_id, service_id,
      date, time, end_time, status, source, created_at
    ) VALUES (
      v_appointment_id, p_outlet_id, v_client_id, v_customer_id, v_staff_id, v_service_id,
      v_date,
      public.minutes_to_booking_time(v_start),
      public.minutes_to_booking_time(v_end),
      'scheduled', 'public-booking', now()
    );

    v_cursors := v_cursors || jsonb_build_object(v_staff_id, v_end);
    v_ids := v_ids || to_jsonb(v_appointment_id);
    v_appointments := v_appointments || jsonb_build_object(
      'appointment_id', v_appointment_id,
      'service_id', v_service_id,
      'service_name', coalesce(v_service_name, ''),
      'staff_id', v_staff_id,
      'time', public.minutes_to_booking_time(v_start),
      'end_time', public.minutes_to_booking_time(v_end)
    );
  END LOOP;

  SELECT coalesce(booking_history_refs, '[]'::jsonb) INTO v_history
  FROM frontend_customers WHERE id = v_customer_id;

  IF jsonb_typeof(v_history) <> 'array' THEN
    v_history := '[]'::jsonb;
  END IF;

  UPDATE frontend_customers
  SET booking_history_refs = v_history || v_ids,
      last_appointment_id = v_appointments->-1->>'appointment_id',
      last_booked_at = now(),
      updated_at = now()
  WHERE id = v_customer_id;

  RETURN jsonb_build_object('success', true, 'appointments', v_appointments);
END;
$$;

-- Kept for any caller still booking a single service. Delegates so there is one
-- implementation of the booking rules. p_auth_uid stays ignored.
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
  v_result jsonb;
BEGIN
  v_result := public.create_public_booking_batch(
    p_outlet_id,
    p_date,
    p_time,
    p_customer_name,
    p_phone,
    jsonb_build_array(jsonb_build_object('service_id', p_service_id, 'staff_id', p_staff_id)),
    p_email
  );

  RETURN jsonb_build_object(
    'success', true,
    'appointment_id', v_result->'appointments'->0->>'appointment_id'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.minutes_to_booking_time(integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.staff_free_for_slot(text, text, text, integer, integer) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.create_public_booking_batch(text, text, text, text, text, jsonb, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_public_booking_batch(text, text, text, text, text, jsonb, text) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.create_public_booking(text, text, text, text, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_public_booking(text, text, text, text, text, text, text, text, text) TO anon, authenticated;
