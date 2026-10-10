CREATE OR REPLACE FUNCTION public.parse_time_to_minutes(time_str text)
RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  parts text[];
  h integer;
  m integer;
BEGIN
  IF time_str IS NULL OR btrim(time_str) = '' THEN
    RETURN 0;
  END IF;
  parts := string_to_array(btrim(time_str), ':');
  h := COALESCE(NULLIF(parts[1], '')::integer, 0);
  m := COALESCE(NULLIF(parts[2], '')::integer, 0);
  RETURN h * 60 + m;
EXCEPTION WHEN OTHERS THEN
  RETURN 0;
END;
$$;