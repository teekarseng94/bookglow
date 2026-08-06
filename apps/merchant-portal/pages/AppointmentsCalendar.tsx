
import React, { useState, useMemo, useEffect, useRef, useLayoutEffect } from 'react';
import { Appointment, Staff, Client, Service, RoleCommission, OutletSettings } from '../types';
import { appointmentMatchesStaffColumn, buildScheduleStaffColumns, UNASSIGNED_STAFF_ID } from './scheduleLayout';
import { Icons } from '../constants';
import { generateReminderMessage } from '../services/geminiService';
import {
  ScheduleBookingDetailPanel,
  ScheduleDesktopDetailPanel,
  ScheduleBookingList,
  ScheduleDateStrip,
  ScheduleEmptyState,
  SchedulePageHeader,
  ScheduleSetupState,
  ScheduleToolbar,
  type ScheduleBookingDaySection,
  type ScheduleDesktopTab,
} from '../components/schedule';
import {
  AppModal,
  AppDrawer,
  Button,
  Field,
  fieldControlClassName,
  FormSection,
  ModalFooterActions,
} from '../components/ui';

interface AppointmentsCalendarProps {
  appointments: Appointment[];
  staff: Staff[];
  clients: Client[];
  services: Service[];
  roleCommissions: RoleCommission[];
  outletSettings: OutletSettings;
  onAddAppointment: (appointment: Appointment) => void | Promise<void | string | undefined>;
  onUpdateAppointmentStatus: (id: string, status: Appointment['status']) => void | Promise<void>;
  onDeleteAppointment: (id: string) => Promise<void>;
  onStartPOSSale: (appointment: Appointment) => void;
  onMarkReminderSent: (id: string) => void;
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

// ---- Mobile calendar helpers (UTC-based to stay consistent with ISO `selectedDate`) ----
const MON_INITIALS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'] as const;

const toISO = (d: Date): string => d.toISOString().split('T')[0];
const addDays = (iso: string, n: number): string => {
  const d = new Date(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return toISO(d);
};
// Monday-first week (7 ISO dates) containing `iso`.
const weekOf = (iso: string): string[] => {
  const d = new Date(iso);
  const dow = (d.getUTCDay() + 6) % 7; // Mon = 0
  const monday = addDays(iso, -dow);
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
};
// 6-row (42-cell) Monday-first month grid for the month containing `iso`.
const monthMatrix = (iso: string): { iso: string; date: number; inMonth: boolean }[] => {
  const d = new Date(iso);
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth();
  const first = new Date(Date.UTC(year, month, 1));
  const firstDow = (first.getUTCDay() + 6) % 7;
  const startIso = toISO(new Date(Date.UTC(year, month, 1 - firstDow)));
  return Array.from({ length: 42 }, (_, i) => {
    const cellIso = addDays(startIso, i);
    const cd = new Date(cellIso);
    return { iso: cellIso, date: cd.getUTCDate(), inMonth: cd.getUTCMonth() === month };
  });
};
const monthLabel = (iso: string): string =>
  new Date(iso).toLocaleDateString('default', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const dayHeadingLabel = (iso: string): string =>
  new Date(iso).toLocaleDateString('default', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });

// Stable pastel colour per booking (keyed by staff so a therapist keeps one colour).
const CARD_PALETTE = [
  { bg: 'bg-[var(--warning-soft)]', border: 'border-[var(--warning)]' },
  { bg: 'bg-[var(--success-soft)]', border: 'border-[var(--success)]' },
  { bg: 'bg-[var(--info-soft)]', border: 'border-[var(--info)]' },
  { bg: 'bg-[var(--danger-soft)]', border: 'border-[var(--danger)]' },
  { bg: 'bg-[var(--brand-soft)]', border: 'border-[var(--brand)]' },
];
const colorFor = (key: string) => {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return CARD_PALETTE[h % CARD_PALETTE.length];
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
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedStaffId, setSelectedStaffId] = useState<string>(staff[0]?.id || '');
  
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isSendingReminder, setIsSendingReminder] = useState(false);
  const agendaLoadMoreRef = useRef<HTMLDivElement | null>(null);
  const dateStripScrollRef = useRef<HTMLDivElement | null>(null);
  const dateStripLeftRef = useRef<HTMLDivElement | null>(null);
  const dateStripRightRef = useRef<HTMLDivElement | null>(null);
  const dateStripPrevWidthRef = useRef(0);
  const dateStripPrependingRef = useRef(false);
  const [mobileAgendaWeeks, setMobileAgendaWeeks] = useState(6);
  const [dateStripPastDays, setDateStripPastDays] = useState(30);
  const [dateStripFutureDays, setDateStripFutureDays] = useState(30);

