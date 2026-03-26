import React, { useState, useMemo } from 'react';
import { Transaction, TransactionType, Staff } from '../types';

// Report-specific icons (match image)
const ReportIcons = {
  BarChart: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  DocumentStar: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
    </svg>
  ),
  LineChart: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
    </svg>
  ),
  Percent: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Person: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  Gear: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  Wallet: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  ),
  Package: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  ),
  TrendUp: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  ),
  ChevronRight: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  ),
  Search: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  Close: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  Split: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  ),
  Calendar: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  Filter: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
    </svg>
  ),
  Printer: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
    </svg>
  ),
  Star: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  ),
  Customer: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  Service: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  ),
  Product: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  ),
  Discount: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Outstanding: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Document: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  Dollar: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  DocumentVoid: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
    </svg>
  ),
  Tag: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
    </svg>
  ),
  Marketing: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
    </svg>
  ),
  People: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  Utility: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  ),
  Cart: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  ),
  Bank: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
  Building: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
  FileText: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
};

const SIDEBAR_ITEMS = [
  { id: 'insight-hub', label: 'Insight Hub', icon: <ReportIcons.BarChart />, hasArrow: false },
  { id: 'monthly-summary', label: 'Monthly Summary', icon: <ReportIcons.DocumentStar />, hasArrow: false },
  { id: 'sales', label: 'Sales', icon: <ReportIcons.LineChart />, hasArrow: true },
  { id: 'commission', label: 'Commission', icon: <ReportIcons.Percent />, hasArrow: true },
  { id: 'staff', label: 'Staff', icon: <ReportIcons.Person />, hasArrow: true },
  { id: 'operation', label: 'Operation', icon: <ReportIcons.Gear />, hasArrow: true },
  { id: 'member-balance', label: 'Member Balance', icon: <ReportIcons.Wallet />, hasArrow: true },
  { id: 'package', label: 'Package', icon: <ReportIcons.Package />, hasArrow: true },
  { id: 'analytics', label: 'Analytics', icon: <ReportIcons.TrendUp />, hasArrow: true },
  { id: 'member', label: 'Member', icon: <ReportIcons.Person />, hasArrow: true },
];

/**
 * Monthly summary data shape. Map from Firestore 'reports' or 'monthly_summary':
 * - receipt*, expenses*, redeem*, highestStaffSales*, topService*, totalCollection, totalExpenses, closingBalance
 */
export interface MonthlySummaryData {
  collectionTotal: number;
  collection: { name: string; value: number }[];
  salesTotal: number;
  customerPax: number;
  service: number;
  product: number;
  package: number;
  discount: number;
  outstanding: number;
  hasStaffSales: boolean;
  receipt: {
    totalCount: number;
    startNo: string;
    endNo: string;
    averageSales: number;
    voidedCount: number;
    voidedSales: number;
    voidedRedeem: number;
  };
  redeem: { total: number; credit: number; package: number };
  expenses: Record<string, number>;
  highestStaffSales: { name: string; total: number };
  topService: { name: string; units: number };
  totalCollection: number;
  totalExpenses: number;
  closingBalance: number;
  /** Staff sales list for the month (avatarUrl optional for Firestore) */
  staffSalesList: { name: string; pax: number; total: number; hof: number; avatarUrl?: string }[];
}

// Match Finance page / INITIAL_EXPENSE_CATEGORIES: Rent, Supplies, Utilities, Marketing, Payroll, Commission, Other
const EXPENSE_CATEGORIES: { key: string; label: string; Icon: React.FC }[] = [
  { key: 'Rent', label: 'Rent', Icon: ReportIcons.Building },
  { key: 'Supplies', label: 'Supplies', Icon: ReportIcons.Cart },
  { key: 'Utilities', label: 'Utilities', Icon: ReportIcons.Utility },
  { key: 'Marketing', label: 'Marketing', Icon: ReportIcons.Marketing },
  { key: 'Payroll', label: 'Payroll', Icon: ReportIcons.People },
  { key: 'Commission', label: 'Commission', Icon: ReportIcons.Percent },
  { key: 'Other', label: 'Other', Icon: ReportIcons.FileText },
];

