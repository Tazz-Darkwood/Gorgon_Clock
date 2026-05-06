export interface Env {
  STATE: KVNamespace;
  ALLOWED_ORIGINS: string;
  KNOWN_FIGHTERS: string;
  KNOWN_TIP_NPCS: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/v1/health') {
      return new Response(JSON.stringify({ ok: true, ts: new Date().toISOString() }), {
        headers: { 'content-type': 'application/json' }
      });
    }
    return new Response('Not Found', { status: 404 });
  }
};
