-- Google Business Profile read-only reviews integration.
--
-- Design notes:
--  * Every table here is service-role only. OAuth refresh tokens, access tokens
--    and Google account/location mappings must never be readable by `anon` or
--    `authenticated`; the merchant portal and the public booking page both read
--    through the `google-business` Edge Function instead.
--  * Review payloads are cached with a short TTL only (Google Business Profile
--    terms do not permit indefinite local copies). They are never written into
--    `outlets.reviews`, which remains BookGlow's own review store.
--  * Pagination cursors are server-issued opaque ids bound to one outlet and one
--    sort order, so a public caller can never replay a cursor against another
--    outlet or hand us an arbitrary Google page token.

-- ---------------------------------------------------------------------------
-- Connection state (one Google location per outlet)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.google_business_connections (
  outlet_id text PRIMARY KEY REFERENCES public.outlets(outlet_id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending_location'
    CHECK (status IN ('pending_location', 'connected', 'needs_reauth', 'error')),
  google_account_name text,
  google_location_name text,
  location_title text,
  location_address text,
  maps_uri text,
  refresh_token_encrypted text,
  access_token_encrypted text,
  access_token_expires_at timestamptz,
  granted_scope text,
  show_on_booking_page boolean NOT NULL DEFAULT false,
  average_rating numeric(3, 2),
  total_review_count integer,
  last_synced_at timestamptz,
  last_error_code text,
  last_error_message text,
  last_error_at timestamptz,
  connected_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  connected_email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.google_business_connections IS
  'Outlet to Google Business Profile location mapping plus encrypted OAuth tokens. Service role only.';

-- ---------------------------------------------------------------------------
-- OAuth state, bound to the authenticated merchant AND the outlet
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.google_oauth_states (
  state text PRIMARY KEY,
  outlet_id text NOT NULL REFERENCES public.outlets(outlet_id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  return_to text,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_google_oauth_states_expires ON public.google_oauth_states (expires_at);

-- ---------------------------------------------------------------------------
-- Server-issued pagination cursors
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.google_review_cursors (
  cursor_id text PRIMARY KEY,
  outlet_id text NOT NULL REFERENCES public.outlets(outlet_id) ON DELETE CASCADE,
  order_by text NOT NULL,
  page_token text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_google_review_cursors_outlet ON public.google_review_cursors (outlet_id);
CREATE INDEX IF NOT EXISTS idx_google_review_cursors_expires ON public.google_review_cursors (expires_at);

-- ---------------------------------------------------------------------------
-- Short-lived review page cache (TTL enforced on read and by purge)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.google_review_page_cache (
  outlet_id text NOT NULL REFERENCES public.outlets(outlet_id) ON DELETE CASCADE,
  order_by text NOT NULL,
  page_key text NOT NULL,
  payload jsonb NOT NULL,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  PRIMARY KEY (outlet_id, order_by, page_key)
);

CREATE INDEX IF NOT EXISTS idx_google_review_page_cache_expires ON public.google_review_page_cache (expires_at);

COMMENT ON TABLE public.google_review_page_cache IS
  'Temporary cache of Google review pages. Rows expire quickly and are deleted on disconnect; not a permanent copy.';

-- ---------------------------------------------------------------------------
-- Coarse rate limiting for outbound Google calls
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.google_api_rate_limits (
  bucket text PRIMARY KEY,
  window_started_at timestamptz NOT NULL DEFAULT now(),
  request_count integer NOT NULL DEFAULT 0
);

-- ---------------------------------------------------------------------------
-- RLS: deny by default for anon/authenticated. service_role bypasses RLS.
-- ---------------------------------------------------------------------------
ALTER TABLE public.google_business_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.google_oauth_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.google_review_cursors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.google_review_page_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.google_api_rate_limits ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.google_business_connections FORCE ROW LEVEL SECURITY;
ALTER TABLE public.google_oauth_states FORCE ROW LEVEL SECURITY;
ALTER TABLE public.google_review_cursors FORCE ROW LEVEL SECURITY;
ALTER TABLE public.google_review_page_cache FORCE ROW LEVEL SECURITY;

REVOKE ALL ON public.google_business_connections FROM anon, authenticated;
REVOKE ALL ON public.google_oauth_states FROM anon, authenticated;
REVOKE ALL ON public.google_review_cursors FROM anon, authenticated;
REVOKE ALL ON public.google_review_page_cache FROM anon, authenticated;
REVOKE ALL ON public.google_api_rate_limits FROM anon, authenticated;

GRANT ALL ON public.google_business_connections TO service_role;
GRANT ALL ON public.google_oauth_states TO service_role;
GRANT ALL ON public.google_review_cursors TO service_role;
GRANT ALL ON public.google_review_page_cache TO service_role;
GRANT ALL ON public.google_api_rate_limits TO service_role;

-- ---------------------------------------------------------------------------
-- Atomic fixed-window rate limiter. Returns true when the call is allowed.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.google_api_rate_limit_hit(
  p_bucket text,
  p_limit integer,
  p_window_seconds integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  INSERT INTO public.google_api_rate_limits (bucket, window_started_at, request_count)
  VALUES (p_bucket, now(), 1)
  ON CONFLICT (bucket) DO UPDATE
  SET
    window_started_at = CASE
      WHEN public.google_api_rate_limits.window_started_at < now() - make_interval(secs => p_window_seconds)
        THEN now()
      ELSE public.google_api_rate_limits.window_started_at
    END,
    request_count = CASE
      WHEN public.google_api_rate_limits.window_started_at < now() - make_interval(secs => p_window_seconds)
        THEN 1
      ELSE public.google_api_rate_limits.request_count + 1
    END
  RETURNING request_count INTO v_count;

  RETURN v_count <= p_limit;
END;
$$;

REVOKE ALL ON FUNCTION public.google_api_rate_limit_hit(text, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.google_api_rate_limit_hit(text, integer, integer) TO service_role;

-- ---------------------------------------------------------------------------
-- Expiry cleanup (safe to call from the Edge Function or a scheduled job)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.google_business_purge_expired()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.google_oauth_states WHERE expires_at < now();
  DELETE FROM public.google_review_cursors WHERE expires_at < now();
  DELETE FROM public.google_review_page_cache WHERE expires_at < now();
END;
$$;

REVOKE ALL ON FUNCTION public.google_business_purge_expired() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.google_business_purge_expired() TO service_role;

-- ---------------------------------------------------------------------------
-- Outlet admin check used by the Edge Function (covers the membership model and
-- the legacy public.users mapping, plus platform admins).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.can_manage_outlet_integrations(p_outlet_id text, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    EXISTS (
      SELECT 1 FROM public.outlet_members m
      WHERE m.outlet_id = p_outlet_id
        AND m.user_id = p_user_id
        AND m.status = 'active'
        AND m.role IN ('owner', 'admin')
    )
    OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.uid = p_user_id::text
        AND u.outlet_id = p_outlet_id
        AND lower(COALESCE(u.role, '')) IN ('admin', 'platform_admin')
    )
    OR EXISTS (
      SELECT 1 FROM public.platform_admins pa
      WHERE pa.user_id = p_user_id AND pa.status = 'active'
    );
$$;

REVOKE ALL ON FUNCTION public.can_manage_outlet_integrations(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_manage_outlet_integrations(text, uuid) TO service_role;

-- ---------------------------------------------------------------------------
-- Booking slug -> outlet id, resolved server side for public review requests so
-- a public caller can never target an arbitrary outlet or Google location.
-- ---------------------------------------------------------------------------
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

  RETURN v_outlet;
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_public_booking_outlet(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_public_booking_outlet(text) TO service_role;
