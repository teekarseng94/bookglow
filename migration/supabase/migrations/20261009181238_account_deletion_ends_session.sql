CREATE OR REPLACE FUNCTION public.platform_update_account_deletion_request(
  p_request_id uuid,
  p_status text,
  p_processing_notes text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.platform_account_deletion_requests%ROWTYPE;
  v_email text;
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Platform administrator access required';
  END IF;

  IF p_status NOT IN ('pending', 'in_review', 'completed', 'rejected') THEN
    RAISE EXCEPTION 'Invalid request status';
  END IF;

  SELECT * INTO v_row
  FROM public.platform_account_deletion_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Account deletion request not found';
  END IF;

  UPDATE public.platform_account_deletion_requests
  SET
    status = p_status,
    processing_notes = coalesce(nullif(trim(coalesce(p_processing_notes, '')), ''), processing_notes),
    processed_by = CASE WHEN p_status IN ('completed', 'rejected') THEN auth.uid() ELSE processed_by END,
    processed_at = CASE WHEN p_status IN ('completed', 'rejected') THEN now() ELSE processed_at END
  WHERE id = p_request_id;

  IF p_status = 'completed'
     AND v_row.status IS DISTINCT FROM 'completed'
     AND v_row.requesting_user_uid IS NOT NULL THEN
    UPDATE auth.users
    SET banned_until = 'infinity'
    WHERE id = v_row.requesting_user_uid;
    DELETE FROM auth.sessions WHERE user_id = v_row.requesting_user_uid;
    DELETE FROM auth.refresh_tokens WHERE user_id = v_row.requesting_user_uid;
  END IF;

  SELECT email INTO v_email FROM public.profiles WHERE id = auth.uid();

  INSERT INTO public.platform_audit_events (
    outlet_id, action, affected_target, actor_uid, actor_email, metadata, source, outcome
  ) VALUES (
    v_row.outlet_id,
    'account deletion request updated',
    p_request_id::text,
    auth.uid()::text,
    v_email,
    jsonb_build_object('from_status', v_row.status, 'to_status', p_status, 'sessions_revoked', p_status = 'completed'),
    'account-deletion-rpc',
    'succeeded'
  );
END $$;

REVOKE ALL ON FUNCTION public.platform_update_account_deletion_request(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.platform_update_account_deletion_request(uuid, text, text) TO authenticated;