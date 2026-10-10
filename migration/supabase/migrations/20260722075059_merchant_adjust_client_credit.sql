CREATE OR REPLACE FUNCTION public.merchant_adjust_client_credit(
  p_client_id text,
  p_outlet_id text,
  p_type text,
  p_amount numeric,
  p_staff_remark text DEFAULT NULL,
  p_staff_name text DEFAULT NULL,
  p_transaction_id text DEFAULT NULL
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_outlet text;
  v_prev numeric;
  v_new numeric;
  v_delta numeric;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive.' USING ERRCODE = '22023';
  END IF;

  IF NOT (
    public.is_portal_platform_admin()
    OR public.current_portal_outlet_id() = p_outlet_id
  ) THEN
    RAISE EXCEPTION 'Not allowed for this outlet.' USING ERRCODE = '42501';
  END IF;

  SELECT outlet_id, COALESCE(credit, 0) INTO v_outlet, v_prev
  FROM clients WHERE id = p_client_id FOR UPDATE;

  IF v_outlet IS NULL OR v_outlet <> p_outlet_id THEN
    RAISE EXCEPTION 'Client not found for outlet.' USING ERRCODE = 'P0002';
  END IF;

  IF lower(p_type) = 'topup' THEN
    v_delta := p_amount;
  ELSE
    v_delta := -p_amount;
  END IF;

  v_new := v_prev + v_delta;
  IF v_new < 0 THEN
    RAISE EXCEPTION 'Insufficient credit balance.' USING ERRCODE = '22023';
  END IF;

  UPDATE clients SET credit = v_new WHERE id = p_client_id;

  INSERT INTO credit_history (
    id, client_id, outlet_id, type, amount, new_balance,
    staff_remark, staff_name, timestamp, transaction_id
  ) VALUES (
    replace(gen_random_uuid()::text, '-', ''),
    p_client_id, p_outlet_id, p_type, p_amount, v_new,
    COALESCE(NULLIF(btrim(p_staff_remark), ''), CASE WHEN lower(p_type) = 'topup' THEN 'Top up' ELSE 'Deduction' END),
    p_staff_name,
    now(),
    p_transaction_id
  );

  RETURN v_new;
END;
$$;

REVOKE ALL ON FUNCTION public.merchant_adjust_client_credit(text, text, text, numeric, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.merchant_adjust_client_credit(text, text, text, numeric, text, text, text) TO authenticated;