  // Native mobile schedule state
  const [visibleDate, setVisibleDate] = useState<string>(selectedDate); // header/strip highlight (scroll-driven)
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const [pickerMonth, setPickerMonth] = useState<string>(selectedDate);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const [detailTab, setDetailTab] = useState<'details' | 'payments' | 'history'>('details');
  const [detailActionsOpen, setDetailActionsOpen] = useState(false);
  const [desktopDetailTab, setDesktopDetailTab] = useState<ScheduleDesktopTab>('details');
  const [now, setNow] = useState(() => new Date());
  const agendaContainerRef = useRef<HTMLDivElement | null>(null);
  const todayIso = new Date().toISOString().split('T')[0];

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const [bookingData, setBookingData] = useState({
    staffId: '',
    time: '',
    clientId: '',
    serviceId: '',
    date: ''
  });

  // Active appointments: hide cancelled and any legacy On Duty (app_onduty_) — only render real bookings (yellow-circle style).
  const activeAppointments = useMemo(
    () => appointments.filter(
      (a) => a.status !== 'cancelled' && typeof a.id === 'string' && !a.id.startsWith('app_onduty_')
    ),
    [appointments]
  );
  const scheduleReady = staff.length > 0 && services.length > 0;
  const desktopStaff = useMemo(
    () => buildScheduleStaffColumns(staff, activeAppointments, selectedDate),
    [staff, activeAppointments, selectedDate]
  );

  // Clear selectedAppointment if it was deleted (e.g., when sale was voided/deleted)
  // This prevents stale references and the "Appointment not found" warnings
  useEffect(() => {
    if (selectedAppointment && (isStatusModalOpen || mobileDetailOpen)) {
      const appointmentStillExists = appointments.some(a => a.id === selectedAppointment.id);
      if (!appointmentStillExists) {
        console.log('Selected appointment was deleted, closing modal automatically.');
        setIsStatusModalOpen(false);
        setMobileDetailOpen(false);
        setDetailActionsOpen(false);
        setSelectedAppointment(null);
      }
    }
  }, [appointments, selectedAppointment, isStatusModalOpen, mobileDetailOpen]);

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
    if (cat.includes('massage')) return 'bg-[var(--success-soft)] border-[var(--success)] text-[var(--success)]';
    if (cat.includes('facial') || cat.includes('skin')) return 'bg-[var(--danger-soft)] border-[var(--danger)] text-[var(--danger)]';
    if (cat.includes('nail') || cat.includes('mani') || cat.includes('pedi')) return 'bg-[var(--warning-soft)] border-[var(--warning)] text-[var(--warning)]';
    if (cat.includes('aroma') || cat.includes('oil')) return 'bg-[var(--brand-soft)] border-[var(--brand)] text-[var(--brand)]';
    if (cat.includes('package') || cat.includes('special')) return 'bg-[var(--success-soft)] border-[var(--success)] text-[var(--success)]';
    return 'bg-[var(--bg-soft)] border-[var(--line-strong)] text-[var(--text-secondary)]';
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

