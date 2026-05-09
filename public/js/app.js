// @ts-check
'use strict';

(async function App() {
  // Load static data
  const [fightersRes, npcsRes] = await Promise.all([
    fetch('data/arena_fighters.json'),
    fetch('data/arena_tip_npcs.json')
  ]);
  const fightersJson = await fightersRes.json();
  const npcsJson = await npcsRes.json();
  const fighters = /** @type {Array<{id:string}>} */ (fightersJson.fighters).map(f => f.id);
  const tipNpcs = /** @type {Array<{id:string}>} */ (npcsJson.tip_npcs).map(n => n.id);

  // Load state
  let state = State.load();
  // Trigger day rollover if needed
  if (State.checkDayRollover(state, new Date())) State.save(state);

  // First-visit modal: prompt for bankroll if 0
  if (state.bankroll === 0) {
    const input = window.prompt('Quick setup — your council balance? (You can update this anytime.)', '50000');
    const parsed = parseInt(input || '', 10);
    if (Number.isInteger(parsed) && parsed > 0) {
      state.bankroll = parsed;
      State.save(state);
    }
  }

  // DOM refs
  const banner = document.getElementById('banner');
  const cdValue = document.getElementById('countdown-value');
  const cdMeta = document.getElementById('countdown-meta');
  const tipsList = document.getElementById('tips-list');
  const tipFormContainer = document.getElementById('tip-form-container');
  const matchupContainer = document.getElementById('matchup-container');
  const matchupFormContainer = document.getElementById('matchup-form-container');
  const kellyContainer = document.getElementById('kelly-container');
  const historyContainer = document.getElementById('history-container');

  // Init components
  TipForm.init({
    fighters,
    tipNpcs,
    onSubmit: async (tip) => {
      const day = Schedule.localESTDate(new Date());
      const r = await Api.postTip(day, { ...tip, user_id: state.user_id });
      if (!r.ok) showBanner("Couldn't submit tip — showing local view only.");
      else { hideBanner(); _latest.tips = r.data; renderAll(); }
    }
  });
  MatchupPicker.init({
    onVote: async ({ entry_id }) => {
      const slotId = Schedule.slotIdAt(new Date());
      const r = await Api.postMatchup(slotId, /** @type {any} */ ({
        user_id: state.user_id, action: 'vote', entry_id
      }));
      if (!r.ok) { showBanner("Couldn't reach shared state — local-only mode."); return; }
      hideBanner();
      _latest.slot = r.data;
      const myEntry = r.data.entries.find((/** @type {any} */ e) => e.voter_ids.includes(state.user_id));
      state.voted_slots[slotId] = myEntry ? myEntry.id : '';
      State.save(state);
      renderAll();
    },
    onPicked: (entryId) => {
      const slotKey = Schedule.slotIdAt(new Date());
      if (entryId) state.voted_slots[slotKey] = entryId;
      else delete state.voted_slots[slotKey];
      State.save(state);
      renderAll();
    }
  });
  KellyDisplay.init({
    onBankrollChange: (n) => { state.bankroll = n; State.save(state); renderAll(); },
    onFractionChange: (f) => { state.kelly_fraction = f; State.save(state); renderAll(); }
  });
  MatchupForm.init({
    fighters,
    onSubmit: async ({ fighter_a, fighter_b }) => {
      const slotId = Schedule.slotIdAt(new Date());
      const r = await Api.postMatchup(slotId, /** @type {any} */ ({
        user_id: state.user_id, action: 'create', fighter_a, fighter_b
      }));
      if (!r.ok) { showBanner("Couldn't reach shared state — local-only mode."); return; }
      hideBanner();
      _latest.slot = r.data;
      const myEntry = r.data.entries.find((/** @type {any} */ e) => e.voter_ids.includes(state.user_id));
      state.voted_slots[slotId] = myEntry ? myEntry.id : '';
      State.save(state);
      renderAll();
    }
  });

  // Mount forms once so re-renders don't wipe in-progress input
  if (tipFormContainer) tipFormContainer.appendChild(TipForm.render());
  if (matchupFormContainer) matchupFormContainer.appendChild(MatchupForm.render());

  /** @type {{slot: any, tips: any}} */
  let _latest = { slot: { entries: [] }, tips: { tips: [] } };
  // Cached signature of the last matchup render — skip re-render when unchanged so the
  // empty-state form's selects don't reset under the user.
  let _lastMatchupSig = '';

  function showBanner(/** @type {string} */ msg) { if (banner) { banner.textContent = msg; banner.classList.add('visible'); } }
  function hideBanner() { if (banner) banner.classList.remove('visible'); }

  async function poll() {
    const now = new Date();
    if (State.checkDayRollover(state, now)) State.save(state);
    const slotId = Schedule.slotIdAt(now);
    const day = Schedule.localESTDate(now);
    const r = await Api.getState(slotId, day);
    if (r.ok) { hideBanner(); _latest = r.data; }
    else showBanner("Can't reach shared state — showing your local view only.");
    renderAll();
  }

  function _kellyFractionToNumber(/** @type {string} */ f) {
    return f === 'full' ? 1.0 : f === 'quarter' ? 0.25 : 0.5;
  }

  /** Escape HTML so server-supplied strings can never inject markup. */
  function _esc(/** @type {unknown} */ s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // 8-min slot in ms; we count down to the *next* slot's start, not the current slot's
  // (Schedule.startsAtUtc returns the current slot's start which is always in the past).
  const SLOT_MS_LOCAL = 8 * 60 * 1000;

  function tickCountdown() {
    const now = new Date();
    const slotId = Schedule.slotIdAt(now);
    const currentStart = Schedule.startsAtUtc(slotId);
    const nextStart = new Date(currentStart.getTime() + SLOT_MS_LOCAL);
    const remaining = Math.max(0, nextStart.getTime() - now.getTime());
    const m = Math.floor(remaining / 60000);
    const s = Math.floor((remaining % 60000) / 1000);
    if (cdValue) cdValue.textContent = `${m}:${s.toString().padStart(2,'0')}`;
    if (cdMeta) cdMeta.textContent = `slot #${slotId.slice(-3)} · next start ${nextStart.toUTCString().slice(17,22)} UTC · 8m window`;
  }

  function renderAll() {
    tickCountdown();
    const now = new Date();
    const slotId = Schedule.slotIdAt(now);

    // Tips panel — only the list; the form is mounted once and stays put.
    if (tipsList) {
      tipsList.innerHTML = '';
      const tips = (_latest.tips && _latest.tips.tips) ? _latest.tips.tips : [];
      const visibleTips = tips.filter((/** @type {any} */ t) => state.voted_tips[t.id] !== 'removed');
      for (const tip of visibleTips) {
        const card = document.createElement('div');
        const stance = state.voted_tips[tip.id];
        const upCount = tip.upvoters.length;
        const removeCount = tip.removers.length;
        const sign = tip.modifier_pct >= 0 ? '+' : '';
        card.style.cssText = `border-left:2px solid ${tip.modifier_pct>=0?'var(--green)':'var(--red)'};padding:0.4rem 0.6rem;margin-bottom:0.4rem;background:rgba(${tip.modifier_pct>=0?'74,122,42':'192,57,43'},0.05);font-size:0.82rem;`;
        const target = tip.type === 'matchup'
          ? `<strong>${_esc(tip.fighter_a)}</strong> vs <strong>${_esc(tip.fighter_b)}</strong> → ${_esc(tip.favored)} <span style="color:${tip.modifier_pct>=0?'var(--green)':'var(--red)'};">${sign}${tip.modifier_pct}%</span>`
          : `<strong>${_esc(tip.favored)}</strong> <span style="color:${tip.modifier_pct>=0?'var(--green)':'var(--red)'};">${sign}${tip.modifier_pct}%</span> all day`;
        card.innerHTML = `
          <div>${target}</div>
          <div style="font-size:0.7rem;color:var(--amber-dim);">from ${_esc(String(tip.source_npc).replace(/_/g,' '))} · ↑${upCount} ✕${removeCount}</div>
          <div style="margin-top:0.2rem;font-size:0.7rem;">
            <a href="#" data-act="upvote" data-id="${_esc(tip.id)}" style="color:var(--green);" aria-label="Upvote tip">↑ upvote</a> ·
            <a href="#" data-act="remove" data-id="${_esc(tip.id)}" style="color:var(--red);" aria-label="Remove tip from your feed">✕ remove</a>
            ${stance ? ` · <span style="color:var(--amber-dim);">(your stance: ${_esc(stance)})</span>` : ''}
          </div>
        `;
        card.querySelectorAll('[data-act]').forEach(a => {
          a.addEventListener('click', async (e) => {
            e.preventDefault();
            const action = /** @type {'upvote'|'remove'} */ (a.getAttribute('data-act'));
            const tipId = a.getAttribute('data-id') || '';
            state.voted_tips[tipId] = action === 'upvote' ? 'upvoted' : 'removed';
            State.save(state);
            const day = Schedule.localESTDate(new Date());
            const r = await Api.patchTip(day, tipId, { user_id: state.user_id, action });
            if (r.ok) _latest.tips = r.data;
            renderAll();
          });
        });
        tipsList.appendChild(card);
      }
    }

    // Matchup panel — re-render only when slot data or pick changed.
    const slot = _latest.slot || { entries: [] };
    const pickedId = state.voted_slots[slotId] || null;
    const sig = JSON.stringify({
      s: slotId,
      p: pickedId,
      e: (slot.entries || []).map((/** @type {any} */ e) => [e.id, e.fighter_a, e.fighter_b, e.voter_ids.length])
    });
    if (matchupContainer && sig !== _lastMatchupSig) {
      _lastMatchupSig = sig;
      matchupContainer.innerHTML = '';
      matchupContainer.appendChild(MatchupPicker.render({ entries: slot.entries || [] }, pickedId));
    }

    // Kelly panel — cheap to rebuild and has no input the user is mid-typing into often.
    if (kellyContainer) {
      kellyContainer.innerHTML = '';
      const pickedEntry = pickedId ? (slot.entries || []).find((/** @type {any} */ e) => e.id === pickedId) : null;
      if (pickedEntry) {
        const tips = (_latest.tips && _latest.tips.tips) ? _latest.tips.tips : [];
        const visibleTips = tips.filter((/** @type {any} */ t) => state.voted_tips[t.id] !== 'removed');
        const p = Math_.aggregateProbability(visibleTips, pickedEntry.fighter_a, pickedEntry.fighter_b);
        const fracN = _kellyFractionToNumber(state.kelly_fraction);
        // Always size the bet for whichever fighter is the underdog-of-the-house —
        // i.e. the side with higher win probability. The display picks which fighter
        // to recommend based on the same comparison.
        const bet = Math_.kellyBet(Math.max(p, 1 - p), state.bankroll, fracN);
        kellyContainer.appendChild(KellyDisplay.render({
          fighter_a: pickedEntry.fighter_a,
          fighter_b: pickedEntry.fighter_b,
          p, bankroll: state.bankroll, fraction: state.kelly_fraction, recommendedBet: bet
        }));
      } else {
        kellyContainer.appendChild(KellyDisplay.render(null));
      }
    }

    // History
    if (historyContainer) {
      historyContainer.innerHTML = '';
      historyContainer.appendChild(History_.render(state.history));
    }
  }

  // Tick: countdown every second; poll on a longer cadence. Panels render only on
  // poll completion or user action so input fields aren't reset under the user.
  let lastPollAt = 0;
  setInterval(() => {
    tickCountdown();
    const now = new Date();
    const slotId = Schedule.slotIdAt(now);
    const msToNext = (Schedule.startsAtUtc(slotId).getTime() + SLOT_MS_LOCAL) - now.getTime();
    const interval = (msToNext > 0 && msToNext < 60_000) ? 10_000 : 30_000;
    if (now.getTime() - lastPollAt > interval) {
      lastPollAt = now.getTime();
      poll();
    }
  }, 1000);

  // Initial poll
  await poll();
})();
