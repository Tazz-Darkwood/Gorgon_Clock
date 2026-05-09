// @ts-check
'use strict';

const History_ = (() => {
  /**
   * @param {Array<{slot_id:string, matchup:[string,string], won:boolean, delta:number}>} entries
   * @returns {HTMLElement}
   */
  function render(entries) {
    const div = document.createElement('div');
    if (!entries.length) {
      div.innerHTML = `<div style="color:var(--amber-dim);font-style:italic;font-size:0.85rem;">No bets logged yet.</div>`;
      return div;
    }
    const recent = entries.slice(-5).reverse();
    const total = entries.reduce((s, e) => s + e.delta, 0);
    const wins = entries.filter(e => e.won).length;
    const losses = entries.length - wins;

    const chips = recent.map(e => {
      const color = e.won ? 'var(--green)' : 'var(--red)';
      const sign = e.delta >= 0 ? '+' : '';
      return `<span style="border:1px solid ${color};padding:0.2rem 0.5rem;color:${color};font-size:0.75rem;">${e.slot_id.slice(-3)} · ${e.matchup[0]} ${e.won?'won':'lost'} ${sign}${e.delta.toLocaleString()}</span>`;
    }).join(' ');

    div.innerHTML = `
      <div style="display:flex;gap:0.4rem;flex-wrap:wrap;">${chips}</div>
      <div style="margin-top:0.4rem;font-size:0.75rem;color:var(--amber-dim);">
        Lifetime: <strong style="color:${total>=0?'var(--green)':'var(--red)'};">${total>=0?'+':''}${total.toLocaleString()}</strong> (${wins}W / ${losses}L)
      </div>
    `;
    return div;
  }

  return { render };
})();

if (typeof window !== 'undefined') {
  /** @type {any} */ (window).History_ = History_;
}
