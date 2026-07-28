import React, { useEffect, useState } from 'react';
import { ChevronDown, Store } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUserContext } from '../../contexts/UserContext';
import { outletService } from '../../services/databaseService';
import { cx } from '../ui/cx';

export interface InventoryOutletCardProps {
  className?: string;
}

/**
 * Compact outlet selector for Menu & Inventory mobile chrome.
 * Uses live outlet name / address — never hardcodes demo values.
 */
export const InventoryOutletCard: React.FC<InventoryOutletCardProps> = ({ className }) => {
  const navigate = useNavigate();
  const { outletId, outletName } = useUserContext();
  const [locationLabel, setLocationLabel] = useState('');

  useEffect(() => {
    if (!outletId?.trim()) {
      setLocationLabel('');
      return;
    }
    let cancelled = false;
    outletService
      .getById(outletId)
      .then((outlet) => {
        if (cancelled) return;
        const address = (outlet?.addressDisplay || '').trim();
        const receipt = (outlet?.settings?.receiptAddress || '').trim();
        setLocationLabel(address || receipt || '');
      })
      .catch(() => {
        if (!cancelled) setLocationLabel('');
      });
    return () => {
      cancelled = true;
    };
  }, [outletId]);

  const displayName = (outletName || '').trim() || 'Current outlet';

  return (
    <button
      type="button"
      className={cx('m-inventory-outlet w-full text-left', className)}
      onClick={() => navigate('/settings')}
      aria-label={`Outlet: ${displayName}${locationLabel ? `, ${locationLabel}` : ''}. Open settings.`}
    >
      <span className="m-inventory-outlet__icon" aria-hidden>
        <Store className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="m-inventory-outlet__name block truncate">{displayName}</span>
        {locationLabel ? (
          <span className="m-inventory-outlet__loc block truncate">{locationLabel}</span>
        ) : null}
      </span>
      <ChevronDown className="h-5 w-5 shrink-0 text-[var(--text-muted)]" aria-hidden />
    </button>
  );
};

export default InventoryOutletCard;
