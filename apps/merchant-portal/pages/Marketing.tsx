import React, { useEffect, useMemo, useState } from 'react';
import { Service, Voucher } from '../types';
import { voucherService } from '../services/voucherService';

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
    const confirmed = window.confirm(`Reset "${voucher.name}" back to active?`);
    if (!confirmed) return;
    try {
      setResettingVoucherId(voucher.id);
      setError(null);
      await voucherService.resetVoucher(voucher.id);
      await loadVouchers();
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
      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        <h2 className="text-xl font-bold text-slate-900">Marketing</h2>
        <p className="text-slate-600 mt-2">Only admins can access voucher management.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h2 className="text-app-page sm:text-app-page-lg font-bold tracking-tight text-slate-900">Marketing</h2>
        <p className="text-sm text-slate-600">Create, sell, and track service voucher links.</p>
      </div>

      <form onSubmit={onCreate} className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
        <h3 className="text-lg font-bold text-slate-900">Create Voucher</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">Voucher Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="Example: Mother's Day Wellness Voucher"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">Sale Price</label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={price}
              onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">Expiry Date</label>
            <input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">Included Services</label>
            <select
              multiple
              value={selectedServiceIds}
              onChange={(e) =>
                setSelectedServiceIds(Array.from(e.target.selectedOptions).map((opt) => opt.value))
              }
              className="w-full p-3 min-h-[120px] bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500"
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
        {error && <p className="text-sm text-rose-600 font-medium">{error}</p>}
        <button
          type="submit"
          disabled={isSaving}
          className={`px-5 py-2.5 rounded-xl font-bold text-white ${
            isSaving ? 'bg-slate-400 cursor-not-allowed' : 'bg-teal-600 hover:bg-teal-700'
          }`}
        >
          {isSaving ? 'Creating...' : 'Create Voucher'}
        </button>
      </form>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="text-lg font-bold text-slate-900">Created Vouchers</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-[10px] font-black uppercase text-slate-500">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Secret Code</th>
                <th className="px-4 py-3">Services</th>
                <th className="px-4 py-3">Buy Link</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {vouchers.map((voucher) => (
                <tr key={voucher.id}>
                  <td className="px-4 py-3 text-sm font-semibold text-slate-800">{voucher.name}</td>
                  <td className="px-4 py-3 text-xs font-bold uppercase">
                    {voucher.status === 'active' && voucher.secretCode ? (
                      <span className="text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-md">
                        Pending Staff Confirmation
                      </span>
                    ) : (
                      <span className="text-slate-600">{voucher.status}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {voucher.secretCode ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-slate-700">{voucher.secretCode}</span>
                        <button
                          type="button"
                          onClick={() => handleCopySecretCode(voucher)}
                          className="px-2 py-1 text-[11px] font-bold rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50"
                        >
                          {copiedSecretVoucherId === voucher.id ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs font-mono text-slate-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">
                    {voucher.serviceIds.map((id) => serviceNameMap.get(id) || id).join(', ')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-teal-700">/buy-voucher/{voucher.slug}</span>
                      <button
                        type="button"
                        onClick={() => handleCopyLink(voucher)}
                        className="px-2 py-1 text-[11px] font-bold rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50"
                      >
                        {copiedVoucherId === voucher.id ? 'Copied' : 'Copy'}
                      </button>
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
                          className="w-32 p-1.5 text-[11px] bg-white border border-slate-200 rounded-md outline-none focus:ring-2 focus:ring-teal-500"
                        />
                        <button
                          type="button"
                          onClick={() => handleConfirmSold(voucher)}
                          disabled={confirmingVoucherId === voucher.id}
                          className={`px-3 py-1.5 text-[11px] font-bold rounded-md border ${
                            confirmingVoucherId === voucher.id
                              ? 'border-slate-200 text-slate-400 bg-slate-50 cursor-not-allowed'
                              : 'border-teal-200 text-teal-700 bg-teal-50 hover:bg-teal-100'
                          }`}
                        >
                          {confirmingVoucherId === voucher.id ? 'Confirming...' : 'Confirm Sold'}
                        </button>
                      </div>
                    ) : voucher.status !== 'active' ? (
                      <button
                        type="button"
                        onClick={() => handleResetVoucher(voucher)}
                        disabled={resettingVoucherId === voucher.id}
                        className={`px-3 py-1.5 text-[11px] font-bold rounded-md border ${
                          resettingVoucherId === voucher.id
                            ? 'border-slate-200 text-slate-400 bg-slate-50 cursor-not-allowed'
                            : 'border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100'
                        }`}
                      >
                        {resettingVoucherId === voucher.id ? 'Resetting...' : 'Reset'}
                      </button>
                    ) : (
                      <span className="text-xs text-slate-400">-</span>
                    )}
                  </td>
                </tr>
              ))}
              {vouchers.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">
                    No vouchers created yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Marketing;
