# Quick Setup: admin@rdp.com User

## Step 1: Create User Document in Firestore

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: `razak-residence-2026`
3. Navigate to **Firestore Database**
4. Click on `users` collection (create if it doesn't exist)
5. Click **"Add document"**
6. **Document ID:** `2kSDX1j9yMZxsnliO8iL57qdH3l2` (User UID)
7. Add these fields:

| Field | Type | Value |
|-------|------|-------|
| `outletId` | string | `outlet_001` |
| `role` | string | `admin` |
| `email` | string | `admin@rdp.com` |
| `displayName` | string | `Admin User` |

## Step 2: Create Outlet Document (if not exists)

1. In Firestore Database, go to `outlets` collection
2. Click **"Add document"**
3. **Document ID:** `outlet_001`
4. Add these fields:

| Field | Type | Value |
|-------|------|-------|
| `outletID` | string | `outlet_001` |
| `name` | string | `Razak Residence` |
| `address` | string | `Your address here` |
| `phone` | string | `+1-555-0100` |
| `email` | string | `outlet@example.com` |

## Step 3: Deploy Firestore Rules

```bash
firebase deploy --only firestore:rules
```

## Step 4: Test

1. Log in with `admin@rdp.com` and password
2. Check browser console for:
   - "Fetching user data for UID: 2kSDX1j9yMZxsnliO8iL57qdH3l2"
   - "✅ User data loaded: ..."
   - "Outlet: Razak Residence"
3. Dashboard should load with outlet-specific data

## Troubleshooting

- **"User document not found"** → Create user document in `users` collection
- **"User has no outletId"** → Add `outletId` field to user document
- **"Unauthorized"** → Ensure `outletId` is set correctly
- **Permission errors** → Deploy Firestore rules
