# Multi-Tenant Firestore Database Schema Documentation

## Overview

This document describes the Firestore database schema for a multi-outlet booking system supporting 10+ distinct outlets. Each outlet operates independently with complete data isolation through the `outletID` field.

## Architecture Principles

1. **Data Isolation**: Every document (except outlets) includes an `outletID` field to ensure complete data separation between outlets
2. **Scalability**: Schema supports unlimited outlets with efficient querying
3. **Performance**: Composite indexes optimize common query patterns
4. **Security**: Security rules enforce outlet-level access control

---

## Collection Structure

### 1. Collection: `outlets`

**Purpose**: Stores outlet-specific configuration and business information.

**Document Structure**:
```typescript
{
  outletID: string;           // Unique identifier: "outlet_001", "outlet_002", etc.
  name: string;               // "ZenFlow Spa - Downtown"
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  businessHours: {
    monday: { open: "09:00", close: "18:00", isOpen: true },
    tuesday: { open: "09:00", close: "18:00", isOpen: true },
    // ... other days
  };
  phone: string;
  email: string;
  timezone: string;            // "America/New_York"
  createdAt: string;           // ISO timestamp
  updatedAt: string;           // ISO timestamp
  isActive: boolean;
  settings?: OutletSettings;   // Optional outlet-specific settings
}
```

**Indexes**: None required (single document lookups)

**Example Document ID**: `outlet_001`

---

### 2. Collection: `staff`

**Purpose**: Stores staff members, each linked to a specific outlet.

**Document Structure**:
```typescript
{
  id: string;                 // Auto-generated document ID
  outletID: string;           // REQUIRED: Links staff to outlet
  name: string;
  role: string;               // "Lead Therapist", "Therapist", etc.
  email: string;
  phone: string;
  createdAt: string;
  profilePicture?: string;    // URL or base64
}
```

**Required Indexes**:
- Single field: `outletID` (ascending)
- Composite: `outletID` + `role` (ascending)
- Composite: `outletID` + `createdAt` (descending)

**Query Examples**:
```typescript
// Get all staff for outlet_001
where('outletID', '==', 'outlet_001')

// Get therapists for outlet_001
where('outletID', '==', 'outlet_001')
where('role', '==', 'Therapist')
```

---

### 3. Collection: `clients`

**Purpose**: Stores clients, scoped to specific outlets. Same email/phone can exist in different outlets as different clients.

**Document Structure**:
```typescript
{
  id: string;                 // Auto-generated document ID
  outletID: string;           // REQUIRED: Client belongs to this outlet
  name: string;
  email: string;
  phone: string;
  notes: string;
  createdAt: string;
  points: number;             // Outlet-specific loyalty points
}
```

**Required Indexes**:
- Single field: `outletID` (ascending)
- Composite: `outletID` + `email` (ascending) - for unique email per outlet
- Composite: `outletID` + `phone` (ascending) - for unique phone per outlet
- Composite: `outletID` + `createdAt` (descending)
- Composite: `outletID` + `points` (descending) - for rewards queries

**Query Examples**:
```typescript
// Get all clients for outlet_001
where('outletID', '==', 'outlet_001')

// Find client by email in outlet_001
where('outletID', '==', 'outlet_001')
where('email', '==', 'client@example.com')

// Get top clients by points
where('outletID', '==', 'outlet_001')
orderBy('points', 'desc')
```

---

### 4. Collection: `appointments`

**Purpose**: Stores appointments with outlet, client, staff, and service relationships.

**Document Structure**:
```typescript
{
  id: string;                 // Auto-generated document ID
  outletID: string;           // REQUIRED: Appointment belongs to outlet
  clientId: string;           // Reference to clients collection
  staffId: string;             // Reference to staff collection
  serviceId: string;          // Reference to services collection
  date: string;               // ISO date: "2024-01-20"
  time: string;               // Time: "14:30"
  status: 'scheduled' | 'completed' | 'cancelled' | 'no-show';
  reminderSent?: boolean;
}
```

**Required Indexes**:
- Single field: `outletID` (ascending)
- Composite: `outletID` + `date` (ascending)
- Composite: `outletID` + `staffId` + `date` (ascending) - **Critical for staff schedule**
- Composite: `outletID` + `clientId` + `date` (descending) - **Critical for client history**
- Composite: `outletID` + `status` + `date` (ascending)
- Composite: `outletID` + `date` + `time` (ascending) - **Critical for daily bookings**

