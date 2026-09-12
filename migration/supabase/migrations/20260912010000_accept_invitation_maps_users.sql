-- Completing an invitation must also map public.users so the portal can load outlet + role.
CREATE OR REPLACE FUNCTION public.accept_outlet_invitation(invitation_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text;
  inv public.outlet_invitations%rowtype;
  v_limit int;
  v_count int;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT lower(email) INTO v_email FROM auth.users WHERE id = v_uid;

  SELECT * INTO inv
  FROM public.outlet_invitations
  WHERE token_hash = encode(extensions.digest(invitation_token, 'sha256'), 'hex')
  FOR UPDATE;

  IF NOT FOUND OR inv.status <> 'pending' OR inv.accepted_at IS NOT NULL THEN
    RAISE EXCEPTION 'Invitation is invalid or already accepted';
  END IF;
  IF inv.expires_at <= now() THEN
    UPDATE public.outlet_invitations SET status = 'expired', updated_at = now() WHERE id = inv.id;
    RAISE EXCEPTION 'Invitation expired';
  END IF;
  IF lower(inv.email) <> v_email THEN
    RAISE EXCEPTION 'Invitation email does not match signed-in account';
  END IF;

  SELECT account_limit INTO v_limit
  FROM public.outlets
  WHERE outlet_id = inv.outlet_id AND access_status = 'active' AND status = 'active'
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Outlet is unavailable'; END IF;

  SELECT count(*) INTO v_count
  FROM public.outlet_members
  WHERE outlet_id = inv.outlet_id AND status = 'active';
  IF v_count >= v_limit THEN RAISE EXCEPTION 'Outlet account limit reached'; END IF;

  PERFORM public.ensure_identity_profiles();

  INSERT INTO public.outlet_members(outlet_id, user_id, role, status, invited_by)
  VALUES (inv.outlet_id, v_uid, inv.role, 'active', inv.invited_by)
  ON CONFLICT (outlet_id, user_id) DO NOTHING;

  INSERT INTO public.users(uid, email, outlet_id, role, display_name)
  VALUES (
    v_uid::text,
    v_email,
    inv.outlet_id,
    inv.role,
    coalesce((SELECT full_name FROM public.profiles WHERE id = v_uid), split_part(v_email, '@', 1))
  )
  ON CONFLICT (uid) DO UPDATE
  SET email = excluded.email,
      outlet_id = excluded.outlet_id,
      role = CASE
        WHEN public.users.role = 'platform_admin' THEN public.users.role
        ELSE excluded.role
      END;

  UPDATE public.outlet_invitations
  SET status = 'accepted', accepted_at = now(), accepted_by = v_uid, updated_at = now()
  WHERE id = inv.id;

  INSERT INTO public.audit_logs(outlet_id, actor_user_id, action, target_type, target_id, metadata)
  VALUES (inv.outlet_id, v_uid, 'member.invitation_accepted', 'outlet_member', v_uid::text, jsonb_build_object('role', inv.role));

  RETURN jsonb_build_object('outlet_id', inv.outlet_id, 'role', inv.role);
END;
$$;
