import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { voucherService } from '../services/voucherService';
import { outletService } from '../services/firestoreService';
import { Voucher } from '../types';
import { useUserContext } from '../contexts/UserContext';

const RedeemVoucher: React.FC = () => {
  const { unique_id = '' } = useParams();
  const { role } = useUserContext();
  const [voucher, setVoucher] = useState<Voucher | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [staffPin, setStaffPin] = useState('');
  const [requiredPin, setRequiredPin] = useState<string>('');
  const [staffConfirmed, setStaffConfirmed] = useState(false);

  const load = async () => {
    const data = await voucherService.getByRedemptionId(unique_id);
    if (!data) {
      setError('Invalid redemption link.');
      return;
    }
    setVoucher(data);
    const outlet = await outletService.getById(data.outletID);
    setRequiredPin(outlet?.settings?.voucherRedemptionPin || '');
  };

  useEffect(() => {
    load().catch((e) => setError(e.message || 'Failed to load voucher.'));
  }, [unique_id]);

  const onConfirmRedemption = async () => {
    if (!voucher) return;
    const isAdmin = role === 'admin';
    if (!isAdmin) {
      if (!staffConfirmed) {
        setError('Staff confirmation is required before redemption.');
        return;
      }
      if (requiredPin && staffPin !== requiredPin) {
        setError('Invalid staff PIN.');
        return;
      }
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await voucherService.confirmRedemption(voucher.id);
      await load();
    } catch (e: any) {
      setError(e.message || 'Failed to confirm redemption.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-8">
      <div className="max-w-xl mx-auto bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-5">
        <h1 className="text-2xl font-bold text-slate-900">Redeem Voucher</h1>
        {error && <p className="text-sm text-rose-600 font-semibold">{error}</p>}

        {!error && voucher && (
          <>
            <div>
              <h2 className="text-xl font-bold text-slate-800">{voucher.name}</h2>
              <p className="text-sm text-slate-600 mt-1">Status: {voucher.status}</p>
              {voucher.redeemedAt && (
                <p className="text-xs text-slate-500 mt-1">
                  Redeemed at: {new Date(voucher.redeemedAt).toLocaleString()}
                </p>
              )}
            </div>
            {role !== 'admin' && (
              <div className="space-y-3 p-4 rounded-xl border border-slate-200 bg-slate-50">
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={staffConfirmed}
                    onChange={(e) => setStaffConfirmed(e.target.checked)}
                  />
                  I confirm I am staff authorized to redeem this voucher.
                </label>
                {requiredPin ? (
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">Staff PIN</label>
                    <input
                      type="password"
                      value={staffPin}
                      onChange={(e) => setStaffPin(e.target.value)}
                      className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500"
                      placeholder="Enter redemption PIN"
                    />
                  </div>
                ) : (
                  <p className="text-xs text-amber-700">
                    No staff PIN is configured for this outlet. Only manual confirmation is required.
                  </p>
                )}
              </div>
            )}

            <button
              type="button"
              disabled={
                voucher.status !== 'sold' ||
                isSubmitting ||
                (role !== 'admin' && (!staffConfirmed || (requiredPin ? !staffPin : false)))
              }
              onClick={onConfirmRedemption}
              className={`px-5 py-2.5 rounded-xl font-bold text-white ${
                voucher.status !== 'sold' || isSubmitting
                  ? 'bg-slate-400 cursor-not-allowed'
                  : 'bg-teal-600 hover:bg-teal-700'
              }`}
            >
              {isSubmitting ? 'Confirming...' : 'Confirm Redemption'}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default RedeemVoucher;
