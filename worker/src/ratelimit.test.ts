import { describe, it, expect } from 'vitest';
import { env } from 'cloudflare:test';
import { checkRateLimit } from './ratelimit';

describe('checkRateLimit', () => {
  it('allows up to 5 in 60 seconds', async () => {
    const ip = 'ip-test-allow-' + Math.random();
    for (let i = 0; i < 5; i++) {
      const r = await checkRateLimit(env.STATE, ip);
      expect(r.allowed).toBe(true);
    }
  });

  it('blocks the 6th within 60 seconds', async () => {
    const ip = 'ip-test-block-' + Math.random();
    for (let i = 0; i < 5; i++) await checkRateLimit(env.STATE, ip);
    const r = await checkRateLimit(env.STATE, ip);
    expect(r.allowed).toBe(false);
    expect(r.retryAfter).toBeGreaterThan(0);
  });
});
