-- Google Places API (New) as the default Google Reviews connection provider.
-- Extends google_business_connections so Places and Business Profile can share
-- one outlet-scoped row without duplicating tables.
--
-- Place IDs may be stored. Review payloads continue to use the short-lived
-- google_review_page_cache only (never a permanent Places content store).

ALTER TABLE public.google_business_connections
  ADD COLUMN IF NOT EXISTS connection_provider text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'google_business_connections_provider_check'
      AND conrelid = 'public.google_business_connections'::regclass
  ) THEN
    ALTER TABLE public.google_business_connections
      ADD CONSTRAINT google_business_connections_provider_check
      CHECK (
        connection_provider IS NULL
        OR connection_provider IN ('google_places', 'google_business_profile')
      );
  END IF;
END $$;

COMMENT ON COLUMN public.google_business_connections.connection_provider IS
  'google_places (default public listing) or google_business_profile (OAuth managed location).';

COMMENT ON COLUMN public.google_business_connections.google_place_id IS
  'Google Place ID for the listing. Primary identifier for google_places connections; optional metadata for Business Profile.';

-- Existing OAuth-connected rows are Business Profile integrations.
UPDATE public.google_business_connections
SET connection_provider = 'google_business_profile'
WHERE connection_provider IS NULL
  AND refresh_token_encrypted IS NOT NULL;

UPDATE public.google_business_connections
SET connection_provider = 'google_places'
WHERE connection_provider IS NULL
  AND google_place_id IS NOT NULL
  AND refresh_token_encrypted IS NULL
  AND status = 'connected';
