import React from 'react';
import { Clock3, Pencil, Percent, ReceiptText, ShoppingBag, Trash2, UserRound } from 'lucide-react';
import type { Client, Transaction } from '../../types';
import { TransactionType } from '../../types';
import { cx } from '../ui/cx';
import { isCommissionTransaction, type TransactionDateGroup } from './transactionHistorySelectors';

interface MobileTransactionHistoryProps {
  groups: TransactionDateGroup[];
  clients: Client[];
  isLocked?: boolean;
  hasMore: boolean;
  onOpen: (transaction: Transaction) => void;
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
  onLoadMore: () => void;
}

const formatRM = (value: number) => `RM${value.toLocaleString('en-MY', { maximumFractionDigits: 2 })}`;

const typeStyle = (transaction: Transaction) => {
  if (transaction.type === TransactionType.SALE) return { label: 'Sale', sign: '+', icon: ShoppingBag, iconClass: 'bg-[var(--success-soft)] text-[var(--success)]', amountClass: 'text-[var(--success)]', badgeClass: 'bg-[var(--success-soft)] text-[var(--success)]' };
  if (isCommissionTransaction(transaction)) return { label: 'Commission', sign: '-', icon: Percent, iconClass: 'bg-[var(--warning-soft)] text-[var(--warning)]', amountClass: 'text-[var(--warning)]', badgeClass: 'bg-[var(--warning-soft)] text-[var(--warning)]' };
  return { label: 'Expense', sign: '-', icon: ReceiptText, iconClass: 'bg-[var(--danger-soft)] text-[var(--danger)]', amountClass: 'text-[var(--danger)]', badgeClass: 'bg-[var(--danger-soft)] text-[var(--danger)]' };
};

export const MobileTransactionHistory: React.FC<MobileTransactionHistoryProps> = ({ groups, clients, isLocked, hasMore, onOpen, onEdit, onDelete, onLoadMore }) => (
  <section className="overflow-hidden rounded-ui-lg border border-[var(--line)] bg-[var(--bg-surface)] md:hidden">
    {groups.map((group) => (
      <div key={group.key}>
        <header className="flex items-center justify-between border-b border-[var(--line)] bg-[var(--bg-soft)] px-4 py-3">
          <h2 className="text-base font-bold text-[var(--text-primary)]">{group.label}</h2>
          <span className="rounded-full bg-[var(--brand-soft)] px-2.5 py-1 text-[11px] font-semibold text-[var(--brand)]">{group.transactions.length} {group.transactions.length === 1 ? 'transaction' : 'transactions'}</span>
        </header>
        <div className="divide-y divide-[var(--line-soft)] px-3">
          {group.transactions.map((transaction) => {
            const style = typeStyle(transaction);
            const Icon = style.icon;
            const client = clients.find((item) => item.id === transaction.clientId);
            const clientName = client?.name || (transaction.type === TransactionType.SALE ? 'Guest' : '—');
            const date = new Date(transaction.date);
            return (
              <article key={transaction.id} className="grid min-w-0 grid-cols-[44px_minmax(0,1fr)_auto_44px] items-center gap-2 py-3">
                <button type="button" onClick={() => onOpen(transaction)} className={cx('grid h-11 w-11 place-items-center rounded-full', style.iconClass)} aria-label={`Open ${style.label}: ${transaction.description}`}><Icon className="h-5 w-5" /></button>
                <button type="button" onClick={() => onOpen(transaction)} className="min-w-0 text-left focus-visible:rounded-ui-sm focus-visible:shadow-ui-focus-strong" title={transaction.description}>
                  <span className="block truncate text-[13px] font-bold text-[var(--text-primary)]">{transaction.description}</span>
                  <span className="mt-1 flex items-center gap-1.5 truncate text-[11px] text-[var(--text-muted)]"><UserRound className="h-3.5 w-3.5 shrink-0" /> {clientName}</span>
                  <span className="mt-1 flex items-center gap-1.5 truncate text-[11px] text-[var(--text-muted)]"><Clock3 className="h-3.5 w-3.5 shrink-0" /> {date.toLocaleTimeString('en-MY', { hour: 'numeric', minute: '2-digit' })} <span aria-hidden>·</span> {transaction.paymentMethod || '—'}</span>
                </button>
                <div className="min-w-[76px] text-right">
                  <p className={cx('text-[13px] font-bold tabular-nums', style.amountClass)}>{style.sign}{formatRM(transaction.amount)}</p>
                  <span className={cx('mt-1.5 inline-flex rounded-full px-2 py-1 text-[10px] font-semibold', style.badgeClass)}>{style.label}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <button type="button" disabled={isLocked} onClick={() => onEdit(transaction)} className="grid h-11 w-11 place-items-center rounded-ui-sm border border-[var(--line)] text-[var(--text-muted)] disabled:cursor-not-allowed disabled:opacity-40" aria-label={`Edit ${transaction.description}`}><Pencil className="h-4 w-4" /></button>
                  {!isLocked ? <button type="button" onClick={() => onDelete(transaction)} className="grid h-11 w-11 place-items-center rounded-ui-sm border border-[var(--line)] text-[var(--text-muted)] hover:border-[var(--danger)] hover:text-[var(--danger)]" aria-label={`Delete ${transaction.description}`}><Trash2 className="h-4 w-4" /></button> : null}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    ))}
    {hasMore ? <button type="button" onClick={onLoadMore} className="min-h-12 w-full border-t border-[var(--line)] px-4 text-sm font-bold text-[var(--brand)]">View more transactions ↓</button> : null}
  </section>
);

export default MobileTransactionHistory;
