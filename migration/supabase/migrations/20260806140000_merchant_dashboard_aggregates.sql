-- Phase 5 egress: dashboard + monthly report aggregate RPCs.
-- Financial definitions match merchant-portal Dashboard.tsx / ReportPage.tsx.
-- Authz: platform admin OR current_portal_outlet_id() = p_outlet_id.
-- Does not weaken RLS; returns aggregates only (no full row dumps).

CREATE INDEX IF NOT EXISTS idx_transactions_outlet_date
  ON public.transactions (outlet_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_transactions_outlet_type_date
  ON public.transactions (outlet_id, type, date DESC);

CREATE INDEX IF NOT EXISTS idx_appointments_outlet_date
  ON public.appointments (outlet_id, date);

-- Revenue helper (Dashboard SALE predicate). Defined before aggregates that call it.
CREATE OR REPLACE FUNCTION public._merchant_revenue_between(
  p_outlet_id text,
  p_start date,
  p_end date
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sum numeric := 0;
BEGIN
  IF NOT (
    public.is_portal_platform_admin()
    OR public.current_portal_outlet_id() = p_outlet_id
  ) THEN
    RAISE EXCEPTION 'Not allowed for this outlet.' USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(SUM(t.amount), 0) INTO v_sum
  FROM public.transactions t
  WHERE t.outlet_id = p_outlet_id
    AND t.type = 'SALE'
    AND lower(COALESCE(t.status, '')) NOT IN ('void', 'voided')
    AND COALESCE(t.category, '') NOT IN ('Voucher', 'Redemption')
    AND (timezone('UTC', t.date))::date >= p_start
    AND (timezone('UTC', t.date))::date <= p_end;

  RETURN v_sum;
END;
$$;

-- ---------------------------------------------------------------------------
-- Dashboard aggregates (KPI cards, week chart, payment, category, periods)
-- Date bounds are supplied by the client to preserve existing TZ/window behaviour.
-- Revenue SALE excludes void status and categories Voucher/Redemption (Dashboard parity).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.merchant_dashboard_aggregates(
  p_outlet_id text,
  p_month_start date,
  p_month_end date,
  p_week_start date,
  p_week_end date,
  p_today date,
  p_yesterday date,
  p_prev_week_start date,
  p_prev_week_end date,
  p_prev_month_start date,
  p_prev_month_end date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
  v_revenue numeric := 0;
  v_expenses numeric := 0;
  v_expense_count integer := 0;
  v_client_count integer := 0;
  v_appt_count integer := 0;
  v_outstanding_total numeric := 0;
  v_outstanding_count integer := 0;
  v_week_txn_count integer := 0;
  v_week_sales numeric := 0;
  v_month_sale_count integer := 0;
BEGIN
  IF p_outlet_id IS NULL OR btrim(p_outlet_id) = '' THEN
    RAISE EXCEPTION 'outlet_id is required.' USING ERRCODE = '22023';
  END IF;

  IF NOT (
    public.is_portal_platform_admin()
    OR public.current_portal_outlet_id() = p_outlet_id
  ) THEN
    RAISE EXCEPTION 'Not allowed for this outlet.' USING ERRCODE = '42501';
  END IF;

  -- Client count (full CRM headcount; matches Dashboard clients.length)
  SELECT COUNT(*)::integer INTO v_client_count
  FROM public.clients c
  WHERE c.outlet_id = p_outlet_id;

  -- Appointments this month (exclude cancelled + synthetic on-duty rows)
  SELECT COUNT(*)::integer INTO v_appt_count
  FROM public.appointments a
  WHERE a.outlet_id = p_outlet_id
    AND a.date >= p_month_start::text
    AND a.date <= p_month_end::text
    AND COALESCE(lower(a.status), '') <> 'cancelled'
    AND a.id NOT LIKE 'app_onduty_%';

  -- Month revenue (Dashboard definition)
  SELECT COALESCE(SUM(t.amount), 0) INTO v_revenue
  FROM public.transactions t
  WHERE t.outlet_id = p_outlet_id
    AND t.type = 'SALE'
    AND lower(COALESCE(t.status, '')) NOT IN ('void', 'voided')
    AND COALESCE(t.category, '') NOT IN ('Voucher', 'Redemption')
    AND (timezone('UTC', t.date))::date >= p_month_start
    AND (timezone('UTC', t.date))::date <= p_month_end;

  -- Month expenses (Dashboard definition: void status excluded)
  SELECT COALESCE(SUM(t.amount), 0), COUNT(*)::integer
  INTO v_expenses, v_expense_count
  FROM public.transactions t
  WHERE t.outlet_id = p_outlet_id
    AND t.type = 'EXPENSE'
    AND lower(COALESCE(t.status, '')) NOT IN ('void', 'voided')
    AND (timezone('UTC', t.date))::date >= p_month_start
    AND (timezone('UTC', t.date))::date <= p_month_end;

  -- Outstanding from month sales (includes Voucher/Redemption; void excluded)
  SELECT
    COALESCE(SUM(
      CASE
        WHEN COALESCE(t.payment_status, '') = 'partial' OR COALESCE(t.outstanding, 0) > 0
          THEN COALESCE(t.outstanding, t.amount, 0)
        ELSE 0
      END
    ), 0),
    COALESCE(SUM(
      CASE
        WHEN COALESCE(t.payment_status, '') = 'partial' OR COALESCE(t.outstanding, 0) > 0
          THEN 1 ELSE 0
      END
    ), 0)::integer
  INTO v_outstanding_total, v_outstanding_count
  FROM public.transactions t
  WHERE t.outlet_id = p_outlet_id
    AND t.type = 'SALE'
    AND lower(COALESCE(t.status, '')) NOT IN ('void', 'voided')
    AND (timezone('UTC', t.date))::date >= p_month_start
    AND (timezone('UTC', t.date))::date <= p_month_end;

  -- Week sales totals for chart footer
  SELECT COALESCE(SUM(t.amount), 0), COUNT(*)::integer
  INTO v_week_sales, v_week_txn_count
  FROM public.transactions t
  WHERE t.outlet_id = p_outlet_id
    AND t.type = 'SALE'
    AND lower(COALESCE(t.status, '')) NOT IN ('void', 'voided')
    AND COALESCE(t.category, '') NOT IN ('Voucher', 'Redemption')
    AND (timezone('UTC', t.date))::date >= p_week_start
    AND (timezone('UTC', t.date))::date <= p_week_end;

  SELECT COUNT(*)::integer INTO v_month_sale_count
  FROM public.transactions t
  WHERE t.outlet_id = p_outlet_id
    AND t.type = 'SALE'
    AND lower(COALESCE(t.status, '')) NOT IN ('void', 'voided')
    AND (timezone('UTC', t.date))::date >= p_month_start
    AND (timezone('UTC', t.date))::date <= p_month_end;

  SELECT jsonb_build_object(
    'revenue', v_revenue,
    'expenses', v_expenses,
    'expense_txn_count', v_expense_count,
    'profit', v_revenue - v_expenses,
    'client_count', v_client_count,
    'appointment_count', v_appt_count,
    'outstanding_total', v_outstanding_total,
    'outstanding_count', v_outstanding_count,
    'month_sale_count', v_month_sale_count,
    'week_sales', v_week_sales,
    'week_txn_count', v_week_txn_count,
    'payment_summary', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('method', method, 'amount', amount) ORDER BY amount DESC)
      FROM (
        SELECT COALESCE(NULLIF(btrim(t.payment_method), ''), 'Other') AS method,
               SUM(t.amount) AS amount
        FROM public.transactions t
        WHERE t.outlet_id = p_outlet_id
          AND t.type = 'SALE'
          AND lower(COALESCE(t.status, '')) NOT IN ('void', 'voided')
          AND (timezone('UTC', t.date))::date >= p_month_start
          AND (timezone('UTC', t.date))::date <= p_month_end
        GROUP BY 1
      ) p
    ), '[]'::jsonb),
    'category_summary', jsonb_build_object(
      'service', COALESCE((
        SELECT SUM(
          CASE
            WHEN t.items IS NULL OR t.items = '[]'::jsonb THEN t.amount
            ELSE COALESCE((item->>'price')::numeric, 0)
              * COALESCE(NULLIF((item->>'quantity')::numeric, 0), 1)
          END
        )
        FROM public.transactions t
        LEFT JOIN LATERAL jsonb_array_elements(
          CASE WHEN t.items IS NULL OR t.items = '[]'::jsonb THEN '[{"type":"service"}]'::jsonb ELSE t.items END
        ) item ON TRUE
        WHERE t.outlet_id = p_outlet_id
          AND t.type = 'SALE'
          AND lower(COALESCE(t.status, '')) NOT IN ('void', 'voided')
          AND (timezone('UTC', t.date))::date >= p_month_start
          AND (timezone('UTC', t.date))::date <= p_month_end
          AND NOT (COALESCE(t.payment_status, '') = 'partial' OR COALESCE(t.outstanding, 0) > 0)
          AND NOT (COALESCE(t.category, '') = 'Redemption' OR lower(COALESCE(t.description, '')) LIKE '%discount%')
          AND (t.items IS NULL OR t.items = '[]'::jsonb OR item->>'type' = 'service')
      ), 0),
      'product', COALESCE((
        SELECT SUM(
          COALESCE((item->>'price')::numeric, 0)
          * COALESCE(NULLIF((item->>'quantity')::numeric, 0), 1)
        )
        FROM public.transactions t
        CROSS JOIN LATERAL jsonb_array_elements(COALESCE(t.items, '[]'::jsonb)) item
        WHERE t.outlet_id = p_outlet_id
          AND t.type = 'SALE'
          AND lower(COALESCE(t.status, '')) NOT IN ('void', 'voided')
          AND (timezone('UTC', t.date))::date >= p_month_start
          AND (timezone('UTC', t.date))::date <= p_month_end
          AND NOT (COALESCE(t.payment_status, '') = 'partial' OR COALESCE(t.outstanding, 0) > 0)
          AND item->>'type' = 'product'
      ), 0),
      'package', COALESCE((
        SELECT SUM(
          COALESCE((item->>'price')::numeric, 0)
          * COALESCE(NULLIF((item->>'quantity')::numeric, 0), 1)
        )
        FROM public.transactions t
        CROSS JOIN LATERAL jsonb_array_elements(COALESCE(t.items, '[]'::jsonb)) item
        WHERE t.outlet_id = p_outlet_id
          AND t.type = 'SALE'
          AND lower(COALESCE(t.status, '')) NOT IN ('void', 'voided')
          AND (timezone('UTC', t.date))::date >= p_month_start
          AND (timezone('UTC', t.date))::date <= p_month_end
          AND NOT (COALESCE(t.payment_status, '') = 'partial' OR COALESCE(t.outstanding, 0) > 0)
          AND item->>'type' = 'package'
      ), 0),
      'discount', COALESCE((
        SELECT SUM(t.amount)
        FROM public.transactions t
        WHERE t.outlet_id = p_outlet_id
          AND t.type = 'SALE'
          AND lower(COALESCE(t.status, '')) NOT IN ('void', 'voided')
          AND (timezone('UTC', t.date))::date >= p_month_start
          AND (timezone('UTC', t.date))::date <= p_month_end
          AND NOT (COALESCE(t.payment_status, '') = 'partial' OR COALESCE(t.outstanding, 0) > 0)
          AND (COALESCE(t.category, '') = 'Redemption' OR lower(COALESCE(t.description, '')) LIKE '%discount%')
      ), 0),
      'outstanding', v_outstanding_total
    ),
    'top_selling', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'name', name,
        'type', item_type,
        'quantity', quantity,
        'amount', amount
      ) ORDER BY quantity DESC)
      FROM (
        SELECT
          COALESCE(item->>'name', 'Item') AS name,
          COALESCE(item->>'type', 'service') AS item_type,
          SUM(COALESCE(NULLIF((item->>'quantity')::numeric, 0), 1)) AS quantity,
          SUM(
            COALESCE((item->>'price')::numeric, 0)
            * COALESCE(NULLIF((item->>'quantity')::numeric, 0), 1)
          ) AS amount
        FROM public.transactions t
        CROSS JOIN LATERAL jsonb_array_elements(COALESCE(t.items, '[]'::jsonb)) item
        WHERE t.outlet_id = p_outlet_id
          AND t.type = 'SALE'
          AND lower(COALESCE(t.status, '')) NOT IN ('void', 'voided')
          AND COALESCE(t.category, '') <> 'Redemption'
          AND lower(COALESCE(t.description, '')) NOT LIKE '%discount%'
          AND (timezone('UTC', t.date))::date >= p_month_start
          AND (timezone('UTC', t.date))::date <= p_month_end
        GROUP BY 1, 2
        ORDER BY quantity DESC
        LIMIT 5
      ) top
    ), '[]'::jsonb),
    'week_chart', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('day', dlabel, 'sales', sales) ORDER BY dord)
      FROM (
        SELECT
          EXTRACT(ISODOW FROM d)::integer AS dord,
          CASE EXTRACT(ISODOW FROM d)::integer
            WHEN 1 THEN 'Mon' WHEN 2 THEN 'Tue' WHEN 3 THEN 'Wed'
            WHEN 4 THEN 'Thu' WHEN 5 THEN 'Fri' WHEN 6 THEN 'Sat' ELSE 'Sun'
          END AS dlabel,
          COALESCE((
            SELECT SUM(t.amount)
            FROM public.transactions t
            WHERE t.outlet_id = p_outlet_id
              AND t.type = 'SALE'
              AND lower(COALESCE(t.status, '')) NOT IN ('void', 'voided')
              AND COALESCE(t.category, '') NOT IN ('Voucher', 'Redemption')
              AND (timezone('UTC', t.date))::date = d
          ), 0) AS sales
        FROM generate_series(p_week_start, p_week_end, '1 day'::interval) AS g(d)
      ) days
    ), '[]'::jsonb),
    'periods', jsonb_build_object(
      'today', jsonb_build_object(
        'total', public._merchant_revenue_between(p_outlet_id, p_today, p_today),
        'prev', public._merchant_revenue_between(p_outlet_id, p_yesterday, p_yesterday)
      ),
      'week', jsonb_build_object(
        'total', public._merchant_revenue_between(p_outlet_id, p_week_start, p_week_end),
        'prev', public._merchant_revenue_between(p_outlet_id, p_prev_week_start, p_prev_week_end)
      ),
      'month', jsonb_build_object(
        'total', public._merchant_revenue_between(p_outlet_id, p_month_start, p_month_end),
        'prev', public._merchant_revenue_between(p_outlet_id, p_prev_month_start, p_prev_month_end)
      )
    ),
    'visitors', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'client_id', client_id,
        'name', name,
        'spent', spent,
        'points', points
      ) ORDER BY spent DESC)
      FROM (
        SELECT
          t.client_id,
          COALESCE(c.name, 'Unknown') AS name,
          SUM(t.amount) AS spent,
          COALESCE(c.points, 0) AS points
        FROM public.transactions t
        JOIN public.clients c ON c.id = t.client_id AND c.outlet_id = p_outlet_id
        WHERE t.outlet_id = p_outlet_id
          AND t.type = 'SALE'
          AND lower(COALESCE(t.status, '')) NOT IN ('void', 'voided')
          AND t.client_id IS NOT NULL
          AND (timezone('UTC', t.date))::date >= p_month_start
          AND (timezone('UTC', t.date))::date <= p_month_end
        GROUP BY t.client_id, c.name, c.points
        ORDER BY spent DESC
        LIMIT 10
      ) v
    ), '[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- ---------------------------------------------------------------------------
