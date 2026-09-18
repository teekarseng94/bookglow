-- Account deletion requests for Google Play compliance.
-- Requests are reviewed by platform administrators; no automatic cascading delete.

CREATE TABLE IF NOT EXISTS public.platform_account_deletion_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requesting_user_uid uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  outlet_id text REFERENCES public.outlets(outlet_id) ON DELETE SET NULL,
  email text NOT NULL CHECK (char_length(trim(email)) >= 5),
  requester_name text,
  business_name text,
  reason text CHECK (reason IS NULL OR char_length(reason) <= 2000),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_review', 'completed', 'rejected')),
  source text NOT NULL CHECK (source IN ('merchant_portal', 'android', 'web')),
  processing_notes text CHECK (processing_notes IS NULL OR char_length(processing_notes) <= 5000),
  processed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_account_deletion_requests_status
  ON public.platform_account_deletion_requests(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_account_deletion_requests_email
  ON public.platform_account_deletion_requests(lower(email), created_at DESC);

CREATE INDEX IF NOT EXISTS idx_account_deletion_requests_user
  ON public.platform_account_deletion_requests(requesting_user_uid, created_at DESC)
  WHERE requesting_user_uid IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_account_deletion_requests_active_email
  ON public.platform_account_deletion_requests(lower(email))
  WHERE status IN ('pending', 'in_review');

CREATE UNIQUE INDEX IF NOT EXISTS idx_account_deletion_requests_active_user
  ON public.platform_account_deletion_requests(requesting_user_uid)
  WHERE requesting_user_uid IS NOT NULL AND status IN ('pending', 'in_review');

ALTER TABLE public.platform_account_deletion_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.platform_account_deletion_requests FROM anon, authenticated;
GRANT SELECT ON public.platform_account_deletion_requests TO authenticated;
GRANT ALL ON public.platform_account_deletion_requests TO service_role;

CREATE POLICY platform_admin_read_account_deletion_requests
  ON public.platform_account_deletion_requests
  FOR SELECT TO authenticated
  USING ((SELECT public.is_platform_admin()));

CREATE POLICY service_manage_account_deletion_requests
  ON public.platform_account_deletion_requests
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.touch_account_deletion_request_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS account_deletion_requests_touch_updated_at
  ON public.platform_account_deletion_requests;
CREATE TRIGGER account_deletion_requests_touch_updated_at
  BEFORE UPDATE ON public.platform_account_deletion_requests
  FOR EACH ROW EXECUTE FUNCTION public.touch_account_deletion_request_updated_at();

CREATE OR REPLACE FUNCTION public.submit_merchant_account_deletion_request(
  p_reason text DEFAULT NULL,
  p_source text DEFAULT 'merchant_portal'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text;
  v_outlet_id text;
  v_name text;
  v_business text;
  v_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_source NOT IN ('merchant_portal', 'android') THEN
    RAISE EXCEPTION 'Invalid request source';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.platform_admins
    WHERE user_id = v_uid AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Platform administrator accounts cannot be deleted through the merchant app';
  END IF;

  SELECT u.email, u.outlet_id, u.display_name, o.name
  INTO v_email, v_outlet_id, v_name, v_business
  FROM public.users u
  LEFT JOIN public.outlets o ON o.outlet_id = u.outlet_id
  WHERE u.uid = v_uid::text;

  IF v_email IS NULL OR trim(v_email) = '' THEN
    SELECT email INTO v_email FROM auth.users WHERE id = v_uid;
  END IF;

  IF v_email IS NULL OR trim(v_email) = '' THEN
    RAISE EXCEPTION 'Account email could not be resolved';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.platform_account_deletion_requests
    WHERE requesting_user_uid = v_uid AND status IN ('pending', 'in_review')
  ) THEN
    RAISE EXCEPTION 'An account deletion request is already in progress for this account';
  END IF;

  INSERT INTO public.platform_account_deletion_requests (
    requesting_user_uid, outlet_id, email, requester_name, business_name,
    reason, status, source
  ) VALUES (
    v_uid, v_outlet_id, lower(trim(v_email)), v_name, v_business,
    nullif(trim(coalesce(p_reason, '')), ''), 'pending', p_source
  ) RETURNING id INTO v_id;

  INSERT INTO public.platform_audit_events (
    outlet_id, action, affected_target, actor_uid, actor_email, metadata, source, outcome
  ) VALUES (
    v_outlet_id,
    'account deletion requested',
    v_id::text,
    v_uid::text,
    v_email,
    jsonb_build_object('source', p_source),
    'account-deletion-rpc',
    'succeeded'
  );

  RETURN v_id;
END $$;

REVOKE ALL ON FUNCTION public.submit_merchant_account_deletion_request(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_merchant_account_deletion_request(text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.submit_public_account_deletion_request(
  p_email text,
  p_requester_name text DEFAULT NULL,
  p_business_name text DEFAULT NULL,
  p_reason text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text := lower(trim(coalesce(p_email, '')));
  v_id uuid;
  v_uid uuid;
  v_outlet_id text;
BEGIN
  IF v_email = '' OR position('@' in v_email) = 0 THEN
    RAISE EXCEPTION 'A valid account email is required';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.platform_account_deletion_requests
    WHERE lower(email) = v_email AND status IN ('pending', 'in_review')
  ) THEN
    RAISE EXCEPTION 'An account deletion request is already in progress for this email address';
  END IF;

  SELECT u.uid::uuid, u.outlet_id
  INTO v_uid, v_outlet_id
  FROM public.users u
  WHERE lower(coalesce(u.email, '')) = v_email
    AND u.uid ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  ORDER BY u.created_at DESC NULLS LAST
  LIMIT 1;

  INSERT INTO public.platform_account_deletion_requests (
    requesting_user_uid, outlet_id, email, requester_name, business_name,
    reason, status, source
  ) VALUES (
    v_uid, v_outlet_id, v_email,
    nullif(trim(coalesce(p_requester_name, '')), ''),
    nullif(trim(coalesce(p_business_name, '')), ''),
    nullif(trim(coalesce(p_reason, '')), ''),
    'pending', 'web'
  ) RETURNING id INTO v_id;

  RETURN v_id;
END $$;

REVOKE ALL ON FUNCTION public.submit_public_account_deletion_request(text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_public_account_deletion_request(text, text, text, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.platform_account_deletion_requests_page(
  p_search text DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_source text DEFAULT NULL,
  p_limit integer DEFAULT 25,
  p_offset integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rows jsonb;
  v_total bigint;
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Platform administrator access required';
  END IF;

  SELECT count(*) INTO v_total
  FROM public.platform_account_deletion_requests r
  LEFT JOIN public.outlets o ON o.outlet_id = r.outlet_id
  WHERE (p_status IS NULL OR p_status = '' OR r.status = p_status)
    AND (p_source IS NULL OR p_source = '' OR r.source = p_source)
    AND (
      p_search IS NULL OR p_search = '' OR
      r.email ILIKE '%' || p_search || '%' OR
      coalesce(r.requester_name, '') ILIKE '%' || p_search || '%' OR
      coalesce(r.business_name, '') ILIKE '%' || p_search || '%' OR
      coalesce(o.name, '') ILIKE '%' || p_search || '%' OR
      r.id::text ILIKE '%' || p_search || '%'
    );

  SELECT coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_rows
  FROM (
    SELECT
      r.id,
      r.requesting_user_uid,
      r.outlet_id,
      coalesce(o.name, r.outlet_id) AS outlet_name,
      r.email,
      r.requester_name,
      r.business_name,
      r.reason,
      r.status,
      r.source,
      r.processing_notes,
      r.processed_by,
      p.email AS processed_by_email,
      r.processed_at,
      r.created_at,
      r.updated_at
    FROM public.platform_account_deletion_requests r
    LEFT JOIN public.outlets o ON o.outlet_id = r.outlet_id
    LEFT JOIN public.profiles p ON p.id = r.processed_by
    WHERE (p_status IS NULL OR p_status = '' OR r.status = p_status)
      AND (p_source IS NULL OR p_source = '' OR r.source = p_source)
      AND (
        p_search IS NULL OR p_search = '' OR
        r.email ILIKE '%' || p_search || '%' OR
        coalesce(r.requester_name, '') ILIKE '%' || p_search || '%' OR
        coalesce(r.business_name, '') ILIKE '%' || p_search || '%' OR
        coalesce(o.name, '') ILIKE '%' || p_search || '%' OR
        r.id::text ILIKE '%' || p_search || '%'
      )
    ORDER BY r.created_at DESC
    LIMIT greatest(1, least(coalesce(p_limit, 25), 100))
    OFFSET greatest(coalesce(p_offset, 0), 0)
  ) t;

  RETURN jsonb_build_object('rows', v_rows, 'total', v_total);
END $$;

REVOKE ALL ON FUNCTION public.platform_account_deletion_requests_page(text, text, text, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.platform_account_deletion_requests_page(text, text, text, integer, integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.platform_update_account_deletion_request(
  p_request_id uuid,
  p_status text,
  p_processing_notes text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.platform_account_deletion_requests%ROWTYPE;
  v_email text;
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Platform administrator access required';
  END IF;

  IF p_status NOT IN ('pending', 'in_review', 'completed', 'rejected') THEN
    RAISE EXCEPTION 'Invalid request status';
  END IF;

  SELECT * INTO v_row
  FROM public.platform_account_deletion_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Account deletion request not found';
  END IF;

  UPDATE public.platform_account_deletion_requests
  SET
    status = p_status,
    processing_notes = coalesce(nullif(trim(coalesce(p_processing_notes, '')), ''), processing_notes),
    processed_by = CASE WHEN p_status IN ('completed', 'rejected') THEN auth.uid() ELSE processed_by END,
    processed_at = CASE WHEN p_status IN ('completed', 'rejected') THEN now() ELSE processed_at END
  WHERE id = p_request_id;

  SELECT email INTO v_email FROM public.profiles WHERE id = auth.uid();

  INSERT INTO public.platform_audit_events (
    outlet_id, action, affected_target, actor_uid, actor_email, metadata, source, outcome
  ) VALUES (
    v_row.outlet_id,
    'account deletion request updated',
    p_request_id::text,
    auth.uid()::text,
    v_email,
    jsonb_build_object('from_status', v_row.status, 'to_status', p_status),
    'account-deletion-rpc',
    'succeeded'
  );
END $$;

REVOKE ALL ON FUNCTION public.platform_update_account_deletion_request(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.platform_update_account_deletion_request(uuid, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.merchant_account_deletion_request_status()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_row public.platform_account_deletion_requests%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT * INTO v_row
  FROM public.platform_account_deletion_requests
  WHERE requesting_user_uid = v_uid
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('has_request', false);
  END IF;

  RETURN jsonb_build_object(
    'has_request', true,
    'id', v_row.id,
    'status', v_row.status,
    'created_at', v_row.created_at,
    'processed_at', v_row.processed_at,
    'active', v_row.status IN ('pending', 'in_review')
  );
END $$;

REVOKE ALL ON FUNCTION public.merchant_account_deletion_request_status() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.merchant_account_deletion_request_status() TO authenticated;
