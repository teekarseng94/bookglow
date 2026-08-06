-- When a schedule appointment is deleted, also remove its linked POS sale
-- (and commission child rows) so Sales Reports stays in sync with Schedule.
CREATE OR REPLACE FUNCTION public.delete_appointment_and_linked_sale(p_appointment_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_outlet_id text := public.current_portal_outlet_id();
  v_appointment public.appointments%rowtype;
  v_sale_id text;
  v_sale_exists boolean := false;
  v_related_appointment_ids text[];
BEGIN
  IF auth.uid() IS NULL OR v_outlet_id IS NULL THEN
    RAISE EXCEPTION 'Authenticated outlet membership required';
  END IF;
  IF nullif(trim(coalesce(p_appointment_id, '')), '') IS NULL THEN
    RAISE EXCEPTION 'Appointment id is required';
  END IF;

  SELECT * INTO v_appointment
  FROM public.appointments
  WHERE id = p_appointment_id AND outlet_id = v_outlet_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'appointment_id', p_appointment_id,
      'transaction_id', NULL,
      'deleted_appointment_ids', '[]'::jsonb,
      'sale_deleted', false,
      'already_missing', true
    );
  END IF;

  v_sale_id := nullif(trim(coalesce(v_appointment.sale_id, v_appointment.source_sale_id, '')), '');

  IF v_sale_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.transactions
      WHERE id = v_sale_id AND outlet_id = v_outlet_id
    ) INTO v_sale_exists;

    SELECT coalesce(array_agg(id), ARRAY[p_appointment_id]::text[])
    INTO v_related_appointment_ids
    FROM public.appointments
    WHERE outlet_id = v_outlet_id
      AND (id = p_appointment_id OR sale_id = v_sale_id OR source_sale_id = v_sale_id);

    DELETE FROM public.appointments
    WHERE outlet_id = v_outlet_id
      AND id = ANY (v_related_appointment_ids);

    IF v_sale_exists THEN
      DELETE FROM public.transactions
      WHERE outlet_id = v_outlet_id
        AND parent_sale_id = v_sale_id
        AND category = 'Commission';

      DELETE FROM public.transactions
      WHERE id = v_sale_id
        AND outlet_id = v_outlet_id;

      INSERT INTO public.audit_logs(outlet_id, actor_user_id, action, target_type, target_id, reason, metadata)
      VALUES (
        v_outlet_id,
        auth.uid(),
        'appointment_deleted_with_sale',
        'transaction',
        v_sale_id,
        'Deleted from Schedule',
        jsonb_build_object(
          'appointment_ids', to_jsonb(v_related_appointment_ids),
          'trigger_appointment_id', p_appointment_id
        )
      );

      RETURN jsonb_build_object(
        'appointment_id', p_appointment_id,
        'transaction_id', v_sale_id,
        'deleted_appointment_ids', to_jsonb(v_related_appointment_ids),
        'sale_deleted', true,
        'already_missing', false
      );
    END IF;

    RETURN jsonb_build_object(
      'appointment_id', p_appointment_id,
      'transaction_id', v_sale_id,
      'deleted_appointment_ids', to_jsonb(v_related_appointment_ids),
      'sale_deleted', false,
      'already_missing', false
    );
  END IF;

  DELETE FROM public.appointments
  WHERE id = p_appointment_id AND outlet_id = v_outlet_id;

  INSERT INTO public.audit_logs(outlet_id, actor_user_id, action, target_type, target_id, reason, metadata)
  VALUES (
    v_outlet_id,
    auth.uid(),
    'appointment_deleted',
    'appointment',
    p_appointment_id,
    'Deleted from Schedule',
    jsonb_build_object('transaction_id', NULL)
  );

  RETURN jsonb_build_object(
    'appointment_id', p_appointment_id,
    'transaction_id', NULL,
    'deleted_appointment_ids', jsonb_build_array(p_appointment_id),
    'sale_deleted', false,
    'already_missing', false
  );
END;
$$;

REVOKE ALL ON FUNCTION public.delete_appointment_and_linked_sale(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_appointment_and_linked_sale(text) TO authenticated;
