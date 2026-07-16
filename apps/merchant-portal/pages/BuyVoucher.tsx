import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { serviceService } from '../services/databaseService';
import { voucherService } from '../services/voucherService';
import { Service, Voucher } from '../types';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Button } from '../components/ui/Button';
import { Alert } from '../components/ui/Alert';

const BuyVoucher: React.FC = () => {
  const { slug = '' } = useParams();
  const [voucher, setVoucher] = useState<Voucher | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isBuying, setIsBuying] = useState(false);
  const [redemptionLink, setRedemptionLink] = useState('');
  const [secretCode, setSecretCode] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);

  const isExpired = useMemo(() => {
    if (!voucher?.expiryDate) return false;
    const endOfExpiry = new Date(`${voucher.expiryDate}T23:59:59`);
    if (Number.isNaN(endOfExpiry.getTime())) return false;
    return Date.now() > endOfExpiry.getTime();
  }, [voucher?.expiryDate]);

  useEffect(() => {
    const load = async () => {
      const data = await voucherService.getBySlug(slug);
      if (!data) {
        setError('Voucher not found.');
        return;
      }
      setVoucher(data);
      const svc = await serviceService.getAll(data.outletID);
      setServices(svc);
    };
    load().catch((e) => setError(e.message || 'Failed to load voucher.'));
  }, [slug]);

  useEffect(() => {
    if (!voucher) return;
    if (voucher.secretCode) setSecretCode(voucher.secretCode);
    if (voucher.redemptionId) setRedemptionLink(`/redeem/${voucher.redemptionId}`);
  }, [voucher]);

  const includedServices = useMemo(() => {
    const map = new Map(services.map((s) => [s.id, s]));
    return voucher?.serviceIds.map((id) => map.get(id)).filter(Boolean) as Service[] | undefined;
  }, [services, voucher]);

  const onPurchase = async () => {
    if (!voucher) return;
    if (isExpired) {
      setError('This voucher has expired and cannot be purchased.');
      return;
    }
    setIsBuying(true);
    setError(null);
    try {
      const { redemptionId, secretCode: generatedCode } = await voucherService.purchase(voucher.id);
      setRedemptionLink(`/redeem/${redemptionId}`);
      setSecretCode(generatedCode);
      const updated = await voucherService.getById(voucher.id);
      setVoucher(updated);
    } catch (e: any) {
      setError(e.message || 'Failed to purchase voucher.');
    } finally {
      setIsBuying(false);
    }
  };

  const onCopySecretCode = async () => {
    if (!secretCode) return;
    await navigator.clipboard.writeText(secretCode);
    setCopiedCode(true);
    window.setTimeout(() => setCopiedCode(false), 1500);
  };

  return (
    <div className="min-h-screen bg-[var(--bg-soft)] p-4 sm:p-8">
      <div className="max-w-2xl mx-auto bg-[var(--bg-surface)] border border-[var(--line)] rounded-ui-lg p-6 sm:p-8 space-y-5 shadow-ui-xs">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Buy Voucher</h1>

        {error && <Alert tone="danger">{error}</Alert>}

        {!error && voucher && (
          <>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold text-[var(--text-primary)]">{voucher.name}</h2>
                <StatusBadge tone={isExpired ? 'danger' : voucher.secretCode ? 'warning' : 'brand'}>
                  {isExpired ? 'Expired' : voucher.secretCode ? 'Pending confirmation' : voucher.status}
                </StatusBadge>
              </div>
              <p className="text-[var(--text-secondary)] mt-1">Price: ${voucher.price.toFixed(2)}</p>
              <p className="text-sm text-[var(--text-muted)] mt-1">Expiry: {voucher.expiryDate}</p>
              {voucher.status === 'active' && voucher.secretCode && (
                <p className="text-xs font-semibold text-amber-700 mt-2">
                  Code generated - pending staff confirmation in Marketing.
                </p>
              )}
              {isExpired && (
                <p className="text-xs font-semibold text-rose-600 mt-2">This voucher is expired.</p>
              )}
            </div>

            <div>
              <h3 className="text-sm font-bold uppercase text-[var(--text-muted)] mb-2">Included Services</h3>
              <ul className="space-y-2">
                {includedServices?.map((service) => (
                  <li key={service.id} className="p-3 rounded-ui-md bg-[var(--bg-soft)] border border-[var(--line)]">
                    <p className="font-semibold text-[var(--text-primary)]">{service.name}</p>
                    <p className="text-xs text-[var(--text-muted)]">{service.duration} mins</p>
                  </li>
                ))}
              </ul>
            </div>

            <Button
              type="button"
              disabled={voucher.status !== 'active' || isBuying || isExpired || Boolean(voucher.secretCode)}
              onClick={onPurchase}
            >
              {isBuying ? 'Generating Code...' : voucher.secretCode ? 'Code Generated' : 'Redeem'}
            </Button>

            {redemptionLink && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-ui-md">
                <p className="text-sm font-semibold text-emerald-700">Secret code generated.</p>
                <p className="text-xs font-mono text-emerald-800 mt-1">{redemptionLink}</p>
                <p className="text-sm font-semibold text-emerald-700 mt-3">Secret Code</p>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-lg font-black tracking-widest text-emerald-900">{secretCode}</p>
                  <Button type="button" size="sm" variant="secondary" onClick={onCopySecretCode}>
                    {copiedCode ? 'Copied' : 'Copy'}
                  </Button>
                </div>
                <p className="text-[11px] text-emerald-800 mt-1">
                  Show this code to staff. Voucher is considered sold only after staff confirms this code in Marketing.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default BuyVoucher;
