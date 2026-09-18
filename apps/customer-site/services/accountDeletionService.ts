import { createBrowserSupabaseClient } from '@bookglow/supabase';

export interface PublicAccountDeletionInput {
  email: string;
  requesterName?: string;
  businessName?: string;
  reason?: string;
}

const client = () => createBrowserSupabaseClient(import.meta.env as Record<string, string | undefined>);

export async function submitPublicAccountDeletionRequest(input: PublicAccountDeletionInput): Promise<string> {
  const { data, error } = await client().rpc('submit_public_account_deletion_request', {
    p_email: input.email.trim().toLowerCase(),
    p_requester_name: input.requesterName?.trim() || null,
    p_business_name: input.businessName?.trim() || null,
    p_reason: input.reason?.trim() || null,
  });
  if (error) throw error;
  return String(data);
}
