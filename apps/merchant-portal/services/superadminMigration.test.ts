// Static contract tests keep the migration's security and atomicity invariants reviewable without mutating a database.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const sql = readFileSync(resolve(process.cwd(), '../../migration/supabase/migrations/20260913165153_superadmin_step1_reliability.sql'), 'utf8');

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
});
