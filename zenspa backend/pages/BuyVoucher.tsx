import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { serviceService } from '../services/firestoreService';
import { voucherService } from '../services/voucherService';
import { Service, Voucher } from '../types';

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
    <div className="min-h-screen bg-slate-50 p-4 sm:p-8">
      <div className="max-w-2xl mx-auto bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-5">
        <h1 className="text-2xl font-bold text-slate-900">Buy Voucher</h1>

        {error && <p className="text-sm text-rose-600 font-semibold">{error}</p>}

        {!error && voucher && (
          <>
            <div>
              <h2 className="text-xl font-bold text-slate-800">{voucher.name}</h2>
              <p className="text-slate-600 mt-1">Price: ${voucher.price.toFixed(2)}</p>
              <p className="text-sm text-slate-500 mt-1">Expiry: {voucher.expiryDate}</p>
              <p className="text-xs uppercase font-bold mt-2 text-slate-500">Status: {voucher.status}</p>
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
              <h3 className="text-sm font-bold uppercase text-slate-500 mb-2">Included Services</h3>
              <ul className="space-y-2">
                {includedServices?.map((service) => (
                  <li key={service.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <p className="font-semibold text-slate-800">{service.name}</p>
                    <p className="text-xs text-slate-500">{service.duration} mins</p>
                  </li>
                ))}
              </ul>
            </div>

            <button
              type="button"
              disabled={voucher.status !== 'active' || isBuying || isExpired || Boolean(voucher.secretCode)}
              onClick={onPurchase}
              className={`px-5 py-2.5 rounded-xl font-bold text-white ${
                voucher.status !== 'active' || isBuying || isExpired || Boolean(voucher.secretCode)
                  ? 'bg-slate-400 cursor-not-allowed'
                  : 'bg-teal-600 hover:bg-teal-700'
              }`}
            >
              {isBuying ? 'Generating Code...' : voucher.secretCode ? 'Code Generated' : 'Redeem'}
            </button>

            {redemptionLink && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                <p className="text-sm font-semibold text-emerald-700">Secret code generated.</p>
                <p className="text-xs font-mono text-emerald-800 mt-1">{redemptionLink}</p>
                <p className="text-sm font-semibold text-emerald-700 mt-3">Secret Code</p>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-lg font-black tracking-widest text-emerald-900">{secretCode}</p>
                  <button
                    type="button"
                    onClick={onCopySecretCode}
                    className="px-2 py-1 text-[11px] font-bold rounded-md border border-emerald-300 text-emerald-800 hover:bg-emerald-100"
                  >
                    {copiedCode ? 'Copied' : 'Copy'}
                  </button>
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
