// @ts-check
'use strict';

/**
 * @typedef {Object} ApiResponse
 * @property {*} slot
 * @property {*} tips
 * @property {string} server_time_utc
 */

const Api = (() => {
  // The Worker base URL is set per-environment. Browser code reads it from a
  // window-scoped global so tests can override.
  function _base() {
    /** @type {any} */ const w = window;
    return w.GORGON_API_BASE || (
      window.location.hostname === 'localhost'
        ? 'http://localhost:8787'
        : 'https://orgon--lock.steven-bayiates.workers.dev'
    );
  }

  /**
   * Fetch combined slot + tips for the given slot/day.
   * @param {string} slotId
   * @param {string} day
   * @returns {Promise<{ok: true, data: ApiResponse} | {ok: false, status: number, message: string}>}
   */
  async function getState(slotId, day) {
    try {
      const r = await fetch(`${_base()}/v1/state?slot=${encodeURIComponent(slotId)}&day=${encodeURIComponent(day)}`);
      if (!r.ok) return { ok: false, status: r.status, message: r.statusText };
      const data = await r.json();
      return { ok: true, data };
    } catch (e) {
      return { ok: false, status: 0, message: String(e) };
    }
  }

  /**
   * @param {string} slotId
   * @param {{user_id: string, action: 'create', fighter_a: string, fighter_b: string}|{user_id: string, action: 'vote', entry_id: string}} body
   */
  async function postMatchup(slotId, body) {
    try {
      const r = await fetch(`${_base()}/v1/matchup?slot=${encodeURIComponent(slotId)}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (!r.ok) {
        const retryAfter = r.headers.get('retry-after');
        return { ok: false, status: r.status, retryAfter: retryAfter ? parseInt(retryAfter,10) : 0 };
      }
      return { ok: true, data: await r.json() };
    } catch (e) {
      return { ok: false, status: 0, message: String(e) };
    }
  }

  /**
   * @param {string} slotId
   * @param {string} userId
   */
  async function deleteMatchup(slotId, userId) {
    try {
      const r = await fetch(`${_base()}/v1/matchup?slot=${encodeURIComponent(slotId)}`, {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ user_id: userId })
      });
      if (!r.ok) return { ok: false, status: r.status };
      return { ok: true, data: await r.json() };
    } catch (e) {
      return { ok: false, status: 0, message: String(e) };
    }
  }

  /**
   * @param {string} day
   * @param {object} body
   */
  async function postTip(day, body) {
    try {
      const r = await fetch(`${_base()}/v1/tips?day=${encodeURIComponent(day)}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (!r.ok) return { ok: false, status: r.status };
      return { ok: true, data: await r.json() };
    } catch (e) {
      return { ok: false, status: 0, message: String(e) };
    }
  }

  /**
   * @param {string} day
   * @param {string} tipId
   * @param {{user_id: string, action: 'upvote'|'remove'|'reset'}} body
   */
  async function patchTip(day, tipId, body) {
    try {
      const r = await fetch(`${_base()}/v1/tips/${encodeURIComponent(tipId)}?day=${encodeURIComponent(day)}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (!r.ok) return { ok: false, status: r.status };
      return { ok: true, data: await r.json() };
    } catch (e) {
      return { ok: false, status: 0, message: String(e) };
    }
  }

  return { getState, postMatchup, deleteMatchup, postTip, patchTip };
})();

if (typeof window !== 'undefined') {
  /** @type {any} */ (window).Api = Api;
}
