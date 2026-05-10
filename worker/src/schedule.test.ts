import { describe, it, expect } from 'vitest';
import { isCurrentOrUpcomingSlot, slotIdAt, startsAtUtc } from './schedule';

describe('slotIdAt (server)', () => {
  it('matches browser logic for known anchor', () => {
    expect(slotIdAt(new Date('2026-05-06T05:00:00Z'))).toBe('2026-05-06-000');
    // 5:36 EST → 5*60+36 = 336 min into the day → slot 33 (10-min slots)
    expect(slotIdAt(new Date('2026-05-06T10:36:00Z'))).toBe('2026-05-06-033');
    expect(slotIdAt(new Date('2026-05-07T05:00:00Z'))).toBe('2026-05-07-000');
  });
});

describe('startsAtUtc', () => {
  it('rejects calendar-invalid month/day combinations (no silent normalization)', () => {
    expect(() => startsAtUtc('2026-13-01-000')).toThrow();   // month 13
    expect(() => startsAtUtc('2026-02-30-000')).toThrow();   // Feb 30
    expect(() => startsAtUtc('2025-02-29-000')).toThrow();   // 2025 not leap
  });
  it('accepts a real leap day', () => {
    expect(() => startsAtUtc('2024-02-29-000')).not.toThrow();
  });
});

describe('isCurrentOrUpcomingSlot', () => {
  it('rejects far-past slots', () => {
    const now = new Date('2026-05-06T10:00:00Z');
    expect(isCurrentOrUpcomingSlot('2026-05-01-042', now)).toBe(false);
  });

  it('accepts current slot', () => {
    const now = new Date('2026-05-06T10:36:30Z');
    expect(isCurrentOrUpcomingSlot('2026-05-06-033', now)).toBe(true);
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
