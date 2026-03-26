# Deploy Firestore Database

This guide will help you deploy the Firestore security rules and indexes to your Firebase project.

## Quick Deploy

Deploy everything (rules + indexes):

```bash
npm run deploy:firestore
```

Or deploy individually:

```bash
# Deploy security rules only
npm run deploy:rules

# Deploy indexes only
npm run deploy:indexes
```

## What Gets Deployed

### 1. Security Rules (`firestore.rules`)

The security rules ensure:
- ✅ Only authenticated users can access data
- ✅ Users can only read/write data for their outlet
- ✅ Admins can manage outlets

### 2. Indexes (`firestore.indexes.json`)

Composite indexes for efficient queries:
- Daily appointments by outlet and date
- Daily sales by outlet and date
- Staff schedules by outlet, staff, and date
- Transaction queries by outlet and date

## Step-by-Step Instructions

### Step 1: Login to Firebase (if not already)

```bash
firebase login
```

### Step 2: Verify Project

Make sure you're using the correct project:

```bash
firebase use razak-residence-2026
```

### Step 3: Deploy Rules

```bash
npm run deploy:rules
```

Expected output:
```
✔  firestore: rules have been deployed successfully
```

### Step 4: Deploy Indexes

```bash
npm run deploy:indexes
```

Expected output:
```
✔  firestore: indexes have been deployed successfully
```

**Note:** If you see errors about missing indexes, Firebase will provide a link. Click it to create the indexes in the Firebase Console.

### Step 5: Verify in Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `razak-residence-2026`
3. Go to **Firestore Database** → **Rules** tab
4. Verify your rules are deployed
5. Go to **Firestore Database** → **Indexes** tab
6. Verify your indexes are created

## Troubleshooting

### Error: "Project not found"

Make sure you're logged in and using the correct project:

```bash
firebase login
firebase use razak-residence-2026
```

### Error: "Permission denied"

You need to be a project owner or have Firestore Admin permissions. Contact your project administrator.

### Error: "Index creation failed"

Some indexes may take time to build. Check the Firebase Console → Firestore → Indexes tab for status.

### Error: "Rules deployment failed"

Check the syntax of `firestore.rules`. Common issues:
- Missing semicolons
- Incorrect function syntax
- Invalid field references

## After Deployment

1. ✅ Rules are active immediately
2. ✅ Indexes may take a few minutes to build
3. ✅ Test your application to ensure data access works
4. ✅ Check browser console for any permission errors

## Next Steps

After deploying Firestore:
1. Test the application locally: `npm run dev`
2. Create initial data (outlets, services, etc.)
3. Deploy the full application: `npm run deploy`

## Security Rules Overview

The deployed rules allow:
- **Read**: Authenticated users can read data for their outlet
- **Write**: Authenticated users can create/update/delete data for their outlet
- **Admin**: Users with `admin: true` custom claim can manage outlets

To set a user as admin, use Firebase Admin SDK or set custom claims in Firebase Console.
