import React from 'react';

export interface NavItem {
  label: string;
  href: string;
}

export interface FeatureCard {
  title: string;
  description: string;
  icon: React.ReactNode;
}

export interface OptimizationResult {
  strategy: string;
  tips: string[];
}

/**
 * Appointment type — must match zenspa backend types.ts exactly
 * so backend reads data created by the booking frontend without undefined errors.
 */
export interface Appointment {
  id: string;
  outletID: string; // Required: Appointment belongs to outlet (Firestore field name)
  clientId: string;
  staffId: string;
  serviceId: string;
  date: string; // ISO Date string (YYYY-MM-DD)
  time: string; // HH:mm
  endTime?: string; // HH:mm - calculated end time based on service duration
  status: 'scheduled' | 'completed' | 'cancelled' | 'no-show';
  reminderSent?: boolean;
  isOnDuty?: boolean; // Flag to mark "On Duty" entries created from POS sales
}

/** Outlet type for dashboard/frontend usage (aligns with backend Outlet shape) */
export interface Outlet {
  outletID: string;
  name: string;
  addressDisplay?: string;
  phoneNumber?: string;
  businessHours?: Record<string, { open: string; close: string; isOpen?: boolean }>;
}