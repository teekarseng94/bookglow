import React from 'react';
import { StaffEditorSection } from './StaffEditorSection';

export interface StaffProfileSectionProps {
  children: React.ReactNode;
  photoSlot?: React.ReactNode;
<<<<<<< HEAD
=======
  description?: string;
>>>>>>> 27312fa3951009f3285eb2f65a1e2fd20d5a8dda
}

export const StaffProfileSection: React.FC<StaffProfileSectionProps> = ({
  children,
  photoSlot,
<<<<<<< HEAD
}) => (
  <StaffEditorSection title="Profile" description="Identity and contact details for this team member.">
    {photoSlot}
    <div className="space-y-4">{children}</div>
=======
  description = 'Name and photo for this team member.',
}) => (
  <StaffEditorSection title="Profile" description={description}>
    {photoSlot}
    <div className="space-y-3">{children}</div>
>>>>>>> 27312fa3951009f3285eb2f65a1e2fd20d5a8dda
  </StaffEditorSection>
);

export default StaffProfileSection;
