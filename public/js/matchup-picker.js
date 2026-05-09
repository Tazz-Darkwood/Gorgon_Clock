// @ts-check
'use strict';

const MatchupPicker = (() => {
  /** @type {(payload: {entry_id: string}) => void} */ let _onVote = () => {};
  /** @type {(entryId: string) => void} */ let _onPicked = () => {};

  /**
   * @param {{onVote: (p: {entry_id: string}) => void, onPicked: (id: string) => void}} cfg
   */
  function init(cfg) {
    _onVote = cfg.onVote;
    _onPicked = cfg.onPicked;
  }

  /**
   * @param {{entries: Array<{id:string, fighter_a:string, fighter_b:string, voter_ids:string[]}>}} slot
   * @param {string|null} pickedEntryId - the entry the user has voted for, if any
   * @returns {HTMLElement}
   */
  function render(slot, pickedEntryId) {
    const root = document.createElement('div');
    if (slot.entries.length === 0) {
      root.appendChild(_renderEmpty());
    } else if (slot.entries.length === 1) {
      root.appendChild(_renderConfirmed(slot.entries[0], pickedEntryId));
    } else {
      root.appendChild(_renderDisputed(slot.entries, pickedEntryId));
    }
    return root;
  }

  function _renderEmpty() {
    const div = document.createElement('div');
    div.innerHTML = `
      <div style="text-align:center;padding:1rem 0;color:var(--amber-dim);font-style:italic;">
        No matchup entered yet. Submit one below.
      </div>
    `;
    return div;
  }

  /**
   * @param {{id:string,fighter_a:string,fighter_b:string,voter_ids:string[]}} entry
   * @param {string|null} pickedEntryId
   */
  function _renderConfirmed(entry, pickedEntryId) {
    const div = document.createElement('div');
    const isPicked = pickedEntryId === entry.id;
    div.innerHTML = `
      <div style="border:1px solid var(--green);padding:0.6rem;background:rgba(74,122,42,0.07);text-align:center;">
        <div style="font-family:'Cinzel',serif;font-size:1.05rem;padding:0.2rem 0;">
          ${entry.fighter_a} <span style="color:var(--amber-dim);font-size:0.85rem;">vs</span> ${entry.fighter_b}
        </div>
        <div style="font-size:0.72rem;color:var(--green);">${isPicked ? '✓ you confirmed' : ''} · ${entry.voter_ids.length} vote${entry.voter_ids.length===1?'':'s'}</div>
      </div>
      ${isPicked
        ? `<div style="text-align:center;font-size:0.72rem;margin-top:0.4rem;"><a href="#" data-mp="unpick" style="color:var(--amber-dim);">← pick a different one</a></div>`
        : `<button data-mp="confirm" aria-label="Confirm this matchup" style="margin-top:0.4rem;width:100%;background:var(--maroon);color:var(--amber-bright);border:1px solid var(--maroon-bright);padding:0.3rem;font-family:'Cinzel',serif;letter-spacing:0.06em;font-size:0.78rem;cursor:pointer;">Confirm</button>`
      }
    `;
    const confirmBtn = div.querySelector('[data-mp="confirm"]');
    if (confirmBtn) confirmBtn.addEventListener('click', () => _onVote({ entry_id: entry.id }));
    const unpick = div.querySelector('[data-mp="unpick"]');
    if (unpick) unpick.addEventListener('click', (e) => { e.preventDefault(); _onPicked(''); });
    return div;
  }

  /**
   * @param {Array<{id:string,fighter_a:string,fighter_b:string,voter_ids:string[]}>} entries
   * @param {string|null} pickedEntryId
   */
  function _renderDisputed(entries, pickedEntryId) {
    const div = document.createElement('div');
    div.innerHTML = `
      <div style="font-family:'Cinzel',serif;color:var(--red);font-size:0.78rem;letter-spacing:0.06em;margin-bottom:0.4rem;">⚠ DISPUTED MATCHUP</div>
    `;
    const sorted = [...entries].sort((x, y) => y.voter_ids.length - x.voter_ids.length);
    for (const entry of sorted) {
      const row = document.createElement('div');
      const isPicked = pickedEntryId === entry.id;
      row.style.cssText = `border:1px solid ${isPicked ? 'var(--green)' : 'var(--body-faint)'};padding:0.3rem;margin-bottom:0.3rem;cursor:pointer;display:flex;justify-content:space-between;align-items:center;background:${isPicked ? 'rgba(74,122,42,0.08)' : 'transparent'};`;
      row.innerHTML = `
        <span style="font-size:0.85rem;">${entry.fighter_a} vs ${entry.fighter_b}</span>
        <span style="font-size:0.72rem;color:${isPicked ? 'var(--green)' : 'var(--body-dim)'};">${entry.voter_ids.length} vote${entry.voter_ids.length===1?'':'s'}${isPicked ? ' ✓' : ''}</span>
      `;
      row.addEventListener('click', () => _onVote({ entry_id: entry.id }));
      div.appendChild(row);
    }
    return div;
  }

  return { init, render };
})();

if (typeof window !== 'undefined') {
  /** @type {any} */ (window).MatchupPicker = MatchupPicker;
}
