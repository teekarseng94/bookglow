## ZenSpa Booking vs Backend Systems

This repository contains **two separate experiences** that share some code but serve different users:

- **Customer Booking Portal** (`https://zenspabookingsystem.web.app/`)
- **Outlet Backend (POS / CRM)** (`https://razak-residence-2026.web.app/`)

They must be treated as **different products**.

---

### 1. Customer Booking Portal (zenspabookingsystem.web.app)

- Purpose: for **customers** to discover services and make appointments at any outlet (e.g. `outlet_001`, `outlet_002`, `outlet_003`, …).
- Key route:
  - `https://zenspabookingsystem.web.app/book/:outletId`
    - Example: `https://zenspabookingsystem.web.app/book/outlet_002`
    - Renders `BookingPage` (two-column layout: services list on the left, sticky booking card on the right).
- New login / signup flow for customers:
  - Header icons on `BookingPage`:
    - **Share** button (uses `navigator.share` or copies the URL with a small “Link Copied!” toast).
    - **Login** button (user-facing auth entry point).
  - Login button navigates to:
    - `https://zenspabookingsystem.web.app/book/:outletId/auth?loginSource=homepage`
    - Example: `https://zenspabookingsystem.web.app/book/outlet_002/auth?loginSource=homepage`
    - This route renders `BookingAuth`.

#### BookingAuth UI and behavior

- File: `zenspa dashboard/apps/booking/BookingAuth.tsx`
- Layout:
  - Minimal header with the **ZenSpa logo**.
  - Centered white card with:
    - Title: **“Login to book online”**
    - Three circular buttons: Google, Facebook, Email.
    - A divider with **“or”**.
    - A **“Create profile”** button that links to `/signup`.
    - Optional email/password form if the user chooses to continue with email.
- When a customer signs up / logs in from this page:
  - Firebase Authentication is used (email/password or social providers).
  - A Firestore document is created/updated at `users/{uid}` with `role: "client"`.
  - **Redirect target**: customer is redirected **back to the booking page** for the same outlet:
    - `window.location.href = window.location.origin + "/book/" + outletId`
  - They are **not** redirected to the backend system (`razak-residence-2026.web.app`).

#### Showing the logged-in email on the Booking page

- File: `zenspa dashboard/apps/booking/BookingPage.tsx`
- `BookingPage` subscribes to Firebase Auth via `onAuthStateChanged(auth, ...)`.
- If a user is signed in, their `email` is stored in `currentUserEmail`.
- In the top-right header (next to the **Share** button), the email is displayed:
  - On desktop (`sm` and up) as a small, subtle label.
  - Example: `customer@example.com  |  [Share Icon]  [Login Icon]`

This lets customers see which email they are currently using while browsing services and booking.

---

### 2. Outlet Backend (POS / CRM) – razak-residence-2026.web.app

- Purpose: for **outlet owners and staff** to manage:
  - POS checkout
  - Expenses
  - Members and loyalty points
  - Appointments
  - Staff and commissions
  - Super Admin dashboards
- Hosted at `https://razak-residence-2026.web.app/`.
- Uses its own authentication and routing logic and should **not** be the destination when a customer signs up on the public booking site.

---

### 3. Auth helpers split: booking vs backend

- Shared auth utilities live in `zenspa dashboard/services/authService.ts`.
- There are now **two sets of helpers**:

1. **Backend-oriented (existing)**
   - `register`
   - `registerWithGoogle`
   - `registerWithFacebook`
   - These:
     - Create/update `users/{uid}` in Firestore.
     - Redirect to the **backend dashboard**:
       - `DASHBOARD_URL = "https://razak-residence-2026.web.app/#/dashboard"`.
   - Used by: marketing/merchant sign-up flows (e.g. `/signup`).

2. **Booking-oriented (new)**
   - `registerForBooking(credentials, redirectUrl)`
   - `registerWithGoogleForBooking(redirectUrl)`
   - `registerWithFacebookForBooking(redirectUrl)`
   - These:
     - Create/update `users/{uid}` in Firestore with `role: "client"`.
     - Redirect to whatever **booking URL** is passed in (e.g. `https://zenspabookingsystem.web.app/book/outlet_002`).
   - Used only by: `BookingAuth` (customer signup/login).

This split ensures:

- **Merchants** signing up via the marketing site are redirected to the backend dashboard.
- **Customers** signing up via the booking site are redirected back to the outlet booking page, never into the POS/CRM.

---

### 4. Firebase project note (ZenSpaBookingSystem)

- The booking site (`zenspabookingsystem.web.app`) is hosted under the Firebase project **ZenSpaBookingSystem** (see `.firebaserc`).
- The Firebase config in `zenspa dashboard/services/firebase.ts` currently points to a specific project (API key, `authDomain`, `projectId`, etc.).
- To ensure all booking logins and customer data are stored in **ZenSpaBookingSystem**:
  1. Obtain the Firebase config for the **ZenSpaBookingSystem** project from the Firebase Console.
  2. Update `firebaseConfig` in `services/firebase.ts` to use those values.
  3. Rebuild and deploy the booking site.

Once updated, all signup/login actions on `zenspabookingsystem.web.app` will:

- Use the **ZenSpaBookingSystem** Firebase Auth and Firestore.
- Keep customers entirely within the booking experience.

---

### 5. Quick summary of the customer flow

1. Customer opens `https://zenspabookingsystem.web.app/book/outlet_002`.
2. They browse services and click the **Login** icon in the header.
3. They are sent to `https://zenspabookingsystem.web.app/book/outlet_002/auth?loginSource=homepage`.
4. They sign up or log in (Google / Facebook / email).
5. On success:
   - A Firestore `users/{uid}` document with `role: "client"` is created/updated.
   - The browser redirects back to `https://zenspabookingsystem.web.app/book/outlet_002`.
6. The booking page header now shows their **email address next to the Share button**, confirming they are logged in while they continue booking.

