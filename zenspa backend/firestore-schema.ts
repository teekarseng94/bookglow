/**
 * Multi-Tenant Firestore Database Schema
 * 
 * This file defines the Firestore collection structure for a multi-outlet booking system.
 * Each outlet operates independently with its own data scoped by outletID.
 */

import { 
  Outlet, 
  Staff, 
  Client, 
  Appointment, 
  Transaction, 
  Service, 
  Product, 
  Package,
  Reward 
} from './types';

/**
 * FIRESTORE COLLECTIONS STRUCTURE
 * 
 * Collection: outlets
 * Document ID: {outletID} (e.g., "outlet_001", "outlet_002")
 * 
 * Example Document:
 * {
 *   outletID: "outlet_001",
 *   name: "ZenFlow Spa - Downtown",
 *   address: {
 *     street: "123 Main St",
 *     city: "New York",
 *     state: "NY",
 *     zipCode: "10001",
 *     country: "USA"
 *   },
 *   businessHours: {
 *     monday: { open: "09:00", close: "18:00", isOpen: true },
 *     tuesday: { open: "09:00", close: "18:00", isOpen: true },
 *     wednesday: { open: "09:00", close: "18:00", isOpen: true },
 *     thursday: { open: "09:00", close: "20:00", isOpen: true },
 *     friday: { open: "09:00", close: "20:00", isOpen: true },
 *     saturday: { open: "10:00", close: "17:00", isOpen: true },
 *     sunday: { open: "10:00", close: "16:00", isOpen: false }
 *   },
 *   phone: "+1-555-0100",
 *   email: "downtown@zenflow.spa",
 *   timezone: "America/New_York",
 *   createdAt: "2024-01-15T10:00:00Z",
 *   updatedAt: "2024-01-15T10:00:00Z",
 *   isActive: true
 * }
 */

/**
 * Collection: staff
 * Document ID: {staffId} (auto-generated)
 * 
 * Indexes Required:
 * - outletID (ascending)
 * - outletID + role (composite)
 * - outletID + createdAt (composite)
 * 
 * Example Document:
 * {
 *   id: "staff_abc123",
 *   outletID: "outlet_001",
 *   name: "Emma Wilson",
 *   role: "Lead Therapist",
 *   email: "emma@zenflow.spa",
 *   phone: "555-2020",
 *   createdAt: "2024-01-15T10:00:00Z",
 *   profilePicture: "https://..."
 * }
 */

/**
 * Collection: clients
 * Document ID: {clientId} (auto-generated)
 * 
 * Indexes Required:
 * - outletID (ascending)
 * - outletID + email (composite) - for unique email per outlet
 * - outletID + phone (composite) - for unique phone per outlet
 * - outletID + createdAt (composite)
 * - outletID + points (composite) - for rewards queries
 * 
 * Example Document:
 * {
 *   id: "client_xyz789",
 *   outletID: "outlet_001",
 *   name: "Sarah Jenkins",
 *   email: "sarah.j@example.com",
 *   phone: "555-0101",
 *   notes: "Prefers firm pressure.",
 *   createdAt: "2024-01-15T10:00:00Z",
 *   points: 720
 * }
 * 
 * Note: Same email/phone can exist in different outlets (different clients)
 */

/**
 * Collection: appointments
 * Document ID: {appointmentId} (auto-generated)
 * 
 * Indexes Required:
 * - outletID (ascending)
 * - outletID + date (composite)
 * - outletID + staffId + date (composite) - for staff schedule view
 * - outletID + clientId + date (composite) - for client history
 * - outletID + status + date (composite) - for filtering by status
 * - outletID + date + time (composite) - for daily bookings
 * 
 * Example Document:
 * {
 *   id: "appt_def456",
 *   outletID: "outlet_001",
 *   clientId: "client_xyz789",
 *   staffId: "staff_abc123",
 *   serviceId: "s1",
 *   date: "2024-01-20",
 *   time: "14:30",
 *   status: "scheduled",
 *   reminderSent: false
 * }
 */

/**
 * Collection: transactions
 * Document ID: {transactionId} (auto-generated)
 * 
 * Indexes Required:
 * - outletID (ascending)
 * - outletID + date (composite) - for daily sales
 * - outletID + type + date (composite) - for filtering sales/expenses
 * - outletID + clientId + date (composite) - for client transaction history
 * - outletID + staffId + date (composite) - for staff commission tracking
 * - outletID + date + amount (composite) - for revenue sorting
 * 
 * Example Document:
 * {
 *   id: "txn_ghi789",
 *   outletID: "outlet_001",
 *   date: "2024-01-20T14:30:00Z",
 *   type: "SALE",
 *   clientId: "client_xyz789",
 *   items: [
 *     {
 *       id: "s1",
 *       name: "Swedish Massage",
 *       price: 80,
 *       quantity: 1,
 *       type: "service",
 *       points: 80,
 *       staffId: "staff_abc123",
 *       commissionEarned: 16
 *     }
 *   ],
 *   amount: 80,
 *   category: "Massage",
 *   description: "Sale: Swedish Massage",
 *   paymentMethod: "Cash"
 * }
 */

/**
 * Collection: services
 * Document ID: {serviceId} (auto-generated)
 * 
 * Indexes Required:
 * - outletID (ascending)
 * - outletID + category (composite)
 * - outletID + isCommissionable (composite)
 * 
 * Example Document:
 * {
 *   id: "s1",
 *   outletID: "outlet_001",
 *   name: "Swedish Massage",
 *   price: 80,
 *   duration: 60,
 *   category: "Massage",
 *   points: 80,
 *   isCommissionable: true,
 *   description: "Relaxing full-body massage",
 *   createdAt: "2024-01-15T10:00:00Z"
 * }
 */

