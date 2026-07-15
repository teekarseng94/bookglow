/**
 * Dashboard – Analytics layout (TunaiPro-style).
 * Real-time aggregation from transactions (onSnapshot in parent). Filters: current month, outletID, exclude void.
 * Single dashboardData useMemo so POS completions update the dashboard instantly.
 */

import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Calendar,
  TrendingUp,
  ShoppingCart,
  Star,
  Package,
  Tag,
  CreditCard,
} from 'lucide-react';
import { Transaction, TransactionType, Client, Appointment, Service, OutletSettings } from '../types';
import {
  AttentionList,
  CustomerActivity,
  DashboardChartSection,
  DashboardEmptyState,
  OperationalStatus,
  SalesSnapshot,
  TodayHeader,
  TodaySummary,
  UpcomingAppointments,
} from '../components/dashboard';
import type { AttentionItem } from '../components/dashboard';

interface DashboardProps {
  transactions: Transaction[];
  clients: Client[];
  appointments: Appointment[];
  services: Service[];
  outletSettings: OutletSettings;
  outletID?: string;
  onMarkReminderSent: (id: string) => void;
}

type TopSellingTab = 'service' | 'product' | 'package' | 'discount';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function formatLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatCompactTime(hhmm: string): string {
  return hhmm.includes(':') ? hhmm.replace(':', '') : hhmm;
}

