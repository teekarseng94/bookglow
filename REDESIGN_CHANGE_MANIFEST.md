# Bookglow Redesign Change Manifest

## What changed

- Reorganised the merchant navigation around daily operational frequency.
- Added a responsive desktop sidebar, utility context bar, mobile page header and mobile More sheet.
- Applied a shared warm-neutral Bookglow visual system to current merchant pages.
- Redesigned the live customer booking route in place.
- Added a merchant-first booking masthead, denser service discovery, clearer professional cards, governed summary and mobile sticky action.
- Redesigned merchant login, customer booking authentication and merchant registration.
- Replaced remote placeholder imagery on signup with a product-interface preview.
- Removed obsolete experimental booking source, flags, route references and compiled assets.
- Replaced Tailwind CDN usage on the customer site with the existing local build pipeline.

## What did not change

- Firebase configuration
- Firestore collections or subscriptions
- booking API implementation
- booking creation and confirmation handlers
- authentication functions
- merchant route identifiers
- page component props
- POS, CRM, inventory, staff, reporting or finance handlers
- role permissions
- deployment targets

## Build commands

```bash
npm run dev
npm run build
```

The merchant app runs on port 5173 and the customer app on port 5174 through the existing root development script.
