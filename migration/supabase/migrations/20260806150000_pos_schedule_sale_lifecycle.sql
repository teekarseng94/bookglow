-- Atomic POS -> Schedule lifecycle. The existing appointments.sale_id is the
-- canonical durable relationship; no duplicate transaction link is introduced.
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS payment_status text;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS completed_at timestamptz;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_appointments_outlet_sale_id
  ON public.appointments(outlet_id, sale_id) WHERE sale_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_appointments_outlet_source_sale_id
  ON public.appointments(outlet_id, source_sale_id) WHERE source_sale_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_appointments_outlet_date_staff_status
  ON public.appointments(outlet_id, date, staff_id, status);

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
BEGIN
  IF auth.uid() IS NULL OR v_outlet_id IS NULL THEN RAISE EXCEPTION 'Authenticated outlet membership required'; END IF;
  IF v_transaction_id IS NULL THEN RAISE EXCEPTION 'Transaction id is required'; END IF;
  IF coalesce(p_transaction->>'outlet_id', v_outlet_id) <> v_outlet_id THEN RAISE EXCEPTION 'Transaction belongs to another outlet'; END IF;
  IF coalesce(p_transaction->>'type', '') <> 'SALE' THEN RAISE EXCEPTION 'Only POS sales are supported'; END IF;

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

  IF p_appointment_id IS NOT NULL THEN
    UPDATE public.appointments SET status='completed', payment_status='paid', sale_id=v_transaction_id,
      completed_at=coalesce(completed_at,now()), updated_at=now()
      WHERE id=p_appointment_id AND outlet_id=v_outlet_id;
  END IF;

  IF v_created THEN
    INSERT INTO public.audit_logs(outlet_id,actor_user_id,action,target_type,target_id,metadata)
      VALUES(v_outlet_id,auth.uid(),'pos_sale_completed','transaction',v_transaction_id,
        jsonb_build_object('appointment_ids',CASE WHEN p_appointment_id IS NULL THEN '[]'::jsonb ELSE jsonb_build_array(p_appointment_id) END));
  END IF;
  RETURN jsonb_build_object('transaction_id',v_transaction_id,'appointment_ids',CASE WHEN p_appointment_id IS NULL THEN '[]'::jsonb ELSE jsonb_build_array(p_appointment_id) END,'created',v_created);
END $$;

CREATE OR REPLACE FUNCTION public.void_sale_and_remove_linked_appointments(p_transaction_id text,p_reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_outlet_id text:=public.current_portal_outlet_id(); v_tx public.transactions%rowtype; v_ids text[];
BEGIN
  IF auth.uid() IS NULL OR v_outlet_id IS NULL THEN RAISE EXCEPTION 'Authenticated outlet membership required'; END IF;
  IF length(trim(coalesce(p_reason,''))) < 3 THEN RAISE EXCEPTION 'A void reason is required'; END IF;
  SELECT * INTO v_tx FROM public.transactions WHERE id=p_transaction_id AND outlet_id=v_outlet_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Transaction not found in active outlet'; END IF;
  IF v_tx.voided OR v_tx.status='voided' THEN RAISE EXCEPTION 'Transaction is already voided'; END IF;
  SELECT coalesce(array_agg(id),'{}') INTO v_ids FROM public.appointments
    WHERE outlet_id=v_outlet_id AND (sale_id=p_transaction_id OR source_sale_id=p_transaction_id);
  UPDATE public.transactions SET status='voided',voided=true WHERE id=p_transaction_id AND outlet_id=v_outlet_id;
  DELETE FROM public.transactions WHERE outlet_id=v_outlet_id AND parent_sale_id=p_transaction_id AND category='Commission';
  DELETE FROM public.appointments WHERE outlet_id=v_outlet_id AND id=ANY(v_ids);
  INSERT INTO public.audit_logs(outlet_id,actor_user_id,action,target_type,target_id,reason,metadata)
    VALUES(v_outlet_id,auth.uid(),'sale_voided','transaction',p_transaction_id,trim(p_reason),jsonb_build_object('appointment_ids',to_jsonb(v_ids)));
  RETURN jsonb_build_object('transaction_id',p_transaction_id,'appointment_ids',to_jsonb(v_ids));
END $$;

REVOKE ALL ON FUNCTION public.complete_pos_sale(jsonb,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.void_sale_and_remove_linked_appointments(text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_pos_sale(jsonb,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.void_sale_and_remove_linked_appointments(text,text) TO authenticated;
