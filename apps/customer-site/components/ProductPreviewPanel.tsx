import React from 'react';

/** Compact product UI panel for marketing sections (no stock photos). */
export const ProductPreviewPanel: React.FC<{
  title: string;
  subtitle?: string;
  rows?: Array<{ label: string; meta?: string }>;
}> = ({ title, subtitle, rows = [] }) => (
  <div className="rounded-xl overflow-hidden shadow-md border border-slate-200 bg-white">
    <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{subtitle || 'Bookglow'}</p>
        <p className="text-sm font-bold text-slate-900">{title}</p>
      </div>
      <span className="w-8 h-8 rounded-full bg-teal-100 text-teal-700 grid place-items-center text-xs font-black">B</span>
    </div>
    <div className="p-4 space-y-2 min-h-[140px]">
      {rows.map((row) => (
        <div key={row.label} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
          <span className="text-xs font-semibold text-slate-800">{row.label}</span>
          {row.meta ? <span className="text-[10px] font-bold text-teal-700">{row.meta}</span> : null}
        </div>
      ))}
    </div>
  </div>
);

export default ProductPreviewPanel;
