import { describe, expect, it } from 'vitest';
import type { BrowserSupabaseAuthOptions } from '../../../packages/supabase/src/client';

describe('shared Supabase lock contract', () => {
  it('preserves each callback result type instead of erasing it to unknown', async () => {
    const lock: NonNullable<BrowserSupabaseAuthOptions['lock']> = async (_name, _timeout, callback) => callback();
    // These assignments are also checked by the merchant workspace typecheck.
    const count: number = await lock('number', 1000, async () => 42);
    const name: string = await lock('string', 1000, async () => 'Bookglow');
    expect(count).toBe(42);
    expect(name).toBe('Bookglow');
    await expect(lock('failure', 1000, async () => { throw new Error('Lock callback failure'); })).rejects.toThrow('Lock callback failure');
  });
});
