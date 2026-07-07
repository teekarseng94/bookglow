/**
 * Member Details Page
 * Summary view + detail views: Recent, Sales, Appointments.
 * Uses onSnapshot in useMemberDetailsData for client-scoped real-time sales and appointments.
 */

import React, { useMemo, useState, useEffect, lazy, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ShoppingCart, Trash2 } from 'lucide-react';
import { Client, Transaction, TransactionType, Appointment, CartItem, Staff, Service } from '../types';
import { useMemberDetailsData } from '../hooks/useMemberDetailsData';

// Lazy load modals to avoid circular dependency
const PointsHistoryModal = lazy(() => import('../components/PointsHistoryModal'));
const CreditWalletModal = lazy(() => import('../components/CreditWalletModal'));
const OutstandingHistoryModal = lazy(() => import('../components/OutstandingHistoryModal'));
const TransactionDetailModal = lazy(() => import('../components/TransactionDetailModal'));

type ActiveView = 'summary' | 'recent' | 'sales' | 'appointments';
type RecentTab = 'Service' | 'Product' | 'Package' | 'Discount';
type SalesTimeFilter = '<30' | '<180' | '>180' | 'All';
type AppointmentsFilter = 'Upcoming' | 'Past' | 'No Show';

interface MemberDetailsProps {
  clients: Client[];
  transactions: Transaction[];
  appointments: Appointment[];
  staff: Staff[];
  services: Service[];
  staffName: string;
  onDeleteClient: (clientId: string) => Promise<void>;
  onUpdateClientCredit: (
    clientId: string,
    amount: number,
    type: 'topup' | 'deduction',
    staffRemark: string,
    staffName: string,
    transactionId?: string
  ) => Promise<number>;
  onRedeemVoucher?: (clientId: string) => Promise<void>;
  onVoidTransaction?: (id: string) => Promise<void>;
}

// Placeholder icon when service/product has no image (Lucide-style box)
const PlaceholderIcon = ({ className }: { className?: string }) => (
  <div className={`rounded-xl bg-slate-200 text-slate-500 flex items-center justify-center ${className || 'w-12 h-12'}`}>
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
  </div>
);

