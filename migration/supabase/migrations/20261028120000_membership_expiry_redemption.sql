-- Membership validity: 1 calendar year from last renewal (or join date).
-- Valid through the expiry date in Asia/Kuala_Lumpur; expired from the next local day.
-- Loyalty point redemption is blocked in real time (POS sale + points adjust). Points are not reset.

CREATE OR REPLACE FUNCTION public.client_membership_expiry_on(
  p_last_renewed_at timestamptz,
  p_created_at timestamptz
) RETURNS date
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN coalesce(p_last_renewed_at, p_created_at) IS NULL THEN NULL
    ELSE (
      (timezone('Asia/Kuala_Lumpur', coalesce(p_last_renewed_at, p_created_at)))::date
      + INTERVAL '1 year'
    )::date
  END;
$$;

CREATE OR REPLACE FUNCTION public.client_membership_is_active(
  p_last_renewed_at timestamptz,
  p_created_at timestamptz
) RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT
    public.client_membership_expiry_on(p_last_renewed_at, p_created_at) IS NOT NULL
    AND (timezone('Asia/Kuala_Lumpur', now()))::date
      <= public.client_membership_expiry_on(p_last_renewed_at, p_created_at);
$$;

REVOKE ALL ON FUNCTION public.client_membership_expiry_on(timestamptz, timestamptz) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.client_membership_is_active(timestamptz, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.client_membership_expiry_on(timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.client_membership_is_active(timestamptz, timestamptz) TO authenticated;

CREATE OR REPLACE FUNCTION public.merchant_adjust_client_points(
  p_client_id text,
  p_outlet_id text,
  p_type text,
  p_amount numeric,
  p_is_manual boolean DEFAULT true,
  p_description text DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_outlet text;
  v_prev integer;
  v_new integer;
  v_delta integer;
  v_id text;
  v_last_renewed_at timestamptz;
  v_created_at timestamptz;
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

  SELECT outlet_id, COALESCE(points, 0), last_renewed_at, created_at
    INTO v_outlet, v_prev, v_last_renewed_at, v_created_at
  FROM clients WHERE id = p_client_id FOR UPDATE;

  IF v_outlet IS NULL OR v_outlet <> p_outlet_id THEN
    RAISE EXCEPTION 'Client not found for outlet.' USING ERRCODE = 'P0002';
  END IF;

  IF p_type IS NOT NULL AND (p_type = 'Redeem' OR lower(p_type) LIKE 'redeem%') THEN
    IF NOT public.client_membership_is_active(v_last_renewed_at, v_created_at) THEN
      RAISE EXCEPTION 'Membership expired. Loyalty point redemption is disabled until the membership is renewed.'
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  IF lower(p_type) LIKE 'topup%' OR p_type = 'Topup' THEN
    v_delta := p_amount::integer;
  ELSE
    v_delta := -p_amount::integer;
  END IF;

  v_new := GREATEST(0, v_prev + v_delta);
  UPDATE clients SET points = v_new WHERE id = p_client_id;

  v_id := replace(gen_random_uuid()::text, '-', '');
  INSERT INTO point_transactions (
    id, client_id, outlet_id, type, amount, previous_balance, new_balance,
    timestamp, is_manual, description
  ) VALUES (
    v_id, p_client_id, p_outlet_id, p_type, p_amount, v_prev, v_new,
    now(), COALESCE(p_is_manual, true), p_description
  );

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.merchant_adjust_client_points(text, text, text, numeric, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.merchant_adjust_client_points(text, text, text, numeric, boolean, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.complete_pos_sale(
  p_transaction jsonb,
  p_appointment_id text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_outlet_id text := public.current_portal_outlet_id();
  v_transaction_id text := nullif(trim(p_transaction->>'id'), '');
  v_appointment public.appointments%rowtype;
  v_existing public.transactions%rowtype;
  v_created boolean := false;
  v_client_id text := nullif(trim(coalesce(p_transaction->>'client_id', '')), '');
  v_client public.clients%rowtype;
  v_points_to_redeem integer := 0;
  v_point_txn_id text;
BEGIN
  IF auth.uid() IS NULL OR v_outlet_id IS NULL THEN RAISE EXCEPTION 'Authenticated outlet membership required'; END IF;
  IF v_transaction_id IS NULL THEN RAISE EXCEPTION 'Transaction id is required'; END IF;
  IF coalesce(p_transaction->>'outlet_id', v_outlet_id) <> v_outlet_id THEN RAISE EXCEPTION 'Transaction belongs to another outlet'; END IF;
  IF coalesce(p_transaction->>'type', '') <> 'SALE' THEN RAISE EXCEPTION 'Only POS sales are supported'; END IF;

  SELECT coalesce(sum(
    CASE
      WHEN coalesce(elem->>'redeemedWithPoints', '') IN ('true', 't')
        THEN round(coalesce(nullif(elem->>'redeemPoints', ''), '0')::numeric)
          * greatest(1, round(coalesce(nullif(elem->>'quantity', ''), '1')::numeric))
      ELSE 0
    END
  ), 0)::integer
  INTO v_points_to_redeem
  FROM jsonb_array_elements(coalesce(p_transaction->'items', '[]'::jsonb)) elem;

  IF v_points_to_redeem > 0 THEN
    IF v_client_id IS NULL OR v_client_id = 'guest' THEN
      RAISE EXCEPTION 'Select a member before redeeming services with points.';
    END IF;
    SELECT * INTO v_client
    FROM public.clients
    WHERE id = v_client_id AND outlet_id = v_outlet_id
    FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Member not found in active outlet';
    END IF;
    IF NOT public.client_membership_is_active(v_client.last_renewed_at, v_client.created_at) THEN
      RAISE EXCEPTION 'Membership expired. Loyalty point redemption is disabled until the membership is renewed.';
    END IF;
    IF coalesce(v_client.points, 0) < v_points_to_redeem THEN
      RAISE EXCEPTION 'Member does not have enough points for this redemption.';
    END IF;
  END IF;

  SELECT * INTO v_existing FROM public.transactions WHERE id = v_transaction_id FOR UPDATE;
  IF FOUND AND v_existing.outlet_id <> v_outlet_id THEN RAISE EXCEPTION 'Transaction belongs to another outlet'; END IF;

  IF p_appointment_id IS NOT NULL THEN
    SELECT * INTO v_appointment FROM public.appointments
      WHERE id = p_appointment_id AND outlet_id = v_outlet_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Appointment not found in active outlet'; END IF;
    IF v_appointment.status IN ('cancelled', 'no-show', 'no_show') THEN RAISE EXCEPTION 'Cancelled or no-show appointment cannot be completed'; END IF;
    IF v_appointment.sale_id IS NOT NULL AND v_appointment.sale_id <> v_transaction_id THEN
      RAISE EXCEPTION 'Appointment is already linked to another sale';
    END IF;
  END IF;

  IF v_existing.id IS NULL THEN
    INSERT INTO public.transactions(id,outlet_id,date,type,client_id,items,amount,category,description,payment_method,status,voided,remarks,payment_status,outstanding)
    VALUES (v_transaction_id,v_outlet_id,coalesce((p_transaction->>'date')::timestamptz,now()),'SALE',p_transaction->>'client_id',p_transaction->'items',
      coalesce((p_transaction->>'amount')::numeric,0),coalesce(p_transaction->>'category',''),coalesce(p_transaction->>'description',''),
      p_transaction->>'payment_method',coalesce(p_transaction->>'status','completed'),false,p_transaction->>'remarks','paid',coalesce((p_transaction->>'outstanding')::numeric,0));
    v_created := true;
  END IF;

  IF v_created AND v_points_to_redeem > 0 THEN
    UPDATE public.clients
      SET points = coalesce(points, 0) - v_points_to_redeem
      WHERE id = v_client.id AND outlet_id = v_outlet_id
      RETURNING points INTO v_client.points;
    v_point_txn_id := replace(gen_random_uuid()::text, '-', '');
    INSERT INTO public.point_transactions (
      id, client_id, outlet_id, type, amount, previous_balance, new_balance,
      timestamp, is_manual, description
    ) VALUES (
      v_point_txn_id,
      v_client.id,
      v_outlet_id,
      'Redeem',
      v_points_to_redeem,
      coalesce(v_client.points, 0) + v_points_to_redeem,
      coalesce(v_client.points, 0),
      now(),
      false,
      'POS redemption sale ' || v_transaction_id
    );
  END IF;

  IF p_appointment_id IS NOT NULL THEN
    UPDATE public.appointments SET status='completed', payment_status='paid', sale_id=v_transaction_id,
      completed_at=coalesce(completed_at,now()), updated_at=now()
      WHERE id=p_appointment_id AND outlet_id=v_outlet_id;
  END IF;

  IF v_created THEN
    INSERT INTO public.audit_logs(outlet_id,actor_user_id,action,target_type,target_id,metadata)
      VALUES(v_outlet_id,auth.uid(),'pos_sale_completed','transaction',v_transaction_id,
        jsonb_build_object(
          'appointment_ids', CASE WHEN p_appointment_id IS NULL THEN '[]'::jsonb ELSE jsonb_build_array(p_appointment_id) END,
          'points_redeemed', v_points_to_redeem
        ));
  END IF;
  RETURN jsonb_build_object('transaction_id',v_transaction_id,'appointment_ids',CASE WHEN p_appointment_id IS NULL THEN '[]'::jsonb ELSE jsonb_build_array(p_appointment_id) END,'created',v_created,'points_redeemed', v_points_to_redeem);
END $$;

REVOKE ALL ON FUNCTION public.complete_pos_sale(jsonb, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_pos_sale(jsonb, text) TO authenticated;
