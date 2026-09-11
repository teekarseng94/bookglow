-- Sale point credits must write point_transactions so Points history stays aligned
-- with clients.points. Wallet balance (clients.points) remains authoritative.

CREATE OR REPLACE FUNCTION public.merchant_credit_points_for_sale(
  p_client_id text,
  p_sale_id text,
  p_points integer,
  p_outlet_id text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_outlet text;
  v_prev numeric;
  v_new numeric;
  v_txn_id text;
BEGIN
  IF p_points IS NULL OR p_points <= 0 THEN
    RETURN false;
  END IF;

  IF NOT (
    public.is_portal_platform_admin()
    OR public.current_portal_outlet_id() = p_outlet_id
  ) THEN
    RAISE EXCEPTION 'Not allowed for this outlet.' USING ERRCODE = '42501';
  END IF;

  SELECT outlet_id, COALESCE(points, 0)
  INTO v_outlet, v_prev
  FROM clients
  WHERE id = p_client_id
  FOR UPDATE;

  IF v_outlet IS NULL OR v_outlet <> p_outlet_id THEN
    RAISE EXCEPTION 'Client not found for outlet.' USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO points_credits (client_id, sale_id, points)
  VALUES (p_client_id, p_sale_id, p_points)
  ON CONFLICT (client_id, sale_id) DO NOTHING;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  v_new := v_prev + p_points;
  UPDATE clients SET points = v_new WHERE id = p_client_id;

  v_txn_id := replace(gen_random_uuid()::text, '-', '');
  INSERT INTO point_transactions (
    id, client_id, outlet_id, type, amount, previous_balance, new_balance,
    timestamp, is_manual, description
  ) VALUES (
    v_txn_id,
    p_client_id,
    p_outlet_id,
    'Topup',
    p_points,
    v_prev,
    v_new,
    now(),
    false,
    'Sale #' || p_sale_id
  );

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.merchant_credit_points_for_sale(text, text, integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.merchant_credit_points_for_sale(text, text, integer, text) TO authenticated;
