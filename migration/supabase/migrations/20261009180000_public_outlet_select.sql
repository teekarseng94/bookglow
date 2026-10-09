-- Public booking resolves /book/:slug via SECURITY DEFINER, then reads the
-- outlet row as anon. Production currently returns no outlet rows to anon
-- (outlets_public_select_active missing), so the page shows "Outlet not found"
-- even when resolve_public_booking_outlet finds the shop.

DROP POLICY IF EXISTS "outlets_public_select_active" ON public.outlets;
CREATE POLICY "outlets_public_select_active"
  ON public.outlets FOR SELECT
  TO anon, authenticated
  USING (COALESCE(is_active, true) = true);

GRANT SELECT ON public.outlets TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_public_outlet(p_outlet_id text)
RETURNS TABLE (
  outlet_id text,
  name text,
  address_display text,
  phone_number text,
  phone text,
  timezone text,
  business_hours jsonb,
  reviews jsonb,
  service_categories jsonb,
  booking_slug text,
  is_active boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    o.outlet_id,
    o.name,
    o.address_display,
    o.phone_number,
    o.phone,
    o.timezone,
    o.business_hours,
    o.reviews,
    o.service_categories,
    o.booking_slug,
    o.is_active
  FROM public.outlets o
  WHERE o.outlet_id = btrim(COALESCE(p_outlet_id, ''))
    AND COALESCE(o.is_active, true) = true
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_public_outlet(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_outlet(text) TO anon, authenticated, service_role;
