// @ts-check
'use strict';

const MatchupForm = (() => {
  /** @type {string[]} */ let _fighters = [];
  /** @type {(payload: {fighter_a: string, fighter_b: string}) => void} */ let _onSubmit = () => {};

  /**
   * @param {{fighters: string[], onSubmit: (payload: {fighter_a: string, fighter_b: string}) => void}} cfg
   */
  function init(cfg) {
    _fighters = cfg.fighters;
    _onSubmit = cfg.onSubmit;
  }

  /** @returns {HTMLElement} */
  function render() {
    const root = document.createElement('div');
    root.style.cssText = 'border:1px dashed var(--amber-dim); padding:0.6rem; margin-top:0.6rem;';
    const fighterOptions = _fighters.map(f => `<option value="${f}">${f}</option>`).join('');
    root.innerHTML = `
      <div style="font-family:'Cinzel',serif;color:var(--amber);font-size:0.78rem;letter-spacing:0.08em;margin-bottom:0.4rem;">+ SUBMIT MATCHUP</div>
      <div style="display:flex;gap:0.4rem;align-items:center;">
        <select data-mf="a" style="flex:1;background:var(--panel-bg);color:var(--body-dim);border:1px solid var(--body-faint);padding:0.2rem;">${fighterOptions}</select>
        <span style="color:var(--amber-dim);">vs</span>
        <select data-mf="b" style="flex:1;background:var(--panel-bg);color:var(--body-dim);border:1px solid var(--body-faint);padding:0.2rem;">${fighterOptions}</select>
      </div>
      <button data-mf="submit" style="margin-top:0.5rem;width:100%;background:var(--maroon);color:var(--amber-bright);border:1px solid var(--maroon-bright);padding:0.3rem;font-family:'Cinzel',serif;letter-spacing:0.06em;font-size:0.8rem;cursor:pointer;">Submit Matchup</button>
      <div data-mf="error" style="color:var(--red);font-size:0.75rem;margin-top:0.3rem;"></div>
    `;
    const errorEl = /** @type {HTMLElement} */ (root.querySelector('[data-mf="error"]'));
    const submitBtn = root.querySelector('[data-mf="submit"]');
    if (submitBtn) submitBtn.addEventListener('click', () => {
      const a = /** @type {HTMLSelectElement} */ (root.querySelector('[data-mf="a"]')).value;
      const b = /** @type {HTMLSelectElement} */ (root.querySelector('[data-mf="b"]')).value;
      errorEl.textContent = '';
      if (a === b) { errorEl.textContent = 'Pick two different fighters.'; return; }
      _onSubmit({ fighter_a: a, fighter_b: b });
    });
    return root;
  }

  return { init, render };
})();

if (typeof window !== 'undefined') {
  /** @type {any} */ (window).MatchupForm = MatchupForm;
}
