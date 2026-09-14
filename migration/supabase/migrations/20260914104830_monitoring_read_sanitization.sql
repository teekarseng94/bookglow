-- Sanitize monitoring reads through the shared server-side helper.
-- Direct table SELECT remains available to service_role for inserts; authenticated
-- callers must use the RPC so message and metadata secrets are not returned raw.

CREATE OR REPLACE FUNCTION public.platform_sanitize_jsonb(p_value jsonb)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF p_value IS NULL THEN
    RETURN '{}'::jsonb;
  END IF;
  CASE jsonb_typeof(p_value)
    WHEN 'string' THEN
      RETURN to_jsonb(public.platform_sanitize_error(p_value #>> '{}'));
    WHEN 'array' THEN
      SELECT coalesce(jsonb_agg(public.platform_sanitize_jsonb(elem)), '[]'::jsonb)
        INTO v_result
        FROM jsonb_array_elements(p_value) AS elem;
      RETURN v_result;
    WHEN 'object' THEN
      SELECT coalesce(jsonb_object_agg(
        e.key,
        CASE
          WHEN e.key ~* '^(access_token|refresh_token|client_secret|authorization|api[_-]?key|token|password|secret|signing_secret)$'
            THEN to_jsonb('[REDACTED]'::text)
          ELSE public.platform_sanitize_jsonb(e.value)
        END
      ), '{}'::jsonb)
        INTO v_result
        FROM jsonb_each(p_value) AS e;
      RETURN v_result;
    ELSE
      RETURN p_value;
  END CASE;
END;
$$;
REVOKE ALL ON FUNCTION public.platform_sanitize_jsonb(jsonb) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.platform_monitoring_events_page(
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
) RETURNS jsonb
LANGUAGE plpgsql
STABLE
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
  SELECT count(*) INTO v_total FROM public.platform_monitoring_events;
  SELECT coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) INTO v_rows FROM (
    SELECT
      e.id,
      e.service,
      e.severity,
      e.event_type,
      public.platform_sanitize_error(e.message) AS message,
      public.platform_sanitize_jsonb(e.metadata) AS metadata,
      e.outlet_id,
      e.correlation_id,
      e.occurred_at
    FROM public.platform_monitoring_events e
    ORDER BY e.occurred_at DESC, e.id
    LIMIT least(greatest(coalesce(p_limit, 50), 1), 200)
    OFFSET greatest(coalesce(p_offset, 0), 0)
  ) x;
  RETURN jsonb_build_object('rows', v_rows, 'total', v_total);
END;
$$;
REVOKE ALL ON FUNCTION public.platform_monitoring_events_page(integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.platform_monitoring_events_page(integer, integer) TO authenticated;

REVOKE SELECT ON public.platform_monitoring_events FROM anon, authenticated;
GRANT SELECT, INSERT ON public.platform_monitoring_events TO service_role;
