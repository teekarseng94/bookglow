-- Stop anonymous booking from being blocked by the signed-in account check,
-- and stop any signed-in user from reading every outlet's staff or voucher secrets.
-- Public booking selects staff columns by name and does not need email or phone.
-- Not applied to production by the pre-production audit. Apply only after review.

DROP POLICY IF EXISTS "staff_public_select" ON public.staff;
DROP POLICY IF EXISTS "staff_anon_booking_select" ON public.staff;
DROP POLICY IF EXISTS "staff_authenticated_select" ON public.staff;

CREATE POLICY "staff_anon_booking_select"
  ON public.staff
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "staff_authenticated_select"
  ON public.staff
  FOR SELECT
  TO authenticated
  USING (
    public.is_current_account_enabled()
    AND (
      public.is_portal_platform_admin()
      OR public.is_platform_admin()
      OR public.is_outlet_member(outlet_id)
      OR outlet_id = public.current_portal_outlet_id()
    )
  );

REVOKE SELECT ON public.staff FROM anon;
GRANT SELECT (
  id,
  outlet_id,
  name,
  role,
  profile_picture,
  photo_url,
  qualified_services
) ON public.staff TO anon;

DROP POLICY IF EXISTS "vouchers_public_select" ON public.vouchers;
DROP POLICY IF EXISTS "vouchers_anon_catalog" ON public.vouchers;
DROP POLICY IF EXISTS "vouchers_authenticated_select" ON public.vouchers;

CREATE POLICY "vouchers_anon_catalog"
  ON public.vouchers
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "vouchers_authenticated_select"
  ON public.vouchers
  FOR SELECT
  TO authenticated
  USING (
    public.is_current_account_enabled()
    AND (
      public.is_portal_platform_admin()
      OR public.is_platform_admin()
      OR public.is_outlet_member(outlet_id)
      OR outlet_id = public.current_portal_outlet_id()
    )
  );

REVOKE SELECT ON public.vouchers FROM anon;
GRANT SELECT (
  id,
  outlet_id,
  name,
  price,
  service_ids,
  expiry_date,
  status,
  slug,
  purchased_at,
  redeemed_at,
  created_at
) ON public.vouchers TO anon;
