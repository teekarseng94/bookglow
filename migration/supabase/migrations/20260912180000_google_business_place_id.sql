-- Persist the Google Place ID selected during Business Profile OAuth.
ALTER TABLE public.google_business_connections
  ADD COLUMN IF NOT EXISTS google_place_id text;

COMMENT ON COLUMN public.google_business_connections.google_place_id IS
  'Google Place ID for the connected Business Profile location. Not used for Places API reviews.';
