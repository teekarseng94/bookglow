import React, { useEffect, useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { AppModal, Button, Field, ModalFooterActions, SelectField, fieldControlClassName } from '../ui';
import { cx } from '../ui/cx';

const formatRM = (n: number): string =>
  `RM${n.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function todayLocalYmd(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseRenewalAmount(raw: string): { ok: true; value: number } | { ok: false; error: string } {
  const trimmed = raw.trim().replace(/,/g, '');
  if (!trimmed) return { ok: false, error: 'Renewal amount is required' };
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) {
    return { ok: false, error: 'Enter a valid amount (max 2 decimal places)' };
  }
  const value = Number(trimmed);
  if (!(value > 0)) return { ok: false, error: 'Amount must be greater than 0' };
  return { ok: true, value: Math.round(value * 100) / 100 };
}

function formatLastRenewedLabel(iso?: string | null): string {
  if (!iso) return 'Never renewed';
  try {
    return new Date(iso).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return 'Never renewed';
  }
}

export interface RenewMembershipModalProps {
  open: boolean;
  memberName: string;
  lastRenewedAt?: string | null;
  paymentMethods: string[];
  busy?: boolean;
  onClose: () => void;
  /** amount, paymentMethod, renewalDate (YYYY-MM-DD) */
  onConfirm: (amount: number, paymentMethod: string, renewalDate: string) => Promise<void>;
}

export const RenewMembershipModal: React.FC<RenewMembershipModalProps> = ({
  open,
  memberName,
  lastRenewedAt,
  paymentMethods,
  busy = false,
  onClose,
  onConfirm,
}) => {
  const methods = useMemo(
    () =>
      paymentMethods && paymentMethods.length > 0
        ? paymentMethods
        : ['Cash', 'Credit Card', 'E-wallet', 'Other'],
    [paymentMethods],
  );
  const [amountRaw, setAmountRaw] = useState('');
  const [renewalDate, setRenewalDate] = useState(todayLocalYmd);
  const [paymentMethod, setPaymentMethod] = useState(methods[0] || 'Cash');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setAmountRaw('');
    setRenewalDate(todayLocalYmd());
    setPaymentMethod(methods[0] || 'Cash');
    setError(null);
    setSubmitting(false);
  }, [open, methods]);

  const locked = busy || submitting;
  const parsedPreview = parseRenewalAmount(amountRaw);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (locked) return;
    const parsed = parseRenewalAmount(amountRaw);
    if (parsed.ok === false) {
      setError(parsed.error);
      return;
    }
    if (!renewalDate || !/^\d{4}-\d{2}-\d{2}$/.test(renewalDate)) {
      setError('Renewal date is required');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await onConfirm(parsed.value, paymentMethod, renewalDate);
    } catch (err: any) {
      setError(err?.message || 'Failed to renew membership');
      setSubmitting(false);
    }
  };

  return (
    <AppModal
      open={open}
      onClose={onClose}
      title="Renew Membership"
      size="sm"
      busy={locked}
      asForm
      formId="renew-membership-form"
      onSubmit={handleSubmit}
      footer={
        <ModalFooterActions>
          <Button type="button" variant="secondary" size="md" disabled={locked} onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="renew-membership-form" variant="primary" size="md" disabled={locked}>
            {locked ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Confirming…
              </>
            ) : (
              'Confirm Renewal'
            )}
          </Button>
        </ModalFooterActions>
      }
    >
      <div className="space-y-4">
        <div>
          <p className="m-caption text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">Member</p>
          <p className="text-sm font-semibold text-[var(--text-primary)] mt-0.5 truncate">{memberName}</p>
        </div>
        <div>
          <p className="m-caption text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">
            Last renewed
          </p>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">{formatLastRenewedLabel(lastRenewedAt)}</p>
        </div>
        <Field id="renewal-date" label="Renewal Date" required>
          <input
            id="renewal-date"
            type="date"
            disabled={locked}
            className={cx(fieldControlClassName, 'h-11')}
            value={renewalDate}
            onChange={(e) => {
              setRenewalDate(e.target.value);
              if (error) setError(null);
            }}
          />
        </Field>
        <Field id="renewal-amount" label="Renewal Amount (RM)" required error={error || undefined}>
          <div
            className={cx(
              'flex h-11 items-stretch rounded-ui-sm border bg-[var(--bg-surface)]',
              error ? 'border-[var(--danger)]' : 'border-[var(--line-strong)]',
              'focus-within:shadow-ui-focus-strong focus-within:border-[var(--brand)]',
              locked && 'opacity-50 bg-[var(--bg-soft)]',
            )}
          >
            <span
              className="flex items-center pl-3 pr-2 text-sm font-semibold text-[var(--text-muted)] select-none"
              aria-hidden
            >
              RM
            </span>
            <input
              id="renewal-amount"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              disabled={locked}
              placeholder="100.00"
              aria-invalid={Boolean(error)}
              aria-describedby={error ? 'renewal-amount-error' : undefined}
              className="min-w-0 flex-1 h-full bg-transparent pr-3 text-app-body text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] disabled:cursor-not-allowed"
              value={amountRaw}
              onChange={(e) => {
                setAmountRaw(e.target.value);
                if (error) setError(null);
              }}
            />
          </div>
        </Field>
        <SelectField
          id="renewal-payment-method"
          label="Payment Method"
          value={paymentMethod}
          disabled={locked}
          onChange={setPaymentMethod}
          options={methods.map((m) => ({ value: m, label: m }))}
        />
        {parsedPreview.ok ? (
          <p className="text-xs text-[var(--text-muted)]">
            Will record {formatRM(parsedPreview.value)} as a Membership Renewal sale.
          </p>
        ) : null}
      </div>
    </AppModal>
  );
};

export default RenewMembershipModal;
