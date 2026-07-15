/**
 * ProfessionalList — a radiogroup with the recommended "Any available" option
 * first, followed by qualified staff cards.
 */
import React from 'react';
import type { PublicStaff } from '../../data/publicBookingTypes';
import { staffInitials } from '../../data/staffCatalogue';
import { ProfessionalCard } from './ProfessionalCard';

interface Props {
  staff: PublicStaff[];
  preference: 'any' | 'specific' | null;
  selectedStaffId: string | null;
  onSelectAny: () => void;
  onSelectStaff: (staff: PublicStaff) => void;
}

export function ProfessionalList({
  staff,
  preference,
  selectedStaffId,
  onSelectAny,
  onSelectStaff,
}: Props) {
  return (
    <div className="bgv2-pro-list" role="radiogroup" aria-label="Choose a professional">
      <ProfessionalCard
        title="Any available professional"
        subtitle="We'll assign the best available team member"
        initials="★"
        recommended
        selected={preference === 'any'}
        onSelect={onSelectAny}
      />
      {staff.map((member) => (
        <ProfessionalCard
          key={member.id}
          title={member.name}
          subtitle={member.role}
          photoUrl={member.photoUrl}
          initials={staffInitials(member.name)}
          selected={preference === 'specific' && selectedStaffId === member.id}
          onSelect={() => onSelectStaff(member)}
        />
      ))}
    </div>
  );
}
