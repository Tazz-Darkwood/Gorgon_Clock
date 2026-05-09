import { getSlot, createOrVote, removeVote, type CreateOrVoteBody } from './matchup';
import { getTips, submitTip, patchTip, type SubmitTipBody, type PatchTipBody } from './tips';
import { isCurrentOrUpcomingSlot } from './schedule';
import { checkRateLimit } from './ratelimit';
import { parseList } from './validation';

export interface Env {
  STATE: KVNamespace;
  ALLOWED_ORIGINS: string;
  KNOWN_FIGHTERS: string;
  KNOWN_TIP_NPCS: string;
}

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

function corsHeaders(origin: string | null, allowed: string[]): Record<string,string> {
  const allow = origin && allowed.includes(origin) ? origin : '';
  return {
    'access-control-allow-origin': allow,
    'access-control-allow-methods': 'GET, POST, DELETE, PATCH, OPTIONS',
    'access-control-allow-headers': 'content-type',
    'vary': 'Origin'
  };
}

function json(data: unknown, status: number, extra: Record<string,string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json', ...extra }
  });
}

function err(message: string, status: number, extra: Record<string,string> = {}): Response {
  return json({ error: message }, status, extra);
}

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin');
    const allowed = parseList(env.ALLOWED_ORIGINS);
    const cors = corsHeaders(origin, allowed);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    try {
      if (request.method === 'GET' && url.pathname === '/v1/health') {
        return json({ ok: true, ts: new Date().toISOString() }, 200, cors);
      }

      if (request.method === 'GET' && url.pathname === '/v1/state') {
        const slot = url.searchParams.get('slot') ?? '';
        const day = url.searchParams.get('day') ?? '';
        if (!DAY_RE.test(day)) return err('Invalid day', 400, cors);
        const [slotState, tipsState] = await Promise.all([
          getSlot(env.STATE, slot),
          getTips(env.STATE, day)
        ]);
        return json({
          slot: slotState,
          tips: tipsState,
          server_time_utc: new Date().toISOString()
        }, 200, { ...cors, 'cache-control': 'public, max-age=5' });
      }

      const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
      const rl = await checkRateLimit(env.STATE, ip);
      if (!rl.allowed) {
        return err('Rate limited', 429, { ...cors, 'retry-after': String(rl.retryAfter) });
      }

      const fighters = parseList(env.KNOWN_FIGHTERS);
      const npcs = parseList(env.KNOWN_TIP_NPCS);

      if (request.method === 'POST' && url.pathname === '/v1/matchup') {
        const slot = url.searchParams.get('slot') ?? '';
        const now = new Date();
        if (!isCurrentOrUpcomingSlot(slot, now))
          return err('Slot out of range', 400, cors);
        const body = await request.json() as CreateOrVoteBody;
        if (!body || !body.user_id) return err('Missing user_id', 400, cors);
        const state = await createOrVote(env.STATE, slot, body, fighters);
        return json(state, 200, cors);
      }

      if (request.method === 'DELETE' && url.pathname === '/v1/matchup') {
        const slot = url.searchParams.get('slot') ?? '';
        const body = await request.json() as { user_id: string };
        if (!body || !body.user_id) return err('Missing user_id', 400, cors);
        const state = await removeVote(env.STATE, slot, body.user_id);
        return json(state, 200, cors);
      }

      if (request.method === 'POST' && url.pathname === '/v1/tips') {
        const day = url.searchParams.get('day') ?? '';
        if (!DAY_RE.test(day)) return err('Invalid day', 400, cors);
        const body = await request.json() as SubmitTipBody;
        if (!body || !body.user_id) return err('Missing user_id', 400, cors);
        const state = await submitTip(env.STATE, day, body, fighters, npcs);
        return json(state, 200, cors);
      }

      const m = /^\/v1\/tips\/([a-zA-Z0-9_]+)$/.exec(url.pathname);
      if (request.method === 'PATCH' && m) {
        const tipId = m[1];
        const day = url.searchParams.get('day') ?? '';
        if (!DAY_RE.test(day)) return err('Invalid day', 400, cors);
        const body = await request.json() as PatchTipBody;
        if (!body || !body.user_id) return err('Missing user_id', 400, cors);
        const state = await patchTip(env.STATE, day, tipId, body);
        return json(state, 200, cors);
      }

      return err('Not Found', 404, cors);
    } catch (e: any) {
      const msg = e?.message ?? 'Unknown error';
      return err(msg, 400, cors);
    }
  }
};
