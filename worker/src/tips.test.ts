import { describe, it, expect } from 'vitest';
import { env } from 'cloudflare:test';
import { getTips, submitTip, patchTip } from './tips';

const FIGHTERS = ['Corrrak','Dura','Gloz','Leo','Otis','Ushug','Vizlark'];
const NPCS = ['Mandibles','Qatik','Irkima','Eveline_Rastin','Arianna_Fangblade'];

async function reset(day: string) { await env.STATE.delete(`tips:${day}`); }

describe('tips', () => {
  it('returns empty list for new day', async () => {
    const day = '2026-06-01';
    await reset(day);
    const r = await getTips(env.STATE, day);
    expect(r.tips).toEqual([]);
  });

  it('submitTip creates and auto-upvotes for submitter', async () => {
    const day = '2026-06-02';
    await reset(day);
    const r = await submitTip(env.STATE, day, {
      user_id: 'u_aaa111aaa111',
      type: 'matchup',
      source_npc: 'Mandibles',
      fighter_a: 'Otis', fighter_b: 'Leo',
      favored: 'Otis', modifier_pct: 10
    }, FIGHTERS, NPCS);
    expect(r.tips.length).toBe(1);
    expect(r.tips[0].upvoters).toEqual(['u_aaa111aaa111']);
    expect(r.tips[0].removers).toEqual([]);
  });

  it('submitTip rejects fighter type with non-null fighter_b', async () => {
    const day = '2026-06-03';
    await reset(day);
    await expect(submitTip(env.STATE, day, {
      user_id: 'u_aaa111aaa111',
      type: 'fighter', source_npc: 'Mandibles',
      fighter_a: 'Otis', fighter_b: 'Leo' as any,
      favored: 'Otis', modifier_pct: 10
    }, FIGHTERS, NPCS)).rejects.toThrow();
  });

  it('patchTip upvote toggles user into upvoters', async () => {
    const day = '2026-06-04';
    await reset(day);
    const created = await submitTip(env.STATE, day, {
      user_id: 'u_aaa111aaa111', type: 'fighter', source_npc: 'Qatik',
      fighter_a: 'Otis', fighter_b: null, favored: 'Otis', modifier_pct: 5
    }, FIGHTERS, NPCS);
    const id = created.tips[0].id;
    const r = await patchTip(env.STATE, day, id, {
      user_id: 'u_bbb222bbb222', action: 'upvote'
    });
    const tip = r.tips.find(t => t.id === id)!;
    expect(tip.upvoters).toContain('u_bbb222bbb222');
    expect(tip.removers).not.toContain('u_bbb222bbb222');
  });

  it('patchTip remove by a non-submitter moves user into removers', async () => {
    const day = '2026-06-05';
    await reset(day);
    const created = await submitTip(env.STATE, day, {
      user_id: 'u_aaa111aaa111', type: 'fighter', source_npc: 'Qatik',
      fighter_a: 'Otis', fighter_b: null, favored: 'Otis', modifier_pct: 5
    }, FIGHTERS, NPCS);
    const id = created.tips[0].id;
    const r = await patchTip(env.STATE, day, id, {
      user_id: 'u_bbb222bbb222', action: 'remove'
    });
    const tip = r.tips.find(t => t.id === id)!;
    expect(tip).toBeDefined();
    expect(tip.removers).toContain('u_bbb222bbb222');
    expect(tip.upvoters).not.toContain('u_bbb222bbb222');
    // submitter's auto-upvote is untouched
    expect(tip.upvoters).toContain('u_aaa111aaa111');
  });

  it('patchTip remove BY THE SUBMITTER deletes the tip entirely', async () => {
    const day = '2026-06-09';
    await reset(day);
    const created = await submitTip(env.STATE, day, {
      user_id: 'u_aaa111aaa111', type: 'fighter', source_npc: 'Qatik',
      fighter_a: 'Otis', fighter_b: null, favored: 'Otis', modifier_pct: 5
    }, FIGHTERS, NPCS);
    const id = created.tips[0].id;
    const r = await patchTip(env.STATE, day, id, {
      user_id: 'u_aaa111aaa111', action: 'remove'
    });
    expect(r.tips.find(t => t.id === id)).toBeUndefined();
  });

  it('patchTip reset removes user from both lists', async () => {
    const day = '2026-06-06';
    await reset(day);
    const created = await submitTip(env.STATE, day, {
      user_id: 'u_aaa111aaa111', type: 'fighter', source_npc: 'Qatik',
      fighter_a: 'Otis', fighter_b: null, favored: 'Otis', modifier_pct: 5
    }, FIGHTERS, NPCS);
    const id = created.tips[0].id;
    const r = await patchTip(env.STATE, day, id, {
      user_id: 'u_aaa111aaa111', action: 'reset'
    });
    const tip = r.tips.find(t => t.id === id)!;
    expect(tip.upvoters).not.toContain('u_aaa111aaa111');
    expect(tip.removers).not.toContain('u_aaa111aaa111');
  });
});
