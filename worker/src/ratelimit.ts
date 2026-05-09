const LIMIT = 5;
const WINDOW_SECONDS = 60;

async function hashIp(ip: string): Promise<string> {
  const encoded = new TextEncoder().encode(ip);
  const hash = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(hash))
    .slice(0, 8)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Increments per-IP counter; returns whether the request is allowed.
 */
export async function checkRateLimit(
  kv: KVNamespace,
  ip: string
): Promise<{ allowed: boolean; retryAfter: number }> {
  const key = `rate:${await hashIp(ip)}`;
  const current = await kv.get(key);
  const count = current ? parseInt(current, 10) : 0;
  if (count >= LIMIT) {
    return { allowed: false, retryAfter: WINDOW_SECONDS };
  }
  await kv.put(key, String(count + 1), { expirationTtl: WINDOW_SECONDS });
  return { allowed: true, retryAfter: 0 };
}
