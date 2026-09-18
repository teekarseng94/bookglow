-- Superadmin UX/UI Phase 1: server-bounded global search and outlet inspector reads.
-- The functions return allow-listed operator data only and require platform-admin authorization.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_outlets_name_trgm
  ON public.outlets USING gin (lower(name) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_users_email_trgm
  ON public.users USING gin (lower(email) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_users_display_name_trgm
  ON public.users USING gin (lower(display_name) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_appointments_reference_prefix
  ON public.appointments (lower(id) text_pattern_ops);
CREATE INDEX IF NOT EXISTS idx_transactions_reference_prefix
  ON public.transactions (lower(id) text_pattern_ops);
CREATE INDEX IF NOT EXISTS idx_monitoring_correlation_prefix
  ON public.platform_monitoring_events (lower(correlation_id) text_pattern_ops)
  WHERE correlation_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.platform_global_search(
  p_query text,
  p_limit_per_group integer DEFAULT 5
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_query text := left(lower(trim(coalesce(p_query, ''))), 120);
  v_escaped text;
  v_contains text;
  v_prefix text;
  v_limit integer := least(greatest(coalesce(p_limit_per_group, 5), 1), 10);
  v_results jsonb;
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Platform administrator access required';
  END IF;
  IF length(v_query) < 2 THEN
    RETURN jsonb_build_object('results', '[]'::jsonb, 'minimum_query_length', 2);
  END IF;

  -- Escape LIKE metacharacters. The raw query is never written to audit/monitoring tables.
  v_escaped := replace(replace(replace(v_query, '\', '\\'), '%', '\%'), '_', '\_');
  v_contains := '%' || v_escaped || '%';
  v_prefix := v_escaped || '%';

  WITH candidates AS (
    SELECT 'outlet'::text entity_type, o.outlet_id entity_id,
      coalesce(nullif(o.name, ''), o.outlet_id) title,
      CASE WHEN lower(o.outlet_id) LIKE v_contains ESCAPE '\' THEN o.outlet_id ELSE coalesce(nullif(o.name, ''), o.outlet_id) END matched_text,
      o.outlet_id, coalesce(nullif(o.name, ''), o.outlet_id) outlet_name,
      coalesce(o.access_status, o.status, 'unknown') status, coalesce(o.updated_at, o.created_at) occurred_at,
      CASE WHEN lower(o.outlet_id) = v_query THEN 0 WHEN lower(o.outlet_id) LIKE v_prefix ESCAPE '\' THEN 1 ELSE 2 END match_rank
    FROM public.outlets o
    WHERE lower(o.outlet_id) LIKE v_contains ESCAPE '\' OR lower(coalesce(o.name, '')) LIKE v_contains ESCAPE '\'

    UNION ALL
    SELECT 'user', u.uid,
      coalesce(nullif(u.display_name, ''), nullif(u.email, ''), u.uid),
      CASE WHEN lower(coalesce(u.email, '')) LIKE v_contains ESCAPE '\' THEN coalesce(u.email, u.uid) ELSE coalesce(nullif(u.display_name, ''), u.uid) END,
      m.outlet_id, coalesce(nullif(o.name, ''), m.outlet_id),
      coalesce(c.status, m.status, 'active'), u.created_at,
      CASE WHEN lower(coalesce(u.email, '')) = v_query THEN 0 WHEN lower(coalesce(u.email, '')) LIKE v_prefix ESCAPE '\' THEN 1 ELSE 2 END
    FROM public.outlet_members m
    JOIN public.users u ON u.uid = m.user_id::text
    JOIN public.outlets o ON o.outlet_id = m.outlet_id
    LEFT JOIN public.platform_account_controls c ON c.user_id = m.user_id
    WHERE m.status <> 'removed' AND (
      lower(coalesce(u.email, '')) LIKE v_contains ESCAPE '\'
      OR lower(coalesce(u.display_name, '')) LIKE v_contains ESCAPE '\'
    )

    UNION ALL
    SELECT 'booking', a.id, 'Booking ' || a.id, a.id,
      a.outlet_id, coalesce(nullif(o.name, ''), a.outlet_id), coalesce(a.status, 'unknown'),
      coalesce(a.updated_at, a.created_at),
      CASE WHEN lower(a.id) = v_query THEN 0 ELSE 1 END
    FROM public.appointments a
    JOIN public.outlets o ON o.outlet_id = a.outlet_id
    WHERE lower(a.id) LIKE v_prefix ESCAPE '\'

    UNION ALL
    SELECT 'sale', t.id, 'Sale ' || t.id, t.id,
      t.outlet_id, coalesce(nullif(o.name, ''), t.outlet_id), coalesce(t.status, t.payment_status, t.type, 'unknown'),
      t.created_at,
      CASE WHEN lower(t.id) = v_query THEN 0 ELSE 1 END
    FROM public.transactions t
    JOIN public.outlets o ON o.outlet_id = t.outlet_id
    WHERE lower(t.id) LIKE v_prefix ESCAPE '\'

    UNION ALL
    SELECT 'support_case', c.id::text, 'Case ' || c.id::text, c.id::text,
      c.outlet_id, coalesce(nullif(o.name, ''), c.outlet_id), c.status, c.updated_at,
      CASE WHEN lower(c.id::text) = v_query THEN 0 ELSE 1 END
    FROM public.platform_support_cases c
    JOIN public.outlets o ON o.outlet_id = c.outlet_id
    WHERE lower(c.id::text) LIKE v_prefix ESCAPE '\'

    UNION ALL
    SELECT 'operation', op.id::text, 'Operation ' || op.id::text, op.id::text,
      op.outlet_id, coalesce(nullif(o.name, ''), op.outlet_id, 'Platform'), op.state,
      coalesce(op.completed_at, op.started_at),
      CASE WHEN lower(op.id::text) = v_query THEN 0 ELSE 1 END
    FROM public.platform_admin_operations op
    LEFT JOIN public.outlets o ON o.outlet_id = op.outlet_id
    WHERE lower(op.id::text) LIKE v_prefix ESCAPE '\'

    UNION ALL
    SELECT 'operation', e.correlation_id, 'Correlation ' || e.correlation_id, e.correlation_id,
      e.outlet_id, coalesce(nullif(o.name, ''), e.outlet_id, 'Platform'), e.severity,
      e.occurred_at,
      CASE WHEN lower(e.correlation_id) = v_query THEN 0 ELSE 1 END
    FROM public.platform_monitoring_events e
    LEFT JOIN public.outlets o ON o.outlet_id = e.outlet_id
    WHERE e.correlation_id IS NOT NULL AND lower(e.correlation_id) LIKE v_prefix ESCAPE '\'

    UNION ALL
    SELECT 'audit', e.id::text, 'Audit ' || e.id::text, e.id::text,
      e.outlet_id, coalesce(nullif(o.name, ''), e.outlet_id, 'Platform'), e.outcome,
      e.occurred_at,
      CASE WHEN lower(e.id::text) = v_query THEN 0 ELSE 1 END
    FROM public.platform_audit_events e
    LEFT JOIN public.outlets o ON o.outlet_id = e.outlet_id
    WHERE lower(e.id::text) LIKE v_prefix ESCAPE '\'
       OR (e.operation_id IS NOT NULL AND lower(e.operation_id::text) LIKE v_prefix ESCAPE '\')
  ), ranked AS (
    SELECT candidates.*,
      row_number() OVER (PARTITION BY entity_type ORDER BY match_rank, occurred_at DESC NULLS LAST, entity_id) group_position
    FROM candidates
  )
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'entity_type', entity_type,
    'entity_id', entity_id,
    'title', title,
    'matched_text', matched_text,
    'outlet_id', outlet_id,
    'outlet_name', outlet_name,
    'status', status,
    'occurred_at', occurred_at
  ) ORDER BY entity_type, group_position), '[]'::jsonb)
  INTO v_results
  FROM ranked
  WHERE group_position <= v_limit;

  RETURN jsonb_build_object('results', v_results, 'limit_per_group', v_limit);
END;
$$;

CREATE OR REPLACE FUNCTION public.platform_outlet_inspector(p_outlet_id text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_summary jsonb;
  v_accounts jsonb;
  v_billing jsonb;
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Platform administrator access required';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.outlets WHERE outlet_id = p_outlet_id) THEN
    RAISE EXCEPTION 'Outlet not found';
  END IF;

  WITH target AS (
    SELECT * FROM public.outlets WHERE outlet_id = p_outlet_id
  ), owner_account AS (
    SELECT m.user_id,
      coalesce(nullif(p.full_name, ''), nullif(u.display_name, '')) owner_name,
      coalesce(nullif(p.email, ''), nullif(u.email, ''), au.email) owner_email
    FROM target o
    JOIN public.outlet_members m ON m.outlet_id = o.outlet_id AND m.status = 'active'
    LEFT JOIN public.profiles p ON p.id = m.user_id
    LEFT JOIN public.users u ON u.uid = m.user_id::text
    LEFT JOIN auth.users au ON au.id = m.user_id
    WHERE m.role = 'owner' OR m.user_id = o.owner_user_id
    ORDER BY (m.user_id = o.owner_user_id) DESC, m.created_at
    LIMIT 1
  ), recent AS (
    SELECT * FROM (
      SELECT 'booking'::text type, a.id reference, a.status, coalesce(a.updated_at, a.created_at) occurred_at
      FROM public.appointments a WHERE a.outlet_id = p_outlet_id
      UNION ALL
      SELECT 'sale', t.id, coalesce(t.status, t.payment_status, t.type), t.created_at
      FROM public.transactions t WHERE t.outlet_id = p_outlet_id
      UNION ALL
      SELECT 'support', c.id::text, c.status, c.updated_at
      FROM public.platform_support_cases c WHERE c.outlet_id = p_outlet_id
      UNION ALL
      SELECT 'audit', e.id::text, e.outcome, e.occurred_at
      FROM public.platform_audit_events e WHERE e.outlet_id = p_outlet_id
    ) activity
    ORDER BY occurred_at DESC NULLS LAST
    LIMIT 8
  ), activity_json AS (
    SELECT coalesce(jsonb_agg(to_jsonb(recent) ORDER BY occurred_at DESC NULLS LAST), '[]'::jsonb) value FROM recent
  )
  SELECT jsonb_build_object(
    'outlet_id', o.outlet_id,
    'name', coalesce(nullif(o.name, ''), o.outlet_id),
    'portal_status', coalesce(o.access_status, o.status, 'unknown'),
    'onboarding_status', coalesce(o.onboarding_status, 'unknown'),
    'last_activity_at', greatest(
      o.updated_at,
      (SELECT max(coalesce(a.updated_at, a.created_at)) FROM public.appointments a WHERE a.outlet_id = o.outlet_id),
      (SELECT max(t.created_at) FROM public.transactions t WHERE t.outlet_id = o.outlet_id),
      (SELECT max(e.occurred_at) FROM public.platform_audit_events e WHERE e.outlet_id = o.outlet_id)
    ),
    'owner_name', owner.owner_name,
    'owner_email', owner.owner_email,
    'email', nullif(o.email, ''),
    'phone', coalesce(nullif(o.phone, ''), nullif(o.phone_number, '')),
    'booking_slug', nullif(o.booking_slug, ''),
    'timezone', nullif(o.timezone, ''),
    'business_hours_status', CASE
      WHEN o.business_hours IS NULL THEN 'missing'
      WHEN jsonb_typeof(o.business_hours) <> 'object' THEN 'unknown'
      WHEN EXISTS (
        SELECT 1 FROM jsonb_each(o.business_hours) h
        WHERE lower(coalesce(h.value->>'isOpen', 'true')) = 'true'
          AND nullif(h.value->>'open', '') IS NOT NULL
          AND nullif(h.value->>'close', '') IS NOT NULL
      ) THEN 'configured' ELSE 'missing' END,
    'active_user_count', (
      SELECT count(*) FROM public.outlet_members m
      LEFT JOIN public.platform_account_controls c ON c.user_id = m.user_id
      WHERE m.outlet_id = o.outlet_id AND m.status = 'active' AND coalesce(c.status, 'active') = 'active'
    ),
    'recent_activity', activity_json.value
  ) INTO v_summary
  FROM target o
  LEFT JOIN owner_account owner ON true
  CROSS JOIN activity_json;

  SELECT coalesce(jsonb_agg(to_jsonb(account_row) ORDER BY
    CASE account_row.role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 WHEN 'manager' THEN 2 ELSE 3 END,
    account_row.name, account_row.email
  ), '[]'::jsonb)
  INTO v_accounts
  FROM (
    SELECT m.user_id::text id,
      coalesce(nullif(p.full_name, ''), nullif(u.display_name, ''), nullif(au.raw_user_meta_data->>'full_name', '')) name,
      coalesce(nullif(p.email, ''), nullif(u.email, ''), au.email) email,
      m.role,
      m.status membership_status,
      coalesce(c.status, 'active') account_status,
      au.last_sign_in_at,
      CASE
        WHEN au.invited_at IS NOT NULL AND au.confirmed_at IS NULL THEN 'invited'
        WHEN au.confirmed_at IS NULL THEN 'pending'
        ELSE 'accepted'
      END invitation_state
    FROM public.outlet_members m
    LEFT JOIN public.profiles p ON p.id = m.user_id
    LEFT JOIN public.users u ON u.uid = m.user_id::text
    LEFT JOIN auth.users au ON au.id = m.user_id
    LEFT JOIN public.platform_account_controls c ON c.user_id = m.user_id
    WHERE m.outlet_id = p_outlet_id AND m.status <> 'removed'
  ) account_row;

  SELECT to_jsonb(subscription_row) INTO v_billing
  FROM (
    SELECT s.provider, s.status, s.trial_end, s.current_period_start, s.current_period_end,
      s.unit_amount, s.currency, s.recurring_interval, s.interval_count, s.quantity,
      s.discount_percent, coalesce(s.mrr_reliable, false) mrr_reliable
    FROM public.outlet_subscriptions s
    WHERE s.outlet_id = p_outlet_id
    ORDER BY s.updated_at DESC
    LIMIT 1
  ) subscription_row;

  RETURN jsonb_build_object(
    'summary', v_summary,
    'accounts', v_accounts,
    'billing', v_billing
  );
END;
$$;

REVOKE ALL ON FUNCTION public.platform_global_search(text, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.platform_outlet_inspector(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.platform_global_search(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.platform_outlet_inspector(text) TO authenticated;
