# Archived docs — do not implement

These files describe an older BookGlow / ZenSpa state (Firebase Hosting, Firestore-first Volumes I–VI, HashRouter paths, `zenspa backend` / `zenspa Frontend` folders).

**Do not use them to redesign, rebrand, re-platform, or rewrite the live apps.**

Current sources of truth:

- Product UI: `design-system/bookglow/MASTER.md` and `design-system/bookglow/pages/`
- Hosting: `docs/UNIFIED_DOMAIN.md`
- Auth: `docs/SUPABASE_AUTH_SETUP.md`
- Local/dev layout: repository root `README.md`

| Path | Why archived |
|------|----------------|
| `Bookglow-Volumes-I-VI-Design-First-Firestore-Blueprints/` | Firestore-first visual retrofit; locks Firebase as the runtime DB |
| `VOLUME_I_VI_UI_RETROFIT.md` | Same programme; presentation-only under Firestore |
| `PHASE_0_BLUEPRINT_BASELINE.md` … `PHASE_12_FINAL_VERIFICATION.md` | Completed 2026-07 design phases; stale folder and router names |
| `FIRESTORE_SCHEMA_DOCUMENTATION.md` | Firestore collections, not the live Supabase schema |
| `STRUCTURAL_CLEANUP.md` | Post-volumes cleanup that still treats Firestore as the data layer |
| `QUICK_START.md` / `DEPLOYMENT_GUIDE.md` | Firebase Console project `razak-residence-2026`; not BookGlow production |

Supabase cutover notes stay in `docs/PHASE_A_SUPABASE_DATA.md` through `docs/PHASE_E_RETIRE_FIRESTORE.md`.
