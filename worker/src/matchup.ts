import { isValidSlotId, isValidUserId, isValidFighterId } from './validation';
import { startsAtUtc } from './schedule';

export interface MatchupEntry {
  id: string;
  fighter_a: string;
  fighter_b: string;
  first_at: string;
  voter_ids: string[];
}

export interface SlotState {
  _v: number;
  slot_id: string;
  starts_at_utc: string;
  entries: MatchupEntry[];
}

export type CreateOrVoteBody =
  | { user_id: string; action: 'create'; fighter_a: string; fighter_b: string }
  | { user_id: string; action: 'vote'; entry_id: string };

const SCHEMA = 1;

function newEntryId(): string {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  return 'ent_' + Array.from(bytes).map(b => b.toString(16).padStart(2,'0')).join('');
}

function emptySlot(slotId: string): SlotState {
  return {
    _v: SCHEMA,
    slot_id: slotId,
    starts_at_utc: startsAtUtc(slotId).toISOString(),
    entries: []
  };
}

export async function getSlot(kv: KVNamespace, slotId: string): Promise<SlotState> {
  if (!isValidSlotId(slotId)) throw new Error('Invalid slot id');
  const raw = await kv.get(`slot:${slotId}`);
  if (!raw) return emptySlot(slotId);
  try {
    const parsed = JSON.parse(raw) as SlotState;
    if (parsed._v !== SCHEMA) return emptySlot(slotId);
    return parsed;
  } catch {
    return emptySlot(slotId);
  }
}

async function saveSlot(kv: KVNamespace, slot: SlotState): Promise<void> {
  await kv.put(`slot:${slot.slot_id}`, JSON.stringify(slot), { expirationTtl: 86400 });
}

function removeUserFromAllEntries(slot: SlotState, userId: string) {
  for (const entry of slot.entries) {
    entry.voter_ids = entry.voter_ids.filter(v => v !== userId);
  }
}

// An entry with no voters is a phantom matchup nobody is endorsing.
// Drop it so other players don't see it.
function pruneEmptyEntries(slot: SlotState) {
  slot.entries = slot.entries.filter(e => e.voter_ids.length > 0);
}

export async function createOrVote(
  kv: KVNamespace,
  slotId: string,
  body: CreateOrVoteBody,
  knownFighters: string[]
): Promise<SlotState> {
  if (!isValidSlotId(slotId)) throw new Error('Invalid slot id');
  if (!isValidUserId(body.user_id)) throw new Error('Invalid user id');

  const slot = await getSlot(kv, slotId);

  if (body.action === 'create') {
    if (!isValidFighterId(body.fighter_a, knownFighters)
        || !isValidFighterId(body.fighter_b, knownFighters)) {
      throw new Error('Invalid fighter id');
    }
    if (body.fighter_a === body.fighter_b) {
      throw new Error('fighter_a must differ from fighter_b');
    }
    // Canonicalize the pair: a real fight is order-independent, so we store
    // names in lex order and dedup-merge a "create" onto any existing entry
    // for the same unordered pair.
    const [a, b] = [body.fighter_a, body.fighter_b].sort();
    removeUserFromAllEntries(slot, body.user_id);
    pruneEmptyEntries(slot);
    const existing = slot.entries.find(e => e.fighter_a === a && e.fighter_b === b);
    if (existing) {
      existing.voter_ids.push(body.user_id);
    } else {
      slot.entries.push({
        id: newEntryId(),
        fighter_a: a,
        fighter_b: b,
        first_at: new Date().toISOString(),
        voter_ids: [body.user_id]
      });
    }
    await saveSlot(kv, slot);
    return slot;
  }

  const target = slot.entries.find(e => e.id === body.entry_id);
  if (!target) throw new Error('entry_id not found');
  removeUserFromAllEntries(slot, body.user_id);
  target.voter_ids.push(body.user_id);
  pruneEmptyEntries(slot);
  await saveSlot(kv, slot);
  return slot;
}

export async function removeVote(
  kv: KVNamespace,
  slotId: string,
  userId: string
): Promise<SlotState> {
  if (!isValidSlotId(slotId)) throw new Error('Invalid slot id');
  if (!isValidUserId(userId)) throw new Error('Invalid user id');
  const slot = await getSlot(kv, slotId);
  removeUserFromAllEntries(slot, userId);
  pruneEmptyEntries(slot);
  await saveSlot(kv, slot);
  return slot;
}
