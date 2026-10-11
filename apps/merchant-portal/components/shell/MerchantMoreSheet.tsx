import React from 'react';
import { X } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { cx } from '../ui/cx';

export type MerchantMoreSheetItem = {
  id: string;
  label: string;
  icon: React.ReactNode;
  to: string;
  end?: boolean;
};

export interface MerchantMoreSheetProps {
  items: MerchantMoreSheetItem[];
  onClose: () => void;
  sheetRef?: React.Ref<HTMLDivElement>;
}

/** Secondary navigation sheet. Icon + title only; uniform 2-column tiles. */
export const MerchantMoreSheet: React.FC<MerchantMoreSheetProps> = ({ items, onClose, sheetRef }) => (
  <>
    <button type="button" className="bookglow-more-backdrop lg:hidden" aria-label="Close navigation" onClick={onClose} />
    <div
      ref={sheetRef}
      className="bookglow-more-sheet lg:hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bookglow-more-sheet-title"
    >
      <div className="bookglow-more-sheet__handle" aria-hidden />
      <div className="bookglow-more-sheet__header">
        <div>
          <p className="bookglow-eyebrow">Bookglow workspace</p>
          <h2 id="bookglow-more-sheet-title" className="bookglow-more-sheet__title">
            More pages
          </h2>
        </div>
        <button type="button" onClick={onClose} className="bookglow-icon-button" aria-label="Close navigation">
          <X className="h-5 w-5" aria-hidden />
        </button>
      </div>
      <div className="bookglow-more-sheet__grid">
        {items.map((item) => (
          <NavLink
            key={item.id}
            to={item.to}
            end={item.end}
            onClick={onClose}
            className={({ isActive: routeActive }) =>
              cx('bookglow-more-link', routeActive && 'bookglow-more-link--active')
            }
          >
            <span className="bookglow-more-link__icon" aria-hidden>
              {item.icon}
            </span>
            <span className="bookglow-more-link__label">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </div>
  </>
);

export default MerchantMoreSheet;
