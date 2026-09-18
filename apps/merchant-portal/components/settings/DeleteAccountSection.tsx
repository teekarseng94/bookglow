import React, { useEffect, useState } from 'react';
import { AppModal } from '../ui/AppModal';
import { Button } from '../ui/Button';
import { verifyMerchantAccountForDeletion } from '../../services/authService';
import {
  accountDeletionService,
  type AccountDeletionRequestStatusRow,
} from '../../services/accountDeletionService';
import { publicAccountDeletionUrl } from '../../src/legal/publicLegalUrls';

type Step = 'closed' | 'confirm' | 'verify' | 'success';

const statusLabel: Record<string, string> = {
  pending: 'Pending review',
  in_review: 'In review',
  completed: 'Completed',
  rejected: 'Rejected',
};

export const DeleteAccountSection: React.FC = () => {
  const [step, setStep] = useState<Step>('closed');
  const [status, setStatus] = useState<AccountDeletionRequestStatusRow | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [confirmationEmail, setConfirmationEmail] = useState('');
  const [password, setPassword] = useState('');
  const [reason, setReason] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const refreshStatus = async () => {
    setLoadingStatus(true);
    try {
      const value = await accountDeletionService.currentStatus();
      setStatus(value);
    } catch {
      setStatus(null);
    } finally {
      setLoadingStatus(false);
    }
  };

  useEffect(() => {
    void refreshStatus();
  }, []);

  const resetFlow = () => {
    setStep('closed');
    setConfirmationEmail('');
    setPassword('');
    setReason('');
    setAcknowledged(false);
    setError('');
  };

  const submitRequest = async () => {
    setBusy(true);
    setError('');
    try {
      await verifyMerchantAccountForDeletion({ confirmationEmail, password: password || undefined });
      await accountDeletionService.submitMerchantRequest(reason);
      await refreshStatus();
      setStep('success');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not submit the deletion request.');
    } finally {
      setBusy(false);
    }
  };

  const activeRequest = status?.has_request && status.active;

  return (
    <div className="rounded-ui-md border border-[var(--danger)]/30 bg-[var(--danger-soft)] p-4 sm:p-5">
      <h4 className="text-base font-bold text-[var(--danger)]">Delete account</h4>
      <p className="mt-2 text-sm text-[var(--text-secondary)]">
        Permanently delete your BookGlow business account and associated account data.
      </p>

      {loadingStatus ? (
        <p className="mt-3 text-sm text-[var(--text-muted)]">Checking request status…</p>
      ) : activeRequest ? (
        <p className="mt-3 text-sm text-[var(--text-secondary)]">
          A deletion request is already {statusLabel[status?.status || 'pending']?.toLowerCase() || 'in progress'}.
          {status?.created_at ? ` Submitted ${new Date(status.created_at).toLocaleString()}.` : ''}
        </p>
      ) : (
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button
            variant="danger"
            onClick={() => {
              resetFlow();
              setStep('confirm');
            }}
          >
            Delete account
          </Button>
          <a
            href={publicAccountDeletionUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-semibold text-[var(--brand)] underline underline-offset-2"
          >
            Learn more about account deletion
          </a>
        </div>
      )}

      <AppModal
        open={step === 'confirm'}
        onClose={resetFlow}
        title="Delete your BookGlow account?"
        description="This starts a permanent account deletion request."
        busy={busy}
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={resetFlow} disabled={busy}>
              Cancel
            </Button>
            <Button variant="danger" onClick={() => setStep('verify')} disabled={busy}>
              Continue with deletion request
            </Button>
          </div>
        }
      >
        <ul className="list-disc space-y-2 pl-5 text-sm text-[var(--text-secondary)]">
          <li>Account deletion is permanent once completed.</li>
          <li>You may lose access to your BookGlow merchant account and workspace.</li>
          <li>Associated account data will be deleted according to BookGlow&apos;s retention policy.</li>
          <li>Some records may need to be retained where legally required.</li>
        </ul>
      </AppModal>

      <AppModal
        open={step === 'verify'}
        onClose={resetFlow}
        title="Confirm deletion request"
        description="Verify your account before submitting the request."
        busy={busy}
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={() => setStep('confirm')} disabled={busy}>
              Back
            </Button>
            <Button
              type="button"
              variant="danger"
              disabled={busy || !confirmationEmail.trim()}
              onClick={() => {
                if (!acknowledged) {
                  setError('Please confirm that you understand this request is permanent.');
                  return;
                }
                void submitRequest();
              }}
            >
              {busy ? 'Submitting…' : 'Submit deletion request'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <label className="block">
            <span className="m-settings-label block uppercase tracking-widest">Confirm account email</span>
            <input
              type="email"
              className="m-settings-control w-full mt-1"
              value={confirmationEmail}
              onChange={(event) => setConfirmationEmail(event.target.value)}
              autoComplete="email"
              required
            />
          </label>
          <label className="block">
            <span className="m-settings-label block uppercase tracking-widest">Current password</span>
            <input
              type="password"
              className="m-settings-control w-full mt-1"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              placeholder="Required for email/password accounts"
            />
          </label>
          <label className="block">
            <span className="m-settings-label block uppercase tracking-widest">Reason (optional)</span>
            <textarea
              className="m-settings-control w-full mt-1 min-h-24"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              maxLength={2000}
            />
          </label>
          <label className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(event) => setAcknowledged(event.target.checked)}
              className="mt-1"
            />
            <span>I understand this request is permanent and may remove access to my BookGlow account.</span>
          </label>
          {error ? (
            <p className="text-sm text-[var(--danger)]" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      </AppModal>

      <AppModal
        open={step === 'success'}
        onClose={resetFlow}
        title="Deletion request submitted"
        description="BookGlow will review your request."
        footer={
          <div className="flex justify-end">
            <Button onClick={resetFlow}>Close</Button>
          </div>
        }
      >
        <p className="text-sm text-[var(--text-secondary)]">
          Your account deletion request has been recorded. BookGlow will review it and contact you at the
          confirmed email address if more information is needed. This does not immediately delete your account.
        </p>
      </AppModal>
    </div>
  );
};

export default DeleteAccountSection;
