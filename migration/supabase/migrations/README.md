# Supabase migrations (incremental)
#
# Existing baseline SQL (manual apply / reference):
#   migration/sql/001_create_tables.sql
#   migration/sql/002_create_indexes.sql
#   migration/sql/003_rls_policies.sql
#   migration/sql/004_triggers.sql
#
# Public booking (outlets + services + anon SELECT):
#   20260721120000_public_outlets_services.sql
# Public booking staff:
#   20260722010000_public_staff.sql
# Public available slots (appointments + RPC):
#   20260722020000_public_available_slots.sql
# Public create booking (clients + frontend_customers + RPC):
#   20260722030000_public_create_booking.sql
# Public reviews write + customer profile auth helpers:
#   20260722040000_public_reviews_customer_auth.sql
# Merchant portal Phase 1 (users + merchant RLS):
#   20260722050000_merchant_portal_phase1.sql
# Merchant portal Phase 2 (CRM clients + ledgers):
#   20260722060000_merchant_portal_phase2_clients.sql
# Merchant portal Phase 3 (transactions + products/packages/rewards):
#   20260722070000_merchant_portal_phase3_transactions.sql
#   20260722071000_merchant_phase3_cashier_commission.sql
# Merchant portal Phase 4 (vouchers + api_integrations + Storage):
#   20260722080000_merchant_portal_phase4_vouchers_storage.sql
# Merchant portal Phase 5 (Realtime publication):
#   20260722090000_merchant_portal_phase5_realtime.sql
#
# Create new files with:
#   npx supabase migration new <descriptive_name>
#
# Platform billing + immutable audit/monitoring:
#   20260729010000_platform_billing_audit_monitoring.sql
# Marketing Phase 2 (reusable audiences + campaign drafts/schedules):
#   20260729020000_marketing_audiences_campaigns.sql
# Marketing Phase 3 (consent-safe provider delivery queue):
#   20260729030000_marketing_delivery_queue.sql
#
# Do not renumber or duplicate 001–004 without an explicit migration plan.
