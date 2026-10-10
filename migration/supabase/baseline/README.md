# Public schema baseline

Schema-only snapshot of the production `public` schema, taken 10 October 2026
from project `uecphpjymbgtttrizhgy` with `supabase db dump --schema public`.

It is here so an empty staging database can be built. It is **not** a migration.
This folder is outside `migrations/`, so `supabase db push` will not run it.
Do not apply it to production: production already is this schema, and replaying
it there will fail.

The file has tables, functions, triggers and policies. It has no rows, no
`auth` users, and no Storage objects. A fresh Supabase project still needs its
own Auth and extensions before this file is loaded.
