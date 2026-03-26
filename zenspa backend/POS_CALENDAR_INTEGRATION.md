# POS-Calendar Integration Guide

## Overview

The POS system is now integrated with the Calendar to automatically create "On Duty" entries when sales are completed. This allows staff to see therapist availability in real-time.

## Features Implemented

### 1. Real-Time Clock & Date Display
- **Location**: Above the checkout cart in POS page
- **Display**: Shows current time (HH:MM:SS) and full date
- **Updates**: Every second automatically

### 2. Automatic "On Duty" Calendar Entries
- **Trigger**: When a sale is completed in POS with assigned therapist
- **Creation**: Automatically creates calendar entry for the assigned therapist
- **Status**: Marked as "scheduled" with `isOnDuty: true` flag
- **Duration**: Calculated based on service duration from catalog

### 3. End Time Calculation
- **Start Time**: Time of sale completion
- **End Time**: Start time + service duration (in minutes)
- **Display**: Shows as "HH:MM - HH:MM" in calendar

### 4. Real-Time Updates
- **Primary Method**: Firestore real-time listeners (already implemented)
- **Optional Method**: Socket.io client (requires Socket.io server setup)

## How It Works

### When a Sale is Completed:

1. **Check for Assigned Therapists**: System checks if any services in the cart have assigned staff members
2. **Create On Duty Entries**: For each service with an assigned therapist:
   - Creates an appointment entry
   - Sets start time to sale completion time
   - Calculates end time based on service duration
   - Marks as "On Duty" entry
3. **Real-Time Sync**: Calendar updates instantly via Firestore listeners

### Calendar Display:

- **On Duty Entries**: Displayed with indigo/blue styling
- **Time Range**: Shows start and end time
- **Multi-Hour Display**: If appointment spans multiple hours, shows continuation indicator in subsequent slots
- **Visual Indicator**: Green circle (🟢) and "ON DUTY" badge

## Socket.io Setup (Optional)

### Prerequisites
- Socket.io server running (Node.js backend)
- Socket.io client library installed (`socket.io-client`)

### Configuration

1. **Set Socket URL** in `.env.local`:
   ```
   VITE_SOCKET_URL=http://localhost:3001
   ```

2. **Socket.io Server Example** (Node.js):
   ```javascript
   const io = require('socket.io')(3001, {
     cors: { origin: '*' }
   });

   io.on('connection', (socket) => {
     console.log('Client connected:', socket.id);
     
     socket.on('appointment:created', (appointment) => {
       // Broadcast to all connected clients
       io.emit('appointment:created', appointment);
     });
   });
   ```

3. **Automatic Integration**: The app will automatically:
   - Connect to Socket.io server if URL is configured
   - Emit events when appointments are created
   - Listen for real-time updates

### Note on Real-Time Updates

**Firestore listeners are already active** and provide instant updates without Socket.io. Socket.io is optional and only needed if you want:
- Custom real-time logic
- Integration with external systems
- Additional real-time features beyond Firestore

## Technical Details

### Appointment Type Updates

```typescript
interface Appointment {
  // ... existing fields
  endTime?: string;        // HH:mm - calculated end time
  isOnDuty?: boolean;      // Flag for On Duty entries
}
```

### Checkout Flow

1. User completes sale in POS
2. `handleAddTransactionWithLogic` processes the transaction
3. For each service with assigned staff:
   - Calculates end time: `startTime + service.duration minutes`
   - Creates appointment with `isOnDuty: true`
   - Saves to Firestore
   - Emits Socket.io event (if configured)

### Calendar Display Logic

- **Time Slot Matching**: Appointments are matched to time slots
- **Multi-Hour Support**: Appointments spanning multiple hours are displayed in all relevant slots
- **Continuation Indicators**: Subsequent hours show minimal "↳ On Duty" indicator

## Usage Example

1. **In POS**:
   - Add service to cart
   - Assign therapist from dropdown
   - Complete sale

2. **In Calendar**:
   - Navigate to Calendar page
   - See "On Duty" entry appear instantly
   - View time range (e.g., "14:30 - 15:30")
   - See continuation across multiple hour slots if needed

## Troubleshooting

### Calendar Not Updating
- **Check Firestore**: Ensure Firestore real-time listeners are active
- **Check Console**: Look for Firestore connection errors
- **Socket.io**: If using Socket.io, verify server is running and URL is correct

### On Duty Entries Not Appearing
- **Verify**: Service has assigned therapist before checkout
- **Check**: Service duration is set in service catalog
- **Confirm**: Outlet ID is properly configured

### Time Display Issues
- **Timezone**: All times are in local browser timezone
- **Format**: Times displayed as 24-hour format (HH:MM)

## Future Enhancements

- [ ] Add ability to manually create "On Duty" entries
- [ ] Show overlapping appointments warning
- [ ] Add "On Duty" summary view
- [ ] Export On Duty schedule
