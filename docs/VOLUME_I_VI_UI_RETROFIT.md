# Bookglow Volume I–VI UI Retrofit

## Implementation decision

This project is an in-place redesign of the existing Bookglow monorepo. It does not create a replacement application, a parallel booking journey, or a new route family.

The previously experimental booking implementation has been deliberately excluded. The only customer booking route in this source is the existing live route:

- `/book/:bookingPath`
- `/book/:bookingPath/auth`

## Locked boundaries

The retrofit changes presentation and component composition only. It preserves:

- Firebase authentication and Firestore listeners
- booking API calls and booking-path resolution
- appointment creation and confirmation behavior
- POS sale handling
- member, points, credit and voucher behavior
- inventory, product, service and package handlers
- staff, commission and role behavior
- reports, transactions, finance and marketing logic
- route IDs, permission filters and redirects
- the existing merchant/customer two-app monorepo

## Volume implementation map

### Volume I — Product and retrofit strategy

Applied by retaining the current repository, apps, route boundaries and connected services. The live project remains the source of truth.

### Volume II — Experience architecture

Applied through a workday-oriented merchant shell:

- Workday: Today, Schedule, Point of Sale
- Customers: Members, Marketing
- Business: Menu & Inventory, Reports, Sales History, Expenses, Staff
- Workspace: Settings and Report

Cashier permissions remain limited to the existing permitted destinations.

### Volume III — Visual and theming system

Applied through semantic design tokens, warm neutral surfaces, controlled Bookglow purple accents, restrained elevation, consistent focus treatment and mobile-first density.

Merchant identity leads the customer booking surface. Transaction controls remain governed by Bookglow.

### Volume IV — Screen and component retrofit

Applied to existing screens rather than replacement screens:

- merchant application frame and navigation
- merchant login
- live customer booking route
- customer booking authentication
- merchant signup
- shared form, card, table and focus styling

Existing operational pages inherit the new layout and surface system without moving their data or event handlers.

### Volume V — Interaction and operational state

Applied through:

- desktop and mobile navigation recomposition
- mobile More bottom sheet
- responsive booking summary and sticky action
- governed loading, error, selected and confirmation states
- visible keyboard focus
- reduced-motion support
- bottom-sheet booking steps on compact screens

### Volume VI — Safe implementation and release

Implemented as a presentation-only retrofit:

1. verify the current build
2. establish shared tokens and shells
3. remove obsolete experimental booking remnants
4. redesign live components in place
5. run clean production builds
6. package source without dependencies or repository history

No database migration is included in this UI delivery. Firebase remains wired exactly as in the existing project.

## Primary edited files

### Merchant portal

- `apps/merchant-portal/components/Layout.tsx`
- `apps/merchant-portal/index.css`
- `apps/merchant-portal/pages/Login.tsx`
- `apps/merchant-portal/tailwind.config.js`

### Customer site

- `apps/customer-site/index.tsx`
- `apps/customer-site/index.html`
- `apps/customer-site/App.tsx`
- `apps/customer-site/constants.tsx`
- `apps/customer-site/apps/booking/BookingPage.tsx`
- `apps/customer-site/apps/booking/BookingAuth.tsx`
- `apps/customer-site/apps/booking/SignUp.tsx`
- `apps/customer-site/src/styles/tokens.css`
- `apps/customer-site/src/styles/reset.css`
- `apps/customer-site/src/styles/utilities.css`
- `apps/customer-site/src/styles/global.css`
- `apps/customer-site/postcss.config.js`

## Verification

- Merchant production build: passed
- Customer production build: passed
- Customer TypeScript check: passed
- Compiled output contains no obsolete booking implementation references
- Existing merchant TypeScript errors remain in legacy unrelated files and are documented in `KNOWN_EXISTING_TYPECHECK_ISSUES.md`
