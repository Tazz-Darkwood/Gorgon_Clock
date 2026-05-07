// @ts-check
'use strict';

const KellyDisplay = (() => {
  /** @type {(bankroll: number) => void} */ let _onBankrollChange = () => {};
  /** @type {(fraction: 'full'|'half'|'quarter') => void} */ let _onFractionChange = () => {};

  /**
   * @param {{onBankrollChange: (n:number)=>void, onFractionChange: (f:'full'|'half'|'quarter')=>void}} cfg
   */
  function init(cfg) {
    _onBankrollChange = cfg.onBankrollChange;
    _onFractionChange = cfg.onFractionChange;
  }

  /**
   * @param {{fighter_a: string, fighter_b: string, p: number, bankroll: number, fraction: 'full'|'half'|'quarter', recommendedBet: number}|null} info
   * @returns {HTMLElement}
   */
  function render(info) {
    const div = document.createElement('div');
    if (!info) {
      div.innerHTML = `<div style="margin-top:0.7rem;text-align:center;color:var(--amber-dim);font-style:italic;font-size:0.85rem;">Pick a matchup to see win probability</div>`;
      return div;
    }
    const pctA = Math.round(info.p * 100);
    const pctB = 100 - pctA;
    const edge = (1.9 * info.p - 1);
    const aboveBreakEven = edge > 0;
    const fractions = /** @type {const} */ (['full','half','quarter']);
    const labels = { full: 'Full Kelly', half: 'Half-Kelly', quarter: 'Quarter-Kelly' };

    div.innerHTML = `
      <div style="margin-top:0.7rem;font-size:0.78rem;color:var(--body-dim);">Win Probability</div>
      <div style="display:flex;height:28px;border:1px solid var(--body-faint);">
        <div style="background:var(--green);width:${pctA}%;color:white;padding-left:0.5rem;font-size:0.85rem;line-height:28px;">${info.fighter_a} · ${pctA}%</div>
        <div style="background:var(--maroon);width:${pctB}%;color:var(--body-text);text-align:right;padding-right:0.5rem;font-size:0.85rem;line-height:28px;">${info.fighter_b} · ${pctB}%</div>
      </div>
      <div style="font-size:0.7rem;color:var(--amber-dim);margin-top:0.2rem;">break-even at 53%</div>

      <div style="border-top:1px solid var(--body-faint);padding-top:0.6rem;margin-top:0.6rem;display:flex;align-items:center;gap:0.4rem;">
        <label style="font-size:0.78rem;color:var(--body-dim);">Bankroll: <input data-kd="bankroll" type="number" min="0" value="${info.bankroll}" style="background:var(--bg);color:var(--amber-bright);border:1px solid var(--maroon);padding:0.2rem;width:100px;font-family:monospace;" aria-label="Bankroll in councils"></label>
        <span style="font-size:0.78rem;color:var(--amber-dim);">councils</span>
        <select data-kd="fraction" style="margin-left:auto;background:var(--bg);color:var(--body-dim);border:1px solid var(--body-faint);padding:0.15rem;font-size:0.78rem;" aria-label="Kelly fraction">
          ${fractions.map(f => `<option value="${f}" ${f===info.fraction?'selected':''}>${labels[f]}</option>`).join('')}
        </select>
      </div>

      <div style="margin-top:0.5rem;background:rgba(200,120,10,${aboveBreakEven?'0.08':'0.02'});border:1px solid ${aboveBreakEven?'var(--amber)':'var(--body-faint)'};padding:0.6rem;text-align:center;">
        ${aboveBreakEven
          ? `<div style="font-size:0.7rem;color:var(--amber-dim);letter-spacing:0.08em;text-transform:uppercase;">Recommended bet on ${info.fighter_a}</div>
             <div style="color:var(--amber-bright);font-family:'Cinzel',serif;font-size:1.4rem;padding:0.3rem 0;">${info.recommendedBet.toLocaleString()} councils</div>
             <div style="font-size:0.7rem;color:var(--body-dim);">edge +${(edge*100).toFixed(1)}% · ${labels[info.fraction]}</div>`
          : `<div style="color:var(--red);font-family:'Cinzel',serif;font-size:1rem;padding:0.2rem 0;">DON'T BET</div>
             <div style="font-size:0.72rem;color:var(--body-dim);">house edge exceeds your information edge</div>`
        }
      </div>
    `;
    /** @type {HTMLInputElement} */ const bankrollInput = /** @type {any} */ (div.querySelector('[data-kd="bankroll"]'));
    bankrollInput.addEventListener('change', () => {
      const n = parseInt(bankrollInput.value, 10);
      if (Number.isInteger(n) && n >= 0) _onBankrollChange(n);
    });
    /** @type {HTMLSelectElement} */ const fractionSel = /** @type {any} */ (div.querySelector('[data-kd="fraction"]'));
    fractionSel.addEventListener('change', () => {
      _onFractionChange(/** @type {any} */ (fractionSel.value));
    });
    return div;
  }

  return { init, render };
})();

if (typeof window !== 'undefined') {
  /** @type {any} */ (window).KellyDisplay = KellyDisplay;
}
