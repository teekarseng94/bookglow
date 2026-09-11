-- Atomically reverse a MANUAL point Topup/Redeem: update clients.points and
-- remove the ledger row, then recalculate previous_balance/new_balance on
-- remaining point_transactions for that member so history stays consistent.

CREATE OR REPLACE FUNCTION public.merchant_reverse_manual_point_transaction(
  p_transaction_id text,
  p_outlet_id text
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_txn point_transactions%ROWTYPE;
  v_client_outlet text;
  v_prev integer;
  v_delta integer;
  v_new integer;
  v_total_remaining integer;
  v_run integer;
  v_row_delta integer;
  r RECORD;
BEGIN
  IF p_transaction_id IS NULL OR length(trim(p_transaction_id)) = 0 THEN
    RAISE EXCEPTION 'Transaction id is required.' USING ERRCODE = '22023';
  END IF;

  IF NOT (
    public.is_portal_platform_admin()
    OR public.current_portal_outlet_id() = p_outlet_id
  ) THEN
    RAISE EXCEPTION 'Not allowed for this outlet.' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_txn
  FROM point_transactions
  WHERE id = p_transaction_id
    AND outlet_id = p_outlet_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Point transaction not found.' USING ERRCODE = 'P0002';
  END IF;

  IF COALESCE(v_txn.is_manual, false) IS NOT TRUE THEN
    RAISE EXCEPTION 'Only manual point adjustments can be deleted.' USING ERRCODE = '22023';
  END IF;

  IF NOT (
    v_txn.type = 'Topup'
    OR v_txn.type = 'Redeem'
    OR lower(v_txn.type) LIKE 'topup%'
    OR lower(v_txn.type) LIKE 'redeem%'
  ) THEN
    RAISE EXCEPTION 'Only manual Topup or Redeem adjustments can be deleted.' USING ERRCODE = '22023';
  END IF;

  SELECT outlet_id, COALESCE(points, 0)::integer
  INTO v_client_outlet, v_prev
  FROM clients
  WHERE id = v_txn.client_id
  FOR UPDATE;

  IF v_client_outlet IS NULL OR v_client_outlet <> p_outlet_id THEN
    RAISE EXCEPTION 'Client not found for outlet.' USING ERRCODE = 'P0002';
  END IF;

  IF lower(v_txn.type) LIKE 'topup%' OR v_txn.type = 'Topup' THEN
    v_delta := v_txn.amount::integer;
  ELSE
    v_delta := -v_txn.amount::integer;
  END IF;

  -- balance_after_delete = current_balance - deleted_transaction_delta
  v_new := v_prev - v_delta;

  IF v_new < 0 THEN
    RAISE EXCEPTION 'Cannot delete this adjustment. Removing this Top Up would reduce the member''s balance below zero.'
      USING ERRCODE = '22023';
  END IF;

  DELETE FROM point_transactions
  WHERE id = p_transaction_id
    AND outlet_id = p_outlet_id;

  UPDATE clients
  SET points = v_new
  WHERE id = v_txn.client_id;

  -- Recalculate stored balance snapshots for remaining ledger rows (chronological).
  SELECT COALESCE(SUM(
    CASE
      WHEN type = 'Topup' OR lower(type) LIKE 'topup%' THEN amount::integer
      ELSE -amount::integer
    END
  ), 0)
  INTO v_total_remaining
  FROM point_transactions
  WHERE client_id = v_txn.client_id
    AND outlet_id = p_outlet_id;

  v_run := v_new - v_total_remaining;

  FOR r IN
    SELECT id, type, amount
    FROM point_transactions
    WHERE client_id = v_txn.client_id
      AND outlet_id = p_outlet_id
    ORDER BY timestamp ASC, id ASC
  LOOP
    IF r.type = 'Topup' OR lower(r.type) LIKE 'topup%' THEN
      v_row_delta := r.amount::integer;
    ELSE
      v_row_delta := -r.amount::integer;
    END IF;

    UPDATE point_transactions
    SET
      previous_balance = v_run,
      new_balance = v_run + v_row_delta
    WHERE id = r.id;

    v_run := v_run + v_row_delta;
  END LOOP;

  RETURN v_new;
END;
$$;

REVOKE ALL ON FUNCTION public.merchant_reverse_manual_point_transaction(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.merchant_reverse_manual_point_transaction(text, text) TO authenticated;
