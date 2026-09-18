// Static contract tests keep the migration's security and atomicity invariants reviewable without mutating a database.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const sql = readFileSync(resolve(process.cwd(), '../../migration/supabase/migrations/20260913165153_superadmin_step1_reliability.sql'), 'utf8');
const step2Sql = readFileSync(resolve(process.cwd(), '../../migration/supabase/migrations/20260913185856_superadmin_step2_operations.sql'), 'utf8');
const monitoringSql = readFileSync(resolve(process.cwd(), '../../migration/supabase/migrations/20260914104830_monitoring_read_sanitization.sql'), 'utf8');
const functionGrantSql = readFileSync(resolve(process.cwd(), '../../migration/supabase/migrations/20260914110322_edge_function_service_role_grants.sql'), 'utf8');
const hitpaySql = readFileSync(resolve(process.cwd(), '../../migration/supabase/migrations/20260915140000_hitpay_platform_billing.sql'), 'utf8');
const deleteOutletSql = readFileSync(resolve(process.cwd(), '../../migration/supabase/migrations/20260915170000_platform_delete_outlet.sql'), 'utf8');
const phase1Sql = readFileSync(resolve(process.cwd(), '../../migration/supabase/migrations/20260918010000_superadmin_phase1_search_inspector.sql'), 'utf8');
const appSource = readFileSync(resolve(process.cwd(), 'App.tsx'), 'utf8');

describe('superadmin Step 1 migration contract', () => {
  it('suspends portal access without changing public booking publication', () => {
    expect(sql).toContain('UPDATE public.outlets SET access_status=v_after');
    expect(sql).toContain("'public_booking_unchanged',true");
    expect(sql).not.toMatch(/platform_set_outlet_access[\s\S]*?UPDATE public\.outlets SET is_active/);
  });

  it('authorizes and serializes outlet-scoped ownership transfer atomically', () => {
    expect(sql).toContain('IF NOT public.is_platform_admin()');
    expect(sql).toContain('pg_advisory_xact_lock');
    expect(sql).toContain('WHERE outlet_id=p_outlet_id AND user_id=p_new_owner');
    expect(sql).toContain("v_old_role<>'owner'");
  });

  it('protects self-access and platform administrators in account operations', () => {
    expect(sql).toContain('IF p_user_id=auth.uid()');
    expect(sql).toContain('FROM public.platform_admins WHERE user_id=p_user_id');
    expect(sql).toContain("IF v_member.role='owner'");
  });

  it('limits merchant access helpers to authenticated callers', () => {
    expect(sql).toContain('REVOKE ALL ON FUNCTION public.is_outlet_member(text), public.has_outlet_role(text,text[]) FROM PUBLIC, anon');
    expect(sql).toContain('GRANT EXECUTE ON FUNCTION public.is_outlet_member(text), public.has_outlet_role(text,text[]) TO authenticated');
    expect(sql).toContain('REVOKE ALL ON FUNCTION public.resolve_merchant_access() FROM PUBLIC, anon');
    expect(sql).toContain('GRANT EXECUTE ON FUNCTION public.resolve_merchant_access() TO authenticated');
  });
});

describe('superadmin Step 2 migration contract', () => {
  it('records real appointment lifecycle timestamps without inventing historical cancellation evidence', () => {
    expect(step2Sql).toContain('ADD COLUMN IF NOT EXISTS cancelled_at timestamptz');
    expect(step2Sql).toContain("lower(coalesce(NEW.status,''))='cancelled'");
    expect(step2Sql).not.toMatch(/UPDATE public\.appointments[\s\S]{0,200}cancelled_at/);
  });

  it('keeps support writes behind platform-admin RPCs with immutable history', () => {
    expect(step2Sql).toContain('REVOKE ALL ON public.platform_support_cases,public.platform_support_case_references,public.platform_support_case_events FROM anon,authenticated');
    expect(step2Sql).toContain('IF NOT public.is_platform_admin()');
    expect(step2Sql).toContain("RAISE EXCEPTION 'Support history is append-only'");
    expect(step2Sql).toContain('platform_reference_belongs_to_outlet');
  });

  it('uses server-side outlet-local ranges and labels evidence limitations honestly', () => {
    expect(step2Sql).toContain('FROM pg_timezone_names');
    expect(step2Sql).toContain("'cancelled_at only; historical rows without a cancellation timestamp are excluded'");
    expect(step2Sql).toContain("'Provider acceptance is tracked; confirmed delivery is not instrumented'");
    expect(step2Sql).toContain("'retries_enabled',false");
  });
});

