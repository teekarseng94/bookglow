/**
 * Socket.io Service for Real-time Updates
 * 
 * Note: Firestore already provides real-time listeners via useFirestoreData hook.
 * This Socket.io service is optional and can be used if you have a Socket.io server.
 * 
 * To use Socket.io:
 * 1. Set up a Socket.io server (Node.js backend)
 * 2. Set SOCKET_URL in .env.local (e.g., SOCKET_URL=http://localhost:3001)
 * 3. Import and use this service in components that need real-time updates
 */

import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const initializeSocket = (url?: string): Socket | null => {
  // Only initialize if URL is provided and socket doesn't exist
  if (!socket && url) {
    socket = io(url, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    socket.on('connect', () => {
      console.log('✅ Socket.io connected:', socket?.id);
    });

    socket.on('disconnect', () => {
      console.log('❌ Socket.io disconnected');
    });

    socket.on('error', (error) => {
      console.error('Socket.io error:', error);
    });
  }

  return socket;
};

export const getSocket = (): Socket | null => {
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

// Emit appointment update event
export const emitAppointmentUpdate = (appointment: any) => {
  if (socket && socket.connected) {
    socket.emit('appointment:created', appointment);
    console.log('📤 Emitted appointment update:', appointment.id);
  }
};

// Listen for appointment updates
export const onAppointmentUpdate = (callback: (appointment: any) => void) => {
  if (socket) {
    socket.on('appointment:created', callback);
    socket.on('appointment:updated', callback);
    return () => {
      socket?.off('appointment:created', callback);
      socket?.off('appointment:updated', callback);
    };
  }
  return () => {};
};
