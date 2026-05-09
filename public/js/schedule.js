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
  const SLOT_MS = 10 * 60 * 1000;
  const SLOTS_PER_DAY = 144;
  const SLOT_OFFSET_MS = -1 * 60 * 1000; // 1 minute offset

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
    const msSinceMidnight = shifted.getTime() - startOfDay - SLOT_OFFSET_MS;
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

  /**
   * @param {string} slotId
   * @returns {Date}
   */
  function startsAtUtc(slotId) {
    const m = /^(\d{4})-(\d{2})-(\d{2})-(\d{1,3})$/.exec(slotId);
    if (!m) throw new Error('Invalid slot id: ' + slotId);
    const [, yy, mm, dd, slotStr] = m;
    const slot = parseInt(slotStr, 10);
    if (slot < 0 || slot >= SLOTS_PER_DAY) throw new Error('Slot out of range: ' + slot);
    const startOfDayUtc = Date.UTC(
      parseInt(yy, 10),
      parseInt(mm, 10) - 1,
      parseInt(dd, 10)
    ) - EST_OFFSET_HOURS * 3600 * 1000;
    return new Date(startOfDayUtc + slot * SLOT_MS + SLOT_OFFSET_MS);
  }

  /**
   * @param {Date} now
   * @param {string} slotId
   * @returns {number} ms (signed)
   */
  function nextSlotIn(now, slotId) {
    return startsAtUtc(slotId).getTime() - now.getTime();
  }

  /**
   * @param {Date} now
   * @param {string} slotId
   * @returns {boolean}
   */
  function canStillBet(now, slotId) {
    return now.getTime() < startsAtUtc(slotId).getTime();
  }

  /**
   * @param {Date} d
   * @returns {string} e.g. "2026-05-06"
   */
  function localESTDate(d) {
    return _slotParts(d).date;
  }

  return { slotIdAt, startsAtUtc, nextSlotIn, canStillBet, localESTDate, EST_OFFSET_HOURS, SLOT_MS, SLOTS_PER_DAY };
})();

if (typeof window !== 'undefined') {
  /** @type {any} */ (window).Schedule = Schedule;
}
