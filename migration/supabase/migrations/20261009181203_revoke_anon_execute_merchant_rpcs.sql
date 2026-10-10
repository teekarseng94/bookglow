REVOKE ALL ON FUNCTION public._merchant_revenue_between(text, date, date) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.merchant_dashboard_aggregates(text, date, date, date, date, date, date, date, date, date, date) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.complete_pos_sale(jsonb, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.void_sale_and_remove_linked_appointments(text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.delete_appointment_and_linked_sale(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.append_platform_audit_event(text, text, text, text, jsonb, text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public._merchant_revenue_between(text, date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.merchant_dashboard_aggregates(text, date, date, date, date, date, date, date, date, date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_pos_sale(jsonb, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.void_sale_and_remove_linked_appointments(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_appointment_and_linked_sale(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.append_platform_audit_event(text, text, text, text, jsonb, text) TO authenticated;