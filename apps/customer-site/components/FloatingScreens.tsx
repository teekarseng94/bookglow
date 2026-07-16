import React from 'react';

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
                </div>
              ))}
            </div>
          </div>
        </div>

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
          </div>
        </div>
      </div>
    </div>
  );
};
