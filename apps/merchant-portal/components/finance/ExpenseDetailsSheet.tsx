import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ExternalLink, HandCoins } from 'lucide-react';
import type { Transaction } from '../../types';
import { AppSheet, Button } from '../ui';
import { getExpenseSource } from './financeSelectors';

interface ExpenseDetailsSheetProps {
  expense: Transaction | null;
  canDelete: boolean;
  onClose: () => void;
  onRequestDelete: (expense: Transaction) => void;
}

const money = (value: number) =>
  `RM ${value.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const dateTime = (value: string) => {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return date.toLocaleString('en-MY', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const DetailRow: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="grid grid-cols-[112px_minmax(0,1fr)] gap-3 border-b border-[var(--line-soft)] py-3 last:border-0">
    <dt className="text-xs font-semibold text-[var(--text-muted)]">{label}</dt>
    <dd className="min-w-0 break-words text-right text-sm font-semibold text-[var(--text-primary)]">{children}</dd>
  </div>
);

export const ExpenseDetailsSheet: React.FC<ExpenseDetailsSheetProps> = ({
  expense,
  canDelete,
  onClose,
  onRequestDelete,
}) => {
  const navigate = useNavigate();
  const isGeneratedCommission = Boolean(
    expense && getExpenseSource(expense) === 'commission' && expense.parentSaleId,
  );

  return (
    <AppSheet
      open={Boolean(expense)}
      onClose={onClose}
      title="Expense Details"
      description="Review the complete recorded expense."
      side="bottom"
      mobileMode="full-screen"
      showHandle={false}
      className="md:inset-y-0 md:left-auto md:right-0 md:h-full md:max-h-none md:w-full md:max-w-md md:rounded-none md:rounded-l-ui-lg"
      footer={
        expense && !isGeneratedCommission && canDelete ? (
          <Button variant="danger" className="w-full" onClick={() => onRequestDelete(expense)}>
            Delete Expense
          </Button>
        ) : undefined
      }
    >
      {expense ? (
        <div className="space-y-5">
          <section className="rounded-ui-md border border-[var(--danger-border)] bg-[var(--danger-soft)] p-4">
            <p className="text-xs font-semibold text-[var(--text-muted)]">Description</p>
            <p className="mt-1 break-words text-base font-bold text-[var(--text-primary)]">{expense.description}</p>
            <p className="mt-4 text-xs font-semibold text-[var(--text-muted)]">Amount</p>
            <p className="mt-1 whitespace-nowrap text-2xl font-bold leading-none tabular-nums text-[var(--danger)]">
              -{money(expense.amount)}
            </p>
          </section>

          {isGeneratedCommission ? (
            <section className="rounded-ui-md border border-[var(--brand-border)] bg-[var(--brand-soft)] p-4">
              <div className="flex gap-3">
                <HandCoins className="mt-0.5 h-5 w-5 shrink-0 text-[var(--brand)]" aria-hidden />
                <div>
                  <p className="text-sm font-bold text-[var(--brand-deep)]">Generated commission</p>
                  <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
                    This commission was generated from a sale. Void or adjust the original transaction to reverse it.
                  </p>
                </div>
              </div>
            </section>
          ) : null}

          <section className="rounded-ui-md border border-[var(--line)] bg-[var(--bg-surface)] px-4">
            <dl>
              <DetailRow label="Category">{expense.category || 'Expense'}</DetailRow>
              <DetailRow label="Date & time">{dateTime(expense.date)}</DetailRow>
              {expense.paymentMethod ? <DetailRow label="Payment method">{expense.paymentMethod}</DetailRow> : null}
              {expense.remarks ? <DetailRow label="Notes">{expense.remarks}</DetailRow> : null}
              {expense.createdAt ? <DetailRow label="Created">{dateTime(expense.createdAt)}</DetailRow> : null}
              <DetailRow label="Expense ID"><span className="font-mono text-xs">{expense.id}</span></DetailRow>
              {expense.parentSaleId ? (
                <DetailRow label="Related sale">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 text-[var(--brand)] hover:underline"
                    onClick={() => navigate('/transactions')}
                  >
                    View in Sales History <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </DetailRow>
              ) : null}
            </dl>
          </section>
        </div>
      ) : null}
    </AppSheet>
  );
};

export default ExpenseDetailsSheet;
