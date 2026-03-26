# Users and Outlets (Multi-Tenant Setup)

ZenFlow Spa Manager is **multi-tenant**: a single deployment can manage multiple spa branches or business entities. Each branch is an **Outlet**. Data is isolated by `outletID`; users see only the data for the outlet they are assigned to.

## How it works

- Every **Firebase Auth user** (email/password) must have a **user profile** in Firestore that maps them to **exactly one outlet**.
- The app **never** uses a default outlet. The only source of `outletId` for a logged-in user is the Firestore document at `users/{uid}`.
- Different emails (different users) can be assigned to different outlets. Each user then sees only their outlet’s clients, appointments, transactions, etc.

## Firestore: `users` collection

Create **one document per user** in the `users` collection:

- **Document ID:** the user’s **Firebase Auth UID** (not email). You can get this from Firebase Console → Authentication → Users (copy the User UID).
- **Required field:**
  - `outletId` (string) – The outlet this user belongs to (e.g. `outlet_001`, `outlet_002`, etc.). Must be a non-empty string.
- **Optional fields:**
  - `role` (string) – e.g. `"admin"` or `"staff"`.
  - `displayName` (string) – Display name if not set in Auth.

### Example document

Path: `users/{uid}`  
(Replace `{uid}` with the actual Firebase Auth UID of the user.)

```json
{
  "outletId": "outlet_001",
  "role": "staff",
  "displayName": "Jane Doe"
}
```

For a user at a different branch:

```json
{
  "outletId": "outlet_002",
  "role": "admin",
  "displayName": "Branch Manager"
}
```

## Creating a new user (checklist)

1. **Create the Auth user**  
   Firebase Console → Authentication → Users → Add user (email + password).

2. **Copy the User UID**  
   Shown in the users table after creation.

3. **Create the user document in Firestore**  
   - Go to Firestore Database.
   - Collection: `users`.
   - Add document with **Document ID = that User UID**.
   - Add field `outletId` (string) = the outlet id for this branch (e.g. `outlet_001`, `outlet_002`).
   - Optionally add `role`, `displayName`.

4. **Create the outlet document if it doesn’t exist**  
   Collection `outlets`, document id = your outlet id (e.g. `outlet_001`), with at least a `name` and any other fields your app expects (see `firestore-schema.ts` or FIRESTORE_SCHEMA_DOCUMENTATION.md).

## Important

- **One user → one outlet.** Each `users/{uid}` document must have exactly one `outletId`. That’s how the app knows which outlet’s data to show.
- **No fallback outlet.** If a user has no document in `users` or their document has no (or empty) `outletId`, they will see an error and cannot access any outlet’s data until an administrator fixes their profile.
- **Different branches:** Use different outlet ids (e.g. `outlet_001`, `outlet_002`) and assign each user to the correct `outletId` in `users/{uid}` so each login sees only that outlet’s data.

## Troubleshooting

- **“Your account is not linked to an outlet”**  
  There is no document in `users` with document id = your Firebase Auth UID. Create it with field `outletId` set to your outlet.

- **“Your user profile does not have an outlet assigned”**  
  Your `users/{uid}` document exists but `outletId` is missing or empty. Add or fix the `outletId` field.

- **Same data for different logins**  
  Ensure each user’s `users/{uid}` document has a **different** `outletId` if they are meant to see different branches. If both have the same `outletId`, they will see the same data.
