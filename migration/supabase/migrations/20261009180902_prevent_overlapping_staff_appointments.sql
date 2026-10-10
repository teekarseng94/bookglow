CREATE OR REPLACE FUNCTION public.appointments_reject_staff_overlap()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start integer;
  v_end integer;
  v_conflict boolean;
BEGIN
  IF NEW.staff_id IS NULL OR btrim(NEW.staff_id) = '' THEN
    RETURN NEW;
  END IF;
  IF lower(coalesce(NEW.status, '')) IN ('cancelled', 'no-show', 'no_show', 'canceled') THEN
    RETURN NEW;
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended(NEW.outlet_id || '|' || NEW.staff_id || '|' || NEW.date, 0)
  );

  v_start := public.parse_time_to_minutes(NEW.time);
  v_end := public.parse_time_to_minutes(coalesce(nullif(NEW.end_time, ''), NEW.time));
  IF v_end <= v_start THEN
    SELECT v_start + coalesce(s.duration, 30)
      INTO v_end
    FROM public.services s
    WHERE s.id = NEW.service_id;
    IF v_end IS NULL OR v_end <= v_start THEN
      v_end := v_start + 30;
    END IF;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.appointments a
    WHERE a.outlet_id = NEW.outlet_id
      AND a.staff_id = NEW.staff_id
      AND a.date = NEW.date
      AND a.id IS DISTINCT FROM NEW.id
      AND lower(coalesce(a.status, '')) NOT IN ('cancelled', 'no-show', 'no_show', 'canceled')
      AND v_start < (
        CASE
          WHEN public.parse_time_to_minutes(coalesce(nullif(a.end_time, ''), a.time))
               > public.parse_time_to_minutes(a.time)
          THEN public.parse_time_to_minutes(coalesce(nullif(a.end_time, ''), a.time))
          ELSE public.parse_time_to_minutes(a.time) + coalesce(
            (SELECT s.duration FROM public.services s WHERE s.id = a.service_id),
            30
          )
        END
      )
      AND public.parse_time_to_minutes(a.time) < v_end
  ) INTO v_conflict;

  IF v_conflict THEN
    RAISE EXCEPTION 'This staff member already has an appointment at that time.'
      USING ERRCODE = 'unique_violation';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.appointments_reject_staff_overlap() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS appointments_reject_staff_overlap ON public.appointments;
CREATE TRIGGER appointments_reject_staff_overlap
  BEFORE INSERT ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.appointments_reject_staff_overlap();