-- Public booking page must resolve /book/:segment for anonymous visitors.
-- The previous function only matched outlet_id / booking_slug exactly and was
-- granted to service_role, so the customer site never used it. Copied Settings
-- URLs (camelCase shop-name paths vs kebab onboarding slugs) then 404'd.

CREATE OR REPLACE FUNCTION public.resolve_public_booking_outlet(p_segment text)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_segment text := btrim(COALESCE(p_segment, ''));
  v_outlet text;
BEGIN
  IF v_segment = '' THEN RETURN NULL; END IF;
  BEGIN
    v_segment := replace(v_segment, '%2F', '/');
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  SELECT outlet_id INTO v_outlet
  FROM public.outlets
  WHERE outlet_id = v_segment AND COALESCE(is_active, true) = true
  LIMIT 1;
  IF v_outlet IS NOT NULL THEN RETURN v_outlet; END IF;

  SELECT outlet_id INTO v_outlet
  FROM public.outlets
  WHERE lower(COALESCE(booking_slug, '')) = lower(v_segment)
    AND COALESCE(is_active, true) = true
  LIMIT 1;
  IF v_outlet IS NOT NULL THEN RETURN v_outlet; END IF;

  BEGIN
    SELECT outlet_id INTO v_outlet
    FROM public.outlets
    WHERE COALESCE(is_active, true) = true
      AND (
        lower(public.booking_slug_from_name(name)) = lower(v_segment)
        OR lower(public.slugify_booking_name(name)) = lower(v_segment)
      )
    ORDER BY updated_at DESC NULLS LAST
    LIMIT 1;
  EXCEPTION WHEN undefined_function THEN
    NULL;
  END;

  RETURN v_outlet;
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_public_booking_outlet(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_public_booking_outlet(text) TO anon, authenticated, service_role;
