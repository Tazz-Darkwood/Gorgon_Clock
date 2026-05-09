import { describe, it, expect } from 'vitest';
import { env } from 'cloudflare:test';
import { getSlot, createOrVote, removeVote } from './matchup';

const FIGHTERS = ['Corrrak','Dura','Gloz','Leo','Otis','Ushug','Vizlark'];

async function reset(slotId: string) {
  await env.STATE.delete(`slot:${slotId}`);
}

describe('matchup', () => {
  it('returns empty entries for new slot', async () => {
    const slot = '2026-05-06-100';
    await reset(slot);
    const result = await getSlot(env.STATE, slot);
    expect(result.entries).toEqual([]);
    expect(result.slot_id).toBe(slot);
  });

  function pairOf(e: { fighter_a: string; fighter_b: string }) {
    return [e.fighter_a, e.fighter_b].sort().join('|');
  }
  function findByPair(entries: Array<{fighter_a:string;fighter_b:string;voter_ids:string[];id:string}>, x: string, y: string) {
    const want = [x, y].sort().join('|');
    return entries.find(e => pairOf(e) === want)!;
  }

  it('creates entry on first submission', async () => {
    const slot = '2026-05-06-101';
    await reset(slot);
    const r = await createOrVote(env.STATE, slot, {
      user_id: 'u_aaa111aaa111',
      action: 'create',
      fighter_a: 'Otis', fighter_b: 'Leo'
    }, FIGHTERS);
    expect(r.entries.length).toBe(1);
    expect(pairOf(r.entries[0])).toBe('Leo|Otis');
    expect(r.entries[0].voter_ids).toEqual(['u_aaa111aaa111']);
  });

  it('canonicalizes pair: reversed-order create dedups onto existing entry', async () => {
    const slot = '2026-05-06-106';
    await reset(slot);
    await createOrVote(env.STATE, slot, {
      user_id: 'u_aaa111aaa111', action: 'create',
      fighter_a: 'Otis', fighter_b: 'Leo'
    }, FIGHTERS);
    const r = await createOrVote(env.STATE, slot, {
      user_id: 'u_bbb222bbb222', action: 'create',
      fighter_a: 'Leo', fighter_b: 'Otis'   // reversed order
    }, FIGHTERS);
    expect(r.entries.length).toBe(1);
    expect(r.entries[0].voter_ids).toEqual(['u_aaa111aaa111', 'u_bbb222bbb222']);
  });

  it('vote action moves user, and the now-empty source entry is pruned', async () => {
    const slot = '2026-05-06-102';
    await reset(slot);
    await createOrVote(env.STATE, slot, {
      user_id: 'u_aaa111aaa111', action: 'create',
      fighter_a: 'Otis', fighter_b: 'Leo'
    }, FIGHTERS);
    const c2 = await createOrVote(env.STATE, slot, {
      user_id: 'u_bbb222bbb222', action: 'create',
      fighter_a: 'Otis', fighter_b: 'Vizlark'
    }, FIGHTERS);
    const otisVizlarkBefore = findByPair(c2.entries, 'Otis', 'Vizlark');
    const v = await createOrVote(env.STATE, slot, {
      user_id: 'u_aaa111aaa111', action: 'vote',
      entry_id: otisVizlarkBefore.id
    }, FIGHTERS);
    // Otis/Leo had only u_aaa as voter — once they switch, the entry is pruned
    expect(v.entries.length).toBe(1);
    const otisVizlark = findByPair(v.entries, 'Otis', 'Vizlark');
    expect(otisVizlark.voter_ids).toContain('u_aaa111aaa111');
    expect(otisVizlark.voter_ids).toContain('u_bbb222bbb222');
  });

  it('removeVote prunes an entry that loses its last voter', async () => {
    const slot = '2026-05-06-107';
    await reset(slot);
    await createOrVote(env.STATE, slot, {
      user_id: 'u_aaa111aaa111', action: 'create',
      fighter_a: 'Otis', fighter_b: 'Leo'
    }, FIGHTERS);
    const r = await removeVote(env.STATE, slot, 'u_aaa111aaa111');
    expect(r.entries).toEqual([]);
  });

  it('removeVote keeps entries that still have other voters', async () => {
    const slot = '2026-05-06-108';
    await reset(slot);
    await createOrVote(env.STATE, slot, {
      user_id: 'u_aaa111aaa111', action: 'create',
      fighter_a: 'Otis', fighter_b: 'Leo'
    }, FIGHTERS);
    await createOrVote(env.STATE, slot, {
      user_id: 'u_bbb222bbb222', action: 'create',
      fighter_a: 'Leo', fighter_b: 'Otis'   // dedups onto same entry
    }, FIGHTERS);
    const r = await removeVote(env.STATE, slot, 'u_aaa111aaa111');
    expect(r.entries.length).toBe(1);
    expect(r.entries[0].voter_ids).toEqual(['u_bbb222bbb222']);
  });

  it('rejects A == B', async () => {
    const slot = '2026-05-06-103';
    await reset(slot);
    await expect(createOrVote(env.STATE, slot, {
      user_id: 'u_aaa111aaa111', action: 'create',
      fighter_a: 'Otis', fighter_b: 'Otis'
    }, FIGHTERS)).rejects.toThrow();
  });

  it('rejects unknown fighter', async () => {
    const slot = '2026-05-06-104';
    await reset(slot);
    await expect(createOrVote(env.STATE, slot, {
      user_id: 'u_aaa111aaa111', action: 'create',
      fighter_a: 'Bogus', fighter_b: 'Leo'
    }, FIGHTERS)).rejects.toThrow();
  });

  it('removeVote idempotent for unknown user', async () => {
    const slot = '2026-05-06-105';
    await reset(slot);
    const r = await removeVote(env.STATE, slot, 'u_neverbeforevoted');
    expect(r.entries).toEqual([]);
  });
});
