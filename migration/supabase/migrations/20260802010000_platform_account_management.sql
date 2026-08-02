-- Allow platform administrators to manage public.users workspace mappings.
-- Auth user discovery and invitations remain isolated in the account-admin Edge Function.

DROP POLICY IF EXISTS "users_platform_admin_manage" ON public.users;
CREATE POLICY "users_platform_admin_manage"
  ON public.users
  FOR ALL
  TO authenticated
  USING (public.is_portal_platform_admin())
  WITH CHECK (public.is_portal_platform_admin());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO authenticated;
