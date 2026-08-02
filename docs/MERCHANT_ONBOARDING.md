# Merchant onboarding

Merchant registration starts at the customer site `/signup` and uses Supabase Auth without creating a `frontend_customers` row. Authenticated progress is stored in `merchant_onboarding_drafts`. Completing a new-business flow calls `complete_merchant_onboarding(payload)`, which atomically creates the outlet and owner mapping.

Because the customer site and merchant portal may use separate origins, completion never transfers tokens through a URL. It redirects to merchant login with a success marker and prefilled email; the owner signs in normally and the portal resolves `public.users.outlet_id`.

## Invitations

Outlet administrators create invitation tokens through `create_outlet_invitation(invitee_email, invitation_role, valid_hours)`. Only a one-way SHA-256 token hash is stored. The raw token returned at creation must be delivered through an approved communication channel and is accepted through `accept_outlet_invitation(token)`.

Acceptance verifies the authenticated email, expiry, unused state, outlet, and server-stored role. A joining user cannot choose a role or outlet ID.

## Configuration

- `VITE_MERCHANT_PORTAL_URL`: merchant portal origin, such as `http://localhost:5173`.
- `VITE_CUSTOMER_SITE_URL`: customer-site origin when required by hosting configuration.
- `VITE_GOOGLE_AUTH_ENABLED=true`: display Google merchant sign-up after configuring the Supabase provider and redirect URL.
- `VITE_FACEBOOK_AUTH_ENABLED=true`: display Facebook merchant sign-up after configuring the Supabase provider and redirect URL.

The physical-location preview reuses the existing Google Maps embed approach and does not commit an API key. Manual address entry remains available if the preview cannot load; coordinates are not stored unless a future configured geocoder actually resolves them.