describe('monitoring read sanitization contract', () => {
  it('reuses platform_sanitize_error for messages and sanitizes metadata keys and nested values', () => {
    expect(monitoringSql).toContain('CREATE OR REPLACE FUNCTION public.platform_sanitize_jsonb(p_value jsonb)');
    expect(monitoringSql).toContain('public.platform_sanitize_error(p_value #>> \'{}\')');
    expect(monitoringSql).toContain('public.platform_sanitize_error(e.message) AS message');
    expect(monitoringSql).toContain('public.platform_sanitize_jsonb(e.metadata) AS metadata');
    expect(monitoringSql).toContain('access_token|refresh_token|client_secret|authorization|api[_-]?key|token|password|secret|signing_secret');
  });

  it('blocks authenticated table reads and exposes monitoring only through the platform-admin RPC', () => {
    expect(monitoringSql).toContain('REVOKE SELECT ON public.platform_monitoring_events FROM anon, authenticated');
    expect(monitoringSql).toContain('REVOKE ALL ON FUNCTION public.platform_monitoring_events_page(integer, integer) FROM PUBLIC, anon');
    expect(monitoringSql).toContain('GRANT EXECUTE ON FUNCTION public.platform_monitoring_events_page(integer, integer) TO authenticated');
    expect(monitoringSql).toContain('IF NOT public.is_platform_admin()');
  });
});

describe('edge function service_role grants', () => {
  it('grants service_role DML on tables used by billing, account, invite, marketing, and webhook functions', () => {
    expect(functionGrantSql).toContain('GRANT ALL ON TABLE');
    expect(functionGrantSql).toContain('public.users');
    expect(functionGrantSql).toContain('public.platform_admins');
    expect(functionGrantSql).toContain('public.outlet_subscriptions');
    expect(functionGrantSql).toContain('public.billing_events');
    expect(functionGrantSql).toContain('public.marketing_campaigns');
    expect(functionGrantSql).toContain('public.outlet_invitations');
    expect(functionGrantSql).toContain('TO service_role;');
  });
});

describe('HitPay platform billing migration contract', () => {
  it('makes Stripe identifiers optional and adds HitPay subscription columns', () => {
    expect(hitpaySql).toContain('ALTER COLUMN stripe_customer_id DROP NOT NULL');
    expect(hitpaySql).toContain('ADD COLUMN IF NOT EXISTS hitpay_recurring_id text');
    expect(hitpaySql).toContain("CHECK (provider IN ('hitpay', 'stripe'))");
    expect(hitpaySql).toContain("'billing_'||b.event_type");
    expect(hitpaySql).not.toContain('stripe_webhook_');
  });
});

describe('platform outlet deletion contract', () => {
  it('requires platform-admin confirmation and preserves append-only history', () => {
    expect(deleteOutletSql).toContain('CREATE OR REPLACE FUNCTION public.platform_delete_outlet(');
    expect(deleteOutletSql).toContain('IF NOT public.is_platform_admin()');
    expect(deleteOutletSql).toContain('Type the outlet name to confirm deletion');
    expect(deleteOutletSql).toContain('DELETE FROM public.outlets WHERE outlet_id = p_outlet_id');
    expect(deleteOutletSql).toContain('SET outlet_id = NULL');
    expect(deleteOutletSql).toContain('DELETE FROM public.merchant_onboarding_drafts');
    expect(deleteOutletSql).toContain('ON DELETE SET NULL');
    expect(deleteOutletSql).not.toContain('DELETE FROM public.platform_audit_events');
    expect(deleteOutletSql).not.toContain('DELETE FROM public.billing_events');
  });
});

describe('superadmin UX/UI Phase 1 migration contract', () => {
  it('keeps global search server-side, platform-admin only, grouped, and bounded', () => {
    expect(phase1Sql).toContain('CREATE OR REPLACE FUNCTION public.platform_global_search');
    expect(phase1Sql).toContain('IF NOT public.is_platform_admin()');
    expect(phase1Sql).toContain('PARTITION BY entity_type');
    expect(phase1Sql).toContain('group_position <= v_limit');
    expect(phase1Sql).toContain('REVOKE ALL ON FUNCTION public.platform_global_search(text, integer) FROM PUBLIC, anon');
    expect(phase1Sql).not.toMatch(/INSERT INTO public\.(platform_audit_events|platform_monitoring_events)[\s\S]*p_query/);
  });

  it('returns allow-listed inspector fields without provider payloads or payment credentials', () => {
    expect(phase1Sql).toContain('CREATE OR REPLACE FUNCTION public.platform_outlet_inspector');
    expect(phase1Sql).toContain("'business_hours_status'");
    expect(phase1Sql).toContain("'recent_activity'");
    expect(phase1Sql).not.toMatch(/card_number|provider_payload|access_token|refresh_token|client_secret/i);
  });

  it('preserves the remote-access banner while a validated remote workspace is active', () => {
    expect(appSource).toContain("remoteAccessService.validate()");
    expect(appSource).toContain('remoteContext ? <RemoteAccessBanner');
  });
});
