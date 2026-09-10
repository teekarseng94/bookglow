import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Check,
  Copy,
  Gift,
  Megaphone,
  Plus,
  Search,
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

interface MarketingProps {
  outletID: string;
  services: Service[];
  role: 'admin' | 'cashier' | null;
}

type VoucherFilter = 'all' | VoucherStatus;

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
    return {
      total: vouchers.length,
      active: vouchers.filter((voucher) => voucher.status === 'active').length,
      sold: vouchers.filter((voucher) => voucher.status === 'sold').length,
      redeemed: vouchers.filter((voucher) => voucher.status === 'redeemed').length,
    };
  }, [vouchers]);

  const visibleVouchers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return vouchers.filter((voucher) => {
      const matchesFilter = filter === 'all' || voucher.status === filter;
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
          description="Create and manage customer vouchers."
        />
        <EmptyState
          icon={<Megaphone size={28} />}
          title="Marketing access is restricted"
          description="Ask an administrator for access to create and manage vouchers."
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4 animate-fadeIn">
      <PageHeader
        title="Marketing"
        description="Create and manage customer vouchers."
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

      {isLoading ? (
        <section className="rounded-ui-lg border border-[var(--line)] bg-[var(--bg-surface)] p-5 shadow-ui-xs">
          <LoadingSkeleton rows={4} />
        </section>
      ) : (
        <section className="overflow-hidden rounded-ui-lg border border-[var(--line)] bg-[var(--bg-surface)] shadow-ui-xs">
          <div className="border-b border-[var(--line)] p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-semibold text-[var(--text-primary)]">Vouchers</h2>
                <p className="text-sm text-[var(--text-muted)]">Manage every customer voucher.</p>
              </div>
              <label className="relative block w-full sm:max-w-sm">
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
                  placeholder="Search vouchers..."
                  className="min-h-11 w-full rounded-ui-md border border-[var(--line)] bg-[var(--bg-soft)] pl-10 pr-3 text-sm outline-none focus-visible:shadow-ui-focus-strong"
                />
              </label>
            </div>
            <div className="-mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1">
              {(
                [
                  ['all', 'All', metrics.total],
                  ['active', 'Active', metrics.active],
                  ['sold', 'Sold', metrics.sold],
                  ['redeemed', 'Redeemed', metrics.redeemed],
                ] as const
              ).map(([id, label, count]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setFilter(id)}
                  aria-pressed={filter === id}
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
            <div className="grid gap-3 p-3 sm:p-4 lg:grid-cols-2">
              {visibleVouchers.map((voucher) => (
                <article
                  key={voucher.id}
                  className="min-w-0 rounded-ui-md border border-[var(--line)] bg-[var(--bg-surface)] p-4"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="shrink-0 rounded-ui-md bg-[var(--brand-soft)] p-2.5 text-[var(--brand)]">
                      <Gift size={18} aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {statusBadge(voucher)}
                        {isExpiringSoon(voucher) ? <StatusBadge tone="warning">Expiring soon</StatusBadge> : null}
                      </div>
                      <h3 className="mt-2 break-words font-semibold text-[var(--text-primary)]">{voucher.name}</h3>
                      <p className="mt-1 break-words text-sm text-[var(--text-secondary)]">
                        {voucher.serviceIds.map((id) => serviceNameMap.get(id) || id).join(', ')}
                      </p>
                      <p className="mt-1 text-xs font-medium text-[var(--text-muted)]">
                        {currency.format(voucher.price)} · Expires {voucher.expiryDate}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2">
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
                      <div className="flex min-w-0 flex-1 flex-wrap gap-2 sm:flex-nowrap">
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
                          className="min-h-9 min-w-0 flex-1 rounded-ui-md border border-[var(--line)] bg-[var(--bg-soft)] px-3 text-sm outline-none focus-visible:shadow-ui-focus-strong"
                        />
                        <Button
                          type="button"
                          size="sm"
                          disabled={confirmingVoucherId === voucher.id}
                          onClick={() => void handleConfirmSold(voucher)}
                        >
                          {confirmingVoucherId === voucher.id ? 'Confirming…' : 'Confirm sold'}
                        </Button>
                      </div>
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
              title={vouchers.length ? 'No vouchers match these filters' : 'No vouchers yet.'}
              description={
                vouchers.length
                  ? 'Try another search or clear the current status filter.'
                  : 'Create a voucher to get started.'
              }
              className="m-4"
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
                  <Button onClick={() => setIsEditorOpen(true)}>
                    <Plus size={16} aria-hidden="true" />
                    Create voucher
                  </Button>
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
