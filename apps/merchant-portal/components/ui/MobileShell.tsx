import React from 'react';
import { AppSheet, type AppSheetProps } from './AppSheet';
import { cx } from './cx';
import { OverlayTabs } from './OverlayTabs';
import { PageHeader, type PageHeaderProps } from './PageHeader';
import { StickyActionBar, type StickyActionBarProps } from './StickyActionBar';

export { EmptyState } from './EmptyState';
export { ErrorState } from './ErrorState';
export { LoadingSkeleton as LoadingState } from './LoadingSkeleton';

export type MobilePageShellProps = {
  children: React.ReactNode;
  className?: string;
  withStickyAction?: boolean;
};

/** Page wrapper that keeps content inside the viewport and clears the bottom nav. */
export const MobilePageShell: React.FC<MobilePageShellProps> = ({
  children,
  className,
  withStickyAction = false,
}) => (
  <div
    className={cx(
      'm-mobile-page-shell min-w-0 overflow-x-hidden',
      withStickyAction ? 'm-page-with-sticky-action' : 'm-page-with-bottom-nav',
      className,
    )}
  >
    {children}
  </div>
);

export type MobileHeaderProps = PageHeaderProps;

export const MobileHeader: React.FC<MobileHeaderProps> = ({ className, ...props }) => (
  <PageHeader className={cx('min-w-0', className)} {...props} />
);

export type MobileScrollAreaProps = {
  children: React.ReactNode;
  className?: string;
};

export const MobileScrollArea: React.FC<MobileScrollAreaProps> = ({ children, className }) => (
  <div className={cx('m-mobile-scroll-area min-h-0 min-w-0 overflow-x-hidden overflow-y-auto overscroll-contain', className)}>
    {children}
  </div>
);

export type BottomActionBarProps = StickyActionBarProps;
export const BottomActionBar = StickyActionBar;

export type SafeAreaSpacerProps = {
  position?: 'top' | 'bottom';
  className?: string;
};

export const SafeAreaSpacer: React.FC<SafeAreaSpacerProps> = ({ position = 'bottom', className }) => (
  <div
    aria-hidden
    className={cx('m-safe-area-spacer shrink-0 pointer-events-none', className)}
    data-position={position}
  />
);

export const ResponsiveTabs = OverlayTabs;

export type MobileFilterSheetProps = Pick<
  AppSheetProps,
  'open' | 'onClose' | 'title' | 'description' | 'children' | 'footer' | 'busy' | 'className'
>;

/** Mobile-first bottom sheet for filters, sort, and compact option lists. */
export const MobileFilterSheet: React.FC<MobileFilterSheetProps> = ({
  open,
  onClose,
  title = 'Filters',
  description,
  children,
  footer,
  busy,
  className,
}) => (
  <AppSheet
    open={open}
    onClose={onClose}
    title={title}
    description={description}
    footer={footer}
    busy={busy}
    side="bottom"
    showHandle
    className={cx('m-mobile-filter-sheet', className)}
  >
    {children}
  </AppSheet>
);

export default MobilePageShell;
