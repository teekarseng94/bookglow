import React from 'react';
import { Button } from '../ui/Button';
import { StaffStatusBadge, type StaffStatusKind } from './StaffStatusBadge';
import { StaffScheduleSection } from './StaffScheduleSection';
import { StaffPermissionSection } from './StaffPermissionSection';
import { StaffCommissionSection } from './StaffCommissionSection';
import { cx } from '../ui/cx';
import type { StaffPermissions, StaffWeeklyHours } from '../../utils/staffExtras';
import { formatShiftLabel, normalizeStaffPermissions } from '../../utils/staffExtras';
import { formatMYR } from '../../utils/staffPerformance';

export type StaffDetailTab =
  | 'overview'
  | 'schedule'
  | 'services'
  | 'performance'
  | 'permissions'
  | 'payroll';

export interface StaffHistoryLine {
  name: string;
  date: string;
  price: number;
  quantity: number;
  commissionEarned?: number;
  type?: string;
}

export interface StaffDetailMember {
  id: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  createdAt?: string;
  profilePicture?: string | null;
  qualifiedServices?: string[];
  totalServices: number;
  totalRevenue: number;
  totalCommission: number;
  history: StaffHistoryLine[];
  status: StaffStatusKind;
  weeklyHours?: StaffWeeklyHours;
  permissions?: StaffPermissions;
}

export interface StaffDetailPanelProps {
  member: StaffDetailMember | null;
  tab: StaffDetailTab;
  onTabChange: (tab: StaffDetailTab) => void;
  serviceNames: string[];
  roleRatePercent?: number | null;
  periodControls?: React.ReactNode;
  onEdit?: () => void;
  onDelete?: () => void;
  onManageRates?: () => void;
  /** Mobile list→detail: show back control */
  onBack?: () => void;
  locked?: boolean;
  className?: string;
}

const TABS: { id: StaffDetailTab; label: string; shortLabel: string }[] = [
  { id: 'overview', label: 'Overview', shortLabel: 'Overview' },
  { id: 'schedule', label: 'Schedule', shortLabel: 'Hours' },
  { id: 'services', label: 'Services', shortLabel: 'Skills' },
  { id: 'performance', label: 'Performance', shortLabel: 'Stats' },
  { id: 'permissions', label: 'Permissions', shortLabel: 'Access' },
  { id: 'payroll', label: 'Payroll & Commission', shortLabel: 'Payroll' },
];

