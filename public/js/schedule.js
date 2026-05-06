// @ts-check
'use strict';

/**
 * Schedule helpers for the arena copilot.
 *
 * "Midnight EST" means strict UTC-5 (no DST), per spec. PG's server clock does
 * not observe DST. If that ever changes, modify EST_OFFSET_HOURS only.
 */
const Schedule = (() => {
  const EST_OFFSET_HOURS = -5;
  const SLOT_MS = 8 * 60 * 1000;
  const SLOTS_PER_DAY = 180;

  /**
   * Convert a UTC Date to {date, slot} aligned to EST midnight.
   * @param {Date} d
   * @returns {{date: string, slot: number}}
   */
  function _slotParts(d) {
    const shifted = new Date(d.getTime() + EST_OFFSET_HOURS * 3600 * 1000);
    const y = shifted.getUTCFullYear();
    const m = shifted.getUTCMonth() + 1;
    const day = shifted.getUTCDate();
    const startOfDay = Date.UTC(y, m - 1, day);
    const msSinceMidnight = shifted.getTime() - startOfDay;
    const slot = Math.floor(msSinceMidnight / SLOT_MS);
    const yyyy = String(y).padStart(4, '0');
    const mm = String(m).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    return { date: `${yyyy}-${mm}-${dd}`, slot };
  }

  /**
   * @param {Date} d
   * @returns {string} e.g. "2026-05-06-042"
   */
  function slotIdAt(d) {
    const { date, slot } = _slotParts(d);
    return `${date}-${String(slot).padStart(3, '0')}`;
  }

  return { slotIdAt, EST_OFFSET_HOURS, SLOT_MS, SLOTS_PER_DAY };
})();

if (typeof window !== 'undefined') {
  /** @type {any} */ (window).Schedule = Schedule;
}
