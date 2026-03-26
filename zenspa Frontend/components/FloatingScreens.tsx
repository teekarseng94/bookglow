import React from 'react';

export const FloatingScreens: React.FC = () => {
  return (
    <div className="relative w-full h-[500px] lg:h-[600px] flex items-center justify-center">
      {/* Background Images Layer */}
      <div className="absolute inset-0 grid grid-cols-2 gap-4 opacity-80 scale-95 pointer-events-none">
        <div className="relative rounded-3xl overflow-hidden shadow-2xl transition-transform duration-700 hover:scale-105">
           <img src="https://picsum.photos/seed/spa1/600/800" alt="Spa environment" className="w-full h-full object-cover grayscale transition-all" />
        </div>
        <div className="relative rounded-3xl overflow-hidden shadow-2xl translate-y-20 transition-transform duration-700 hover:scale-105">
           <img src="https://picsum.photos/seed/spa2/600/800" alt="Professional aesthetician" className="w-full h-full object-cover grayscale transition-all" />
        </div>
      </div>

      {/* Foreground Mobile App Screens */}
      <div className="relative z-10 w-full flex justify-center items-center">
        {/* Left Phone */}
        <div className="absolute -left-4 lg:-left-20 translate-y-10 shadow-2xl rounded-[2.5rem] border-8 border-white bg-white w-56 h-[400px] lg:w-64 lg:h-[480px] overflow-hidden transform -rotate-6 transition-transform hover:rotate-0 duration-500">
          <div className="p-4 bg-slate-50 h-full transition-colors">
            <div className="flex justify-between items-center mb-6">
              <span className="text-[10px] font-bold text-slate-400">12:16</span>
              <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full bg-slate-200"></div>
                <div className="w-2 h-2 rounded-full bg-slate-200"></div>
              </div>
            </div>
            <h4 className="font-bold text-slate-800 text-sm mb-4">Activity</h4>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white p-3 rounded-xl shadow-sm border border-slate-100 animate-pulse">
                  <div className="h-2 w-20 bg-slate-100 rounded mb-2"></div>
                  <div className="h-3 w-32 bg-slate-200 rounded"></div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Center Main Phone */}
        <div className="z-20 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.15)] rounded-[3rem] border-8 border-white bg-white w-64 h-[480px] lg:w-72 lg:h-[540px] overflow-hidden transform transition-transform hover:-translate-y-4 duration-500">
           <div className="p-4 h-full bg-white transition-colors">
              <div className="flex justify-between items-center mb-4">
                 <div className="text-[10px] font-bold">10:28</div>
                 <div className="flex items-center gap-1">
                    <img src="https://picsum.photos/seed/user/32/32" className="w-5 h-5 rounded-full" />
                 </div>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar">
                {[20, 21, 22, 23, 24].map(d => (
                  <div key={d} className={`min-w-[40px] p-2 rounded-lg flex flex-col items-center ${d === 23 ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>
                    <span className="text-[8px] uppercase">Sep</span>
                    <span className="text-xs font-bold">{d}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-3 mt-2">
                <div className="p-3 bg-blue-50 border-l-4 border-blue-500 rounded-r-lg">
                   <div className="text-[10px] text-blue-600 font-bold">11:00 AM - 12:00 PM</div>
                   <div className="text-xs font-bold text-slate-800">Swedish Massage</div>
                   <div className="text-[10px] text-slate-500">Sarah Johnson</div>
                </div>
                <div className="p-3 bg-teal-50 border-l-4 border-teal-500 rounded-r-lg">
                   <div className="text-[10px] text-teal-600 font-bold">12:30 PM - 1:30 PM</div>
                   <div className="text-xs font-bold text-slate-800">Facial Therapy</div>
                   <div className="text-[10px] text-slate-500">Alex Reed</div>
                </div>
                <div className="p-3 bg-purple-50 border-l-4 border-purple-500 rounded-r-lg">
                   <div className="text-[10px] text-purple-600 font-bold">2:00 PM - 3:00 PM</div>
                   <div className="text-xs font-bold text-slate-800">Manicure Session</div>
                   <div className="text-[10px] text-slate-500">Jennifer Lopez</div>
                </div>
              </div>
           </div>
        </div>

        {/* Right Phone */}
        <div className="absolute -right-4 lg:-right-20 -translate-y-10 shadow-2xl rounded-[2.5rem] border-8 border-white bg-white w-56 h-[400px] lg:w-64 lg:h-[480px] overflow-hidden transform rotate-6 transition-transform hover:rotate-0 duration-500">
          <div className="p-4 bg-slate-50 h-full transition-colors">
            <div className="h-2 w-full bg-slate-200 rounded-full mb-8"></div>
            <div className="space-y-6">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="flex items-center gap-3">
                   <div className="w-8 h-8 rounded-full bg-slate-200"></div>
                   <div className="flex-1">
                      <div className="h-2 w-16 bg-slate-200 rounded mb-1"></div>
                      <div className="h-1.5 w-24 bg-slate-100 rounded"></div>
                   </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};