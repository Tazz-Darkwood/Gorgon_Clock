import { describe, it, expect } from 'vitest';
import { isCurrentOrUpcomingSlot, slotIdAt } from './schedule';

describe('slotIdAt (server)', () => {
  it('matches browser logic for known anchor', () => {
    expect(slotIdAt(new Date('2026-05-06T05:00:00Z'))).toBe('2026-05-06-000');
    expect(slotIdAt(new Date('2026-05-06T10:36:00Z'))).toBe('2026-05-06-042');
    expect(slotIdAt(new Date('2026-05-07T05:00:00Z'))).toBe('2026-05-07-000');
  });
});

describe('isCurrentOrUpcomingSlot', () => {
  it('rejects far-past slots', () => {
    const now = new Date('2026-05-06T10:00:00Z');
    expect(isCurrentOrUpcomingSlot('2026-05-01-042', now)).toBe(false);
  });

  it('accepts current slot', () => {
    const now = new Date('2026-05-06T10:36:30Z');
    expect(isCurrentOrUpcomingSlot('2026-05-06-042', now)).toBe(true);
  });

  it('accepts upcoming slot within 24h', () => {
    const now = new Date('2026-05-06T10:00:00Z');
    expect(isCurrentOrUpcomingSlot('2026-05-06-100', now)).toBe(true);
  });

  it('rejects slot more than 24h in future', () => {
    const now = new Date('2026-05-06T05:00:00Z');
    expect(isCurrentOrUpcomingSlot('2026-05-08-100', now)).toBe(false);
  });
});
