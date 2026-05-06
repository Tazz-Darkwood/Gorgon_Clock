import { describe, it, expect } from 'vitest';
import {
  isValidUserId,
  isValidSlotId,
  isValidFighterId,
  isValidTipNpcId,
  isValidModifier,
  isValidTipType,
  isValidFavor
} from './validation';

const FIGHTERS = ['Corrrak','Dura','Gloz','Leo','Otis','Ushug','Vizlark'];
const NPCS = ['Mandibles','Qatik','Irkima','Eveline_Rastin','Arianna_Fangblade'];

describe('isValidUserId', () => {
  it('accepts u_ + 12 hex', () => {
    expect(isValidUserId('u_abc123def456')).toBe(true);
  });
  it('rejects missing prefix', () => {
    expect(isValidUserId('abc123def456')).toBe(false);
  });
  it('rejects non-string', () => {
    expect(isValidUserId(42 as any)).toBe(false);
    expect(isValidUserId(null as any)).toBe(false);
  });
  it('rejects too short / too long', () => {
    expect(isValidUserId('u_abc')).toBe(false);
    expect(isValidUserId('u_' + 'a'.repeat(20))).toBe(false);
  });
});

describe('isValidSlotId', () => {
  it('accepts well-formed slot id', () => {
    expect(isValidSlotId('2026-05-06-042')).toBe(true);
    expect(isValidSlotId('2026-05-06-000')).toBe(true);
    expect(isValidSlotId('2026-05-06-179')).toBe(true);
  });
  it('rejects out-of-range slot', () => {
    expect(isValidSlotId('2026-05-06-180')).toBe(false);
  });
  it('rejects malformed', () => {
    expect(isValidSlotId('foo')).toBe(false);
    expect(isValidSlotId('2026-5-6-42')).toBe(false);
  });
});

describe('isValidFighterId', () => {
  it('accepts known fighters', () => {
    expect(isValidFighterId('Otis', FIGHTERS)).toBe(true);
  });
  it('rejects unknown', () => {
    expect(isValidFighterId('Bogus', FIGHTERS)).toBe(false);
  });
});

describe('isValidTipNpcId', () => {
  it('accepts known NPCs', () => {
    expect(isValidTipNpcId('Mandibles', NPCS)).toBe(true);
  });
  it('rejects unknown', () => {
    expect(isValidTipNpcId('Bogus', NPCS)).toBe(false);
  });
});

describe('isValidModifier', () => {
  it('accepts integer in [-50, 50]', () => {
    expect(isValidModifier(0)).toBe(true);
    expect(isValidModifier(50)).toBe(true);
    expect(isValidModifier(-50)).toBe(true);
    expect(isValidModifier(10)).toBe(true);
  });
  it('rejects out of range', () => {
    expect(isValidModifier(51)).toBe(false);
    expect(isValidModifier(-51)).toBe(false);
  });
  it('rejects non-integer', () => {
    expect(isValidModifier(0.5)).toBe(false);
    expect(isValidModifier(NaN)).toBe(false);
  });
});

describe('isValidTipType', () => {
  it('accepts matchup and fighter', () => {
    expect(isValidTipType('matchup')).toBe(true);
    expect(isValidTipType('fighter')).toBe(true);
  });
  it('rejects others', () => {
    expect(isValidTipType('foo')).toBe(false);
  });
});

describe('isValidFavor', () => {
  it('accepts known favor levels', () => {
    expect(isValidFavor('Friends')).toBe(true);
    expect(isValidFavor('Comfortable')).toBe(true);
    expect(isValidFavor('SoulMates')).toBe(true);
  });
  it('rejects unknown', () => {
    expect(isValidFavor('Bogus')).toBe(false);
  });
});
