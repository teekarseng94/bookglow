import { createBrowserSupabaseClient } from '@bookglow/supabase';
import { isNativeApp } from '../src/native/androidShell';

export type AccountDeletionRequestStatus = 'pending' | 'in_review' | 'completed' | 'rejected';
export type AccountDeletionSource = 'merchant_portal' | 'android' | 'web';

export interface AccountDeletionRequestStatusRow {
  has_request: boolean;
  id?: string;
  status?: AccountDeletionRequestStatus;
  created_at?: string;
  processed_at?: string | null;
  active?: boolean;
}

export interface AccountDeletionRequestRow {
  id: string;
  requesting_user_uid: string | null;
  outlet_id: string | null;
  outlet_name: string | null;
  email: string;
  requester_name: string | null;
  business_name: string | null;
  reason: string | null;
  status: AccountDeletionRequestStatus;
  source: AccountDeletionSource;
  processing_notes: string | null;
  processed_by: string | null;
  processed_by_email: string | null;
  processed_at: string | null;
  created_at: string;
  updated_at: string;
}

const client = () => createBrowserSupabaseClient(import.meta.env as Record<string, string | undefined>);

const rpc = async <T>(name: string, args: Record<string, unknown> = {}): Promise<T> => {
  const { data, error } = await client().rpc(name, args);
  if (error) throw error;
  return data as T;
};

export const accountDeletionService = {
  currentStatus: () => rpc<AccountDeletionRequestStatusRow>('merchant_account_deletion_request_status'),

  submitMerchantRequest: (reason?: string) =>
    rpc<string>('submit_merchant_account_deletion_request', {
      p_reason: reason?.trim() || null,
      p_source: isNativeApp() ? 'android' : 'merchant_portal',
    }),

  listRequests: (filters: {
    search?: string;
    status?: string;
    source?: string;
    page?: number;
    limit?: number;
  }) =>
    rpc<{ rows: AccountDeletionRequestRow[]; total: number }>('platform_account_deletion_requests_page', {
      p_search: filters.search?.trim() || null,
      p_status: filters.status && filters.status !== 'all' ? filters.status : null,
      p_source: filters.source && filters.source !== 'all' ? filters.source : null,
      p_limit: filters.limit || 25,
      p_offset: ((filters.page || 1) - 1) * (filters.limit || 25),
    }),

  updateRequest: (requestId: string, status: AccountDeletionRequestStatus, processingNotes?: string) =>
    rpc('platform_update_account_deletion_request', {
      p_request_id: requestId,
      p_status: status,
      p_processing_notes: processingNotes?.trim() || null,
    }),
};
