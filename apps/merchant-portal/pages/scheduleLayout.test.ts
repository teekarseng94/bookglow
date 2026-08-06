import { describe, expect, it } from 'vitest';
import type { Appointment, Staff } from '../types';
import { appointmentMatchesStaffColumn, buildScheduleStaffColumns, UNASSIGNED_STAFF_ID } from './scheduleLayout';

const staff = [{ id: 'staff-a', name: 'Aisha', role: 'Therapist', outletID: 'outlet-a' }] as Staff[];
const appointment = (staffId: string): Appointment => ({
  id: `appointment-${staffId || 'none'}`, outletID: 'outlet-a', clientId: 'client-a', staffId,
  serviceId: 'service-a', date: '2026-08-06', time: '18:00', endTime: '18:30', status: 'scheduled',
});

describe('desktop schedule staff columns', () => {
  it('keeps an appointment in the column matching its real staff id', () => {
    expect(appointmentMatchesStaffColumn(appointment('staff-a'), 'staff-a', staff)).toBe(true);
    expect(appointmentMatchesStaffColumn(appointment('staff-a'), UNASSIGNED_STAFF_ID, staff)).toBe(false);
  });
  it('adds Unassigned for unknown staff without using the first staff column', () => {
    const unknown = appointment('missing-staff');
    expect(buildScheduleStaffColumns(staff, [unknown], unknown.date).at(-1)?.id).toBe(UNASSIGNED_STAFF_ID);
    expect(appointmentMatchesStaffColumn(unknown, UNASSIGNED_STAFF_ID, staff)).toBe(true);
    expect(appointmentMatchesStaffColumn(unknown, 'staff-a', staff)).toBe(false);
  });
});