**Query Examples**:
```typescript
// Get today's appointments for outlet_001
where('outletID', '==', 'outlet_001')
where('date', '==', '2024-01-20')

// Get staff schedule for specific day
where('outletID', '==', 'outlet_001')
where('staffId', '==', 'staff_abc123')
where('date', '==', '2024-01-20')
orderBy('time', 'asc')

// Get client's appointment history
where('outletID', '==', 'outlet_001')
where('clientId', '==', 'client_xyz789')
orderBy('date', 'desc')
```

---

### 5. Collection: `transactions`

**Purpose**: Stores all sales and expenses, scoped to outlets for revenue tracking.

**Document Structure**:
```typescript
{
  id: string;                 // Auto-generated document ID
  outletID: string;          // REQUIRED: Transaction belongs to outlet
  date: string;               // ISO timestamp
  type: 'SALE' | 'EXPENSE';
  clientId?: string;          // Optional: for sales
  items?: CartItem[];         // Line items for sales
  amount: number;
  category: string;
  description: string;
  paymentMethod?: string;
}
```

**Required Indexes**:
- Single field: `outletID` (ascending)
- Composite: `outletID` + `date` (descending) - **Critical for daily sales**
- Composite: `outletID` + `type` + `date` (descending)
- Composite: `outletID` + `clientId` + `date` (descending) - **Critical for client history**
- Composite: `outletID` + `staffId` + `date` (descending) - **Critical for commission tracking**
- Composite: `outletID` + `date` + `amount` (descending) - **Critical for revenue sorting**

**Query Examples**:
```typescript
// Get daily sales for outlet_001
where('outletID', '==', 'outlet_001')
where('type', '==', 'SALE')
where('date', '>=', startOfDay)
where('date', '<=', endOfDay)

// Get client's transaction history
where('outletID', '==', 'outlet_001')
where('clientId', '==', 'client_xyz789')
orderBy('date', 'desc')

// Get staff commission transactions
where('outletID', '==', 'outlet_001')
where('staffId', '==', 'staff_abc123')
where('type', '==', 'SALE')
```

---

### 6. Collection: `services`

**Purpose**: Stores services offered by each outlet (prices may vary by outlet).

**Document Structure**:
```typescript
{
  id: string;                 // Auto-generated document ID
  outletID: string;          // REQUIRED: Service belongs to outlet
  name: string;
  price: number;
  duration: number;           // Minutes
  category: string;
  points: number;             // Loyalty points earned
  isCommissionable: boolean;
  description?: string;
  createdAt: string;
}
```

**Required Indexes**:
- Single field: `outletID` (ascending)
- Composite: `outletID` + `category` (ascending)
- Composite: `outletID` + `isCommissionable` (ascending)

---

### 7. Collection: `products`

**Purpose**: Stores retail products, each outlet maintains its own inventory.

**Document Structure**:
```typescript
{
  id: string;                 // Auto-generated document ID
  outletID: string;          // REQUIRED: Product belongs to outlet
  name: string;
  price: number;
  stock: number;
  category: string;
}
```

**Required Indexes**:
- Single field: `outletID` (ascending)
- Composite: `outletID` + `category` (ascending)
- Composite: `outletID` + `stock` (ascending) - for low stock alerts

---

### 8. Collection: `packages`

**Purpose**: Stores service packages offered by outlets.

**Document Structure**:
```typescript
{
  id: string;                 // Auto-generated document ID
  outletID: string;          // REQUIRED: Package belongs to outlet
  name: string;
  price: number;
  points: number;
  category: string;
  services: PackageService[];
  description?: string;
  createdAt: string;
}
```

**Required Indexes**:
- Single field: `outletID` (ascending)
- Composite: `outletID` + `category` (ascending)

---

### 9. Collection: `rewards`

**Purpose**: Stores loyalty rewards available at each outlet.

**Document Structure**:
```typescript
{
  id: string;                 // Auto-generated document ID
  outletID: string;          // REQUIRED: Reward belongs to outlet
  name: string;
  cost: number;               // Points required
  icon: string;
}
```