function formatMoney(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Bucket payment method for Summary Report: TnG (Touch n Go), Cash, or Other */
function paymentBucket(method: string | undefined): 'TnG' | 'Cash' | 'Other' {
  const m = (method ?? '').trim().toLowerCase();
  if (m === 'cash') return 'Cash';
  if (m.includes('touch') && (m.includes('go') || m.includes('n go') || m === 'tng')) return 'TnG';
  return 'Other';
}

export interface ReportPageProps {
  transactions: Transaction[];
  outletID: string;
  staff: Staff[];
}

/** Normalize transaction date to ISO string for range compare */
function txnDateStr(t: Transaction): string {
  const d = t.date;
  if (typeof d === 'string') return d;
  if (d instanceof Date) return d.toISOString();
  return (d as { toDate?: () => Date })?.toDate?.()?.toISOString?.() ?? '';
}

function isVoided(t: Transaction): boolean {
  const status = (t as Transaction & { status?: string }).status ?? '';
  return String(status).toLowerCase() === 'voided' || (t as any).voided === true;
}

/** Receipt number from transaction id (e.g. #0000002179) */
function receiptNoFromId(id: string): string {
  const num = id.replace(/\D/g, '').slice(-10) || id.slice(-8);
  return '#' + num.padStart(10, '0');
}

/** Build MonthlySummaryData for a given month from transactions (and staff for names). */
function computeMonthlySummary(
  transactions: Transaction[],
  outletID: string,
  staff: Staff[],
  year: number,
  month: number
): MonthlySummaryData {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59, 999);
  const startStr = start.toISOString();
  const endStr = end.toISOString();

  const salesInMonth = transactions.filter((t) => {
    if (t.outletID !== outletID || t.type !== TransactionType.SALE) return false;
    const dateStr = txnDateStr(t);
    return dateStr >= startStr && dateStr <= endStr;
  });

  const nonVoidedSales = salesInMonth.filter((t) => !isVoided(t));
  const voidedSales = salesInMonth.filter((t) => isVoided(t));

  const staffById = new Map(staff.filter((s) => s.outletID === outletID).map((s) => [s.id, s]));

  // Collection: group by payment method (display name), sum amount
  const collectionMap = new Map<string, number>();
  nonVoidedSales.forEach((t) => {
    const method = (t.paymentMethod ?? '').trim() || 'Other';
    collectionMap.set(method, (collectionMap.get(method) ?? 0) + (Number(t.amount) || 0));
  });
  const collection = Array.from(collectionMap.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
  const collectionTotal = nonVoidedSales.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  // Sales breakdown from items
  let service = 0,
    product = 0,
    pkg = 0,
    discount = 0,
    outstanding = 0;
  const customerIds = new Set<string>();
  const serviceNameUnits: Record<string, number> = {};
  const staffSalesMap = new Map<string, { pax: number; total: number; hof: number }>();

  nonVoidedSales.forEach((t) => {
    if (t.clientId) customerIds.add(t.clientId);
    const amt = Number(t.amount) || 0;
    (t.items ?? []).forEach((item) => {
      const qty = item.quantity ?? 1;
      const price = Number(item.price) ?? 0;
      const lineTotal = price * qty;
      if (item.type === 'service') {
        service += lineTotal;
        const name = (item.name ?? 'Service').trim();
        serviceNameUnits[name] = (serviceNameUnits[name] ?? 0) + qty;
        const sid = item.staffId;
        if (sid) {
          const cur = staffSalesMap.get(sid) ?? { pax: 0, total: 0, hof: 0 };
          cur.total += lineTotal;
          cur.pax += 1;
          staffSalesMap.set(sid, cur);
        }
      } else if (item.type === 'product') product += lineTotal;
      else if (item.type === 'package') pkg += lineTotal;
    });
    // Discount/outstanding if stored at txn level (optional)
    if ((t as any).discount != null) discount += Number((t as any).discount) || 0;
    if ((t as any).outstanding != null) outstanding += Number((t as any).outstanding) || 0;
  });

  const salesTotal = collectionTotal;
  const customerPax = customerIds.size;

  // Receipt: non-voided count, voided count/sums, start/end from all sales in month (by receipt number order)
  const sortedByReceipt = [...salesInMonth].sort((a, b) => {
    const na = (a.id.replace(/\D/g, '').slice(-10) || a.id.slice(-8)).padStart(10, '0');
    const nb = (b.id.replace(/\D/g, '').slice(-10) || b.id.slice(-8)).padStart(10, '0');
    return na.localeCompare(nb);
  });
  const totalCount = nonVoidedSales.length;
  const startNo = sortedByReceipt.length ? receiptNoFromId(sortedByReceipt[0].id) : '#0';
  const endNo = sortedByReceipt.length ? receiptNoFromId(sortedByReceipt[sortedByReceipt.length - 1].id) : '#0';
  const averageSales = totalCount > 0 ? salesTotal / totalCount : 0;
  const voidedCount = voidedSales.length;
  const voidedSalesAmt = voidedSales.reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const voidedRedeemAmt = 0; // could be derived from voided sale items with redeemedWithPoints

  // Expenses: type EXPENSE, date in month, group by category
  const expensesInMonth = transactions.filter((t) => {
    if (t.outletID !== outletID || t.type !== TransactionType.EXPENSE) return false;
    const dateStr = txnDateStr(t);
    return dateStr >= startStr && dateStr <= endStr;
  });
  const expenses: Record<string, number> = { Rent: 0, Supplies: 0, Utilities: 0, Marketing: 0, Payroll: 0, Commission: 0, Other: 0 };
  expensesInMonth.forEach((t) => {
    const cat = (t.category ?? 'Other').trim();
    const key = EXPENSE_CATEGORIES.some((c) => c.key === cat) ? cat : 'Other';
    expenses[key] = (expenses[key] ?? 0) + (Number(t.amount) || 0);
  });
  const totalExpenses = expensesInMonth.reduce((s, t) => s + (Number(t.amount) || 0), 0);

  // Redeem: from items with redeemedWithPoints (credit = points value; package = package redemption)
  let redeemCredit = 0,
    redeemPackage = 0;
  nonVoidedSales.forEach((t) => {
    (t.items ?? []).forEach((item) => {
      if (!item.redeemedWithPoints) return;
      const qty = item.quantity ?? 1;
      const price = Number(item.price) ?? 0;
      const lineTotal = price * qty;
      if (item.type === 'package') redeemPackage += lineTotal;
      else redeemCredit += lineTotal;
    });
  });
  const redeemTotal = redeemCredit + redeemPackage;

  // Staff sales list (sorted by total desc)
  const staffSalesList = Array.from(staffSalesMap.entries())
    .map(([staffId, v]) => {
      const s = staffById.get(staffId);
      return { name: s?.name ?? 'Unknown', pax: v.pax, total: v.total, hof: v.hof, avatarUrl: (s as any)?.photoURL };
    })
    .sort((a, b) => b.total - a.total);

  const highestStaffSales = staffSalesList[0]
    ? { name: staffSalesList[0].name, total: staffSalesList[0].total }
    : { name: '—', total: 0 };

  const topServiceEntry = Object.entries(serviceNameUnits).sort((a, b) => b[1] - a[1])[0];
  const topService = topServiceEntry ? { name: topServiceEntry[0], units: topServiceEntry[1] } : { name: '—', units: 0 };

  const totalCollection = salesTotal;
  const closingBalance = totalCollection - totalExpenses;

  return {
    collectionTotal,
    collection,
    salesTotal,
    customerPax,
    service,
    product,
    package: pkg,
    discount,
    outstanding,
    hasStaffSales: staffSalesList.length > 0,
    receipt: {
      totalCount,
      startNo,
      endNo,
      averageSales,
      voidedCount,
      voidedSales: voidedSalesAmt,
      voidedRedeem: voidedRedeemAmt
    },
    redeem: { total: redeemTotal, credit: redeemCredit, package: redeemPackage },
    expenses,
    highestStaffSales,
    topService,
    totalCollection,
    totalExpenses,
    closingBalance,
    staffSalesList
  };
}

const STAFF_SALES_COLLAPSED_COUNT = 3;

function MonthlySummaryCard({ data, monthLabel }: { data: MonthlySummaryData; monthLabel: string }) {
  const [staffSalesExpanded, setStaffSalesExpanded] = useState(false);
  const staffList = data.staffSalesList ?? [];
  const showStaffList = staffSalesExpanded ? staffList : staffList.slice(0, STAFF_SALES_COLLAPSED_COUNT);
  const hasMoreStaff = staffList.length > STAFF_SALES_COLLAPSED_COUNT;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
        <h3 className="text-lg font-bold text-slate-800">{monthLabel}</h3>
        <button type="button" className="p-2 rounded-lg hover:bg-slate-100 text-slate-500" aria-label="Print">
          <ReportIcons.Printer />
        </button>
      </div>
      <div className="p-6 space-y-6">
        {/* Collection */}
        <div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Collection</p>
          <p className="text-2xl font-black text-slate-800 mb-3">{formatMoney(data.collectionTotal)}</p>
          <ul className="space-y-2">
            {data.collection.map((row) => (
              <li key={row.name} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-slate-600">
                  <ReportIcons.Star />
                  {row.name}
                </span>
                <span className="font-semibold text-slate-800">{formatMoney(row.value)}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Sales */}
        <div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Sales</p>
          <p className="text-2xl font-black text-slate-800 mb-3">{formatMoney(data.salesTotal)}</p>
          <ul className="space-y-2">
            <li className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-slate-600"><ReportIcons.Customer /> Customer</span>
              <span className="font-semibold text-slate-800">{data.customerPax} Pax</span>
            </li>
            <li className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-slate-600"><ReportIcons.Service /> Service</span>
              <span className="font-semibold text-slate-800">{formatMoney(data.service)}</span>
            </li>
            <li className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-slate-600"><ReportIcons.Product /> Product</span>
              <span className="font-semibold text-slate-800">{formatMoney(data.product)}</span>
            </li>
            <li className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-slate-600"><ReportIcons.Package /> Package</span>
              <span className="font-semibold text-slate-800">{formatMoney(data.package)}</span>
            </li>
            <li className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-slate-600"><ReportIcons.Discount /> Discount</span>
              <span className="font-semibold text-slate-800">{formatMoney(data.discount)}</span>
            </li>
            <li className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-slate-600"><ReportIcons.Outstanding /> Outstanding</span>
              <span className="font-semibold text-slate-800">{formatMoney(data.outstanding)}</span>
            </li>
          </ul>
        </div>

        {/* Receipt */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Receipt</p>
            <span className="text-sm font-bold text-slate-800">{data.receipt.totalCount}</span>
          </div>
          <ul className="space-y-2">
            <li className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-slate-600"><ReportIcons.Document /> Start No.</span>
              <span className="font-semibold text-slate-800">{data.receipt.startNo}</span>
            </li>
            <li className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-slate-600"><ReportIcons.Document /> End No.</span>
              <span className="font-semibold text-slate-800">{data.receipt.endNo}</span>
            </li>
            <li className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-slate-600"><ReportIcons.Dollar /> Average Sales</span>
              <span className="font-semibold text-slate-800">{formatMoney(data.receipt.averageSales)}</span>
            </li>
            <li className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-slate-600"><ReportIcons.DocumentVoid /> Voided ({data.receipt.voidedCount})</span>
              <span className="font-semibold text-slate-800">{formatMoney(data.receipt.voidedSales + data.receipt.voidedRedeem)}</span>
            </li>
            <li className="pl-6 text-sm text-slate-600">
              <span className="mr-2">• Sales</span>
              <span className="font-semibold text-slate-800">{formatMoney(data.receipt.voidedSales)}</span>
            </li>
            <li className="pl-6 text-sm text-slate-600">
              <span className="mr-2">• Redeem</span>
              <span className="font-semibold text-slate-800">{formatMoney(data.receipt.voidedRedeem)}</span>
            </li>
          </ul>
        </div>

        {/* Expense */}
        <div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Expense</p>
          <ul className="space-y-2">
            {EXPENSE_CATEGORIES.map(({ key, label, Icon }) => (
              <li key={key} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-slate-600"><Icon /> {label}</span>
                <span className="font-semibold text-slate-800">{formatMoney(data.expenses[key] ?? 0)}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Redeem */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Redeem</p>
            <span className="text-sm font-bold text-slate-800">{formatMoney(data.redeem.total)}</span>
          </div>
          <ul className="space-y-2">
            <li className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-slate-600"><ReportIcons.Dollar /> Credit</span>
              <span className="font-semibold text-slate-800">{formatMoney(data.redeem.credit)}</span>
            </li>
            <li className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-slate-600"><ReportIcons.Tag /> Package</span>
              <span className="font-semibold text-slate-800">{formatMoney(data.redeem.package)}</span>
            </li>
          </ul>
        </div>

        {/* KPIs: Highest Staff Sales & Top Service */}
        <div className="border-t border-slate-100 pt-4">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Monthly Summary</p>
          <p className="text-sm text-slate-600 mb-1">Total Sales: <span className="font-semibold text-slate-800">{formatMoney(data.salesTotal)}</span></p>
          <p className="text-sm text-slate-600 mb-1">Total Redeem: <span className="font-semibold text-slate-800">{formatMoney(data.redeem.total)}</span></p>
          <p className="text-sm text-slate-600 mb-1">Highest Staff Sales: <span className="font-semibold text-slate-800">{data.highestStaffSales.name} - {formatMoney(data.highestStaffSales.total)}</span></p>
          <p className="text-sm text-slate-600">Top Service: <span className="font-semibold text-slate-800">{data.topService.name} - {data.topService.units} Unit</span></p>
        </div>

        {/* Final Summary Totals */}
        <div className="border-t border-slate-200 pt-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-bold text-slate-600">Total Collection</span>
            <span className="font-black text-slate-800">{formatMoney(data.totalCollection)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="font-bold text-slate-600">Total Expenses</span>
            <span className="font-black text-slate-800">{formatMoney(data.totalExpenses)}</span>
          </div>
          <div className="flex items-center justify-between text-sm pt-2 border-t border-slate-100">
            <span className="font-bold text-slate-800">Closing Balance</span>
            <span className="font-black text-slate-800">{formatMoney(data.closingBalance)}</span>
          </div>
        </div>

        {/* Staff Sales - below closing balance (like 123.png) */}
        {staffList.length > 0 && (
          <div className="border-t border-slate-200 pt-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-bold text-slate-800">Staff Sales</p>
              {hasMoreStaff && (
                <button
                  type="button"
                  onClick={() => setStaffSalesExpanded(!staffSalesExpanded)}
                  className="text-sm font-semibold text-blue-600 hover:underline"
                >
                  {staffSalesExpanded ? 'View less' : 'View All'}
                </button>
              )}
            </div>
            <ul className="space-y-4">
              {showStaffList.map((staff) => (
                <li key={staff.name} className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-slate-200 flex-shrink-0 flex items-center justify-center overflow-hidden">
                      {staff.avatarUrl ? (
                        <img src={staff.avatarUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-slate-500 font-bold text-sm">
                          {staff.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800 truncate">{staff.name}</p>
                      <p className="text-xs text-slate-500">{staff.pax} Pax</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-semibold text-slate-800">{formatMoney(staff.total)}</p>
                    <p className="text-xs text-slate-500">HOF: {formatMoney(staff.hof)}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

const ReportPage: React.FC<ReportPageProps> = ({ transactions, outletID, staff }) => {
  const [reportNav, setReportNav] = useState('monthly-summary');
  const [searchQuery, setSearchQuery] = useState('');

  // Report period: single month (for Summary Report and first card)
  const now = new Date();
  const [reportYear, setReportYear] = useState(now.getFullYear());
  const [reportMonth, setReportMonth] = useState(now.getMonth() + 1); // 1-12

  // Two monthly cards: (reportYear, reportMonth) and (reportYear, reportMonth + 1)
  const month1Data = useMemo(
    () => computeMonthlySummary(transactions, outletID, staff, reportYear, reportMonth),
    [transactions, outletID, staff, reportYear, reportMonth]
  );
  const month2Year = reportMonth === 12 ? reportYear + 1 : reportYear;
  const month2Month = reportMonth === 12 ? 1 : reportMonth + 1;
  const month2Data = useMemo(
    () => computeMonthlySummary(transactions, outletID, staff, month2Year, month2Month),
    [transactions, outletID, staff, month2Year, month2Month]
  );
  const month1Label = new Date(reportYear, reportMonth - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  const month2Label = new Date(month2Year, month2Month - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

  // Summary Report: TnG, Cash, Other, Total Revenue from transactions (SALE only, not voided, selected month, current outlet)
  const summaryReport = useMemo(() => {
    const tng: number[] = [];
    const cash: number[] = [];
    const other: number[] = [];
    const start = new Date(reportYear, reportMonth - 1, 1);
    const end = new Date(reportYear, reportMonth, 0, 23, 59, 59, 999);
    const startStr = start.toISOString();
    const endStr = end.toISOString();

    transactions.forEach((t) => {
      if (t.outletID !== outletID || t.type !== TransactionType.SALE) return;
      const status = (t as Transaction & { status?: string }).status ?? '';
      if (String(status).toLowerCase() === 'voided' || (t as any).voided === true) return;
      const dateStr =
        typeof t.date === 'string'
          ? t.date
          : t.date instanceof Date
            ? t.date.toISOString()
            : (t.date as { toDate?: () => Date })?.toDate?.()?.toISOString?.() ?? '';
      if (!dateStr || dateStr < startStr || dateStr > endStr) return;

      const bucket = paymentBucket(t.paymentMethod);
      const amount = Number(t.amount) || 0;
      if (bucket === 'TnG') tng.push(amount);
      else if (bucket === 'Cash') cash.push(amount);
      else other.push(amount);
    });

    const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);
    const tngTotal = sum(tng);
    const cashTotal = sum(cash);
    const otherTotal = sum(other);
    return {
      tng: tngTotal,
      cash: cashTotal,
      other: otherTotal,
      totalRevenue: tngTotal + cashTotal + otherTotal
    };
  }, [transactions, outletID, reportYear, reportMonth]);

  const reportMonthLabel = useMemo(() => {
    return new Date(reportYear, reportMonth - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  }, [reportYear, reportMonth]);

  const goReportMonth = (delta: number) => {
    let y = reportYear;
    let m = reportMonth + delta;
    if (m > 12) { m = 1; y += 1; }
    if (m < 1) { m = 12; y -= 1; }
    setReportMonth(m);
    setReportYear(y);
  };

  return (
    <div className="flex min-h-[calc(100vh-5rem)] bg-slate-50 -mt-4 lg:-mt-8 -ml-4 lg:-ml-8 -mr-4 lg:-mr-8 pr-4 lg:pr-8">
      {/* Left sidebar - Report sub-nav (full height to top of content area) */}
      <aside className="w-64 flex-shrink-0 bg-slate-100 border-r border-slate-200 flex flex-col">
        <div className="p-3 border-b border-slate-200">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2">
              <ReportIcons.Search />
            </span>
            <input
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {SIDEBAR_ITEMS.map((item) => {
            const isActive = reportNav === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setReportNav(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left text-sm font-medium transition-all min-h-[44px] ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-200 hover:text-slate-800'
                }`}
              >
                {item.icon}
                <span className="flex-1">{item.label}</span>
                {item.hasArrow && <ReportIcons.ChevronRight />}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-auto">
        {/* Top bar - no orange/split icon; keep title only */}
        <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200">
          <button type="button" className="p-2 rounded-lg hover:bg-slate-100 text-slate-600" aria-label="Back">
            <ReportIcons.Close />
          </button>
          <h1 className="text-lg font-bold text-slate-800">Monthly Summary</h1>
          <div className="w-9" />
        </div>

        {/* Date controls */}
        <div className="flex-shrink-0 flex items-center gap-4 px-6 py-4 bg-white border-b border-slate-100">
          <button type="button" onClick={() => goReportMonth(-1)} className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center hover:bg-slate-50 text-slate-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex items-center gap-2 text-slate-700 font-medium">
            <ReportIcons.Calendar />
            <span>{reportMonthLabel}</span>
          </div>
          <button type="button" onClick={() => goReportMonth(1)} className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center hover:bg-slate-50 text-slate-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <div className="ml-auto flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">
            <ReportIcons.Filter />
            <span className="text-sm font-medium">Filter</span>
          </div>
        </div>

        {/* Summary Report (TnG, Cash, Other, Total Revenue) */}
        <div className="flex-shrink-0 px-6 py-4 bg-slate-50 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Summary Report</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-4xl">
            <div className="bg-white rounded-lg border border-slate-200 p-4">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">TnG</p>
              <p className="text-lg font-bold text-slate-800 mt-1">RM {formatMoney(summaryReport.tng)}</p>
            </div>
            <div className="bg-white rounded-lg border border-slate-200 p-4">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Cash</p>
              <p className="text-lg font-bold text-slate-800 mt-1">RM {formatMoney(summaryReport.cash)}</p>
            </div>
            <div className="bg-white rounded-lg border border-slate-200 p-4">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Other</p>
              <p className="text-lg font-bold text-slate-800 mt-1">RM {formatMoney(summaryReport.other)}</p>
            </div>
            <div className="bg-white rounded-lg border border-teal-200 bg-teal-50/50 p-4">
              <p className="text-xs font-medium text-teal-700 uppercase tracking-wide">Total Revenue</p>
              <p className="text-lg font-bold text-teal-800 mt-1">RM {formatMoney(summaryReport.totalRevenue)}</p>
            </div>
          </div>
        </div>

        {/* Two-column monthly cards (real data from transactions) */}
        <div className="flex-1 p-6 overflow-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-6xl mx-auto">
            <MonthlySummaryCard data={month1Data} monthLabel={month1Label} />
            <MonthlySummaryCard data={month2Data} monthLabel={month2Label} />
          </div>
        </div>
      </main>
    </div>
  );
};

export default ReportPage;
