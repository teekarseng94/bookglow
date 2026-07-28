import React from 'react';
import { StaffEditorSection } from './StaffEditorSection';

export interface StaffProfileSectionProps {
  children: React.ReactNode;
  photoSlot?: React.ReactNode;
  description?: string;
}

export const StaffProfileSection: React.FC<StaffProfileSectionProps> = ({
  children,
  photoSlot,
  description = 'Name and photo for this team member.',
}) => (
  <StaffEditorSection title="Profile" description={description}>
    {photoSlot}
    <div className="space-y-3">{children}</div>
  </StaffEditorSection>
);

export default StaffProfileSection;