**Required Indexes**:
- Single field: `outletID` (ascending)
- Composite: `outletID` + `cost` (ascending)

---

## Indexing Strategy

### Critical Indexes for Performance

These indexes are **essential** for efficient queries and must be created in Firestore:

#### 1. Daily Sales & Bookings (Most Common Queries)

```javascript
// appointments collection
{
  collectionGroup: 'appointments',
  fields: [
    { fieldPath: 'outletID', order: 'ASCENDING' },
    { fieldPath: 'date', order: 'ASCENDING' },
    { fieldPath: 'time', order: 'ASCENDING' }
  ]
}

// transactions collection
{
  collectionGroup: 'transactions',
  fields: [
    { fieldPath: 'outletID', order: 'ASCENDING' },
    { fieldPath: 'type', order: 'ASCENDING' },
    { fieldPath: 'date', order: 'DESCENDING' }
  ]
}
```

#### 2. Staff Schedule View

```javascript
{
  collectionGroup: 'appointments',
  fields: [
    { fieldPath: 'outletID', order: 'ASCENDING' },
    { fieldPath: 'staffId', order: 'ASCENDING' },
    { fieldPath: 'date', order: 'ASCENDING' },
    { fieldPath: 'time', order: 'ASCENDING' }
  ]
}
```

#### 3. Client History

```javascript
// appointments
{
  collectionGroup: 'appointments',
  fields: [
    { fieldPath: 'outletID', order: 'ASCENDING' },
    { fieldPath: 'clientId', order: 'ASCENDING' },
    { fieldPath: 'date', order: 'DESCENDING' }
  ]
}

// transactions
{
  collectionGroup: 'transactions',
  fields: [
    { fieldPath: 'outletID', order: 'ASCENDING' },
    { fieldPath: 'clientId', order: 'ASCENDING' },
    { fieldPath: 'date', order: 'DESCENDING' }
  ]
}
```

#### 4. Commission Tracking

```javascript
{
  collectionGroup: 'transactions',
  fields: [
    { fieldPath: 'outletID', order: 'ASCENDING' },
    { fieldPath: 'staffId', order: 'ASCENDING' },
    { fieldPath: 'date', order: 'DESCENDING' }
  ]
}
```

### How to Create Indexes

1. **Automatic**: Firestore will prompt you to create indexes when you run queries that require them
2. **Manual**: Use Firebase Console → Firestore → Indexes → Create Index
3. **firestore.indexes.json**: Define indexes in your project for version control

Example `firestore.indexes.json`:
```json
{
  "indexes": [
    {
      "collectionGroup": "appointments",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "outletID", "order": "ASCENDING" },
        { "fieldPath": "date", "order": "ASCENDING" },
        { "fieldPath": "time", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "transactions",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "outletID", "order": "ASCENDING" },
        { "fieldPath": "type", "order": "ASCENDING" },
        { "fieldPath": "date", "order": "DESCENDING" }
      ]
    }
  ]
}
```

---

## Query Performance Best Practices

### 1. Always Filter by outletID First
```typescript
// ✅ GOOD: outletID filter first
where('outletID', '==', 'outlet_001')
where('date', '==', '2024-01-20')

// ❌ BAD: Missing outletID filter
where('date', '==', '2024-01-20')
```

### 2. Use Composite Indexes for Multi-Field Queries
```typescript
// ✅ GOOD: Uses composite index
where('outletID', '==', 'outlet_001')
where('staffId', '==', 'staff_abc123')
where('date', '==', '2024-01-20')
orderBy('time', 'asc')

// ❌ BAD: Missing index, will fail
where('outletID', '==', 'outlet_001')
where('date', '==', '2024-01-20')
orderBy('staffId', 'asc')  // Wrong order
```

### 3. Limit Results for Large Datasets
```typescript
// ✅ GOOD: Limits results
where('outletID', '==', 'outlet_001')
orderBy('date', 'desc')
limit(50)

// ❌ BAD: Fetches all records
where('outletID', '==', 'outlet_001')
orderBy('date', 'desc')
```

---

