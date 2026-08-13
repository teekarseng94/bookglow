-- Allow renew_member_membership to accept an optional renewal timestamp
-- (UI date picker; defaults to now when omitted).

DROP FUNCTION IF EXISTS public.renew_member_membership(text, numeric, text, text);

CREATE OR REPLACE FUNCTION public.renew_member_membership(
  p_client_id text,
  p_amount numeric,
  p_payment_method text DEFAULT 'Cash',
  p_operator_name text DEFAULT NULL,
  p_renewed_at timestamptz DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_outlet_id text := public.current_portal_outlet_id();
  v_client public.clients%rowtype;
  v_transaction_id text := replace(gen_random_uuid()::text, '-', '');
  v_amount numeric := round(coalesce(p_amount, 0), 2);
  v_payment_method text := nullif(trim(coalesce(p_payment_method, '')), '');
  v_operator text := nullif(trim(coalesce(p_operator_name, '')), '');
  v_description text;
  v_items jsonb;
  v_renewed_at timestamptz := coalesce(p_renewed_at, now());
BEGIN
  IF auth.uid() IS NULL OR v_outlet_id IS NULL THEN
    RAISE EXCEPTION 'Authenticated outlet membership required';
  END IF;
  IF nullif(trim(coalesce(p_client_id, '')), '') IS NULL THEN
    RAISE EXCEPTION 'Client id is required';
  END IF;
  IF v_amount IS NULL OR v_amount <= 0 THEN
    RAISE EXCEPTION 'Renewal amount must be greater than 0';
  END IF;
  IF v_amount <> round(v_amount, 2) THEN
    RAISE EXCEPTION 'Renewal amount may have at most 2 decimal places';
  END IF;
  IF v_payment_method IS NULL THEN
    v_payment_method := 'Cash';
  END IF;

  SELECT * INTO v_client
  FROM public.clients
  WHERE id = p_client_id AND outlet_id = v_outlet_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Member not found in active outlet';
  END IF;

  v_description := 'Membership Renewal - ' || coalesce(nullif(trim(v_client.name), ''), 'Member');
  v_items := jsonb_build_array(
    jsonb_build_object(
      'id', 'membership_renewal',
      'name', 'Membership Renewal',
      'price', v_amount,
      'quantity', 1,
      'type', 'service',
      'points', 0
    )
  );

  INSERT INTO public.transactions (
    id, outlet_id, date, type, client_id, items, amount, category, description,
    payment_method, status, voided, remarks, payment_status, outstanding
  ) VALUES (
    v_transaction_id,
    v_outlet_id,
    v_renewed_at,
    'SALE',
    v_client.id,
    v_items,
    v_amount,
    'Membership Renewal',
    v_description,
    v_payment_method,
    'completed',
    false,
    CASE WHEN v_operator IS NULL THEN NULL ELSE 'Renewed by ' || v_operator END,
    'paid',
    0
  );

  UPDATE public.clients
  SET
    last_renewed_at = v_renewed_at,
    last_renewal_amount = v_amount
  WHERE id = v_client.id AND outlet_id = v_outlet_id;

  INSERT INTO public.audit_logs(outlet_id, actor_user_id, action, target_type, target_id, metadata)
  VALUES (
    v_outlet_id,
    auth.uid(),
    'member_membership_renewed',
    'client',
    v_client.id,
    jsonb_build_object(
      'transaction_id', v_transaction_id,
      'amount', v_amount,
      'payment_method', v_payment_method,
      'operator_name', v_operator,
      'member_name', v_client.name,
      'renewed_at', v_renewed_at
    )
  );

  RETURN jsonb_build_object(
    'transaction_id', v_transaction_id,
    'client_id', v_client.id,
    'amount', v_amount,
    'last_renewed_at', v_renewed_at,
    'last_renewal_amount', v_amount,
    'payment_method', v_payment_method,
    'description', v_description,
    'category', 'Membership Renewal',
    'date', v_renewed_at,
    'remarks', CASE WHEN v_operator IS NULL THEN NULL ELSE 'Renewed by ' || v_operator END
  );
END;
$$;

REVOKE ALL ON FUNCTION public.renew_member_membership(text, numeric, text, text, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.renew_member_membership(text, numeric, text, text, timestamptz) TO authenticated;
