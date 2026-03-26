# Firestore Integration Guide

This guide explains how to integrate and deploy the Firestore database for the ZenFlow Spa Manager.

## Overview

All application data is now stored in Firestore, replacing local state management. The system uses a multi-tenant architecture where all data is scoped by `outletID`.

## Prerequisites

1. Firebase project created (already done: `razak-residence-2026`)
2. Firebase CLI installed: `npm install -g firebase-tools`
3. Logged in to Firebase: `firebase login`

## Step 1: Deploy Firestore Security Rules

The security rules are defined in `firestore.rules`. They ensure:
- Only authenticated users can access data
- Users can only access data for their outlet
- Admins have write access to outlets

Deploy the rules:

```bash
firebase deploy --only firestore:rules
```

## Step 2: Deploy Firestore Indexes

Composite indexes are required for efficient queries. The indexes are defined in `firestore.indexes.json`.

Deploy the indexes:

```bash
firebase deploy --only firestore:indexes
```

**Note:** If you get errors about missing indexes, Firebase will provide a link to create them in the Firebase Console. Click the link and create the indexes.

## Step 3: Initialize Default Data (Optional)

You can create initial data using the Firebase Console or by running a migration script. Here's an example structure for the first outlet:

### Create Outlet Document

In Firebase Console → Firestore Database:
1. Create a new document in the `outlets` collection
2. Document ID: `outlet_001`
3. Fields:
   ```json
   {
     "outletID": "outlet_001",
     "name": "ZenFlow Spa - Main Branch",
     "address": "123 Main Street, City, State 12345",
     "phone": "+1-555-0100",
     "email": "main@zenflowspa.com",
     "businessHours": {
       "monday": { "open": "09:00", "close": "18:00", "isOpen": true },
       "tuesday": { "open": "09:00", "close": "18:00", "isOpen": true },
       "wednesday": { "open": "09:00", "close": "18:00", "isOpen": true },
       "thursday": { "open": "09:00", "close": "18:00", "isOpen": true },
       "friday": { "open": "09:00", "close": "18:00", "isOpen": true },
       "saturday": { "open": "10:00", "close": "17:00", "isOpen": true },
       "sunday": { "open": "10:00", "close": "17:00", "isOpen": true }
     },
     "createdAt": "2026-01-01T00:00:00Z"
   }
   ```

### Create Initial Services

Create documents in the `services` collection with `outletID: "outlet_001"`:

Example service:
```json
{
  "outletID": "outlet_001",
  "name": "Swedish Massage",
  "category": "Massage",
  "price": 80,
  "duration": 60,
  "description": "Classic Swedish massage for relaxation",
  "isActive": true
}
```

## Step 4: Verify Integration

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Log in with your Firebase Authentication credentials

3. Check the browser console for any Firestore errors

4. Try creating a client, appointment, or transaction - it should be saved to Firestore

5. Check Firebase Console → Firestore Database to verify data is being created

## Data Collections

All collections are scoped by `outletID`:

- **outlets**: Outlet information
- **staff**: Staff members (linked to outletID)
- **clients**: Clients (scoped to outletID)
- **appointments**: Appointments (filtered by outletID)
- **transactions**: Sales and expenses (filtered by outletID)
- **services**: Services offered (scoped to outletID)
- **products**: Products for sale (scoped to outletID)
- **packages**: Service packages (scoped to outletID)
- **rewards**: Loyalty rewards (scoped to outletID)

## Security Rules Summary

The security rules (`firestore.rules`) enforce:

1. **Authentication Required**: All operations require an authenticated user
2. **Outlet Scoping**: Users can only access data for their outlet
3. **Admin Access**: Admins (users with `admin: true` in their token) can write to outlets

To set a user as admin, you need to set a custom claim in Firebase Authentication:
- Use Firebase Admin SDK or Firebase Console
- Set `admin: true` in the user's custom claims

## Troubleshooting

### Error: "Missing or insufficient permissions"

- Check that Firestore rules are deployed: `firebase deploy --only firestore:rules`
- Verify the user is authenticated
- Check that the user's `outletID` matches the data they're trying to access

### Error: "The query requires an index"

- Deploy indexes: `firebase deploy --only firestore:indexes`
- Or click the link in the error message to create the index in Firebase Console

### Data not appearing

- Check browser console for errors
- Verify Firestore rules allow read access
- Check that `outletID` matches in queries
- Verify data exists in Firestore Console

### Real-time updates not working

- Ensure you're using the `useFirestoreData` hook (already integrated)
- Check that Firestore rules allow read access
- Verify network connection

## Next Steps

1. Deploy security rules and indexes
2. Create initial outlet data
3. Test the application
4. Deploy to production: `npm run deploy`

## Support

For issues or questions:
- Check Firebase Console for error logs
- Review Firestore security rules
- Verify authentication status
- Check browser console for detailed errors
