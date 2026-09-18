import React, { useEffect, useRef, useState } from 'react';
import {
  Ban, Clipboard, ExternalLink, MoreVertical, Plus, RefreshCw, RotateCcw, ShieldCheck,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { accountAdminService, type UnlinkedAuthAccount, type WorkspaceAccountRole } from '../../services/accountAdminService';
import { auditService, type AuditEvent } from '../../services/auditService';
import { platformOperationsService, type BillingReadiness } from '../../services/platformOperationsService';
import {
  platformStep2Service,
  type IntegrationEvidence,
  type JobEvidence,
  type OnboardingReadiness,
  type SupportCase,
} from '../../services/platformStep2Service';
import { remoteAccessService } from '../../services/remoteAccessService';
import {
  superAdminPhase1Service,
  type OutletInspectorAccount,
  type OutletInspectorPayload,
} from '../../services/superAdminPhase1Service';
import { openExternalUrl } from '../../src/native/androidShell';
import { customerSiteOrigin } from '../../utils/customerSiteUrl';
import {
  Alert, AppDrawer, AppModal, Button, EmptyState, ErrorState, Field, LoadingSkeleton,
  StatusBadge, fieldControlClassName,
} from '../ui';
import type { OutletInspectorTab } from './OutletInspectorContext';

interface OutletInspectorProps {
  outletId: string | null;
  open: boolean;
  selectedTab: OutletInspectorTab;
  onSelectTab: (tab: OutletInspectorTab) => void;
  onClose: () => void;
}

interface RelatedEvidence {
  onboarding: OnboardingReadiness | null;
  integrations: IntegrationEvidence[];
  jobs: JobEvidence[];
  support: SupportCase[];
  audit: AuditEvent[];
  billingReadiness: BillingReadiness | null;
}

interface PendingAction {
  title: string;
  description: string;
  confirmLabel: string;
  tone?: 'danger' | 'primary';
  reasonRequired?: boolean;
  confirmationName?: string;
  refreshAfter?: boolean;
  run: (reason: string, confirmationText: string) => Promise<void>;
}

const inspectorTabs: Array<{ id: OutletInspectorTab; label: string }> = [
  { id: 'summary', label: 'Summary' },
  { id: 'onboarding', label: 'Onboarding' },
  { id: 'accounts', label: 'Accounts' },
  { id: 'billing', label: 'Billing' },
  { id: 'integrations', label: 'Integrations' },
  { id: 'support', label: 'Support' },
  { id: 'audit', label: 'Audit' },
];

const readinessChecks: Array<[keyof OnboardingReadiness, string]> = [
  ['owner_assigned', 'Owner assigned'],
  ['business_details', 'Business details'],
  ['operating_hours', 'Business hours'],
  ['bookable_services', 'Bookable services'],
  ['booking_path', 'Public booking path'],
  ['first_real_booking', 'Verified real booking'],
];

const dateTime = (value: string | null | undefined) => value ? new Date(value).toLocaleString() : 'Unavailable';
const toneForState = (state: string | null | undefined) => {
  if (!state || state === 'unknown') return 'neutral' as const;
  if (['active', 'accepted', 'verified', 'succeeded', 'complete', 'configured'].includes(state)) return 'success' as const;
  if (['failed', 'error', 'critical', 'suspended'].includes(state)) return 'danger' as const;
  return 'warning' as const;
};

const mrrLabel = (billing: OutletInspectorPayload['billing']) => {
  if (!billing || billing.status !== 'active') return 'Not applicable';
  if (!billing.mrrReliable || billing.unitAmount == null || !billing.currency || !billing.recurringInterval || !billing.intervalCount || !billing.quantity) return 'Unavailable';
  const months = billing.recurringInterval === 'year'
    ? 12 * billing.intervalCount
    : billing.recurringInterval === 'month' ? billing.intervalCount : 0;
  if (!months) return 'Unavailable';
  const value = billing.unitAmount * billing.quantity * (1 - (billing.discountPercent || 0) / 100) / months / 100;
  return `${billing.currency.toUpperCase()} ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};
const trialLabel = (billing: OutletInspectorPayload['billing']) => {
  if (!billing) return 'Unavailable';
  if (!billing.trialEnd) return 'Not reported by subscription data';
  const end = new Date(billing.trialEnd);
  if (Number.isNaN(end.getTime())) return 'Unknown';
  return end.getTime() > Date.now() ? `Trialing until ${end.toLocaleString()}` : `Trial ended ${end.toLocaleString()}`;
};

const OutletInspector: React.FC<OutletInspectorProps> = ({
  outletId, open, selectedTab, onSelectTab, onClose,
}) => {
  const navigate = useNavigate();
  const requestRef = useRef(0);
  const [payload, setPayload] = useState<OutletInspectorPayload | null>(null);
  const [related, setRelated] = useState<RelatedEvidence | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [reason, setReason] = useState('');
  const [confirmationName, setConfirmationName] = useState('');
  const [busy, setBusy] = useState(false);
  const [remoteBusy, setRemoteBusy] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'manager' | 'cashier'>('admin');
  const [unlinkedAccounts, setUnlinkedAccounts] = useState<UnlinkedAuthAccount[]>([]);
  const [unlinkedLoading, setUnlinkedLoading] = useState(false);
  const [linkingAccountId, setLinkingAccountId] = useState<string | null>(null);
  const [linkRoles, setLinkRoles] = useState<Record<string, WorkspaceAccountRole>>({});

  const load = async (targetOutletId: string) => {
    const request = ++requestRef.current;
    setLoading(true);
    setError(null);
    setPayload(null);
    setRelated(null);
    try {
      const [inspector, onboardingPage, integrations, jobs, support, audit, billingReadiness] = await Promise.all([
        superAdminPhase1Service.inspector(targetOutletId),
        platformStep2Service.onboarding('all', targetOutletId, 1, 100),
        platformStep2Service.integrations({ outletId: targetOutletId, page: 1, limit: 50 }),
        platformStep2Service.jobs({ outletId: targetOutletId, page: 1, limit: 25 }),
        platformStep2Service.supportCases({ outletId: targetOutletId, page: 1, limit: 25 }),
        auditService.getPage({ outletId: targetOutletId, page: 1, pageSize: 25 }),
        platformOperationsService.getBillingReadiness().catch(() => null),
      ]);
      if (request !== requestRef.current) return;
      setPayload(inspector);
      setRelated({
        onboarding: onboardingPage.rows.find((row) => row.outlet_id === targetOutletId) || null,
        integrations: integrations.rows,
        jobs: jobs.rows,
        support: support.rows,
        audit: audit.events,
        billingReadiness,
      });
    } catch (value) {
      if (request === requestRef.current) setError(value instanceof Error ? value.message : 'Outlet details could not be loaded.');
    } finally {
      if (request === requestRef.current) setLoading(false);
    }
  };

  useEffect(() => {
    if (!open || !outletId) {
      requestRef.current += 1;
      setPayload(null);
      setRelated(null);
      setError(null);
      return;
    }
    setActionMessage(null);
    void load(outletId);
  }, [open, outletId]);

  const refresh = async () => {
    if (outletId) await load(outletId);
  };

  const ask = (action: PendingAction) => {
    setReason('');
    setConfirmationName('');
    setPendingAction(action);
  };

  const confirmAction = async () => {
    if (!pendingAction) return;
    setBusy(true);
    setError(null);
    try {
      await pendingAction.run(reason.trim(), confirmationName);
      setActionMessage(`${pendingAction.confirmLabel} completed.`);
      setPendingAction(null);
      setReason('');
      setConfirmationName('');
      if (pendingAction.refreshAfter !== false) await refresh();
    } catch (value) {
      setError(value instanceof Error ? value.message : 'The privileged action could not be completed.');
    } finally {
      setBusy(false);
    }
  };

  const enterRemoteAccess = async () => {
    if (!outletId) return;
    setRemoteBusy(true);
    setError(null);
    try {
      await remoteAccessService.enter(outletId);
      window.location.assign('/dashboard');
    } catch (value) {
      setError(value instanceof Error ? value.message : 'Remote access could not be started.');
      setRemoteBusy(false);
    }
  };

  const createCase = () => {
    if (!outletId) return;
    navigate(`/admin/support?create=1&outlet=${encodeURIComponent(outletId)}`);
  };

  const copyOutletId = async () => {
    if (!outletId) return;
    try {
      await navigator.clipboard.writeText(outletId);
      setActionMessage('Outlet ID copied.');
    } catch {
      setError('The outlet ID could not be copied.');
    }
  };

  const openBookingPage = async () => {
    const origin = customerSiteOrigin();
    const slug = payload?.summary.bookingSlug;
    if (!origin || !slug) return;
    await openExternalUrl(`${origin}/book/${encodeURIComponent(slug)}`);
  };

  const portalAction = () => {
    if (!payload || !outletId) return;
    const restoring = payload.summary.portalStatus === 'suspended';
    ask({
      title: restoring ? 'Restore portal access?' : 'Suspend portal access?',
      description: restoring
        ? 'Workspace members will be able to sign in again after the server confirms the change.'
        : 'Workspace members will be blocked. Public booking publication remains a separate setting.',
      confirmLabel: restoring ? 'Restore access' : 'Suspend access',
      tone: restoring ? 'primary' : 'danger',
      reasonRequired: true,
      run: (actionReason) => platformOperationsService.setOutletAccess(outletId, restoring, actionReason).then(() => undefined),
    });
  };

  const accountAction = (account: OutletInspectorAccount, kind: 'membership' | 'global' | 'remove' | 'revoke' | 'reset' | 'resend') => {
    if (!outletId) return;
    const label = account.name || account.email || account.id;
    if (kind === 'membership') {
      const restoring = account.membershipStatus !== 'active';
      ask({ title: `${restoring ? 'Restore' : 'Suspend'} outlet membership?`, description: `${label} will ${restoring ? 'regain' : 'lose'} access to this outlet only.`, confirmLabel: restoring ? 'Restore membership' : 'Suspend membership', tone: restoring ? 'primary' : 'danger', reasonRequired: true, run: (r) => accountAdminService.setMembershipStatus(outletId, account.id, restoring, r) });
    } else if (kind === 'global') {
      const restoring = account.accountStatus === 'suspended';
      ask({ title: `${restoring ? 'Reactivate' : 'Suspend'} account globally?`, description: `This changes Bookglow access for ${label} across every outlet.`, confirmLabel: restoring ? 'Reactivate account' : 'Suspend account', tone: restoring ? 'primary' : 'danger', reasonRequired: true, run: (r) => restoring ? accountAdminService.reactivateAccount(account.id, r) : accountAdminService.suspendAccount(account.id, r) });
    } else if (kind === 'remove') {
      ask({ title: 'Remove outlet membership?', description: `${label} will no longer belong to this outlet.`, confirmLabel: 'Remove membership', tone: 'danger', reasonRequired: true, run: (r) => accountAdminService.removeFromOutlet(outletId, account.id, r) });
    } else if (kind === 'revoke') {
      ask({ title: 'Block current Bookglow sessions?', description: `${label} must authenticate again after access is restored.`, confirmLabel: 'Block sessions', tone: 'danger', reasonRequired: true, run: (r) => accountAdminService.revokeSessions(account.id, r) });
    } else if (kind === 'reset') {
      ask({ title: 'Send password recovery email?', description: `A secure recovery flow will be started for ${label}.`, confirmLabel: 'Send recovery email', tone: 'primary', run: () => accountAdminService.requirePasswordReset(account.id) });
    } else {
      ask({ title: 'Resend account invitation?', description: `A fresh invitation will be sent to ${label}.`, confirmLabel: 'Resend invitation', tone: 'primary', run: () => accountAdminService.resendInvitation(account.id) });
    }
  };

  const changeRole = (account: OutletInspectorAccount, role: string) => {
    if (!outletId || role === account.role) return;
    ask({ title: 'Change outlet role?', description: `${account.name || account.email || account.id} will become ${role}.`, confirmLabel: 'Change role', tone: 'primary', reasonRequired: true, run: (r) => accountAdminService.changeRole(outletId, account.id, role, r) });
  };

  const transferOwnership = (account: OutletInspectorAccount) => {
    if (!outletId || !payload) return;
    const owner = payload.accounts.find((candidate) => candidate.role === 'owner');
    if (!owner) { setError('No current owner is available for a secure ownership transfer.'); return; }
    ask({ title: 'Transfer outlet ownership?', description: `${account.name || account.email || account.id} will replace the current owner.`, confirmLabel: 'Transfer ownership', tone: 'danger', reasonRequired: true, run: (r) => accountAdminService.transferOwnership(outletId, owner.id, account.id, r) });
  };

  const inviteAccount = () => {
    if (!outletId || !inviteEmail.trim()) return;
    const email = inviteEmail.trim();
    ask({ title: 'Invite workspace account?', description: `${email} will receive a secure ${inviteRole} invitation for this outlet.`, confirmLabel: 'Send invitation', tone: 'primary', run: async () => { await accountAdminService.inviteAccount(email, inviteRole, outletId); setInviteEmail(''); } });
  };

  const loadUnlinkedAccounts = async () => {
    setUnlinkedLoading(true);
    setError(null);
    try { setUnlinkedAccounts(await accountAdminService.listUnlinkedAccounts()); }
    catch (value) { setError(value instanceof Error ? value.message : 'Registered accounts could not be loaded.'); }
    finally { setUnlinkedLoading(false); }
  };

  const linkRegisteredAccount = async (account: UnlinkedAuthAccount) => {
    if (!outletId) return;
    setLinkingAccountId(account.id);
    setError(null);
    try {
      await accountAdminService.linkRegisteredAccount(account.id, outletId, linkRoles[account.id] || 'admin');
      setUnlinkedAccounts((current) => current.filter((candidate) => candidate.id !== account.id));
      setActionMessage('Registered account connected.');
      await refresh();
    } catch (value) {
      setError(value instanceof Error ? value.message : 'The registered account could not be connected.');
    } finally { setLinkingAccountId(null); }
  };

  const deleteOutlet = () => {
    if (!outletId || !payload) return;
    const name = payload.summary.name;
    ask({
      title: 'Delete this outlet permanently?',
      description: `Type “${name}” and give a reason. Billing cancellation is attempted first; the server remains authoritative.`,
      confirmLabel: 'Delete outlet',
      tone: 'danger', reasonRequired: true, confirmationName: name,
      refreshAfter: false,
      run: async (r, typedName) => {
        await platformOperationsService.deleteOutlet(outletId, r, typedName);
        onClose();
        navigate('/admin/subscribers', { replace: true });
      },
    });
  };

  const summary = payload?.summary;
  const actionDisabled = Boolean(
    busy
    || (pendingAction?.reasonRequired && reason.trim().length < 5)
    || (pendingAction?.confirmationName && confirmationName !== pendingAction.confirmationName)
  );

  return (
    <>
      <AppDrawer
        open={open}
        onClose={onClose}
        title={summary?.name || 'Outlet inspector'}
        description={summary ? `${summary.outletId} · Last activity ${dateTime(summary.lastActivityAt)}` : outletId || undefined}
        variant="right"
        busy={busy || remoteBusy || Boolean(pendingAction)}
        className="max-w-2xl grid-cols-[minmax(0,1fr)] lg:top-16 [&_.m-modal-title]:whitespace-normal [&_.m-modal-title]:break-words [&_.m-modal-desc]:break-all [&_.m-modal-desc]:line-clamp-none [&>.m-modal-header]:flex-wrap [&>.m-modal-header>div:first-child]:basis-full sm:[&>.m-modal-header>div:first-child]:basis-auto [&>.m-modal-header>div:last-child]:ml-auto"
        headerActions={summary ? (
          <div className="flex items-center gap-1">
            <Button size="sm" variant="secondary" disabled={remoteBusy} onClick={() => void enterRemoteAccess()}>
              <ShieldCheck className="h-3.5 w-3.5" />{remoteBusy ? 'Opening…' : 'Remote'}
            </Button>
            <details className="relative">
              <summary className="flex h-8 w-8 cursor-pointer list-none items-center justify-center rounded-ui-sm border border-[var(--line)]" aria-label="More outlet actions"><MoreVertical className="h-4 w-4" /></summary>
              <div className="absolute right-0 z-20 mt-2 w-52 rounded-ui-md border border-[var(--line)] bg-[var(--bg-surface)] p-1 shadow-ui-lg">
                <button type="button" onClick={() => void copyOutletId()} className="flex w-full items-center gap-2 rounded-ui-sm px-3 py-2 text-left text-xs hover:bg-[var(--bg-soft)]"><Clipboard className="h-3.5 w-3.5" />Copy outlet ID</button>
                <button type="button" disabled={!summary.bookingSlug || !customerSiteOrigin()} onClick={() => void openBookingPage()} className="flex w-full items-center gap-2 rounded-ui-sm px-3 py-2 text-left text-xs hover:bg-[var(--bg-soft)] disabled:opacity-50"><ExternalLink className="h-3.5 w-3.5" />Open booking page</button>
                <button type="button" onClick={createCase} className="flex w-full items-center gap-2 rounded-ui-sm px-3 py-2 text-left text-xs hover:bg-[var(--bg-soft)]"><Plus className="h-3.5 w-3.5" />Create support case</button>
                <button type="button" onClick={deleteOutlet} className="flex w-full items-center gap-2 rounded-ui-sm px-3 py-2 text-left text-xs text-[var(--danger)] hover:bg-[var(--danger-soft)]"><Ban className="h-3.5 w-3.5" />Delete outlet</button>
              </div>
            </details>
          </div>
        ) : null}
      >
        <div className="space-y-4">
          <div className="sticky top-0 z-10 -mx-4 -mt-4 border-b border-[var(--line)] bg-[var(--bg-surface)] px-4 pt-3 sm:-mx-5 sm:px-5">
            <div className="flex gap-1 overflow-x-auto pb-3" role="tablist" aria-label="Outlet inspector sections">
              {inspectorTabs.map((tab) => (
                <button key={tab.id} type="button" role="tab" aria-selected={selectedTab === tab.id} onClick={() => onSelectTab(tab.id)} className={`min-h-9 shrink-0 rounded-ui-sm px-3 text-xs font-semibold ${selectedTab === tab.id ? 'bg-[var(--brand-soft)] text-[var(--brand-deep)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-soft)]'}`}>{tab.label}</button>
              ))}
            </div>
          </div>

          {actionMessage ? <Alert tone="success" title="Outlet updated">{actionMessage}</Alert> : null}
          {error ? <ErrorState message={error} onRetry={outletId ? () => load(outletId) : undefined} /> : null}
          {loading ? <LoadingSkeleton rows={9} /> : null}

          {!loading && payload && related && selectedTab === 'summary' ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge tone={toneForState(summary?.portalStatus)}>{summary?.portalStatus === 'suspended' ? 'Portal suspended' : `Portal ${summary?.portalStatus}`}</StatusBadge>
                <StatusBadge tone={toneForState(summary?.onboardingStatus)}>{summary?.onboardingStatus === 'complete' ? 'Onboarding complete' : `Onboarding ${summary?.onboardingStatus}`}</StatusBadge>
                <Button size="sm" variant={summary?.portalStatus === 'suspended' ? 'secondary' : 'danger'} onClick={portalAction}>{summary?.portalStatus === 'suspended' ? <RotateCcw className="h-3.5 w-3.5" /> : <Ban className="h-3.5 w-3.5" />}{summary?.portalStatus === 'suspended' ? 'Restore access' : 'Suspend access'}</Button>
              </div>
              <dl className="grid gap-3 rounded-ui-md border border-[var(--line)] p-4 sm:grid-cols-2">
                {[
                  ['Owner / primary admin', summary?.ownerName || summary?.ownerEmail || 'Unavailable'],
                  ['Merchant contact', [summary?.email, summary?.phone].filter(Boolean).join(' · ') || 'Unavailable'],
                  ['Booking path', summary?.bookingSlug ? `/book/${summary.bookingSlug}` : 'Unavailable'],
                  ['Timezone', summary?.timezone || 'Unavailable'],
                  ['Business hours', summary?.businessHoursStatus || 'Unknown'],
                  ['Active users', String(summary?.activeUserCount ?? 0)],
                  ['Subscription', payload.billing?.status || 'Unavailable'],
                  ['Last relevant activity', dateTime(summary?.lastActivityAt)],
                ].map(([label, value]) => <div key={label}><dt className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">{label}</dt><dd className="mt-1 break-words text-sm font-semibold text-[var(--text-primary)]">{value}</dd></div>)}
              </dl>
              <section><h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">Recent activity</h3>{!summary?.recentActivity.length ? <p className="rounded-ui-md border border-[var(--line)] p-4 text-sm text-[var(--text-muted)]">No recent server-backed activity is available.</p> : <div className="divide-y divide-[var(--line)] rounded-ui-md border border-[var(--line)]">{summary.recentActivity.map((item, index) => <div key={`${item.type}-${item.reference}-${index}`} className="grid gap-1 p-3 sm:grid-cols-[minmax(0,1fr)_auto]"><div className="min-w-0"><p className="truncate text-xs font-semibold">{item.type.replaceAll('_', ' ')} · {item.reference}</p><p className="text-[11px] text-[var(--text-muted)]">{item.status || 'Status unavailable'}</p></div><span className="text-[10px] text-[var(--text-muted)]">{dateTime(item.occurredAt)}</span></div>)}</div>}</section>
            </div>
          ) : null}

          {!loading && payload && related && selectedTab === 'onboarding' ? (
            related.onboarding ? <div className="space-y-4"><div className="flex flex-wrap gap-2"><StatusBadge tone={toneForState(related.onboarding.stage)}>{related.onboarding.stage}</StatusBadge><StatusBadge tone={related.onboarding.configuration_ready ? 'success' : 'warning'}>{related.onboarding.configuration_ready ? 'Configuration ready' : 'Requirements missing'}</StatusBadge><StatusBadge tone={related.onboarding.first_real_booking ? 'success' : 'neutral'}>{related.onboarding.first_real_booking ? 'Booking verified' : 'Booking unverified'}</StatusBadge></div><div className="grid gap-2 sm:grid-cols-2">{readinessChecks.map(([key, label]) => <div key={String(key)} className="rounded-ui-md border border-[var(--line)] p-3"><p className="text-xs font-semibold">{label}</p><p className={`mt-1 text-xs ${related.onboarding[key] ? 'text-[var(--success)]' : 'text-[var(--warning)]'}`}>{related.onboarding[key] ? 'Complete' : 'Needs attention'}</p></div>)}</div>{related.onboarding.missing_requirements.length ? <Alert tone="warning" title="Missing requirements">{related.onboarding.missing_requirements.join(' · ')}</Alert> : <Alert tone="success" title="Configuration complete">The authoritative readiness model has no missing requirements.</Alert>}<Button variant="secondary" onClick={() => navigate(`/admin/onboarding?outlet=${encodeURIComponent(payload.summary.outletId)}`)}>Open onboarding tracker</Button></div>
              : <EmptyState title="Onboarding unavailable" description="The authoritative readiness endpoint returned no exact outlet record." />
          ) : null}

          {!loading && payload && related && selectedTab === 'accounts' ? (
            <div className="space-y-4">
              <div className="rounded-ui-md border border-[var(--line)] p-3"><p className="text-xs font-bold">Invite workspace account</p><div className="mt-2 grid gap-2 sm:grid-cols-[minmax(0,1fr)_130px_auto]"><input type="email" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} placeholder="merchant@example.com" aria-label="Account invitation email" className={fieldControlClassName} /><select value={inviteRole} onChange={(event) => setInviteRole(event.target.value as typeof inviteRole)} aria-label="Invitation role" className={fieldControlClassName}><option value="admin">Admin</option><option value="manager">Manager</option><option value="cashier">Cashier</option></select><Button size="sm" disabled={!inviteEmail.trim()} onClick={inviteAccount}>Invite</Button></div></div>
              <div className="rounded-ui-md border border-[var(--line)] p-3"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-xs font-bold">Connect a registered account</p><p className="mt-1 text-[11px] text-[var(--text-muted)]">Uses the existing service-role account administration endpoint.</p></div><Button size="sm" variant="secondary" disabled={unlinkedLoading} onClick={() => void loadUnlinkedAccounts()}>{unlinkedLoading ? 'Loading…' : 'Find accounts'}</Button></div>{unlinkedAccounts.length ? <div className="mt-3 space-y-2">{unlinkedAccounts.slice(0,25).map((account) => <div key={account.id} className="grid gap-2 rounded-ui-sm bg-[var(--bg-soft)] p-2 sm:grid-cols-[minmax(0,1fr)_120px_auto] sm:items-center"><div className="min-w-0"><p className="truncate text-xs font-semibold">{account.displayName || account.email}</p><p className="truncate text-[10px] text-[var(--text-muted)]">{account.email} · Last sign-in {dateTime(account.lastSignInAt)}</p></div><select value={linkRoles[account.id] || 'admin'} onChange={(event) => setLinkRoles((current) => ({...current,[account.id]:event.target.value as WorkspaceAccountRole}))} className={fieldControlClassName} aria-label={`Role for ${account.email}`}><option value="admin">Admin</option><option value="manager">Manager</option><option value="cashier">Cashier</option></select><Button size="sm" disabled={Boolean(linkingAccountId)} onClick={() => void linkRegisteredAccount(account)}>{linkingAccountId===account.id?'Connecting…':'Connect'}</Button></div>)}</div> : null}</div>
              {!payload.accounts.length ? <EmptyState title="No outlet accounts" description="No non-removed memberships were returned." /> : <div className="space-y-3">{payload.accounts.map((account) => <article key={account.id} className="rounded-ui-md border border-[var(--line)] p-3"><div className="flex flex-wrap items-start justify-between gap-2"><div className="min-w-0"><p className="truncate text-sm font-bold">{account.name || account.email || account.id}</p><p className="truncate text-xs text-[var(--text-muted)]">{account.email || 'Email unavailable'} · Last sign-in {dateTime(account.lastSignInAt)}</p></div><div className="flex flex-wrap gap-1"><StatusBadge tone={toneForState(account.membershipStatus)}>{account.membershipStatus}</StatusBadge><StatusBadge tone={toneForState(account.accountStatus)}>{account.accountStatus}</StatusBadge><StatusBadge>{account.invitationState}</StatusBadge></div></div><div className="mt-3 flex flex-wrap items-center gap-2"><select value={account.role} disabled={account.role === 'owner'} onChange={(event) => changeRole(account, event.target.value)} aria-label={`Role for ${account.email || account.id}`} className={`${fieldControlClassName} w-auto min-w-28`}><option value="owner">Owner</option><option value="admin">Admin</option><option value="manager">Manager</option><option value="cashier">Cashier</option></select>{account.role !== 'owner' ? <Button size="sm" variant="secondary" onClick={() => transferOwnership(account)}>Make owner</Button> : null}<Button size="sm" variant="secondary" onClick={() => accountAction(account, 'membership')}>{account.membershipStatus === 'active' ? 'Suspend here' : 'Restore here'}</Button><Button size="sm" variant="secondary" onClick={() => accountAction(account, 'global')}>{account.accountStatus === 'suspended' ? 'Reactivate globally' : 'Suspend globally'}</Button><details><summary className="cursor-pointer px-2 py-1 text-xs font-semibold text-[var(--brand)]">More</summary><div className="mt-2 flex flex-wrap gap-2">{account.invitationState!=='accepted'?<Button size="sm" variant="secondary" onClick={() => accountAction(account, 'resend')}>Resend invitation</Button>:null}<Button size="sm" variant="secondary" onClick={() => accountAction(account, 'reset')}>Recovery email</Button><Button size="sm" variant="secondary" onClick={() => accountAction(account, 'revoke')}>Block sessions</Button>{account.role !== 'owner' ? <Button size="sm" variant="danger" onClick={() => accountAction(account, 'remove')}>Remove</Button> : null}</div></details></div></article>)}</div>}
            </div>
          ) : null}

          {!loading && payload && related && selectedTab === 'billing' ? (
            <div className="space-y-4"><div className="flex flex-wrap gap-2"><StatusBadge tone={toneForState(payload.billing?.status)}>{payload.billing?.status || 'No subscription'}</StatusBadge><StatusBadge tone={related.billingReadiness?.checkoutReady ? 'success' : 'warning'}>{related.billingReadiness?.state?.replaceAll('_', ' ') || 'Provider readiness unavailable'}</StatusBadge></div><dl className="grid gap-3 rounded-ui-md border border-[var(--line)] p-4 sm:grid-cols-2">{[
              ['Provider', payload.billing?.provider || related.billingReadiness?.provider || 'Unavailable'], ['Subscription state', payload.billing?.status || 'Unavailable'], ['Trial state', trialLabel(payload.billing)], ['Current period', payload.billing ? `${dateTime(payload.billing.currentPeriodStart)} — ${dateTime(payload.billing.currentPeriodEnd)}` : 'Unavailable'], ['MRR', mrrLabel(payload.billing)], ['MRR source quality', payload.billing?.mrrReliable ? 'Reliable recurring metadata' : 'Unavailable / unverified'],
            ].map(([label, value]) => <div key={label}><dt className="text-[10px] font-bold uppercase text-[var(--text-muted)]">{label}</dt><dd className="mt-1 text-sm font-semibold">{value}</dd></div>)}</dl><Alert tone="warning" title="Read-only billing view">No checkout, cancellation, or billing mutation runs from the inspector.</Alert></div>
          ) : null}

          {!loading && payload && related && selectedTab === 'integrations' ? (
            <div className="space-y-4">{!related.integrations.length ? <EmptyState title="No integration evidence" description="No durable configured or verified integration state is available." /> : <div className="divide-y divide-[var(--line)] rounded-ui-md border border-[var(--line)]">{related.integrations.map((item, index) => <div key={`${item.integration_type}-${index}`} className="p-3"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-bold">{item.integration_type.replaceAll('_', ' ')}</p><StatusBadge tone={toneForState(item.state)}>{item.state.replaceAll('_', ' ')}</StatusBadge></div><p className="mt-1 text-xs text-[var(--text-secondary)]">{item.detail}</p><p className="mt-1 text-xs text-[var(--text-muted)]">Last verified success: {dateTime(item.last_verified_success)}</p>{item.latest_error ? <p className="mt-2 break-words rounded-ui-sm bg-[var(--danger-soft)] p-2 text-xs text-[var(--danger)]">{item.latest_error}</p> : null}</div>)}</div>}<h3 className="text-xs font-bold uppercase text-[var(--text-muted)]">Related jobs and operations</h3>{!related.jobs.length ? <p className="text-sm text-[var(--text-muted)]">No related operation records.</p> : <div className="divide-y divide-[var(--line)] rounded-ui-md border border-[var(--line)]">{related.jobs.map((job, index) => <div key={`${job.reference_id}-${index}`} className="grid gap-1 p-3 sm:grid-cols-[minmax(0,1fr)_auto]"><div className="min-w-0"><p className="truncate text-xs font-semibold">{job.job_type.replaceAll('_', ' ')}</p><p className="truncate font-mono text-[10px] text-[var(--text-muted)]">{job.reference_id || 'No correlation ID'}</p></div><StatusBadge tone={toneForState(job.state)}>{job.state}</StatusBadge></div>)}</div>}<Button variant="secondary" onClick={() => navigate(`/admin/integrations-jobs?outlet=${encodeURIComponent(payload.summary.outletId)}`)}>Open Integrations &amp; Jobs</Button></div>
          ) : null}

          {!loading && payload && related && selectedTab === 'support' ? (
            <div className="space-y-4"><Button onClick={createCase}><Plus className="h-4 w-4" />Create case</Button>{!related.support.length ? <EmptyState title="No support cases" description="No open or recent case is recorded for this outlet." /> : <div className="divide-y divide-[var(--line)] rounded-ui-md border border-[var(--line)]">{related.support.map((item) => <button type="button" key={item.id} onClick={() => navigate(`/admin/support?case=${encodeURIComponent(item.id)}`)} className="grid w-full gap-2 p-3 text-left hover:bg-[var(--bg-soft)] sm:grid-cols-[minmax(0,1fr)_auto]"><div className="min-w-0"><p className="truncate text-sm font-semibold">{item.subject}</p><p className="text-[11px] text-[var(--text-muted)]">{item.id} · {item.assigned_name || 'Unassigned'} · {dateTime(item.updated_at)}</p></div><div className="flex gap-1"><StatusBadge tone={toneForState(item.priority)}>{item.priority}</StatusBadge><StatusBadge tone={toneForState(item.status)}>{item.status}</StatusBadge></div></button>)}</div>}</div>
          ) : null}

          {!loading && payload && related && selectedTab === 'audit' ? (
            <div className="space-y-4">{!related.audit.length ? <EmptyState title="No audit events" description="No authoritative outlet events were returned." /> : <div className="divide-y divide-[var(--line)] rounded-ui-md border border-[var(--line)]">{related.audit.map((event) => <article key={event.id} className="p-3"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-semibold">{event.action}</p><StatusBadge tone={toneForState(event.outcome)}>{event.outcome}</StatusBadge></div><p className="mt-1 text-xs text-[var(--text-secondary)]">{event.affectedTarget}</p><p className="mt-1 text-[10px] text-[var(--text-muted)]">{event.actor} · {dateTime(event.timestamp)}</p>{event.reason ? <p className="mt-1 text-xs italic text-[var(--text-muted)]">Reason: {event.reason}</p> : null}</article>)}</div>}<Button variant="secondary" onClick={() => navigate(`/admin/audit?outlet=${encodeURIComponent(payload.summary.outletId)}`)}>Open full audit log</Button></div>
          ) : null}

          {!loading && !payload && !error ? <EmptyState title="Outlet unavailable" description="No outlet is selected." /> : null}
          {payload ? <div className="flex justify-end border-t border-[var(--line)] pt-3"><Button size="sm" variant="ghost" disabled={loading} onClick={() => void refresh()}><RefreshCw className="h-3.5 w-3.5" />Refresh details</Button></div> : null}
        </div>
      </AppDrawer>

      <AppModal
        open={Boolean(pendingAction)}
        onClose={() => { if (!busy) setPendingAction(null); }}
        title={pendingAction?.title || 'Confirm action'}
        description={pendingAction?.description}
        size="sm"
        busy={busy}
        footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setPendingAction(null)} disabled={busy}>Cancel</Button><Button variant={pendingAction?.tone === 'danger' ? 'danger' : 'primary'} onClick={() => void confirmAction()} disabled={actionDisabled}>{busy ? 'Working…' : pendingAction?.confirmLabel || 'Confirm'}</Button></div>}
      >
        <div className="space-y-4">
          {pendingAction?.reasonRequired ? <Field id="inspector-action-reason" label="Reason" hint="At least 5 characters; stored in the authoritative audit history."><textarea id="inspector-action-reason" value={reason} maxLength={500} onChange={(event) => setReason(event.target.value)} className={`${fieldControlClassName} h-24 py-2`} /></Field> : null}
          {pendingAction?.confirmationName ? <Field id="inspector-confirm-name" label={`Type “${pendingAction.confirmationName}”`}><input id="inspector-confirm-name" value={confirmationName} onChange={(event) => setConfirmationName(event.target.value)} className={fieldControlClassName} /></Field> : null}
        </div>
      </AppModal>
    </>
  );
};

export default OutletInspector;
