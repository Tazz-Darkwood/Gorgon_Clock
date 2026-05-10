const EST_OFFSET_HOURS = -5;
// 10-minute fight cadence, 144 slots per 24h day. Browser (public/js/schedule.js)
// MUST stay in sync — if these diverge, the Worker rejects the browser's slot IDs
// as "Slot out of range" because they map to different time windows on each side.
const SLOT_MS = 10 * 60 * 1000;
const SLOTS_PER_DAY = 144;

export function slotIdAt(d: Date): string {
  const shifted = new Date(d.getTime() + EST_OFFSET_HOURS * 3600 * 1000);
  const y = shifted.getUTCFullYear();
  const m = shifted.getUTCMonth() + 1;
  const day = shifted.getUTCDate();
  const startOfDay = Date.UTC(y, m - 1, day);
  const slot = Math.floor((shifted.getTime() - startOfDay) / SLOT_MS);
  return `${y.toString().padStart(4,'0')}-${m.toString().padStart(2,'0')}-${day.toString().padStart(2,'0')}-${slot.toString().padStart(3,'0')}`;
}

export function startsAtUtc(slotId: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})-(\d{1,3})$/.exec(slotId);
  if (!m) throw new Error('Invalid slot id: ' + slotId);
  const year = parseInt(m[1], 10);
  const month = parseInt(m[2], 10);
  const day = parseInt(m[3], 10);
  const slot = parseInt(m[4], 10);
  if (slot < 0 || slot >= SLOTS_PER_DAY) throw new Error('Slot out of range');
  // Date.UTC silently normalizes invalid combos (e.g. 2026-13-99 → 2027-04-08).
  // Round-trip through Date to reject anything that doesn't match the input.
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (probe.getUTCFullYear() !== year
      || probe.getUTCMonth() !== month - 1
      || probe.getUTCDate() !== day) {
    throw new Error('Invalid calendar date in slot id: ' + slotId);
  }
  const startOfDay = Date.UTC(year, month - 1, day) - EST_OFFSET_HOURS * 3600 * 1000;
  return new Date(startOfDay + slot * SLOT_MS);
}

/**
 * Is `slotId` either the current slot or up to 24h in the future?
 * Used to reject writes to ancient or far-future slots.
 */
export function isCurrentOrUpcomingSlot(slotId: string, now: Date): boolean {
  let starts: Date;
  try {
    starts = startsAtUtc(slotId);
  } catch {
    return false;
  }
  const diffMs = starts.getTime() - now.getTime();
  // Current slot if it started in the last 8 minutes; upcoming if within 24h
  return diffMs > -SLOT_MS && diffMs <= 24 * 3600 * 1000;
}
