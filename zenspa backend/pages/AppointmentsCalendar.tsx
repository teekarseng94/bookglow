
import React, { useState, useMemo, useEffect, useRef, useLayoutEffect } from 'react';
import { Appointment, Staff, Client, Service, RoleCommission, OutletSettings } from '../types';
import { Icons } from '../constants';
import { generateReminderMessage } from '../services/geminiService';

interface AppointmentsCalendarProps {
  appointments: Appointment[];
  staff: Staff[];
  clients: Client[];
  services: Service[];
  roleCommissions: RoleCommission[];
  outletSettings: OutletSettings;
  onAddAppointment: (appointment: Appointment) => void;
  onUpdateAppointmentStatus: (id: string, status: Appointment['status']) => void;
  onDeleteAppointment: (id: string) => Promise<void>;
  onStartPOSSale: (appointment: Appointment) => void;
  onMarkReminderSent: (id: string) => void;
  /** Called once when the page opens to sync Setmore appointments (Cloud Function). */
  onSyncSetmore?: () => void | Promise<void>;
}

type ViewMode = 'day' | 'week' | 'month';

const DAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const;

const formatDisplayTime = (time?: string): string => {
  if (!time) return '';
  const [hh = '0', mm = '0'] = time.split(':');
  const hours = Number(hh);
  const mins = Number(mm);
  if (!Number.isFinite(hours) || !Number.isFinite(mins)) return time;
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const h12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${h12}:${String(mins).padStart(2, '0')} ${ampm}`;
};

const AppointmentsCalendar: React.FC<AppointmentsCalendarProps> = ({ 
  appointments, 
  staff, 
  clients, 
  services, 
  roleCommissions,
  outletSettings,
  onAddAppointment,
  onUpdateAppointmentStatus,
  onDeleteAppointment,
  onStartPOSSale,
  onMarkReminderSent,
  onSyncSetmore
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedStaffId, setSelectedStaffId] = useState<string>(staff[0]?.id || '');
  
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isSendingReminder, setIsSendingReminder] = useState(false);
  const [isSyncingSetmore, setIsSyncingSetmore] = useState(false);
  const syncRunOnce = useRef(false);
  const agendaLoadMoreRef = useRef<HTMLDivElement | null>(null);
  const dateStripScrollRef = useRef<HTMLDivElement | null>(null);
  const dateStripLeftRef = useRef<HTMLDivElement | null>(null);
  const dateStripRightRef = useRef<HTMLDivElement | null>(null);
  const dateStripPrevWidthRef = useRef(0);
  const dateStripPrependingRef = useRef(false);
  const [mobileAgendaWeeks, setMobileAgendaWeeks] = useState(6);
  const [dateStripPastDays, setDateStripPastDays] = useState(30);
  const [dateStripFutureDays, setDateStripFutureDays] = useState(30);

  const [bookingData, setBookingData] = useState({
    staffId: '',
    time: '',
    clientId: '',
    serviceId: '',
    date: ''
  });

  // Auto-sync Setmore appointments once when the Appointment page is opened (run only on mount)
  useEffect(() => {
    if (!onSyncSetmore || syncRunOnce.current) return;
    syncRunOnce.current = true;
    setIsSyncingSetmore(true);
    Promise.resolve(onSyncSetmore())
      .catch((err) => console.warn('Setmore auto-sync on open:', err))
      .finally(() => setIsSyncingSetmore(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run only once on mount
  }, []);

  // Active appointments: hide cancelled and any legacy On Duty (app_onduty_) — only render real bookings (yellow-circle style).
  const activeAppointments = useMemo(
    () => appointments.filter(
      (a) => a.status !== 'cancelled' && typeof a.id === 'string' && !a.id.startsWith('app_onduty_')
    ),
    [appointments]
  );

  // Clear selectedAppointment if it was deleted (e.g., when sale was voided/deleted)
  // This prevents stale references and the "Appointment not found" warnings
  useEffect(() => {
    if (selectedAppointment && isStatusModalOpen) {
      const appointmentStillExists = appointments.some(a => a.id === selectedAppointment.id);
      if (!appointmentStillExists) {
        console.log('Selected appointment was deleted, closing modal automatically.');
        setIsStatusModalOpen(false);
        setSelectedAppointment(null);
      }
    }
  }, [appointments, selectedAppointment, isStatusModalOpen]);

  // Socket.io real-time listener (optional - Firestore listeners already provide real-time updates)
  useEffect(() => {
    // Note: Firestore real-time listeners in useFirestoreData hook already provide instant updates
    // Socket.io is optional and requires a Socket.io server to be set up
    const setupSocketListener = async () => {
      try {
        const socketUrl = import.meta.env.VITE_SOCKET_URL;
        if (socketUrl) {
          const { initializeSocket, onAppointmentUpdate } = await import('../services/socketService');
          const socket = initializeSocket(socketUrl);
          
          if (socket) {
            const unsubscribe = onAppointmentUpdate((updatedAppointment) => {
              console.log('📥 Received Socket.io appointment update:', updatedAppointment);
              // Firestore listeners will handle the actual update, this is just for logging
            });
            
            return () => {
              unsubscribe();
            };
          }
        }
      } catch (error) {
        // Socket.io not configured - Firestore listeners will handle updates
        console.log('Socket.io not available, using Firestore real-time listeners');
      }
    };

    const cleanup = setupSocketListener();
    return () => {
      cleanup.then(fn => fn && fn());
    };
  }, []);

  const getCategoryColor = (category: string) => {
    const cat = category?.toLowerCase();
    if (cat.includes('massage')) return 'bg-teal-50 border-teal-500 text-teal-700 hover:bg-teal-100';
    if (cat.includes('facial') || cat.includes('skin')) return 'bg-rose-50 border-rose-500 text-rose-700 hover:bg-rose-100';
    if (cat.includes('nail') || cat.includes('mani') || cat.includes('pedi')) return 'bg-amber-50 border-amber-500 text-amber-700 hover:bg-amber-100';
    if (cat.includes('aroma') || cat.includes('oil')) return 'bg-indigo-50 border-indigo-500 text-indigo-700 hover:bg-indigo-100';
    if (cat.includes('package') || cat.includes('special')) return 'bg-emerald-50 border-emerald-500 text-emerald-700 hover:bg-emerald-100';
    return 'bg-slate-50 border-slate-400 text-slate-700 hover:bg-slate-100';
  };

  // Helper: show each appointment in exactly one 30-min slot (the slot that contains its start time).
  const isAppointmentInTimeSlot = (app: Appointment, hour: string): boolean => {
    const [appH, appM] = app.time.split(':').map(Number);
    const appStartMinutes = appH * 60 + appM;
    const [slotH, slotM] = hour.split(':').map(Number);
    const slotStartMinutes = slotH * 60 + slotM;
    return appStartMinutes >= slotStartMinutes && appStartMinutes < slotStartMinutes + 30;
  };

  const hours = useMemo(() => {
    const h: string[] = [];
    // 30-minute increments from 10:00 to 24:00 (inclusive)
    for (let minutes = 10 * 60; minutes <= 24 * 60; minutes += 30) {
      const hh = String(Math.floor(minutes / 60)).padStart(2, '0');
      const mm = String(minutes % 60).padStart(2, '0');
      h.push(`${hh}:${mm}`);
    }
    return h;
  }, []);

  const navigate = (direction: 'prev' | 'next') => {
    const date = new Date(selectedDate);
    if (viewMode === 'day') date.setDate(date.getDate() + (direction === 'next' ? 1 : -1));
    else if (viewMode === 'week') date.setDate(date.getDate() + (direction === 'next' ? 7 : -7));
    else date.setMonth(date.getMonth() + (direction === 'next' ? 1 : -1));
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  const setToday = () => setSelectedDate(new Date().toISOString().split('T')[0]);

  const weekDates = useMemo(() => {
    const start = new Date(selectedDate);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1);
    start.setDate(diff);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d.toISOString().split('T')[0];
    });
  }, [selectedDate]);

  const dateStripDates = useMemo(() => {
    const center = new Date(selectedDate);
    return Array.from({ length: dateStripPastDays + dateStripFutureDays + 1 }, (_, i) => {
      const d = new Date(center);
      d.setDate(center.getDate() - dateStripPastDays + i);
      return d.toISOString().split('T')[0];
    });
  }, [selectedDate, dateStripPastDays, dateStripFutureDays]);

  const mobileAgendaDates = useMemo(() => {
    const start = new Date(selectedDate);
    // Agenda list always starts from the selected date.
    return Array.from({ length: mobileAgendaWeeks * 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d.toISOString().split('T')[0];
    });
  }, [selectedDate, mobileAgendaWeeks]);

  // Reset infinite agenda window when user jumps to another selected date.
  useEffect(() => {
    setMobileAgendaWeeks(6);
    setDateStripPastDays(30);
    setDateStripFutureDays(30);
  }, [selectedDate]);

  // Keep selected date visible when user taps a date.
  useEffect(() => {
    const root = dateStripScrollRef.current;
    if (!root) return;
    const selectedNode = root.querySelector<HTMLButtonElement>(`button[data-date="${selectedDate}"]`);
    if (!selectedNode) return;
    selectedNode.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  }, [selectedDate]);

  // Preserve horizontal scroll position when we prepend older dates on the left.
  useLayoutEffect(() => {
    if (!dateStripPrependingRef.current) return;
    const root = dateStripScrollRef.current;
    if (!root) return;
    const delta = root.scrollWidth - dateStripPrevWidthRef.current;
    if (delta > 0) root.scrollLeft += delta;
    dateStripPrependingRef.current = false;
  }, [dateStripDates.length]);

  // Infinite date strip (left): load earlier dates.
  useEffect(() => {
    const root = dateStripScrollRef.current;
    const target = dateStripLeftRef.current;
    if (!root || !target || typeof window === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        dateStripPrevWidthRef.current = root.scrollWidth;
        dateStripPrependingRef.current = true;
        setDateStripPastDays((prev) => Math.min(prev + 7, 365));
      },
      { root, rootMargin: '0px 120px 0px 120px', threshold: 0 }
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [dateStripDates.length]);

  // Infinite date strip (right): load newer dates.
  useEffect(() => {
    const root = dateStripScrollRef.current;
    const target = dateStripRightRef.current;
    if (!root || !target || typeof window === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setDateStripFutureDays((prev) => Math.min(prev + 7, 365));
        }
      },
      { root, rootMargin: '0px 120px 0px 120px', threshold: 0 }
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [dateStripDates.length]);

  // Infinite mobile agenda: append upcoming weeks when reaching the end sentinel.
  useEffect(() => {
    const node = agendaLoadMoreRef.current;
    if (!node || typeof window === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setMobileAgendaWeeks((prev) => Math.min(prev + 4, 52));
        }
      },
      { root: null, rootMargin: '400px 0px', threshold: 0 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [mobileAgendaDates.length]);

  const appointmentsByDate = useMemo(() => {
    const grouped = new Map<string, Appointment[]>();
    mobileAgendaDates.forEach((d) => grouped.set(d, []));

    activeAppointments.forEach((app) => {
      if (!grouped.has(app.date)) return;
      grouped.get(app.date)!.push(app);
    });

    grouped.forEach((list, date) => {
      list.sort((a, b) => {
        const aStart = a.time || '00:00';
        const bStart = b.time || '00:00';
        if (aStart === bStart) return a.id.localeCompare(b.id);
        return aStart.localeCompare(bStart);
      });
      grouped.set(date, list);
    });

    return grouped;
  }, [mobileAgendaDates, activeAppointments]);

  const thisWeekIncome = useMemo(() => {
    const weekSet = new Set(weekDates);
    return activeAppointments.reduce((sum, app) => {
      if (!weekSet.has(app.date)) return sum;
      const service = services.find((s) => s.id === app.serviceId);
      return sum + (service?.price || 0);
    }, 0);
  }, [weekDates, activeAppointments, services]);

  const monthDays = useMemo(() => {
    const date = new Date(selectedDate);
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const days = [];
    const padding = (firstDay === 0 ? 6 : firstDay - 1);
    for (let i = 0; i < padding; i++) days.push(null);
    for (let i = 1; i <= totalDays; i++) days.push(new Date(year, month, i));
    return days;
  }, [selectedDate]);

  const handleEmptySlotClick = (staffId: string, time: string, date: string) => {
    setBookingData({
      staffId,
      time,
      date,
      clientId: clients[0]?.id || 'guest',
      serviceId: services[0]?.id || ''
    });
    setIsBookingModalOpen(true);
  };

  const handleAppointmentClick = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setIsStatusModalOpen(true);
  };

  const handleQuickAddBooking = () => {
    setBookingData({
      staffId: staff[0]?.id || '',
      time: '10:00',
      date: selectedDate,
      clientId: clients[0]?.id || 'guest',
      serviceId: services[0]?.id || ''
    });
    setIsBookingModalOpen(true);
  };

  const handleBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Get outletID from existing appointments (all appointments belong to the same outlet)
    const outletID = appointments.length > 0 ? appointments[0].outletID : '';
    if (!outletID) {
      alert('Error: Unable to determine outlet. Please refresh the page.');
      return;
    }
    const newApp: Appointment = {
      id: '', // Firestore will assign doc id; listener uses doc.id so UI never uses a client id
      outletID,
      clientId: bookingData.clientId,
      serviceId: bookingData.serviceId,
      staffId: bookingData.staffId,
      date: bookingData.date,
      time: bookingData.time,
      status: 'scheduled'
    };
    onAddAppointment(newApp);
    setIsBookingModalOpen(false);
  };

  const handleSendManualReminder = async () => {
    if (!selectedAppointment) return;
    setIsSendingReminder(true);
    
    const client = clients.find(c => c.id === selectedAppointment.clientId);
    const service = services.find(s => s.id === selectedAppointment.serviceId);
    
    if (client && service) {
      const message = await generateReminderMessage(
        client.name,
        service.name,
        selectedAppointment.date,
        selectedAppointment.time,
        outletSettings.shopName,
        outletSettings.reminderChannel
      );
      
      alert(`Manual Reminder Sent to ${client.name}:\n\n${message}`);
      onMarkReminderSent(selectedAppointment.id);
    }
    
    setIsSendingReminder(false);
    setIsStatusModalOpen(false);
  };

  const onUpdateStatus = async (status: Appointment['status']) => {
    if (selectedAppointment) {
      // Check if appointment still exists in the current appointments list
      // (it may have been deleted when sale was voided/deleted)
      const appointmentStillExists = appointments.some(a => a.id === selectedAppointment.id);
      if (!appointmentStillExists) {
        console.warn('Appointment was deleted (likely when sale was voided/deleted). Closing modal.');
        setIsStatusModalOpen(false);
        setSelectedAppointment(null);
        return;
      }
      
      try {
        await onUpdateAppointmentStatus(selectedAppointment.id, status);
        setIsStatusModalOpen(false);
        setSelectedAppointment(null);
      } catch (err: any) {
        // If appointment was deleted during update, just close modal
        if (err.message?.includes('not found') || err.message?.includes('Appointment not found')) {
          console.warn('Appointment was deleted during update. Closing modal.');
          setIsStatusModalOpen(false);
          setSelectedAppointment(null);
        } else {
          // Re-throw other errors
          throw err;
        }
      }
    }
  };

  const handleDeleteAppointment = async (appointmentId: string) => {
    if (!appointmentId || typeof appointmentId !== 'string' || !appointmentId.trim()) {
      console.error('handleDeleteAppointment: invalid appointmentId', appointmentId);
      return;
    }
    const id = appointmentId.trim();
    const appointmentStillExists = appointments.some((a) => a.id === id);
    if (!appointmentStillExists) {
      setIsStatusModalOpen(false);
      setSelectedAppointment(null);
      return;
    }

    const confirmed = window.confirm('Are you sure you want to delete this appointment? This action cannot be undone.');
    if (!confirmed) return;

    try {
      await onDeleteAppointment(id);
      // Only close modal after delete promise resolves; do not touch appointments state.
      // The onSnapshot listener is the single source of truth and will remove the doc from state when it receives the 'removed' change.
      setIsStatusModalOpen(false);
      setSelectedAppointment(null);
    } catch (err: any) {
      console.error('Error in handleDeleteAppointment UI handler:', err);
      // If appointment was deleted during delete operation, just close modal silently
      if (err.message?.includes('not found') || err.message?.includes('Appointment not found')) {
        console.log('Appointment was already deleted, closing modal');
        setIsStatusModalOpen(false);
        setSelectedAppointment(null);
      } else {
        // Show error to user
        alert(`Failed to delete appointment: ${err.message || 'Unknown error'}\n\nCheck browser console for details.`);
        console.error('Full error details:', err);
      }
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-24">
      {/* Syncing with Setmore... */}
      {isSyncingSetmore && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-sky-50 border border-sky-200 rounded-xl text-sky-700 text-sm font-medium">
          <span className="w-4 h-4 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
          Syncing with Setmore…
        </div>
      )}

      {/* Calendar Header */}
      <div className="hidden md:flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-6">
          <div className="flex bg-slate-100 p-1 rounded-xl shadow-inner">
            {(['day', 'week', 'month'] as ViewMode[]).map(mode => (
              <button key={mode} onClick={() => setViewMode(mode)} className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${viewMode === mode ? 'bg-white text-teal-600 shadow-md transform scale-105' : 'text-slate-400 hover:text-slate-600'}`}>
                {mode}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('prev')} className="p-2 hover:bg-slate-50 rounded-lg text-slate-400 border border-slate-100"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg></button>
            <button onClick={setToday} className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 border border-slate-100 rounded-lg">Today</button>
            <button onClick={() => navigate('next')} className="p-2 hover:bg-slate-50 rounded-lg text-slate-400 border border-slate-100"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg></button>
          </div>
        </div>
        <div className="flex items-center gap-4 w-full lg:w-auto">
          <h2 className="text-xl font-black text-slate-800 hidden xl:block">
            {new Date(selectedDate).toLocaleDateString('default', { month: 'long', year: 'numeric', day: viewMode === 'month' ? undefined : 'numeric' })}
          </h2>
          <input type="date" className="flex-1 lg:flex-none p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-teal-500 shadow-sm" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
        </div>
      </div>

      <div className="bg-white md:rounded-3xl md:border md:border-slate-200 md:shadow-sm overflow-hidden min-h-[600px] flex flex-col">
        {viewMode === 'day' && (
          <>
          <div className="md:hidden border-b border-slate-100 px-4 pt-3 pb-2.5 bg-white">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-[38px] leading-none font-medium tracking-tight text-slate-800">
                {new Date(selectedDate).toLocaleDateString('default', { month: 'long', year: 'numeric' })}
              </h3>
              <div className="flex items-center gap-2">
                <button type="button" className="w-9 h-9 rounded-full border border-slate-200 text-slate-500 flex items-center justify-center bg-white">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a9.963 9.963 0 012.992-4.568m3.124-1.997A9.956 9.956 0 0112 5c4.478 0 8.268 2.943 9.542 7a9.958 9.958 0 01-4.293 5.287M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                </button>
                <button type="button" className="w-9 h-9 rounded-full border border-slate-200 text-slate-500 flex items-center justify-center bg-white">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405M19 17V9a7 7 0 10-14 0v8m14 0H5m14 0a3 3 0 11-6 0m-8 0a3 3 0 006 0" /></svg>
                </button>
                <span className="w-9 h-9 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold flex items-center justify-center">All</span>
              </div>
            </div>
            <div ref={dateStripScrollRef} className="flex items-center gap-2 overflow-x-auto pb-0.5">
              <div ref={dateStripLeftRef} className="w-px h-px shrink-0" aria-hidden />
              {dateStripDates.map((date) => {
                const d = new Date(date);
                const isSelected = date === selectedDate;
                return (
                  <button
                    key={date}
                    data-date={date}
                    type="button"
                    onClick={() => setSelectedDate(date)}
                    className="flex flex-col items-center min-w-[42px] py-1"
                  >
                    <span className="text-[15px] leading-none font-medium text-slate-500 mb-1.5">
                      {DAY_INITIALS[d.getDay()]}
                    </span>
                    <span
                      className={`w-9 h-9 rounded-full flex items-center justify-center text-[20px] leading-none font-medium transition-colors ${
                        isSelected ? 'bg-slate-900 text-white' : 'text-slate-700'
                      }`}
                    >
                      {d.getDate()}
                    </span>
                  </button>
                );
              })}
              <div ref={dateStripRightRef} className="w-px h-px shrink-0" aria-hidden />
            </div>
          </div>

          <div className="md:hidden flex-1 bg-white px-4 pt-4 pb-36 space-y-5">
            {mobileAgendaDates.map((date) => {
              const dayAppointments = appointmentsByDate.get(date) || [];
              const dayLabel = new Date(date).toLocaleDateString('default', {
                weekday: 'long',
                day: 'numeric',
                month: 'long'
              });

              return (
                <section key={date} className="space-y-1.5">
                  <h4 className="text-[14px] leading-none font-semibold tracking-wide text-slate-600">
                    {dayLabel}
                  </h4>
                  {dayAppointments.length === 0 ? (
                    <p className="text-slate-300 text-[11px] leading-none font-medium">Nothing planned</p>
                  ) : (
                    <div className="space-y-1.5">
                      {dayAppointments.map((app) => {
                        const client = clients.find((c) => c.id === app.clientId);
                        const service = services.find((s) => s.id === app.serviceId);
                        const therapist = staff.find((s) => s.id === app.staffId);
                        const initial = (therapist?.name || 'S').charAt(0).toUpperCase();

                        return (
                          <button
                            key={app.id}
                            type="button"
                            onClick={() => handleAppointmentClick(app)}
                            className="w-full text-left rounded-lg border-l-4 border-orange-400 bg-[#FFF3E0] px-3 py-2.5 shadow-[0_1px_2px_rgba(15,23,42,0.08)] transition-transform active:scale-[0.99]"
                          >
                            <p className="text-[12px] leading-snug font-bold text-slate-900">
                              {client?.name || 'Guest'}{' '}
                              <span className="font-medium text-slate-500">
                                RM{Number(service?.price || 0).toFixed(0)} {service?.name || 'Service'}
                              </span>
                            </p>
                            <p className="text-[10px] font-semibold text-slate-800 mt-0.5">
                              {formatDisplayTime(app.time)} - {formatDisplayTime(app.endTime || app.time)}
                            </p>
                            <div className="mt-1.5 flex items-center gap-2">
                              <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 text-[10px] font-semibold flex items-center justify-center">
                                {initial}
                              </span>
                              <span className="text-[10px] text-slate-600 font-medium">
                                {therapist?.name || 'Staff'}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </section>
              );
            })}
            <div ref={agendaLoadMoreRef} className="h-2" aria-hidden />
          </div>

          <div className="hidden md:block overflow-x-auto flex-1">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="p-4 w-24 sticky left-0 bg-slate-50 z-20 border-r border-slate-100 shadow-sm"></th>
                  {staff.map(member => (
                    <th key={member.id} className="p-4 min-w-[220px] border-r border-slate-100 text-left">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-teal-600 text-white flex items-center justify-center font-bold text-sm shadow-md">{member.name.charAt(0)}</div>
                        <div>
                          <p className="text-sm font-black text-slate-800 leading-tight">{member.name}</p>
                          <p className="text-[9px] font-black uppercase text-slate-400 tracking-tighter">{member.role}</p>
                        </div>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {hours.map(hour => (
                  <tr key={hour} className="border-b border-slate-50 group hover:bg-slate-50/30 transition-colors">
                    <td className="p-4 text-center text-[10px] font-black text-slate-400 sticky left-0 bg-white group-hover:bg-slate-50/50 z-10 border-r border-slate-100">
                      {hour.replace(':', '')}
                    </td>
                    {staff.map(member => {
                      // Find appointments for this staff member on this date that match this time slot (exclude cancelled)
                      const app = activeAppointments.find(a =>
                        a.date === selectedDate &&
                        a.staffId === member.id &&
                        isAppointmentInTimeSlot(a, hour)
                      );
                      const service = app ? services.find(s => s.id === app.serviceId) : null;
                      const client = app ? clients.find(c => c.id === app.clientId) : null;

                      return (
                        <td key={member.id} className="p-1.5 border-r border-slate-50 min-h-[100px] cursor-pointer" onClick={() => app ? handleAppointmentClick(app) : handleEmptySlotClick(member.id, hour, selectedDate)}>
                          {app ? (
                            <div className={`p-3 rounded-2xl border-l-4 h-full shadow-sm animate-fadeIn transition-all hover:scale-[1.02] flex flex-col justify-between ${getCategoryColor(service?.category || '')}`}>
                              <div>
                                <div className="flex items-start justify-between">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-black truncate">{client?.name || 'Guest'}</p>
                                    {app.endTime && (
                                      <p className="text-[9px] font-bold text-slate-600 mt-0.5">
                                        {app.time.replace(':', '')} - {app.endTime.replace(':', '')}
                                      </p>
                                    )}
                                  </div>
                                  {app.reminderSent && (
                                    <span className="text-amber-600 animate-pulse" title="Reminder Sent">
                                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" /></svg>
                                    </span>
                                  )}
                                </div>
                                <p className="text-[9px] font-bold opacity-80 truncate uppercase tracking-tighter">
                                  {service?.name || '—'}
                                </p>
                              </div>
                              <div className="mt-2 flex items-center justify-between">
                                <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${
                                  app.status === 'completed' ? 'bg-teal-600 text-white' : 'bg-white/40'
                                }`}>
                                  {app.status}
                                </span>
                                {app.status === 'scheduled' && <Icons.POS />}
                              </div>
                            </div>
                          ) : (
                            <div className="h-12 w-full flex items-center justify-center opacity-0 group-hover:opacity-100 text-slate-200 transition-opacity"><Icons.Add /></div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}

        {/* Other view modes (week, month) would have similar updates for the reminderSent icon */}
      </div>

      {/* Mobile sticky summary + quick action */}
      {viewMode === 'day' && (
        <>
          <div className="md:hidden fixed left-0 right-0 bottom-16 z-40 border-t border-slate-200 bg-white px-4 py-2 flex items-center justify-between">
            <span className="text-[14px] leading-none text-slate-700 font-medium">This week&apos;s income</span>
            <span className="text-[14px] leading-none font-semibold text-slate-900">RM{thisWeekIncome.toFixed(0)}</span>
          </div>
          <button
            type="button"
            onClick={handleQuickAddBooking}
            className="md:hidden fixed bottom-[98px] right-[10px] z-50 w-14 h-14 rounded-full bg-slate-950 text-white shadow-[0_10px_24px_rgba(15,23,42,0.35)] flex items-center justify-center"
            aria-label="Quick add booking"
          >
            <span className="text-[34px] leading-none">+</span>
          </button>
        </>
      )}

      {/* Booking Modal */}
      {isBookingModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] w-full max-w-md shadow-2xl animate-scaleIn overflow-hidden">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-teal-600 text-white">
              <h3 className="text-xl font-black">Schedule Treatment</h3>
              <button onClick={() => setIsBookingModalOpen(false)} className="p-2 hover:bg-white/10 rounded-xl transition-all"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <form onSubmit={handleBookingSubmit} className="p-8 space-y-6">
              <div className="p-5 bg-teal-50 rounded-[24px] border border-teal-100 shadow-inner flex flex-col gap-1">
                <span className="text-[10px] font-black text-teal-600 uppercase tracking-widest">Appointment Summary</span>
                <p className="text-lg font-black text-slate-800">{new Date(bookingData.date).toLocaleDateString('default', { weekday: 'long', month: 'short', day: 'numeric' })}</p>
                <div className="flex items-center gap-2 text-sm font-bold text-teal-700"><Icons.Calendar /> {bookingData.time} — Provider: {staff.find(s => s.id === bookingData.staffId)?.name}</div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 tracking-widest">Select Client</label>
                  <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-sm shadow-sm" value={bookingData.clientId} onChange={e => setBookingData({ ...bookingData, clientId: e.target.value })}>
                    <option value="guest">Walk-in / Guest</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 tracking-widest">Select Treatment</label>
                  <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-sm shadow-sm" value={bookingData.serviceId} onChange={e => setBookingData({ ...bookingData, serviceId: e.target.value })}>
                    {services.map(s => <option key={s.id} value={s.id}>{s.name} (${s.price})</option>)}
                  </select>
                </div>
              </div>
              <div className="pt-4 space-y-3">
                <button type="submit" className="w-full py-5 bg-teal-600 text-white font-black rounded-2xl shadow-xl shadow-teal-100 transition-all hover:bg-teal-700 active:scale-95">Save to Calendar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Status Modal */}
      {isStatusModalOpen && selectedAppointment && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] w-full max-w-sm shadow-2xl animate-scaleIn overflow-hidden">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-800 text-white">
              <h3 className="text-xl font-black">Manage Booking</h3>
              <button onClick={() => setIsStatusModalOpen(false)} className="p-2 hover:bg-white/10 rounded-xl transition-all"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <div className="p-8 space-y-3">
              <div className="mb-6 flex justify-between items-center">
                 <div>
                   <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Status</p>
                   <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${selectedAppointment.status === 'completed' ? 'bg-teal-100 text-teal-700' : 'bg-amber-100 text-amber-700'}`}>{selectedAppointment.status}</span>
                 </div>
                 {outletSettings.reminderEnabled && selectedAppointment.status === 'scheduled' && (
                    <button 
                      onClick={handleSendManualReminder}
                      disabled={isSendingReminder}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${selectedAppointment.reminderSent ? 'bg-amber-50 text-amber-600 border border-amber-200' : 'bg-indigo-600 text-white shadow-lg shadow-indigo-100 hover:bg-indigo-700'}`}
                    >
                      {isSendingReminder ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>}
                      {selectedAppointment.reminderSent ? 'Resend Reminder' : 'Send Reminder'}
                    </button>
                 )}
              </div>
              <button onClick={() => onUpdateStatus('scheduled')} className={`w-full py-4 rounded-2xl font-black transition-all ${selectedAppointment.status === 'scheduled' ? 'bg-teal-600 text-white shadow-lg' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}>Mark Scheduled</button>
              <button onClick={() => onUpdateStatus('completed')} className={`w-full py-4 rounded-2xl font-black transition-all ${selectedAppointment.status === 'completed' ? 'bg-teal-600 text-white shadow-lg' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}>Mark Completed</button>
              <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-slate-50">
                 <button onClick={() => onUpdateStatus('no-show')} className="py-4 bg-orange-50 text-orange-600 rounded-2xl font-black text-xs hover:bg-orange-100">No-Show</button>
                 <button onClick={() => onUpdateStatus('cancelled')} className="py-4 bg-rose-50 text-rose-600 rounded-2xl font-black text-xs hover:bg-rose-100">Cancel</button>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-100">
                <button 
                  type="button"
                  onClick={() => selectedAppointment?.id && handleDeleteAppointment(selectedAppointment.id)} 
                  disabled={!selectedAppointment?.id}
                  className="w-full py-4 bg-red-600 text-white rounded-2xl font-black text-sm hover:bg-red-700 transition-all shadow-lg shadow-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Delete Appointment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppointmentsCalendar;
