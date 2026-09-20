import type { Database, Json } from '@bookglow/database-contracts';
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

type PublicFunctions = Database['public']['Functions'];

const client = () => createBrowserSupabaseClient(import.meta.env as Record<string, string | undefined>);

function isObject(value: Json | undefined): value is { [key: string]: Json | undefined } {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asText(value: Json | undefined): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function asNullableText(value: Json | undefined): string | null {
  if (value == null) return null;
  return typeof value === 'string' ? value : null;
}

function asStatus(value: Json | undefined): AccountDeletionRequestStatus | undefined {
  if (value === 'pending' || value === 'in_review' || value === 'completed' || value === 'rejected') {
    return value;
  }
  return undefined;
}

function asSource(value: Json | undefined): AccountDeletionSource | undefined {
  if (value === 'merchant_portal' || value === 'android' || value === 'web') {
    return value;
  }
  return undefined;
}

function parseStatusRow(data: Json): AccountDeletionRequestStatusRow {
  if (!isObject(data)) return { has_request: false };
  return {
    has_request: data.has_request === true,
    id: asText(data.id),
    status: asStatus(data.status),
    created_at: asText(data.created_at),
    processed_at: data.processed_at == null ? null : asText(data.processed_at),
    active: typeof data.active === 'boolean' ? data.active : undefined,
  };
}

function parseRequestRow(value: Json | undefined): AccountDeletionRequestRow | null {
  if (!isObject(value)) return null;
  const id = asText(value.id);
  const email = asText(value.email);
  const status = asStatus(value.status);
  const source = asSource(value.source);
  const createdAt = asText(value.created_at);
  const updatedAt = asText(value.updated_at);
  if (!id || !email || !status || !source || !createdAt || !updatedAt) return null;
  return {
    id,
    requesting_user_uid: asNullableText(value.requesting_user_uid),
    outlet_id: asNullableText(value.outlet_id),
    outlet_name: asNullableText(value.outlet_name),
    email,
    requester_name: asNullableText(value.requester_name),
    business_name: asNullableText(value.business_name),
    reason: asNullableText(value.reason),
    status,
    source,
    processing_notes: asNullableText(value.processing_notes),
    processed_by: asNullableText(value.processed_by),
    processed_by_email: asNullableText(value.processed_by_email),
    processed_at: asNullableText(value.processed_at),
    created_at: createdAt,
    updated_at: updatedAt,
  };
}

function parseRequestPage(data: Json): { rows: AccountDeletionRequestRow[]; total: number } {
  if (!isObject(data)) return { rows: [], total: 0 };
  const rows = Array.isArray(data.rows)
    ? data.rows.flatMap((row) => {
        const parsed = parseRequestRow(row);
        return parsed ? [parsed] : [];
      })
    : [];
  return {
    rows,
    total: typeof data.total === 'number' ? data.total : rows.length,
  };
}

export const accountDeletionService = {
  currentStatus: async (): Promise<AccountDeletionRequestStatusRow> => {
    const { data, error } = await client().rpc('merchant_account_deletion_request_status');
    if (error) throw error;
    return parseStatusRow(data);
  },

  submitMerchantRequest: async (reason?: string): Promise<string> => {
    const args: PublicFunctions['submit_merchant_account_deletion_request']['Args'] = {
      p_reason: reason?.trim() || null,
      p_source: isNativeApp() ? 'android' : 'merchant_portal',
    };
    const { data, error } = await client().rpc('submit_merchant_account_deletion_request', args);
    if (error) throw error;
    return data;
  },

  listRequests: async (filters: {
    search?: string;
    status?: string;
    source?: string;
    page?: number;
    limit?: number;
  }): Promise<{ rows: AccountDeletionRequestRow[]; total: number }> => {
    const args: PublicFunctions['platform_account_deletion_requests_page']['Args'] = {
      p_search: filters.search?.trim() || null,
      p_status: filters.status && filters.status !== 'all' ? filters.status : null,
      p_source: filters.source && filters.source !== 'all' ? filters.source : null,
      p_limit: filters.limit || 25,
      p_offset: ((filters.page || 1) - 1) * (filters.limit || 25),
    };
    const { data, error } = await client().rpc('platform_account_deletion_requests_page', args);
    if (error) throw error;
    return parseRequestPage(data);
  },

  updateRequest: async (
    requestId: string,
    status: AccountDeletionRequestStatus,
    processingNotes?: string,
  ): Promise<void> => {
    const args: PublicFunctions['platform_update_account_deletion_request']['Args'] = {
      p_request_id: requestId,
      p_status: status,
      p_processing_notes: processingNotes?.trim() || null,
    };
    const { error } = await client().rpc('platform_update_account_deletion_request', args);
    if (error) throw error;
  },
};
