import React, { useEffect, useId, useRef, useState } from 'react';
import { MoreVertical } from 'lucide-react';
import { cx } from '../ui/cx';

export interface InventoryEntityCardProps {
  thumbnail?: React.ReactNode;
  imageUrl?: string;
  fallback?: React.ReactNode;
  name: string;
  /** Middle meta line, e.g. "60 mins • Massage" */
  metaLabel: string;
  /** Right column under price, e.g. duration / stock / item count */
  secondaryLabel?: string;
  priceLabel: string;
  visible?: boolean;
  lowStock?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  actionsDisabled?: boolean;
  className?: string;
}

/**
 * Mobile inventory card — 4-column grid matching Menu & Inventory reference.
 * Desktop tables stay separate; this is md:hidden list only.
 */
export const InventoryEntityCard: React.FC<InventoryEntityCardProps> = ({
  thumbnail,
  imageUrl,
  fallback,
  name,
  metaLabel,
  secondaryLabel,
  priceLabel,
  visible,
  lowStock,
  onEdit,
  onDelete,
  actionsDisabled,
  className,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    setImgFailed(false);
  }, [imageUrl]);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  const statusClass =
    lowStock
      ? 'm-inventory-card__status m-inventory-card__status--low'
      : visible === false
        ? 'm-inventory-card__status m-inventory-card__status--hidden'
        : 'm-inventory-card__status';
  const statusLabel = lowStock ? 'Low stock' : visible === false ? 'Hidden' : 'Active';

  const media = (() => {
    if (thumbnail) return thumbnail;
    if (imageUrl && !imgFailed) {
      return (
        <img
          src={imageUrl}
          alt=""
          onError={() => setImgFailed(true)}
        />
      );
    }
    return fallback ?? null;
  })();

  return (
    <article className={cx('m-inventory-card', className)}>
      <div className="m-inventory-thumb" aria-hidden={media ? undefined : true}>
        {media}
      </div>

      <div className="m-inventory-card__body">
        <h3 className="m-inventory-card__title">{name}</h3>
        {metaLabel ? <p className="m-inventory-card__meta">{metaLabel}</p> : null}
        <span className={statusClass}>
          <span className="m-inventory-card__status-dot" aria-hidden />
          {statusLabel}
        </span>
      </div>

      <div className="m-inventory-card__price-col">
        <p className="m-inventory-card__price">{priceLabel}</p>
        {secondaryLabel ? (
          <p className="m-inventory-card__secondary">{secondaryLabel}</p>
        ) : null}
      </div>

      <div className="m-inventory-card__menu" ref={menuRef}>
        <button
          type="button"
          className="m-inventory-card__menu-btn focus-visible:shadow-ui-focus-strong"
          aria-label={`Actions for ${name}`}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          aria-controls={menuId}
          disabled={actionsDisabled || (!onEdit && !onDelete)}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <MoreVertical className="h-5 w-5" aria-hidden />
        </button>
        {menuOpen ? (
          <div id={menuId} role="menu" className="m-inventory-card__menu-panel">
            {onEdit ? (
              <button
                type="button"
                role="menuitem"
                className="m-inventory-card__menu-item"
                onClick={() => {
                  setMenuOpen(false);
                  onEdit();
                }}
              >
                Edit
              </button>
            ) : null}
            {onDelete ? (
              <button
                type="button"
                role="menuitem"
                className="m-inventory-card__menu-item m-inventory-card__menu-item--danger"
                onClick={() => {
                  setMenuOpen(false);
                  onDelete();
                }}
              >
                Delete
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  );
};

export default InventoryEntityCard;
