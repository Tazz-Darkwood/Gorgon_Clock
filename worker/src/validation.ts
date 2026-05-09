const FAVOR_LEVELS = [
  'Despised', 'Disliked', 'Neutral', 'Comfortable',
  'Friends', 'CloseFriends', 'BestFriends', 'LikeFamily', 'SoulMates'
] as const;

const USER_ID_RE = /^u_[a-zA-Z0-9]{4,16}$/;
const SLOT_ID_RE = /^(\d{4})-(\d{2})-(\d{2})-(\d{1,3})$/;

export function isValidUserId(v: unknown): v is string {
  return typeof v === 'string' && USER_ID_RE.test(v);
}

export function isValidSlotId(v: unknown): v is string {
  if (typeof v !== 'string') return false;
  const m = SLOT_ID_RE.exec(v);
  if (!m) return false;
  const slot = parseInt(m[4], 10);
  return slot >= 0 && slot < 180;
}

export function isValidFighterId(v: unknown, knownFighters: string[]): v is string {
  return typeof v === 'string' && knownFighters.includes(v);
}

export function isValidTipNpcId(v: unknown, knownNpcs: string[]): v is string {
  return typeof v === 'string' && knownNpcs.includes(v);
}

// Wiki tips always come in 5% multiples; observed cap is ±15%, with ±20% as headroom.
// Narrowing the server-side allowlist to match the UI prevents arbitrary-but-in-range
// numeric values from poisoning the aggregator.
const ALLOWED_MODIFIERS = new Set([5, 10, 15, 20, -5, -10, -15, -20]);
export function isValidModifier(v: unknown): v is number {
  return typeof v === 'number' && Number.isInteger(v) && ALLOWED_MODIFIERS.has(v);
}

export function isValidTipType(v: unknown): v is 'matchup' | 'fighter' {
  return v === 'matchup' || v === 'fighter';
}

export function isValidFavor(v: unknown): v is typeof FAVOR_LEVELS[number] {
  return typeof v === 'string' && (FAVOR_LEVELS as readonly string[]).includes(v);
}

export function parseList(s: string): string[] {
  return s.split(',').map(x => x.trim()).filter(Boolean);
}
