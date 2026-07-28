import React from 'react';
import { PlatformPageHeader } from '../components/admin';

const SuperAdminDashboard: React.FC = () => {
  return (
    <div className="space-y-6">
      <PlatformPageHeader
        title="Global Dashboard"
        description="High-level overview across all subscribed outlets. Metrics stay placeholder until billing hooks are connected — no fake numbers."
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {[
          {
            label: 'Total Outlets',
            hint: 'Hook this up to outlet metrics later.',
          },
          {
            label: 'Active Subscribers',
            hint: 'Filter by active billing status.',
          },
          {
            label: 'Monthly Revenue',
            hint: 'Connect to your billing provider.',
          },
        ].map((card) => (
          <div
            key={card.label}
            className="bg-[var(--platform-surface)] border border-[var(--platform-line)] rounded-ui-md p-4"
          >
            <p className="text-xs font-semibold text-[var(--platform-muted)] uppercase tracking-wide">{card.label}</p>
            <p className="mt-2 text-app-page font-bold text-[var(--platform-accent)] tabular-nums">—</p>
            <p className="mt-1 text-xs text-[var(--platform-subtle)]">{card.hint}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
