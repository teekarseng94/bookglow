# Firestore Rules Fix - Data Persistence Issue

## Problem
Data was not being saved to Firestore even though users were authenticated. When refreshing the browser, all data was lost.

## Root Cause
The Firestore security rules had a critical bug:
- **Read rules** checked `resource.data.outletID`, but `resource` doesn't exist in **query contexts**
- When using `getDocs()` or `onSnapshot()` queries, there's no `resource` object
- This caused all queries to fail with "Missing or insufficient permissions"

## Solution
Updated Firestore rules to properly handle:
1. **Queries** (read operations) - Allow all authenticated users
2. **Creates** - Allow if authenticated AND `outletID` is provided
3. **Updates/Deletes** - Allow if authenticated

## Changes Made

### `firestore.rules`
**Before:**
```javascript
allow read: if isAuthenticated() && belongsToUserOutlet(resource.data.outletID);
```
❌ This fails for queries because `resource` doesn't exist in query contexts

**After:**
```javascript
allow read: if isAuthenticated();
allow create: if isAuthenticated() && request.resource.data.outletID != null;
allow update, delete: if isAuthenticated();
```
✅ This works for both queries and document reads

## Deploy the Fixed Rules

**IMPORTANT:** You must deploy the updated rules for the fix to work!

### Option 1: Firebase CLI
```bash
firebase deploy --only firestore:rules
```

### Option 2: Firebase Console
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: `razak-residence-2026`
3. Navigate to **Firestore Database** → **Rules** tab
4. Copy the contents of `firestore.rules`
5. Paste into the rules editor
6. Click **Publish**

## Testing After Deploy

1. **Clear browser cache** (or use incognito mode)
2. **Log in** as `admin@rdp.com`
3. **Add a staff member:**
   - Go to Staff page
   - Add new staff
   - Check browser console for "✅ Staff added successfully"
   - Check Firebase Console → Firestore Database → `staff` collection
   - Document should appear immediately

4. **Complete a POS sale:**
   - Go to POS page
   - Add items and complete sale
   - Check browser console for "✅ Transaction added successfully"
   - Check Firebase Console → Firestore Database → `transactions` collection
   - Document should appear immediately

5. **Refresh browser:**
   - All data should still be there
   - Staff and transactions should persist

## Error Messages

If you see these errors, the rules aren't deployed yet:
- "Missing or insufficient permissions"
- "permission-denied"
- "The caller does not have permission"

**Solution:** Deploy the rules using one of the methods above.

## Verification

After deploying rules, check:
1. ✅ Browser console shows "✅ Staff added successfully" (not errors)
2. ✅ Firebase Console → Firestore Database shows documents being created
3. ✅ Data persists after browser refresh
4. ✅ Real-time listeners update automatically

## Security Note

The current rules allow all authenticated users to:
- Read all data (for all outlets)
- Write data (with outletID)

**For production**, you may want to restrict access based on:
- User's assigned outletID (stored in user's auth token or Firestore user document)
- User roles (admin vs staff)

Example of more restrictive rules:
```javascript
// Get user's outletID from auth token
function getUserOutletID() {
  return request.auth.token.outletID;
}

// Check if user can access this outlet
function canAccessOutlet(outletID) {
  return isAuthenticated() && (getUserOutletID() == outletID || request.auth.token.admin == true);
}
```

For now, the simplified rules work for all authenticated users, which is fine for development and testing.
