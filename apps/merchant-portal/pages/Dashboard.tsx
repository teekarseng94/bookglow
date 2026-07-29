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
  Download,
  Plus,
} from 'lucide-react';
import { Transaction, TransactionType, Client, Appointment, Service, Product, OutletSettings } from '../types';
import { useUserContext } from '../contexts/UserContext';
import { Button } from '../components/ui';
import {
  AttentionList,
  BookingLinkCard,
  CustomerActivity,
  DashboardChartSection,
  DashboardEmptyState,
  DashboardKpiCards,
  OperationalStatus,
  SalesSnapshot,
  TodayHeader,
  UpcomingAppointments,
} from '../components/dashboard';
import type { AttentionItem } from '../components/dashboard';

interface DashboardProps {
  transactions: Transaction[];
  clients: Client[];
  appointments: Appointment[];
  services: Service[];
  products?: Product[];
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
  products = [],
  outletSettings,
  outletID = '',
  onMarkReminderSent,
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [topSellingTab, setTopSellingTab] = useState<TopSellingTab>('service');
  const [salesPeriod, setSalesPeriod] = useState<'today' | 'week' | 'month'>('week');
  const navigate = useNavigate();
  const { user, userData } = useUserContext();

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    const prefix = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
    const firstName = (user?.displayName || userData?.displayName || '').trim().split(' ')[0];
    return firstName ? `${prefix}, ${firstName}` : prefix;
  }, [user?.displayName, userData?.displayName]);

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
    const monthExpenseTxns = transactions.filter((t) => {
      if (t.type !== TransactionType.EXPENSE) return false;
      if (outletID && t.outletID !== outletID) return false;
      const status = (t as Transaction & { status?: string }).status;
      const statusStr = (status ?? '').toString().toLowerCase();
      if (statusStr === 'voided' || statusStr === 'void') return false;
      const d = (t.date || '').slice(0, 10);
      return d >= currentMonthStart && d <= currentMonthEnd;
    });
    const monthExpenses = monthExpenseTxns.reduce((sum, t) => sum + t.amount, 0);
    const stats = {
      revenue,
      expenses: monthExpenses,
      expenseTxnCount: monthExpenseTxns.length,
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
      outstandingTotal = 0,
      outstandingCount = 0;
    monthSales.forEach((t) => {
      if (t.paymentStatus === 'partial' || (t.outstanding ?? 0) > 0) {
        outstandingTotal += t.outstanding ?? t.amount;
        outstandingCount += 1;
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
      { label: 'Service', value: serviceTotal, icon: TrendingUp, color: 'text-[var(--brand)]' },
      { label: 'Product', value: productTotal, icon: ShoppingCart, color: 'text-[var(--brand)]' },
      { label: 'Package', value: packageTotal, icon: Package, color: 'text-[var(--brand)]' },
      { label: 'Discount', value: discountTotal, icon: Tag, color: 'text-[var(--brand)]' },
      { label: 'Outstanding', value: outstandingTotal, icon: CreditCard, color: 'text-[var(--brand)]' },
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
      outstandingCount,
    };
  }, [transactions, clients, outletID]);

  // Sales Snapshot period totals — additive; reuses the exact same "real sale" predicate as
  // dashboardData's salesOnly filter above, just applied over Today/This week/This month ranges
  // plus each range's immediately-prior period, so the trend line is always a genuine comparison.
  const periodSalesData = useMemo(() => {
    const isRevenueSale = (t: Transaction) => {
      if (t.type !== TransactionType.SALE) return false;
      if (t.category === 'Voucher' || t.category === 'Redemption') return false;
      const status = (t.status || '').toLowerCase();
      if (status === 'voided' || status === 'void') return false;
      if (outletID && t.outletID !== outletID) return false;
      return true;
    };
    const sumInRange = (startIso: string, endIso: string) =>
      transactions
        .filter((t) => isRevenueSale(t) && (t.date || '').slice(0, 10) >= startIso && (t.date || '').slice(0, 10) <= endIso)
        .reduce((sum, t) => sum + t.amount, 0);
    const pctChange = (curr: number, prev: number): number | null => (prev > 0 ? ((curr - prev) / prev) * 100 : null);

    const now = new Date();
    const todayIso = formatLocalDate(now);
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const yesterdayIso = formatLocalDate(yesterday);

    const dow = now.getDay();
    const monOffset = dow === 0 ? -6 : 1 - dow;
    const weekMon = new Date(now);
    weekMon.setDate(now.getDate() + monOffset);
    const weekSun = new Date(weekMon);
    weekSun.setDate(weekMon.getDate() + 6);
    const lastWeekMon = new Date(weekMon);
    lastWeekMon.setDate(weekMon.getDate() - 7);
    const lastWeekSun = new Date(weekMon);
    lastWeekSun.setDate(weekMon.getDate() - 1);

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const chartByDay = (startIso: string, endIso: string): { label: string; value: number }[] => {
      const start = new Date(`${startIso}T00:00:00`);
      const end = new Date(`${endIso}T00:00:00`);
      const days: { label: string; value: number }[] = [];
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const iso = formatLocalDate(d);
        days.push({ label: DAY_LABELS[(d.getDay() + 6) % 7], value: sumInRange(iso, iso) });
      }
      return days;
    };

    return {
      today: { total: sumInRange(todayIso, todayIso), trendPct: pctChange(sumInRange(todayIso, todayIso), sumInRange(yesterdayIso, yesterdayIso)), chart: chartByDay(yesterdayIso, todayIso) },
      week: {
        total: sumInRange(formatLocalDate(weekMon), formatLocalDate(weekSun)),
        trendPct: pctChange(
          sumInRange(formatLocalDate(weekMon), formatLocalDate(weekSun)),
          sumInRange(formatLocalDate(lastWeekMon), formatLocalDate(lastWeekSun)),
        ),
        chart: chartByDay(formatLocalDate(weekMon), formatLocalDate(weekSun)),
      },
      month: {
        total: sumInRange(formatLocalDate(monthStart), formatLocalDate(monthEnd)),
        trendPct: pctChange(
          sumInRange(formatLocalDate(monthStart), formatLocalDate(monthEnd)),
          sumInRange(formatLocalDate(lastMonthStart), formatLocalDate(lastMonthEnd)),
        ),
        chart: chartByDay(formatLocalDate(monthStart), formatLocalDate(monthEnd)),
      },
    };
  }, [transactions, outletID]);

  // Top Selling per tab: filter by type, sort by quantity, top 5
  const topSellingByType = useMemo(() => {
    return dashboardData.topSellingAll
      .filter((x) => x.type === topSellingTab)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);
  }, [dashboardData.topSellingAll, topSellingTab]);


  // Customer activity metrics — additive derived data, does not touch dashboardData above.
  const clientActivity = useMemo(() => {
    const now = new Date();
    const todayIso = formatLocalDate(now);
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const yesterdayIso = formatLocalDate(yesterday);
    const monthStartIso = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const monthEndIso = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);

    const newClientsToday = clients.filter((c) => (c.createdAt || '').slice(0, 10) === todayIso).length;
    const newClientsYesterday = clients.filter((c) => (c.createdAt || '').slice(0, 10) === yesterdayIso).length;

    // Returning this month = paid this month (already computed in dashboardData.monthSales) AND the
    // account existed before this month started — i.e. not a brand-new signup.
    const payingClientIdsThisMonth = new Set(
      dashboardData.monthSales.map((t) => t.clientId).filter((id): id is string => !!id && id !== 'guest'),
    );
    let returningClientsThisMonth = 0;
    payingClientIdsThisMonth.forEach((id) => {
      const client = clients.find((c) => c.id === id);
      if (client && (client.createdAt || '').slice(0, 10) < monthStartIso) returningClientsThisMonth += 1;
    });

    const bookingsThisMonth = appointments.filter((a) => {
      if (a.status === 'cancelled') return false;
      if (typeof a.id === 'string' && a.id.startsWith('app_onduty_')) return false;
      return a.date >= monthStartIso && a.date <= monthEndIso;
    }).length;

    return { newClientsToday, newClientsYesterday, returningClientsThisMonth, bookingsThisMonth };
  }, [clients, appointments, dashboardData.monthSales]);

  // Needs Attention inputs that require data Dashboard didn't previously receive (products) — additive only.
  const stockAlerts = useMemo(() => {
    const lowStockCount = products.filter((p) => p.stock > 0 && p.stock <= 5).length;
    const outOfStockCount = products.filter((p) => p.stock <= 0).length;
    return { lowStockCount, outOfStockCount };
  }, [products]);

  const pendingConfirmationCount = useMemo(() => {
    const todayIso = formatLocalDate(new Date());
    return appointments.filter(
      (a) =>
        a.date === todayIso &&
        a.status === 'scheduled' &&
        typeof a.id === 'string' &&
        !a.id.startsWith('app_onduty_'),
    ).length;
  }, [appointments]);

  const profileIncomplete =
    !(outletSettings.shopName || '').trim() ||
    !(outletSettings.receiptPhone || '').trim() ||
    !(outletSettings.receiptAddress || '').trim();

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

  // Priority order: overdue money first, then stock, then confirmations, then setup/profit/schedule
  // nudges. Capped to 4 below so the most actionable items always win a slot.
  const attentionItems: AttentionItem[] = [];
  if (outstandingValue > 0) {
    attentionItems.push({
      id: 'outstanding',
      title: `${dashboardData.outstandingCount} payment${dashboardData.outstandingCount === 1 ? '' : 's'} overdue`,
      description: `Total amount ${formatRM(outstandingValue)}`,
      actionLabel: 'View',
      onAction: () => navigate('/sales-reports'),
      tone: 'danger',
      icon: <CreditCard className="w-4 h-4" />,
    });
  }
  if (stockAlerts.outOfStockCount > 0) {
    attentionItems.push({
      id: 'out-of-stock',
      title: `${stockAlerts.outOfStockCount} item${stockAlerts.outOfStockCount === 1 ? '' : 's'} out of stock`,
      description: 'Unavailable to sell right now.',
      actionLabel: 'View',
      onAction: () => navigate('/menu'),
      tone: 'danger',
      icon: <Package className="w-4 h-4" />,
    });
  } else if (stockAlerts.lowStockCount > 0) {
    attentionItems.push({
      id: 'low-stock',
      title: 'Low stock alert',
      description: `${stockAlerts.lowStockCount} item${stockAlerts.lowStockCount === 1 ? '' : 's'} running low`,
      actionLabel: 'View',
      onAction: () => navigate('/menu'),
      tone: 'warning',
      icon: <Package className="w-4 h-4" />,
    });
  }
  if (pendingConfirmationCount > 0) {
    attentionItems.push({
      id: 'pending-confirmation',
      title: `${pendingConfirmationCount} appointment${pendingConfirmationCount === 1 ? '' : 's'} require confirmation`,
      description: 'For today',
      actionLabel: 'Review',
      onAction: () => navigate('/schedule'),
      tone: 'info',
      icon: <Calendar className="w-4 h-4" />,
    });
  }
  if (profileIncomplete) {
    attentionItems.push({
      id: 'profile-incomplete',
      title: 'Complete your business profile',
      description: 'Get discovered by more clients.',
      actionLabel: 'Complete',
      onAction: () => navigate('/settings'),
      tone: 'purple',
      icon: <Star className="w-4 h-4" />,
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
  const visibleAttentionItems = attentionItems.slice(0, 4);

  const dateLabel = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const compactDateLabel = new Date().toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  const maxDay = Math.max(...dashboardData.chartData.map((d) => d.sales), 0);
  const todayIdx = (new Date().getDay() + 6) % 7;
  const weekEmpty = dashboardData.totalSalesThisWeek <= 0;

  const activePeriod = periodSalesData[salesPeriod];
  const periodTrendLabel =
    activePeriod.trendPct == null
      ? undefined
      : `${activePeriod.trendPct >= 0 ? '↑' : '↓'} ${Math.abs(activePeriod.trendPct).toFixed(1)}% vs last ${salesPeriod === 'today' ? 'day' : salesPeriod === 'week' ? 'week' : 'month'}`;
  const marginPct = dashboardData.stats.revenue > 0 ? (dashboardData.stats.profit / dashboardData.stats.revenue) * 100 : null;

  return (
    <div className="dashboard-today space-y-5 animate-fadeIn pb-6">
      {/* 1. Greeting + top actions */}
      <TodayHeader
        title={<>{greeting} <span aria-hidden>👋</span></>}
        dateLabel="Here's what's happening with your business today."
        titleClassName="text-app-page sm:text-app-page-lg"
        actions={
          <>
            <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-ui-sm bg-[var(--bg-surface)] border border-[var(--line)] text-sm font-semibold text-[var(--text-secondary)]">
              <Calendar className="w-4 h-4" />
              <span className="sm:hidden">{compactDateLabel}</span>
              <span className="hidden sm:inline">{dateLabel}</span>
            </span>
            <Button type="button" className="hidden lg:inline-flex" variant="secondary" size="sm" onClick={() => navigate('/sales-reports')}>
              <Download className="w-4 h-4" /> Export
            </Button>
            <Button type="button" variant="primary" size="sm" onClick={() => navigate('/schedule')}>
              <Plus className="w-4 h-4" /> New Booking
            </Button>
          </>
        }
      />

      <OperationalStatus
        className="lg:hidden"
        title="Quick actions"
        actions={[
          { id: 'pos', label: 'New Sale', icon: '💳', onClick: () => navigate('/pos') },
          { id: 'booking', label: 'Booking', icon: '📅', onClick: () => navigate('/schedule') },
          { id: 'member', label: 'Member', icon: '👤', onClick: () => navigate('/member') },
          { id: 'expense', label: 'Expense', icon: '📊', onClick: () => navigate('/finance') },
        ]}
      />

      {/* 2. Four KPI cards — replaces the old full-width revenue banner */}
      <DashboardKpiCards
        cards={[
          {
            id: 'revenue',
            label: 'Revenue',
            value: formatRM(dashboardData.stats.revenue),
            secondary: `${dashboardData.monthSales.length} transaction${dashboardData.monthSales.length !== 1 ? 's' : ''} this month`,
            valueToneClass: 'text-[var(--brand)]',
            sparkline: dashboardData.chartData.map((d) => d.sales),
          },
          {
            id: 'profit',
            label: 'Net Profit',
            value: formatRM(dashboardData.stats.profit),
            secondary: marginPct != null ? `${marginPct.toFixed(1)}% margin` : 'This month',
            valueToneClass: dashboardData.stats.profit >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]',
          },
          {
            id: 'clients',
            label: 'Clients',
            value: dashboardData.stats.clientCount.toString(),
            secondary:
              clientActivity.newClientsToday > 0
                ? `+${clientActivity.newClientsToday} new today`
                : `${dashboardData.stats.clientCount} on file`,
            valueToneClass: 'text-[var(--text-primary)]',
          },
          {
            id: 'expenses',
            label: 'Expenses',
            value: formatRM(dashboardData.stats.expenses),
            secondary: `${dashboardData.stats.expenseTxnCount} transaction${dashboardData.stats.expenseTxnCount !== 1 ? 's' : ''} this month`,
            valueToneClass: 'text-[var(--danger)]',
          },
        ]}
      />

      {/* 3. Main row: Today's Appointments | Needs Attention | Sales Snapshot */}
      <div className="dashboard-primary grid grid-cols-1 lg:grid-cols-[1.5fr_1.1fr_1fr] gap-5 lg:gap-8 items-start">
        <UpcomingAppointments
          rows={todayApps.map((app) => {
            const clientName = clients.find((c) => c.id === app.clientId)?.name || 'Guest';
            const serviceName = services.find((s) => s.id === app.serviceId)?.name || '—';
            return {
              id: app.id,
              timeLabel: formatCompactTime(app.time),
              timeRangeLabel: app.endTime ? `${formatCompactTime(app.time)} – ${formatCompactTime(app.endTime)}` : undefined,
              title: serviceName,
              metaLabel: `${services.find((s) => s.id === app.serviceId)?.duration ?? '—'} mins · ${outletSettings.shopName || 'Outlet'}`,
              customerName: clientName,
              statusLabel: app.status || 'pending',
              statusClassName:
                app.status === 'completed'
                  ? 'bg-[var(--success-soft)] text-[var(--success)]'
                  : app.status === 'scheduled'
                    ? 'bg-[var(--brand-soft)] text-[var(--brand)]'
                    : 'bg-[var(--bg-soft)] text-[var(--text-muted)]',
            };
          })}
          onAddBooking={() => navigate('/schedule')}
          onViewSchedule={() => navigate('/schedule')}
          onRowAction={() => navigate('/schedule')}
        />

        <AttentionList items={visibleAttentionItems} />

        <SalesSnapshot
          periodOptions={[
            { id: 'today', label: 'Today' },
            { id: 'week', label: 'This week' },
            { id: 'month', label: 'This month' },
          ]}
          selectedPeriod={salesPeriod}
          onPeriodChange={(id) => setSalesPeriod(id as 'today' | 'week' | 'month')}
          totalLabel={formatRM(activePeriod.total)}
          trendLabel={periodTrendLabel}
          trendPositive={(activePeriod.trendPct ?? 0) >= 0}
          chartData={activePeriod.chart}
          onViewHistory={() => navigate('/transactions')}
          categories={dashboardData.categorySummary
            .filter((cat) => cat.label === 'Service' || cat.label === 'Product' || cat.label === 'Package')
            .map((cat) => {
              const Icon = cat.icon;
              return {
                id: cat.label,
                label: cat.label === 'Product' ? 'Products' : `${cat.label}s`,
                valueLabel: formatRM(cat.value),
                icon: <Icon className={`w-4 h-4 ${cat.color}`} />,
              };
            })}
        />
      </div>

      {/* 4. Bottom row: Customer Activity | Booking link promo */}
      <div className="dashboard-secondary grid grid-cols-1 lg:grid-cols-[1.85fr_1fr] gap-5 lg:gap-8 items-start">
        <CustomerActivity
          className="hidden lg:block"
          metrics={[
            {
              id: 'new-clients',
              label: 'New Clients',
              value: clientActivity.newClientsToday.toString(),
              trendLabel:
                clientActivity.newClientsToday !== clientActivity.newClientsYesterday
                  ? `${clientActivity.newClientsToday >= clientActivity.newClientsYesterday ? '↑' : '↓'} ${Math.abs(clientActivity.newClientsToday - clientActivity.newClientsYesterday)} vs yesterday`
                  : undefined,
              trendPositive: clientActivity.newClientsToday >= clientActivity.newClientsYesterday,
            },
            { id: 'returning-clients', label: 'Returning Clients', value: clientActivity.returningClientsThisMonth.toString() },
            { id: 'total-clients', label: 'Total Clients', value: dashboardData.stats.clientCount.toString() },
            { id: 'bookings', label: 'No. of Bookings', value: clientActivity.bookingsThisMonth.toString() },
          ]}
        />
        <BookingLinkCard outletId={outletID} />
      </div>

      <div className="dashboard-detail grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        <div className="lg:col-span-2 space-y-6 lg:space-y-8">
          {/* 6. Staff / operational status */}
          <OperationalStatus
            className="hidden lg:block"
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
                      <div className="w-20 shrink-0 p-3 text-center m-dash-metric-label bg-[var(--bg-surface)] border-r border-[var(--line)]">
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
                                  className="px-2 py-1 rounded-ui-sm bg-[var(--brand-soft)] border border-[var(--brand)]/20 m-caption text-[var(--brand-deep)] font-semibold truncate max-w-[260px]"
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
            className="hidden lg:block"
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
                    <p className="m-dash-metric-label">
                      Transactions
                    </p>
                    <p className="text-sm font-bold text-[var(--text-primary)] tabular-nums">
                      {dashboardData.weekTxnCount}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="m-dash-metric-label">
                      Avg sale
                    </p>
                    <p className="text-sm font-bold text-[var(--text-primary)] tabular-nums truncate">
                      {formatRM(dashboardData.weekAvgSale)}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="m-dash-metric-label">
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

          <div className="hidden lg:block bg-[var(--bg-surface)] p-6 rounded-ui-lg border border-[var(--line)] shadow-ui-xs">
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

        {/* 5. Top customers (by spend this month) + payment */}
        <div className="hidden lg:block space-y-6 lg:space-y-8">
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Top Customers</h3>
              <span className="text-sm font-bold text-[var(--brand)] tabular-nums">{dashboardData.visitorTotalCount}</span>
            </div>
            <div className="bg-[var(--bg-surface)] rounded-ui-md border border-[var(--line)] shadow-ui-xs p-4">
              {dashboardData.visitors.length === 0 ? (
                <DashboardEmptyState title="No visitors this month." compact />
              ) : (
                <div className="space-y-2">
                  {dashboardData.visitors.map((v) => (
                    <div
                      key={v.clientId}
                      className="flex items-center justify-between py-2 px-3 rounded-ui-sm bg-[var(--bg-soft)] border border-[var(--line)]"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-[var(--brand-soft)] text-[var(--brand-deep)] flex items-center justify-center text-xs font-bold shrink-0">
                          {v.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-[var(--text-primary)] truncate">{v.name}</p>
                          <p className="m-caption text-[var(--text-muted)]">{v.tier}</p>
                        </div>
                      </div>
                      <span className="text-sm font-bold text-[var(--brand)] tabular-nums shrink-0 ml-2">
                        {v.spent.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          <div className="bg-[var(--bg-surface)] p-6 rounded-ui-lg border border-[var(--line)] shadow-ui-xs">
            <h3 className="text-xl font-bold tracking-tight text-[var(--text-primary)] mb-4">Payment</h3>
            <div className="space-y-2">
              {dashboardData.paymentBreakdown.map((p) => (
                <div
                  key={p.method}
                  className="flex items-center justify-between py-2 px-3 rounded-ui-sm bg-[var(--bg-soft)] border border-[var(--line)]"
                >
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-[var(--warning)] fill-[var(--warning)]" />
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
