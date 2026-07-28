-- Public reviews write + customer profile helpers for booking auth.
-- Reviews require authenticated JWT (auth.uid()); anon cannot call.

CREATE OR REPLACE FUNCTION public.submit_public_review(
  p_outlet_id text,
  p_author text DEFAULT NULL,
  p_text text DEFAULT NULL,
  p_rating integer DEFAULT 5
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid text;
  v_author text;
  v_text text;
  v_rating integer;
  v_reviews jsonb;
  v_entry jsonb;
BEGIN
  v_uid := auth.uid()::text;
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Sign in to leave a review.'
      USING ERRCODE = '42501';
  END IF;

  v_text := btrim(COALESCE(p_text, ''));
  IF btrim(COALESCE(p_outlet_id, '')) = '' OR char_length(v_text) < 3 THEN
    RAISE EXCEPTION 'outletId and a short review text are required.'
      USING ERRCODE = '22023';
  END IF;

  IF char_length(v_text) > 2000 THEN
    RAISE EXCEPTION 'Review text too long.'
      USING ERRCODE = '22023';
  END IF;

  v_rating := COALESCE(p_rating, 5);
  IF v_rating < 1 THEN v_rating := 1; END IF;
  IF v_rating > 5 THEN v_rating := 5; END IF;

  v_author := btrim(COALESCE(p_author, ''));
  IF v_author = '' THEN
    v_author := COALESCE(
      NULLIF(btrim(COALESCE(auth.jwt() ->> 'email', '')), ''),
      'Guest'
    );
    IF position('@' in v_author) > 0 THEN
      v_author := split_part(v_author, '@', 1);
    END IF;
  END IF;
  v_author := left(v_author, 80);

  IF NOT EXISTS (
    SELECT 1 FROM outlets
    WHERE outlet_id = p_outlet_id AND COALESCE(is_active, true) = true
  ) THEN
    RAISE EXCEPTION 'Outlet not found.'
      USING ERRCODE = 'P0002';
  END IF;

  SELECT COALESCE(reviews, '[]'::jsonb) INTO v_reviews
  FROM outlets WHERE outlet_id = p_outlet_id;

  IF jsonb_typeof(v_reviews) <> 'array' THEN
    v_reviews := '[]'::jsonb;
  END IF;

  v_entry := jsonb_build_object(
    'author', v_author,
    'text', v_text,
    'rating', v_rating,
    'createdAt', to_jsonb(now() AT TIME ZONE 'utc'),
    'uid', v_uid
  );

  UPDATE outlets
  SET reviews = v_reviews || jsonb_build_array(v_entry),
      updated_at = now()
  WHERE outlet_id = p_outlet_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION public.submit_public_review(text, text, text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_public_review(text, text, text, integer) TO authenticated;

-- Upsert booking-site customer profile keyed by auth.uid()
CREATE OR REPLACE FUNCTION public.upsert_frontend_customer_profile(
  p_email text DEFAULT NULL,
  p_name text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid text;
  v_email text;
  v_name text;
BEGIN
  v_uid := auth.uid()::text;
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Sign in required.'
      USING ERRCODE = '42501';
  END IF;

  v_email := lower(btrim(COALESCE(p_email, COALESCE(auth.jwt() ->> 'email', ''))));
  v_name := btrim(COALESCE(p_name, ''));
  IF v_name = '' AND v_email <> '' THEN
    v_name := split_part(v_email, '@', 1);
  END IF;

  INSERT INTO frontend_customers (
    id, name, email, source, booking_history_refs, created_at, updated_at
  ) VALUES (
    v_uid,
    NULLIF(v_name, ''),
    NULLIF(v_email, ''),
    'public-booking',
    '[]'::jsonb,
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    name = COALESCE(EXCLUDED.name, frontend_customers.name),
    email = COALESCE(EXCLUDED.email, frontend_customers.email),
    updated_at = now();

  RETURN jsonb_build_object('success', true, 'id', v_uid);
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_frontend_customer_profile(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_frontend_customer_profile(text, text) TO authenticated;

-- Authenticated customers may read their own profile row
DROP POLICY IF EXISTS "frontend_customers_select_own" ON frontend_customers;
CREATE POLICY "frontend_customers_select_own"
  ON frontend_customers FOR SELECT
  TO authenticated
  USING (id = auth.uid()::text);

GRANT SELECT ON frontend_customers TO authenticated;
