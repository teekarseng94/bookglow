-- When a Membership Renewal SALE is voided, recalculate the member's
-- last_renewed_at / last_renewal_amount from remaining non-voided renewals.

CREATE OR REPLACE FUNCTION public.recalc_client_last_renewal(
  p_outlet_id text,
  p_client_id text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_latest record;
BEGIN
  IF nullif(trim(coalesce(p_outlet_id, '')), '') IS NULL
     OR nullif(trim(coalesce(p_client_id, '')), '') IS NULL THEN
    RETURN;
  END IF;

  SELECT t.date, t.amount
  INTO v_latest
  FROM public.transactions t
  WHERE t.outlet_id = p_outlet_id
    AND t.client_id = p_client_id
    AND t.type = 'SALE'
    AND t.category = 'Membership Renewal'
    AND coalesce(t.voided, false) = false
    AND lower(coalesce(t.status, '')) <> 'voided'
  ORDER BY t.date DESC
  LIMIT 1;

  IF FOUND THEN
    UPDATE public.clients
    SET
      last_renewed_at = v_latest.date,
      last_renewal_amount = v_latest.amount
    WHERE id = p_client_id
      AND outlet_id = p_outlet_id;
  ELSE
    UPDATE public.clients
    SET
      last_renewed_at = NULL,
      last_renewal_amount = NULL
    WHERE id = p_client_id
      AND outlet_id = p_outlet_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.void_sale_and_remove_linked_appointments(
  p_transaction_id text,
  p_reason text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_outlet_id text := public.current_portal_outlet_id();
  v_tx public.transactions%rowtype;
  v_ids text[];
BEGIN
  IF auth.uid() IS NULL OR v_outlet_id IS NULL THEN
    RAISE EXCEPTION 'Authenticated outlet membership required';
  END IF;
  IF length(trim(coalesce(p_reason, ''))) < 3 THEN
    RAISE EXCEPTION 'A void reason is required';
  END IF;

  SELECT * INTO v_tx
  FROM public.transactions
  WHERE id = p_transaction_id AND outlet_id = v_outlet_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction not found in active outlet';
  END IF;
  IF v_tx.voided OR v_tx.status = 'voided' THEN
    RAISE EXCEPTION 'Transaction is already voided';
  END IF;

  SELECT coalesce(array_agg(id), '{}') INTO v_ids
  FROM public.appointments
  WHERE outlet_id = v_outlet_id
    AND (sale_id = p_transaction_id OR source_sale_id = p_transaction_id);

  UPDATE public.transactions
  SET status = 'voided', voided = true
  WHERE id = p_transaction_id AND outlet_id = v_outlet_id;

  DELETE FROM public.transactions
  WHERE outlet_id = v_outlet_id
    AND parent_sale_id = p_transaction_id
    AND category = 'Commission';

  DELETE FROM public.appointments
  WHERE outlet_id = v_outlet_id AND id = ANY (v_ids);

  -- Membership renewal metadata must follow authoritative SALE history.
  IF v_tx.category = 'Membership Renewal'
     AND nullif(trim(coalesce(v_tx.client_id, '')), '') IS NOT NULL THEN
    PERFORM public.recalc_client_last_renewal(v_outlet_id, v_tx.client_id);
  END IF;

  INSERT INTO public.audit_logs(outlet_id, actor_user_id, action, target_type, target_id, reason, metadata)
  VALUES (
    v_outlet_id,
    auth.uid(),
    'sale_voided',
    'transaction',
    p_transaction_id,
    trim(p_reason),
    jsonb_build_object(
      'appointment_ids', to_jsonb(v_ids),
      'category', v_tx.category,
      'client_id', v_tx.client_id
    )
  );

  RETURN jsonb_build_object(
    'transaction_id', p_transaction_id,
    'appointment_ids', to_jsonb(v_ids),
    'client_id', v_tx.client_id,
    'category', v_tx.category
  );
END;
$$;

REVOKE ALL ON FUNCTION public.recalc_client_last_renewal(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.recalc_client_last_renewal(text, text) TO authenticated;

REVOKE ALL ON FUNCTION public.void_sale_and_remove_linked_appointments(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.void_sale_and_remove_linked_appointments(text, text) TO authenticated;
