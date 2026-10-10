DO $patch$
DECLARE
  rec record;
  def text;
BEGIN
  FOR rec IN
    SELECT p.oid
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        '_merchant_revenue_between',
        'merchant_dashboard_aggregates',
        'merchant_monthly_report_summary'
      )
  LOOP
    def := pg_get_functiondef(rec.oid);
    def := replace(def, 'timezone(''UTC''', 'timezone(''Asia/Kuala_Lumpur''');
    def := replace(
      def,
      'make_timestamptz(p_year, p_month, 1, 0, 0, 0, ''UTC'')',
      'make_timestamptz(p_year, p_month, 1, 0, 0, 0, ''Asia/Kuala_Lumpur'')'
    );
    EXECUTE def;
  END LOOP;
END
$patch$;

REVOKE ALL ON FUNCTION public._merchant_revenue_between(text, date, date) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.merchant_dashboard_aggregates(text, date, date, date, date, date, date, date, date, date, date) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.merchant_monthly_report_summary(text, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public._merchant_revenue_between(text, date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.merchant_dashboard_aggregates(text, date, date, date, date, date, date, date, date, date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.merchant_monthly_report_summary(text, integer, integer) TO authenticated;