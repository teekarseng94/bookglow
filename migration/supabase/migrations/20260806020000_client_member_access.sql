-- Restore the client fields expected by the merchant portal and migrate client
-- access from the legacy users.outlet_id lookup to active outlet membership.

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS marketing_email_consent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS marketing_sms_consent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS marketing_whatsapp_consent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS marketing_unsubscribed_at timestamptz;

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "clients_merchant_select" ON public.clients;
CREATE POLICY "clients_merchant_select"
  ON public.clients FOR SELECT TO authenticated
  USING (
    public.is_platform_admin()
    OR public.is_outlet_member(outlet_id)
  );

DROP POLICY IF EXISTS "clients_merchant_insert" ON public.clients;
CREATE POLICY "clients_merchant_insert"
  ON public.clients FOR INSERT TO authenticated
  WITH CHECK (
    public.is_platform_admin()
    OR public.is_outlet_member(outlet_id)
  );

DROP POLICY IF EXISTS "clients_merchant_update" ON public.clients;
CREATE POLICY "clients_merchant_update"
  ON public.clients FOR UPDATE TO authenticated
  USING (
    public.is_platform_admin()
    OR public.is_outlet_member(outlet_id)
  )
  WITH CHECK (
    public.is_platform_admin()
    OR public.is_outlet_member(outlet_id)
  );

DROP POLICY IF EXISTS "clients_merchant_delete" ON public.clients;
CREATE POLICY "clients_merchant_delete"
  ON public.clients FOR DELETE TO authenticated
  USING (
    public.is_platform_admin()
    OR public.is_outlet_member(outlet_id)
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients TO authenticated;
