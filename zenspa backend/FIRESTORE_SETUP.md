# Firestore Integration Setup Guide

## Overview

Your ZenFlow SPA Manager is now fully integrated with Firebase Firestore. All data operations (clients, staff, appointments, transactions, services, products, packages, rewards) are now stored in Firestore instead of local state.

## Firebase Configuration

The Firebase configuration has been set up with your project credentials:
- **Project ID**: `razak-residence-2026`
- **Database**: Firestore
- **Analytics**: Enabled

## Installation

1. **Install Firebase dependencies**:
   ```bash
   npm install
   ```

2. **Verify Firebase is installed**:
   ```bash
   npm list firebase
   ```

## Firestore Database Setup

### Step 1: Enable Firestore in Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `razak-residence-2026`
3. Navigate to **Firestore Database**
4. Click **Create Database**
5. Choose **Start in test mode** (for development) or **Production mode** (for production)
6. Select your preferred location

### Step 2: Create Firestore Indexes

The indexes are defined in `firestore.indexes.json`. You can deploy them in two ways:

#### Option A: Automatic (Recommended)
1. Run your app locally
2. When you perform queries that require indexes, Firestore will show you a link to create them
3. Click the link and Firestore will create the indexes automatically

#### Option B: Manual Deployment
1. Install Firebase CLI:
   ```bash
   npm install -g firebase-tools
   ```

2. Login to Firebase:
   ```bash
   firebase login
   ```

3. Initialize Firebase in your project:
   ```bash
   firebase init firestore
   ```

4. Deploy indexes:
   ```bash
   firebase deploy --only firestore:indexes
   ```

### Step 3: Set Up Security Rules

1. In Firebase Console, go to **Firestore Database** → **Rules**
2. Replace the default rules with the security rules from `FIRESTORE_SCHEMA_DOCUMENTATION.md`
3. For development, you can use these test rules:
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{document=**} {
         allow read, write: if request.time < timestamp.date(2025, 12, 31);
       }
     }
   }
   ```
   **⚠️ WARNING**: These rules allow full access. Only use for development!

4. For production, use the multi-tenant security rules from the documentation.

## Using Firestore in Your App

### Option 1: Use the Custom Hook (Recommended)

Replace local state in `App.tsx` with the `useFirestoreData` hook:

```typescript
import { useFirestoreData } from './hooks/useFirestoreData';

const App: React.FC = () => {
  const outletID = 'outlet_001'; // Get from user selection or context
  
  const {
    clients,
    staff,
    appointments,
    transactions,
    services,
    products,
    packages,
    rewards,
    loading,
    error,
    handleAddClient,
    handleUpdateClient,
    // ... all other handlers
  } = useFirestoreData(outletID);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  // Use the data and handlers as before
  // ...
};
```

### Option 2: Use Service Functions Directly

You can also use the service functions directly:

```typescript
import { clientService } from './services/firestoreService';

// Add a client
const clientId = await clientService.add({
  name: 'John Doe',
  email: 'john@example.com',
  phone: '555-0100',
  notes: 'Regular customer',
  createdAt: new Date().toISOString()
}, 'outlet_001');

// Get all clients
const clients = await clientService.getAll('outlet_001');

// Update a client
await clientService.update(clientId, { notes: 'VIP customer' }, 'outlet_001');
```

## Data Structure

All documents (except outlets) include an `outletID` field for multi-tenant support:

- **Clients**: `{ id, outletID, name, email, phone, notes, createdAt, points }`
- **Staff**: `{ id, outletID, name, role, email, phone, createdAt, profilePicture? }`
- **Appointments**: `{ id, outletID, clientId, staffId, serviceId, date, time, status }`
- **Transactions**: `{ id, outletID, date, type, clientId?, items?, amount, category, description, paymentMethod? }`
- **Services**: `{ id, outletID, name, price, duration, category, points, isCommissionable, description?, createdAt? }`
- **Products**: `{ id, outletID, name, price, stock, category }`
- **Packages**: `{ id, outletID, name, price, points, category, services, description?, createdAt? }`
- **Rewards**: `{ id, outletID, name, cost, icon }`

## Testing the Integration

1. **Start your development server**:
   ```bash
   npm run dev
   ```

2. **Open your app** in the browser

3. **Check Firebase Console**:
   - Go to Firestore Database
   - You should see collections being created as you use the app
   - Data should appear in real-time

4. **Test Operations**:
   - Add a client → Check Firestore for new document
   - Create an appointment → Verify it's saved
   - Make a transaction → Confirm it's recorded

## Troubleshooting

### Issue: "Missing or insufficient permissions"
**Solution**: Update your Firestore security rules to allow read/write access (for development)

### Issue: "Index not found"
**Solution**: Create the required indexes (Firestore will provide a link when you run queries)

### Issue: "outletID is required"
**Solution**: Make sure you're passing `outletID` to all service functions or using the hook with an outletID

### Issue: Data not appearing
**Solution**: 
1. Check browser console for errors
2. Verify Firestore is enabled in Firebase Console
3. Check security rules allow read access
4. Verify you're using the correct `outletID`

## Migration from Local State

If you have existing local state data:

1. Export your current data (if possible)
2. Create a migration script to import data into Firestore
3. Update `App.tsx` to use `useFirestoreData` hook instead of `useState`
4. Test thoroughly before deploying

## Production Deployment

Before deploying to production:

1. ✅ Set up proper Firestore security rules
2. ✅ Deploy all required indexes
3. ✅ Test with multiple outlets
4. ✅ Set up Firebase Authentication (if needed)
5. ✅ Enable Firestore backup
6. ✅ Monitor Firestore usage and costs

## Support

For detailed schema documentation, see `FIRESTORE_SCHEMA_DOCUMENTATION.md`

For query patterns and examples, see `firestore-schema.ts`
