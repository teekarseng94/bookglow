import React, { useEffect, useMemo, useState } from 'react';
import { Service, Voucher } from '../types';
import { voucherService } from '../services/voucherService';
import { PageHeader } from '../components/ui/PageHeader';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Button } from '../components/ui/Button';
import { Alert } from '../components/ui/Alert';
import { EmptyState } from '../components/ui/EmptyState';
import { ConfirmationDialog } from '../components/ui/ConfirmationDialog';

interface MarketingProps {
  outletID: string;
  services: Service[];
  role: 'admin' | 'cashier' | null;
}

const Marketing: React.FC<MarketingProps> = ({ outletID, services, role }) => {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [name, setName] = useState('');
  const [price, setPrice] = useState<number>(0);
  const [expiryDate, setExpiryDate] = useState('');
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedVoucherId, setCopiedVoucherId] = useState<string | null>(null);
  const [copiedSecretVoucherId, setCopiedSecretVoucherId] = useState<string | null>(null);
  const [resettingVoucherId, setResettingVoucherId] = useState<string | null>(null);
  const [confirmingVoucherId, setConfirmingVoucherId] = useState<string | null>(null);
  const [saleCodeInputs, setSaleCodeInputs] = useState<Record<string, string>>({});
  const [resetTarget, setResetTarget] = useState<Voucher | null>(null);

  const serviceNameMap = useMemo(() => {
    return new Map(services.map((s) => [s.id, s.name]));
  }, [services]);

  const loadVouchers = async () => {
    if (!outletID) return;
    const list = await voucherService.getByOutlet(outletID);
    setVouchers(
      list.sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime;
      })
    );
  };

  const handleCopyLink = async (voucher: Voucher) => {
    const path = `/buy-voucher/${voucher.slug}`;
    const fullUrl = `${window.location.origin}${path}`;
    await navigator.clipboard.writeText(fullUrl);
    setCopiedVoucherId(voucher.id);
    window.setTimeout(() => {
      setCopiedVoucherId((current) => (current === voucher.id ? null : current));
    }, 1500);
  };

  const handleCopySecretCode = async (voucher: Voucher) => {
    if (!voucher.secretCode) return;
    await navigator.clipboard.writeText(voucher.secretCode);
    setCopiedSecretVoucherId(voucher.id);
    window.setTimeout(() => {
      setCopiedSecretVoucherId((current) => (current === voucher.id ? null : current));
    }, 1500);
  };

  const handleResetVoucher = async (voucher: Voucher) => {
    if (voucher.status === 'active') return;
    try {
      setResettingVoucherId(voucher.id);
      setError(null);
      await voucherService.resetVoucher(voucher.id);
      await loadVouchers();
      setResetTarget(null);
    } catch (e: any) {
      setError(e.message || 'Failed to reset voucher.');
    } finally {
      setResettingVoucherId(null);
    }
  };

  const handleConfirmSold = async (voucher: Voucher) => {
    const enteredCode = (saleCodeInputs[voucher.id] || '').trim();
    if (!enteredCode) {
      setError('Please enter secret code to confirm sale.');
      return;
    }
    try {
      setConfirmingVoucherId(voucher.id);
      setError(null);
      await voucherService.confirmSoldByCode(voucher.id, enteredCode);
      setSaleCodeInputs((prev) => ({ ...prev, [voucher.id]: '' }));
      await loadVouchers();
    } catch (e: any) {
      setError(e.message || 'Failed to confirm voucher sale.');
    } finally {
      setConfirmingVoucherId(null);
    }
  };

  useEffect(() => {
    loadVouchers().catch((e) => setError(e.message || 'Failed to load vouchers.'));
  }, [outletID]);

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (role !== 'admin') {
      setError('Only admins can create vouchers.');
      return;
    }
    if (!name.trim() || !expiryDate || selectedServiceIds.length === 0) {
      setError('Please complete all fields and select at least one service.');
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
      setName('');
      setPrice(0);
      setExpiryDate('');
      setSelectedServiceIds([]);
      await loadVouchers();
    } catch (e: any) {
      setError(e.message || 'Failed to create voucher.');
    } finally {
      setIsSaving(false);
    }
  };

  if (role !== 'admin') {
    return (
      <div className="bg-[var(--bg-surface)] border border-[var(--line)] rounded-ui-lg p-6">
        <PageHeader title="Marketing" description="Only admins can access voucher management." />
      </div>
    );
  }

  const voucherStatusBadge = (voucher: Voucher) => {
    if (voucher.status === 'active' && voucher.secretCode) {
      return <StatusBadge tone="warning">Pending confirmation</StatusBadge>;
    }
    if (voucher.status === 'sold') return <StatusBadge tone="success">Sold</StatusBadge>;
    if (voucher.status === 'redeemed') return <StatusBadge tone="info">Redeemed</StatusBadge>;
    return <StatusBadge tone="neutral">{voucher.status}</StatusBadge>;
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <PageHeader
        title="Marketing"
        description="Create, sell, and track service voucher links."
      />

      <form onSubmit={onCreate} className="bg-[var(--bg-surface)] border border-[var(--line)] rounded-ui-lg p-6 space-y-4 shadow-ui-xs">
        <h3 className="text-lg font-bold text-[var(--text-primary)]">Create Voucher</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase text-[var(--text-muted)] mb-1.5">Voucher Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-3 bg-[var(--bg-soft)] border border-[var(--line)] rounded-ui-md outline-none focus-visible:shadow-ui-focus-strong"
              placeholder="Example: Mother's Day Wellness Voucher"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-[var(--text-muted)] mb-1.5">Sale Price</label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={price}
              onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
              className="w-full p-3 bg-[var(--bg-soft)] border border-[var(--line)] rounded-ui-md outline-none focus-visible:shadow-ui-focus-strong"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-[var(--text-muted)] mb-1.5">Expiry Date</label>
            <input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className="w-full p-3 bg-[var(--bg-soft)] border border-[var(--line)] rounded-ui-md outline-none focus-visible:shadow-ui-focus-strong"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-[var(--text-muted)] mb-1.5">Included Services</label>
            <select
              multiple
              value={selectedServiceIds}
              onChange={(e) =>
                setSelectedServiceIds(
                  Array.from(e.target.selectedOptions, (opt: HTMLOptionElement) => opt.value)
                )
              }
              className="w-full p-3 min-h-[120px] bg-[var(--bg-soft)] border border-[var(--line)] rounded-ui-md outline-none focus-visible:shadow-ui-focus-strong"
              required
            >
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        {error && <Alert tone="danger">{error}</Alert>}
        <Button type="submit" disabled={isSaving}>
          {isSaving ? 'Creating...' : 'Create Voucher'}
        </Button>
      </form>

      <div className="bg-[var(--bg-surface)] border border-[var(--line)] rounded-ui-lg overflow-hidden shadow-ui-xs">
        <div className="px-6 py-4 border-b border-[var(--line)]">
          <h3 className="text-lg font-bold text-[var(--text-primary)]">Created Vouchers</h3>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden divide-y divide-[var(--line)]">
          {vouchers.map((voucher) => (
            <div key={voucher.id} className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-[var(--text-primary)]">{voucher.name}</p>
                {voucherStatusBadge(voucher)}
              </div>
              <p className="text-xs text-[var(--text-muted)]">
                {voucher.serviceIds.map((id) => serviceNameMap.get(id) || id).join(', ')}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="secondary" onClick={() => handleCopyLink(voucher)}>
                  {copiedVoucherId === voucher.id ? 'Copied link' : 'Copy buy link'}
                </Button>
                {voucher.secretCode ? (
                  <Button type="button" size="sm" variant="secondary" onClick={() => handleCopySecretCode(voucher)}>
                    {copiedSecretVoucherId === voucher.id ? 'Copied code' : 'Copy secret'}
                  </Button>
                ) : null}
              </div>
              {voucher.status === 'active' && voucher.secretCode ? (
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    value={saleCodeInputs[voucher.id] || ''}
                    onChange={(e) =>
                      setSaleCodeInputs((prev) => ({ ...prev, [voucher.id]: e.target.value }))
                    }
                    placeholder="Enter secret code"
                    className="flex-1 min-w-[8rem] p-2 text-xs bg-[var(--bg-soft)] border border-[var(--line)] rounded-ui-sm outline-none"
                  />
                  <Button
                    type="button"
                    size="sm"
                    disabled={confirmingVoucherId === voucher.id}
                    onClick={() => handleConfirmSold(voucher)}
                  >
                    {confirmingVoucherId === voucher.id ? 'Confirming...' : 'Confirm Sold'}
                  </Button>
                </div>
              ) : voucher.status !== 'active' ? (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={resettingVoucherId === voucher.id}
                  onClick={() => setResetTarget(voucher)}
                >
                  {resettingVoucherId === voucher.id ? 'Resetting...' : 'Reset'}
                </Button>
              ) : null}
            </div>
          ))}
          {vouchers.length === 0 && (
            <EmptyState title="No vouchers created yet." className="border-0 rounded-none" />
          )}
        </div>

        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[var(--bg-soft)] text-[10px] font-black uppercase text-[var(--text-muted)]">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Secret Code</th>
                <th className="px-4 py-3">Services</th>
                <th className="px-4 py-3">Buy Link</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--line)]">
              {vouchers.map((voucher) => (
                <tr key={voucher.id}>
                  <td className="px-4 py-3 text-sm font-semibold text-[var(--text-primary)]">{voucher.name}</td>
                  <td className="px-4 py-3">{voucherStatusBadge(voucher)}</td>
                  <td className="px-4 py-3">
                    {voucher.secretCode ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-[var(--text-secondary)]">{voucher.secretCode}</span>
                        <Button type="button" size="sm" variant="ghost" onClick={() => handleCopySecretCode(voucher)}>
                          {copiedSecretVoucherId === voucher.id ? 'Copied' : 'Copy'}
                        </Button>
                      </div>
                    ) : (
                      <span className="text-xs font-mono text-[var(--text-muted)]">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--text-secondary)]">
                    {voucher.serviceIds.map((id) => serviceNameMap.get(id) || id).join(', ')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-[var(--brand)]">/buy-voucher/{voucher.slug}</span>
                      <Button type="button" size="sm" variant="ghost" onClick={() => handleCopyLink(voucher)}>
                        {copiedVoucherId === voucher.id ? 'Copied' : 'Copy'}
                      </Button>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {voucher.status === 'active' && voucher.secretCode ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={saleCodeInputs[voucher.id] || ''}
                          onChange={(e) =>
                            setSaleCodeInputs((prev) => ({ ...prev, [voucher.id]: e.target.value }))
                          }
                          placeholder="Enter secret code"
                          className="w-32 p-1.5 text-[11px] bg-[var(--bg-surface)] border border-[var(--line)] rounded-ui-sm outline-none"
                        />
                        <Button
                          type="button"
                          size="sm"
                          disabled={confirmingVoucherId === voucher.id}
                          onClick={() => handleConfirmSold(voucher)}
                        >
                          {confirmingVoucherId === voucher.id ? 'Confirming...' : 'Confirm Sold'}
                        </Button>
                      </div>
                    ) : voucher.status !== 'active' ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={resettingVoucherId === voucher.id}
                        onClick={() => setResetTarget(voucher)}
                      >
                        {resettingVoucherId === voucher.id ? 'Resetting...' : 'Reset'}
                      </Button>
                    ) : (
                      <span className="text-xs text-[var(--text-muted)]">-</span>
                    )}
                  </td>
                </tr>
              ))}
              {vouchers.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-[var(--text-muted)]">
                    No vouchers created yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmationDialog
        open={!!resetTarget}
        onClose={() => setResetTarget(null)}
        onConfirm={() => resetTarget && handleResetVoucher(resetTarget)}
        busy={!!resettingVoucherId}
        tone="primary"
        title="Reset voucher?"
        description={resetTarget ? `Reset "${resetTarget.name}" back to active?` : undefined}
        confirmLabel="Reset"
      />
    </div>
  );
};

export default Marketing;
