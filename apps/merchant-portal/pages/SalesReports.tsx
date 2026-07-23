import React, { useState, useMemo, useEffect } from 'react';
import { Transaction, TransactionType, Staff, Client } from '../types';
import TransactionDetailModal from '../components/TransactionDetailModal';
import { collection, query, where, orderBy, Timestamp, onSnapshot } from 'firebase/firestore';
import { resolveDataProvider } from '@bookglow/shared-types';
import { db } from '../firebase';
import { DB_PROVIDER, transactionService } from '../services/databaseService';
import {
  ReportDateRangeBar,
  ReportEmptyState,
  ReportFiltersSheet,
  ReportPageHeader,
  ReportSummaryStrip,
  ReportTxnCard,
} from '../components/reports';
import { Button } from '../components/ui/Button';

function useSupabaseData(): boolean {
  return (
    DB_PROVIDER === 'supabase' ||
    resolveDataProvider(
      import.meta.env as unknown as Record<string, string | undefined>
    ) === 'supabase'
  );
}

interface SalesReportsProps {
  transactions: Transaction[];
  staff: Staff[];
  clients: Client[];
  serviceCategories: string[];
  outletID: string;
  paymentMethods: string[];
  onVoidTransaction: (id: string) => Promise<void>;
  onUpdateTransaction?: (id: string, updates: Partial<Transaction>) => Promise<void>;
}

/** Display label for collection: show "E-wallet" instead of "Touch N GO" */
function paymentMethodDisplayLabel(method: string): string {
  const m = (method ?? '').trim();
  if (m === 'Touch N GO' || m.toLowerCase() === 'touch n go') return 'E-wallet';
  return m || 'Other';
}

/** Match transaction paymentMethod to a settings method (e.g. "Touch N GO" and "E-wallet" map to same row) */
function paymentMethodMatches(methodFromTxn: string, methodFromSettings: string): boolean {
  const t = (methodFromTxn ?? '').trim();
  const s = (methodFromSettings ?? '').trim();
  if (t === s) return true;
  if ((s === 'Touch N GO' || s === 'E-wallet') && (t === 'Touch N GO' || t === 'E-wallet')) return true;
  return false;
}

const COLLECTION_ICON_COLORS = ['bg-purple-500', 'bg-green-500', 'bg-blue-500', 'bg-amber-500', 'bg-teal-500', 'bg-rose-500', 'bg-indigo-500'];
const COLLECTION_TEXT_COLORS = ['text-purple-700', 'text-green-700', 'text-blue-700', 'text-amber-700', 'text-teal-700', 'text-rose-700', 'text-indigo-700'];