-- Monthly report summary (ReportPage computeMonthlySummary financial totals)
-- Voided = status voided OR voided boolean true (ReportPage parity).
-- Expenses include all EXPENSE rows in month (ReportPage does not void-filter expenses).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.merchant_monthly_report_summary(
  p_outlet_id text,
  p_year integer,
  p_month integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start timestamptz;
  v_end timestamptz;
  v_collection_total numeric := 0;
  v_voided_count integer := 0;
  v_voided_sales numeric := 0;
  v_total_count integer := 0;
  v_total_expenses numeric := 0;
  v_customer_pax integer := 0;
  v_service numeric := 0;
  v_product numeric := 0;
  v_package numeric := 0;
BEGIN
  IF p_outlet_id IS NULL OR btrim(p_outlet_id) = '' THEN
    RAISE EXCEPTION 'outlet_id is required.' USING ERRCODE = '22023';
  END IF;
  IF p_year IS NULL OR p_month IS NULL OR p_month < 1 OR p_month > 12 THEN
    RAISE EXCEPTION 'Invalid year/month.' USING ERRCODE = '22023';
  END IF;

  IF NOT (
    public.is_portal_platform_admin()
    OR public.current_portal_outlet_id() = p_outlet_id
  ) THEN
    RAISE EXCEPTION 'Not allowed for this outlet.' USING ERRCODE = '42501';
  END IF;

  v_start := make_timestamptz(p_year, p_month, 1, 0, 0, 0, 'UTC');
  v_end := (v_start + INTERVAL '1 month') - INTERVAL '1 millisecond';

  SELECT
    COALESCE(SUM(CASE
      WHEN NOT (lower(COALESCE(t.status, '')) = 'voided' OR COALESCE(t.voided, false))
        THEN t.amount ELSE 0 END), 0),
    COUNT(*) FILTER (
      WHERE NOT (lower(COALESCE(t.status, '')) = 'voided' OR COALESCE(t.voided, false))
    )::integer,
    COUNT(*) FILTER (
      WHERE lower(COALESCE(t.status, '')) = 'voided' OR COALESCE(t.voided, false)
    )::integer,
    COALESCE(SUM(CASE
      WHEN lower(COALESCE(t.status, '')) = 'voided' OR COALESCE(t.voided, false)
        THEN t.amount ELSE 0 END), 0),
    COUNT(DISTINCT t.client_id) FILTER (
      WHERE t.client_id IS NOT NULL
        AND NOT (lower(COALESCE(t.status, '')) = 'voided' OR COALESCE(t.voided, false))
    )::integer
  INTO v_collection_total, v_total_count, v_voided_count, v_voided_sales, v_customer_pax
  FROM public.transactions t
  WHERE t.outlet_id = p_outlet_id
    AND t.type = 'SALE'
    AND t.date >= v_start
    AND t.date <= v_end;

  SELECT
    COALESCE(SUM(CASE WHEN item->>'type' = 'service' THEN
      COALESCE((item->>'price')::numeric, 0) * COALESCE(NULLIF((item->>'quantity')::numeric, 0), 1)
    ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN item->>'type' = 'product' THEN
      COALESCE((item->>'price')::numeric, 0) * COALESCE(NULLIF((item->>'quantity')::numeric, 0), 1)
    ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN item->>'type' = 'package' THEN
      COALESCE((item->>'price')::numeric, 0) * COALESCE(NULLIF((item->>'quantity')::numeric, 0), 1)
    ELSE 0 END), 0)
  INTO v_service, v_product, v_package
  FROM public.transactions t
  CROSS JOIN LATERAL jsonb_array_elements(COALESCE(t.items, '[]'::jsonb)) item
  WHERE t.outlet_id = p_outlet_id
    AND t.type = 'SALE'
    AND t.date >= v_start
    AND t.date <= v_end
    AND NOT (lower(COALESCE(t.status, '')) = 'voided' OR COALESCE(t.voided, false));

  SELECT COALESCE(SUM(t.amount), 0) INTO v_total_expenses
  FROM public.transactions t
  WHERE t.outlet_id = p_outlet_id
    AND t.type = 'EXPENSE'
    AND t.date >= v_start
    AND t.date <= v_end;

  RETURN jsonb_build_object(
    'collection_total', v_collection_total,
    'sales_total', v_collection_total,
    'total_count', v_total_count,
    'voided_count', v_voided_count,
    'voided_sales', v_voided_sales,
    'customer_pax', v_customer_pax,
    'service', v_service,
    'product', v_product,
    'package', v_package,
    'total_expenses', v_total_expenses,
    'total_collection', v_collection_total,
    'closing_balance', v_collection_total - v_total_expenses,
    'average_sales', CASE WHEN v_total_count > 0 THEN v_collection_total / v_total_count ELSE 0 END,
    'collection', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('name', method, 'value', amount) ORDER BY amount DESC)
      FROM (
        SELECT COALESCE(NULLIF(btrim(t.payment_method), ''), 'Other') AS method,
               SUM(t.amount) AS amount
        FROM public.transactions t
        WHERE t.outlet_id = p_outlet_id
          AND t.type = 'SALE'
          AND t.date >= v_start
          AND t.date <= v_end
          AND NOT (lower(COALESCE(t.status, '')) = 'voided' OR COALESCE(t.voided, false))
        GROUP BY 1
      ) c
    ), '[]'::jsonb),
    'expenses', COALESCE((
      SELECT jsonb_object_agg(cat, amt)
      FROM (
        SELECT
          CASE
            WHEN btrim(COALESCE(t.category, '')) IN ('Rent','Supplies','Utilities','Marketing','Payroll','Commission')
              THEN btrim(t.category)
            ELSE 'Other'
          END AS cat,
          SUM(t.amount) AS amt
        FROM public.transactions t
        WHERE t.outlet_id = p_outlet_id
          AND t.type = 'EXPENSE'
          AND t.date >= v_start
          AND t.date <= v_end
        GROUP BY 1
      ) e
    ), '{}'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public._merchant_revenue_between(text, date, date) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.merchant_dashboard_aggregates(text, date, date, date, date, date, date, date, date, date, date) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.merchant_monthly_report_summary(text, integer, integer) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public._merchant_revenue_between(text, date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.merchant_dashboard_aggregates(text, date, date, date, date, date, date, date, date, date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.merchant_monthly_report_summary(text, integer, integer) TO authenticated;
