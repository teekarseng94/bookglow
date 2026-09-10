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
    description={`${selectedCount} selected · Services this staff can perform.`}
  >
    {toolbar}
    {children}
  </StaffEditorSection>
);

export default StaffServicesSection;
