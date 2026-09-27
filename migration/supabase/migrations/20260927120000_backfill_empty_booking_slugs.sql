-- New merchant shops with CJK names or a wiped Settings path can end up with
-- an empty booking_slug. The merchant app then advertises /book/outlet_<uuid>,
-- which truncates on phone and does not resolve on the public booking page.

DO $$
DECLARE
  r record;
  v_base text;
  v_slug text;
BEGIN
  FOR r IN
    SELECT outlet_id, name
    FROM public.outlets
    WHERE nullif(trim(booking_slug), '') IS NULL
  LOOP
    v_base := coalesce(nullif(public.slugify_booking_name(coalesce(r.name, '')), ''), 'business');
    IF v_base !~ '^[a-zA-Z]' THEN
      v_base := 'b-' || v_base;
    END IF;
    v_slug := v_base || '-' || substr(r.outlet_id, greatest(length(r.outlet_id) - 5, 1));
    WHILE EXISTS (
      SELECT 1 FROM public.outlets
      WHERE lower(booking_slug) = lower(v_slug) AND outlet_id <> r.outlet_id
    ) LOOP
      v_slug := v_base || '-' || substr(encode(gen_random_bytes(4), 'hex'), 1, 8);
    END LOOP;
    UPDATE public.outlets
      SET booking_slug = v_slug, updated_at = now()
      WHERE outlet_id = r.outlet_id;
  END LOOP;
END $$;