  // Sticky header/week-strip follows the day section currently below the header.
  useEffect(() => {
    const container = agendaContainerRef.current;
    if (!container || typeof window === 'undefined') return;
    const sections = Array.from(container.querySelectorAll<HTMLElement>('[data-agenda-date]'));
    if (sections.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const top = entries
          .filter((e) => e.isIntersecting)
          .map((e) => e.target as HTMLElement)
          .sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top)[0];
        const iso = top?.getAttribute('data-agenda-date');
        if (iso) setVisibleDate((prev) => (prev === iso ? prev : iso));
      },
      { root: null, rootMargin: '-116px 0px -72% 0px', threshold: 0 }
    );
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, [mobileAgendaDates]);

  // Tap a day (week strip / month grid): re-anchor the agenda to that date and scroll to top.
  const goToDate = (iso: string) => {
    setSelectedDate(iso);
    setVisibleDate(iso);
    setMonthPickerOpen(false);
    requestAnimationFrame(() => {
      agendaContainerRef.current?.closest('main')?.scrollTo({ top: 0, behavior: 'smooth' });
    });
  };

  const openMobileDetail = (app: Appointment) => {
    setSelectedAppointment(app);
    setDetailTab('details');
    setDetailActionsOpen(false);
    setMobileDetailOpen(true);
  };
  const closeMobileDetail = () => {
    setMobileDetailOpen(false);
    setDetailActionsOpen(false);
  };
  const handleCollectPayment = () => {
    if (!selectedAppointment) return;
    onStartPOSSale(selectedAppointment);
    closeMobileDetail();
  };

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

  const mobileAgendaSections = useMemo<ScheduleBookingDaySection[]>(() => {
    return mobileAgendaDates.map((date) => {
      const dayAppointments = appointmentsByDate.get(date) || [];
      return {
        date,
        heading: dayHeadingLabel(date),
        bookings: dayAppointments.map((app) => {
          const client = clients.find((c) => c.id === app.clientId);
          const service = services.find((s) => s.id === app.serviceId);
          const therapist = staff.find((s) => s.id === app.staffId);
          return {
            id: app.id,
            timeLabel: `${formatDisplayTime(app.time)}${app.endTime ? ` – ${formatDisplayTime(app.endTime)}` : ''}`,
            customerName: client?.name || 'Guest',
            serviceName: service?.name || 'Service',
            staffName: therapist?.name || outletSettings.shopName || 'Staff',
            status: app.status,
          };
        }),
      };
    });
  }, [mobileAgendaDates, appointmentsByDate, clients, services, staff, outletSettings.shopName]);

  const desktopDateLabel = useMemo(
    () =>
      new Date(selectedDate).toLocaleDateString('default', {
        month: 'long',
        year: 'numeric',
        day: viewMode === 'month' ? undefined : 'numeric',
      }),
    [selectedDate, viewMode],
  );

  const openMobileDetailById = (id: string) => {
    const app = activeAppointments.find((a) => a.id === id);
    if (app) openMobileDetail(app);
  };

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
    setDesktopDetailTab('details');
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

  if (!scheduleReady) {
    return (
      <div className="animate-fadeIn space-y-4 pb-24">
        <SchedulePageHeader />
        <ScheduleSetupState
          businessName={outletSettings.shopName}
          hasServices={services.length > 0}
          hasStaff={staff.length > 0}
        />
      </div>
    );
  }

  return (
    <div className="animate-fadeIn md:space-y-4 md:pb-24">
      <SchedulePageHeader
        dateLabel={desktopDateLabel}
        viewLabel={`${viewMode} view`}
        onNewBooking={handleQuickAddBooking}
      />

      <ScheduleToolbar
        viewMode={viewMode}
        selectedDate={selectedDate}
        onViewModeChange={setViewMode}
        onPrev={() => navigate('prev')}
        onNext={() => navigate('next')}
        onToday={setToday}
        onDateChange={setSelectedDate}
      />

      <div className="bg-[var(--bg-surface)] md:rounded-ui-lg md:border md:border-[var(--line)] md:shadow-ui-xs md:overflow-hidden md:min-h-[600px] flex flex-col">
        {viewMode === 'day' && (
          <>
          <ScheduleDateStrip
            weekDates={weekOf(visibleDate)}
            visibleDate={visibleDate}
            todayIso={todayIso}
            dayInitials={MON_INITIALS}
            monthLabel={monthLabel(visibleDate)}
            shopInitial={(outletSettings.shopName || 'A').charAt(0).toUpperCase()}
            onOpenMenu={() => window.dispatchEvent(new CustomEvent('bookglow:open-more-menu'))}
            onOpenMonthPicker={() => { setPickerMonth(visibleDate); setMonthPickerOpen(true); }}
            onSelectDate={goToDate}
          />

          <div ref={agendaContainerRef}>
            <ScheduleBookingList
              days={mobileAgendaSections}
              onSelectBooking={openMobileDetailById}
              loadMoreRef={agendaLoadMoreRef}
            />
          </div>

          <div className="hidden min-h-0 flex-1 md:flex">
            <div className="schedule-desktop-workspace min-w-0 flex-1 overflow-auto">
              <div className="relative min-w-[720px]" style={{ width: '100%', minWidth: `${72 + Math.max(desktopStaff.length, 1) * 170}px` }}>
                <div className="sticky top-0 z-30 grid h-[62px] border-b border-[var(--line)] bg-[var(--bg-surface)]" style={{ gridTemplateColumns: `72px repeat(${desktopStaff.length}, minmax(170px, 1fr))` }}>
                  <div className="sticky left-0 z-40 border-r border-[var(--line)] bg-[var(--bg-surface)]" />
                  {desktopStaff.map((member) => (
                    <div key={member.id} className="flex min-w-0 items-center gap-2.5 border-r border-[var(--line)] px-3">
                      {member.photoURL || member.profilePicture ? <img src={member.photoURL || member.profilePicture} alt="" className="h-9 w-9 rounded-full object-cover" /> :
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--brand-soft)] text-xs font-bold text-[var(--brand)]">{member.name.charAt(0)}</span>}
                      <div className="min-w-0"><p className="truncate text-[13px] font-semibold">{member.name}</p><p className="truncate text-[11px] text-[var(--text-muted)]">{member.role}</p></div>
                    </div>
                  ))}
                </div>
                <div className="relative" style={{ height: `${hours.length * 52}px` }}>
                  {hours.map((hour, index) => (
                    <div key={hour} className="absolute left-0 right-0 grid border-b border-[var(--line)]" style={{ top: `${index * 52}px`, height: '52px', gridTemplateColumns: `72px repeat(${desktopStaff.length}, minmax(170px, 1fr))` }}>
                      <div className="sticky left-0 z-20 border-r border-[var(--line)] bg-[var(--bg-surface)] px-2 pt-2 text-right text-[11px] text-[var(--text-muted)]">{hour}</div>
                      {desktopStaff.map((member) => <button key={member.id} type="button" disabled={member.id === UNASSIGNED_STAFF_ID} onClick={() => handleEmptySlotClick(member.id, hour, selectedDate)} className="border-r border-[var(--line)] hover:bg-[var(--bg-soft)]/50 disabled:cursor-default" aria-label={`Book ${member.name} at ${hour}`} />)}
                    </div>
                  ))}
                  {desktopStaff.flatMap((member, staffIndex) => activeAppointments.filter((app) => app.date === selectedDate && appointmentMatchesStaffColumn(app, member.id, staff)).map((app) => {
                    const service = services.find((item) => item.id === app.serviceId);
                    const client = clients.find((item) => item.id === app.clientId);
                    const [startH, startM] = app.time.split(':').map(Number);
                    const startOffset = startH * 60 + startM - 10 * 60;
                    const duration = service?.duration || (app.endTime ? (() => { const [h, m] = app.endTime!.split(':').map(Number); return h * 60 + m - (startH * 60 + startM); })() : 30);
                    const tones = {
                      scheduled: 'border-[var(--brand-border)] bg-[var(--brand-soft)] text-[var(--brand)]',
                      completed: 'border-[var(--success)]/20 bg-[var(--success-soft)] text-[var(--success)]',
                      confirmed: 'border-blue-200 bg-blue-50 text-blue-700',
                      'no-show': 'border-[var(--danger)]/20 bg-[var(--danger-soft)] text-[var(--danger)]',
                      cancelled: 'border-[var(--line)] bg-[var(--bg-soft)] text-[var(--text-muted)]',
                    };
                    return (
                      <button key={app.id} type="button" onClick={() => handleAppointmentClick(app)}
                        title={`${app.time}-${app.endTime || app.time} · ${client?.name || 'Guest'} · ${service?.name || 'Service'} · ${member.name} · ${app.status}`}
                        className={`absolute z-20 overflow-hidden rounded-lg border px-2 py-1.5 text-left transition-shadow hover:shadow-ui-sm ${tones[app.status]} ${selectedAppointment?.id === app.id ? 'ring-2 ring-[var(--brand)] ring-offset-1' : ''}`}
                        style={{ left: `calc(${staffIndex / desktopStaff.length * 100}% + ${72 * (1 - staffIndex / desktopStaff.length) + 5}px)`, width: `calc(${100 / desktopStaff.length}% - ${72 / desktopStaff.length + 10}px)`, top: `${Math.max(0, startOffset / 30 * 52) + 4}px`, height: `${Math.max(44, duration / 30 * 52 - 8)}px` }}>
                        <p className="truncate text-[10px] font-medium opacity-80">{app.time} – {app.endTime || app.time}</p>
                        <p className="truncate text-[13px] font-semibold text-[var(--text-primary)]">{client?.name || 'Guest'}</p>
                        {duration > 30 ? <p className="truncate text-[11px] text-[var(--text-secondary)]">{service?.name || 'Service'}</p> : null}
                        <p className="truncate text-[10px] font-semibold capitalize">● {app.status === 'no-show' ? 'No-show' : app.status}</p>
                      </button>
                    );
                  }))}
                  {selectedDate === todayIso && now.getHours() * 60 + now.getMinutes() >= 10 * 60 ? (
                    <div className="pointer-events-none absolute z-10 h-px bg-[var(--danger)]" style={{ left: '72px', right: 0, top: `${(now.getHours() * 60 + now.getMinutes() - 10 * 60) / 30 * 52}px` }}>
                      <span className="absolute -left-1 -top-1 h-2 w-2 rounded-full bg-[var(--danger)]" />
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
            {selectedAppointment ? (
              <ScheduleDesktopDetailPanel appointment={selectedAppointment}
                client={clients.find((item) => item.id === selectedAppointment.clientId)}
                service={services.find((item) => item.id === selectedAppointment.serviceId)}
                staff={staff.find((item) => item.id === selectedAppointment.staffId)}
                tab={desktopDetailTab} onTabChange={setDesktopDetailTab}
                onClose={() => setSelectedAppointment(null)}
                onStatusChange={onUpdateStatus}
                onCollectPayment={handleCollectPayment} />
            ) : null}
          </div>
          </>
        )}

        {viewMode !== 'day' && (
          <div className="p-6">
            <ScheduleEmptyState
              title={`${viewMode.charAt(0).toUpperCase()}${viewMode.slice(1)} view`}
              description="Switch to Day view for the full staff schedule workspace and booking actions."
              action={
                <button
                  type="button"
                  className="text-sm font-semibold text-[var(--brand)]"
                  onClick={() => setViewMode('day')}
                >
                  Open Day view
                </button>
              }
            />
          </div>
        )}
      </div>

      {/* Mobile income bar (above bottom nav) + floating add button */}
      {!mobileDetailOpen && (
        <>
          <div className="m-schedule-income-bar md:hidden fixed left-0 right-0 bottom-[calc(var(--mobile-bottom-nav-height)+var(--mobile-safe-area-bottom))] z-40 border-t border-[var(--line)] bg-[var(--bg-surface)] flex items-center justify-between">
            <span className="m-schedule-income-label">This week&apos;s income</span>
            <span className="m-schedule-income-value">RM{thisWeekIncome.toFixed(0)}</span>
          </div>
          <button
            type="button"
            onClick={handleQuickAddBooking}
            className="m-fab m-fab--above-sticky m-schedule-fab md:hidden z-50 active:scale-95 transition-transform"
            aria-label="Quick add booking"
          >
            <span className="m-schedule-fab__plus leading-none" aria-hidden>
              +
            </span>
          </button>
        </>
      )}

      <AppModal
        open={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        title="Schedule Treatment"
        description="Confirm client and treatment for this slot."
        size="md"
        zIndexClass="z-[100]"
        asForm
        formId="schedule-booking-form"
        onSubmit={handleBookingSubmit}
        footer={
          <ModalFooterActions>
            <Button variant="secondary" onClick={() => setIsBookingModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="schedule-booking-form">
              Save to Calendar
            </Button>
          </ModalFooterActions>
        }
      >
        <div className="rounded-ui-md border border-[var(--line)] bg-[var(--brand-soft)] px-4 py-3 space-y-1">
          <p className="text-app-label font-bold uppercase text-[var(--brand)]">Appointment Summary</p>
          <p className="text-base font-bold text-[var(--text-primary)]">
            {new Date(bookingData.date).toLocaleDateString('default', {
              weekday: 'long',
              month: 'short',
              day: 'numeric',
            })}
          </p>
          <p className="text-sm font-semibold text-[var(--brand-deep)] flex items-center gap-2">
            <Icons.Calendar /> {bookingData.time} —{' '}
            {staff.find((s) => s.id === bookingData.staffId)?.name}
          </p>
        </div>
        <FormSection>
          <Field id="booking-client" label="Select Client" required>
            <select
              id="booking-client"
              className={fieldControlClassName}
              value={bookingData.clientId}
              onChange={(e) => setBookingData({ ...bookingData, clientId: e.target.value })}
            >
              <option value="guest">Walk-in / Guest</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field id="booking-service" label="Select Treatment" required>
            <select
              id="booking-service"
              className={fieldControlClassName}
              value={bookingData.serviceId}
              onChange={(e) => setBookingData({ ...bookingData, serviceId: e.target.value })}
            >
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} (${s.price})
                </option>
              ))}
            </select>
          </Field>
        </FormSection>
      </AppModal>

      <AppModal
        open={isStatusModalOpen && !!selectedAppointment}
        onClose={() => setIsStatusModalOpen(false)}
        title="Manage Booking"
        description="Update status, send a reminder, or remove this appointment."
        size="sm"
        zIndexClass="z-[100]"
        footer={
          <ModalFooterActions>
            <Button variant="secondary" onClick={() => setIsStatusModalOpen(false)}>
              Close
            </Button>
          </ModalFooterActions>
        }
      >
        {selectedAppointment ? (
          <div className="space-y-3">
            <div className="flex justify-between items-start gap-3">
              <div>
                <p className="text-app-label font-bold uppercase text-[var(--text-muted)] mb-1">Status</p>
                <span
                  className={`m-calendar-status inline-flex ${
                    selectedAppointment.status === 'completed'
                      ? 'bg-[var(--brand-soft)] text-[var(--brand-deep)]'
                      : 'bg-[var(--warning-soft)] text-[var(--warning)]'
                  }`}
                >
                  {selectedAppointment.status}
                </span>
              </div>
              {outletSettings.reminderEnabled && selectedAppointment.status === 'scheduled' && (
                <Button
                  size="sm"
                  variant={selectedAppointment.reminderSent ? 'outline' : 'primary'}
                  onClick={handleSendManualReminder}
                  disabled={isSendingReminder}
                >
                  {isSendingReminder
                    ? 'Sending…'
                    : selectedAppointment.reminderSent
                      ? 'Resend Reminder'
                      : 'Send Reminder'}
                </Button>
              )}
            </div>
            <Button
              fullWidth
              variant={selectedAppointment.status === 'scheduled' ? 'primary' : 'secondary'}
              onClick={() => onUpdateStatus('scheduled')}
            >
              Mark Scheduled
            </Button>
            <Button
              fullWidth
              variant={selectedAppointment.status === 'completed' ? 'primary' : 'secondary'}
              onClick={() => onUpdateStatus('completed')}
            >
              Mark Completed
            </Button>
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[var(--line)]">
              <Button variant="outline" onClick={() => onUpdateStatus('no-show')}>
                No-Show
              </Button>
              <Button variant="outline" onClick={() => onUpdateStatus('cancelled')}>
                Cancel Booking
              </Button>
            </div>
            <div className="pt-2 border-t border-[var(--line)]">
              <Button
                fullWidth
                variant="danger"
                onClick={() => selectedAppointment?.id && handleDeleteAppointment(selectedAppointment.id)}
                disabled={!selectedAppointment?.id}
              >
                Delete Appointment
              </Button>
            </div>
          </div>
        ) : null}
      </AppModal>

      <AppDrawer
        open={monthPickerOpen}
        onClose={() => setMonthPickerOpen(false)}
        title={monthLabel(pickerMonth)}
        variant="fullscreen"
        zIndexClass="z-[80] md:hidden"
        headerActions={
          <>
            <button
              type="button"
              onClick={() => {
                const d = new Date(pickerMonth);
                d.setUTCMonth(d.getUTCMonth() - 1, 1);
                setPickerMonth(toISO(d));
              }}
              className="min-w-[44px] min-h-[44px] grid place-items-center rounded-ui-sm text-[var(--text-secondary)] hover:bg-[var(--bg-soft)]"
              aria-label="Previous month"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => {
                const d = new Date(pickerMonth);
                d.setUTCMonth(d.getUTCMonth() + 1, 1);
                setPickerMonth(toISO(d));
              }}
              className="min-w-[44px] min-h-[44px] grid place-items-center rounded-ui-sm text-[var(--text-secondary)] hover:bg-[var(--bg-soft)]"
              aria-label="Next month"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        }
      >
        <div className="grid grid-cols-7 gap-y-1">
          {MON_INITIALS.map((m, i) => (
            <div key={i} className="text-center text-xs font-semibold text-[var(--text-muted)]">
              {m}
            </div>
          ))}
          {monthMatrix(pickerMonth).map((cell) => {
            const isSel = cell.iso === visibleDate;
            const isToday = cell.iso === todayIso;
            return (
              <button
                key={cell.iso}
                type="button"
                onClick={() => goToDate(cell.iso)}
                className="flex justify-center py-1"
              >
                <span
                  className={`w-10 h-10 rounded-ui-sm flex items-center justify-center text-base font-medium transition-colors ${
                    isSel
                      ? 'bg-[var(--brand)] text-white'
                      : !cell.inMonth
                        ? 'text-[var(--text-muted)]'
                        : isToday
                          ? 'text-[var(--brand)] font-bold'
                          : 'text-[var(--text-primary)]'
                  }`}
                >
                  {cell.date}
                </span>
              </button>
            );
          })}
        </div>
      </AppDrawer>

      {/* ===== Mobile full-screen booking detail (Overview) ===== */}
      {selectedAppointment && (() => {
        const app = selectedAppointment;
        const client = clients.find((c) => c.id === app.clientId);
        const service = services.find((s) => s.id === app.serviceId);
        const therapist = staff.find((s) => s.id === app.staffId);
        const color = colorFor(app.staffId || app.id);
        const dotBg = color.border.replace('border', 'bg');
        const dateLabel = new Date(app.date).toLocaleDateString('default', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
        const isCompleted = app.status === 'completed';
        return (
          <ScheduleBookingDetailPanel
            open={mobileDetailOpen}
            serviceName={service?.name || 'Service'}
            servicePriceLabel={`RM${Number(service?.price || 0).toFixed(0)}`}
            serviceDurationLabel={`${service?.duration || 0} minutes`}
            dateTimeLabel={`${dateLabel} · ${formatDisplayTime(app.time)} - ${formatDisplayTime(app.endTime || app.time)}`}
            customerName={client?.name || 'Guest'}
            customerEmail={client?.email}
            customerPhone={client?.phone}
            staffName={therapist?.name || outletSettings.shopName || 'Staff'}
            bookingId={app.id}
            status={app.status}
            reminderSent={Boolean(app.reminderSent)}
            sourceLabel={app.isOnDuty ? 'POS sale' : 'Manual booking'}
            accentDotClassName={dotBg}
            isCompleted={isCompleted}
            detailTab={detailTab}
            actionsOpen={detailActionsOpen}
            reminderEnabled={Boolean(outletSettings.reminderEnabled)}
            onClose={closeMobileDetail}
            onOpenActions={() => setDetailActionsOpen(true)}
            onCloseActions={() => setDetailActionsOpen(false)}
            onTabChange={setDetailTab}
            onCollectPayment={handleCollectPayment}
            onCopyBookingId={() => navigator.clipboard?.writeText(app.id)}
            onMarkCompleted={() => { onUpdateStatus('completed'); closeMobileDetail(); }}
            onMarkScheduled={() => { onUpdateStatus('scheduled'); closeMobileDetail(); }}
            onMarkNoShow={() => { onUpdateStatus('no-show'); closeMobileDetail(); }}
            onCancel={() => { onUpdateStatus('cancelled'); closeMobileDetail(); }}
            onDelete={() => { if (app.id) handleDeleteAppointment(app.id); }}
            onSendReminder={() => { setDetailActionsOpen(false); handleSendManualReminder(); }}
          />
        );
      })()}
    </div>
  );
};

export default AppointmentsCalendar;
