import { createBrowserSupabaseClient } from '@bookglow/supabase';

export type PageResult<T> = { rows: T[]; total: number };
export type OverviewMetricKey = 'bookings_created' | 'appointments_scheduled' | 'appointments_completed' | 'appointments_cancelled' | 'failed_operations' | 'failed_messages' | 'unresolved_support';

export interface OperationsOverview {
  metrics: {
    active_outlets: number;
    bookings_created: number;
    appointments_scheduled: number;
    appointments_completed: number;
    appointments_cancelled: number;
    failed_operations: number;
    failed_messages: number;
    unresolved_support: number;
  };
  onboarding_attention: number;
  attention: Array<{ outlet_id: string; outlet_name: string; issue_type: string; severity: string; issue: string; occurred_at: string; destination: string }>;
  refreshed_at: string;
  range_timezone_rule: string;
  active_outlet_definition: string;
  cancellation_definition: string;
}

export interface PlatformActivity {
  id: string;
  outlet_id: string;
  outlet_name: string;
  state: string;
  occurred_at: string | null;
  scheduled_for: string | null;
  source: string | null;
  detail: string | null;
}

export interface OnboardingReadiness {
  outlet_id: string;
  name: string;
  timezone: string | null;
  onboarding_status: string;
  access_status: string;
  stage: 'pending' | 'ready' | 'activated';
  owner_assigned: boolean;
  business_details: boolean;
  operating_hours: boolean;
  bookable_services: boolean;
  staff_configured: boolean;
  booking_path: boolean;
  first_real_booking: boolean;
  configuration_ready: boolean;
  missing_requirements: string[];
  updated_at: string;
}

export interface SupportCase {
  id: string;
  outlet_id: string;
  outlet_name: string;
  category: string;
  priority: string;
  subject: string;
  description?: string;
  status: string;
  assigned_to: string | null;
  assigned_name: string | null;
  resolution_summary: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
}
export interface SupportReference { id: string; entity_type: string; reference_id: string; created_at: string }
export interface SupportEvent { id: string; event_type: string; actor_uid: string; actor_email: string | null; note: string | null; before_value: Record<string, unknown> | null; after_value: Record<string, unknown> | null; created_at: string }
export interface SupportCaseDetail { case: SupportCase; references: SupportReference[]; events: SupportEvent[] }
export interface PlatformOperator { id: string; name: string; email: string | null }

export interface IntegrationEvidence {
  outlet_id: string;
  outlet_name: string;
  integration_type: string;
  state: string;
  last_verified_success: string | null;
  latest_error_at: string | null;
  latest_error: string | null;
  detail: string;
}
export interface JobEvidence {
  reference_id: string | null;
  outlet_id: string | null;
  outlet_name: string | null;
  job_type: string;
  state: string;
  started_at: string;
  completed_at: string | null;
  attempt_count: number;
  error: string | null;
}

const client = () => createBrowserSupabaseClient(import.meta.env as any) as any;
const rpc = async <T>(name: string, args: Record<string, unknown> = {}): Promise<T> => {
  const { data, error } = await client().rpc(name, args);
  if (error) throw error;
  return data as T;
};
const nullable = (value?: string) => value?.trim() || null;

export const platformStep2Service = {
  overview: (startDate: string, endDate: string, outletId?: string) => rpc<OperationsOverview>('platform_operations_overview', { p_start_date: startDate, p_end_date: endDate, p_outlet_id: nullable(outletId) }),
  activity: (kind: OverviewMetricKey, startDate: string, endDate: string, outletId: string | undefined, page = 1, limit = 25) => rpc<PageResult<PlatformActivity>>('platform_activity_page', { p_kind: kind, p_start_date: startDate, p_end_date: endDate, p_outlet_id: nullable(outletId), p_limit: limit, p_offset: (page - 1) * limit }),
  onboarding: async (stage?: string, search?: string, page = 1, limit = 25) => {
    const result = await rpc<PageResult<OnboardingReadiness> & { staff_requirement: string }>('platform_onboarding_page', { p_stage: nullable(stage === 'all' ? '' : stage), p_search: nullable(search), p_limit: limit, p_offset: (page - 1) * limit });
    return result;
  },
  supportCases: (filters: { search?: string; status?: string; priority?: string; category?: string; outletId?: string; page?: number; limit?: number }) => rpc<PageResult<SupportCase>>('platform_support_cases_page', {
    p_search: nullable(filters.search), p_status: nullable(filters.status === 'all' ? '' : filters.status), p_priority: nullable(filters.priority === 'all' ? '' : filters.priority), p_category: nullable(filters.category === 'all' ? '' : filters.category), p_outlet_id: nullable(filters.outletId), p_limit: filters.limit || 25, p_offset: ((filters.page || 1) - 1) * (filters.limit || 25),
  }),
  supportDetail: (id: string) => rpc<SupportCaseDetail>('platform_support_case_detail', { p_case_id: id }),
  supportOperators: () => rpc<PlatformOperator[]>('platform_support_operators'),
  createSupportCase: (input: { outletId: string; category: string; priority: string; subject: string; description: string; assignedTo?: string; references?: Array<{ type: string; id: string }> }) => rpc<string>('platform_create_support_case', { p_outlet_id: input.outletId, p_category: input.category, p_priority: input.priority, p_subject: input.subject, p_description: input.description, p_assigned_to: nullable(input.assignedTo), p_references: input.references || [] }),
  updateSupportCase: (id: string, action: string, input: { status?: string; assignedTo?: string; note?: string; resolutionSummary?: string; expectedUpdatedAt?: string } = {}) => rpc('platform_update_support_case', { p_case_id: id, p_action: action, p_status: nullable(input.status), p_assigned_to: nullable(input.assignedTo), p_note: nullable(input.note), p_resolution_summary: nullable(input.resolutionSummary), p_expected_updated_at: input.expectedUpdatedAt || null }),
  addSupportReference: (id: string, type: string, referenceId: string) => rpc('platform_add_support_reference', { p_case_id: id, p_type: type, p_reference_id: referenceId }),
  integrations: (filters: { outletId?: string; type?: string; state?: string; page?: number; limit?: number }) => rpc<PageResult<IntegrationEvidence>>('platform_integrations_page', { p_outlet_id: nullable(filters.outletId), p_type: nullable(filters.type === 'all' ? '' : filters.type), p_state: nullable(filters.state === 'all' ? '' : filters.state), p_limit: filters.limit || 25, p_offset: ((filters.page || 1) - 1) * (filters.limit || 25) }),
  jobs: (filters: { outletId?: string; type?: string; state?: string; from?: string; to?: string; page?: number; limit?: number }) => rpc<PageResult<JobEvidence> & { retries_enabled: boolean; scheduler_instrumentation: string }>('platform_jobs_page', { p_outlet_id: nullable(filters.outletId), p_type: nullable(filters.type === 'all' ? '' : filters.type), p_state: nullable(filters.state === 'all' ? '' : filters.state), p_from: filters.from || null, p_to: filters.to || null, p_limit: filters.limit || 25, p_offset: ((filters.page || 1) - 1) * (filters.limit || 25) }),
};
