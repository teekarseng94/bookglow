/** Weekday keys aligned with outlet businessHours. */
export const STAFF_WEEKDAYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;

export type StaffWeekday = (typeof STAFF_WEEKDAYS)[number];

export interface StaffDayHours {
  open: string;
  close: string;
  isOpen: boolean;
}

export type StaffWeeklyHours = Partial<Record<StaffWeekday, StaffDayHours>>;

export interface StaffPermissions {
  portalAccess: boolean;
  posAccess: boolean;
  manageStaff: boolean;
  editService: boolean;
  financeView: boolean;
  exportCrm: boolean;
  deleteTransaction: boolean;
}

export const STAFF_PERMISSION_DEFS: {
  key: keyof StaffPermissions;
  label: string;
  description: string;
}[] = [
  { key: 'portalAccess', label: 'Portal access', description: 'May use the merchant portal for this outlet.' },
  { key: 'posAccess', label: 'POS access', description: 'May take sales at the point of sale.' },
  { key: 'manageStaff', label: 'Manage staff', description: 'May edit staff profiles and role rates.' },
  { key: 'editService', label: 'Edit services', description: 'May change the service catalog.' },
  { key: 'financeView', label: 'Finance view', description: 'May view expenses and profit reports.' },
  { key: 'exportCrm', label: 'Export CRM', description: 'May export client data.' },
  { key: 'deleteTransaction', label: 'Edit/delete sales', description: 'May void or edit sales history.' },
];

export function defaultStaffPermissions(role = ''): StaffPermissions {
  const r = role.toLowerCase();
  const isManager = /admin|manager|owner|lead/.test(r);
  return {
    portalAccess: true,
    posAccess: true,
    manageStaff: isManager,
    editService: isManager,
    financeView: isManager,
    exportCrm: isManager,
    deleteTransaction: isManager,
  };
}

export function normalizeStaffPermissions(
  raw: Partial<StaffPermissions> | null | undefined,
  role = '',
): StaffPermissions {
  const base = defaultStaffPermissions(role);
  if (!raw || typeof raw !== 'object') return base;
  return {
    portalAccess: raw.portalAccess ?? base.portalAccess,
    posAccess: raw.posAccess ?? base.posAccess,
    manageStaff: raw.manageStaff ?? base.manageStaff,
    editService: raw.editService ?? base.editService,
    financeView: raw.financeView ?? base.financeView,
    exportCrm: raw.exportCrm ?? base.exportCrm,
    deleteTransaction: raw.deleteTransaction ?? base.deleteTransaction,
  };
}

export function emptyWeeklyHours(): StaffWeeklyHours {
  const hours: StaffWeeklyHours = {};
  for (const day of STAFF_WEEKDAYS) {
    const weekend = day === 'saturday' || day === 'sunday';
    hours[day] = {
      open: '10:00',
      close: '18:00',
      isOpen: !weekend,
    };
  }
  return hours;
}

export function normalizeWeeklyHours(
  raw: StaffWeeklyHours | null | undefined,
): StaffWeeklyHours | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const out: StaffWeeklyHours = {};
  let any = false;
  for (const day of STAFF_WEEKDAYS) {
    const d = raw[day];
    if (!d || typeof d !== 'object') continue;
    out[day] = {
      open: String(d.open || '10:00'),
      close: String(d.close || '18:00'),
      isOpen: d.isOpen !== false,
    };
    any = true;
  }
  return any ? out : undefined;
}

const DAY_LABEL: Record<StaffWeekday, string> = {
  monday: 'Mon',
  tuesday: 'Tue',
  wednesday: 'Wed',
  thursday: 'Thu',
  friday: 'Fri',
  saturday: 'Sat',
  sunday: 'Sun',
};

export function weekdayLabel(day: StaffWeekday): string {
  return DAY_LABEL[day];
}

/** JS getDay(): 0=Sun … 6=Sat → our weekday key */
export function weekdayFromDate(date = new Date()): StaffWeekday {
  const map: StaffWeekday[] = [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
  ];
  return map[date.getDay()];
}

export function formatShiftLabel(hours?: StaffWeeklyHours | null, date = new Date()): string {
  const normalized = normalizeWeeklyHours(hours ?? undefined);
  if (!normalized) return 'Hours not set';
  const day = weekdayFromDate(date);
  const slot = normalized[day];
  if (!slot || !slot.isOpen) return 'Off today';
  return `${slot.open} – ${slot.close}`;
}

export function permissionsSummary(perms: StaffPermissions): string {
  const allowed = STAFF_PERMISSION_DEFS.filter((d) => perms[d.key]).map((d) => d.label);
  if (allowed.length === 0) return 'No capabilities enabled';
  if (allowed.length <= 2) return allowed.join(', ');
  return `${allowed.slice(0, 2).join(', ')} +${allowed.length - 2}`;
}
