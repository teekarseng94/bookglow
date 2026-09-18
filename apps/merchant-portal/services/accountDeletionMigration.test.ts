import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const sql = readFileSync(
  resolve(process.cwd(), '../../migration/supabase/migrations/20260918120000_account_deletion_requests.sql'),
  'utf8',
);

describe('account deletion migration contract', () => {
  it('creates the request queue and merchant/public submission RPCs', () => {
    expect(sql).toContain('platform_account_deletion_requests');
    expect(sql).toContain("status IN ('pending', 'in_review', 'completed', 'rejected')");
    expect(sql).toContain('submit_merchant_account_deletion_request');
    expect(sql).toContain('submit_public_account_deletion_request');
    expect(sql).toContain('platform_account_deletion_requests_page');
    expect(sql).toContain('platform_update_account_deletion_request');
    expect(sql).toContain('merchant_account_deletion_request_status');
  });
});
