import React from 'react';
import { cx } from './cx';

export interface FormGridProps {
  children: React.ReactNode;
  columns?: 1 | 2;
  className?: string;
}

/**
 * Form field grid that adds a second column only when its container is wide enough.
 */
export const FormGrid: React.FC<FormGridProps> = ({ children, columns = 2, className }) => (
  <div className={cx('m-form-grid', columns === 2 && 'm-form-grid--2', className)}>
    {children}
  </div>
);

export default FormGrid;
