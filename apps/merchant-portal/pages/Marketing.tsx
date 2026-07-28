import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowUpRight,
  CalendarClock,
  Check,
  Copy,
  Gift,
  Megaphone,
  Plus,
  Search,
  Sparkles,
  TicketCheck,
  WalletCards,
} from 'lucide-react';
import { Service, Voucher, VoucherStatus } from '../types';
import { voucherService } from '../services/voucherService';
import {
  Alert,
  AppDrawer,
  Button,
  ConfirmationDialog,
  EmptyState,
  LoadingSkeleton,
  PageHeader,
  StatusBadge,
} from '../components/ui';
import { MarketingGrowthWorkspace } from '../components/marketing/MarketingGrowthWorkspace';

interface MarketingProps {
  outletID: string;
  services: Service[];
  role: 'admin' | 'cashier' | null;
}

type MarketingView = 'overview' | 'campaigns' | 'audiences' | 'vouchers';
type VoucherFilter = 'all' | VoucherStatus | 'expiring';

const currency = new Intl.NumberFormat('en-MY', {
  style: 'currency',
  currency: 'MYR',
  minimumFractionDigits: 0,
});

const isExpiringSoon = (voucher: Voucher) => {
  if (voucher.status !== 'active' || !voucher.expiryDate) return false;
  const remaining = new Date(voucher.expiryDate).getTime() - Date.now();
  return remaining >= 0 && remaining <= 14 * 24 * 60 * 60 * 1000;
};

