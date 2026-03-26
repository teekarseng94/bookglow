# User Setup Guide - Outlet Assignment

This guide explains how to set up users with outlet assignments in Firestore.

## User Document Structure

Each user needs a document in the `users` collection with the following structure:

**Collection:** `users`  
**Document ID:** User's Firebase UID (e.g., `2kSDX1j9yMZxsnliO8iL57qdH3l2`)

**Document Fields:**
```json
{
  "outletId": "outlet_001",
  "role": "admin",
  "displayName": "Admin User",
  "email": "admin@rdp.com",
  "createdAt": "2026-01-01T00:00:00Z"
}
```

## Required Fields

- **`outletId`** (string, required): The outlet ID the user is assigned to
- **`role`** (string, required): User role - `"admin"` or `"staff"`
- **`email`** (string, optional): User's email address
- **`displayName`** (string, optional): User's display name
- **`createdAt`** (timestamp, optional): When the user document was created

## Example: Setting Up admin@rdp.com

1. **Get User UID:**
   - User email: `admin@rdp.com`
   - User UID: `2kSDX1j9yMZxsnliO8iL57qdH3l2`

2. **Create User Document in Firestore:**
   - Go to Firebase Console → Firestore Database
   - Click on `users` collection (create if it doesn't exist)
   - Click "Add document"
   - Document ID: `2kSDX1j9yMZxsnliO8iL57qdH3l2`
   - Add fields:
     ```
     outletId: "outlet_001" (string)
     role: "admin" (string)
     email: "admin@rdp.com" (string)
     displayName: "Admin User" (string)
     ```

3. **Create Outlet Document (if not exists):**
   - Go to `outlets` collection
   - Document ID: `outlet_001`
   - Add fields:
     ```
     outletID: "outlet_001" (string)
     name: "Razak Residence" (string)
     address: "Your address" (string)
     phone: "+1-555-0100" (string)
     email: "outlet@example.com" (string)
     ```

## How It Works

1. **User Logs In:**
   - User authenticates with Firebase Auth
   - `UserContext` fetches user document from Firestore `users` collection
   - Extracts `outletId` and `role` from user document

2. **Outlet Validation:**
   - If user has no `outletId`, they are logged out and shown "Unauthorized" message
   - If user has `outletId`, outlet information is fetched from `outlets` collection

3. **Protected Routes:**
   - `ProtectedRoute` component checks:
     - User is authenticated
     - User has `outletId` assigned
   - Only then allows access to dashboard

4. **Data Scoping:**
   - All Firestore queries are scoped to user's `outletId`
   - User can only see/modify data for their assigned outlet

## Creating Users via Firebase Console

### Step 1: Create User in Firebase Authentication
1. Go to Firebase Console → Authentication → Users
2. Click "Add user"
3. Enter email and password
4. Note the User UID (shown after creation)

### Step 2: Create User Document in Firestore
1. Go to Firebase Console → Firestore Database
2. Navigate to `users` collection
3. Click "Add document"
4. Document ID: Paste the User UID from Step 1
5. Add fields:
   - `outletId`: The outlet ID (e.g., `outlet_001`)
   - `role`: `admin` or `staff`
   - `email`: User's email
   - `displayName`: User's name (optional)

### Step 3: Verify Outlet Exists
1. Go to `outlets` collection
2. Ensure outlet document exists with matching `outletID`
3. If not, create it with at least:
   - `outletID`: The outlet ID
   - `name`: Outlet name (e.g., "Razak Residence")

## Testing

After setting up a user:

1. **Log in** with the user's credentials
2. **Check browser console** for:
   - "Fetching user data for UID: ..."
   - "✅ User data loaded: ..."
   - "Outlet: Razak Residence" (if outlet name is loaded)

3. **Verify access:**
   - User should see dashboard
   - All data should be scoped to their outlet
   - Outlet name should appear in UI

## Troubleshooting

### "User document not found in Firestore"
- **Solution:** Create user document in `users` collection with User UID as document ID

### "User has no outletId assigned"
- **Solution:** Add `outletId` field to user document in Firestore

### "Unauthorized" message after login
- **Solution:** Ensure user document has `outletId` field with a valid outlet ID

### Outlet name not showing
- **Solution:** Ensure outlet document exists in `outlets` collection with matching `outletID`

### Permission denied errors
- **Solution:** Deploy updated Firestore rules:
  ```bash
  firebase deploy --only firestore:rules
  ```

## Security Rules

The Firestore rules allow:
- Users to read their own user document
- Users to read outlet documents
- Authenticated users to read/write data for their outlet

Make sure rules are deployed:
```bash
firebase deploy --only firestore:rules
```
