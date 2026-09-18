import React, { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { PlatformPageHeader, PlatformSection } from '../components/admin';
import { AppDrawer, Button, EmptyState, ErrorState, Field, LoadingSkeleton, StatusBadge, fieldControlClassName } from '../components/ui';
import {
  accountDeletionService,
  type AccountDeletionRequestRow,
  type AccountDeletionRequestStatus,
} from '../services/accountDeletionService';

const statusTone = (status: string) => {
  if (status === 'completed') return 'success';
  if (status === 'rejected') return 'danger';
  if (status === 'in_review') return 'brand';
  return 'warning';
};

const SuperAdminAccountDeletions: React.FC = () => {
  const [rows, setRows] = useState<AccountDeletionRequestRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [source, setSource] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [detail, setDetail] = useState<AccountDeletionRequestRow | null>(null);
  const [notes, setNotes] = useState('');
  const limit = 20;

  const load = async (nextPage = page) => {
    setLoading(true);
    setError(null);
    try {
      const result = await accountDeletionService.listRequests({
        search,
        status,
        source,
        page: nextPage,
        limit,
      });
      setRows(result.rows);
      setTotal(result.total);
      setPage(nextPage);
    } catch (value) {
      setError(value instanceof Error ? value.message : 'Account deletion requests could not be loaded.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(1);
  }, []);

  const openDetail = (row: AccountDeletionRequestRow) => {
    setDetail(row);
    setNotes(row.processing_notes || '');
  };

  const updateStatus = async (nextStatus: AccountDeletionRequestStatus) => {
    if (!detail) return;
    setBusy(true);
    setError(null);
    try {
      await accountDeletionService.updateRequest(detail.id, nextStatus, notes);
      await load(page);
      const refreshed = await accountDeletionService.listRequests({ search, status, source, page, limit });
      const updated = refreshed.rows.find((row) => row.id === detail.id) || null;
      setDetail(updated);
    } catch (value) {
      setError(value instanceof Error ? value.message : 'Request update failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <PlatformPageHeader
        title="Account deletions"
        description="Review merchant account deletion requests before any data is removed."
      />

      <div className="grid gap-2 rounded-ui-lg border border-[var(--line)] bg-[var(--bg-surface)] p-3 sm:grid-cols-2 xl:grid-cols-[2fr_repeat(2,1fr)_auto]">
        <input
          className={fieldControlClassName}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search email, outlet, or request ID"
          aria-label="Search account deletion requests"
        />
        <select className={fieldControlClassName} value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="all">All statuses</option>
          <option value="pending">Pending</option>
          <option value="in_review">In review</option>
          <option value="completed">Completed</option>
          <option value="rejected">Rejected</option>
        </select>
        <select className={fieldControlClassName} value={source} onChange={(event) => setSource(event.target.value)}>
          <option value="all">All sources</option>
          <option value="merchant_portal">Merchant portal</option>
          <option value="android">Android</option>
          <option value="web">Web</option>
        </select>
        <Button onClick={() => void load(1)} disabled={loading}>
          <RefreshCw className="h-4 w-4" />
          Apply
        </Button>
      </div>

      {error ? <ErrorState message={error} onRetry={() => void load(page)} /> : null}

      <PlatformSection title="Requests" description={`${total.toLocaleString()} matching requests`}>
        {loading ? (
          <LoadingSkeleton rows={7} className="p-4" />
        ) : !rows.length ? (
          <EmptyState className="m-4" title="No deletion requests" description="Requests submitted in-app or on bookglow.my will appear here." />
        ) : (
          <div className="divide-y divide-[var(--line)]">
            {rows.map((row) => (
              <button
                type="button"
                key={row.id}
                onClick={() => openDetail(row)}
                className="grid w-full gap-2 p-4 text-left hover:bg-[var(--bg-soft)] sm:grid-cols-[minmax(0,1fr)_auto]"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{row.email}</p>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    {row.outlet_name || 'No outlet linked'} · {row.source.replaceAll('_', ' ')} · {row.requester_name || 'No name provided'}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge tone={statusTone(row.status)}>{row.status.replaceAll('_', ' ')}</StatusBadge>
                  <span className="text-xs text-[var(--text-muted)]">{new Date(row.created_at).toLocaleString()}</span>
                </div>
              </button>
            ))}
          </div>
        )}
        <div className="flex justify-between gap-3 border-t border-[var(--line)] p-3">
          <Button variant="secondary" disabled={page === 1 || loading} onClick={() => void load(page - 1)}>
            Previous
          </Button>
          <span className="self-center text-xs text-[var(--text-muted)]">
            Page {page} of {Math.max(1, Math.ceil(total / limit))}
          </span>
          <Button variant="secondary" disabled={page * limit >= total || loading} onClick={() => void load(page + 1)}>
            Next
          </Button>
        </div>
      </PlatformSection>

      <AppDrawer
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        title="Account deletion request"
        description={detail ? `${detail.email} · ${detail.id}` : undefined}
        variant="right"
        busy={busy}
      >
        {detail ? (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <StatusBadge tone={statusTone(detail.status)}>{detail.status.replaceAll('_', ' ')}</StatusBadge>
              <StatusBadge>{detail.source.replaceAll('_', ' ')}</StatusBadge>
            </div>
            <div className="space-y-2 text-sm text-[var(--text-secondary)]">
              <p><strong>Outlet:</strong> {detail.outlet_name || detail.outlet_id || 'Not linked'}</p>
              <p><strong>Requester:</strong> {detail.requester_name || 'Not provided'}</p>
              <p><strong>Business:</strong> {detail.business_name || 'Not provided'}</p>
              <p><strong>Submitted:</strong> {new Date(detail.created_at).toLocaleString()}</p>
              {detail.processed_at ? (
                <p><strong>Processed:</strong> {new Date(detail.processed_at).toLocaleString()} by {detail.processed_by_email || detail.processed_by}</p>
              ) : null}
            </div>
            {detail.reason ? (
              <div className="rounded-ui-sm bg-[var(--bg-soft)] p-3 text-sm whitespace-pre-wrap">{detail.reason}</div>
            ) : null}
            <Field id="deletion-notes" label="Processing notes">
              <textarea
                id="deletion-notes"
                className={`${fieldControlClassName} h-28 py-2`}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Internal notes for review and completion"
              />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="secondary" onClick={() => void updateStatus('in_review')} disabled={busy || detail.status === 'in_review'}>
                Mark in review
              </Button>
              <Button variant="secondary" onClick={() => void updateStatus('pending')} disabled={busy || detail.status === 'pending'}>
                Return to pending
              </Button>
              <Button onClick={() => void updateStatus('completed')} disabled={busy || detail.status === 'completed'}>
                Mark completed
              </Button>
              <Button variant="danger" onClick={() => void updateStatus('rejected')} disabled={busy || detail.status === 'rejected'}>
                Reject request
              </Button>
            </div>
          </div>
        ) : null}
      </AppDrawer>
    </div>
  );
};

export default SuperAdminAccountDeletions;
