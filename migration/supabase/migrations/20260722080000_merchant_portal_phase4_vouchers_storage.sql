-- Merchant portal Phase 4: vouchers, api_integrations, Storage bucket + policies
-- Public voucher purchase/redeem via SECURITY DEFINER RPCs (BuyVoucher / RedeemVoucher pages).

CREATE TABLE IF NOT EXISTS vouchers (
  id TEXT PRIMARY KEY,
  outlet_id TEXT NOT NULL REFERENCES outlets(outlet_id),
  name TEXT NOT NULL DEFAULT '',
  price NUMERIC(12,2) DEFAULT 0,
  service_ids JSONB DEFAULT '[]'::jsonb,
  expiry_date TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  slug TEXT UNIQUE,
  redemption_id TEXT,
  secret_code TEXT,
  purchased_at TIMESTAMPTZ,
  redeemed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vouchers_outlet ON vouchers (outlet_id);
CREATE INDEX IF NOT EXISTS idx_vouchers_slug ON vouchers (slug);
CREATE INDEX IF NOT EXISTS idx_vouchers_redemption ON vouchers (redemption_id);

CREATE TABLE IF NOT EXISTS api_integrations (
  outlet_id TEXT PRIMARY KEY REFERENCES outlets(outlet_id),
  api_key_hash TEXT,
  key_prefix TEXT,
  webhook_url TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_integrations ENABLE ROW LEVEL SECURITY;

-- Public can read vouchers (buy/redeem pages; same openness as Firestore rules for these flows)
DROP POLICY IF EXISTS "vouchers_public_select" ON vouchers;
CREATE POLICY "vouchers_public_select"
  ON vouchers FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "vouchers_merchant_insert" ON vouchers;
CREATE POLICY "vouchers_merchant_insert"
  ON vouchers FOR INSERT TO authenticated
  WITH CHECK (
    public.is_portal_platform_admin()
    OR outlet_id = public.current_portal_outlet_id()
  );

DROP POLICY IF EXISTS "vouchers_merchant_update" ON vouchers;
CREATE POLICY "vouchers_merchant_update"
  ON vouchers FOR UPDATE TO authenticated
  USING (
    public.is_portal_platform_admin()
    OR outlet_id = public.current_portal_outlet_id()
  )
  WITH CHECK (
    public.is_portal_platform_admin()
    OR outlet_id = public.current_portal_outlet_id()
  );

DROP POLICY IF EXISTS "vouchers_merchant_delete" ON vouchers;
CREATE POLICY "vouchers_merchant_delete"
  ON vouchers FOR DELETE TO authenticated
  USING (
    public.is_portal_platform_admin()
    OR outlet_id = public.current_portal_outlet_id()
  );

DROP POLICY IF EXISTS "vouchers_service_role" ON vouchers;
CREATE POLICY "vouchers_service_role"
  ON vouchers FOR ALL TO service_role USING (true) WITH CHECK (true);

GRANT SELECT ON vouchers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON vouchers TO authenticated;

-- API integrations: outlet merchants only
DROP POLICY IF EXISTS "api_integrations_merchant_select" ON api_integrations;
CREATE POLICY "api_integrations_merchant_select"
  ON api_integrations FOR SELECT TO authenticated
  USING (
    public.is_portal_platform_admin()
    OR outlet_id = public.current_portal_outlet_id()
  );

DROP POLICY IF EXISTS "api_integrations_merchant_upsert" ON api_integrations;
CREATE POLICY "api_integrations_merchant_upsert"
  ON api_integrations FOR INSERT TO authenticated
  WITH CHECK (
    public.is_portal_platform_admin()
    OR outlet_id = public.current_portal_outlet_id()
  );

DROP POLICY IF EXISTS "api_integrations_merchant_update" ON api_integrations;
CREATE POLICY "api_integrations_merchant_update"
  ON api_integrations FOR UPDATE TO authenticated
  USING (
    public.is_portal_platform_admin()
    OR outlet_id = public.current_portal_outlet_id()
  )
  WITH CHECK (
    public.is_portal_platform_admin()
    OR outlet_id = public.current_portal_outlet_id()
  );

DROP POLICY IF EXISTS "api_integrations_service_role" ON api_integrations;
CREATE POLICY "api_integrations_service_role"
  ON api_integrations FOR ALL TO service_role USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON api_integrations TO authenticated;

-- Public voucher purchase: allocate redemption id + secret code (idempotent if already allocated)
CREATE OR REPLACE FUNCTION public.public_voucher_purchase(p_voucher_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v vouchers%ROWTYPE;
  new_redemption TEXT;
  new_code TEXT;
BEGIN
  SELECT * INTO v FROM vouchers WHERE id = p_voucher_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Voucher not found.';
  END IF;
  IF v.status IS DISTINCT FROM 'active' THEN
    RAISE EXCEPTION 'Voucher is no longer available.';
  END IF;
  IF v.expiry_date IS NOT NULL AND length(trim(v.expiry_date)) > 0 THEN
    IF (v.expiry_date::date + time '23:59:59') < now() THEN
      RAISE EXCEPTION 'Voucher has expired and can no longer be purchased.';
    END IF;
  END IF;
  IF v.secret_code IS NOT NULL AND v.redemption_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'redemptionId', v.redemption_id,
      'secretCode', v.secret_code
    );
  END IF;

  new_redemption := 'rv-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12);
  new_code := lpad((floor(random() * 1000000))::int::text, 6, '0');

  UPDATE vouchers
  SET redemption_id = new_redemption,
      secret_code = new_code
  WHERE id = p_voucher_id;

  RETURN jsonb_build_object(
    'redemptionId', new_redemption,
    'secretCode', new_code
  );
END;
$$;

REVOKE ALL ON FUNCTION public.public_voucher_purchase(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_voucher_purchase(TEXT) TO anon, authenticated;

-- Public voucher redeem (after sold)
CREATE OR REPLACE FUNCTION public.public_voucher_confirm_redemption(p_voucher_id TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v vouchers%ROWTYPE;
BEGIN
  SELECT * INTO v FROM vouchers WHERE id = p_voucher_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Voucher not found.';
  END IF;
  IF v.status = 'redeemed' THEN
    RETURN;
  END IF;
  IF v.status IS DISTINCT FROM 'sold' THEN
    RAISE EXCEPTION 'Voucher must be purchased before redemption.';
  END IF;
  UPDATE vouchers
  SET status = 'redeemed',
      redeemed_at = now()
  WHERE id = p_voucher_id;
END;
$$;

REVOKE ALL ON FUNCTION public.public_voucher_confirm_redemption(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_voucher_confirm_redemption(TEXT) TO anon, authenticated;

-- Storage: public media for service/product/package/staff images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'outlet-media',
  'outlet-media',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Path convention: outlets/{outlet_id}/...
DROP POLICY IF EXISTS "outlet_media_public_select" ON storage.objects;
CREATE POLICY "outlet_media_public_select"
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'outlet-media');

DROP POLICY IF EXISTS "outlet_media_merchant_insert" ON storage.objects;
CREATE POLICY "outlet_media_merchant_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'outlet-media'
    AND (
      public.is_portal_platform_admin()
      OR (storage.foldername(name))[1] = 'outlets'
         AND (storage.foldername(name))[2] = public.current_portal_outlet_id()
    )
  );

DROP POLICY IF EXISTS "outlet_media_merchant_update" ON storage.objects;
CREATE POLICY "outlet_media_merchant_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'outlet-media'
    AND (
      public.is_portal_platform_admin()
      OR (storage.foldername(name))[1] = 'outlets'
         AND (storage.foldername(name))[2] = public.current_portal_outlet_id()
    )
  )
  WITH CHECK (
    bucket_id = 'outlet-media'
    AND (
      public.is_portal_platform_admin()
      OR (storage.foldername(name))[1] = 'outlets'
         AND (storage.foldername(name))[2] = public.current_portal_outlet_id()
    )
  );

DROP POLICY IF EXISTS "outlet_media_merchant_delete" ON storage.objects;
CREATE POLICY "outlet_media_merchant_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'outlet-media'
    AND (
      public.is_portal_platform_admin()
      OR (storage.foldername(name))[1] = 'outlets'
         AND (storage.foldername(name))[2] = public.current_portal_outlet_id()
    )
  );
