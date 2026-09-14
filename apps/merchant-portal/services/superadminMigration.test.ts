// Static contract tests keep the migration's security and atomicity invariants reviewable without mutating a database.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const sql = readFileSync(resolve(process.cwd(), '../../migration/supabase/migrations/20260913165153_superadmin_step1_reliability.sql'), 'utf8');
const step2Sql = readFileSync(resolve(process.cwd(), '../../migration/supabase/migrations/20260913185856_superadmin_step2_operations.sql'), 'utf8');

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
