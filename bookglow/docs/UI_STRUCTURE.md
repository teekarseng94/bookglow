# Bookglow UI Structure

## Repository boundary

```text
bookglow/
├─ apps/
│  ├─ merchant-portal/       # authenticated merchant operations
│  └─ customer-site/         # public website and live booking journey
├─ dist-dashboard/           # clean merchant production output
├─ dist-booking/             # clean customer production output
└─ docs/                     # retrofit notes and verification
```

## Merchant composition

```text
App.tsx
└─ Layout.tsx
   ├─ desktop sidebar
   │  ├─ outlet and role context
   │  ├─ grouped workday navigation
   │  └─ profile actions
   ├─ desktop utility bar
   ├─ mobile page header
   ├─ current routed page content
   ├─ mobile primary navigation
   └─ mobile More bottom sheet
```

The route switch and all page props remain in `App.tsx`. `Layout.tsx` changes only how those existing routes are presented.

## Customer booking composition

```text
index.tsx
└─ /book/:bookingPath → apps/booking/BookingPage.tsx
   ├─ merchant booking header
   ├─ service discovery
   ├─ professional preference
   ├─ merchant information
   ├─ desktop booking summary
   ├─ mobile sticky action
   ├─ date/time and details sheet
   └─ confirmation state
```

The booking state, Firestore subscriptions, availability requests and submission handlers remain inside the current `BookingPage.tsx`.

## Styling layers

### Merchant portal

- `index.css`: shared shell, surfaces, forms, authentication and responsive rules
- `tailwind.config.js`: existing teal utility classes resolve to the Bookglow accent family, avoiding risky page-by-page logic edits

### Customer site

- `tokens.css`: raw and semantic tokens
- `reset.css`: platform-safe base behavior
- `utilities.css`: public, booking and authentication compositions
- `global.css`: local Tailwind plus the shared style layers

## Responsive rules

- Mobile uses one decision column and compact headers.
- Desktop adds navigation context and a booking summary rail.
- Components recompose instead of shrinking the desktop layout.
- The merchant schedule retains its existing special full-width behavior.
- Primary actions remain reachable above mobile browser chrome.
