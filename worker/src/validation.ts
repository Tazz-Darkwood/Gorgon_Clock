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

export function isValidModifier(v: unknown): v is number {
  return typeof v === 'number' && Number.isInteger(v) && v >= -50 && v <= 50;
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
