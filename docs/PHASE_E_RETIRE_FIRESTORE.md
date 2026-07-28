# Phase E — Retire Firestore (production)

**Status:** Complete (code + deploy + database deleted)  
**Date:** 2026-07-26  
**Scope:** Stop all production reads/writes to Firestore. Keep Firebase **Hosting**. Firestore **`(default)` database deleted** from project `bookglow-83fb3` (2026-07-26).

## What changed

| Before | After |
|--------|--------|
| Chatbot CF read Firestore `apiIntegrations` / CRM collections | Supabase Edge Function `chatbot-webhook` reads Postgres |
| Settings showed Firebase CF webhook URL | Settings shows Supabase Edge Function URL |
| Legacy public booking / storage CFs used Firestore / Storage | Those CF exports return **410 / failed-precondition** |
| `firebase.json` deployed Firestore rules + Storage rules | Hosting + functions only |

### Chatbot

- **Canonical URL:** `https://uecphpjymbgtttrizhgy.supabase.co/functions/v1/chatbot-webhook`
- **Source:** `supabase/functions/chatbot-webhook/index.ts`
- **Auth:** `X-API-Key` + `X-Outlet-Id` (SHA-256 vs `api_integrations.api_key_hash`); JWT verify off
- **Legacy URL:** Firebase `chatbotWebhook` is a **thin HTTP proxy** to the Edge Function (no Firestore)

Re-copy the webhook URL from Settings into MyChatBot if you want the canonical endpoint; old Firebase URL still works via proxy.

### Firebase config

- Removed `firestore` and `storage` blocks from `firebase.json`
- Removed `deploy:firestore` / rules / indexes npm scripts
- Functions no longer depend on `firebase-admin`

## Database deletion

```text
firebase firestore:databases:delete "(default)" --project bookglow-83fb3 --force
# → Successfully deleted projects/bookglow-83fb3/databases/(default)
```

Verified empty: `firebase firestore:databases:list --project bookglow-83fb3`

## What we did **not** do

- Did **not** delete Firebase Auth users or Storage objects (legacy image URLs may still load)
- Did **not** remove `migration/` Firebase Admin export tooling (local archives only)

## Optional follow-ups

1. Migrate remaining `firebasestorage.googleapis.com` URLs → Supabase `outlet-media`
2. Remove the Firebase chatbot proxy once all MyChatBot configs use the Supabase URL
3. Delete unused Cloud Function exports entirely (`firebase functions:delete …`)

## Verify

```bash
# Edge Function rejects missing keys
curl -s -o /dev/null -w "%{http_code}" -X POST \
  https://uecphpjymbgtttrizhgy.supabase.co/functions/v1/chatbot-webhook

# Deploy retired CF stubs + hosting (Settings URL)
npm --prefix apps/merchant-portal run deploy:functions
npm run build:merchant && npx firebase deploy --only hosting:dashboard-site --project bookglow-83fb3
```