const Marketing: React.FC<MarketingProps> = ({ outletID, services, role }) => {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [view, setView] = useState<MarketingView>('overview');
  const [filter, setFilter] = useState<VoucherFilter>('all');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [name, setName] = useState('');
  const [price, setPrice] = useState<number>(0);
  const [expiryDate, setExpiryDate] = useState('');
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [copiedVoucherId, setCopiedVoucherId] = useState<string | null>(null);
  const [copiedSecretVoucherId, setCopiedSecretVoucherId] = useState<string | null>(null);
  const [resettingVoucherId, setResettingVoucherId] = useState<string | null>(null);
  const [confirmingVoucherId, setConfirmingVoucherId] = useState<string | null>(null);
  const [saleCodeInputs, setSaleCodeInputs] = useState<Record<string, string>>({});
  const [resetTarget, setResetTarget] = useState<Voucher | null>(null);

  const serviceNameMap = useMemo(
    () => new Map(services.map((service) => [service.id, service.name])),
    [services],
  );

  const loadVouchers = useCallback(async () => {
    if (!outletID || role !== 'admin') {
      setVouchers([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const list = await voucherService.getByOutlet(outletID);
      setVouchers(
        [...list].sort(
          (a, b) =>
            new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime(),
        ),
      );
      setError(null);
    } catch (loadError: any) {
      setError(loadError.message || 'Failed to load marketing data.');
    } finally {
      setIsLoading(false);
    }
  }, [outletID, role]);

  useEffect(() => {
    void loadVouchers();
  }, [loadVouchers]);

  const metrics = useMemo(() => {
    const sold = vouchers.filter((voucher) => voucher.status === 'sold');
    const redeemed = vouchers.filter((voucher) => voucher.status === 'redeemed');
    return {
      total: vouchers.length,
      active: vouchers.filter((voucher) => voucher.status === 'active').length,
      sold: sold.length,
      redeemed: redeemed.length,
      expiring: vouchers.filter(isExpiringSoon).length,
      recordedValue: [...sold, ...redeemed].reduce((sum, voucher) => sum + voucher.price, 0),
    };
  }, [vouchers]);

  const visibleVouchers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return vouchers.filter((voucher) => {
      const matchesFilter =
        filter === 'all'
          ? true
          : filter === 'expiring'
            ? isExpiringSoon(voucher)
            : voucher.status === filter;
      const serviceNames = voucher.serviceIds
        .map((id) => serviceNameMap.get(id) || id)
        .join(' ');
      return (
        matchesFilter &&
        (!query ||
          `${voucher.name} ${voucher.slug} ${serviceNames}`.toLowerCase().includes(query))
      );
    });
  }, [filter, search, serviceNameMap, vouchers]);

  const resetEditor = () => {
    setName('');
    setPrice(0);
    setExpiryDate('');
    setSelectedServiceIds([]);
  };

  const copyValue = async (value: string, voucherId: string, kind: 'link' | 'secret') => {
    try {
      await navigator.clipboard.writeText(value);
      kind === 'link' ? setCopiedVoucherId(voucherId) : setCopiedSecretVoucherId(voucherId);
      window.setTimeout(() => {
        kind === 'link'
          ? setCopiedVoucherId((current) => (current === voucherId ? null : current))
          : setCopiedSecretVoucherId((current) => (current === voucherId ? null : current));
      }, 1500);
    } catch {
      setError('Copying is unavailable. Please copy the value manually.');
    }
  };

  const handleCopyLink = (voucher: Voucher) =>
    copyValue(`${window.location.origin}/buy-voucher/${voucher.slug}`, voucher.id, 'link');

  const handleCopySecretCode = (voucher: Voucher) => {
    if (voucher.secretCode) void copyValue(voucher.secretCode, voucher.id, 'secret');
  };

  const handleResetVoucher = async (voucher: Voucher) => {
    if (voucher.status === 'active') return;
    try {
      setResettingVoucherId(voucher.id);
      setError(null);
      await voucherService.resetVoucher(voucher.id);
      await loadVouchers();
      setResetTarget(null);
      setSuccess(`${voucher.name} is active again.`);
    } catch (resetError: any) {
      setError(resetError.message || 'Failed to reset voucher.');
    } finally {
      setResettingVoucherId(null);
    }
  };

  const handleConfirmSold = async (voucher: Voucher) => {
    const enteredCode = (saleCodeInputs[voucher.id] || '').trim();
    if (!enteredCode) {
      setError('Enter the voucher secret code to confirm the sale.');
      return;
    }
    try {
      setConfirmingVoucherId(voucher.id);
      setError(null);
      await voucherService.confirmSoldByCode(voucher.id, enteredCode);
      setSaleCodeInputs((current) => ({ ...current, [voucher.id]: '' }));
      await loadVouchers();
      setSuccess(`${voucher.name} was marked as sold.`);
    } catch (confirmError: any) {
      setError(confirmError.message || 'Failed to confirm voucher sale.');
    } finally {
      setConfirmingVoucherId(null);
    }
  };

  const onCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (role !== 'admin') {
      setError('Only administrators can create vouchers.');
      return;
    }
    if (!name.trim() || !expiryDate || selectedServiceIds.length === 0 || price < 0) {
      setError('Complete all voucher fields and select at least one service.');
      return;
    }
    setError(null);
    setIsSaving(true);
    try {
      await voucherService.create({
        outletID,
        name: name.trim(),
        price: Number(price || 0),
        serviceIds: selectedServiceIds,
        expiryDate,
      });
      resetEditor();
      setIsEditorOpen(false);
      setView('vouchers');
      setSuccess(`${name.trim()} was created successfully.`);
      await loadVouchers();
    } catch (createError: any) {
      setError(createError.message || 'Failed to create voucher.');
    } finally {
      setIsSaving(false);
    }
  };

  const statusBadge = (voucher: Voucher) => {
    if (voucher.status === 'active' && voucher.secretCode) {
      return <StatusBadge tone="warning">Awaiting sale</StatusBadge>;
    }
    if (voucher.status === 'active') return <StatusBadge tone="info">Active</StatusBadge>;
    if (voucher.status === 'sold') return <StatusBadge tone="success">Sold</StatusBadge>;
    return <StatusBadge tone="neutral">Redeemed</StatusBadge>;
  };

  if (role !== 'admin') {
    return (
      <div className="space-y-6 animate-fadeIn">
        <PageHeader
          title="Marketing"
          description="Grow customer relationships with promotions and campaigns."
        />
        <EmptyState
          icon={<Megaphone size={28} />}
          title="Marketing access is restricted"
          description="Ask an administrator to give you access to create and manage promotions."
        />
      </div>
    );
  }

  const metricCards = [
    { label: 'Active vouchers', value: metrics.active, icon: Gift, tone: 'text-[var(--brand)]' },
    { label: 'Sold', value: metrics.sold, icon: WalletCards, tone: 'text-[var(--status-success)]' },
    { label: 'Redeemed', value: metrics.redeemed, icon: TicketCheck, tone: 'text-[var(--status-info)]' },
    {
      label: 'Recorded value',
      value: currency.format(metrics.recordedValue),
      icon: Sparkles,
      tone: 'text-[var(--status-warning)]',
    },
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      <PageHeader
        title="Marketing"
        description="Create promotions, monitor voucher activity, and turn customer interest into bookings."
        actions={
          <Button type="button" onClick={() => setIsEditorOpen(true)}>
            <Plus size={16} aria-hidden="true" />
            Create voucher
          </Button>
        }
      />

      {error ? (
        <Alert tone="danger">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span>{error}</span>
            <Button type="button" size="sm" variant="ghost" onClick={() => void loadVouchers()}>
              Try again
            </Button>
          </div>
        </Alert>
      ) : null}
      {success ? (
        <Alert tone="success" onDismiss={() => setSuccess(null)}>
          {success}
        </Alert>
      ) : null}

      <nav
        aria-label="Marketing sections"
        className="flex gap-1 overflow-x-auto rounded-ui-lg border border-[var(--line)] bg-[var(--bg-surface)] p-1 shadow-ui-xs"
      >
        {[
          { id: 'overview' as const, label: 'Overview' },
          { id: 'campaigns' as const, label: 'Campaigns' },
          { id: 'audiences' as const, label: 'Audiences' },
          { id: 'vouchers' as const, label: 'Vouchers', count: metrics.total },
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setView(item.id)}
            aria-current={view === item.id ? 'page' : undefined}
            className={`min-h-10 rounded-ui-md px-4 text-sm font-semibold transition-colors ${
              view === item.id
                ? 'bg-[var(--brand-soft)] text-[var(--brand)]'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-soft)]'
            }`}
          >
            {item.label}
            {item.count !== undefined ? (
              <span className="ml-2 rounded-full bg-[var(--bg-soft)] px-2 py-0.5 text-xs">
                {item.count}
              </span>
            ) : null}
          </button>
        ))}
      </nav>

      {isLoading ? (
        <div className="rounded-ui-lg border border-[var(--line)] bg-[var(--bg-surface)] p-6">
          <LoadingSkeleton rows={6} />
        </div>
      ) : view === 'overview' ? (
        <>
          <section aria-label="Marketing overview" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {metricCards.map(({ label, value, icon: Icon, tone }) => (
              <article
                key={label}
                className="rounded-ui-lg border border-[var(--line)] bg-[var(--bg-surface)] p-5 shadow-ui-xs"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-[var(--text-muted)]">{label}</p>
                    <p className="mt-2 text-2xl font-bold tracking-tight text-[var(--text-primary)]">
                      {value}
                    </p>
                  </div>
                  <span className={`rounded-ui-md bg-[var(--bg-soft)] p-2.5 ${tone}`}>
                    <Icon size={19} aria-hidden="true" />
                  </span>
                </div>
              </article>
            ))}
          </section>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(18rem,0.7fr)]">
            <section className="rounded-ui-lg border border-[var(--line)] bg-[var(--bg-surface)] shadow-ui-xs">
              <div className="flex items-center justify-between gap-3 border-b border-[var(--line)] px-5 py-4">
                <div>
                  <h2 className="text-base font-semibold text-[var(--text-primary)]">Recent vouchers</h2>
                  <p className="text-sm text-[var(--text-muted)]">Latest promotion activity</p>
                </div>
                <Button type="button" size="sm" variant="ghost" onClick={() => setView('vouchers')}>
                  View all <ArrowUpRight size={15} aria-hidden="true" />
                </Button>
              </div>
              {vouchers.length ? (
                <div className="divide-y divide-[var(--line)]">
                  {vouchers.slice(0, 5).map((voucher) => (
                    <div key={voucher.id} className="flex items-center gap-3 px-5 py-4">
                      <span className="rounded-ui-md bg-[var(--brand-soft)] p-2 text-[var(--brand)]">
                        <Gift size={17} aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
                          {voucher.name}
                        </p>
                        <p className="text-xs text-[var(--text-muted)]">
                          {currency.format(voucher.price)} · expires {voucher.expiryDate}
                        </p>
                      </div>
                      {statusBadge(voucher)}
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="No voucher activity yet"
                  description="Create your first voucher to start a promotion."
                  className="m-5"
                  action={<Button onClick={() => setIsEditorOpen(true)}>Create voucher</Button>}
                />
              )}
            </section>

            <aside className="space-y-4">
              <section className="rounded-ui-lg border border-[var(--line)] bg-[var(--bg-surface)] p-5 shadow-ui-xs">
                <h2 className="text-base font-semibold text-[var(--text-primary)]">Needs attention</h2>
                <div className="mt-4 flex items-start gap-3 rounded-ui-md bg-[var(--bg-soft)] p-4">
                  <CalendarClock className="mt-0.5 text-[var(--status-warning)]" size={19} />
                  <div>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">
                      {metrics.expiring} expiring soon
                    </p>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      Active vouchers expiring in the next 14 days.
                    </p>
                    {metrics.expiring ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="mt-2"
                        onClick={() => {
                          setFilter('expiring');
                          setView('vouchers');
                        }}
                      >
                        Review vouchers
                      </Button>
                    ) : null}
                  </div>
                </div>
              </section>

              <section className="rounded-ui-lg border border-[var(--line)] bg-[var(--brand-soft)] p-5">
                <Sparkles className="text-[var(--brand)]" size={21} aria-hidden="true" />
                <h2 className="mt-3 text-base font-semibold text-[var(--text-primary)]">
                  Marketing workspace
                </h2>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  Campaigns, reusable audiences and automated journeys will build on this promotion hub.
                </p>
              </section>
            </aside>
          </div>
        </>
      ) : view === 'campaigns' || view === 'audiences' ? (
        <MarketingGrowthWorkspace outletID={outletID} section={view} />
      ) : (
        <section className="overflow-hidden rounded-ui-lg border border-[var(--line)] bg-[var(--bg-surface)] shadow-ui-xs">
          <div className="border-b border-[var(--line)] p-4 sm:p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-base font-semibold text-[var(--text-primary)]">Vouchers</h2>
                <p className="text-sm text-[var(--text-muted)]">
                  Search, review and manage every voucher promotion.
                </p>
              </div>
              <label className="relative block w-full lg:max-w-sm">
                <Search
                  size={17}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                  aria-hidden="true"
                />
                <span className="sr-only">Search vouchers</span>
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search voucher or service"
                  className="min-h-10 w-full rounded-ui-md border border-[var(--line)] bg-[var(--bg-soft)] pl-10 pr-3 text-sm outline-none focus-visible:shadow-ui-focus-strong"
                />
              </label>
            </div>
            <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
              {(
                [
                  ['all', 'All', metrics.total],
                  ['active', 'Active', metrics.active],
                  ['sold', 'Sold', metrics.sold],
                  ['redeemed', 'Redeemed', metrics.redeemed],
                  ['expiring', 'Expiring soon', metrics.expiring],
                ] as const
              ).map(([id, label, count]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setFilter(id)}
                  className={`min-h-9 shrink-0 rounded-full border px-3 text-xs font-semibold ${
                    filter === id
                      ? 'border-[var(--brand)] bg-[var(--brand-soft)] text-[var(--brand)]'
                      : 'border-[var(--line)] text-[var(--text-secondary)] hover:bg-[var(--bg-soft)]'
                  }`}
                >
                  {label} · {count}
                </button>
              ))}
            </div>
          </div>

          {visibleVouchers.length ? (
            <div className="divide-y divide-[var(--line)]">
              {visibleVouchers.map((voucher) => (
                <article
                  key={voucher.id}
                  className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center"
                >
                  <div className="flex min-w-0 gap-3">
                    <span className="h-fit rounded-ui-md bg-[var(--brand-soft)] p-2.5 text-[var(--brand)]">
                      <Gift size={18} aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-[var(--text-primary)]">{voucher.name}</h3>
                        {statusBadge(voucher)}
                        {isExpiringSoon(voucher) ? <StatusBadge tone="warning">Expiring soon</StatusBadge> : null}
                      </div>
                      <p className="mt-1 text-sm text-[var(--text-secondary)]">
                        {voucher.serviceIds.map((id) => serviceNameMap.get(id) || id).join(', ')}
                      </p>
                      <p className="mt-1 text-xs text-[var(--text-muted)]">
                        {currency.format(voucher.price)} · expires {voucher.expiryDate}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => void handleCopyLink(voucher)}
                    >
                      {copiedVoucherId === voucher.id ? <Check size={14} /> : <Copy size={14} />}
                      {copiedVoucherId === voucher.id ? 'Link copied' : 'Copy link'}
                    </Button>
                    {voucher.secretCode ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => handleCopySecretCode(voucher)}
                      >
                        {copiedSecretVoucherId === voucher.id ? 'Code copied' : 'Copy code'}
                      </Button>
                    ) : null}
                    {voucher.status === 'active' && voucher.secretCode ? (
                      <>
                        <label className="sr-only" htmlFor={`voucher-code-${voucher.id}`}>
                          Confirm sale code for {voucher.name}
                        </label>
                        <input
                          id={`voucher-code-${voucher.id}`}
                          value={saleCodeInputs[voucher.id] || ''}
                          onChange={(event) =>
                            setSaleCodeInputs((current) => ({
                              ...current,
                              [voucher.id]: event.target.value,
                            }))
                          }
                          placeholder="Secret code"
                          className="min-h-9 w-32 rounded-ui-md border border-[var(--line)] bg-[var(--bg-soft)] px-3 text-sm outline-none focus-visible:shadow-ui-focus-strong"
                        />
                        <Button
                          type="button"
                          size="sm"
                          disabled={confirmingVoucherId === voucher.id}
                          onClick={() => void handleConfirmSold(voucher)}
                        >
                          {confirmingVoucherId === voucher.id ? 'Confirming…' : 'Confirm sold'}
                        </Button>
                      </>
                    ) : voucher.status !== 'active' ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={resettingVoucherId === voucher.id}
                        onClick={() => setResetTarget(voucher)}
                      >
                        Reset
                      </Button>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Search size={25} />}
              title={vouchers.length ? 'No vouchers match these filters' : 'No vouchers created yet'}
              description={
                vouchers.length
                  ? 'Try another search or clear the current status filter.'
                  : 'Create a voucher to launch your first promotion.'
              }
              className="m-5"
              action={
                vouchers.length ? (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setSearch('');
                      setFilter('all');
                    }}
                  >
                    Clear filters
                  </Button>
                ) : (
                  <Button onClick={() => setIsEditorOpen(true)}>Create voucher</Button>
                )
              }
            />
          )}
        </section>
      )}

      <AppDrawer
        open={isEditorOpen}
        onClose={() => {
          if (!isSaving) setIsEditorOpen(false);
        }}
        title="Create voucher"
        description="Build a shareable service promotion."
        variant="right"
        busy={isSaving}
        footer={
          <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" disabled={isSaving} onClick={() => setIsEditorOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="voucher-editor-form" disabled={isSaving}>
              {isSaving ? 'Creating…' : 'Create voucher'}
            </Button>
          </div>
        }
      >
        <form id="voucher-editor-form" onSubmit={onCreate} className="space-y-5">
          <div>
            <label htmlFor="voucher-name" className="mb-1.5 block text-sm font-semibold text-[var(--text-primary)]">
              Voucher name
            </label>
            <input
              id="voucher-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Mother's Day wellness voucher"
              className="min-h-11 w-full rounded-ui-md border border-[var(--line)] bg-[var(--bg-soft)] px-3 outline-none focus-visible:shadow-ui-focus-strong"
              required
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="voucher-price" className="mb-1.5 block text-sm font-semibold text-[var(--text-primary)]">
                Sale price
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--text-muted)]">RM</span>
                <input
                  id="voucher-price"
                  type="number"
                  min={0}
                  step="0.01"
                  value={price}
                  onChange={(event) => setPrice(Number(event.target.value) || 0)}
                  className="min-h-11 w-full rounded-ui-md border border-[var(--line)] bg-[var(--bg-soft)] pl-10 pr-3 outline-none focus-visible:shadow-ui-focus-strong"
                  required
                />
              </div>
            </div>
            <div>
              <label htmlFor="voucher-expiry" className="mb-1.5 block text-sm font-semibold text-[var(--text-primary)]">
                Expiry date
              </label>
              <input
                id="voucher-expiry"
                type="date"
                value={expiryDate}
                min={new Date().toISOString().slice(0, 10)}
                onChange={(event) => setExpiryDate(event.target.value)}
                className="min-h-11 w-full rounded-ui-md border border-[var(--line)] bg-[var(--bg-soft)] px-3 outline-none focus-visible:shadow-ui-focus-strong"
                required
              />
            </div>
          </div>
          <fieldset>
            <legend className="mb-1.5 text-sm font-semibold text-[var(--text-primary)]">Included services</legend>
            <p className="mb-3 text-xs text-[var(--text-muted)]">Select one or more services included in this voucher.</p>
            <div className="max-h-72 space-y-2 overflow-y-auto rounded-ui-md border border-[var(--line)] p-2">
              {services.length ? (
                services.map((service) => {
                  const selected = selectedServiceIds.includes(service.id);
                  return (
                    <label
                      key={service.id}
                      className={`flex cursor-pointer items-center gap-3 rounded-ui-md p-3 ${
                        selected ? 'bg-[var(--brand-soft)]' : 'hover:bg-[var(--bg-soft)]'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() =>
                          setSelectedServiceIds((current) =>
                            selected
                              ? current.filter((id) => id !== service.id)
                              : [...current, service.id],
                          )
                        }
                        className="h-4 w-4 accent-[var(--brand)]"
                      />
                      <span className="text-sm font-medium text-[var(--text-primary)]">{service.name}</span>
                    </label>
                  );
                })
              ) : (
                <p className="p-4 text-sm text-[var(--text-muted)]">
                  Add a service before creating a voucher.
                </p>
              )}
            </div>
          </fieldset>
          {error ? <Alert tone="danger">{error}</Alert> : null}
        </form>
      </AppDrawer>

      <ConfirmationDialog
        open={!!resetTarget}
        onClose={() => setResetTarget(null)}
        onConfirm={() => resetTarget && void handleResetVoucher(resetTarget)}
        busy={!!resettingVoucherId}
        tone="primary"
        title="Reset voucher?"
        description={resetTarget ? `Reset “${resetTarget.name}” back to active?` : undefined}
        confirmLabel="Reset voucher"
      />
    </div>
  );
};

export default Marketing;
