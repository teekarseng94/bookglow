import React from 'react';

const SuperAdminDashboard: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-app-page sm:text-app-page-lg font-bold tracking-tight text-white">Global Dashboard</h2>
        <p className="text-sm text-slate-400 mt-1">
          High-level overview across all subscribed outlets.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
            Total Outlets
          </p>
          <p className="mt-2 text-2xl font-bold text-emerald-300">—</p>
          <p className="mt-1 text-xs text-slate-500">Hook this up to outlet metrics later.</p>
        </div>
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
            Active Subscribers
          </p>
          <p className="mt-2 text-2xl font-bold text-emerald-300">—</p>
          <p className="mt-1 text-xs text-slate-500">Filter by active billing status.</p>
        </div>
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
            Monthly Revenue
          </p>
          <p className="mt-2 text-2xl font-bold text-emerald-300">—</p>
          <p className="mt-1 text-xs text-slate-500">Connect to your billing provider.</p>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;

