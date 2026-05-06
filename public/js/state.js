// @ts-check
'use strict';

/**
 * @typedef {Object} HistoryEntry
 * @property {string} slot_id
 * @property {[string, string]} matchup
 * @property {number} predicted_p
 * @property {number} bet
 * @property {boolean} won
 * @property {number} delta
 * @property {string} logged_at
 */

/**
 * @typedef {Object} GorgonState
 * @property {number} _v
 * @property {string} user_id
 * @property {string} tips_day
 * @property {number} bankroll
 * @property {'full'|'half'|'quarter'} kelly_fraction
 * @property {Object<string, string>} voted_slots
 * @property {Object<string, 'upvoted'|'removed'>} voted_tips
 * @property {HistoryEntry[]} history
 */

const State = (() => {
  const STORAGE_KEY = 'gorgon_clock_state';
  const SCHEMA_VERSION = 1;
  const HISTORY_CAP = 200;

  /** @returns {string} */
  function _newUserId() {
    const bytes = new Uint8Array(6);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(bytes);
    } else {
      for (let i = 0; i < 6; i++) bytes[i] = Math.floor(Math.random() * 256);
    }
    return 'u_' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /** @returns {GorgonState} */
  function _fresh() {
    return {
      _v: SCHEMA_VERSION,
      user_id: _newUserId(),
      tips_day: Schedule.localESTDate(new Date()),
      bankroll: 0,
      kelly_fraction: 'half',
      voted_slots: {},
      voted_tips: {},
      history: []
    };
  }

  /** @returns {GorgonState} */
  function load() {
    let raw;
    try {
      raw = localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      return _fresh();
    }
    if (!raw) return _fresh();

    /** @type {any} */ let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      return _fresh();
    }

    if (!parsed || parsed._v !== SCHEMA_VERSION) {
      return _fresh();
    }

    const fresh = _fresh();
    return {
      _v: SCHEMA_VERSION,
      user_id: typeof parsed.user_id === 'string' ? parsed.user_id : fresh.user_id,
      tips_day: typeof parsed.tips_day === 'string' ? parsed.tips_day : fresh.tips_day,
      bankroll: typeof parsed.bankroll === 'number' ? parsed.bankroll : 0,
      kelly_fraction: ['full','half','quarter'].includes(parsed.kelly_fraction)
        ? parsed.kelly_fraction : 'half',
      voted_slots: parsed.voted_slots && typeof parsed.voted_slots === 'object'
        ? parsed.voted_slots : {},
      voted_tips: parsed.voted_tips && typeof parsed.voted_tips === 'object'
        ? parsed.voted_tips : {},
      history: Array.isArray(parsed.history) ? parsed.history.slice(-HISTORY_CAP) : []
    };
  }

  /** @param {GorgonState} state */
  function save(state) {
    state._v = SCHEMA_VERSION;
    if (state.history.length > HISTORY_CAP) {
      state.history = state.history.slice(-HISTORY_CAP);
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      document.dispatchEvent(new CustomEvent('state:changed', { detail: state }));
    } catch (e) {
      // best-effort
    }
  }

  return { load, save, SCHEMA_VERSION, HISTORY_CAP };
})();

if (typeof window !== 'undefined') {
  /** @type {any} */ (window).State = State;
}
