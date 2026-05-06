// @ts-check
/**
 * Pure mathematical functions for the arena copilot.
 * No DOM, no fetch, no localStorage. Trivially testable.
 */
'use strict';

/**
 * @typedef {Object} Tip
 * @property {'matchup'|'fighter'} type
 * @property {string} favored - the fighter id receiving the modifier
 * @property {string} fighter_a - for matchup type, one of the matchup fighters; for fighter type, the subject fighter
 * @property {string|null} [fighter_b] - for matchup type, the other fighter; null/undefined for fighter type
 * @property {number} modifier_pct - signed integer percentage, typically [-50, 50]
 */

const Math_ = (() => {
  /**
   * Compute P(fighter_a wins) by summing applicable Hot Tip modifiers.
   *
   * Per Kuzavek's wiki: tips stack additively. Per-fighter tips apply to all
   * battles the favored combatant is in. Matchup-specific tips apply only when
   * the named pair matches the current matchup (in either order).
   *
   * @param {Tip[]} tips
   * @param {string} fighter_a
   * @param {string} fighter_b
   * @returns {number} probability in [0.01, 0.99]
   */
  function aggregateProbability(tips, fighter_a, fighter_b) {
    let p = 0.5;
    for (const t of tips) {
      const mod = t.modifier_pct / 100;
      if (t.type === 'fighter') {
        // Per-fighter tip: applies to whichever side this is
        if (t.favored === fighter_a) p += mod;
        else if (t.favored === fighter_b) p -= mod;
      } else if (t.type === 'matchup') {
        // Matchup-specific tip: only if the pair matches (either order)
        const pairMatches =
          (t.fighter_a === fighter_a && t.fighter_b === fighter_b) ||
          (t.fighter_a === fighter_b && t.fighter_b === fighter_a);
        if (!pairMatches) continue;
        if (t.favored === fighter_a) p += mod;
        else if (t.favored === fighter_b) p -= mod;
      }
    }
    return Math.max(0.01, Math.min(0.99, p));
  }

  return { aggregateProbability };
})();

// Expose for browser
if (typeof window !== 'undefined') {
  /** @type {any} */ (window).Math_ = Math_;
}
