import React from 'react';

<<<<<<< HEAD
/** Product-interface hero visuals — no unrelated stock photography. */
export const FloatingScreens: React.FC = () => {
  return (
    <div className="relative w-full h-[500px] lg:h-[600px] flex items-center justify-center">
      <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-br from-slate-100 via-teal-50 to-slate-50 border border-slate-100" />

      <div className="relative z-10 w-full flex justify-center items-center">
        {/* Schedule preview */}
        <div className="absolute -left-2 lg:-left-16 translate-y-8 shadow-2xl rounded-[1.75rem] border border-slate-200 bg-white w-52 h-[360px] lg:w-60 lg:h-[420px] overflow-hidden transform -rotate-6">
          <div className="p-4 h-full bg-slate-50">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3">Schedule</p>
            <div className="space-y-2">
              {[
                { t: '10:00', n: 'Body therapy', c: 'Confirmed' },
                { t: '11:30', n: 'Consultation', c: 'Arriving' },
                { t: '14:00', n: 'Facial', c: 'Confirmed' },
              ].map((row) => (
                <div key={row.t} className="bg-white rounded-xl border border-slate-100 p-3">
                  <div className="flex justify-between text-[10px] text-slate-400 font-semibold">
                    <span>{row.t}</span>
                    <span>{row.c}</span>
                  </div>
                  <p className="text-xs font-bold text-slate-800 mt-1">{row.n}</p>
=======
/** Product-interface hero visuals — illustrative collage matching the landing mock. */
export const FloatingScreens: React.FC = () => {
  return (
    <div className="relative w-full min-h-[420px] sm:min-h-[480px] lg:min-h-[560px] flex items-center justify-center py-4">
      {/* Soft brand glow */}
      <div
        className="pointer-events-none absolute inset-0 rounded-[2rem]"
        aria-hidden
        style={{
          background:
            'radial-gradient(circle at 70% 30%, rgba(118, 86, 214, 0.18), transparent 55%), radial-gradient(circle at 20% 80%, rgba(99, 102, 241, 0.10), transparent 45%)',
        }}
      />

      {/* Desktop dashboard frame */}
      <div className="relative z-10 w-full max-w-[560px] rounded-2xl border border-slate-200 bg-white shadow-[0_28px_80px_rgba(39,25,42,0.14)] overflow-hidden">
        <div className="flex min-h-[340px] sm:min-h-[400px] lg:min-h-[440px]">
          {/* Sidebar */}
          <aside className="hidden sm:flex w-[112px] shrink-0 flex-col gap-1 border-r border-slate-100 bg-slate-50/90 px-2.5 py-4">
            <p className="mb-3 px-1.5 text-[10px] font-black uppercase tracking-wider text-[var(--brand)]">Bookglow</p>
            {[
              { label: 'Today', active: true },
              { label: 'Schedule', active: false },
              { label: 'Point of Sale', active: false },
              { label: 'Members', active: false },
              { label: 'Reports', active: false },
            ].map((item) => (
              <div
                key={item.label}
                className={`rounded-lg px-2 py-1.5 text-[10px] font-semibold ${
                  item.active
                    ? 'bg-[var(--brand-soft)] text-[var(--brand)]'
                    : 'text-slate-500'
                }`}
              >
                {item.label}
              </div>
            ))}
          </aside>

          {/* Main panel */}
          <div className="flex-1 p-3 sm:p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm sm:text-base font-bold text-slate-900">Good afternoon, Riki 👋</p>
                <p className="text-[10px] text-slate-400 font-medium">Today overview</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="hidden sm:grid w-7 h-7 place-items-center rounded-full border border-slate-100 text-slate-400 text-xs">🔔</span>
                <span className="w-8 h-8 rounded-full bg-[var(--brand-soft)] text-[var(--brand)] grid place-items-center text-xs font-black">R</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <MetricCard label="Revenue" value="RM 3,630.00" trend="+12.5%" />
              <MetricCard label="Payouts" value="RM 2,178.00" trend="+10.3%" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-[1.2fr_0.8fr] gap-2">
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Today&apos;s Appointments</p>
                <div className="space-y-2">
                  {[
                    { time: '10:00', name: 'Sarah Lim', service: 'Signature Massage', status: 'Confirmed', tone: 'blue' },
                    { time: '11:30', name: 'Aisha K.', service: 'Express Facial', status: 'Pending', tone: 'amber' },
                    { time: '14:00', name: 'Mei Chen', service: 'Glow Rejuvenation', status: 'Confirmed', tone: 'blue' },
                  ].map((row) => (
                    <div key={row.time} className="flex items-center gap-2 rounded-lg bg-white border border-slate-100 px-2.5 py-2">
                      <span className="text-[10px] font-bold text-slate-400 w-9 shrink-0">{row.time}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-bold text-slate-800 truncate">{row.name}</p>
                        <p className="text-[10px] text-slate-400 truncate">{row.service}</p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold ${
                          row.tone === 'blue'
                            ? 'bg-sky-50 text-sky-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {row.status}
                      </span>
                    </div>
                  ))}
>>>>>>> 27312fa3951009f3285eb2f65a1e2fd20d5a8dda
                </div>
              </div>

              <div className="rounded-xl border border-slate-100 bg-white p-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Sales Snapshot</p>
                  <span className="text-[9px] font-semibold text-slate-400">This week ▾</span>
                </div>
                <p className="text-sm font-black text-slate-900 tabular-nums mb-2">RM 6,835.00</p>
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
      </div>

<<<<<<< HEAD
        {/* Booking page preview */}
        <div className="z-20 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.15)] rounded-[2rem] border border-slate-200 bg-white w-64 h-[440px] lg:w-72 lg:h-[500px] overflow-hidden">
          <div className="p-4 h-full">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-8 h-8 rounded-full bg-teal-100 text-teal-700 grid place-items-center text-xs font-black">B</span>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Book with</p>
                <p className="text-sm font-bold text-slate-900">Your outlet</p>
              </div>
            </div>
            <p className="text-xs font-bold text-slate-500 uppercase mb-2">Services</p>
            <div className="space-y-2">
              {['Signature massage', 'Express facial', 'Consultation'].map((name, i) => (
                <div key={name} className={`rounded-xl border p-3 ${i === 0 ? 'border-teal-300 bg-teal-50' : 'border-slate-100 bg-white'}`}>
                  <div className="flex justify-between gap-2">
                    <p className="text-xs font-bold text-slate-800">{name}</p>
                    <p className="text-xs font-black text-teal-700">RM {[120, 80, 0][i]}</p>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">{[60, 45, 30][i]} min</p>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-xl bg-teal-600 text-white text-center text-xs font-bold py-3">Continue · RM 120</div>
          </div>
        </div>

        {/* POS / sales preview */}
        <div className="absolute -right-2 lg:-right-16 -translate-y-6 shadow-2xl rounded-[1.75rem] border border-slate-200 bg-white w-52 h-[360px] lg:w-60 lg:h-[420px] overflow-hidden transform rotate-6">
          <div className="p-4 h-full bg-slate-50">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3">Today</p>
            <div className="rounded-xl bg-teal-600 text-white p-3 mb-3">
              <p className="text-[10px] text-teal-100 uppercase font-semibold">Revenue</p>
              <p className="text-lg font-black tabular-nums">RM 1,280</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-white border border-slate-100 p-2">
                <p className="text-[9px] text-slate-400 uppercase">Bookings</p>
                <p className="text-sm font-bold text-slate-800">08</p>
              </div>
              <div className="rounded-xl bg-white border border-slate-100 p-2">
                <p className="text-[9px] text-slate-400 uppercase">Members</p>
                <p className="text-sm font-bold text-slate-800">24</p>
              </div>
            </div>
=======
      {/* Phone booking overlay */}
      <div className="absolute z-20 right-1 sm:right-0 lg:-right-6 bottom-2 sm:bottom-6 w-[140px] sm:w-[168px] lg:w-[188px] rounded-[1.35rem] border-[3px] border-slate-800 bg-white shadow-[0_24px_48px_rgba(0,0,0,0.18)] overflow-hidden">
        <div className="bg-slate-900 h-5 flex items-center justify-center">
          <span className="w-12 h-1 rounded-full bg-slate-600" />
        </div>
        <div className="p-2.5 space-y-2">
          <p className="text-[9px] uppercase tracking-wider font-bold text-slate-400">Book with</p>
          <p className="text-[11px] font-bold text-slate-900 leading-tight">Your outlet</p>
          <p className="text-[10px] font-bold text-slate-500 pt-1">Services</p>
          {[
            { name: 'Signature Massage', price: 'RM 180', active: true },
            { name: 'Express Facial', price: 'RM 140', active: false },
            { name: 'Glow Rejuvenation', price: 'RM 240', active: false },
          ].map((svc) => (
            <div
              key={svc.name}
              className={`rounded-lg border px-2 py-1.5 ${
                svc.active
                  ? 'border-[var(--brand)] bg-[var(--brand-soft)]'
                  : 'border-slate-100 bg-white'
              }`}
            >
              <div className="flex justify-between gap-1">
                <p className="text-[9px] font-bold text-slate-800 leading-snug">{svc.name}</p>
                <p className="text-[9px] font-black text-[var(--brand)] shrink-0">{svc.price}</p>
              </div>
            </div>
          ))}
          <div className="rounded-lg bg-[var(--brand)] text-white text-center text-[10px] font-bold py-2">
            Continue · RM 180
>>>>>>> 27312fa3951009f3285eb2f65a1e2fd20d5a8dda
          </div>
        </div>
      </div>
    </div>
  );
};
<<<<<<< HEAD
=======

function MetricCard({ label, value, trend }: { label: string; value: string; trend: string }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white p-2.5 sm:p-3">
      <div className="flex items-center justify-between mb-1">
        <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
        <span className="text-[9px] font-bold text-emerald-600">{trend}</span>
      </div>
      <p className="text-xs sm:text-sm font-black text-slate-900 tabular-nums">{value}</p>
      <svg viewBox="0 0 64 20" className="w-full h-4 mt-1" aria-hidden>
        <path
          d="M0 14 C12 12, 18 6, 28 8 S44 16, 52 10 S60 4, 64 6"
          fill="none"
          stroke="var(--brand)"
          strokeWidth="1.75"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}
>>>>>>> 27312fa3951009f3285eb2f65a1e2fd20d5a8dda
