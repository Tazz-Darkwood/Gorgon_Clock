import {
  isValidUserId, isValidFighterId, isValidTipNpcId,
  isValidModifier, isValidTipType
} from './validation';

export interface Tip {
  id: string;
  type: 'matchup' | 'fighter';
  source_npc: string;
  fighter_a: string;
  fighter_b: string | null;
  favored: string;
  modifier_pct: number;
  submitted_by: string;
  submitted_at: string;
  upvoters: string[];
  removers: string[];
}

export interface TipsState {
  _v: number;
  day: string;
  tips: Tip[];
}

export interface SubmitTipBody {
  user_id: string;
  type: 'matchup' | 'fighter';
  source_npc: string;
  fighter_a: string;
  fighter_b: string | null;
  favored: string;
  modifier_pct: number;
}

export interface PatchTipBody {
  user_id: string;
  action: 'upvote' | 'remove' | 'reset';
}

const SCHEMA = 1;
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

function newTipId(): string {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  return 'tip_' + Array.from(bytes).map(b => b.toString(16).padStart(2,'0')).join('');
}

function emptyTips(day: string): TipsState {
  return { _v: SCHEMA, day, tips: [] };
}

export async function getTips(kv: KVNamespace, day: string): Promise<TipsState> {
  if (!DAY_RE.test(day)) throw new Error('Invalid day');
  const raw = await kv.get(`tips:${day}`);
  if (!raw) return emptyTips(day);
  try {
    const parsed = JSON.parse(raw) as TipsState;
    if (parsed._v !== SCHEMA) return emptyTips(day);
    return parsed;
  } catch {
    return emptyTips(day);
  }
}

async function saveTips(kv: KVNamespace, t: TipsState): Promise<void> {
  await kv.put(`tips:${t.day}`, JSON.stringify(t), { expirationTtl: 86400 * 2 });
}

export async function submitTip(
  kv: KVNamespace,
  day: string,
  body: SubmitTipBody,
  knownFighters: string[],
  knownNpcs: string[]
): Promise<TipsState> {
  if (!DAY_RE.test(day)) throw new Error('Invalid day');
  if (!isValidUserId(body.user_id)) throw new Error('Invalid user id');
  if (!isValidTipType(body.type)) throw new Error('Invalid tip type');
  if (!isValidTipNpcId(body.source_npc, knownNpcs)) throw new Error('Invalid source_npc');
  if (!isValidFighterId(body.fighter_a, knownFighters)) throw new Error('Invalid fighter_a');
  if (!isValidModifier(body.modifier_pct)) throw new Error('Invalid modifier');

  if (body.type === 'matchup') {
    if (!isValidFighterId(body.fighter_b, knownFighters))
      throw new Error('matchup tip requires fighter_b');
    if (body.fighter_a === body.fighter_b)
      throw new Error('matchup fighters must differ');
    if (body.favored !== body.fighter_a && body.favored !== body.fighter_b)
      throw new Error('favored must be one of the two fighters');
  } else {
    if (body.fighter_b !== null) throw new Error('fighter tip must have null fighter_b');
    if (body.favored !== body.fighter_a)
      throw new Error('fighter tip favored must equal fighter_a');
  }

  const state = await getTips(kv, day);
  state.tips.push({
    id: newTipId(),
    type: body.type,
    source_npc: body.source_npc,
    fighter_a: body.fighter_a,
    fighter_b: body.fighter_b,
    favored: body.favored,
    modifier_pct: body.modifier_pct,
    submitted_by: body.user_id,
    submitted_at: new Date().toISOString(),
    upvoters: [body.user_id],
    removers: []
  });
  await saveTips(kv, state);
  return state;
}

export async function patchTip(
  kv: KVNamespace,
  day: string,
  tipId: string,
  body: PatchTipBody
): Promise<TipsState> {
  if (!DAY_RE.test(day)) throw new Error('Invalid day');
  if (!isValidUserId(body.user_id)) throw new Error('Invalid user id');
  const state = await getTips(kv, day);
  const tip = state.tips.find(t => t.id === tipId);
  if (!tip) throw new Error('Tip not found');

  // The submitter "removing" their own tip means retracting it for everyone,
  // not just hiding it from their own view. Drop the tip entirely.
  if (body.action === 'remove' && tip.submitted_by === body.user_id) {
    state.tips = state.tips.filter(t => t.id !== tipId);
    await saveTips(kv, state);
    return state;
  }

  tip.upvoters = tip.upvoters.filter(u => u !== body.user_id);
  tip.removers = tip.removers.filter(u => u !== body.user_id);
  if (body.action === 'upvote') tip.upvoters.push(body.user_id);
  else if (body.action === 'remove') tip.removers.push(body.user_id);

  await saveTips(kv, state);
  return state;
}
