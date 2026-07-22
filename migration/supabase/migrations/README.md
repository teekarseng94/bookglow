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
#
# Create new files with:
#   npx supabase migration new <descriptive_name>
#
# Do not renumber or duplicate 001–004 without an explicit migration plan.