/**
 * Collection: products
 * Document ID: {productId} (auto-generated)
 * 
 * Indexes Required:
 * - outletID (ascending)
 * - outletID + category (composite)
 * - outletID + stock (composite) - for low stock alerts
 * 
 * Example Document:
 * {
 *   id: "p1",
 *   outletID: "outlet_001",
 *   name: "Essential Oil - Lavender",
 *   price: 15,
 *   stock: 20,
 *   category: "Aromatherapy"
 * }
 */

/**
 * Collection: packages
 * Document ID: {packageId} (auto-generated)
 * 
 * Indexes Required:
 * - outletID (ascending)
 * - outletID + category (composite)
 * 
 * Example Document:
 * {
 *   id: "pk1",
 *   outletID: "outlet_001",
 *   name: "Massage Bundle (10 Sessions)",
 *   price: 700,
 *   points: 700,
 *   category: "Massage",
 *   services: [{ serviceId: "s1", quantity: 10 }],
 *   description: "10 sessions of 1-hour Swedish Massage",
 *   createdAt: "2024-01-15T10:00:00Z"
 * }
 */

/**
 * Collection: rewards
 * Document ID: {rewardId} (auto-generated)
 * 
 * Indexes Required:
 * - outletID (ascending)
 * - outletID + cost (composite)
 * 
 * Example Document:
 * {
 *   id: "r1",
 *   outletID: "outlet_001",
 *   name: "15% Discount Voucher",
 *   cost: 300,
 *   icon: "🎫"
 * }
 */

/**
 * QUERY PATTERNS FOR COMMON OPERATIONS
 */

export const QueryPatterns = {
  // Get all staff for an outlet
  getOutletStaff: (outletID: string) => ({
    collection: 'staff',
    where: [['outletID', '==', outletID]],
    orderBy: [['createdAt', 'desc']]
  }),

  // Get daily appointments for an outlet
  getDailyAppointments: (outletID: string, date: string) => ({
    collection: 'appointments',
    where: [
      ['outletID', '==', outletID],
      ['date', '==', date]
    ],
    orderBy: [['time', 'asc']]
  }),

  // Get staff schedule for a specific day
  getStaffSchedule: (outletID: string, staffId: string, date: string) => ({
    collection: 'appointments',
    where: [
      ['outletID', '==', outletID],
      ['staffId', '==', staffId],
      ['date', '==', date]
    ],
    orderBy: [['time', 'asc']]
  }),

  // Get daily sales (transactions) for an outlet
  getDailySales: (outletID: string, date: string) => ({
    collection: 'transactions',
    where: [
      ['outletID', '==', outletID],
      ['type', '==', 'SALE'],
      ['date', '>=', `${date}T00:00:00Z`],
      ['date', '<', `${date}T23:59:59Z`]
    ],
    orderBy: [['date', 'desc']]
  }),

  // Get client's appointment history
  getClientAppointments: (outletID: string, clientId: string) => ({
    collection: 'appointments',
    where: [
      ['outletID', '==', outletID],
      ['clientId', '==', clientId]
    ],
    orderBy: [['date', 'desc'], ['time', 'desc']]
  }),

  // Get client's transaction history
  getClientTransactions: (outletID: string, clientId: string) => ({
    collection: 'transactions',
    where: [
      ['outletID', '==', outletID],
      ['clientId', '==', clientId]
    ],
    orderBy: [['date', 'desc']]
  }),

  // Get all clients for an outlet
  getOutletClients: (outletID: string) => ({
    collection: 'clients',
    where: [['outletID', '==', outletID]],
    orderBy: [['createdAt', 'desc']]
  }),

  // Get services by category for an outlet
  getServicesByCategory: (outletID: string, category: string) => ({
    collection: 'services',
    where: [
      ['outletID', '==', outletID],
      ['category', '==', category]
    ],
    orderBy: [['name', 'asc']]
  })
};

/**
 * FIRESTORE SECURITY RULES PATTERN
 * 
 * Example rules to ensure data isolation between outlets:
 * 
 * rules_version = '2';
 * service cloud.firestore {
 *   match /databases/{database}/documents {
 *     // Helper function to check if user belongs to outlet
 *     function belongsToOutlet(outletID) {
 *       return request.auth != null && 
 *              get(/databases/$(database)/documents/staff/$(request.auth.uid)).data.outletID == outletID;
 *     }
 * 
 *     match /outlets/{outletID} {
 *       allow read: if request.auth != null;
 *       allow write: if request.auth != null && request.auth.token.admin == true;
 *     }
 * 
 *     match /staff/{staffId} {
 *       allow read: if request.auth != null;
 *       allow write: if belongsToOutlet(resource.data.outletID) || request.auth.token.admin == true;
 *     }
 * 
 *     match /clients/{clientId} {
 *       allow read, write: if request.auth != null && 
 *         belongsToOutlet(resource.data.outletID);
 *     }
 * 
 *     match /appointments/{appointmentId} {
 *       allow read, write: if request.auth != null && 
 *         belongsToOutlet(resource.data.outletID);
 *     }
 * 
 *     match /transactions/{transactionId} {
 *       allow read, write: if request.auth != null && 
 *         belongsToOutlet(resource.data.outletID);
 *     }
 *   }
 * }
 */
