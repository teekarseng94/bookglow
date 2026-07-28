
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Transaction, TransactionType, Client } from '../types';
import { Icons } from '../constants';
import {
  ReportDetailSheet,
  ReportDesktopDetailPanel,
  ReportEmptyState,
  ReportFilterSheet,
  ReportFilterToolbar,
  ReportPageHeader,
  ReportSummaryStrip,
  ReportTxnCard,
} from '../components/reports';
import type { StatusTone } from '../components/ui/StatusBadge';
import {
  AppModal,
  Button,
  Field,
  fieldControlClassName,
  FormSection,
  ModalFooterActions,
  ConfirmationDialog,
} from '../components/ui';

interface TransactionsProps {
  transactions: Transaction[];
  clients: Client[];
  onUpdateTransaction: (id: string, data: Partial<Transaction>) => Promise<void>;
  onDeleteTransaction: (id: string) => Promise<void>;
  isDeleteLocked?: boolean;
}

type SortField = 'date' | 'amount' | 'client';
type SortOrder = 'asc' | 'desc';
// Record-type filter. Commission is an EXPENSE linked to a sale (parentSaleId) — see types.ts.
type FilterKey = 'ALL' | 'SALE' | 'COMMISSION' | 'EXPENSE';

// A commission is an expense document tied back to a sale, or explicitly labelled as commission.
const isCommissionTxn = (t: Transaction): boolean =>
  t.type === TransactionType.EXPENSE &&
  (!!t.parentSaleId || /commission/i.test(t.category || '') || /commission/i.test(t.description || ''));

// App-wide currency is Malaysian Ringgit (RM), matching receipts / reports / POS / dashboard.
const formatRM = (n: number): string => `RM${n.toLocaleString()}`;

// Visual metadata (label, colours, sign) derived from the transaction — no schema changes.
const getTxnMeta = (t: Transaction) => {
  if (t.type === TransactionType.SALE) {
    return {
      label: 'Sale',
      sign: '+',
      dot: 'bg-[var(--success)]',
      amount: 'text-[var(--success)]',
      badge: 'bg-[var(--success-soft)] text-[var(--success)]',
      amountTone: 'in' as const,
      statusTone: 'success' as StatusTone,
    };
  }
  if (isCommissionTxn(t)) {
    return {
      label: 'Commission',
      sign: '-',
      dot: 'bg-[var(--warning)]',
      amount: 'text-[var(--warning)]',
      badge: 'bg-[var(--warning-soft)] text-[var(--warning)]',
      amountTone: 'out' as const,
      statusTone: 'warning' as StatusTone,
    };
  }
  return {
    label: 'Expense',
    sign: '-',
    dot: 'bg-[var(--danger)]',
    amount: 'text-[var(--danger)]',
    badge: 'bg-[var(--danger-soft)] text-[var(--danger)]',
    amountTone: 'out' as const,
    statusTone: 'danger' as StatusTone,
  };
};

