import React from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import Layout from '../../components/Layout';
import { ScheduleDateStrip } from '../../components/schedule/ScheduleDateStrip';
import '../../src/loadStyles';

const requestedRoute = new URLSearchParams(window.location.search).get('route') || '/finance';
const routeSegment = requestedRoute.split('/').filter(Boolean)[0] || 'dashboard';
const activeTab = routeSegment === 'member-details' ? 'member' : routeSegment;

const content = requestedRoute === '/schedule' ? (
  <ScheduleDateStrip
    weekDates={['2026-09-07', '2026-09-08', '2026-09-09', '2026-09-10', '2026-09-11', '2026-09-12', '2026-09-13']}
    visibleDate="2026-09-13"
    todayIso="2026-09-13"
    dayInitials={['M', 'T', 'W', 'T', 'F', 'S', 'S']}
    monthLabel="September 2026"
    shopInitial="A"
    onOpenMenu={() => undefined}
    onOpenMonthPicker={() => undefined}
    onSelectDate={() => undefined}
  />
) : (
  <div className="min-h-screen p-4">{activeTab} content</div>
);

createRoot(document.getElementById('root')!).render(
  <MemoryRouter initialEntries={[requestedRoute]}>
    <Layout
      activeTab={activeTab}
      setActiveTab={() => undefined}
      isAdmin
      shopName="SOHOKAKI WELLNESS CENTER"
      outletName="SOHOKAKI WELLNESS CENTER"
      role="admin"
    >
      {content}
    </Layout>
  </MemoryRouter>,
);
