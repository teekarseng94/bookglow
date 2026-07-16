import React from 'react';
import { StaffEditorSection } from './StaffEditorSection';

export interface StaffProfileSectionProps {
  children: React.ReactNode;
  photoSlot?: React.ReactNode;
}

export const StaffProfileSection: React.FC<StaffProfileSectionProps> = ({
  children,
  photoSlot,
}) => (
  <StaffEditorSection title="Profile" description="Identity and contact details for this team member.">
    {photoSlot}
    <div className="space-y-4">{children}</div>
  </StaffEditorSection>
);

export default StaffProfileSection;