// App-wide currency is Malaysian Ringgit (RM), matching receipts / reports / POS.
function formatRM(n: number): string {
  return `RM ${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const Dashboard: React.FC<DashboardProps> = ({
  transactions,
  clients,
  appointments,
  services,
  outletSettings,
  outletID = '',
  onMarkReminderSent,
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [topSellingTab, setTopSellingTab] = useState<TopSellingTab>('service');
  const navigate = useNavigate();

  // Single dashboard data object: recalculates when transactions (or outletID) change so POS updates show instantly.
  const dashboardData = useMemo(() => {
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);

    // 1. Global sales filter: SALE only, exclude void/voided, optional outletID
    const salesOnly = transactions.filter((t) => {
      if (t.type !== TransactionType.SALE) return false;
      const status = (t.status || '').toLowerCase();
      if (status === 'voided' || status === 'void') return false;
      if (outletID && t.outletID !== outletID) return false;
      return true;
    });

    // 2. Current month sales for stats / category / top selling / visitor / payment
    const monthSales = salesOnly.filter((t) => {
      const d = (t.date || '').slice(0, 10);
      return d >= currentMonthStart && d <= currentMonthEnd;
    });

    // Revenue: exclude Voucher/Redemption so they don't inflate Total Revenue
    const revenueSales = monthSales.filter(
      (t) => t.category !== 'Voucher' && t.category !== 'Redemption'
    );
    const revenue = revenueSales.reduce((sum, t) => sum + t.amount, 0);
    const monthExpenses = transactions
      .filter((t) => {
        if (t.type !== TransactionType.EXPENSE) return false;
        if (outletID && t.outletID !== outletID) return false;
        const status = (t as Transaction & { status?: string }).status;
        const statusStr = (status ?? '').toString().toLowerCase();
        if (statusStr === 'voided' || statusStr === 'void') return false;
        const d = (t.date || '').slice(0, 10);
        return d >= currentMonthStart && d <= currentMonthEnd;
      })
      .reduce((sum, t) => sum + t.amount, 0);
    const stats = {
      revenue,
      expenses: monthExpenses,
      profit: revenue - monthExpenses,
      clientCount: clients.length,
    };

    // 3. Total Sales bar chart: group by day of week (Mon–Sun), sum totalAmount this week
    const dayOfWeek = now.getDay();
    const monOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const weekMon = new Date(now);
    weekMon.setDate(now.getDate() + monOffset);
    weekMon.setHours(0, 0, 0, 0);
    // Also accumulate this week's transaction count + top item while walking each day.
    let weekTxnCount = 0;
    const weekSkuMap = new Map<string, { name: string; qty: number }>();
    const chartData = DAY_LABELS.map((label, i) => {
      const d = new Date(weekMon);
      d.setDate(weekMon.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      const dayTxns = salesOnly.filter(
        (t) => (t.date || '').startsWith(dateStr) && t.category !== 'Voucher' && t.category !== 'Redemption'
      );
      const daySales = dayTxns.reduce((sum, t) => sum + t.amount, 0);
      weekTxnCount += dayTxns.length;
      dayTxns.forEach((t) => {
        t.items?.forEach((item) => {
          const key = String(item.id ?? item.name);
          const cur = weekSkuMap.get(key) ?? { name: item.name, qty: 0 };
          cur.qty += item.quantity || 1;
          weekSkuMap.set(key, cur);
        });
      });
      return { day: label, sales: Math.round(daySales * 100) / 100 };
    });
    const totalSalesThisWeek = chartData.reduce((sum, row) => sum + row.sales, 0);
    const weekTopItem = Array.from(weekSkuMap.values()).sort((a, b) => b.qty - a.qty)[0]?.name ?? null;
    const weekAvgSale = weekTxnCount > 0 ? totalSalesThisWeek / weekTxnCount : 0;

    // 4. Category Summary: Service, Product, Package, Discount, Outstanding
    let serviceTotal = 0,
      productTotal = 0,
      packageTotal = 0,
      discountTotal = 0,
      outstandingTotal = 0;
    monthSales.forEach((t) => {
      if (t.paymentStatus === 'partial' || (t.outstanding ?? 0) > 0) {
        outstandingTotal += t.outstanding ?? t.amount;
        return;
      }
      if (t.category === 'Redemption' || (t.description || '').toLowerCase().includes('discount')) {
        discountTotal += t.amount;
        return;
      }
      if (t.items?.length) {
        t.items.forEach((item) => {
          const amt = item.price * (item.quantity || 1);
          if (item.type === 'service') serviceTotal += amt;
          else if (item.type === 'product') productTotal += amt;
          else if (item.type === 'package') packageTotal += amt;
        });
      } else {
        serviceTotal += t.amount;
      }
    });
    const categorySummary = [
      { label: 'Service', value: serviceTotal, icon: TrendingUp, color: 'text-blue-600' },
      { label: 'Product', value: productTotal, icon: ShoppingCart, color: 'text-blue-600' },
      { label: 'Package', value: packageTotal, icon: Package, color: 'text-blue-600' },
      { label: 'Discount', value: discountTotal, icon: Tag, color: 'text-blue-600' },
      { label: 'Outstanding', value: outstandingTotal, icon: CreditCard, color: 'text-blue-600' },
    ];

    // 5. Top Selling: reduce by unique SKU, frequency + total revenue; sort by quantity (highest first), top 5
    const skuMap = new Map<string, { name: string; type: string; quantity: number; amount: number }>();
    monthSales.forEach((t) => {
      if (t.category === 'Redemption' || (t.description || '').toLowerCase().includes('discount')) {
        const key = 'discount';
        const cur = skuMap.get(key) ?? { name: 'Discount', type: 'discount', quantity: 0, amount: 0 };
        cur.quantity += 1;
        cur.amount += t.amount;
        skuMap.set(key, cur);
        return;
      }
      t.items?.forEach((item) => {
        const key = `${item.type}-${item.id}`;
        const cur = skuMap.get(key) ?? { name: item.name, type: item.type, quantity: 0, amount: 0 };
        cur.quantity += item.quantity || 1;
        cur.amount += (item.price || 0) * (item.quantity || 1);
        skuMap.set(key, cur);
      });
    });
    const topSellingAll = Array.from(skuMap.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    // 6. Visitor: unique member IDs this month, sum spent, top customers
    const byClient: Record<string, number> = {};
    monthSales.forEach((t) => {
      const cid = t.clientId || 'guest';
      byClient[cid] = (byClient[cid] || 0) + t.amount;
    });
    const visitorList = Object.entries(byClient)
      .filter(([id]) => id !== 'guest')
      .map(([clientId, spent]) => {
        const client = clients.find((c) => c.id === clientId);
        const tier =
          !client || (client.points ?? 0) >= 1000
            ? 'Gold Member'
            : (client?.points ?? 0) >= 300
              ? 'Regular Member'
              : 'New Member';
        return { clientId, name: client?.name ?? 'Unknown', spent, tier };
      })
      .sort((a, b) => b.spent - a.spent);
    const visitors = visitorList.slice(0, 10);
    const visitorTotalCount = visitorList.length;

    // 7. Payment: aggregate by paymentMethod
    const byMethod: Record<string, number> = {};
    monthSales.forEach((t) => {
      const method = t.paymentMethod || 'Other';
      byMethod[method] = (byMethod[method] || 0) + t.amount;
    });
    const paymentBreakdown = Object.entries(byMethod)
      .sort((a, b) => b[1] - a[1])
      .map(([method, amount]) => ({ method, amount }));

    return {
      stats,
      chartData,
      totalSalesThisWeek,
      weekTxnCount,
      weekTopItem,
      weekAvgSale,
      categorySummary,
      topSellingAll,
      monthSales,
      visitors,
      visitorTotalCount,
      paymentBreakdown,
    };
  }, [transactions, clients, outletID]);

  // Top Selling per tab: filter by type, sort by quantity, top 5
  const topSellingByType = useMemo(() => {
    return dashboardData.topSellingAll
      .filter((x) => x.type === topSellingTab)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);
  }, [dashboardData.topSellingAll, topSellingTab]);

  // Recent sales only (no expenses/commissions): exclude voided/deleted so Sales Report delete/void is reflected here
  const recentSales = useMemo(() => {
    const nonVoidedSales = transactions.filter((t) => {
      if (t.type !== TransactionType.SALE) return false;
      const status = (t.status ?? '').toString().toLowerCase();
      const isVoided = (t as any).voided === true;
      return status !== 'voided' && status !== 'void' && !isVoided;
    });
    return [...nonVoidedSales]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 6);
  }, [transactions]);

  // Quick Calendar: same timetable idea as Appointments page, but combined across ALL therapists (single stream).
  const quickSlots = useMemo(() => {
    const out: string[] = [];
    for (let minutes = 10 * 60; minutes <= 24 * 60; minutes += 30) {
      const hh = String(Math.floor(minutes / 60)).padStart(2, '0');
      const mm = String(minutes % 60).padStart(2, '0');
      out.push(`${hh}:${mm}`);
    }
    return out;
  }, []);

  const quickDateStr = useMemo(() => formatLocalDate(currentDate), [currentDate]);

  const quickAppointments = useMemo(() => {
    const filtered = appointments
      .filter((a) => a.date === quickDateStr)
      .filter((a) => a.status !== 'cancelled' && a.status !== 'no-show')
      .filter((a) => typeof a.id === 'string' && !a.id.startsWith('app_onduty_'));
    filtered.sort((a, b) => (a.time || '').localeCompare(b.time || ''));
    return filtered;
  }, [appointments, quickDateStr]);

  const changeQuickDay = (offsetDays: number) => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + offsetDays);
    setCurrentDate(d);
  };

  const isAppointmentInSlot = (app: Appointment, slot: string): boolean => {
    const [appH, appM] = (app.time || '00:00').split(':').map(Number);
    const [slotH, slotM] = slot.split(':').map(Number);
    const appStart = appH * 60 + appM;
    const slotStart = slotH * 60 + slotM;
    return appStart >= slotStart && appStart < slotStart + 30;
  };

  const getIconForType = (type: string) => {
    if (type === 'service') return BarChart3;
    if (type === 'product') return ShoppingCart;
    if (type === 'package') return Package;
    return Tag;
  };

  // Preserve callback prop for parent parity (reminders live on Schedule; Dashboard keeps the contract).
  void onMarkReminderSent;

  const todayStr = formatLocalDate(new Date());
  const todayApps = appointments
    .filter(
      (a) =>
        a.date === todayStr &&
        a.status !== 'cancelled' &&
        a.status !== 'no-show' &&
        typeof a.id === 'string' &&
        !a.id.startsWith('app_onduty_'),
    )
    .sort((a, b) => (a.time || '').localeCompare(b.time || ''))
    .slice(0, 5);

  const outstandingCat = dashboardData.categorySummary.find((c) => c.label === 'Outstanding');
  const outstandingValue = outstandingCat?.value ?? 0;

  const attentionItems: AttentionItem[] = [];
  if (outstandingValue > 0) {
    attentionItems.push({
      id: 'outstanding',
      title: `Outstanding ${formatRM(outstandingValue)}`,
      description: 'Partial or unpaid balances this month.',
      actionLabel: 'Sales',
      onAction: () => navigate('/sales-reports'),
      tone: 'warning',
    });
  }
  if (dashboardData.stats.profit < 0) {
    attentionItems.push({
      id: 'profit',
      title: `Net profit ${formatRM(dashboardData.stats.profit)}`,
      description: 'Expenses exceed revenue this month.',
      actionLabel: 'Finance',
      onAction: () => navigate('/finance'),
      tone: 'warning',
    });
  }
  if (todayApps.length === 0) {
    attentionItems.push({
      id: 'no-appts',
      title: 'No appointments today',
      description: 'Schedule is clear for today.',
      actionLabel: 'Book',
      onAction: () => navigate('/schedule'),
      tone: 'info',
    });
  }

  const dateLabel = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const maxDay = Math.max(...dashboardData.chartData.map((d) => d.sales), 0);
  const todayIdx = (new Date().getDay() + 6) % 7;
  const weekEmpty = dashboardData.totalSalesThisWeek <= 0;

  return (
    <div className="space-y-6 lg:space-y-8 animate-fadeIn">
      {/* 1. Today */}
      <TodayHeader dateLabel={dateLabel} />

      {/* 1b. Today summary — hero revenue, secondary metrics compact */}
      <TodaySummary
        heroLabel="This Month Revenue"
        heroValue={formatRM(dashboardData.stats.revenue)}
        heroHint={`${dashboardData.monthSales.length} transaction${dashboardData.monthSales.length !== 1 ? 's' : ''} this month`}
        metrics={[
          {
            id: 'expenses',
            label: 'Expenses',
            value: formatRM(dashboardData.stats.expenses),
            toneClass: 'text-rose-600',
          },
          {
            id: 'profit',
            label: 'Net Profit',
            value: formatRM(dashboardData.stats.profit),
            toneClass: 'text-amber-600',
            emphasize: true,
          },
          {
            id: 'clients',
            label: 'Clients',
            value: dashboardData.stats.clientCount.toString(),
            toneClass: 'text-[var(--text-primary)]',
          },
          {
            id: 'revenue-desktop',
            label: 'Revenue',
            value: formatRM(dashboardData.stats.revenue),
            toneClass: 'text-emerald-600',
          },
        ]}
      />

      {/* 2. Needs attention */}
      <AttentionList items={attentionItems} />

      {/* 3. Next appointments */}
      <UpcomingAppointments
        rows={todayApps.map((app) => {
          const clientName = clients.find((c) => c.id === app.clientId)?.name || 'Guest';
          const serviceName = services.find((s) => s.id === app.serviceId)?.name || '—';
          return {
            id: app.id,
            timeLabel: formatCompactTime(app.time),
            title: serviceName,
            subtitle: clientName,
            statusLabel: app.status || 'pending',
            statusClassName:
              app.status === 'completed'
                ? 'bg-emerald-100 text-emerald-700'
                : app.status === 'scheduled'
                  ? 'bg-blue-50 text-blue-600'
                  : 'bg-[var(--bg-soft)] text-[var(--text-muted)]',
          };
        })}
        onAddBooking={() => navigate('/schedule')}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        <div className="lg:col-span-2 space-y-6 lg:space-y-8">
          {/* 4. Sales snapshot */}
          <SalesSnapshot
            categories={dashboardData.categorySummary.map((cat) => {
              const Icon = cat.icon;
              return {
                id: cat.label,
                label: cat.label,
                valueLabel: cat.value.toLocaleString(undefined, { minimumFractionDigits: 2 }),
                icon: <Icon className={`w-4 h-4 ${cat.color}`} />,
              };
            })}
            recentRows={recentSales.map((txn) => ({
              id: txn.id,
              title: txn.description,
              meta: new Date(txn.date).toLocaleDateString(),
              amountLabel: `$${txn.amount.toFixed(2)}`,
            }))}
          />

          {/* 6. Staff / operational status */}
          <OperationalStatus
            title="Operational status"
            actions={[
              { id: 'pos', label: 'New Sale', icon: '💳', onClick: () => navigate('/pos') },
              { id: 'booking', label: 'Booking', icon: '📅', onClick: () => navigate('/schedule') },
              { id: 'member', label: 'Member', icon: '👤', onClick: () => navigate('/member') },
              { id: 'expense', label: 'Expense', icon: '📊', onClick: () => navigate('/finance') },
            ]}
            calendarHeader={
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold tracking-tight flex items-center gap-2 text-[var(--text-primary)]">
                  <Calendar className="w-5 h-5 text-[var(--brand)]" />
                  Quick Calendar
                </h3>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-[var(--text-secondary)]">
                    {new Date(`${quickDateStr}T00:00:00`).toLocaleDateString(undefined, {
                      weekday: 'short',
                      year: 'numeric',
                      month: 'short',
                      day: '2-digit',
                    })}
                  </span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => changeQuickDay(-1)}
                      className="p-2 hover:bg-[var(--bg-soft)] rounded-ui-sm text-[var(--text-muted)]"
                      aria-label="Previous day"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => changeQuickDay(1)}
                      className="p-2 hover:bg-[var(--bg-soft)] rounded-ui-sm text-[var(--text-muted)]"
                      aria-label="Next day"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            }
          >
            <div className="border border-[var(--line)] rounded-ui-md overflow-hidden">
              <div className="max-h-[420px] overflow-y-auto">
                {quickSlots.map((slot) => {
                  const appsInSlot = quickAppointments.filter((a) => isAppointmentInSlot(a, slot));
                  return (
                    <div key={slot} className="flex border-b border-[var(--line)]">
                      <div className="w-20 shrink-0 p-3 text-center text-[10px] font-black text-[var(--text-muted)] bg-[var(--bg-surface)] border-r border-[var(--line)]">
                        {formatCompactTime(slot)}
                      </div>
                      <div className="flex-1 p-2 min-h-[44px] bg-[var(--bg-surface)]">
                        {appsInSlot.length === 0 ? (
                          <div className="h-full" />
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {appsInSlot.map((app) => {
                              const clientName = clients.find((c) => c.id === app.clientId)?.name || 'Guest';
                              const serviceName = services.find((s) => s.id === app.serviceId)?.name || '—';
                              return (
                                <div
                                  key={app.id}
                                  className="px-2 py-1 rounded-ui-sm bg-[var(--brand-soft)] border border-[var(--brand)]/20 text-[10px] text-[var(--brand-deep)] font-bold truncate max-w-[260px]"
                                  title={`${formatCompactTime(app.time)} ${clientName} · ${serviceName}`}
                                >
                                  {formatCompactTime(app.time)} {clientName.split(' ')[0]} · {serviceName}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </OperationalStatus>

          {/* 7. Secondary charts and trends */}
          <DashboardChartSection
            totalLabel={formatRM(dashboardData.totalSalesThisWeek)}
            txnCountLabel={`${dashboardData.weekTxnCount} txn${dashboardData.weekTxnCount !== 1 ? 's' : ''}`}
            empty={weekEmpty}
            bars={dashboardData.chartData.map((d, i) => {
              const pct = maxDay > 0 ? (d.sales / maxDay) * 100 : 0;
              const barH = d.sales > 0 ? Math.max(pct, 6) : 0;
              return {
                day: d.day,
                sales: d.sales,
                heightPct: barH,
                isToday: i === todayIdx,
                title: `${d.day}: ${formatRM(d.sales)}`,
              };
            })}
            statsStrip={
              !weekEmpty ? (
                <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-[var(--line)]">
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                      Transactions
                    </p>
                    <p className="text-sm font-bold text-[var(--text-primary)] tabular-nums">
                      {dashboardData.weekTxnCount}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                      Avg sale
                    </p>
                    <p className="text-sm font-bold text-[var(--text-primary)] tabular-nums truncate">
                      {formatRM(dashboardData.weekAvgSale)}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                      Top item
                    </p>
                    <p
                      className="text-sm font-bold text-[var(--text-primary)] truncate"
                      title={dashboardData.weekTopItem ?? undefined}
                    >
                      {dashboardData.weekTopItem ?? '—'}
                    </p>
                  </div>
                </div>
              ) : null
            }
          />

          <div className="bg-[var(--bg-surface)] p-6 rounded-ui-lg border border-[var(--line)] shadow-ui-xs">
            <h3 className="text-xl font-bold tracking-tight text-[var(--text-primary)] mb-4">Top Selling</h3>
            <div className="flex gap-1 p-1 bg-[var(--bg-soft)] rounded-ui-md mb-4">
              {(['service', 'product', 'package', 'discount'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setTopSellingTab(tab)}
                  className={`flex-1 py-2 rounded-ui-sm text-sm font-medium capitalize transition-colors ${
                    topSellingTab === tab
                      ? 'bg-[var(--brand)] text-white shadow-ui-xs'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-selection)]'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--line)]">
                    <th className="text-left py-3 px-2 text-xs font-bold uppercase text-[var(--brand)]">SKU</th>
                    <th className="text-right py-3 px-2 text-xs font-bold uppercase text-[var(--brand)]">
                      Quantity
                    </th>
                    <th className="text-right py-3 px-2 text-xs font-bold uppercase text-[var(--brand)]">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {topSellingByType.map((row, idx) => {
                    const Icon = getIconForType(row.type);
                    return (
                      <tr
                        key={`${row.type}-${row.name}-${idx}`}
                        className="border-b border-[var(--line)] hover:bg-[var(--bg-soft)]"
                      >
                        <td className="py-3 px-2 flex items-center gap-2">
                          <div className="w-8 h-8 rounded-ui-sm bg-[var(--bg-soft)] flex items-center justify-center">
                            <Icon className="w-4 h-4 text-[var(--text-secondary)]" />
                          </div>
                          <span className="text-sm font-medium text-[var(--text-primary)] truncate max-w-[180px]">
                            {row.name}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-right text-sm text-[var(--text-secondary)] tabular-nums">
                          {row.quantity}
                        </td>
                        <td className="py-3 px-2 text-right text-sm font-bold text-[var(--brand)] tabular-nums">
                          {row.amount.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {topSellingByType.length === 0 && (
                <DashboardEmptyState title="No data for this category." compact />
              )}
            </div>
          </div>
        </div>

        {/* 5. Customer activity + payment */}
        <div className="space-y-6 lg:space-y-8">
          <CustomerActivity
            totalCount={dashboardData.visitorTotalCount}
            rows={dashboardData.visitors.map((v) => ({
              id: v.clientId,
              name: v.name,
              tier: v.tier,
              spentLabel: v.spent.toFixed(2),
            }))}
          />

          <div className="bg-[var(--bg-surface)] p-6 rounded-ui-lg border border-[var(--line)] shadow-ui-xs">
            <h3 className="text-xl font-bold tracking-tight text-[var(--text-primary)] mb-4">Payment</h3>
            <div className="space-y-2">
              {dashboardData.paymentBreakdown.map((p) => (
                <div
                  key={p.method}
                  className="flex items-center justify-between py-2 px-3 rounded-ui-sm bg-[var(--bg-soft)] border border-[var(--line)]"
                >
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                    <span className="text-sm font-medium text-[var(--text-secondary)]">{p.method}</span>
                  </div>
                  <span className="text-sm font-bold text-[var(--text-primary)] tabular-nums">
                    {p.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              ))}
              {dashboardData.paymentBreakdown.length === 0 && (
                <DashboardEmptyState title="No payments this month." compact />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
