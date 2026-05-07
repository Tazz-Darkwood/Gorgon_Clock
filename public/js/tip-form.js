// @ts-check
'use strict';

const TipForm = (() => {
  /** @type {string[]} */ let _fighters = [];
  /** @type {string[]} */ let _tipNpcs = [];
  /** @type {(tip: object) => void} */ let _onSubmit = () => {};

  /**
   * @param {{fighters: string[], tipNpcs: string[], onSubmit: (tip: object) => void}} cfg
   */
  function init(cfg) {
    _fighters = cfg.fighters;
    _tipNpcs = cfg.tipNpcs;
    _onSubmit = cfg.onSubmit;
  }

  /** @returns {HTMLElement} the rendered form (caller appends to DOM) */
  function render() {
    const root = document.createElement('div');
    root.style.cssText = 'border:1px dashed var(--amber-dim); padding:0.6rem; margin-top:0.5rem;';
    const npcOptions = _tipNpcs.map(n => `<option value="${n}">${n.replace(/_/g,' ')}</option>`).join('');
    const fighterOptions = _fighters.map(f => `<option value="${f}">${f}</option>`).join('');

    root.innerHTML = `
      <div style="font-family:'Cinzel',serif;color:var(--amber);font-size:0.78rem;letter-spacing:0.08em;margin-bottom:0.4rem;">+ ADD HOT TIP</div>
      <label style="display:block;margin-bottom:0.4rem;font-size:0.8rem;">
        Source NPC: <select data-tf="source">${npcOptions}</select>
      </label>
      <label style="display:inline-block;margin-right:0.6rem;font-size:0.8rem;">
        <input type="radio" name="type" value="matchup" data-tf="type" checked> Matchup-specific
      </label>
      <label style="display:inline-block;font-size:0.8rem;">
        <input type="radio" name="type" value="fighter" data-tf="type"> Per-fighter
      </label>
      <div style="margin-top:0.4rem;font-size:0.8rem;">
        Favored: <select data-tf="favored">${fighterOptions}</select>
        <span data-tf="vs-wrap"> vs <select data-tf="opponent">${fighterOptions}</select></span>
      </div>
      <div style="margin-top:0.4rem;font-size:0.8rem;">
        Modifier:
        <select data-tf="sign"><option value="1">+</option><option value="-1">−</option></select>
        <input type="number" data-tf="value" min="0" max="50" value="5" style="width:60px;"> %
      </div>
      <button data-tf="submit" style="margin-top:0.5rem;background:var(--maroon);color:var(--amber-bright);border:1px solid var(--maroon-bright);padding:0.3rem 0.8rem;font-family:'Cinzel',serif;letter-spacing:0.06em;cursor:pointer;font-size:0.78rem;">Save Tip</button>
      <div data-tf="error" style="color:var(--red);font-size:0.75rem;margin-top:0.3rem;"></div>
    `;

    const $ = (/** @type {string} */ sel) => /** @type {HTMLElement} */ (root.querySelector(`[data-tf="${sel}"]`));
    /** @type {HTMLElement} */ const vsWrap = $('vs-wrap');

    function updateVisibility() {
      /** @type {NodeListOf<HTMLInputElement>} */
      const types = root.querySelectorAll('[data-tf="type"]');
      const t = Array.from(types).find(x => x.checked)?.value || 'matchup';
      vsWrap.style.display = (t === 'matchup') ? 'inline' : 'none';
    }
    root.querySelectorAll('[data-tf="type"]').forEach(el => el.addEventListener('change', updateVisibility));

    /** @type {HTMLButtonElement} */ const submitBtn = /** @type {any} */ ($('submit'));
    submitBtn.addEventListener('click', () => {
      const errorEl = $('error');
      errorEl.textContent = '';
      const types = root.querySelectorAll('[data-tf="type"]');
      const t = /** @type {'matchup'|'fighter'} */ (
        Array.from(types).find(x => /** @type {HTMLInputElement} */ (x).checked)?.getAttribute('value') || 'matchup'
      );
      const source_npc = /** @type {HTMLSelectElement} */ ($('source')).value;
      const favored = /** @type {HTMLSelectElement} */ ($('favored')).value;
      const opponent = /** @type {HTMLSelectElement} */ ($('opponent')).value;
      const sign = /** @type {HTMLSelectElement} */ ($('sign')).value === '-1' ? -1 : 1;
      const valueRaw = /** @type {HTMLInputElement} */ ($('value')).value;
      const value = parseInt(valueRaw, 10);
      if (!Number.isInteger(value) || value < 0 || value > 50) {
        errorEl.textContent = 'Modifier must be 0–50.';
        return;
      }
      const modifier_pct = sign * value;
      if (t === 'matchup' && favored === opponent) {
        errorEl.textContent = 'Favored and opponent must differ.';
        return;
      }
      const tip = t === 'matchup'
        ? { type: 'matchup', source_npc, fighter_a: favored, fighter_b: opponent, favored, modifier_pct }
        : { type: 'fighter', source_npc, fighter_a: favored, fighter_b: null, favored, modifier_pct };
      _onSubmit(tip);
      // Reset form value to default for next entry
      /** @type {HTMLInputElement} */ ($('value')).value = '5';
    });

    updateVisibility();
    return root;
  }

  return { init, render };
})();

if (typeof window !== 'undefined') {
  /** @type {any} */ (window).TipForm = TipForm;
}
