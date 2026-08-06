import type { Appointment, Staff } from '../types';

export const UNASSIGNED_STAFF_ID = '__unassigned__';

export function buildScheduleStaffColumns(staff: Staff[], appointments: Appointment[], date: string): Staff[] {
  const known = new Set(staff.map((member) => member.id));
  const needsUnassigned = appointments.some((appointment) =>
    appointment.date === date && (!appointment.staffId || !known.has(appointment.staffId))
  );
  return needsUnassigned
    ? [...staff, { id: UNASSIGNED_STAFF_ID, name: 'Unassigned', role: 'Needs assignment', outletID: '' } as Staff]
    : staff;
}

export function appointmentMatchesStaffColumn(appointment: Appointment, columnId: string, staff: Staff[]): boolean {
  if (columnId === UNASSIGNED_STAFF_ID) return !staff.some((member) => member.id === appointment.staffId);
  return appointment.staffId === columnId;
}
