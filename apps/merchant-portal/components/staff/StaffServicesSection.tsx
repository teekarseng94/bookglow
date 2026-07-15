import React from 'react';
import { StaffEditorSection } from './StaffEditorSection';

export interface StaffServicesSectionProps {
  selectedCount: number;
  children: React.ReactNode;
  toolbar?: React.ReactNode;
}

export const StaffServicesSection: React.FC<StaffServicesSectionProps> = ({
  selectedCount,
  children,
  toolbar,
}) => (
  <StaffEditorSection
    title="Qualified services"
    description={`${selectedCount} selected · services this staff member is trained to perform`}
  >
    {toolbar}
    {children}
  </StaffEditorSection>
);

export default StaffServicesSection;