const MemberDetails: React.FC<MemberDetailsProps> = ({
  clients,
  transactions,
  appointments,
  staff,
  services,
  staffName,
  onDeleteClient,
  onUpdateClientCredit,
  onRedeemVoucher,
  onVoidTransaction
}) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState<ActiveView>('summary');
  const [recentTab, setRecentTab] = useState<RecentTab>('Service');
  const [salesFilter, setSalesFilter] = useState<SalesTimeFilter>('<30');
  const [appointmentsFilter, setAppointmentsFilter] = useState<AppointmentsFilter>('Past');
  const [showPointsModal, setShowPointsModal] = useState(false);
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [showOutstandingModal, setShowOutstandingModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInProgress, setDeleteInProgress] = useState(false);
  const [currentPointsBalance, setCurrentPointsBalance] = useState(0);
  const [creditBalance, setCreditBalance] = useState(0);
  const [currentOutstandingBalance, setCurrentOutstandingBalance] = useState(0);
  const [selectedSale, setSelectedSale] = useState<Transaction | null>(null);

  const client = useMemo(() => clients.find((c) => c.id === id), [clients, id]);

  // Real-time Firestore queries: sales and appointments for this client (onSnapshot)
  const { clientSales, clientAppointments, loading: memberDataLoading, error: memberDataError } = useMemberDetailsData(
    id ?? undefined,
    client?.outletID ?? undefined
  );

  const getStaffName = (staffId: string) => staff.find((s) => s.id === staffId)?.name ?? '—';
  const getServiceName = (serviceId: string) => services.find((s) => s.id === serviceId)?.name ?? '—';

  const nextAppointment = useMemo(() => {
    const now = new Date();
    const upcoming = clientAppointments
      .filter((a) => a.status === 'scheduled' && new Date(a.date + 'T' + (a.time || '00:00')) >= now)
      .sort((a, b) => new Date(a.date + 'T' + a.time).getTime() - new Date(b.date + 'T' + b.time).getTime());
    return upcoming[0] || null;
  }, [clientAppointments]);

  const lastSale = clientSales[0];
  const credit = client?.credit ?? 0;
  const points = client?.points ?? 0;
  const vouchers = client?.voucherCount ?? 0;
  const outstanding = client?.outstanding ?? 0;

  // Sync currentPointsBalance, creditBalance, and currentOutstandingBalance when client updates
  useEffect(() => {
    setCurrentPointsBalance(points);
    setCreditBalance(credit);
    setCurrentOutstandingBalance(outstanding);
  }, [points, credit, outstanding]);

  const formatJoinDate = (createdAt: string) => {
    try {
      return new Date(createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return createdAt;
    }
  };

  const formatRelativeTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 60) return `${diffMins}min`;
    if (diffDays < 1) return 'Today';
    if (diffDays === 1) return '1 Day Ago';
    if (diffDays < 7) return `${diffDays} Days Ago`;
    return d.toLocaleDateString();
  };

  const formatDateHeader = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  // All hooks must run before any conditional return (Rules of Hooks)
  // —— Recent detail view: line items grouped by date, tabs Service / Product / Package / Discount
  const flattenedLineItems = useMemo(() => {
    const list: { date: string; type: CartItem['type'] | 'discount'; name: string; price: number; quantity: number; transactionId: string }[] = [];
    clientSales.forEach((tx) => {
      const dateOnly = (typeof tx.date === 'string' ? tx.date : '').split('T')[0] || String(tx.date);
      if (tx.items && tx.items.length) {
        tx.items.forEach((item) => {
          const type = tx.category === 'Redemption' ? 'discount' : item.type;
          list.push({
            date: dateOnly,
            type,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            transactionId: tx.id
          });
        });
      } else {
        if (tx.category === 'Redemption' || (tx.description && tx.description.toLowerCase().includes('discount'))) {
          list.push({ date: dateOnly, type: 'discount', name: tx.description || 'Discount', price: tx.amount, quantity: 1, transactionId: tx.id });
        }
      }
    });
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [clientSales]);

  const recentFiltered = useMemo(() => {
    if (recentTab === 'Service') return flattenedLineItems.filter((i) => i.type === 'service');
    if (recentTab === 'Product') return flattenedLineItems.filter((i) => i.type === 'product');
    if (recentTab === 'Package') return flattenedLineItems.filter((i) => i.type === 'package');
    return flattenedLineItems.filter((i) => i.type === 'discount');
  }, [flattenedLineItems, recentTab]);

  const recentByDate = useMemo(() => {
    const map: Record<string, typeof recentFiltered> = {};
    recentFiltered.forEach((item) => {
      if (!map[item.date]) map[item.date] = [];
      map[item.date].push(item);
    });
    return Object.entries(map).sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime());
  }, [recentFiltered]);

  const now = Date.now();
  const salesFiltered = useMemo(() => {
    const d30 = 30 * 86400000, d180 = 180 * 86400000;
    return clientSales.filter((tx) => {
      const t = new Date(tx.date).getTime();
      if (salesFilter === '<30') return now - t <= d30;
      if (salesFilter === '<180') return now - t <= d180;
      if (salesFilter === '>180') return now - t > d180;
      return true;
    });
  }, [clientSales, salesFilter]);

  const salesByMonth = useMemo(() => {
    const map: Record<string, Transaction[]> = {};
    salesFiltered.forEach((tx) => {
      const d = new Date(tx.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!map[key]) map[key] = [];
      map[key].push(tx);
    });
    Object.values(map).forEach((arr) => arr.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    return Object.entries(map).sort(([a], [b]) => b.localeCompare(a));
  }, [salesFiltered]);

  const appointmentsFiltered = useMemo(() => {
    const nowStr = new Date().toISOString().slice(0, 16);
    if (appointmentsFilter === 'Upcoming') {
      return clientAppointments
        .filter((a) => a.status === 'scheduled' && (a.date + 'T' + (a.time || '00:00')) >= nowStr)
        .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
    }
    if (appointmentsFilter === 'No Show') {
      return clientAppointments.filter((a) => a.status === 'no-show').sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
    }
    return clientAppointments
      .filter((a) => a.status !== 'scheduled' || (a.date + 'T' + (a.time || '00:00')) < nowStr)
      .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
  }, [clientAppointments, appointmentsFilter]);

  const receiptNumber = (tx: Transaction, index: number) => {
    const num = tx.id.replace(/\D/g, '').slice(-10) || String(index + 1);
    return '#' + num.padStart(10, '0');
  };

  const showMemberLoading = memberDataLoading && clientSales.length === 0 && clientAppointments.length === 0;
  const bgClass = 'bg-[#f8f9fa] min-h-[60vh]';

  if (!client) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center text-slate-500 bg-[#f8f9fa]">
        <p className="font-semibold">Member not found.</p>
        <button onClick={() => navigate(-1)} className="mt-4 text-teal-600 hover:underline">Go back</button>
      </div>
    );
  }

  const renderDetailHeader = (title: string, onBack: () => void) => (
    <div className="flex items-center justify-between p-4 bg-white border-b border-slate-200 sticky top-0 z-10 rounded-t-2xl">
      <button onClick={onBack} className="p-2 -ml-2 rounded-xl hover:bg-slate-100 text-teal-600 transition-colors" aria-label="Back">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
      </button>
      <h2 className="text-lg font-bold text-slate-800">{title}</h2>
      <div className="w-10" />
    </div>
  );

  // —— Render Recent view
  if (activeView === 'recent') {
    return (
      <div className={bgClass}>
        <div className="max-w-2xl mx-auto pb-8">
          {renderDetailHeader('Recent', () => setActiveView('summary'))}
          <div className="px-4 pt-4">
            <div className="flex gap-1 p-1 bg-slate-200 rounded-xl mb-4">
              {(['Service', 'Product', 'Package', 'Discount'] as RecentTab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setRecentTab(tab)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${recentTab === tab ? 'bg-white text-teal-600 shadow-sm' : 'text-slate-500'}`}
                >
                  {tab}
                </button>
              ))}
            </div>
            <div className="space-y-6">
              {recentByDate.length === 0 ? (
                <p className="text-slate-500 text-center py-8">No {recentTab.toLowerCase()} items.</p>
              ) : (
                recentByDate.map(([date, items]) => (
                  <div key={date}>
                    <p className="text-sm font-medium text-slate-500 mb-2">{formatDateHeader(date)}</p>
                    <div className="space-y-2">
                      {items.map((item, idx) => (
                        <div
                          key={`${date}-${item.transactionId}-${idx}`}
                          className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex items-center gap-4"
                        >
                          <PlaceholderIcon className="w-12 h-12 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-slate-800 truncate">{item.name}</p>
                            <p className="text-sm text-teal-600 font-medium">{item.price.toFixed(2)} {item.quantity > 1 ? `× ${item.quantity}` : ''}</p>
                          </div>
                          <svg className="w-5 h-5 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // —— Render Sales view
  if (activeView === 'sales') {
    return (
      <div className={bgClass}>
        <div className="max-w-2xl mx-auto pb-8">
          {renderDetailHeader('Sales', () => setActiveView('summary'))}
          <div className="px-4 pt-4">
            <div className="flex gap-2 flex-wrap mb-4">
              {(['<30 days', '<180 days', '>180 days', 'All'] as const).map((label, i) => {
                const key = ['<30', '<180', '>180', 'All'][i] as SalesTimeFilter;
                return (
                  <button
                    key={key}
                    onClick={() => setSalesFilter(key)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${salesFilter === key ? 'bg-slate-200 text-teal-600' : 'bg-white text-slate-500 border border-slate-200'}`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            <div className="space-y-6">
              {salesByMonth.length === 0 ? (
                <p className="text-slate-500 text-center py-8">No sales in this period.</p>
              ) : (
                salesByMonth.map(([monthKey, txs]) => {
                  const [y, m] = monthKey.split('-');
                  const monthLabel = new Date(Number(y), Number(m) - 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
                  return (
                    <div key={monthKey}>
                      <p className="text-sm font-medium text-slate-500 mb-2">{monthLabel}</p>
                      <div className="space-y-2">
                        {txs.map((tx, idx) => (
                          <button
                            key={tx.id}
                            type="button"
                            onClick={() => setSelectedSale(tx)}
                            onTouchEnd={(e) => {
                              // Open sale detail on touch (iPad/tablet): fire immediately so it works without relying on delayed click
                              e.preventDefault();
                              setSelectedSale(tx);
                            }}
                            style={{ touchAction: 'manipulation' }}
                            className="w-full text-left bg-white rounded-2xl border border-slate-200 shadow-sm p-4 min-h-[48px] hover:border-teal-300 hover:shadow-md active:bg-slate-50 transition-all cursor-pointer"
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex items-center gap-2">
                                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                <span className="font-mono text-sm text-slate-600">{receiptNumber(tx, idx)}</span>
                              </div>
                              <span className="text-lg font-bold text-teal-600">{tx.amount.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center mt-2 text-sm text-slate-500">
                              <span>{new Date(tx.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}, {formatDateHeader(tx.date.split('T')[0] || tx.date)}</span>
                              <span>{(tx.items?.length || 0)} Items</span>
                            </div>
                            <p className="text-xs text-slate-400 mt-1">
                              {client.name} ({client.phone ? '***' + client.phone.slice(-4) : '—'})
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Sale detail side modal – visible directly from Sales view */}
            {selectedSale && client && (
              <Suspense
                fallback={
                  <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center">
                    <div className="bg-white rounded-2xl p-8">
                      <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
                    </div>
                  </div>
                }
              >
                <TransactionDetailModal
                  transaction={selectedSale}
                  client={client}
                  staff={staff}
                  onClose={() => setSelectedSale(null)}
                  onVoid={async (id) => {
                    if (onVoidTransaction) {
                      await onVoidTransaction(id);
                    }
                    setSelectedSale(null);
                  }}
                />
              </Suspense>
            )}
          </div>
        </div>
      </div>
    );
  }

  // —— Render Appointments view
  if (activeView === 'appointments') {
    return (
      <div className={bgClass}>
        <div className="max-w-2xl mx-auto pb-8">
          {renderDetailHeader('Appointment', () => setActiveView('summary'))}
          <div className="px-4 pt-4">
            <div className="flex gap-1 p-1 bg-slate-200 rounded-xl mb-4">
              {(['Upcoming', 'Past', 'No Show'] as AppointmentsFilter[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setAppointmentsFilter(tab)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${appointmentsFilter === tab ? 'bg-white text-teal-600 shadow-sm' : 'text-slate-500'}`}
                >
                  {tab}
                </button>
              ))}
            </div>
            <div className="space-y-6">
              {appointmentsFiltered.length === 0 ? (
                <p className="text-slate-500 text-center py-8">No {appointmentsFilter.toLowerCase()} appointments.</p>
              ) : (
                (() => {
                  const byDate: Record<string, typeof appointmentsFiltered> = {};
                  appointmentsFiltered.forEach((a) => {
                    if (!byDate[a.date]) byDate[a.date] = [];
                    byDate[a.date].push(a);
                  });
                  return Object.entries(byDate)
                    .sort(([a], [b]) => b.localeCompare(a))
                    .map(([date, list]) => (
                      <div key={date}>
                        <p className="text-sm font-medium text-slate-500 mb-2">{formatDateHeader(date)}</p>
                        <div className="space-y-3">
                          {list.map((apt) => (
                            <div
                              key={apt.id}
                              className="bg-white rounded-2xl border-2 border-red-200 shadow-sm p-4 bg-red-50/30"
                            >
                              <div className="flex justify-between items-start">
                                <p className="font-bold text-slate-800">{client.name}</p>
                                {apt.status === 'completed' && (
                                  <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                                  </div>
                                )}
                              </div>
                              <p className="text-sm text-slate-600 mt-1">{getServiceName(apt.serviceId)}</p>
                              <div className="flex items-center gap-2 mt-2 text-sm text-slate-500">
                                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                <span>{apt.time || '—'} - {apt.endTime || '—'}</span>
                              </div>
                              <div className="flex items-center gap-2 mt-1 text-sm text-slate-500">
                                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                <span>{getStaffName(apt.staffId)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ));
                })()
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // —— Summary view (default)
  return (
    <div className={`space-y-6 animate-fadeIn max-w-2xl mx-auto ${bgClass} p-4`}>
      {memberDataError && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
          <p className="font-medium">Could not load member activity in real time.</p>
          <p className="mt-1 text-amber-700 break-all">{memberDataError}</p>
          <p className="mt-2 text-xs">If the error mentions a missing index, open the link in the message in your browser to create it in Firebase Console, then redeploy with: firebase deploy --only firestore:indexes</p>
        </div>
      )}
      {showMemberLoading && (
        <div className="flex items-center justify-center py-4">
          <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-white/80 text-slate-600 transition-colors" aria-label="Back">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <h2 className="text-xl font-bold text-slate-800">Member Details</h2>
        </div>
        <button
          onClick={() => navigate('/pos', { state: { selectedMember: { id: client.id, name: client.name, phone: client.phone || '' } } })}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 text-white font-semibold text-sm hover:bg-teal-700 active:scale-95 transition-all shadow-sm"
          title="Quick POS – start sale with this member"
        >
          <ShoppingCart className="w-5 h-5" />
          <span className="hidden sm:inline">Quick POS</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex items-center gap-4">
        <div className="relative flex-shrink-0">
          <div className="w-16 h-16 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-2xl font-bold border-2 border-white shadow-md">
            {client.name.charAt(0)}
          </div>
          <div className="absolute bottom-0 right-0 w-5 h-5 bg-teal-500 rounded-full border-2 border-white flex items-center justify-center">
            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold text-slate-800 truncate">{client.name}</h3>
          <p className="text-sm text-slate-600">{client.phone || '—'}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">Join Date</span>
          <p className="text-sm font-semibold text-slate-700">{formatJoinDate(client.createdAt)}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <button
            type="button"
            onClick={() => setShowCreditModal(true)}
            className="text-center cursor-pointer hover:bg-slate-50 rounded-xl p-2 -m-2 transition-colors"
          >
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-blue-100 text-blue-600 mb-2"><span className="text-lg font-bold">$</span></div>
            <p className="text-xs font-medium text-slate-500 uppercase">Credit</p>
            <p className="text-lg font-bold text-slate-800">{credit.toFixed(2)}</p>
          </button>
          <button
            type="button"
            onClick={() => setShowPointsModal(true)}
            className="text-center cursor-pointer hover:bg-slate-50 rounded-xl p-2 -m-2 transition-colors"
          >
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 mb-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
            </div>
            <p className="text-xs font-medium text-slate-500 uppercase">Point</p>
            <p className="text-lg font-bold text-slate-800">{currentPointsBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
          </button>
          <button
            type="button"
            onClick={() => {
              if (vouchers < 1) return;
              navigate('/pos', {
                state: {
                  selectedMember: { id: client.id, name: client.name, phone: client.phone || '' },
                  redeemVoucher: true
                }
              });
            }}
            disabled={vouchers < 1}
            className={`text-center rounded-xl p-2 -m-2 transition-colors ${vouchers > 0 ? 'cursor-pointer hover:bg-slate-50' : 'cursor-default'}`}
          >
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-sky-100 text-sky-600 mb-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
            </div>
            <p className="text-xs font-medium text-slate-500 uppercase">Voucher</p>
            <p className="text-lg font-bold text-slate-800">{vouchers}</p>
            {vouchers > 0 && (
              <p className="text-[10px] font-semibold text-sky-600 uppercase mt-0.5">
                Tap to redeem
              </p>
            )}
          </button>
          <button
            type="button"
            onClick={() => setShowOutstandingModal(true)}
            className="text-center cursor-pointer hover:bg-slate-50 rounded-xl p-2 -m-2 transition-colors"
          >
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl mb-2" style={{ backgroundColor: '#ffedeb' }}>
              <span className="text-lg font-bold" style={{ color: '#f44336' }}>$</span>
            </div>
            <p className="text-xs font-medium text-slate-500 uppercase">Outstanding</p>
            <p className="text-lg font-bold text-slate-800">{currentOutstandingBalance.toFixed(2)}</p>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="divide-y divide-slate-100">
          <button type="button" onClick={() => setActiveView('recent')} className="w-full flex items-center gap-4 p-4 text-left hover:bg-slate-50 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-violet-100 text-violet-600 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-800">Recent</p>
              <p className="text-sm text-slate-500">{lastSale ? formatRelativeTime(lastSale.date) : '—'}</p>
            </div>
            <svg className="w-5 h-5 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
          <button type="button" onClick={() => setActiveView('sales')} className="w-full flex items-center gap-4 p-4 text-left hover:bg-slate-50 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-800">Sales</p>
              <p className="text-sm text-slate-500">{lastSale ? `${formatRelativeTime(lastSale.date)}, ${lastSale.amount.toFixed(2)}` : 'No sales'}</p>
            </div>
            <svg className="w-5 h-5 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
          <button type="button" onClick={() => setActiveView('appointments')} className="w-full flex items-center gap-4 p-4 text-left hover:bg-slate-50 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-600 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-800">Appointments</p>
              <p className="text-sm text-slate-500">{nextAppointment ? `${nextAppointment.date}, ${nextAppointment.time}` : 'No upcoming'}</p>
            </div>
            <svg className="w-5 h-5 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /></svg>
            <span className="font-semibold text-slate-800">Photos</span>
          </div>
          <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </div>
        <div className="grid grid-cols-4 gap-3">
          <button type="button" className="aspect-square rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center text-slate-400 hover:border-teal-300 hover:bg-teal-50/50 transition-colors">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Breakdown', icon: '⏱', color: 'bg-pink-100 text-pink-600' },
            { label: 'Remarks', icon: '📋', color: 'bg-amber-100 text-amber-600' },
            { label: 'Checklist', icon: '✓', color: 'bg-teal-100 text-teal-600' },
            { label: 'Referral', icon: '👥', color: 'bg-amber-200/80 text-amber-800' }
          ].map((item) => (
            <button key={item.label} type="button" className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-slate-50 transition-colors">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold ${item.color}`}>{item.icon}</div>
              <span className="text-xs font-medium text-slate-600 text-center">{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Delete Member - red button at bottom */}
      <div className="pt-4 pb-8">
        <button
          type="button"
          onClick={() => setShowDeleteConfirm(true)}
          className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 active:scale-[0.98] transition-all shadow-sm"
        >
          <Trash2 className="w-5 h-5" />
          Delete Member
        </button>
      </div>

      {/* Delete confirmation modal */}
      {showDeleteConfirm && client && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-sm p-6 animate-fadeIn">
            <h3 className="text-lg font-bold text-slate-800 mb-2">Delete Member</h3>
            <p className="text-slate-600 text-sm mb-4">
              Permanently delete <strong>{client.name}</strong>? This cannot be undone. Sales and appointment history will remain, but the member profile will be removed.
            </p>
            <div className="flex gap-3">
              <button
                onClick={async () => {
                  setDeleteInProgress(true);
                  try {
                    await onDeleteClient(client.id);
                    setShowDeleteConfirm(false);
                    navigate('/member', { replace: true });
                  } catch (err: any) {
                    alert(err.message || 'Failed to delete member.');
                  } finally {
                    setDeleteInProgress(false);
                  }
                }}
                disabled={deleteInProgress}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {deleteInProgress ? 'Deleting...' : 'Delete'}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleteInProgress}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Points History Modal - Loaded dynamically to avoid circular dependency */}
      {showPointsModal && client && (
        <Suspense fallback={
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="bg-white rounded-2xl p-8">
              <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
            </div>
          </div>
        }>
          <PointsHistoryModal
            clientId={client.id}
            outletID={client.outletID}
            currentBalance={currentPointsBalance}
            onClose={() => setShowPointsModal(false)}
            onBalanceUpdate={setCurrentPointsBalance}
          />
        </Suspense>
      )}

      {/* Credit Wallet Modal */}
      {showCreditModal && client && (
        <Suspense fallback={
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="bg-white rounded-2xl p-8">
              <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
            </div>
          </div>
        }>
          <CreditWalletModal
            clientId={client.id}
            outletID={client.outletID}
            currentBalance={creditBalance}
            staffName={staffName}
            onClose={() => setShowCreditModal(false)}
            onBalanceUpdate={setCreditBalance}
            onUpdateCredit={async (amount, type, staffRemark) =>
              onUpdateClientCredit(client.id, amount, type, staffRemark, staffName)
            }
          />
        </Suspense>
      )}

      {/* Outstanding History Modal */}
      {showOutstandingModal && client && (
        <Suspense
          fallback={
            <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center">
              <div className="bg-white rounded-2xl p-8">
                <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
              </div>
            </div>
          }
        >
          <OutstandingHistoryModal
            clientId={client.id}
            outletID={client.outletID}
            currentBalance={currentOutstandingBalance}
            onClose={() => setShowOutstandingModal(false)}
            onBalanceUpdate={setCurrentOutstandingBalance}
          />
        </Suspense>
      )}

      {/* Sale detail side modal (transaction detail & void) */}
      {selectedSale && client && (
        <Suspense
          fallback={
            <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center">
              <div className="bg-white rounded-2xl p-8">
                <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
              </div>
            </div>
          }
        >
          <TransactionDetailModal
            transaction={selectedSale}
            client={client}
            staff={staff}
            onClose={() => setSelectedSale(null)}
            onVoid={async (id) => {
              if (onVoidTransaction) {
                await onVoidTransaction(id);
              }
              setSelectedSale(null);
            }}
          />
        </Suspense>
      )}
    </div>
  );
};

export default MemberDetails;
