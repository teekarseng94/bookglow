-- Phase 5: enable Supabase Realtime for merchant portal collections.
-- Replica identity FULL so outlet_id filters work on UPDATE/DELETE.

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'clients',
    'staff',
    'services',
    'appointments',
    'transactions',
    'products',
    'packages',
    'rewards',
    'vouchers',
    'outlets'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I REPLICA IDENTITY FULL', t);
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END;
  END LOOP;
END $$;
