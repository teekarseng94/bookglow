# Ledger archive

Original SQL for migrations that production ran under a different timestamp than
the file in `../migrations/`. Recovered from `supabase_migrations.schema_migrations`
before those duplicate ledger rows were cleared on 2026-10-10.

Only the six whose text differs from the repo copy are kept. For each of them the
file in `../migrations/` is the later, fuller version — it folds in follow-up
migrations that production received separately. Two differences are worth knowing:

- `20260721183904_public_create_booking` trusted the client-supplied `p_auth_uid`.
  Production was hardened afterwards by `20260721192123_harden_create_booking_auth_uid`
  and now reads `auth.uid()` only. The repo copy already reflects that.
- `20260915053015_hitpay_platform_billing` ran as single-line `ALTER TABLE`
  statements; the repo copy is the same changes, formatted.

Nothing here is applied by the CLI. This directory is outside the migrations
folder so it is never scanned or replayed.
