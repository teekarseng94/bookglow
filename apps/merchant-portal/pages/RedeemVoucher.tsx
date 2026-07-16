import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { voucherService } from '../services/voucherService';
import { outletService } from '../services/databaseService';
import { Voucher } from '../types';
import { useUserContext } from '../contexts/UserContext';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Button } from '../components/ui/Button';
import { Alert } from '../components/ui/Alert';
import { Field } from '../components/ui/Field';

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
    <div className="min-h-screen bg-[var(--bg-soft)] p-4 sm:p-8">
      <div className="max-w-xl mx-auto bg-[var(--bg-surface)] border border-[var(--line)] rounded-ui-lg p-6 sm:p-8 space-y-5 shadow-ui-xs">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Redeem Voucher</h1>
        {error && <Alert tone="danger">{error}</Alert>}

        {!error && voucher && (
          <>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold text-[var(--text-primary)]">{voucher.name}</h2>
                <StatusBadge
                  tone={
                    voucher.status === 'redeemed'
                      ? 'info'
                      : voucher.status === 'sold'
                        ? 'success'
                        : 'neutral'
                  }
                >
                  {voucher.status}
                </StatusBadge>
              </div>
              {voucher.redeemedAt && (
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Redeemed at: {new Date(voucher.redeemedAt).toLocaleString()}
                </p>
              )}
            </div>
            {role !== 'admin' && (
              <div className="space-y-3 p-4 rounded-ui-md border border-[var(--line)] bg-[var(--bg-soft)]">
                <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                  <input
                    type="checkbox"
                    checked={staffConfirmed}
                    onChange={(e) => setStaffConfirmed(e.target.checked)}
                  />
                  I confirm I am staff authorized to redeem this voucher.
                </label>
                {requiredPin ? (
                  <Field id="staff-pin" label="Staff PIN">
                    <input
                      id="staff-pin"
                      type="password"
                      value={staffPin}
                      onChange={(e) => setStaffPin(e.target.value)}
                      className="w-full p-3 bg-[var(--bg-surface)] border border-[var(--line)] rounded-ui-md outline-none focus-visible:shadow-ui-focus-strong"
                      placeholder="Enter redemption PIN"
                    />
                  </Field>
                ) : (
                  <p className="text-xs text-amber-700">
                    No staff PIN is configured for this outlet. Only manual confirmation is required.
                  </p>
                )}
              </div>
            )}

            <Button
              type="button"
              disabled={
                voucher.status !== 'sold' ||
                isSubmitting ||
                (role !== 'admin' && (!staffConfirmed || (requiredPin ? !staffPin : false)))
              }
              onClick={onConfirmRedemption}
            >
              {isSubmitting ? 'Confirming...' : 'Confirm Redemption'}
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default RedeemVoucher;
