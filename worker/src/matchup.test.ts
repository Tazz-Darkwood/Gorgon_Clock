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

  it('creates entry on first submission', async () => {
    const slot = '2026-05-06-101';
    await reset(slot);
    const r = await createOrVote(env.STATE, slot, {
      user_id: 'u_aaa111aaa111',
      action: 'create',
      fighter_a: 'Otis', fighter_b: 'Leo'
    }, FIGHTERS);
    expect(r.entries.length).toBe(1);
    expect(r.entries[0].fighter_a).toBe('Otis');
    expect(r.entries[0].voter_ids).toEqual(['u_aaa111aaa111']);
  });

  it('vote action moves user from one entry to another', async () => {
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
    const v = await createOrVote(env.STATE, slot, {
      user_id: 'u_aaa111aaa111', action: 'vote',
      entry_id: c2.entries[1].id
    }, FIGHTERS);
    const otisLeo = v.entries.find(e => e.fighter_b === 'Leo')!;
    const otisVizlark = v.entries.find(e => e.fighter_b === 'Vizlark')!;
    expect(otisLeo.voter_ids).toEqual([]);
    expect(otisVizlark.voter_ids).toContain('u_aaa111aaa111');
    expect(otisVizlark.voter_ids).toContain('u_bbb222bbb222');
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