## Security Rules Pattern

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper function to get user's outletID
    function getUserOutletID() {
      return get(/databases/$(database)/documents/staff/$(request.auth.uid)).data.outletID;
    }
    
    // Helper function to check if user belongs to outlet
    function belongsToOutlet(outletID) {
      return request.auth != null && getUserOutletID() == outletID;
    }
    
    // Outlets: Read-only for authenticated users, write for admins only
    match /outlets/{outletID} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.token.admin == true;
    }
    
    // Staff: Users can read all, write only their own outlet's staff
    match /staff/{staffId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && belongsToOutlet(request.resource.data.outletID);
      allow update, delete: if request.auth != null && belongsToOutlet(resource.data.outletID);
    }
    
    // Clients: Scoped to user's outlet
    match /clients/{clientId} {
      allow read, write: if request.auth != null && belongsToOutlet(resource.data.outletID);
    }
    
    // Appointments: Scoped to user's outlet
    match /appointments/{appointmentId} {
      allow read, write: if request.auth != null && belongsToOutlet(resource.data.outletID);
    }
    
    // Transactions: Scoped to user's outlet
    match /transactions/{transactionId} {
      allow read, write: if request.auth != null && belongsToOutlet(resource.data.outletID);
    }
    
    // Services, Products, Packages, Rewards: Scoped to user's outlet
    match /services/{serviceId} {
      allow read, write: if request.auth != null && belongsToOutlet(resource.data.outletID);
    }
    
    match /products/{productId} {
      allow read, write: if request.auth != null && belongsToOutlet(resource.data.outletID);
    }
    
    match /packages/{packageId} {
      allow read, write: if request.auth != null && belongsToOutlet(resource.data.outletID);
    }
    
    match /rewards/{rewardId} {
      allow read, write: if request.auth != null && belongsToOutlet(resource.data.outletID);
    }
  }
}
```

---

## Example Use Cases

### Use Case 1: Staff Views Daily Schedule
```typescript
// Query: Get all appointments for staff member on specific date
const staffScheduleQuery = query(
  appointmentsCol,
  where('outletID', '==', currentOutletID),
  where('staffId', '==', staffMemberId),
  where('date', '==', '2024-01-20'),
  orderBy('time', 'asc')
);
```

**Index Required**: `outletID` + `staffId` + `date` + `time`

---

### Use Case 2: View Daily Sales Report
```typescript
// Query: Get all sales transactions for outlet on specific date
const startOfDay = Timestamp.fromDate(new Date('2024-01-20T00:00:00Z'));
const endOfDay = Timestamp.fromDate(new Date('2024-01-20T23:59:59Z'));

const dailySalesQuery = query(
  transactionsCol,
  where('outletID', '==', currentOutletID),
  where('type', '==', 'SALE'),
  where('date', '>=', startOfDay),
  where('date', '<=', endOfDay),
  orderBy('date', 'desc')
);
```

**Index Required**: `outletID` + `type` + `date`

---

### Use Case 3: Client History Lookup
```typescript
// Query: Get all appointments and transactions for a client
const clientAppointmentsQuery = query(
  appointmentsCol,
  where('outletID', '==', currentOutletID),
  where('clientId', '==', clientId),
  orderBy('date', 'desc'),
  limit(50)
);

const clientTransactionsQuery = query(
  transactionsCol,
  where('outletID', '==', currentOutletID),
  where('clientId', '==', clientId),
  orderBy('date', 'desc'),
  limit(50)
);
```

**Indexes Required**: 
- `outletID` + `clientId` + `date` (appointments)
- `outletID` + `clientId` + `date` (transactions)

---

## Data Migration Notes

When migrating existing single-tenant data to multi-tenant:

1. **Assign outletID**: Every document needs an `outletID` field
2. **Update indexes**: Create all composite indexes before deploying
3. **Update queries**: Ensure all queries include `outletID` filter
4. **Test isolation**: Verify data from one outlet doesn't leak to another
5. **Update security rules**: Enforce outlet-level access control

---

## Summary

This multi-tenant schema ensures:
- ✅ Complete data isolation between outlets
- ✅ Efficient querying with proper indexes
- ✅ Scalability for 10+ outlets
- ✅ Security through outlet-scoped access control
- ✅ Performance optimization for common operations (daily sales, bookings, staff schedules)

All collections (except `outlets`) require the `outletID` field, and all queries must filter by `outletID` first for optimal performance and data security.