function HistoryTable({ history }: { history: StaffHistoryLine[] }) {
  return (
    <>
      <div className="sm:hidden space-y-2">
        {history.map((item, idx) => (
          <div key={idx} className="rounded-ui-md border border-[var(--line)] px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-bold text-[var(--text-primary)] leading-snug">{item.name}</p>
                <p className="m-staff-card__meta mt-0.5">
                  {new Date(item.date).toLocaleDateString()}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="m-staff-stat-value text-emerald-600 tabular-nums">
                  {formatMYR(item.commissionEarned ?? 0)}
                </p>
                <p className="m-staff-card__meta tabular-nums">
                  Price {formatMYR(item.price)}
                </p>
              </div>
            </div>
          </div>
        ))}
        {history.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-sm font-semibold text-[var(--text-muted)]">No service history yet.</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">No service activity in this period.</p>
          </div>
        )}
      </div>

      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="m-staff-section-title">
              <th className="pb-3">Date</th>
              <th className="pb-3">Treatment</th>
              <th className="pb-3 text-right">Price</th>
              <th className="pb-3 text-right">Commission</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--line)]">
            {history.map((item, idx) => (
              <tr key={idx}>
                <td className="py-3 text-xs font-bold text-[var(--text-secondary)]">
                  {new Date(item.date).toLocaleDateString()}
                </td>
                <td className="py-3 text-sm font-bold text-[var(--text-primary)]">{item.name}</td>
                <td className="py-3 text-sm font-bold text-[var(--text-secondary)] text-right tabular-nums">
                  {formatMYR(item.price)}
                </td>
                <td className="py-3 m-staff-stat-value text-emerald-600 text-right tabular-nums">
                  {formatMYR(item.commissionEarned ?? 0)}
                  {item.type === 'product' && item.commissionEarned ? (
                    <span className="ml-2 inline-flex items-center rounded-full bg-[var(--bg-soft)] m-staff-card__role text-[var(--text-muted)]">
                      Fixed
                    </span>
                  ) : null}
                </td>
              </tr>
            ))}
            {history.length === 0 && (
              <tr>
                <td colSpan={4} className="py-12 text-center text-[var(--text-muted)] italic text-sm">
                  No service activity in this period.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

export const StaffDetailPanel: React.FC<StaffDetailPanelProps> = ({
  member,
  tab,
  onTabChange,
  serviceNames,
  roleRatePercent,
  periodControls,
  onEdit,
  onDelete,
  onManageRates,
  onBack,
  locked,
  className,
}) => {
  if (!member) {
    return (
      <div
        className={cx(
          'hidden xl:flex bg-[var(--bg-surface)] rounded-ui-lg border border-dashed border-[var(--line)]',
          'p-12 flex-col items-center justify-center text-center min-h-[480px]',
          className,
        )}
      >
        <h3 className="text-lg font-bold text-[var(--text-muted)]">Select a staff member</h3>
        <p className="text-sm text-[var(--text-muted)] mt-1 max-w-sm">
          Review profile, services, performance, and commission from the directory.
        </p>
      </div>
    );
  }

  const joined =
    member.createdAt && !Number.isNaN(Date.parse(member.createdAt))
      ? new Date(member.createdAt).toLocaleDateString(undefined, {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
      : '—';

  return (
    <div
      className={cx(
        'bg-[var(--bg-surface)] rounded-ui-lg border border-[var(--line)] shadow-ui-xs overflow-hidden flex flex-col',
        'min-h-[calc(100vh-8rem)] xl:min-h-[520px]',
        className,
      )}
    >
      {onBack ? (
        <div className="xl:hidden flex items-center gap-2 px-3 pt-3">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 min-h-[40px] px-2 rounded-ui-sm text-sm font-bold text-[var(--brand)] hover:bg-[var(--brand-soft)]"
          >
            <span aria-hidden>‹</span> Staff & Team
          </button>
        </div>
      ) : null}

      <div className="p-4 sm:p-5 border-b border-[var(--line)]">
        <div className="flex justify-between items-start gap-3">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-[var(--brand-soft)] text-[var(--brand-deep)] flex items-center justify-center font-bold overflow-hidden shrink-0 border-2 border-white shadow-ui-sm">
              {member.profilePicture ? (
                <img src={member.profilePicture} alt="" className="w-full h-full object-cover" />
              ) : (
                member.name.charAt(0)
              )}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="m-staff-detail-name sm:text-xl text-[var(--text-primary)] truncate">
                  {member.name}
                </h3>
                <StaffStatusBadge status={member.status} />
              </div>
              <p className="text-sm font-semibold text-[var(--text-secondary)] mt-0.5">{member.role}</p>
              <p className="m-staff-card__meta text-[var(--brand)] mt-1">
                Today · {formatShiftLabel(member.weeklyHours)}
              </p>
              <p className="m-staff-card__meta mt-0.5">Joined {joined}</p>
              <p className="m-staff-card__meta sm:text-xs mt-0.5 truncate">
                {[member.phone, member.email].filter(Boolean).join(' · ') || 'No contact details'}
              </p>
            </div>
          </div>
          {!locked && (
            <div className="hidden sm:flex flex-wrap gap-2 shrink-0">
              {onEdit ? (
                <Button type="button" variant="secondary" size="sm" onClick={onEdit}>
                  Edit Staff
                </Button>
              ) : null}
              {onDelete ? (
                <details className="relative">
                  <summary
                    className="list-none w-9 h-9 rounded-ui-sm border border-[var(--line)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-soft)] inline-flex items-center justify-center cursor-pointer text-xl leading-none"
                    aria-label="More staff actions"
                  >
                    ⋯
                  </summary>
                  <div className="absolute right-0 top-10 z-20 min-w-[140px] rounded-ui-md border border-[var(--line)] bg-[var(--bg-surface)] p-1 shadow-ui-md">
                    {onEdit ? (
                      <button
                        type="button"
                        onClick={onEdit}
                        className="w-full rounded-ui-sm px-3 py-2 text-left text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-soft)]"
                      >
                        Edit
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={onDelete}
                      className="w-full rounded-ui-sm px-3 py-2 text-left text-sm font-semibold text-red-600 hover:bg-red-50"
                    >
                      Remove
                    </button>
                  </div>
                </details>
              ) : null}
            </div>
          )}
        </div>
      </div>

      <div className="px-3 sm:px-4 border-b border-[var(--line)] overflow-x-auto">
        <nav
          className="grid grid-cols-2 sm:flex sm:flex-nowrap sm:gap-0.5 sm:min-w-max"
          aria-label="Staff profile sections"
        >
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onTabChange(t.id)}
              aria-label={t.label}
              title={t.label}
              className={cx(
                'm-staff-tab px-2 py-2.5 text-center sm:px-2.5 sm:py-2.5 sm:text-xs sm:text-left',
                'border-b-2 transition-colors min-w-0',
                tab === t.id
                  ? 'border-[var(--brand)] text-[var(--brand)]'
                  : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]',
              )}
            >
              <span className="sm:hidden truncate block">{t.shortLabel}</span>
              <span className="hidden sm:inline whitespace-nowrap">{t.label}</span>
            </button>
          ))}
        </nav>
      </div>

      <div className="flex-1 p-4 sm:p-5 overflow-y-auto pb-24 sm:pb-5">
        {tab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
            <section className="rounded-ui-md border border-[var(--line)] p-4 space-y-3">
              <h4 className="m-staff-section-title">
                About
              </h4>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-[var(--text-muted)]">Staff ID</dt>
                  <dd className="max-w-[70%] font-mono text-xs font-semibold text-[var(--text-secondary)] truncate" title={member.id}>
                    {member.id}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-[var(--text-muted)]">Joined</dt>
                  <dd className="font-semibold text-[var(--text-primary)]">{joined}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-[var(--text-muted)]">Role</dt>
                  <dd className="font-semibold text-[var(--text-primary)]">{member.role}</dd>
                </div>
              </dl>
            </section>

            <section className="rounded-ui-md border border-[var(--line)] p-4 space-y-3">
              <h4 className="m-staff-section-title">
                Performance snapshot
              </h4>
              <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                <div className="min-w-0 overflow-hidden rounded-ui-sm bg-[var(--bg-soft)] p-2 sm:p-3 text-center">
                  <p className="m-staff-kpi-label truncate">Services</p>
                  <p className="m-staff-kpi-value tabular-nums mt-0.5 truncate">{member.totalServices}</p>
                </div>
                <div className="min-w-0 overflow-hidden rounded-ui-sm bg-[var(--bg-soft)] p-2 sm:p-3 text-center">
                  <p className="m-staff-kpi-label truncate">Revenue</p>
                  <p className="m-staff-kpi-value tabular-nums mt-0.5 truncate">
                    {formatMYR(member.totalRevenue)}
                  </p>
                </div>
                <div className="min-w-0 overflow-hidden rounded-ui-sm bg-[var(--brand-soft)] p-2 sm:p-3 text-center">
                  <p className="m-staff-kpi-label text-[var(--brand)] truncate" title="Commission">
                    Commission
                  </p>
                  <p className="m-staff-kpi-value tabular-nums text-emerald-600 mt-0.5 whitespace-nowrap">
                    {formatMYR(member.totalCommission)}
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-ui-md border border-[var(--line)] p-4 space-y-3">
              <h4 className="m-staff-section-title">
                Qualified services
              </h4>
              {serviceNames.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {serviceNames.slice(0, 12).map((name) => (
                    <span
                      key={name}
                      className="m-staff-chip bg-[var(--brand-soft)] text-[var(--brand-deep)]"
                    >
                      {name}
                    </span>
                  ))}
                  {serviceNames.length > 12 ? (
                    <span className="m-staff-chip bg-[var(--bg-soft)] text-[var(--text-muted)]">
                      +{serviceNames.length - 12} more
                    </span>
                  ) : null}
                </div>
              ) : (
                <p className="text-xs text-[var(--text-secondary)]">
                  Qualified for all outlet services (no restrictions set).
                </p>
              )}
            </section>

            <section className="rounded-ui-md border border-[var(--line)] p-4 space-y-3">
              <h4 className="m-staff-section-title">
                Commission
              </h4>
              <p className="text-sm text-[var(--text-secondary)]">
                Role rate{' '}
                <span className="font-bold text-[var(--text-primary)]">
                  {typeof roleRatePercent === 'number' ? `${roleRatePercent}%` : 'not set'}
                </span>
                {' · '}
                Period earnings{' '}
                <span className="font-bold text-emerald-600 tabular-nums">
                  {formatMYR(member.totalCommission)}
                </span>
              </p>
            </section>

          </div>
        )}

        {tab === 'schedule' && (
          <StaffScheduleSection weeklyHours={member.weeklyHours} readOnly />
        )}

        {tab === 'services' && (
          <div className="space-y-3">
            <p className="text-xs text-[var(--text-secondary)]">
              Services this staff member can perform. Edit the profile to change assignments.
            </p>
            {serviceNames.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {serviceNames.map((name) => (
                  <span
                    key={name}
                    className="px-3 py-1.5 rounded-full text-xs font-semibold border border-[var(--brand-border)] bg-[var(--brand-soft)] text-[var(--brand-deep)]"
                  >
                    {name}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[var(--text-muted)]">
                No restrictions — qualified for all outlet services.
              </p>
            )}
          </div>
        )}

        {tab === 'performance' && (
          <div className="space-y-4">
            {periodControls ? <div className="flex flex-wrap items-center gap-2">{periodControls}</div> : null}
            <div className="grid grid-cols-3 gap-1.5 sm:gap-3">
              <div className="min-w-0 overflow-hidden rounded-ui-md border border-[var(--line)] p-2.5 sm:p-4">
                <p className="m-staff-kpi-label truncate" title="Total revenue">
                  Rev.
                </p>
                <p className="m-staff-kpi-value sm:text-xl tabular-nums mt-1 truncate">
                  {formatMYR(member.totalRevenue)}
                </p>
              </div>
              <div className="min-w-0 overflow-hidden rounded-ui-md bg-[var(--brand)] p-2.5 sm:p-4 text-white">
                <p className="m-staff-kpi-label text-white/80 truncate" title="Commission">
                  Comm.
                </p>
                <p className="m-staff-kpi-value sm:text-xl tabular-nums mt-1 whitespace-nowrap">
                  {formatMYR(member.totalCommission)}
                </p>
              </div>
              <div className="min-w-0 overflow-hidden rounded-ui-md border border-[var(--line)] p-2.5 sm:p-4">
                <p className="m-staff-kpi-label truncate">Services</p>
                <p className="m-staff-kpi-value sm:text-xl tabular-nums mt-1 truncate">{member.totalServices}</p>
              </div>
            </div>
            <HistoryTable history={member.history} />
          </div>
        )}

        {tab === 'permissions' && (
          <StaffPermissionSection
            roleLabel={member.role}
            permissions={member.permissions}
            readOnly
          />
        )}

        {tab === 'payroll' && (
          <div className="space-y-4">
            {periodControls ? <div className="flex flex-wrap items-center gap-2">{periodControls}</div> : null}
            <StaffCommissionSection
              roleLabel={member.role}
              ratePercent={roleRatePercent}
              manageDisabled={locked}
              onManageRates={onManageRates}
            />
            <div className="rounded-ui-md border border-[var(--line)] p-4">
              <div className="flex items-center justify-between gap-3 mb-3">
                <h4 className="m-staff-section-title">
                  Commission earned
                </h4>
                <p className="m-staff-kpi-value text-emerald-600 tabular-nums">
                  {formatMYR(member.totalCommission)}
                </p>
              </div>
              <HistoryTable history={member.history} />
            </div>
          </div>
        )}
      </div>

      {!locked && (onEdit || onDelete) ? (
        <div className="sm:hidden sticky bottom-0 border-t border-[var(--line)] bg-[var(--bg-surface)] p-3 flex gap-2 safe-area-pb">
          {onEdit ? (
            <Button type="button" variant="outline" className="flex-1" onClick={onEdit}>
              Edit Profile
            </Button>
          ) : null}
          {onDelete ? (
            <Button type="button" variant="danger" className="flex-1" onClick={onDelete}>
              Remove Staff
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

export default StaffDetailPanel;
