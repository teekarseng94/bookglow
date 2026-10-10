-- Reschedules bypassed the double-booking guard. The trigger was INSERT only,
-- so moving an appointment onto an occupied slot was accepted. The merchant
-- Android app is where appointments get dragged, so this is now the path that
-- matters most.
--
-- The same function serves both triggers: its self-exclusion clause already
-- skips the row being written, so it needs no change to work for UPDATE.
--
-- The check runs only when the booking actually moves, or when a cancelled row
-- is revived onto a slot. Everything else is left alone -- in particular
-- complete_pos_sale writes status, payment_status and sale_id without moving
-- the booking, and 1,017 appointments sit inside the historical overlapping
-- pairs in docs/BOOKGLOW_APPOINTMENT_OVERLAP_AUDIT.md. Re-checking those on any
-- status change would fail every POS checkout at Sohokaki and Bali Wellness.

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
  -- OLD is unassigned on INSERT, so it is only read inside this branch.
  IF TG_OP = 'UPDATE' THEN
    IF NOT (
         NEW.staff_id IS DISTINCT FROM OLD.staff_id
      OR NEW.date     IS DISTINCT FROM OLD.date
      OR NEW.time     IS DISTINCT FROM OLD.time
      OR NEW.end_time IS DISTINCT FROM OLD.end_time
      OR (
           lower(coalesce(NEW.status, '')) NOT IN ('cancelled', 'no-show', 'no_show', 'canceled')
           AND lower(coalesce(OLD.status, '')) IN ('cancelled', 'no-show', 'no_show', 'canceled')
         )
    ) THEN
      RETURN NEW;
    END IF;
  END IF;

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

DROP TRIGGER IF EXISTS appointments_reject_staff_overlap_update ON public.appointments;
CREATE TRIGGER appointments_reject_staff_overlap_update
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.appointments_reject_staff_overlap();
