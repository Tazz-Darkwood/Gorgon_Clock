import { describe, it, expect } from 'vitest';
import { SELF } from 'cloudflare:test';

describe('Worker router', () => {
  it('GET /v1/health returns ok', async () => {
    const r = await SELF.fetch('http://example.com/v1/health');
    expect(r.status).toBe(200);
    const body = await r.json() as any;
    expect(body.ok).toBe(true);
  });

  it('returns 404 for unknown path', async () => {
    const r = await SELF.fetch('http://example.com/foo');
    expect(r.status).toBe(404);
  });

  it('GET /v1/state returns combined slot+tips', async () => {
    const r = await SELF.fetch('http://example.com/v1/state?slot=2026-05-06-100&day=2026-05-06');
    expect(r.status).toBe(200);
    const body = await r.json() as any;
    expect(body.slot).toBeDefined();
    expect(body.tips).toBeDefined();
    expect(body.server_time_utc).toBeDefined();
  });

  it('rejects POST /v1/matchup without user_id', async () => {
    const r = await SELF.fetch('http://example.com/v1/matchup?slot=2026-05-06-100', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'create', fighter_a: 'Otis', fighter_b: 'Leo' })
    });
    expect(r.status).toBe(400);
  });

  it('OPTIONS preflight returns CORS headers', async () => {
    const r = await SELF.fetch('http://example.com/v1/matchup', {
      method: 'OPTIONS',
      headers: { 'origin': 'http://localhost', 'access-control-request-method': 'POST' }
    });
    expect(r.status).toBe(204);
    expect(r.headers.get('access-control-allow-origin')).toBeTruthy();
  });
});
