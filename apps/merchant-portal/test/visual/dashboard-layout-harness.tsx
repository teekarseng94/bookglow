import React from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import Layout from '../../components/Layout';
import { AttentionList } from '../../components/dashboard/AttentionList';
import { BookingLinkCard } from '../../components/dashboard/BookingLinkCard';
import { CustomerActivity } from '../../components/dashboard/CustomerActivity';
import { DashboardChartSection } from '../../components/dashboard/DashboardChartSection';
import { DashboardKpiCards } from '../../components/dashboard/DashboardKpiCards';
import { OperationalStatus } from '../../components/dashboard/OperationalStatus';
import { SalesSnapshot } from '../../components/dashboard/SalesSnapshot';
import { TodayHeader } from '../../components/dashboard/TodayHeader';
import { UpcomingAppointments } from '../../components/dashboard/UpcomingAppointments';
import { Button } from '../../components/ui/Button';
import { Calendar, CreditCard, Plus, Users, Wallet } from 'lucide-react';
import '../../index.css';

const weekChart = [
  { label: 'Mon', value: 1200 },
  { label: 'Tue', value: 980 },
  { label: 'Wed', value: 1500 },
  { label: 'Thu', value: 1320 },
  { label: 'Fri', value: 2100 },
  { label: 'Sat', value: 2400 },
  { label: 'Sun', value: 1980 },
];

createRoot(document.getElementById('root')!).render(
  <MemoryRouter initialEntries={['/dashboard']}>
    <Layout
      activeTab="dashboard"
      setActiveTab={() => undefined}
      isAdmin
      shopName="SOHOKAKI WELLNESS CENTER"
      outletName="SOHOKAKI WELLNESS CENTER"
      role="admin"
    >
      <div className="dashboard-today space-y-3 pb-6 lg:space-y-4">
        <TodayHeader
          className="dashboard-today-header"
          title="Good afternoon, Mei"
          actions={
            <>
              <span className="inline-flex min-h-11 items-center gap-1.5 rounded-ui-sm border border-[var(--line)] bg-[var(--bg-surface)] px-3 py-2 text-sm font-semibold text-[var(--text-secondary)]">
                <Calendar className="h-4 w-4" aria-hidden />
                Sun, 20 Sep
              </span>
              <Button type="button" variant="primary" size="md">
                <Plus className="h-4 w-4" aria-hidden /> New Booking
              </Button>
            </>
          }
        />
        <OperationalStatus
          className="lg:hidden"
          title="Quick actions"
          actions={[
            { id: 'pos', label: 'New Sale', icon: <CreditCard className="h-5 w-5" aria-hidden />, onClick: () => undefined },
            { id: 'booking', label: 'Booking', icon: <Calendar className="h-5 w-5" aria-hidden />, onClick: () => undefined },
            { id: 'member', label: 'Member', icon: <Users className="h-5 w-5" aria-hidden />, onClick: () => undefined },
            { id: 'expense', label: 'Expense', icon: <Wallet className="h-5 w-5" aria-hidden />, onClick: () => undefined },
          ]}
        />
        <DashboardKpiCards
          className="dashboard-kpis"
          cards={[
            { id: 'revenue', label: 'Revenue', value: 'RM 1,234,567.89', secondary: '128 transactions this month', sparkline: [40, 55, 32, 70, 48, 90, 66] },
            { id: 'profit', label: 'Net Profit', value: 'RM 987,654.00', secondary: '18.4% margin' },
            { id: 'clients', label: 'Clients', value: '1284', secondary: '+12 new today' },
            { id: 'expenses', label: 'Expenses', value: 'RM 12,340.50', secondary: '24 transactions this month' },
          ]}
        />
        <div className="dashboard-primary grid grid-cols-1 items-start gap-3 xl:grid-cols-[1.5fr_1.1fr_1fr] xl:gap-5">
          <UpcomingAppointments
            rows={[{
              id: 'booking-1',
              timeLabel: '14:30',
              timeRangeLabel: '14:30 – 15:30',
              title: 'Aromatherapy massage with hot stone add-on',
              metaLabel: '60 mins · SOHOKAKI WELLNESS CENTER',
              customerName: 'Aisha Rahman',
              statusLabel: 'scheduled',
            }]}
          />
          <AttentionList
            items={[{
              id: 'outstanding',
              title: '3 payments overdue',
              description: 'Total amount RM 1,280.00',
              actionLabel: 'View',
              onAction: () => undefined,
              tone: 'danger',
            }]}
          />
          <SalesSnapshot
            periodOptions={[
              { id: 'week', label: 'This week' },
            ]}
            selectedPeriod="week"
            onPeriodChange={() => undefined}
            totalLabel="RM 12,480.00"
            chartData={weekChart}
            categories={[
              { id: 'Service', label: 'Services', valueLabel: 'RM 8,120.00' },
              { id: 'Product', label: 'Products', valueLabel: 'RM 2,460.00' },
            ]}
          />
        </div>
        <div className="dashboard-secondary grid grid-cols-1 items-start gap-3 lg:grid-cols-[1.85fr_1fr] lg:gap-5">
          <CustomerActivity
            metrics={[
              { id: 'new-clients', label: 'New Clients', value: '12' },
              { id: 'returning-clients', label: 'Returning Clients', value: '48' },
              { id: 'total-clients', label: 'Total Clients', value: '1284' },
              { id: 'bookings', label: 'No. of Bookings', value: '36' },
            ]}
          />
          <BookingLinkCard />
        </div>
        <DashboardChartSection
          totalLabel="RM 12,480.00"
          txnCountLabel="36 txns"
          bars={['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => ({
            day,
            sales: weekChart[index].value,
            heightPct: [50, 41, 63, 55, 88, 100, 83][index],
            isToday: index === 6,
            title: `${day}: RM value`,
          }))}
        />
      </div>
    </Layout>
  </MemoryRouter>,
);