const Transactions: React.FC<TransactionsProps> = ({ 
  transactions, 
  clients, 
  onUpdateTransaction, 
  onDeleteTransaction,
  isDeleteLocked 
}) => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<FilterKey>('ALL');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [editingTxn, setEditingTxn] = useState<Transaction | null>(null);
  const [deletingTxn, setDeletingTxn] = useState<Transaction | null>(null);
  const [detailTxn, setDetailTxn] = useState<Transaction | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showSortSheet, setShowSortSheet] = useState(false); // mobile sort/filter bottom sheet

  const sortedAndFilteredTransactions = useMemo(() => {
    const filtered = transactions.filter(t => {
      // Exclude voided sales so Sales History only shows active/deleted sales (voided in Sales Reports = removed from list)
      if ((t as Transaction & { status?: string }).status === 'voided') return false;

      const client = clients.find(c => c.id === t.clientId);
      const clientName = client?.name || (t.type === TransactionType.SALE ? 'Guest' : '');
      
      const matchesSearch = t.description.toLowerCase().includes(search.toLowerCase()) || 
                           t.category.toLowerCase().includes(search.toLowerCase()) ||
                           clientName.toLowerCase().includes(search.toLowerCase());
      
      const matchesType =
        filterType === 'ALL' ? true :
        filterType === 'SALE' ? t.type === TransactionType.SALE :
        filterType === 'COMMISSION' ? isCommissionTxn(t) :
        /* EXPENSE */ t.type === TransactionType.EXPENSE && !isCommissionTxn(t);
      return matchesSearch && matchesType;
    });

    return filtered.sort((a, b) => {
      let comparison = 0;
      if (sortField === 'date') {
        comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
      } else if (sortField === 'amount') {
        comparison = a.amount - b.amount;
      } else if (sortField === 'client') {
        const clientA = clients.find(c => c.id === a.clientId)?.name || 'Guest';
        const clientB = clients.find(c => c.id === b.clientId)?.name || 'Guest';
        comparison = clientA.localeCompare(clientB);
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [transactions, search, filterType, sortField, sortOrder, clients]);

  // Summary of the currently filtered records (derived, no calculation changes).
  const summary = useMemo(() => {
    let totalIn = 0;
    let totalOut = 0;
    for (const t of sortedAndFilteredTransactions) {
      if (t.type === TransactionType.SALE) totalIn += t.amount;
      else totalOut += t.amount;
    }
    return { totalIn, totalOut, net: totalIn - totalOut };
  }, [sortedAndFilteredTransactions]);

  const filterChips: { key: FilterKey; label: string }[] = [
    { key: 'ALL', label: 'All' },
    { key: 'SALE', label: 'Sales' },
    { key: 'COMMISSION', label: 'Commission' },
    { key: 'EXPENSE', label: 'Expense' },
  ];

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTxn) return;
    await onUpdateTransaction(editingTxn.id, {
      date: editingTxn.date,
      description: editingTxn.description,
      amount: editingTxn.amount,
      category: editingTxn.category,
      clientId: editingTxn.clientId,
      paymentMethod: editingTxn.paymentMethod
    });
    setEditingTxn(null);
  };

  // Calculate points that would be deducted for a sale
  const calculatePointsForSale = (txn: Transaction): number => {
    if (txn.type !== TransactionType.SALE || !txn.clientId || txn.clientId === 'guest' || txn.category === 'Redemption') {
      return 0;
    }
    if (txn.items && txn.items.length > 0) {
      return txn.items.reduce((sum, item) => {
        const itemPoints = item.points !== undefined ? item.points : Math.floor(item.price);
        return sum + (itemPoints * item.quantity);
      }, 0);
    }
    return Math.floor(txn.amount);
  };

  const confirmDelete = async () => {
    if (!deletingTxn) return;
    
    const pointsToDeduct = calculatePointsForSale(deletingTxn);
    const client = clients.find(c => c.id === deletingTxn.clientId);
    const clientName = client?.name || 'Guest';
    
    try {
      await onDeleteTransaction(deletingTxn.id);
      setDeletingTxn(null);
      
      // Show success toast
      if (pointsToDeduct > 0) {
        setToastMessage(`Sale deleted and ${pointsToDeduct.toLocaleString()} points deducted from ${clientName}.`);
        setTimeout(() => setToastMessage(null), 5000);
      } else {
        setToastMessage('Sale deleted successfully.');
        setTimeout(() => setToastMessage(null), 3000);
      }
    } catch (error: any) {
      alert(`Failed to delete sale: ${error.message || 'Unknown error'}`);
    }
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      <ReportPageHeader
        title="Sales History"
        description="Review, edit, or filter past transactions."
      />

      <div className="hidden md:flex items-center gap-2 rounded-ui-md border border-[var(--brand-border)] bg-[var(--brand-soft)] px-3 py-2.5">
        <svg className="h-4 w-4 flex-shrink-0 text-[var(--brand)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        <p className="text-[var(--brand-deep)] text-xs font-medium">
          Management Console: Review, edit, or remove historical records to maintain data accuracy.
        </p>
      </div>
      <div className="md:hidden flex items-center gap-1.5 m-caption font-medium text-[var(--text-muted)]">
        <svg className="w-3.5 h-3.5 flex-shrink-0 text-[var(--brand)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        <span>Management mode: review, edit, remove records</span>
      </div>

      <ReportFilterToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search transactions"
        filtersLabel="Sort"
        onOpenFilters={() => setShowSortSheet(true)}
        chips={filterChips.map((chip) => (
          <button
            key={chip.key}
            type="button"
            onClick={() => setFilterType(chip.key)}
            className={`flex-shrink-0 px-3.5 sm:px-4 min-h-[38px] sm:min-h-[40px] rounded-full text-xs font-bold whitespace-nowrap border transition-all ${
              filterType === chip.key
                ? 'm-txn-filter-chip bg-[var(--brand)] text-white border-[var(--brand)] shadow-ui-xs'
                : 'm-txn-filter-chip bg-[var(--bg-surface)] text-[var(--text-muted)] border-[var(--line)] hover:border-[var(--brand)]'
            }`}
          >
            {chip.label}
          </button>
        ))}
        desktopSort={
          <>
            <span className="m-settings-label uppercase tracking-widest">Sort</span>
            <select
              aria-label="Sort by"
              className="m-settings-control border border-[var(--line)] bg-[var(--bg-surface)] text-xs outline-none transition-all"
              value={sortField}
              onChange={(e) => setSortField(e.target.value as SortField)}
            >
              <option value="date">Date</option>
              <option value="amount">Amount</option>
              <option value="client">Client Name</option>
            </select>
            <select
              aria-label="Sort order"
              className="m-settings-control border border-[var(--line)] bg-[var(--bg-surface)] text-xs outline-none transition-all"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as SortOrder)}
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </>
        }
      />

      <ReportSummaryStrip
        items={[
          { label: 'Total In', value: `+RM${summary.totalIn.toLocaleString()}`, tone: 'in' },
          { label: 'Total Out', value: `-RM${summary.totalOut.toLocaleString()}`, tone: 'out' },
          {
            label: 'Net',
            value: `${summary.net < 0 ? '-' : ''}RM${Math.abs(summary.net).toLocaleString()}`,
            tone: summary.net >= 0 ? 'net-positive' : 'net-negative',
          },
        ]}
      />

      {sortedAndFilteredTransactions.length === 0 ? (
        <ReportEmptyState
          description={
            search || filterType !== 'ALL'
              ? 'Try adjusting your search or filters.'
              : 'Completed sales and expenses will appear here.'
          }
          actionLabel={!search && filterType === 'ALL' ? 'Go to POS' : undefined}
          onAction={!search && filterType === 'ALL' ? () => navigate('/pos') : undefined}
        />
      ) : (
        <>
          {/* Mobile: structured cards — amount, customer, date/time, payment, status */}
          <div className="md:hidden space-y-2.5 pb-[calc(6rem+env(safe-area-inset-bottom,0px))]">
            {sortedAndFilteredTransactions.map((txn) => {
              const meta = getTxnMeta(txn);
              const client = clients.find((c) => c.id === txn.clientId);
              const clientName = client?.name || (txn.type === TransactionType.SALE ? 'Guest' : '—');
              const txnDate = new Date(txn.date);
              return (
                <ReportTxnCard
                  key={txn.id}
                  amountLabel={`${meta.sign}${formatRM(txn.amount)}`}
                  amountTone={meta.amountTone}
                  customer={clientName}
                  dateTimeLabel={`${txnDate.toLocaleDateString()} · ${txnDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                  paymentMethod={txn.paymentMethod || '—'}
                  statusLabel={meta.label}
                  statusTone={meta.statusTone}
                  description={txn.description}
                  onClick={() => setDetailTxn(txn)}
                />
              );
            })}
          </div>

          {/* iPad / desktop: table (compact padding on iPad, roomier on desktop) */}
          <div className="hidden min-w-0 gap-4 md:flex">
          <div className="min-w-0 flex-1 overflow-hidden rounded-ui-md border border-[var(--line)] bg-[var(--bg-surface)]">
            <div className="max-h-[calc(100vh-15rem)] overflow-auto">
              <table className="w-full text-left">
                <thead className="sticky top-0 z-10">
                  <tr className="border-b border-[var(--line)] bg-[var(--bg-soft)] text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3">Date &amp; Description</th>
                    <th className="px-3 py-3">Client</th>
                    <th className="px-3 py-3">Category</th>
                    <th className="px-3 py-3">Method</th>
                    <th className="px-3 py-3 text-right">Amount</th>
                    <th className="px-3 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--line)]">
                  {sortedAndFilteredTransactions.map(txn => {
                    const client = clients.find(c => c.id === txn.clientId);
                    const txnDate = new Date(txn.date);
                    const meta = getTxnMeta(txn);

                    return (
                      <React.Fragment key={txn.id}>
                        <tr
                          className={`cursor-pointer transition-colors hover:bg-[var(--bg-soft)] ${detailTxn?.id === txn.id ? 'bg-[var(--brand-soft)]' : ''}`}
                          onClick={() => setDetailTxn(txn)}
                        >
                          <td className="px-3 py-3">
                            <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-semibold ${meta.badge}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                              {meta.label}
                            </span>
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex flex-col">
                              <span className="text-[11px] font-medium text-[var(--text-muted)]">
                                {txnDate.toLocaleDateString()} {txnDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              <span className="max-w-xs truncate text-[13px] font-semibold text-[var(--text-primary)]">{txn.description}</span>
                            </div>
                          </td>
                          <td className="px-3 py-3 text-xs text-[var(--text-secondary)]">
                            {client ? (
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 bg-[var(--brand-soft)] rounded-full flex items-center justify-center m-caption font-bold text-[var(--brand)] flex-shrink-0">
                                  {client.name.charAt(0)}
                                </div>
                                <span className="truncate">{client.name}</span>
                              </div>
                            ) : (txn.type === TransactionType.SALE ? <span className="text-[var(--text-muted)]">Guest</span> : <span className="text-[var(--text-muted)]">—</span>)}
                          </td>
                          <td className="px-3 py-3">
                            <span className="m-inventory-badge rounded-full bg-[var(--brand-soft)] px-2 py-1 text-[var(--brand-deep)]">{txn.category}</span>
                          </td>
                          <td className="px-3 py-3 text-xs font-medium text-[var(--text-secondary)]">
                            {txn.paymentMethod || '—'}
                          </td>
                          <td className={`px-3 py-3 text-right text-[13px] font-bold tabular-nums ${meta.amount}`}>
                            {meta.sign}{formatRM(txn.amount)}
                          </td>
                          <td className="px-3 py-3 text-right">
                            <div className="flex justify-end gap-2 lg:gap-3" onClick={e => e.stopPropagation()}>
                              <button
                                disabled={isDeleteLocked}
                                onClick={() => setEditingTxn(txn)}
                                className={`p-2 rounded-lg transition-all ${
                                  isDeleteLocked
                                    ? 'cursor-not-allowed text-[var(--line-strong)]'
                                    : 'text-[var(--text-muted)] hover:text-[var(--brand)] hover:bg-[var(--brand-soft)]'
                                }`}
                              >
                                {isDeleteLocked ? <Icons.Lock /> : <Icons.Edit />}
                              </button>
                              <button
                                disabled={isDeleteLocked}
                                onClick={() => setDeletingTxn(txn)}
                                className={`p-2 rounded-lg transition-all ${
                                  isDeleteLocked
                                    ? 'cursor-not-allowed text-[var(--line-strong)]'
                                    : 'text-[var(--text-muted)] hover:text-[var(--danger)] hover:bg-[var(--danger-soft)]'
                                }`}
                              >
                                {isDeleteLocked ? <Icons.Lock /> : <Icons.Trash />}
                              </button>
                            </div>
                          </td>
                        </tr>

                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          {detailTxn ? (() => {
            const meta = getTxnMeta(detailTxn);
            const client = clients.find((c) => c.id === detailTxn.clientId);
            const clientName = client?.name || (detailTxn.type === TransactionType.SALE ? 'Guest' : '—');
            const date = new Date(detailTxn.date);
            return (
              <ReportDesktopDetailPanel
                transactionId={detailTxn.id}
                amountLabel={`${meta.sign}${formatRM(detailTxn.amount)}`}
                amountClassName={meta.amount}
                statusLabel={meta.label}
                statusTone={meta.statusTone}
                onClose={() => setDetailTxn(null)}
                rows={[
                  { label: 'Date & Time', value: `${date.toLocaleDateString()} · ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` },
                  { label: 'Description', value: detailTxn.description },
                  { label: 'Client', value: clientName },
                  { label: 'Category', value: detailTxn.category || '—' },
                  { label: 'Payment Method', value: detailTxn.paymentMethod || '—' },
                ]}
                breakdown={detailTxn.items?.length ? (
                  <div>
                    <h3 className="mb-3 text-xs font-bold text-[var(--text-primary)]">Financial Summary</h3>
                    <div className="space-y-2">
                      {detailTxn.items.map((item, index) => (
                        <div key={`${item.id}-${index}`} className="flex justify-between gap-3 text-xs">
                          <span className="min-w-0 truncate text-[var(--text-secondary)]">{item.quantity}× {item.name}</span>
                          <span className="shrink-0 font-semibold tabular-nums text-[var(--text-primary)]">{formatRM(item.price * item.quantity)}</span>
                        </div>
                      ))}
                      <div className="mt-3 flex justify-between border-t border-[var(--line)] pt-3 text-sm font-bold">
                        <span>Total</span><span className="tabular-nums">{formatRM(detailTxn.amount)}</span>
                      </div>
                    </div>
                  </div>
                ) : undefined}
                primaryAction={{
                  label: isDeleteLocked ? 'Locked' : 'Edit Transaction',
                  disabled: isDeleteLocked,
                  onClick: () => setEditingTxn(detailTxn),
                }}
                dangerAction={isDeleteLocked ? undefined : {
                  label: 'Delete Transaction',
                  onClick: () => setDeletingTxn(detailTxn),
                }}
              />
            );
          })() : null}
          </div>
        </>
      )}

      {/* Mobile transaction detail sheet */}
      {(() => {
        if (!detailTxn) return null;
        const meta = getTxnMeta(detailTxn);
        const client = clients.find((c) => c.id === detailTxn.clientId);
        const clientName = client?.name || (detailTxn.type === TransactionType.SALE ? 'Guest' : '—');
        const d = new Date(detailTxn.date);
        return (
          <ReportDetailSheet
            open={Boolean(detailTxn)}
            onClose={() => setDetailTxn(null)}
            amountLabel={`${meta.sign}${formatRM(detailTxn.amount)}`}
            amountClassName={meta.amount}
            statusLabel={meta.label}
            statusTone={meta.statusTone}
            rows={[
              {
                label: 'Date & Time',
                value: `${d.toLocaleDateString()} · ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
              },
              { label: 'Description', value: detailTxn.description },
              { label: 'Client', value: clientName },
              { label: 'Category', value: detailTxn.category || '—' },
              { label: 'Payment Method', value: detailTxn.paymentMethod || '—' },
            ]}
            breakdown={
              detailTxn.items && detailTxn.items.length > 0 ? (
                <div className="mt-2 border-t border-[var(--line)] pt-3">
                  <h4 className="m-settings-label uppercase tracking-widest mb-2">Breakdown</h4>
                  <div className="space-y-2">
                    {detailTxn.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center gap-3 text-sm">
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-[var(--text-primary)]">{item.name}</p>
                          <p className="m-caption uppercase font-semibold text-[var(--text-muted)]">{item.type} · Qty {item.quantity}</p>
                        </div>
                        <span className="flex-shrink-0 font-bold tabular-nums text-[var(--text-primary)]">{formatRM(item.price * item.quantity)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null
            }
            primaryAction={{
              label: isDeleteLocked ? 'Locked' : 'Edit',
              disabled: isDeleteLocked,
              onClick: () => {
                setEditingTxn(detailTxn);
                setDetailTxn(null);
              },
            }}
            dangerAction={
              isDeleteLocked
                ? undefined
                : {
                    label: 'Delete',
                    onClick: () => {
                      setDeletingTxn(detailTxn);
                      setDetailTxn(null);
                    },
                  }
            }
          />
        );
      })()}

      <ReportFilterSheet<FilterKey, SortField>
        open={showSortSheet}
        onClose={() => setShowSortSheet(false)}
        filterOptions={filterChips.map((c) => ({ value: c.key, label: c.label }))}
        filterValue={filterType}
        onFilterChange={setFilterType}
        sortOptions={[
          { value: 'date', label: 'Date' },
          { value: 'amount', label: 'Amount' },
          { value: 'client', label: 'Client Name' },
        ]}
        sortValue={sortField}
        onSortChange={setSortField}
        orderOptions={[
          { value: 'desc', label: 'Descending' },
          { value: 'asc', label: 'Ascending' },
        ]}
        orderValue={sortOrder}
        onOrderChange={setSortOrder}
        onClear={() => {
          setFilterType('ALL');
          setSortField('date');
          setSortOrder('desc');
        }}
      />

      <AppModal
        open={!!editingTxn}
        onClose={() => setEditingTxn(null)}
        title="Edit Historical Record"
        description="Update date, amount, and client link for this record."
        size="md"
        asForm
        formId="edit-historical-record-form"
        onSubmit={handleSaveEdit}
        footer={
          <ModalFooterActions>
            <Button variant="secondary" onClick={() => setEditingTxn(null)}>
              Cancel
            </Button>
            <Button type="submit" form="edit-historical-record-form">
              Save Changes
            </Button>
          </ModalFooterActions>
        }
      >
        {editingTxn ? (
          <FormSection>
            <div className="grid grid-cols-2 gap-3">
              <Field id="edit-txn-date" label="Date" required>
                <input
                  id="edit-txn-date"
                  required
                  type="date"
                  className={fieldControlClassName}
                  value={editingTxn.date.split('T')[0]}
                  onChange={(e) =>
                    setEditingTxn({ ...editingTxn, date: new Date(e.target.value).toISOString() })
                  }
                />
              </Field>
              <Field id="edit-txn-amount" label="Amount (RM)" required>
                <input
                  id="edit-txn-amount"
                  required
                  type="number"
                  className={fieldControlClassName}
                  value={editingTxn.amount}
                  onChange={(e) =>
                    setEditingTxn({ ...editingTxn, amount: parseFloat(e.target.value) })
                  }
                />
              </Field>
            </div>
            <Field id="edit-txn-description" label="Description" required>
              <input
                id="edit-txn-description"
                required
                type="text"
                className={fieldControlClassName}
                value={editingTxn.description}
                onChange={(e) => setEditingTxn({ ...editingTxn, description: e.target.value })}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field id="edit-txn-category" label="Category" required>
                <input
                  id="edit-txn-category"
                  required
                  type="text"
                  className={fieldControlClassName}
                  value={editingTxn.category}
                  onChange={(e) => setEditingTxn({ ...editingTxn, category: e.target.value })}
                />
              </Field>
              <Field id="edit-txn-payment" label="Payment Method">
                <input
                  id="edit-txn-payment"
                  type="text"
                  className={fieldControlClassName}
                  value={editingTxn.paymentMethod || ''}
                  onChange={(e) => setEditingTxn({ ...editingTxn, paymentMethod: e.target.value })}
                />
              </Field>
            </div>
            <Field id="edit-txn-client" label="Link to Client">
              <select
                id="edit-txn-client"
                className={fieldControlClassName}
                value={editingTxn.clientId || ''}
                onChange={(e) =>
                  setEditingTxn({ ...editingTxn, clientId: e.target.value || undefined })
                }
              >
                <option value="">No Client (Guest)</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
          </FormSection>
        ) : null}
      </AppModal>

      {(() => {
        if (!deletingTxn) return null;
        const pointsToDeduct = calculatePointsForSale(deletingTxn);
        const client = clients.find((c) => c.id === deletingTxn.clientId);
        const clientName = client?.name || 'Guest';
        const receiptNumber =
          deletingTxn.id.replace(/\D/g, '').slice(-10) || deletingTxn.id.slice(-8);
        const formattedReceipt = '#' + receiptNumber.padStart(10, '0');
        const description = (
          <>
            Are you sure you want to delete this {deletingTxn.type.toLowerCase()} of{' '}
            <span className="font-semibold text-[var(--text-primary)]">
              {formatRM(deletingTxn.amount)}
            </span>
            ?
            {pointsToDeduct > 0 ? (
              <span className="mt-3 block rounded-ui-md border border-[var(--warning)]/20 bg-[var(--warning-soft)] p-3 text-left text-xs text-[var(--warning)]">
                Deleting this sale will also deduct{' '}
                <span className="font-bold">{pointsToDeduct.toLocaleString()}</span> points from{' '}
                <span className="font-semibold">{clientName}</span>.
                <span className="mt-1 block font-mono m-caption text-[var(--warning)]">
                  Receipt: {formattedReceipt}
                </span>
              </span>
            ) : null}
          </>
        );
        return (
          <ConfirmationDialog
            open
            onClose={() => setDeletingTxn(null)}
            onConfirm={confirmDelete}
            title="Delete Transaction?"
            description={description}
            confirmLabel={
              pointsToDeduct > 0 ? 'Yes, Delete & Deduct Points' : 'Yes, Delete'
            }
            tone="danger"
          />
        );
      })()}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-[100] flex max-w-md animate-fadeIn items-center gap-3 rounded-ui-md bg-[var(--success)] px-5 py-3 text-white shadow-ui-lg">
          <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <p className="text-sm font-medium flex-1">{toastMessage}</p>
          <button
            onClick={() => setToastMessage(null)}
            className="text-white/80 hover:text-white transition-colors"
            aria-label="Close"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};

export default Transactions;