const SalesReports: React.FC<SalesReportsProps> = ({ 
  transactions, 
  staff, 
  clients,
  serviceCategories,
  outletID,
  paymentMethods = ['Cash', 'Credit Card', 'E-wallet', 'Other'],
  onVoidTransaction,
  onUpdateTransaction
}) => {
  const today = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(today);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [startDate, setStartDate] = useState<string>(today);
  const [endDate, setEndDate] = useState<string>(today);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedStaffId, setSelectedStaffId] = useState<string>('ALL');
  const [showFiltersSheet, setShowFiltersSheet] = useState(false);
  
  // Real-time collection data for selected date (from transactions collection)
  const [dailySales, setDailySales] = useState<Transaction[]>([]);
  const [collectionError, setCollectionError] = useState<string | null>(null);
  const [collectionLoading, setCollectionLoading] = useState<boolean>(true);

  // Sales for date range: Supabase poll or Firestore realtime
  useEffect(() => {
    if (!outletID || !startDate || !endDate) {
      setDailySales([]);
      setCollectionError(null);
      setCollectionLoading(false);
      return;
    }

    setCollectionLoading(true);
    setCollectionError(null);

    const rangeStart = startDate <= endDate ? startDate : endDate;
    const rangeEnd = startDate <= endDate ? endDate : startDate;
    const startOfRange = new Date(rangeStart);
    startOfRange.setHours(0, 0, 0, 0);
    const endOfRange = new Date(rangeEnd);
    endOfRange.setHours(23, 59, 59, 999);

    const filterNonVoidedSales = (list: Transaction[]) =>
      list.filter((t) => {
        if (t.type !== TransactionType.SALE) return false;
        const status = (t.status ?? '').toString().toLowerCase();
        const isVoided = (t as any).voided === true;
        return status !== 'void' && status !== 'voided' && !isVoided;
      });

    if (useSupabaseData()) {
      let cancelled = false;
      const load = async () => {
        try {
          const all = await transactionService.getAll(outletID);
          if (cancelled) return;
          const inRange = all.filter((t) => {
            if (!t.date) return false;
            const d = new Date(t.date);
            return d >= startOfRange && d <= endOfRange;
          });
          setDailySales(filterNonVoidedSales(inRange));
          setCollectionError(null);
          setCollectionLoading(false);
        } catch (error: any) {
          if (!cancelled) {
            console.error('Error loading Supabase sales report:', error);
            setCollectionLoading(false);
            setCollectionError(error?.message || 'Failed to load report data.');
          }
        }
      };
      void load();
      const timer = window.setInterval(() => void load(), 15000);
      return () => {
        cancelled = true;
        window.clearInterval(timer);
      };
    }

    let unsubscribe: (() => void) | undefined;

    try {
      const transactionsRef = collection(db, 'transactions');
      const collectionQuery = query(
        transactionsRef,
        where('outletID', '==', outletID),
        where('type', '==', TransactionType.SALE),
        where('date', '>=', Timestamp.fromDate(startOfRange)),
        where('date', '<=', Timestamp.fromDate(endOfRange)),
        orderBy('date', 'desc')
      );

      unsubscribe = onSnapshot(
        collectionQuery,
        (snapshot) => {
          const list = snapshot.docs.map(doc => {
            const raw = doc.data();
            const date = raw.date instanceof Timestamp
              ? raw.date.toDate().toISOString()
              : (typeof raw.date === 'string' ? raw.date : raw.date?.toDate?.()?.toISOString?.() ?? '');
            return { id: doc.id, ...raw, date } as Transaction;
          });

          setDailySales(filterNonVoidedSales(list));
          setCollectionError(null);
          setCollectionLoading(false);
        },
        (error: any) => {
          console.error('Error in collection query:', error);
          setCollectionLoading(false);

          if (error?.code === 'failed-precondition' && error?.message?.includes('index')) {
            setCollectionError('System is initializing reports. Please wait a moment...');
            if (error.message.includes('https://console.firebase.google.com')) {
              const linkMatch = error.message.match(/https:\/\/console\.firebase\.google\.com[^\s]+/);
              if (linkMatch) console.log('🔗 Create composite index:', linkMatch[0]);
            }
          } else {
            setCollectionError(error?.message || 'Failed to load report data.');
          }
        }
      );
    } catch (error: any) {
      console.error('Error setting up collection query:', error);
      setCollectionLoading(false);
      setCollectionError(error?.message || 'Failed to set up report query.');
    }

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [outletID, startDate, endDate]);

  // Filter dailySales by category and staff (for the filter bar functionality)
  const filteredData = useMemo(() => {
    return dailySales.filter(t => {
      const matchesCategory = selectedCategory === 'ALL' || 
                             t.category === selectedCategory ||
                             (t.items?.some(item => {
                               return t.category === selectedCategory;
                             }));
      
      if (!matchesCategory) return false;

      const matchesStaff = selectedStaffId === 'ALL' || 
                          t.items?.some(item => item.staffId === selectedStaffId);
      
      return matchesStaff;
    });
  }, [dailySales, selectedCategory, selectedStaffId]);

  // Aggregation: amounts by payment method (from settings), collectionTotal, and work summary
  const { collectionByMethod, collectionTotal, collectionSummary } = useMemo(() => {
    const methods = paymentMethods && paymentMethods.length > 0 ? paymentMethods : ['Cash', 'Credit Card', 'E-wallet', 'Other'];
    const byMethod: Record<string, number> = {};
    methods.forEach(m => { byMethod[m] = 0; });

    dailySales.forEach(t => {
      const pm = (t.paymentMethod ?? '').trim();
      const amount = t.amount ?? 0;
      const matched = methods.find(m => paymentMethodMatches(pm, m));
      if (matched) {
        byMethod[matched] = (byMethod[matched] ?? 0) + amount;
      } else {
        // Unmatched (e.g. legacy or typo): put under first "Other"-like or last method
        const otherKey = methods.find(m => /other/i.test(m)) ?? methods[methods.length - 1];
        byMethod[otherKey] = (byMethod[otherKey] ?? 0) + amount;
      }
    });

    const collectionTotal = Object.values(byMethod).reduce((s, v) => s + v, 0);
    const uniqueClients = new Set(dailySales.map(t => t.clientId).filter(Boolean));
    const uniqueStaff = new Set(dailySales.flatMap(t => t.items?.map(i => i.staffId).filter(Boolean) || []));
    const totalItems = dailySales.reduce((sum, t) => sum + (t.items?.length || 0), 0);

    return {
      collectionByMethod: byMethod,
      collectionTotal,
      collectionSummary: {
        total: collectionTotal,
        orderCount: dailySales.length,
        itemCount: totalItems,
        customerCount: uniqueClients.size,
        staffCount: uniqueStaff.size
      }
    };
  }, [dailySales, paymentMethods]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const step = direction === 'next' ? 1 : -1;
    const start = new Date(startDate);
    const end = new Date(endDate);
    start.setDate(start.getDate() + step);
    end.setDate(end.getDate() + step);
    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];
    setSelectedDate(startStr);
    setStartDate(startStr);
    setEndDate(endStr);
  };

  const handlePrint = () => {
    window.print();
  };

  const maskPhone = (phone: string) => {
    if (!phone || phone.length < 4) return phone;
    return '...' + phone.slice(-4);
  };

  return (
    <>
      {/* Print-only: ensure sidebar and totals are included in printed report */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .sales-report-print-area,
          .sales-report-print-area * { visibility: visible; }
          .sales-report-print-area { position: absolute; left: 0; top: 0; width: 100%; }
          .print\\:block { display: block !important; }
          .no-print { display: none !important; }
        }
      `}</style>
      <div className="space-y-4 sales-report-print-area">
      <div className="no-print">
        <ReportPageHeader
          title="Sales Reports"
          description="Collection totals and daily breakdown."
          actions={
            <Button type="button" variant="secondary" size="sm" onClick={handlePrint}>
              Print
            </Button>
          }
        />
      </div>
      <div className="flex flex-col lg:flex-row gap-6 animate-fadeIn">
      {/* Collection Summary Sidebar - included in print */}
      <div className="w-full lg:w-80 flex-shrink-0 space-y-4 print:block">
        {/* Collection Card */}
        <div className="bg-gradient-to-br from-blue-50 to-teal-50 rounded-2xl border border-blue-200 shadow-sm p-6">
          <h3 className="text-sm font-black uppercase tracking-widest text-slate-700 mb-4">Collection</h3>
          {collectionLoading ? (
            <div className="mb-6 flex items-center gap-3 text-teal-700">
              <svg className="animate-spin h-8 w-8 flex-shrink-0" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span className="text-sm font-medium">Loading report...</span>
            </div>
          ) : collectionError ? (
            <div className={`mb-6 p-3 rounded-lg border ${collectionError.includes('initializing') ? 'bg-blue-50 border-blue-200' : 'bg-red-50 border-red-200'}`}>
              <p className={collectionError.includes('initializing') ? 'text-xs text-blue-700 font-medium' : 'text-xs text-red-600 font-medium'}>
                {collectionError}
              </p>
            </div>
          ) : (
            <p className="text-4xl font-black text-teal-700 mb-6 tabular-nums">
              RM {collectionTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          )}

          <div className={`space-y-3 ${collectionLoading ? 'opacity-50 pointer-events-none' : ''}`}>
            {(paymentMethods && paymentMethods.length > 0 ? paymentMethods : ['Cash', 'Credit Card', 'E-wallet', 'Other']).map((method, idx) => {
              const amount = collectionByMethod[method] ?? 0;
              const label = paymentMethodDisplayLabel(method);
              const iconColor = COLLECTION_ICON_COLORS[idx % COLLECTION_ICON_COLORS.length];
              const textColor = COLLECTION_TEXT_COLORS[idx % COLLECTION_TEXT_COLORS.length];
              return (
                <div key={method} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 ${iconColor} rounded-lg flex items-center justify-center`}>
                      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
                        <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span className="text-sm font-semibold text-slate-700">{label}</span>
                  </div>
                  <span className={`text-lg font-bold tabular-nums ${textColor}`}>
                    RM {amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <ReportSummaryStrip
          className="!grid-cols-2"
          items={[
            { label: 'Orders', value: String(collectionSummary.orderCount), tone: 'neutral' },
            { label: 'Items', value: String(collectionSummary.itemCount), tone: 'neutral' },
            { label: 'Customers', value: String(collectionSummary.customerCount), tone: 'neutral' },
            { label: 'Staff', value: String(collectionSummary.staffCount), tone: 'neutral' },
          ]}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 space-y-4 sm:space-y-6 min-w-0">
        <ReportDateRangeBar
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          onPrev={() => navigateDate('prev')}
          onNext={() => navigateDate('next')}
          onPrint={handlePrint}
          onOpenFilters={() => setShowFiltersSheet(true)}
          title="Collection"
          rangeLabel={
            startDate === endDate
              ? formatDate(startDate)
              : `${formatDate(startDate)} – ${formatDate(endDate)}`
          }
        />

        {/* Desktop filter bar */}
        <div className="hidden sm:grid bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5">Date From</label>
            <input 
              type="date" 
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 font-bold text-sm"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5">Date To</label>
            <input 
              type="date" 
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 font-bold text-sm"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5">Category</label>
            <select 
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 font-bold text-sm"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="ALL">All Categories</option>
              {serviceCategories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5">Staff Member</label>
            <select 
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 font-bold text-sm"
              value={selectedStaffId}
              onChange={(e) => setSelectedStaffId(e.target.value)}
            >
              <option value="ALL">All Staff</option>
              {staff.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Transaction List */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">
              Total - {filteredData.length}
            </h3>
          </div>
          <div className="divide-y divide-slate-100">
            {/* Mobile structured cards */}
            <div className="sm:hidden space-y-2 p-3">
              {filteredData.map((txn) => {
                const client = clients.find((c) => c.id === txn.clientId);
                const txnDate = new Date(txn.date);
                return (
                  <ReportTxnCard
                    key={txn.id}
                    amountLabel={`RM${txn.amount.toFixed(2)}`}
                    amountTone="in"
                    customer={client?.name || 'Guest'}
                    dateTimeLabel={`${txnDate.toLocaleDateString('en-GB')} · ${txnDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}`}
                    paymentMethod={txn.paymentMethod || '—'}
                    statusLabel="Sale"
                    statusTone="success"
                    description={`${txn.items?.length || 0} items`}
                    onClick={() => setSelectedTransaction(txn)}
                  />
                );
              })}
            </div>

            {/* Desktop rows */}
            <div className="hidden sm:block">
            {filteredData.map(txn => {
              const client = clients.find(c => c.id === txn.clientId);
              const receiptNumber = txn.id.replace(/\D/g, '').slice(-10) || txn.id.slice(-8);
              const formattedReceipt = '#' + receiptNumber.padStart(10, '0');
              const txnDate = new Date(txn.date);
              const timeStr = txnDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
              const dateStr = txnDate.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
              
              return (
                <div
                  key={txn.id}
                  onClick={() => setSelectedTransaction(txn)}
                  className="p-4 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="text-sm font-bold text-slate-800">{formattedReceipt}</span>
                      </div>
                      <p className="text-xs text-slate-500 mb-2">{timeStr}, {dateStr}</p>
                      {client && (
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-semibold text-slate-700">{client.name}</span>
                          <span className="text-xs text-slate-400">{maskPhone(client.phone)}</span>
                        </div>
                      )}
                      <p className="text-sm font-medium text-slate-600">
                        {txn.paymentMethod || 'Not specified'}: {txn.amount.toFixed(2)}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-lg font-bold text-blue-600 mb-1 tabular-nums">{txn.amount.toFixed(2)}</p>
                      <p className="text-xs text-slate-400">{txn.items?.length || 0} Items</p>
                    </div>
                  </div>
                </div>
              );
            })}
            </div>
            {collectionLoading ? (
              <div className="p-12 flex flex-col items-center justify-center gap-3 text-slate-500">
                <svg className="animate-spin h-10 w-10 text-teal-600" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span className="text-sm font-medium">Loading report...</span>
              </div>
            ) : filteredData.length === 0 && !collectionError ? (
              <div className="p-6">
                <ReportEmptyState
                  title="No sales found"
                  description={
                    dailySales.length === 0
                      ? (startDate === endDate
                          ? `No sales found for ${formatDate(startDate)}.`
                          : `No sales found between ${formatDate(startDate)} and ${formatDate(endDate)}.`)
                      : 'No matching sales for the selected filters.'
                  }
                />
              </div>
            ) : null}
          </div>
        </div>
      </div>
      </div>

      <ReportFiltersSheet open={showFiltersSheet} onClose={() => setShowFiltersSheet(false)}>
        <div className="space-y-4">
          <label className="block">
            <span className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5">Date From</span>
            <input type="date" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </label>
          <label className="block">
            <span className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5">Date To</span>
            <input type="date" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </label>
          <label className="block">
            <span className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5">Category</span>
            <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold" value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
              <option value="ALL">All Categories</option>
              {serviceCategories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5">Staff Member</span>
            <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold" value={selectedStaffId} onChange={(e) => setSelectedStaffId(e.target.value)}>
              <option value="ALL">All Staff</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </label>
        </div>
      </ReportFiltersSheet>

      {/* Transaction Detail Modal - use latest from dailySales so payment method edit reflects immediately */}
      {selectedTransaction && (
        <TransactionDetailModal
          transaction={filteredData.find(t => t.id === selectedTransaction.id) ?? selectedTransaction}
          client={clients.find(c => c.id === selectedTransaction.clientId)}
          staff={staff}
          onClose={() => setSelectedTransaction(null)}
          onVoid={onVoidTransaction}
          onUpdate={onUpdateTransaction}
          paymentMethods={paymentMethods && paymentMethods.length > 0 ? paymentMethods : ['Cash', 'Credit Card', 'E-wallet', 'Other']}
        />
      )}
      </div>
    </>
  );
};

export default SalesReports;
