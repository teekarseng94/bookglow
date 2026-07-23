-- Allow cashiers to insert/select/delete Commission EXPENSE rows linked to a sale (POS flow).

DROP POLICY IF EXISTS "transactions_merchant_select" ON transactions;
CREATE POLICY "transactions_merchant_select"
  ON transactions FOR SELECT TO authenticated
  USING (
    public.is_portal_platform_admin()
    OR (
      outlet_id = public.current_portal_outlet_id()
      AND (
        public.is_portal_admin()
        OR type = 'SALE'
        OR (type = 'EXPENSE' AND category = 'Commission' AND parent_sale_id IS NOT NULL)
      )
    )
  );

DROP POLICY IF EXISTS "transactions_merchant_insert" ON transactions;
CREATE POLICY "transactions_merchant_insert"
  ON transactions FOR INSERT TO authenticated
  WITH CHECK (
    public.is_portal_platform_admin()
    OR (
      outlet_id = public.current_portal_outlet_id()
      AND (
        public.is_portal_admin()
        OR type = 'SALE'
        OR (type = 'EXPENSE' AND category = 'Commission' AND parent_sale_id IS NOT NULL)
      )
    )
  );

DROP POLICY IF EXISTS "transactions_merchant_delete" ON transactions;
CREATE POLICY "transactions_merchant_delete"
  ON transactions FOR DELETE TO authenticated
  USING (
    public.is_portal_platform_admin()
    OR (
      outlet_id = public.current_portal_outlet_id()
      AND (
        public.is_portal_admin()
        OR type = 'SALE'
        OR (type = 'EXPENSE' AND category = 'Commission' AND parent_sale_id IS NOT NULL)
      )
    )
  );
