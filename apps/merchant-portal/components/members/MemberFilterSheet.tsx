import React from 'react';
import { Sheet } from '../ui/Sheet';
import { Button } from '../ui/Button';

export interface MemberFilterSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

/** Mobile actions / filters sheet — parent owns handlers. */
export const MemberFilterSheet: React.FC<MemberFilterSheetProps> = ({
  open,
  onClose,
  title = 'Member actions',
  children,
}) => (
  <Sheet
    open={open}
    onClose={onClose}
    title={title}
    side="bottom"
    footer={
      <Button fullWidth variant="secondary" onClick={onClose}>
        Cancel
      </Button>
    }
  >
    {children}
  </Sheet>
);

export default MemberFilterSheet;
