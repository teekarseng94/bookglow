import React from 'react';
import { Logo } from '../../constants';

/**
 * Hero product-interface composition.
 *
 * This is an illustration built from the real BookGlow logo, tokens, and the actual
 * merchant-portal Dashboard/Schedule structure (KPI cards, Today's Appointments, Sales
 * Snapshot) — not a stock photo and not a literal pixel screenshot. No external image
 * URLs are used; everything here is inline SVG/markup on brand tokens.
 */
export const HeroProductComposition: React.FC = () => {
  return (
    <div className="relative w-full min-h-[380px] sm:min-h-[440px] lg:min-h-[500px] flex items-center justify-center py-2">
      <div
        className="pointer-events-none absolute inset-0 rounded-[2rem]"
        aria-hidden
        style={{
          background:
            'radial-gradient(circle at 72% 28%, rgba(118, 86, 214, 0.16), transparent 55%), radial-gradient(circle at 18% 82%, rgba(200, 77, 120, 0.08), transparent 45%)',
        }}
      />

      <div className="relative z-10 w-full max-w-[540px] rounded-2xl border border-[var(--line)] bg-[var(--bg-surface)] shadow-[0_28px_80px_rgba(39,25,42,0.14)] overflow-hidden">
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-[var(--line)]">
          <div className="scale-90 origin-left">
            <Logo />
          </div>
          <span className="w-8 h-8 rounded-full bg-[var(--brand-soft)] text-[var(--brand-deep)] grid place-items-center text-xs font-black shrink-0">
            R
          </span>
        </div>

        <div className="p-3 sm:p-4 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <MetricCard label="Revenue" value="RM 3,630" trend="+12.5%" />
            <MetricCard label="Net Profit" value="RM 2,178" trend="+10.3%" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-[1.2fr_0.8fr] gap-2">
            <div className="rounded-xl border border-[var(--line)] bg-[var(--bg-soft)] p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">
                Today&apos;s Appointments
              </p>
              <div className="space-y-2">
                {[
                  { time: '10:00', name: 'Sarah Lim', service: 'Signature Massage', tone: 'success' },
                  { time: '11:30', name: 'Aisha K.', service: 'Express Facial', tone: 'warning' },
                  { time: '14:00', name: 'Mei Chen', service: 'Glow Rejuvenation', tone: 'success' },
                ].map((row) => (
                  <div
                    key={row.time}
                    className="flex items-center gap-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--line)] px-2.5 py-2"
                  >
                    <span className="text-[10px] font-bold text-[var(--text-muted)] w-9 shrink-0">{row.time}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-bold text-[var(--text-primary)] truncate">{row.name}</p>
                      <p className="text-[10px] text-[var(--text-muted)] truncate">{row.service}</p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold ${
                        row.tone === 'success'
                          ? 'bg-[var(--success-soft)] text-[var(--success)]'
                          : 'bg-[var(--warning-soft)] text-[var(--warning)]'
                      }`}
                    >
                      {row.tone === 'success' ? 'Confirmed' : 'Pending'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-[var(--line)] bg-[var(--bg-surface)] p-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Sales Snapshot</p>
                <span className="text-[9px] font-semibold text-[var(--text-muted)]">This week</span>
              </div>
              <p className="text-sm font-black text-[var(--text-primary)] tabular-nums mb-2">RM 6,835</p>
              <svg viewBox="0 0 120 48" className="w-full h-12" aria-hidden>
                <path
                  d="M0 36 C20 34, 28 20, 40 22 S60 40, 72 28 S96 8, 120 14"
                  fill="none"
                  stroke="var(--brand)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                <path
                  d="M0 36 C20 34, 28 20, 40 22 S60 40, 72 28 S96 8, 120 14 L120 48 L0 48 Z"
                  fill="rgba(118, 86, 214, 0.12)"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Booking-page overlay — shows the customer-facing side of the same booking */}
      <div className="absolute z-20 right-1 sm:right-0 lg:-right-6 bottom-2 sm:bottom-6 w-[132px] sm:w-[156px] lg:w-[176px] rounded-[1.35rem] border-[3px] border-slate-800 bg-white shadow-[0_24px_48px_rgba(0,0,0,0.18)] overflow-hidden">
        <div className="bg-slate-900 h-5 flex items-center justify-center">
          <span className="w-12 h-1 rounded-full bg-slate-600" aria-hidden />
        </div>
        <div className="p-2.5 space-y-2">
          <p className="text-[9px] uppercase tracking-wider font-bold text-[var(--text-muted)]">Book with</p>
          <p className="text-[11px] font-bold text-[var(--text-primary)] leading-tight">Your outlet</p>
          <p className="text-[10px] font-bold text-[var(--text-secondary)] pt-1">Services</p>
          {[
            { name: 'Signature Massage', price: 'RM 180', active: true },
            { name: 'Express Facial', price: 'RM 140', active: false },
          ].map((svc) => (
            <div
              key={svc.name}
              className={`rounded-lg border px-2 py-1.5 ${
                svc.active ? 'border-[var(--brand)] bg-[var(--brand-soft)]' : 'border-[var(--line)] bg-[var(--bg-surface)]'
              }`}
            >
              <div className="flex justify-between gap-1">
                <p className="text-[9px] font-bold text-[var(--text-primary)] leading-snug">{svc.name}</p>
                <p className="text-[9px] font-black text-[var(--brand)] shrink-0">{svc.price}</p>
              </div>
            </div>
          ))}
          <div className="rounded-lg bg-[var(--brand)] text-white text-center text-[10px] font-bold py-2">
            Continue · RM 180
          </div>
        </div>
      </div>
    </div>
  );
};

function MetricCard({ label, value, trend }: { label: string; value: string; trend: string }) {
  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--bg-surface)] p-2.5 sm:p-3">
      <div className="flex items-center justify-between mb-1">
        <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">{label}</p>
        <span className="text-[9px] font-bold text-[var(--success)]">{trend}</span>
      </div>
      <p className="text-xs sm:text-sm font-black text-[var(--text-primary)] tabular-nums">{value}</p>
    </div>
  );
}

export default HeroProductComposition;
