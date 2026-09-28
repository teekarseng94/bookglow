-- Settings autofill: booking path, contact details and receipt identity.
--
--  * The booking path mirrors the shop name. `booking_slug_from_name` is the SQL
--    twin of shopNameToBookingSlug in the merchant portal so a workspace created
--    by onboarding and one renamed in Settings agree on the same path. Names with
--    no Latin characters return '' and fall back to the generated path; Settings
--    then prompts the merchant for a readable one.
--  * Onboarding collected the address, website and phone but only ever wrote the
--    business name, so Settings showed empty contact fields. `create_merchant_workspace`
--    now copies them from the merchant's own onboarding draft, and existing
--    outlets are backfilled the same way below.
--  * Receipt company name is dropped when it still holds the literal app default
--    'Bookglow', so it inherits the shop name instead of printing 'Bookglow' on
--    every outlet's receipts.
--
-- Existing booking paths are deliberately left untouched: customers already hold
-- links and printed QR codes for them.

-- ---------------------------------------------------------------------------
-- 0. Blank-or-null helper.
-- ---------------------------------------------------------------------------

-- Onboarding textareas arrive with trailing newlines, and plain trim() only
-- strips spaces, so an "empty" field can still test as present.
CREATE OR REPLACE FUNCTION public.text_or_null(value text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$ SELECT nullif(btrim(coalesce(value, ''), E' \t\r\n'), ''); $$;

REVOKE ALL ON FUNCTION public.text_or_null(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.text_or_null(text) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 1. Shop-name -> booking path, matching the portal's camelCase derivation.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.booking_slug_from_name(value text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  v_word text;
  v_clean text;
  v_out text := '';
  v_first boolean := true;
BEGIN
  FOR v_word IN
    SELECT unnest(regexp_split_to_array(trim(coalesce(value, '')), '\s+'))
  LOOP
    v_clean := regexp_replace(v_word, '[^a-zA-Z0-9]', '', 'g');
    CONTINUE WHEN v_clean = '';
    IF v_first THEN
      v_out := lower(v_clean);
      v_first := false;
    ELSE
      v_out := v_out || upper(left(v_clean, 1)) || lower(substr(v_clean, 2));
    END IF;
  END LOOP;

  -- Must be a usable URL segment starting with a letter. CJK-only names and
  -- names starting with a digit return '' so the caller asks for a path.
  IF v_out ~ '^[a-zA-Z][a-zA-Z0-9_-]*$' THEN
    RETURN v_out;
  END IF;
  RETURN '';
END;
$$;

REVOKE ALL ON FUNCTION public.booking_slug_from_name(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.booking_slug_from_name(text) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 2. Workspace creation carries the contact details the merchant already typed.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.create_merchant_workspace(
  p_request_id uuid,
  p_business_name text,
  p_business_type text,
  p_phone text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_req public.merchant_provision_requests%rowtype;
  v_outlet text;
  v_email text;
  v_slug text;
  v_slug_base text;
  v_slug_name text;
  v_pending boolean := false;
  v_draft jsonb;
  v_addr text;
  v_website text;
  v_timezone text;
  v_phone_number text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF length(trim(coalesce(p_business_name, ''))) < 2 THEN RAISE EXCEPTION 'Business name is required'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(v_uid::text, 0));

  SELECT * INTO v_req FROM public.merchant_provision_requests WHERE request_id = p_request_id FOR UPDATE;
  IF FOUND THEN
    IF v_req.user_id <> v_uid THEN RAISE EXCEPTION 'Provision request belongs to another user'; END IF;
    IF v_req.status = 'succeeded' THEN
      RETURN (
        SELECT jsonb_build_object(
          'outlet_id', o.outlet_id, 'booking_slug', o.booking_slug, 'idempotent', true,
          'role', 'owner', 'onboarding_status', o.onboarding_status,
          'current_step', s.current_step, 'access_status', o.access_status,
          'registration_pending', false
        )
        FROM public.outlets o
        LEFT JOIN public.onboarding_states s ON s.outlet_id = o.outlet_id
        WHERE o.outlet_id = v_req.outlet_id
      );
    END IF;
  ELSE
    INSERT INTO public.merchant_provision_requests(request_id, user_id) VALUES (p_request_id, v_uid);
  END IF;

  SELECT om.outlet_id, coalesce(o.settings->>'merchantSetupPending', '') = 'true'
    INTO v_outlet, v_pending
  FROM public.outlet_members om
  JOIN public.outlets o ON o.outlet_id = om.outlet_id
  WHERE om.user_id = v_uid AND om.role = 'owner' AND om.status = 'active'
  ORDER BY om.created_at
  LIMIT 1;

  SELECT email INTO v_email FROM auth.users WHERE id = v_uid;
  PERFORM public.ensure_identity_profiles();

  -- Contact details the wizard stored step by step. Read before the draft is
  -- marked complete below; the upsert there never overwrites `payload`.
  SELECT payload INTO v_draft
  FROM public.merchant_onboarding_drafts
  WHERE auth_user_id = v_uid;

  v_addr := public.text_or_null(v_draft->'location'->>'addressDisplay');
  v_website := public.text_or_null(v_draft->>'website');
  v_timezone := public.text_or_null(v_draft->'location'->>'timezone');
  v_phone_number := coalesce(
    public.text_or_null(p_phone),
    public.text_or_null(v_draft->>'phoneE164'),
    (SELECT public.text_or_null(phone) FROM public.profiles WHERE id = v_uid)
  );

  v_slug_base := coalesce(nullif(public.slugify_booking_name(trim(p_business_name)), ''), 'business');
  v_slug_name := public.booking_slug_from_name(trim(p_business_name));

  IF v_outlet IS NOT NULL AND v_pending THEN
    -- Prefer the plain shop-name path so the portal recognises it as still
    -- following the shop name; fall back to a suffixed path when it is taken.
    IF v_slug_name <> '' AND NOT EXISTS (
      SELECT 1 FROM public.outlets WHERE lower(booking_slug) = lower(v_slug_name) AND outlet_id <> v_outlet
    ) THEN
      v_slug := v_slug_name;
    ELSE
      v_slug := v_slug_base || '-' || substr(v_outlet, -6);
      WHILE EXISTS (
        SELECT 1 FROM public.outlets WHERE lower(booking_slug) = lower(v_slug) AND outlet_id <> v_outlet
      ) LOOP
        v_slug := v_slug_base || '-' || substr(encode(gen_random_bytes(4), 'hex'), 1, 8);
      END LOOP;
    END IF;

    UPDATE public.outlets SET
      name = trim(p_business_name),
      email = v_email,
      phone = coalesce(public.text_or_null(p_phone), phone),
      phone_number = coalesce(public.text_or_null(phone_number), v_phone_number),
      address_display = coalesce(public.text_or_null(address_display), v_addr),
      website = coalesce(public.text_or_null(website), v_website),
      timezone = coalesce(public.text_or_null(timezone), v_timezone, timezone),
      business_type = p_business_type,
      booking_slug = v_slug,
      settings = (coalesce(settings, '{}'::jsonb) - 'merchantSetupPending')
        || jsonb_build_object('shopName', trim(p_business_name), 'merchantSetupCompletedAt', now()),
      updated_at = now()
    WHERE outlet_id = v_outlet;

    INSERT INTO public.merchant_onboarding_drafts(auth_user_id, current_step, account_type, payload, completed_at, updated_at)
    VALUES (v_uid, 'complete', 'create', jsonb_build_object('businessName', trim(p_business_name)), now(), now())
    ON CONFLICT (auth_user_id) DO UPDATE
      SET current_step = 'complete', account_type = 'create', completed_at = now(), updated_at = now();

    UPDATE public.merchant_provision_requests
      SET status = 'succeeded', outlet_id = v_outlet, updated_at = now()
      WHERE request_id = p_request_id;

    INSERT INTO public.audit_logs(outlet_id, actor_user_id, action, target_type, target_id)
    VALUES (v_outlet, v_uid, 'merchant.workspace_setup_completed', 'outlet', v_outlet);

    RETURN jsonb_build_object(
      'outlet_id', v_outlet, 'booking_slug', v_slug, 'idempotent', false,
      'role', 'owner', 'onboarding_status', 'incomplete', 'current_step', 'business',
      'access_status', 'active', 'registration_pending', false
    );
  END IF;

  IF v_outlet IS NOT NULL THEN
    RETURN (
      SELECT jsonb_build_object(
        'outlet_id', o.outlet_id, 'booking_slug', o.booking_slug, 'idempotent', true,
        'role', 'owner', 'onboarding_status', o.onboarding_status,
        'current_step', s.current_step, 'access_status', o.access_status,
        'registration_pending', false
      )
      FROM public.outlets o
      LEFT JOIN public.onboarding_states s ON s.outlet_id = o.outlet_id
      WHERE o.outlet_id = v_outlet
    );
  END IF;

  v_outlet := 'outlet_' || replace(gen_random_uuid()::text, '-', '');
  IF v_slug_name <> '' AND NOT EXISTS (
    SELECT 1 FROM public.outlets WHERE lower(booking_slug) = lower(v_slug_name)
  ) THEN
    v_slug := v_slug_name;
  ELSE
    v_slug := v_slug_base || '-' || substr(v_outlet, -6);
    WHILE EXISTS (SELECT 1 FROM public.outlets WHERE lower(booking_slug) = lower(v_slug)) LOOP
      v_slug := v_slug_base || '-' || substr(encode(gen_random_bytes(4), 'hex'), 1, 8);
    END LOOP;
  END IF;

  INSERT INTO public.outlets(
    outlet_id, name, email, phone, phone_number, address_display, website, business_type,
    owner_user_id, booking_slug, is_active, status, onboarding_status, access_status,
    account_limit, settings
  ) VALUES (
    v_outlet, trim(p_business_name), v_email, p_phone, v_phone_number, v_addr, v_website, p_business_type,
    v_uid, v_slug, true, 'active', 'incomplete', 'active', 3,
    jsonb_build_object('shopName', trim(p_business_name), 'merchantSetupCompletedAt', now())
  );
  INSERT INTO public.outlet_members(outlet_id, user_id, role, status) VALUES (v_outlet, v_uid, 'owner', 'active');
  INSERT INTO public.onboarding_states(outlet_id) VALUES (v_outlet);
  INSERT INTO public.users(uid, email, outlet_id, role, display_name)
  VALUES (
    v_uid::text, v_email, v_outlet, 'admin',
    coalesce((SELECT full_name FROM public.profiles WHERE id = v_uid), split_part(v_email, '@', 1))
  )
  ON CONFLICT (uid) DO UPDATE SET outlet_id = excluded.outlet_id, role = 'admin';

  INSERT INTO public.merchant_onboarding_drafts(auth_user_id, current_step, account_type, payload, completed_at, updated_at)
  VALUES (v_uid, 'complete', 'create', jsonb_build_object('businessName', trim(p_business_name)), now(), now())
  ON CONFLICT (auth_user_id) DO UPDATE
    SET current_step = 'complete', account_type = 'create', completed_at = now(), updated_at = now();

  INSERT INTO public.audit_logs(outlet_id, actor_user_id, action, target_type, target_id)
  VALUES (v_outlet, v_uid, 'merchant.workspace_created', 'outlet', v_outlet);
  UPDATE public.merchant_provision_requests
    SET status = 'succeeded', outlet_id = v_outlet, updated_at = now()
    WHERE request_id = p_request_id;

  RETURN jsonb_build_object(
    'outlet_id', v_outlet, 'booking_slug', v_slug, 'idempotent', false,
    'role', 'owner', 'onboarding_status', 'incomplete', 'current_step', 'business',
    'access_status', 'active', 'registration_pending', false
  );
END;
$function$;

-- ---------------------------------------------------------------------------
-- 3. Backfill contact details for outlets created before the fix.
-- ---------------------------------------------------------------------------

-- From the owner's onboarding draft. Only fills blanks, never overwrites a value
-- the merchant has since typed into Settings.
UPDATE public.outlets o SET
  address_display = coalesce(
    public.text_or_null(o.address_display),
    public.text_or_null(d.payload->'location'->>'addressDisplay')
  ),
  phone_number = coalesce(
    public.text_or_null(o.phone_number),
    public.text_or_null(o.phone),
    public.text_or_null(d.payload->>'phoneE164')
  ),
  website = coalesce(
    public.text_or_null(o.website),
    public.text_or_null(d.payload->>'website')
  ),
  updated_at = now()
FROM public.outlet_members om
JOIN public.merchant_onboarding_drafts d ON d.auth_user_id = om.user_id
WHERE om.outlet_id = o.outlet_id
  AND om.role = 'owner'
  AND om.status = 'active';

-- Owners who gave a phone number on the profile step but never reached the
-- address step still get their phone through.
UPDATE public.outlets o SET
  phone_number = public.text_or_null(p.phone),
  updated_at = now()
FROM public.outlet_members om
JOIN public.profiles p ON p.id = om.user_id
WHERE om.outlet_id = o.outlet_id
  AND om.role = 'owner'
  AND om.status = 'active'
  AND public.text_or_null(o.phone_number) IS NULL
  AND public.text_or_null(p.phone) IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 4. Let the receipt company name inherit the shop name again.
-- ---------------------------------------------------------------------------

-- 'Bookglow' is the app's old hardcoded default, not a merchant's choice, so it
-- printed on every outlet's receipts. Removing the key makes the receipt follow
-- the shop name; deliberate overrides are left alone.
UPDATE public.outlets
SET settings = settings - 'receiptCompanyName',
    updated_at = now()
WHERE settings->>'receiptCompanyName' = 'Bookglow';
