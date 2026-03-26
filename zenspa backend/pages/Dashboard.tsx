/**
 * Dashboard – Analytics layout (TunaiPro-style).
 * Real-time aggregation from transactions (onSnapshot in parent). Filters: current month, outletID, exclude void.
 * Single dashboardData useMemo so POS completions update the dashboard instantly.
 */

import React, { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
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
    const chartData = DAY_LABELS.map((label, i) => {
      const d = new Date(weekMon);
      d.setDate(weekMon.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      const daySales = salesOnly
        .filter((t) => (t.date || '').startsWith(dateStr) && t.category !== 'Voucher' && t.category !== 'Redemption')
        .reduce((sum, t) => sum + t.amount, 0);
      return { day: label, sales: Math.round(daySales * 100) / 100 };
    });
    const totalSalesThisWeek = chartData.reduce((sum, row) => sum + row.sales, 0);

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

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* 1. Top metric boxes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Revenue"
          value={`$${dashboardData.stats.revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
          color="text-emerald-600"
        />
        <StatCard
          title="Total Expenses"
          value={`$${dashboardData.stats.expenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
          color="text-rose-600"
        />
        <StatCard
          title="Net Profit"
          value={`$${dashboardData.stats.profit.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
          color="text-amber-600"
        />
        <StatCard
          title="Active Clients"
          value={dashboardData.stats.clientCount.toString()}
          color="text-slate-700"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Total Sales chart + Category Summary, then Top Selling, then Calendar */}
        <div className="lg:col-span-2 space-y-8">
          {/* Total Sales bar chart + Category Summary row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  <span className="text-[10px] font-bold uppercase text-slate-500">This Week</span>
                </div>
                <span className="text-xl font-bold text-blue-600">
                  {dashboardData.totalSalesThisWeek.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-slate-800 mb-4">Total Sales</h3>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dashboardData.chartData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="day"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#64748b', fontSize: 12 }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#64748b', fontSize: 12 }}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 12,
                        border: 'none',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                      }}
                      formatter={(value: number) => [value.toFixed(2), 'Sales']}
                    />
                    <Bar
                      dataKey="sales"
                      fill="#7dd3fc"
                      radius={[4, 4, 0, 0]}
                      name="Sales"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Category Summary */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-800 mb-4">Category Summary</h3>
              <div className="space-y-3">
                {dashboardData.categorySummary.map((cat) => {
                  const Icon = cat.icon;
                  return (
                    <div
                      key={cat.label}
                      className="flex items-center justify-between py-2 px-3 rounded-xl bg-slate-50 border border-slate-100"
                    >
                      <div className="flex items-center gap-2">
                        <Icon className={`w-4 h-4 ${cat.color}`} />
                        <span className="text-sm font-medium text-slate-700">{cat.label}</span>
                      </div>
                      <span className={`text-sm font-bold ${cat.color}`}>
                        {cat.value.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Top Selling table */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Top Selling</h3>
            <div className="flex gap-1 p-1 bg-slate-100 rounded-xl mb-4">
              {(['service', 'product', 'package', 'discount'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setTopSellingTab(tab)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                    topSellingTab === tab
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-2 text-xs font-bold uppercase text-blue-600">
                      SKU
                    </th>
                    <th className="text-right py-3 px-2 text-xs font-bold uppercase text-blue-600">
                      Quantity
                    </th>
                    <th className="text-right py-3 px-2 text-xs font-bold uppercase text-blue-600">
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
                        className="border-b border-slate-100 hover:bg-slate-50"
                      >
                        <td className="py-3 px-2 flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                            <Icon className="w-4 h-4 text-slate-600" />
                          </div>
                          <span className="text-sm font-medium text-slate-800 truncate max-w-[180px]">
                            {row.name}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-right text-sm text-slate-600">{row.quantity}</td>
                        <td className="py-3 px-2 text-right text-sm font-bold text-blue-600">
                          {row.amount.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {topSellingByType.length === 0 && (
                <div className="py-8 text-center text-slate-400 text-sm">No data for this category.</div>
              )}
            </div>
          </div>

          {/* Quick Calendar */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2 text-slate-800">
                <Calendar className="w-5 h-5 text-blue-600" />
                Quick Calendar
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-700">
                  {new Date(`${quickDateStr}T00:00:00`).toLocaleDateString(undefined, {
                    weekday: 'short',
                    year: 'numeric',
                    month: 'short',
                    day: '2-digit',
                  })}
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => changeQuickDay(-1)}
                    className="p-2 hover:bg-slate-100 rounded-lg text-slate-500"
                    aria-label="Previous day"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <button
                    onClick={() => changeQuickDay(1)}
                    className="p-2 hover:bg-slate-100 rounded-lg text-slate-500"
                    aria-label="Next day"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            <div className="border border-slate-100 rounded-xl overflow-hidden">
              <div className="max-h-[420px] overflow-y-auto">
                {quickSlots.map((slot) => {
                  const appsInSlot = quickAppointments.filter((a) => isAppointmentInSlot(a, slot));
                  return (
                    <div key={slot} className="flex border-b border-slate-50">
                      <div className="w-20 flex-shrink-0 p-3 text-center text-[10px] font-black text-slate-400 bg-white border-r border-slate-100">
                        {formatCompactTime(slot)}
                      </div>
                      <div className="flex-1 p-2 min-h-[44px] bg-white">
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
                                  className="px-2 py-1 rounded-lg bg-blue-50 border border-blue-100 text-[10px] text-blue-700 font-bold truncate max-w-[260px]"
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
          </div>
        </div>

        {/* Right column: Visitor list, Payment breakdown, Recent Sales */}
        <div className="space-y-8">
          {/* Visitor list */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-slate-800">Visitor</h3>
              <span className="text-sm font-bold text-blue-600">{dashboardData.visitorTotalCount}</span>
            </div>
            <div className="space-y-2">
              {dashboardData.visitors.map((v) => (
                <div
                  key={v.clientId}
                  className="flex items-center justify-between py-2 px-3 rounded-xl bg-slate-50 border border-slate-100"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {v.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{v.name}</p>
                      <p className="text-[10px] text-slate-500">{v.tier}</p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-blue-600 flex-shrink-0 ml-2">
                    {v.spent.toFixed(2)}
                  </span>
                </div>
              ))}
              {dashboardData.visitors.length === 0 && (
                <div className="py-6 text-center text-slate-400 text-sm">No visitors this month.</div>
              )}
            </div>
          </div>

          {/* Payment breakdown */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Payment</h3>
            <div className="space-y-2">
              {dashboardData.paymentBreakdown.map((p) => (
                <div
                  key={p.method}
                  className="flex items-center justify-between py-2 px-3 rounded-xl bg-slate-50 border border-slate-100"
                >
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                    <span className="text-sm font-medium text-slate-700">{p.method}</span>
                  </div>
                  <span className="text-sm font-bold text-slate-800">
                    {p.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              ))}
              {dashboardData.paymentBreakdown.length === 0 && (
                <div className="py-6 text-center text-slate-400 text-sm">No payments this month.</div>
              )}
            </div>
          </div>

          {/* Recent Sales */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500">
                Recent Sales
              </h3>
            </div>
            <div className="divide-y divide-slate-100">
              {recentSales.map((txn) => (
                <div
                  key={txn.id}
                  className="p-4 hover:bg-slate-50 transition-colors flex justify-between items-center"
                >
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-semibold text-slate-700 truncate">
                      {txn.description}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium uppercase">
                      {new Date(txn.date).toLocaleDateString()}
                    </span>
                  </div>
                  <span className="text-sm font-bold flex-shrink-0 ml-2 text-emerald-600">
                    ${txn.amount.toFixed(2)}
                  </span>
                </div>
              ))}
              {recentSales.length === 0 && (
                <div className="p-8 text-center text-slate-400 italic text-sm">
                  No sales recorded yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({
  title,
  value,
  color,
}: {
  title: string;
  value: string;
  color: string;
}) => (
  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-2">{title}</p>
    <p className={`text-2xl font-bold ${color}`}>{value}</p>
  </div>
);

export default Dashboard;
