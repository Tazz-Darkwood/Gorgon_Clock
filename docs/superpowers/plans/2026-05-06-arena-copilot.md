# Arena Copilot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the Red Wing Casino arena betting copilot as v1 of Gorgon Clock's expanded feature set — community-confirmed matchups, additive Hot Tip aggregation, and Kelly-criterion bet sizing.

**Architecture:** Static frontend on GitHub Pages (vanilla JS + JSDoc, no bundler) + Cloudflare Worker + KV for shared matchup/tip state. Per-user state in localStorage. The two halves are decoupled: the static site can run with the Worker offline (degrades to local-only mode) and the Worker has zero browser knowledge.

**Tech Stack:** Vanilla JS + JSDoc (browser), TypeScript (Worker), Cloudflare Workers + KV, GitHub Pages, GitHub Actions, Vitest (`@cloudflare/vitest-pool-workers`), `tsc --noEmit --checkJs` for browser type-checking, no bundler.

**Reference spec:** `docs/superpowers/specs/2026-05-06-arena-copilot-design.md`

---

## File Map

**Created:**
```
public/
├── arena.html
├── privacy.html
├── 404.html
├── icon.svg
├── favicon.ico
├── _headers
├── tests.html
├── data/
│   ├── arena_fighters.json
│   └── arena_tip_npcs.json
└── js/
    ├── math.js
    ├── schedule.js
    ├── state.js
    ├── api.js
    ├── tip-form.js
    ├── matchup-picker.js
    ├── kelly-display.js
    ├── history.js
    └── app.js

worker/
├── wrangler.toml
├── package.json
├── tsconfig.json
├── .gitignore
└── src/
    ├── index.ts
    ├── matchup.ts
    ├── tips.ts
    ├── schedule.ts
    ├── validation.ts
    ├── ratelimit.ts
    └── index.test.ts

.github/workflows/
├── ci.yml
└── deploy.yml

LICENSE
README.md
MANUAL_TEST.md
tsconfig.json   (root, for browser JS type-checking)
```

**Modified:**
```
public/index.html      — add arena panel, append EVENTS entry, extend CSP
.gitignore             — add worker/node_modules
```

---

## Phase 0 — Repo prep + static data + project metadata

### Task 0.1: Root tsconfig for browser JS type-checking

**Files:**
- Create: `tsconfig.json`

- [ ] **Step 1: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "es2022",
    "module": "es2022",
    "moduleResolution": "bundler",
    "allowJs": true,
    "checkJs": true,
    "noEmit": true,
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "lib": ["es2022", "dom"],
    "skipLibCheck": true
  },
  "include": ["public/js/**/*.js"]
}
```

- [ ] **Step 2: Verify tsc accepts it (no errors yet because no JS files)**

Run: `npx -p typescript@latest tsc --noEmit -p tsconfig.json`
Expected: completes silently with exit code 0 (no JS files yet, nothing to check).

- [ ] **Step 3: Commit**

```bash
git add tsconfig.json
git commit -m "chore: add root tsconfig for browser JS type-checking"
```

---

### Task 0.2: Static data — arena fighters + tip NPCs

**Files:**
- Create: `public/data/arena_fighters.json`
- Create: `public/data/arena_tip_npcs.json`

- [ ] **Step 1: Create `public/data/arena_fighters.json`**

```json
{
  "_v": 1,
  "fighters": [
    {"id": "Corrrak", "species": "Ranalon",        "style": "Fosulf martial style"},
    {"id": "Dura",    "species": "Orc",            "style": "Sword and shield"},
    {"id": "Gloz",    "species": "Goblin Bear",    "style": "Claws, rending"},
    {"id": "Leo",     "species": "Rahu",           "style": "Natural claws and limbs"},
    {"id": "Otis",    "species": "Ogre",           "style": "Bone-shattering"},
    {"id": "Ushug",   "species": "Orc",            "style": "Staff fighter"},
    {"id": "Vizlark", "species": "Psychic Mantis", "style": "Psychic powers"}
  ],
  "_TODO": "Verify completeness — wiki page truncated mid-Vizlark, may be more (TODO-2)"
}
```

- [ ] **Step 2: Create `public/data/arena_tip_npcs.json`**

```json
{
  "_v": 1,
  "tip_npcs": [
    {"id": "Mandibles",         "favor_required": "Friends", "verified": true,
     "verification_source": "wiki Mandibles page — 'rewards her friends with...a hot tip'"},
    {"id": "Qatik",             "favor_required": "Friends", "verified": false},
    {"id": "Irkima",            "favor_required": "Friends", "verified": false},
    {"id": "Eveline_Rastin",    "favor_required": "Friends", "verified": false},
    {"id": "Arianna_Fangblade", "favor_required": "Friends", "verified": false}
  ],
  "_TODO": "Verify favor thresholds for all entries except Mandibles (TODO-3)"
}
```

- [ ] **Step 3: Verify both files parse as valid JSON**

Run: `python3 -c "import json; json.load(open('public/data/arena_fighters.json')); json.load(open('public/data/arena_tip_npcs.json')); print('OK')"`
Expected: prints `OK`.

- [ ] **Step 4: Commit**

```bash
git add public/data/arena_fighters.json public/data/arena_tip_npcs.json
git commit -m "feat: add static data for arena fighters and tip NPCs"
```

---

### Task 0.3: License + README + MANUAL_TEST

**Files:**
- Create: `LICENSE`
- Create: `README.md`
- Create: `MANUAL_TEST.md`

- [ ] **Step 1: Create `LICENSE` (MIT)**

```
MIT License

Copyright (c) 2026 spearw

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

- [ ] **Step 2: Create `README.md`**

```markdown
# Gorgon Clock

A temporal dashboard for the MMO **Project: Gorgon** — fan-made, browser-only.

## What it is

The home page is a real-time clock that translates real time into Gorgon (PG) time
and surfaces in-game events with chime alerts. The arena copilot (`/arena.html`) is
a betting assistant for the Red Wing Casino: it aggregates Hot Tips you've gathered
in-game, computes win probabilities, and uses the Kelly criterion to recommend an
optimal bet size given your bankroll.

## Architecture

- Static frontend on GitHub Pages (vanilla JS, no bundler, no framework)
- Cloudflare Worker + KV for shared matchup/tip state across the player community
- Browser data (bankroll, voted choices, history) lives in localStorage only

## Disclaimer

Not affiliated with Elder Game or Project Gorgon. Game data sourced from
`cdn.projectgorgon.com` (publicly licensed for tool authors) and the community wiki.
All trademarks belong to their owners.

## Local development

Browser code is plain HTML/JS; just open `public/index.html` in a browser.

For the Worker:
```bash
cd worker
npm install
npm run dev    # local Worker at http://localhost:8787
npm test       # Vitest suite
```

## License

MIT — see `LICENSE`.
```

- [ ] **Step 3: Create `MANUAL_TEST.md`**

```markdown
# Manual Test Checklist — Arena Copilot v1

Run this checklist before merging anything that touches `public/arena.html`,
`public/index.html`, or anything in `public/js/`.

## Cross-browser smoke tests

- [ ] Open `public/arena.html` in Chrome — three matchup states render correctly
- [ ] Open in Firefox — verify parity
- [ ] Open in Safari — verify parity
- [ ] Open in mobile-width window (≤ 480px) — columns stack vertically

## Functional flows

- [ ] First-visit modal prompts for bankroll, persists to localStorage
- [ ] Tip entry: matchup-specific tip submits and renders
- [ ] Tip entry: per-fighter tip submits and renders
- [ ] Upvote a tip — count increments, badge appears
- [ ] Remove a tip — card hides, can be restored
- [ ] Submit new matchup — entry appears with vote count 1
- [ ] Vote for existing matchup — count increments
- [ ] Change vote (vote different matchup) — old count decrements, new increments
- [ ] Win-% bar reflects aggregated tips correctly
- [ ] Kelly bar greys out below break-even (52.6%)
- [ ] Kelly bar shows recommendation above break-even

## Error states

- [ ] Stop the Worker mid-session — banner appears, app continues in local-only mode
- [ ] Reload the page after Worker recovers — banner clears

## Time edge cases

- [ ] Set system time to 11:59 PM EST → wait 2 minutes → tips wipe
- [ ] Set system time to 30s past slot start → bets-closed lock activates

## Accessibility

- [ ] Keyboard-only nav reaches all interactive elements
- [ ] Screen reader announces ARIA labels on icon buttons
- [ ] Color contrast passes WCAG AA (sample with Chrome devtools)
```

- [ ] **Step 4: Commit**

```bash
git add LICENSE README.md MANUAL_TEST.md
git commit -m "chore: add LICENSE, README, manual test checklist"
```

---

### Task 0.4: Update .gitignore for worker/node_modules

**Files:**
- Modify: `.gitignore`

- [ ] **Step 1: Append worker dirs**

Add these lines to `.gitignore`:

```
worker/node_modules/
worker/dist/
worker/.wrangler/
node_modules/
```

- [ ] **Step 2: Commit**

```bash
git add .gitignore
git commit -m "chore: gitignore worker build artifacts and node_modules"
```

---

## Phase 1 — Math module (the testable core)

The `Math_` namespace holds the two pure functions that everything else depends on. Tests live in `public/tests.html` and run by opening the file in a browser.

### Task 1.1: tests.html scaffold with assertion runner

**Files:**
- Create: `public/tests.html`

- [ ] **Step 1: Create `public/tests.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Gorgon Clock — Tests</title>
  <style>
    body { font-family: monospace; background: #111; color: #ddd; padding: 1rem; }
    .pass { color: #4a7a2a; }
    .fail { color: #c0392b; font-weight: bold; }
    h2 { border-bottom: 1px solid #444; padding-bottom: 0.3rem; }
    .summary { margin-top: 2rem; padding: 1rem; background: #222; }
  </style>
</head>
<body>
  <h1>Gorgon Clock — Test Runner</h1>
  <p>Open this file in any browser. Each test logs ✓ (green) or ✗ (red).</p>

  <div id="results"></div>

  <script>
    /** @type {{pass: number, fail: number, failures: string[]}} */
    const stats = { pass: 0, fail: 0, failures: [] };
    const results = document.getElementById('results');

    /**
     * @param {boolean} cond
     * @param {string} name
     */
    function ok(cond, name) {
      const div = document.createElement('div');
      if (cond) {
        stats.pass++;
        div.className = 'pass';
        div.textContent = '✓ ' + name;
      } else {
        stats.fail++;
        stats.failures.push(name);
        div.className = 'fail';
        div.textContent = '✗ ' + name;
      }
      results.appendChild(div);
    }

    /** @param {string} title */
    function section(title) {
      const h = document.createElement('h2');
      h.textContent = title;
      results.appendChild(h);
    }

    function summary() {
      const div = document.createElement('div');
      div.className = 'summary';
      div.innerHTML = `<strong>${stats.pass} passed / ${stats.fail} failed</strong>`;
      if (stats.failures.length) {
        div.innerHTML += '<br><br>Failures:<br>' + stats.failures.map(f => '• ' + f).join('<br>');
      }
      results.appendChild(div);
    }

    window.__test = { ok, section, summary };
  </script>

  <!-- Test files load here; each calls __test.section(...) then __test.ok(...) -->
  <!-- Add: <script src="js/math.js"></script><script>...tests...</script> -->

  <script>
    // Run summary at end after all test scripts have loaded
    document.addEventListener('DOMContentLoaded', () => {
      window.__test.summary();
    });
  </script>
</body>
</html>
```

- [ ] **Step 2: Open in browser, verify it loads**

Open `public/tests.html` directly in a browser. Expected: blank page with header "Gorgon Clock — Test Runner" and `0 passed / 0 failed` summary.

- [ ] **Step 3: Commit**

```bash
git add public/tests.html
git commit -m "feat: add test runner scaffold for browser code"
```

---

### Task 1.2: Math_.aggregateProbability — pure function + tests

**Files:**
- Create: `public/js/math.js`
- Modify: `public/tests.html`

- [ ] **Step 1: Add failing test scripts to `public/tests.html`**

Find the comment `<!-- Test files load here; ... -->` in `public/tests.html` and replace it with:

```html
<script src="js/math.js"></script>
<script>
  const { ok, section } = window.__test;

  section('Math_.aggregateProbability');

  ok(Math_.aggregateProbability([], 'Otis', 'Leo') === 0.5,
     'empty tips → 50/50');

  ok(Math_.aggregateProbability(
       [{type:'fighter', favored:'Otis', modifier_pct:10}], 'Otis', 'Leo'
     ) === 0.6,
     'fighter +10% applies to favored');

  ok(Math_.aggregateProbability(
       [{type:'fighter', favored:'Leo', modifier_pct:10}], 'Otis', 'Leo'
     ) === 0.4,
     'fighter +10% on opponent reduces P(A)');

  ok(Math_.aggregateProbability(
       [
         {type:'fighter', favored:'Otis', modifier_pct:5},
         {type:'fighter', favored:'Otis', modifier_pct:3},
         {type:'matchup', fighter_a:'Otis', fighter_b:'Leo', favored:'Otis', modifier_pct:10}
       ], 'Otis', 'Leo'
     ) === 0.68,
     'tips stack additively (5+3+10 = +18%)');

  ok(Math_.aggregateProbability(
       [{type:'matchup', fighter_a:'Otis', fighter_b:'Vizlark', favored:'Otis', modifier_pct:30}],
       'Otis', 'Leo'
     ) === 0.5,
     'matchup-specific tip ignored when fighters differ');

  ok(Math_.aggregateProbability(
       [{type:'fighter', favored:'Otis', modifier_pct:200}], 'Otis', 'Leo'
     ) === 0.99,
     'clamps to 99% on absurd modifier');

  ok(Math_.aggregateProbability(
       [{type:'fighter', favored:'Leo', modifier_pct:200}], 'Otis', 'Leo'
     ) === 0.01,
     'clamps to 1% on negative absurd');

  ok(Math_.aggregateProbability(
       [{type:'matchup', fighter_a:'Leo', fighter_b:'Otis', favored:'Otis', modifier_pct:10}],
       'Otis', 'Leo'
     ) === 0.6,
     'matchup tip works regardless of fighter order in tip object');
</script>
```

- [ ] **Step 2: Open `public/tests.html` in a browser**

Expected: 8 red `✗` lines under the "Math_.aggregateProbability" heading. Console error: `Math_ is not defined`. This confirms tests fail.

- [ ] **Step 3: Create `public/js/math.js`**

```js
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
```

- [ ] **Step 4: Reload `public/tests.html` in browser**

Expected: all 8 lines under "Math_.aggregateProbability" are now green ✓. Summary: `8 passed / 0 failed`.

- [ ] **Step 5: Run type-check**

Run: `npx -p typescript@latest tsc --noEmit -p tsconfig.json`
Expected: exit code 0, no errors.

- [ ] **Step 6: Commit**

```bash
git add public/js/math.js public/tests.html
git commit -m "feat(math): add aggregateProbability pure function with tests"
```

---

### Task 1.3: Math_.kellyBet — Kelly criterion with b=0.9

**Files:**
- Modify: `public/js/math.js`
- Modify: `public/tests.html`

- [ ] **Step 1: Append failing tests to `public/tests.html`**

Find the closing `</script>` tag of the math tests block and add this before it:

```js
  section('Math_.kellyBet (b = 0.9)');

  ok(Math_.kellyBet(0.5, 50000, 1.0) === 0,
     'no edge at 50/50: don\'t bet');

  ok(Math_.kellyBet(0.5263, 50000, 1.0) === 0,
     'still no edge exactly at break-even (0.5263): don\'t bet');

  ok(Math_.kellyBet(0.6, 50000, 1.0) === Math.round(50000 * (1.9 * 0.6 - 1) / 0.9),
     'full Kelly at 60% probability');

  ok(Math_.kellyBet(0.6, 50000, 0.5) === Math.round(50000 * 0.5 * (1.9 * 0.6 - 1) / 0.9),
     'half-Kelly is exactly half of full');

  ok(Math_.kellyBet(0.6, 50000, 0.25) === Math.round(50000 * 0.25 * (1.9 * 0.6 - 1) / 0.9),
     'quarter-Kelly');

  ok(Math_.kellyBet(0.6, 0, 1.0) === 0,
     'zero bankroll → zero bet');

  ok(Math_.kellyBet(0.6, -100, 1.0) === 0,
     'negative bankroll → zero bet');

  ok(Math_.kellyBet(0.99, 1000, 1.0) > 0,
     'extreme p still produces a positive bet');
```

- [ ] **Step 2: Reload `public/tests.html`**

Expected: 8 new red ✗ lines under "Math_.kellyBet". Console error: `Math_.kellyBet is not a function`.

- [ ] **Step 3: Add kellyBet implementation to `public/js/math.js`**

Inside the IIFE in `public/js/math.js`, after the `aggregateProbability` function definition and before `return { aggregateProbability };`, add:

```js
  /**
   * Kelly criterion bet sizing for the casino's fixed payout structure.
   *
   * Casino pays 2× minus 10% fee → net odds b = 0.9 (you risk W to net 0.9W).
   * Kelly: f* = (b·p − q) / b = (1.9p − 1) / 0.9.
   * If edge ≤ 0, returns 0 (the tool refuses negative-EV bets).
   *
   * @param {number} p - estimated win probability in [0, 1]
   * @param {number} bankroll - current councils on hand
   * @param {number} fraction - Kelly fraction, typically 1.0/0.5/0.25
   * @returns {number} recommended bet rounded to the nearest integer council
   */
  function kellyBet(p, bankroll, fraction) {
    if (bankroll <= 0) return 0;
    const edge = 1.9 * p - 1;
    if (edge <= 0) return 0;
    const fStar = edge / 0.9;
    return Math.round(bankroll * fStar * fraction);
  }
```

And update the return statement:

```js
  return { aggregateProbability, kellyBet };
```

- [ ] **Step 4: Reload tests**

Expected: all 16 tests now pass.

- [ ] **Step 5: Type-check**

Run: `npx -p typescript@latest tsc --noEmit -p tsconfig.json`
Expected: exit code 0.

- [ ] **Step 6: Commit**

```bash
git add public/js/math.js public/tests.html
git commit -m "feat(math): add kellyBet pure function with tests"
```

---

## Phase 2 — Schedule module (slot IDs and countdown)

The `Schedule` namespace handles deterministic slot-ID derivation, countdown to the next fight, day-rollover detection, and "can still bet?" checks. All pure functions, taking `Date` as input — no `new Date()` inside the module so tests can supply fixed times.

### Task 2.1: Schedule.slotIdAt — derive slot from a Date

**Files:**
- Create: `public/js/schedule.js`
- Modify: `public/tests.html`

- [ ] **Step 1: Append failing tests to `public/tests.html`**

Append after the existing math tests block (before the final `</script>` block that runs `summary()`):

```html
<script src="js/schedule.js"></script>
<script>
  (function() {
    const { ok, section } = window.__test;
    section('Schedule.slotIdAt');

    // Midnight EST is 05:00 UTC (EST is UTC-5, no DST per spec)
    ok(Schedule.slotIdAt(new Date('2026-05-06T05:00:00Z')) === '2026-05-06-000',
       'slot 0 = midnight EST');

    ok(Schedule.slotIdAt(new Date('2026-05-06T05:08:00Z')) === '2026-05-06-001',
       'slot 1 = 8 minutes past midnight');

    ok(Schedule.slotIdAt(new Date('2026-05-06T10:36:00Z')) === '2026-05-06-042',
       'slot 42 = 5h36m past midnight EST');

    // Last slot of the day starts at 23:52 EST = 04:52 next-day UTC
    ok(Schedule.slotIdAt(new Date('2026-05-07T04:52:00Z')) === '2026-05-06-179',
       'slot 179 is the last of the previous EST day');

    ok(Schedule.slotIdAt(new Date('2026-05-07T05:00:00Z')) === '2026-05-07-000',
       'midnight rolls over to next day slot 0');

    // Just before midnight EST is still yesterday
    ok(Schedule.slotIdAt(new Date('2026-05-07T04:59:59Z')) === '2026-05-06-179',
       'one second before midnight EST is still yesterday');
  })();
</script>
```

- [ ] **Step 2: Reload tests, verify failure**

Expected: 6 red ✗ lines under "Schedule.slotIdAt". Console: `Schedule is not defined`.

- [ ] **Step 3: Create `public/js/schedule.js`**

```js
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
  const SLOT_MS = 8 * 60 * 1000;
  const SLOTS_PER_DAY = 180;

  /**
   * Convert a UTC Date to {y, m, d, slot} aligned to EST midnight.
   * @param {Date} d
   * @returns {{date: string, slot: number}}
   */
  function _slotParts(d) {
    // Shift so that midnight EST becomes the day boundary in our derivation
    const shifted = new Date(d.getTime() + EST_OFFSET_HOURS * 3600 * 1000);
    const y = shifted.getUTCFullYear();
    const m = shifted.getUTCMonth() + 1;
    const day = shifted.getUTCDate();

    // Milliseconds since the start of `shifted`'s day
    const startOfDay = Date.UTC(y, m - 1, day);
    const msSinceMidnight = shifted.getTime() - startOfDay;
    const slot = Math.floor(msSinceMidnight / SLOT_MS);

    const yyyy = String(y).padStart(4, '0');
    const mm = String(m).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    return { date: `${yyyy}-${mm}-${dd}`, slot };
  }

  /**
   * Derive the slot ID for a given UTC Date.
   * @param {Date} d
   * @returns {string} e.g. "2026-05-06-042"
   */
  function slotIdAt(d) {
    const { date, slot } = _slotParts(d);
    return `${date}-${String(slot).padStart(3, '0')}`;
  }

  return { slotIdAt, EST_OFFSET_HOURS, SLOT_MS, SLOTS_PER_DAY };
})();

if (typeof window !== 'undefined') {
  /** @type {any} */ (window).Schedule = Schedule;
}
```

- [ ] **Step 4: Reload tests, verify pass**

Expected: all 6 Schedule.slotIdAt tests now green.

- [ ] **Step 5: Type-check**

Run: `npx -p typescript@latest tsc --noEmit -p tsconfig.json`
Expected: exit code 0.

- [ ] **Step 6: Commit**

```bash
git add public/js/schedule.js public/tests.html
git commit -m "feat(schedule): add slotIdAt — deterministic slot derivation"
```

---

### Task 2.2: Schedule.startsAtUtc and nextSlotIn

**Files:**
- Modify: `public/js/schedule.js`
- Modify: `public/tests.html`

- [ ] **Step 1: Append failing tests to `public/tests.html`**

Inside the same Schedule IIFE in tests.html (after the existing `slotIdAt` tests, before `})();`):

```js
    section('Schedule.startsAtUtc');

    ok(Schedule.startsAtUtc('2026-05-06-000').toISOString() === '2026-05-06T05:00:00.000Z',
       'slot 0 starts at midnight EST = 05:00 UTC');

    ok(Schedule.startsAtUtc('2026-05-06-042').toISOString() === '2026-05-06T10:36:00.000Z',
       'slot 42 starts 5h36m later');

    ok(Schedule.startsAtUtc('2026-05-06-179').toISOString() === '2026-05-07T04:52:00.000Z',
       'slot 179 starts at 23:52 EST');

    section('Schedule.nextSlotIn');

    // 1 minute before slot 1: returns 60s remaining
    ok(Schedule.nextSlotIn(
         new Date('2026-05-06T05:07:00Z'),
         '2026-05-06-001'
       ) === 60_000,
       '60s before slot starts → 60000ms');

    // Exactly at slot start: returns 0
    ok(Schedule.nextSlotIn(
         new Date('2026-05-06T05:08:00Z'),
         '2026-05-06-001'
       ) === 0,
       'at slot start → 0ms');

    // After slot start: returns negative
    ok(Schedule.nextSlotIn(
         new Date('2026-05-06T05:09:00Z'),
         '2026-05-06-001'
       ) === -60_000,
       '60s after slot start → -60000ms');
```

- [ ] **Step 2: Reload, verify failure**

Expected: 6 new red ✗ for "startsAtUtc is not a function" / "nextSlotIn is not a function".

- [ ] **Step 3: Add to `public/js/schedule.js`**

Inside the IIFE in `public/js/schedule.js`, before the `return { ... };` line, add:

```js
  /**
   * Compute the UTC Date when a given slot begins.
   * @param {string} slotId - e.g. "2026-05-06-042"
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
    return new Date(startOfDayUtc + slot * SLOT_MS);
  }

  /**
   * Milliseconds until the named slot starts, relative to `now`.
   * Negative means the slot started already.
   * @param {Date} now
   * @param {string} slotId
   * @returns {number} ms (signed)
   */
  function nextSlotIn(now, slotId) {
    return startsAtUtc(slotId).getTime() - now.getTime();
  }
```

Update the return statement:

```js
  return { slotIdAt, startsAtUtc, nextSlotIn, EST_OFFSET_HOURS, SLOT_MS, SLOTS_PER_DAY };
```

- [ ] **Step 4: Reload, verify pass**

All 12 Schedule tests should now be green.

- [ ] **Step 5: Type-check + commit**

```bash
npx -p typescript@latest tsc --noEmit -p tsconfig.json
git add public/js/schedule.js public/tests.html
git commit -m "feat(schedule): add startsAtUtc and nextSlotIn"
```

---

### Task 2.3: Schedule.canStillBet and Schedule.localESTDate

**Files:**
- Modify: `public/js/schedule.js`
- Modify: `public/tests.html`

- [ ] **Step 1: Append failing tests**

Inside the Schedule IIFE in tests.html, before `})();`:

```js
    section('Schedule.canStillBet');

    // 1 second before slot starts → still can bet (slot active)
    ok(Schedule.canStillBet(new Date('2026-05-06T10:35:59Z'), '2026-05-06-042') === true,
       'before slot start → can still bet');

    // Exactly at slot start → CANNOT bet (fight starts)
    ok(Schedule.canStillBet(new Date('2026-05-06T10:36:00Z'), '2026-05-06-042') === false,
       'at slot start → bets closed');

    // 1 second after slot start → bets closed
    ok(Schedule.canStillBet(new Date('2026-05-06T10:36:01Z'), '2026-05-06-042') === false,
       'after slot start → bets closed');

    section('Schedule.localESTDate');

    ok(Schedule.localESTDate(new Date('2026-05-06T05:00:00Z')) === '2026-05-06',
       'midnight EST is 2026-05-06');

    ok(Schedule.localESTDate(new Date('2026-05-07T04:59:00Z')) === '2026-05-06',
       'one minute before EST midnight is still 2026-05-06');

    ok(Schedule.localESTDate(new Date('2026-05-07T05:00:00Z')) === '2026-05-07',
       'midnight EST rolls over to 2026-05-07');
```

- [ ] **Step 2: Reload, verify failure (6 red)**

- [ ] **Step 3: Add to `public/js/schedule.js`**

Inside the IIFE, before the `return`:

```js
  /**
   * Whether a player can still place bets on the named slot.
   * Bets close exactly at slot start.
   * @param {Date} now
   * @param {string} slotId
   * @returns {boolean}
   */
  function canStillBet(now, slotId) {
    return now.getTime() < startsAtUtc(slotId).getTime();
  }

  /**
   * Return the EST-local date string for a UTC Date.
   * Used for tip-day rollover detection.
   * @param {Date} d
   * @returns {string} e.g. "2026-05-06"
   */
  function localESTDate(d) {
    return _slotParts(d).date;
  }
```

Update return:

```js
  return { slotIdAt, startsAtUtc, nextSlotIn, canStillBet, localESTDate,
           EST_OFFSET_HOURS, SLOT_MS, SLOTS_PER_DAY };
```

- [ ] **Step 4: Reload, all 18 Schedule tests pass**

- [ ] **Step 5: Type-check + commit**

```bash
npx -p typescript@latest tsc --noEmit -p tsconfig.json
git add public/js/schedule.js public/tests.html
git commit -m "feat(schedule): add canStillBet and localESTDate"
```

---

## Phase 3 — State module (localStorage layer)

The `State` namespace owns the single localStorage key (`gorgon_clock_state`), schema versioning + migration, user_id generation, and event dispatch on changes. Designed for testability: writes go through `_save()` which can be observed.

### Task 3.1: State load/save with schema versioning

**Files:**
- Create: `public/js/state.js`
- Modify: `public/tests.html`

- [ ] **Step 1: Append failing tests**

Append a new `<script>` block in `public/tests.html` after the existing schedule script, before the final summary script:

```html
<script src="js/state.js"></script>
<script>
  (function() {
    const { ok, section } = window.__test;
    section('State.load / State.save');

    localStorage.removeItem('gorgon_clock_state');

    const fresh = State.load();
    ok(fresh._v === 1, 'fresh load has _v = 1');
    ok(fresh.tips_day !== undefined, 'fresh load has tips_day');
    ok(fresh.bankroll === 0, 'fresh bankroll is 0');
    ok(fresh.kelly_fraction === 'half', 'default kelly_fraction is half');
    ok(typeof fresh.user_id === 'string' && fresh.user_id.startsWith('u_'),
       'fresh load generates user_id starting with u_');
    ok(Array.isArray(fresh.history), 'history is an array');
    ok(typeof fresh.voted_slots === 'object', 'voted_slots is object');
    ok(typeof fresh.voted_tips === 'object', 'voted_tips is object');

    // Save and reload should round-trip
    fresh.bankroll = 12345;
    State.save(fresh);
    const reloaded = State.load();
    ok(reloaded.bankroll === 12345, 'save and reload round-trips');
    ok(reloaded.user_id === fresh.user_id, 'user_id stable across saves');

    // Stale schema (different _v) → resets
    localStorage.setItem('gorgon_clock_state', JSON.stringify({ _v: 99, bankroll: 999 }));
    const reset = State.load();
    ok(reset._v === 1, 'stale schema version triggers reset');
    ok(reset.bankroll === 0, 'reset zeroes the bankroll');

    localStorage.removeItem('gorgon_clock_state');
  })();
</script>
```

- [ ] **Step 2: Open tests.html, verify failure**

Expected: red ✗ for `State is not defined`.

- [ ] **Step 3: Create `public/js/state.js`**

```js
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
    // 12 random hex chars, prefixed with u_
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

  /**
   * @returns {GorgonState}
   */
  function load() {
    let raw;
    try {
      raw = localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      // localStorage disabled (private mode etc.) — return ephemeral fresh state
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
      // Stale or unrecognized schema — reset (no migrations defined yet)
      return _fresh();
    }

    // Defensive defaults for any missing field
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
      // Quota exceeded or storage disabled — best-effort
    }
  }

  return { load, save, SCHEMA_VERSION, HISTORY_CAP };
})();

if (typeof window !== 'undefined') {
  /** @type {any} */ (window).State = State;
}
```

- [ ] **Step 4: Reload, all 11 State tests pass**

- [ ] **Step 5: Type-check + commit**

```bash
npx -p typescript@latest tsc --noEmit -p tsconfig.json
git add public/js/state.js public/tests.html
git commit -m "feat(state): localStorage load/save with schema versioning"
```

---

### Task 3.2: State.checkDayRollover — wipe yesterday's tip votes

**Files:**
- Modify: `public/js/state.js`
- Modify: `public/tests.html`

- [ ] **Step 1: Append failing tests**

Inside the State IIFE in tests.html (before `})();`):

```js
    section('State.checkDayRollover');

    localStorage.removeItem('gorgon_clock_state');
    const s1 = State.load();
    s1.tips_day = '2026-05-06';
    s1.voted_tips = { 'tip_a': 'upvoted', 'tip_b': 'removed' };
    State.save(s1);

    // Day hasn't rolled over yet
    ok(State.checkDayRollover(s1, new Date('2026-05-06T10:00:00Z')) === false,
       'same day → no rollover');

    // Day rolls over (next-day midnight EST passed)
    const rolled = State.checkDayRollover(s1, new Date('2026-05-07T05:00:00Z'));
    ok(rolled === true, 'midnight EST tick triggers rollover');
    ok(s1.tips_day === '2026-05-07', 'tips_day updated to new day');
    ok(Object.keys(s1.voted_tips).length === 0, 'voted_tips wiped');

    localStorage.removeItem('gorgon_clock_state');
```

- [ ] **Step 2: Reload, verify failure**

Expected: red ✗ for `State.checkDayRollover is not a function`.

- [ ] **Step 3: Add to `public/js/state.js`**

Inside the IIFE, before the return statement:

```js
  /**
   * If the EST date has changed since `state.tips_day`, mutate `state` to
   * reflect the new day (wipe voted_tips, update tips_day) and return true.
   * @param {GorgonState} state
   * @param {Date} now
   * @returns {boolean} whether a rollover happened
   */
  function checkDayRollover(state, now) {
    const today = Schedule.localESTDate(now);
    if (state.tips_day === today) return false;
    state.tips_day = today;
    state.voted_tips = {};
    return true;
  }
```

Update return:

```js
  return { load, save, checkDayRollover, SCHEMA_VERSION, HISTORY_CAP };
```

- [ ] **Step 4: Reload, 4 new tests pass**

- [ ] **Step 5: Type-check + commit**

```bash
npx -p typescript@latest tsc --noEmit -p tsconfig.json
git add public/js/state.js public/tests.html
git commit -m "feat(state): add checkDayRollover for tips wipe at midnight EST"
```

---

## Phase 4 — Cloudflare Worker (server)

The Worker is a single TypeScript project at `worker/`. It exposes 6 endpoints via a tiny router, validates everything, rate-limits writes, and reads/writes a single KV namespace `STATE`. Tests use Vitest with `@cloudflare/vitest-pool-workers`.

### Task 4.1: Initialize the Worker project

**Files:**
- Create: `worker/package.json`
- Create: `worker/wrangler.toml`
- Create: `worker/tsconfig.json`
- Create: `worker/.gitignore`
- Create: `worker/src/index.ts` (skeleton)

- [ ] **Step 1: Make the worker directory and init**

```bash
mkdir -p worker/src
cd worker
```

- [ ] **Step 2: Create `worker/package.json`**

```json
{
  "name": "gorgon-arena-worker",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "@cloudflare/vitest-pool-workers": "^0.5.0",
    "@cloudflare/workers-types": "^4.20240909.0",
    "typescript": "^5.5.0",
    "vitest": "^2.0.0",
    "wrangler": "^3.78.0"
  }
}
```

- [ ] **Step 3: Create `worker/wrangler.toml`**

```toml
name = "gorgon-arena"
main = "src/index.ts"
compatibility_date = "2026-05-01"

[[kv_namespaces]]
binding = "STATE"
id = "PLACEHOLDER_REPLACE_WITH_REAL_KV_ID"
preview_id = "PLACEHOLDER_REPLACE_WITH_REAL_PREVIEW_ID"

[vars]
ALLOWED_ORIGINS = "http://localhost:8000,https://spearw.github.io"
KNOWN_FIGHTERS  = "Corrrak,Dura,Gloz,Leo,Otis,Ushug,Vizlark"
KNOWN_TIP_NPCS  = "Mandibles,Qatik,Irkima,Eveline_Rastin,Arianna_Fangblade"

[env.test.vars]
ALLOWED_ORIGINS = "http://localhost"
KNOWN_FIGHTERS  = "Corrrak,Dura,Gloz,Leo,Otis,Ushug,Vizlark"
KNOWN_TIP_NPCS  = "Mandibles,Qatik,Irkima,Eveline_Rastin,Arianna_Fangblade"
```

- [ ] **Step 4: Create `worker/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "es2022",
    "module": "es2022",
    "moduleResolution": "bundler",
    "lib": ["es2022"],
    "types": ["@cloudflare/workers-types"],
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "esModuleInterop": true
  },
  "include": ["src/**/*.ts"]
}
```

- [ ] **Step 5: Create `worker/.gitignore`**

```
node_modules/
.wrangler/
dist/
.dev.vars
```

- [ ] **Step 6: Create skeleton `worker/src/index.ts`**

```ts
export interface Env {
  STATE: KVNamespace;
  ALLOWED_ORIGINS: string;
  KNOWN_FIGHTERS: string;
  KNOWN_TIP_NPCS: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/v1/health') {
      return new Response(JSON.stringify({ ok: true, ts: new Date().toISOString() }), {
        headers: { 'content-type': 'application/json' }
      });
    }
    return new Response('Not Found', { status: 404 });
  }
};
```

- [ ] **Step 7: Install dependencies**

Run: `cd worker && npm install`
Expected: deps install with no high-severity warnings. May see warnings about peer deps; ignore.

- [ ] **Step 8: Type-check the Worker**

Run: `cd worker && npx tsc --noEmit`
Expected: exit code 0.

- [ ] **Step 9: Commit**

```bash
git add worker/ .gitignore
git commit -m "feat(worker): initialize Cloudflare Worker project skeleton"
```

---

### Task 4.2: Validation utilities

**Files:**
- Create: `worker/src/validation.ts`
- Create: `worker/src/validation.test.ts`

- [ ] **Step 1: Create failing tests `worker/src/validation.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import {
  isValidUserId,
  isValidSlotId,
  isValidFighterId,
  isValidTipNpcId,
  isValidModifier,
  isValidTipType,
  isValidFavor
} from './validation';

const FIGHTERS = ['Corrrak','Dura','Gloz','Leo','Otis','Ushug','Vizlark'];
const NPCS = ['Mandibles','Qatik','Irkima','Eveline_Rastin','Arianna_Fangblade'];

describe('isValidUserId', () => {
  it('accepts u_ + 12 hex', () => {
    expect(isValidUserId('u_abc123def456')).toBe(true);
  });
  it('rejects missing prefix', () => {
    expect(isValidUserId('abc123def456')).toBe(false);
  });
  it('rejects non-string', () => {
    expect(isValidUserId(42 as any)).toBe(false);
    expect(isValidUserId(null as any)).toBe(false);
  });
  it('rejects too short / too long', () => {
    expect(isValidUserId('u_abc')).toBe(false);
    expect(isValidUserId('u_' + 'a'.repeat(20))).toBe(false);
  });
});

describe('isValidSlotId', () => {
  it('accepts well-formed slot id', () => {
    expect(isValidSlotId('2026-05-06-042')).toBe(true);
    expect(isValidSlotId('2026-05-06-000')).toBe(true);
    expect(isValidSlotId('2026-05-06-179')).toBe(true);
  });
  it('rejects out-of-range slot', () => {
    expect(isValidSlotId('2026-05-06-180')).toBe(false);
  });
  it('rejects malformed', () => {
    expect(isValidSlotId('foo')).toBe(false);
    expect(isValidSlotId('2026-5-6-42')).toBe(false);
  });
});

describe('isValidFighterId', () => {
  it('accepts known fighters', () => {
    expect(isValidFighterId('Otis', FIGHTERS)).toBe(true);
  });
  it('rejects unknown', () => {
    expect(isValidFighterId('Bogus', FIGHTERS)).toBe(false);
  });
});

describe('isValidTipNpcId', () => {
  it('accepts known NPCs', () => {
    expect(isValidTipNpcId('Mandibles', NPCS)).toBe(true);
  });
  it('rejects unknown', () => {
    expect(isValidTipNpcId('Bogus', NPCS)).toBe(false);
  });
});

describe('isValidModifier', () => {
  it('accepts integer in [-50, 50]', () => {
    expect(isValidModifier(0)).toBe(true);
    expect(isValidModifier(50)).toBe(true);
    expect(isValidModifier(-50)).toBe(true);
    expect(isValidModifier(10)).toBe(true);
  });
  it('rejects out of range', () => {
    expect(isValidModifier(51)).toBe(false);
    expect(isValidModifier(-51)).toBe(false);
  });
  it('rejects non-integer', () => {
    expect(isValidModifier(0.5)).toBe(false);
    expect(isValidModifier(NaN)).toBe(false);
  });
});

describe('isValidTipType', () => {
  it('accepts matchup and fighter', () => {
    expect(isValidTipType('matchup')).toBe(true);
    expect(isValidTipType('fighter')).toBe(true);
  });
  it('rejects others', () => {
    expect(isValidTipType('foo')).toBe(false);
  });
});

describe('isValidFavor', () => {
  it('accepts known favor levels', () => {
    expect(isValidFavor('Friends')).toBe(true);
    expect(isValidFavor('Comfortable')).toBe(true);
    expect(isValidFavor('SoulMates')).toBe(true);
  });
  it('rejects unknown', () => {
    expect(isValidFavor('Bogus')).toBe(false);
  });
});
```

- [ ] **Step 2: Create vitest config in `worker/vitest.config.ts`**

```ts
import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config';

export default defineWorkersConfig({
  test: {
    poolOptions: {
      workers: {
        wrangler: { configPath: './wrangler.toml', environment: 'test' }
      }
    }
  }
});
```

- [ ] **Step 3: Run tests, verify failures**

Run: `cd worker && npm test`
Expected: all 17 tests fail with `Cannot find module './validation'`.

- [ ] **Step 4: Create `worker/src/validation.ts`**

```ts
const FAVOR_LEVELS = [
  'Despised', 'Disliked', 'Neutral', 'Comfortable',
  'Friends', 'CloseFriends', 'BestFriends', 'LikeFamily', 'SoulMates'
] as const;

const USER_ID_RE = /^u_[a-zA-Z0-9]{4,16}$/;
const SLOT_ID_RE = /^(\d{4})-(\d{2})-(\d{2})-(\d{1,3})$/;

export function isValidUserId(v: unknown): v is string {
  return typeof v === 'string' && USER_ID_RE.test(v);
}

export function isValidSlotId(v: unknown): v is string {
  if (typeof v !== 'string') return false;
  const m = SLOT_ID_RE.exec(v);
  if (!m) return false;
  const slot = parseInt(m[4], 10);
  return slot >= 0 && slot < 180;
}

export function isValidFighterId(v: unknown, knownFighters: string[]): v is string {
  return typeof v === 'string' && knownFighters.includes(v);
}

export function isValidTipNpcId(v: unknown, knownNpcs: string[]): v is string {
  return typeof v === 'string' && knownNpcs.includes(v);
}

export function isValidModifier(v: unknown): v is number {
  return typeof v === 'number' && Number.isInteger(v) && v >= -50 && v <= 50;
}

export function isValidTipType(v: unknown): v is 'matchup' | 'fighter' {
  return v === 'matchup' || v === 'fighter';
}

export function isValidFavor(v: unknown): v is typeof FAVOR_LEVELS[number] {
  return typeof v === 'string' && (FAVOR_LEVELS as readonly string[]).includes(v);
}

export function parseList(s: string): string[] {
  return s.split(',').map(x => x.trim()).filter(Boolean);
}
```

- [ ] **Step 5: Run tests, verify pass**

Run: `cd worker && npm test`
Expected: all 17 tests pass.

- [ ] **Step 6: Type-check + commit**

```bash
cd worker && npx tsc --noEmit
cd ..
git add worker/src/validation.ts worker/src/validation.test.ts worker/vitest.config.ts
git commit -m "feat(worker): add input validation utilities with tests"
```

---

### Task 4.3: Worker schedule helpers

**Files:**
- Create: `worker/src/schedule.ts`
- Create: `worker/src/schedule.test.ts`

- [ ] **Step 1: Create failing tests `worker/src/schedule.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { isCurrentOrUpcomingSlot, slotIdAt } from './schedule';

describe('slotIdAt (server)', () => {
  it('matches browser logic for known anchor', () => {
    expect(slotIdAt(new Date('2026-05-06T05:00:00Z'))).toBe('2026-05-06-000');
    expect(slotIdAt(new Date('2026-05-06T10:36:00Z'))).toBe('2026-05-06-042');
    expect(slotIdAt(new Date('2026-05-07T05:00:00Z'))).toBe('2026-05-07-000');
  });
});

describe('isCurrentOrUpcomingSlot', () => {
  it('rejects far-past slots', () => {
    const now = new Date('2026-05-06T10:00:00Z');
    expect(isCurrentOrUpcomingSlot('2026-05-01-042', now)).toBe(false);
  });

  it('accepts current slot', () => {
    const now = new Date('2026-05-06T10:36:30Z');
    expect(isCurrentOrUpcomingSlot('2026-05-06-042', now)).toBe(true);
  });

  it('accepts upcoming slot within 24h', () => {
    const now = new Date('2026-05-06T10:00:00Z');
    expect(isCurrentOrUpcomingSlot('2026-05-06-100', now)).toBe(true);
  });

  it('rejects slot more than 24h in future', () => {
    const now = new Date('2026-05-06T05:00:00Z');
    expect(isCurrentOrUpcomingSlot('2026-05-08-100', now)).toBe(false);
  });
});
```

- [ ] **Step 2: Run, verify failure**

Run: `cd worker && npm test`
Expected: 7 failures, "Cannot find module './schedule'".

- [ ] **Step 3: Create `worker/src/schedule.ts`**

```ts
const EST_OFFSET_HOURS = -5;
const SLOT_MS = 8 * 60 * 1000;
const SLOTS_PER_DAY = 180;

export function slotIdAt(d: Date): string {
  const shifted = new Date(d.getTime() + EST_OFFSET_HOURS * 3600 * 1000);
  const y = shifted.getUTCFullYear();
  const m = shifted.getUTCMonth() + 1;
  const day = shifted.getUTCDate();
  const startOfDay = Date.UTC(y, m - 1, day);
  const slot = Math.floor((shifted.getTime() - startOfDay) / SLOT_MS);
  return `${y.toString().padStart(4,'0')}-${m.toString().padStart(2,'0')}-${day.toString().padStart(2,'0')}-${slot.toString().padStart(3,'0')}`;
}

export function startsAtUtc(slotId: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})-(\d{1,3})$/.exec(slotId);
  if (!m) throw new Error('Invalid slot id: ' + slotId);
  const slot = parseInt(m[4], 10);
  if (slot < 0 || slot >= SLOTS_PER_DAY) throw new Error('Slot out of range');
  const startOfDay = Date.UTC(parseInt(m[1],10), parseInt(m[2],10)-1, parseInt(m[3],10))
                     - EST_OFFSET_HOURS * 3600 * 1000;
  return new Date(startOfDay + slot * SLOT_MS);
}

/**
 * Is `slotId` either the current slot or up to 24h in the future?
 * Used to reject writes to ancient or far-future slots.
 */
export function isCurrentOrUpcomingSlot(slotId: string, now: Date): boolean {
  let starts: Date;
  try {
    starts = startsAtUtc(slotId);
  } catch {
    return false;
  }
  const diffMs = starts.getTime() - now.getTime();
  // Current slot if it started in the last 8 minutes; upcoming if within 24h
  return diffMs > -SLOT_MS && diffMs <= 24 * 3600 * 1000;
}
```

- [ ] **Step 4: Tests pass + commit**

```bash
cd worker && npm test && cd ..
git add worker/src/schedule.ts worker/src/schedule.test.ts
git commit -m "feat(worker): add schedule helpers (slotIdAt, isCurrentOrUpcomingSlot)"
```

---

### Task 4.4: Rate limiting (per-IP write counter)

**Files:**
- Create: `worker/src/ratelimit.ts`
- Create: `worker/src/ratelimit.test.ts`

- [ ] **Step 1: Create failing test `worker/src/ratelimit.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { env } from 'cloudflare:test';
import { checkRateLimit } from './ratelimit';

describe('checkRateLimit', () => {
  it('allows up to 5 in 60 seconds', async () => {
    const ip = 'ip-test-allow-' + Math.random();
    for (let i = 0; i < 5; i++) {
      const r = await checkRateLimit(env.STATE, ip);
      expect(r.allowed).toBe(true);
    }
  });

  it('blocks the 6th within 60 seconds', async () => {
    const ip = 'ip-test-block-' + Math.random();
    for (let i = 0; i < 5; i++) await checkRateLimit(env.STATE, ip);
    const r = await checkRateLimit(env.STATE, ip);
    expect(r.allowed).toBe(false);
    expect(r.retryAfter).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run, verify failure**

Run: `cd worker && npm test`
Expected: 2 failures, "Cannot find module './ratelimit'".

- [ ] **Step 3: Create `worker/src/ratelimit.ts`**

```ts
const LIMIT = 5;
const WINDOW_SECONDS = 60;

async function hashIp(ip: string): Promise<string> {
  const encoded = new TextEncoder().encode(ip);
  const hash = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(hash))
    .slice(0, 8)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Increments per-IP counter; returns whether the request is allowed.
 * Free-tier KV: ~1 write per check, well under 1000/day for typical use.
 */
export async function checkRateLimit(
  kv: KVNamespace,
  ip: string
): Promise<{ allowed: boolean; retryAfter: number }> {
  const key = `rate:${await hashIp(ip)}`;
  const current = await kv.get(key);
  const count = current ? parseInt(current, 10) : 0;
  if (count >= LIMIT) {
    return { allowed: false, retryAfter: WINDOW_SECONDS };
  }
  await kv.put(key, String(count + 1), { expirationTtl: WINDOW_SECONDS });
  return { allowed: true, retryAfter: 0 };
}
```

- [ ] **Step 4: Tests pass + commit**

```bash
cd worker && npm test && cd ..
git add worker/src/ratelimit.ts worker/src/ratelimit.test.ts
git commit -m "feat(worker): add per-IP rate limiting via KV counter"
```

---

### Task 4.5: Matchup endpoint logic

**Files:**
- Create: `worker/src/matchup.ts`
- Create: `worker/src/matchup.test.ts`

- [ ] **Step 1: Create failing tests `worker/src/matchup.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { env } from 'cloudflare:test';
import { getSlot, createOrVote, removeVote } from './matchup';

const FIGHTERS = ['Corrrak','Dura','Gloz','Leo','Otis','Ushug','Vizlark'];

async function reset(slotId: string) {
  await env.STATE.delete(`slot:${slotId}`);
}

describe('matchup', () => {
  it('returns empty entries for new slot', async () => {
    const slot = '2026-05-06-100';
    await reset(slot);
    const result = await getSlot(env.STATE, slot);
    expect(result.entries).toEqual([]);
    expect(result.slot_id).toBe(slot);
  });

  it('creates entry on first submission', async () => {
    const slot = '2026-05-06-101';
    await reset(slot);
    const r = await createOrVote(env.STATE, slot, {
      user_id: 'u_aaa111aaa111',
      action: 'create',
      fighter_a: 'Otis', fighter_b: 'Leo'
    }, FIGHTERS);
    expect(r.entries.length).toBe(1);
    expect(r.entries[0].fighter_a).toBe('Otis');
    expect(r.entries[0].voter_ids).toEqual(['u_aaa111aaa111']);
  });

  it('vote action moves user from one entry to another', async () => {
    const slot = '2026-05-06-102';
    await reset(slot);
    const c1 = await createOrVote(env.STATE, slot, {
      user_id: 'u_aaa111aaa111', action: 'create',
      fighter_a: 'Otis', fighter_b: 'Leo'
    }, FIGHTERS);
    const c2 = await createOrVote(env.STATE, slot, {
      user_id: 'u_bbb222bbb222', action: 'create',
      fighter_a: 'Otis', fighter_b: 'Vizlark'
    }, FIGHTERS);
    // u_aaa votes for the second entry instead
    const v = await createOrVote(env.STATE, slot, {
      user_id: 'u_aaa111aaa111', action: 'vote',
      entry_id: c2.entries[1].id
    }, FIGHTERS);
    const otisLeo = v.entries.find(e => e.fighter_b === 'Leo')!;
    const otisVizlark = v.entries.find(e => e.fighter_b === 'Vizlark')!;
    expect(otisLeo.voter_ids).toEqual([]);
    expect(otisVizlark.voter_ids).toContain('u_aaa111aaa111');
    expect(otisVizlark.voter_ids).toContain('u_bbb222bbb222');
  });

  it('rejects A == B', async () => {
    const slot = '2026-05-06-103';
    await reset(slot);
    await expect(createOrVote(env.STATE, slot, {
      user_id: 'u_aaa111aaa111', action: 'create',
      fighter_a: 'Otis', fighter_b: 'Otis'
    }, FIGHTERS)).rejects.toThrow();
  });

  it('rejects unknown fighter', async () => {
    const slot = '2026-05-06-104';
    await reset(slot);
    await expect(createOrVote(env.STATE, slot, {
      user_id: 'u_aaa111aaa111', action: 'create',
      fighter_a: 'Bogus', fighter_b: 'Leo'
    }, FIGHTERS)).rejects.toThrow();
  });

  it('removeVote idempotent for unknown user', async () => {
    const slot = '2026-05-06-105';
    await reset(slot);
    const r = await removeVote(env.STATE, slot, 'u_neverbeforevoted');
    expect(r.entries).toEqual([]);
  });
});
```

- [ ] **Step 2: Run, verify failure**

Run: `cd worker && npm test`
Expected: 6 failures, "Cannot find module './matchup'".

- [ ] **Step 3: Create `worker/src/matchup.ts`**

```ts
import { isValidSlotId, isValidUserId, isValidFighterId } from './validation';
import { startsAtUtc } from './schedule';

export interface MatchupEntry {
  id: string;
  fighter_a: string;
  fighter_b: string;
  first_at: string;
  voter_ids: string[];
}

export interface SlotState {
  _v: number;
  slot_id: string;
  starts_at_utc: string;
  entries: MatchupEntry[];
}

export type CreateOrVoteBody =
  | { user_id: string; action: 'create'; fighter_a: string; fighter_b: string }
  | { user_id: string; action: 'vote'; entry_id: string };

const SCHEMA = 1;

function newEntryId(): string {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  return 'ent_' + Array.from(bytes).map(b => b.toString(16).padStart(2,'0')).join('');
}

function emptySlot(slotId: string): SlotState {
  return {
    _v: SCHEMA,
    slot_id: slotId,
    starts_at_utc: startsAtUtc(slotId).toISOString(),
    entries: []
  };
}

export async function getSlot(kv: KVNamespace, slotId: string): Promise<SlotState> {
  if (!isValidSlotId(slotId)) throw new Error('Invalid slot id');
  const raw = await kv.get(`slot:${slotId}`);
  if (!raw) return emptySlot(slotId);
  try {
    const parsed = JSON.parse(raw) as SlotState;
    if (parsed._v !== SCHEMA) return emptySlot(slotId);
    return parsed;
  } catch {
    return emptySlot(slotId);
  }
}

async function saveSlot(kv: KVNamespace, slot: SlotState): Promise<void> {
  await kv.put(`slot:${slot.slot_id}`, JSON.stringify(slot), { expirationTtl: 86400 });
}

function removeUserFromAllEntries(slot: SlotState, userId: string) {
  for (const entry of slot.entries) {
    entry.voter_ids = entry.voter_ids.filter(v => v !== userId);
  }
}

export async function createOrVote(
  kv: KVNamespace,
  slotId: string,
  body: CreateOrVoteBody,
  knownFighters: string[]
): Promise<SlotState> {
  if (!isValidSlotId(slotId)) throw new Error('Invalid slot id');
  if (!isValidUserId(body.user_id)) throw new Error('Invalid user id');

  const slot = await getSlot(kv, slotId);

  if (body.action === 'create') {
    if (!isValidFighterId(body.fighter_a, knownFighters)
        || !isValidFighterId(body.fighter_b, knownFighters)) {
      throw new Error('Invalid fighter id');
    }
    if (body.fighter_a === body.fighter_b) {
      throw new Error('fighter_a must differ from fighter_b');
    }
    removeUserFromAllEntries(slot, body.user_id);
    slot.entries.push({
      id: newEntryId(),
      fighter_a: body.fighter_a,
      fighter_b: body.fighter_b,
      first_at: new Date().toISOString(),
      voter_ids: [body.user_id]
    });
    await saveSlot(kv, slot);
    return slot;
  }

  // action === 'vote'
  const target = slot.entries.find(e => e.id === body.entry_id);
  if (!target) throw new Error('entry_id not found');
  removeUserFromAllEntries(slot, body.user_id);
  target.voter_ids.push(body.user_id);
  await saveSlot(kv, slot);
  return slot;
}

export async function removeVote(
  kv: KVNamespace,
  slotId: string,
  userId: string
): Promise<SlotState> {
  if (!isValidSlotId(slotId)) throw new Error('Invalid slot id');
  if (!isValidUserId(userId)) throw new Error('Invalid user id');
  const slot = await getSlot(kv, slotId);
  removeUserFromAllEntries(slot, userId);
  await saveSlot(kv, slot);
  return slot;
}
```

- [ ] **Step 4: Tests pass + commit**

```bash
cd worker && npm test && cd ..
git add worker/src/matchup.ts worker/src/matchup.test.ts
git commit -m "feat(worker): matchup endpoint logic with create/vote/remove"
```

---

### Task 4.6: Tip endpoint logic

**Files:**
- Create: `worker/src/tips.ts`
- Create: `worker/src/tips.test.ts`

- [ ] **Step 1: Create failing tests `worker/src/tips.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { env } from 'cloudflare:test';
import { getTips, submitTip, patchTip } from './tips';

const FIGHTERS = ['Corrrak','Dura','Gloz','Leo','Otis','Ushug','Vizlark'];
const NPCS = ['Mandibles','Qatik','Irkima','Eveline_Rastin','Arianna_Fangblade'];

async function reset(day: string) { await env.STATE.delete(`tips:${day}`); }

describe('tips', () => {
  it('returns empty list for new day', async () => {
    const day = '2026-06-01';
    await reset(day);
    const r = await getTips(env.STATE, day);
    expect(r.tips).toEqual([]);
  });

  it('submitTip creates and auto-upvotes for submitter', async () => {
    const day = '2026-06-02';
    await reset(day);
    const r = await submitTip(env.STATE, day, {
      user_id: 'u_aaa111aaa111',
      type: 'matchup',
      source_npc: 'Mandibles',
      fighter_a: 'Otis', fighter_b: 'Leo',
      favored: 'Otis', modifier_pct: 10
    }, FIGHTERS, NPCS);
    expect(r.tips.length).toBe(1);
    expect(r.tips[0].upvoters).toEqual(['u_aaa111aaa111']);
    expect(r.tips[0].removers).toEqual([]);
  });

  it('submitTip rejects fighter type with non-null fighter_b', async () => {
    const day = '2026-06-03';
    await reset(day);
    await expect(submitTip(env.STATE, day, {
      user_id: 'u_aaa111aaa111',
      type: 'fighter', source_npc: 'Mandibles',
      fighter_a: 'Otis', fighter_b: 'Leo' as any,
      favored: 'Otis', modifier_pct: 10
    }, FIGHTERS, NPCS)).rejects.toThrow();
  });

  it('patchTip upvote toggles user into upvoters', async () => {
    const day = '2026-06-04';
    await reset(day);
    const created = await submitTip(env.STATE, day, {
      user_id: 'u_aaa111aaa111', type: 'fighter', source_npc: 'Qatik',
      fighter_a: 'Otis', fighter_b: null, favored: 'Otis', modifier_pct: 5
    }, FIGHTERS, NPCS);
    const id = created.tips[0].id;
    const r = await patchTip(env.STATE, day, id, {
      user_id: 'u_bbb222bbb222', action: 'upvote'
    });
    const tip = r.tips.find(t => t.id === id)!;
    expect(tip.upvoters).toContain('u_bbb222bbb222');
    expect(tip.removers).not.toContain('u_bbb222bbb222');
  });

  it('patchTip remove moves user from upvoters to removers', async () => {
    const day = '2026-06-05';
    await reset(day);
    const created = await submitTip(env.STATE, day, {
      user_id: 'u_aaa111aaa111', type: 'fighter', source_npc: 'Qatik',
      fighter_a: 'Otis', fighter_b: null, favored: 'Otis', modifier_pct: 5
    }, FIGHTERS, NPCS);
    const id = created.tips[0].id;
    const r = await patchTip(env.STATE, day, id, {
      user_id: 'u_aaa111aaa111', action: 'remove'
    });
    const tip = r.tips.find(t => t.id === id)!;
    expect(tip.upvoters).not.toContain('u_aaa111aaa111');
    expect(tip.removers).toContain('u_aaa111aaa111');
  });

  it('patchTip reset removes user from both lists', async () => {
    const day = '2026-06-06';
    await reset(day);
    const created = await submitTip(env.STATE, day, {
      user_id: 'u_aaa111aaa111', type: 'fighter', source_npc: 'Qatik',
      fighter_a: 'Otis', fighter_b: null, favored: 'Otis', modifier_pct: 5
    }, FIGHTERS, NPCS);
    const id = created.tips[0].id;
    const r = await patchTip(env.STATE, day, id, {
      user_id: 'u_aaa111aaa111', action: 'reset'
    });
    const tip = r.tips.find(t => t.id === id)!;
    expect(tip.upvoters).not.toContain('u_aaa111aaa111');
    expect(tip.removers).not.toContain('u_aaa111aaa111');
  });
});
```

- [ ] **Step 2: Run, verify failure**

Expected: 6 failures.

- [ ] **Step 3: Create `worker/src/tips.ts`**

```ts
import {
  isValidUserId, isValidFighterId, isValidTipNpcId,
  isValidModifier, isValidTipType
} from './validation';

export interface Tip {
  id: string;
  type: 'matchup' | 'fighter';
  source_npc: string;
  fighter_a: string;
  fighter_b: string | null;
  favored: string;
  modifier_pct: number;
  submitted_by: string;
  submitted_at: string;
  upvoters: string[];
  removers: string[];
}

export interface TipsState {
  _v: number;
  day: string;
  tips: Tip[];
}

export interface SubmitTipBody {
  user_id: string;
  type: 'matchup' | 'fighter';
  source_npc: string;
  fighter_a: string;
  fighter_b: string | null;
  favored: string;
  modifier_pct: number;
}

export interface PatchTipBody {
  user_id: string;
  action: 'upvote' | 'remove' | 'reset';
}

const SCHEMA = 1;
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

function newTipId(): string {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  return 'tip_' + Array.from(bytes).map(b => b.toString(16).padStart(2,'0')).join('');
}

function emptyTips(day: string): TipsState {
  return { _v: SCHEMA, day, tips: [] };
}

export async function getTips(kv: KVNamespace, day: string): Promise<TipsState> {
  if (!DAY_RE.test(day)) throw new Error('Invalid day');
  const raw = await kv.get(`tips:${day}`);
  if (!raw) return emptyTips(day);
  try {
    const parsed = JSON.parse(raw) as TipsState;
    if (parsed._v !== SCHEMA) return emptyTips(day);
    return parsed;
  } catch {
    return emptyTips(day);
  }
}

async function saveTips(kv: KVNamespace, t: TipsState): Promise<void> {
  await kv.put(`tips:${t.day}`, JSON.stringify(t), { expirationTtl: 86400 * 2 });
}

export async function submitTip(
  kv: KVNamespace,
  day: string,
  body: SubmitTipBody,
  knownFighters: string[],
  knownNpcs: string[]
): Promise<TipsState> {
  if (!DAY_RE.test(day)) throw new Error('Invalid day');
  if (!isValidUserId(body.user_id)) throw new Error('Invalid user id');
  if (!isValidTipType(body.type)) throw new Error('Invalid tip type');
  if (!isValidTipNpcId(body.source_npc, knownNpcs)) throw new Error('Invalid source_npc');
  if (!isValidFighterId(body.fighter_a, knownFighters)) throw new Error('Invalid fighter_a');
  if (!isValidModifier(body.modifier_pct)) throw new Error('Invalid modifier');

  if (body.type === 'matchup') {
    if (!isValidFighterId(body.fighter_b, knownFighters))
      throw new Error('matchup tip requires fighter_b');
    if (body.fighter_a === body.fighter_b)
      throw new Error('matchup fighters must differ');
    if (body.favored !== body.fighter_a && body.favored !== body.fighter_b)
      throw new Error('favored must be one of the two fighters');
  } else {
    if (body.fighter_b !== null) throw new Error('fighter tip must have null fighter_b');
    if (body.favored !== body.fighter_a)
      throw new Error('fighter tip favored must equal fighter_a');
  }

  const state = await getTips(kv, day);
  state.tips.push({
    id: newTipId(),
    type: body.type,
    source_npc: body.source_npc,
    fighter_a: body.fighter_a,
    fighter_b: body.fighter_b,
    favored: body.favored,
    modifier_pct: body.modifier_pct,
    submitted_by: body.user_id,
    submitted_at: new Date().toISOString(),
    upvoters: [body.user_id],
    removers: []
  });
  await saveTips(kv, state);
  return state;
}

export async function patchTip(
  kv: KVNamespace,
  day: string,
  tipId: string,
  body: PatchTipBody
): Promise<TipsState> {
  if (!DAY_RE.test(day)) throw new Error('Invalid day');
  if (!isValidUserId(body.user_id)) throw new Error('Invalid user id');
  const state = await getTips(kv, day);
  const tip = state.tips.find(t => t.id === tipId);
  if (!tip) throw new Error('Tip not found');

  tip.upvoters = tip.upvoters.filter(u => u !== body.user_id);
  tip.removers = tip.removers.filter(u => u !== body.user_id);
  if (body.action === 'upvote') tip.upvoters.push(body.user_id);
  else if (body.action === 'remove') tip.removers.push(body.user_id);
  // 'reset' leaves both lists without the user

  await saveTips(kv, state);
  return state;
}
```

- [ ] **Step 4: Tests pass + commit**

```bash
cd worker && npm test && cd ..
git add worker/src/tips.ts worker/src/tips.test.ts
git commit -m "feat(worker): tip endpoint logic with submit/upvote/remove/reset"
```

---

### Task 4.7: Router (`index.ts`) — wire endpoints, CORS, edge cache

**Files:**
- Modify: `worker/src/index.ts` (replace skeleton)
- Create: `worker/src/index.test.ts`

- [ ] **Step 1: Create failing tests `worker/src/index.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { SELF } from 'cloudflare:test';

describe('Worker router', () => {
  it('GET /v1/health returns ok', async () => {
    const r = await SELF.fetch('http://example.com/v1/health');
    expect(r.status).toBe(200);
    const body = await r.json() as any;
    expect(body.ok).toBe(true);
  });

  it('returns 404 for unknown path', async () => {
    const r = await SELF.fetch('http://example.com/foo');
    expect(r.status).toBe(404);
  });

  it('GET /v1/state returns combined slot+tips', async () => {
    const r = await SELF.fetch('http://example.com/v1/state?slot=2026-05-06-100&day=2026-05-06');
    expect(r.status).toBe(200);
    const body = await r.json() as any;
    expect(body.slot).toBeDefined();
    expect(body.tips).toBeDefined();
    expect(body.server_time_utc).toBeDefined();
  });

  it('rejects POST /v1/matchup without user_id', async () => {
    const r = await SELF.fetch('http://example.com/v1/matchup?slot=2026-05-06-100', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'create', fighter_a: 'Otis', fighter_b: 'Leo' })
    });
    expect(r.status).toBe(400);
  });

  it('OPTIONS preflight returns CORS headers', async () => {
    const r = await SELF.fetch('http://example.com/v1/matchup', {
      method: 'OPTIONS',
      headers: { 'origin': 'http://localhost', 'access-control-request-method': 'POST' }
    });
    expect(r.status).toBe(204);
    expect(r.headers.get('access-control-allow-origin')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run, verify mostly-failure**

Expected: at least 4 failures (health passes from skeleton).

- [ ] **Step 3: Replace `worker/src/index.ts`**

```ts
import { getSlot, createOrVote, removeVote, type CreateOrVoteBody } from './matchup';
import { getTips, submitTip, patchTip, type SubmitTipBody, type PatchTipBody } from './tips';
import { isCurrentOrUpcomingSlot } from './schedule';
import { checkRateLimit } from './ratelimit';
import { parseList } from './validation';

export interface Env {
  STATE: KVNamespace;
  ALLOWED_ORIGINS: string;
  KNOWN_FIGHTERS: string;
  KNOWN_TIP_NPCS: string;
}

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

function corsHeaders(origin: string | null, allowed: string[]): Record<string,string> {
  const allow = origin && allowed.includes(origin) ? origin : '';
  return {
    'access-control-allow-origin': allow,
    'access-control-allow-methods': 'GET, POST, DELETE, PATCH, OPTIONS',
    'access-control-allow-headers': 'content-type',
    'vary': 'Origin'
  };
}

function json(data: unknown, status: number, extra: Record<string,string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json', ...extra }
  });
}

function err(message: string, status: number, extra: Record<string,string> = {}): Response {
  return json({ error: message }, status, extra);
}

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin');
    const allowed = parseList(env.ALLOWED_ORIGINS);
    const cors = corsHeaders(origin, allowed);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    try {
      // GET /v1/health
      if (request.method === 'GET' && url.pathname === '/v1/health') {
        return json({ ok: true, ts: new Date().toISOString() }, 200, cors);
      }

      // GET /v1/state?slot=...&day=...
      if (request.method === 'GET' && url.pathname === '/v1/state') {
        const slot = url.searchParams.get('slot') ?? '';
        const day = url.searchParams.get('day') ?? '';
        if (!DAY_RE.test(day)) return err('Invalid day', 400, cors);
        const [slotState, tipsState] = await Promise.all([
          getSlot(env.STATE, slot),
          getTips(env.STATE, day)
        ]);
        return json({
          slot: slotState,
          tips: tipsState,
          server_time_utc: new Date().toISOString()
        }, 200, { ...cors, 'cache-control': 'public, max-age=5' });
      }

      // Mutating endpoints below require rate limit
      const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
      const rl = await checkRateLimit(env.STATE, ip);
      if (!rl.allowed) {
        return err('Rate limited', 429, { ...cors, 'retry-after': String(rl.retryAfter) });
      }

      const fighters = parseList(env.KNOWN_FIGHTERS);
      const npcs = parseList(env.KNOWN_TIP_NPCS);

      // POST /v1/matchup?slot=...
      if (request.method === 'POST' && url.pathname === '/v1/matchup') {
        const slot = url.searchParams.get('slot') ?? '';
        const now = new Date();
        if (!isCurrentOrUpcomingSlot(slot, now))
          return err('Slot out of range', 400, cors);
        const body = await request.json() as CreateOrVoteBody;
        if (!body || !body.user_id) return err('Missing user_id', 400, cors);
        const state = await createOrVote(env.STATE, slot, body, fighters);
        return json(state, 200, cors);
      }

      // DELETE /v1/matchup?slot=...
      if (request.method === 'DELETE' && url.pathname === '/v1/matchup') {
        const slot = url.searchParams.get('slot') ?? '';
        const body = await request.json() as { user_id: string };
        if (!body || !body.user_id) return err('Missing user_id', 400, cors);
        const state = await removeVote(env.STATE, slot, body.user_id);
        return json(state, 200, cors);
      }

      // POST /v1/tips?day=...
      if (request.method === 'POST' && url.pathname === '/v1/tips') {
        const day = url.searchParams.get('day') ?? '';
        if (!DAY_RE.test(day)) return err('Invalid day', 400, cors);
        const body = await request.json() as SubmitTipBody;
        if (!body || !body.user_id) return err('Missing user_id', 400, cors);
        const state = await submitTip(env.STATE, day, body, fighters, npcs);
        return json(state, 200, cors);
      }

      // PATCH /v1/tips/<id>?day=...
      const m = /^\/v1\/tips\/([a-zA-Z0-9_]+)$/.exec(url.pathname);
      if (request.method === 'PATCH' && m) {
        const tipId = m[1];
        const day = url.searchParams.get('day') ?? '';
        if (!DAY_RE.test(day)) return err('Invalid day', 400, cors);
        const body = await request.json() as PatchTipBody;
        if (!body || !body.user_id) return err('Missing user_id', 400, cors);
        const state = await patchTip(env.STATE, day, tipId, body);
        return json(state, 200, cors);
      }

      return err('Not Found', 404, cors);
    } catch (e: any) {
      const msg = e?.message ?? 'Unknown error';
      return err(msg, 400, cors);
    }
  }
};
```

- [ ] **Step 4: Tests pass**

Run: `cd worker && npm test`
Expected: all tests pass (5 router + earlier tests still pass).

- [ ] **Step 5: Type-check + commit**

```bash
cd worker && npx tsc --noEmit && cd ..
git add worker/src/index.ts worker/src/index.test.ts
git commit -m "feat(worker): wire router with CORS, rate limiting, edge cache"
```

---

## Phase 5 — Api module (browser → Worker)

The `Api` namespace is a thin fetch wrapper. Tests use Vitest in a separate `public/js/api.test.mjs` runnable with `node` — keeps the browser test runner free of Worker-mocking complexity.

### Task 5.1: Api.config + Api.getState

**Files:**
- Create: `public/js/api.js`
- Modify: `public/tests.html`

- [ ] **Step 1: Create `public/js/api.js`**

```js
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
        : 'https://gorgon-arena.workers.dev'
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
```

- [ ] **Step 2: Add tests in `public/tests.html`**

Append a new script block before the summary script:

```html
<script src="js/api.js"></script>
<script>
  (function() {
    const { ok, section } = window.__test;
    section('Api smoke (offline → graceful failure)');

    // Override base URL to a guaranteed-unreachable host for these tests
    /** @type {any} */ (window).GORGON_API_BASE = 'http://127.0.0.1:1';

    Api.getState('2026-05-06-042', '2026-05-06').then(r => {
      ok(!r.ok, 'getState returns ok:false on network error');
      ok(r.status === 0, 'network error has status 0');
    });

    Api.postMatchup('2026-05-06-042', {
      user_id: 'u_test12345678', action: 'create',
      fighter_a: 'Otis', fighter_b: 'Leo'
    }).then(r => {
      ok(!r.ok, 'postMatchup returns ok:false on network error');
    });
  })();
</script>
```

(These run async; they'll log results after the synchronous tests have finished. The summary may run before these resolve — acceptable for this smoke test.)

- [ ] **Step 3: Reload tests, verify Api smoke checks pass**

Open `public/tests.html` — wait a moment for async results; expect green ✓ on the 3 Api smoke tests.

- [ ] **Step 4: Type-check + commit**

```bash
npx -p typescript@latest tsc --noEmit -p tsconfig.json
git add public/js/api.js public/tests.html
git commit -m "feat(api): browser-side Worker fetch wrapper with graceful failure"
```

---

## Phase 6 — UI components

Each UI component is a small JS file that owns rendering one block of the page. Tests are largely visual (covered by `MANUAL_TEST.md`); we don't unit-test DOM rendering in v1.

### Task 6.1: arena.html shell

**Files:**
- Create: `public/arena.html`

- [ ] **Step 1: Create `public/arena.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="referrer" content="no-referrer" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://fonts.gstatic.com; font-src https://fonts.gstatic.com; script-src 'self' 'unsafe-inline'; connect-src 'self' https://gorgon-arena.workers.dev http://localhost:8787; img-src 'self' data:; object-src 'none'; base-uri 'self';" />
  <title>Arena Copilot — Gorgon Clock</title>
  <meta name="description" content="Red Wing Casino arena betting copilot for Project Gorgon — aggregate Hot Tips, compute win probability, recommend Kelly-criterion bets." />
  <meta property="og:title" content="Gorgon Clock — Arena Copilot" />
  <meta property="og:description" content="Aggregate Hot Tips, compute win probability, place smarter bets at the Red Wing Casino." />
  <meta property="og:type" content="website" />
  <link rel="icon" type="image/svg+xml" href="icon.svg" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Spectral:ital,wght@0,400;0,600;1,400&family=Cinzel:wght@400;700&display=swap" rel="stylesheet" />
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --bg: #0a0806; --panel-bg: #100d08; --panel-bg-deep: #0c0a06;
      --maroon: #5c1a10; --maroon-mid: #7a2215; --maroon-bright: #9b2d1a;
      --amber: #c8780a; --amber-bright: #e08c14; --amber-dim: #7a4808;
      --body-text: #d8cfc0; --body-dim: #bead92; --body-faint: #3a3228;
      --green: #4a7a2a; --red: #c0392b;
    }
    html, body { height: 100%; background: var(--bg); color: var(--body-text); font-family: 'Spectral', Georgia, serif; }
    body { padding: 1rem 1.5rem 3rem; max-width: 980px; margin: 0 auto; }
    h1.title { font-family: 'Cinzel', serif; font-size: clamp(1.6rem, 4vw, 2.4rem); font-weight: 700; letter-spacing: 0.1em; color: var(--amber-bright); text-align: center; padding: 0.6rem 0; }
    .subtitle { text-align: center; font-size: 0.78rem; color: var(--amber-dim); letter-spacing: 0.12em; text-transform: uppercase; }
    .rule { border-top: 1px solid var(--maroon); margin: 0.8rem 0 1.2rem; }
    .countdown { text-align: center; padding: 1rem; border: 1px solid var(--maroon); background: var(--panel-bg-deep); margin-bottom: 1.2rem; }
    .countdown .label { font-size: 0.7rem; color: var(--amber-dim); letter-spacing: 0.12em; text-transform: uppercase; }
    .countdown .value { font-family: monospace; font-size: 2.4rem; color: var(--amber-bright); padding: 0.2rem 0; }
    .countdown .meta { font-size: 0.85rem; color: var(--body-dim); }
    .grid { display: grid; grid-template-columns: 1fr 1.3fr; gap: 1rem; }
    @media (max-width: 720px) { .grid { grid-template-columns: 1fr; } }
    .panel { border: 1px solid var(--body-faint); background: var(--panel-bg-deep); padding: 0.9rem; }
    .panel.right { border-color: var(--maroon); }
    .panel-title { font-family: 'Cinzel', serif; color: var(--amber); font-size: 0.92rem; letter-spacing: 0.08em; margin-bottom: 0.5rem; }
    .footer { text-align: center; color: var(--body-faint); font-size: 0.7rem; padding: 1.2rem 0 0.4rem; }
    .footer a { color: var(--amber-dim); }
    .banner { padding: 0.5rem; margin-bottom: 0.8rem; background: rgba(192,57,43,0.1); border: 1px solid var(--red); color: var(--body-dim); font-size: 0.85rem; display: none; }
    .banner.visible { display: block; }
  </style>
</head>
<body>
  <h1 class="title">ARENA COPILOT</h1>
  <div class="subtitle">Red Wing Casino · Betting Assistant</div>
  <div class="rule"></div>

  <div id="banner" class="banner" role="status" aria-live="polite"></div>

  <div class="countdown" id="countdown">
    <div class="label">Next Fight In</div>
    <div class="value" id="countdown-value">--:--</div>
    <div class="meta" id="countdown-meta">slot · starts at ·</div>
  </div>

  <div class="grid">
    <section class="panel" aria-labelledby="tips-title">
      <div id="tips-title" class="panel-title">Today's Hot Tips</div>
      <div id="tips-container"></div>
    </section>
    <section class="panel right" aria-labelledby="matchup-title">
      <div id="matchup-title" class="panel-title">Current Matchup</div>
      <div id="matchup-container"></div>
      <div id="kelly-container"></div>
    </section>
  </div>

  <section class="panel" style="margin-top:1rem;" aria-labelledby="history-title">
    <div id="history-title" class="panel-title">Recent History</div>
    <div id="history-container"></div>
  </section>

  <div class="footer">
    Fan Made Chronicle — not affiliated with Elder Game / Project Gorgon.
    <a href="privacy.html">Privacy</a> · <a href="index.html">← Home</a>
  </div>

  <script src="js/schedule.js"></script>
  <script src="js/state.js"></script>
  <script src="js/math.js"></script>
  <script src="js/api.js"></script>
  <script src="js/tip-form.js"></script>
  <script src="js/matchup-picker.js"></script>
  <script src="js/kelly-display.js"></script>
  <script src="js/history.js"></script>
  <script src="js/app.js"></script>
</body>
</html>
```

- [ ] **Step 2: Open `public/arena.html` in browser**

Expected: page loads with "ARENA COPILOT" title, countdown showing `--:--`, three empty panels, footer. Console errors are expected (the `js/tip-form.js` etc. don't exist yet — we create them in subsequent tasks).

- [ ] **Step 3: Commit**

```bash
git add public/arena.html
git commit -m "feat(ui): add arena.html shell with layout and CSP"
```

---

### Task 6.2: TipForm component

**Files:**
- Create: `public/js/tip-form.js`

- [ ] **Step 1: Create `public/js/tip-form.js`**

```js
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

    const $ = (sel) => /** @type {HTMLElement} */ (root.querySelector(`[data-tf="${sel}"]`));
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
```

- [ ] **Step 2: Type-check + commit**

```bash
npx -p typescript@latest tsc --noEmit -p tsconfig.json
git add public/js/tip-form.js
git commit -m "feat(ui): TipForm component with matchup/fighter modes"
```

---

### Task 6.3: MatchupPicker component (3 states)

**Files:**
- Create: `public/js/matchup-picker.js`

- [ ] **Step 1: Create `public/js/matchup-picker.js`**

```js
// @ts-check
'use strict';

const MatchupPicker = (() => {
  /** @type {string[]} */ let _fighters = [];
  /** @type {(action: 'create'|'vote', payload: any) => void} */ let _onAction = () => {};
  /** @type {(entryId: string) => void} */ let _onPicked = () => {};

  /**
   * @param {{fighters: string[], onAction: (a: 'create'|'vote', p: any) => void, onPicked: (id: string) => void}} cfg
   */
  function init(cfg) {
    _fighters = cfg.fighters;
    _onAction = cfg.onAction;
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
    const fighterOptions = _fighters.map(f => `<option value="${f}">${f}</option>`).join('');
    div.innerHTML = `
      <div style="text-align:center;padding:1rem 0;color:var(--amber-dim);font-style:italic;">
        No matchup entered yet. Be the first.
      </div>
      <div style="display:flex;gap:0.4rem;align-items:center;">
        <select data-mp="a" style="flex:1;background:var(--panel-bg);color:var(--body-dim);border:1px solid var(--body-faint);padding:0.2rem;">${fighterOptions}</select>
        <span style="color:var(--amber-dim);">vs</span>
        <select data-mp="b" style="flex:1;background:var(--panel-bg);color:var(--body-dim);border:1px solid var(--body-faint);padding:0.2rem;">${fighterOptions}</select>
      </div>
      <button data-mp="submit" style="margin-top:0.5rem;width:100%;background:var(--maroon);color:var(--amber-bright);border:1px solid var(--maroon-bright);padding:0.3rem;font-family:'Cinzel',serif;letter-spacing:0.06em;font-size:0.8rem;cursor:pointer;">Submit Matchup</button>
    `;
    div.querySelector('[data-mp="submit"]').addEventListener('click', () => {
      const a = /** @type {HTMLSelectElement} */ (div.querySelector('[data-mp="a"]')).value;
      const b = /** @type {HTMLSelectElement} */ (div.querySelector('[data-mp="b"]')).value;
      if (a === b) return;
      _onAction('create', { fighter_a: a, fighter_b: b });
    });
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
    if (confirmBtn) confirmBtn.addEventListener('click', () => _onAction('vote', { entry_id: entry.id }));
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
      row.addEventListener('click', () => _onAction('vote', { entry_id: entry.id }));
      div.appendChild(row);
    }
    return div;
  }

  return { init, render };
})();

if (typeof window !== 'undefined') {
  /** @type {any} */ (window).MatchupPicker = MatchupPicker;
}
```

- [ ] **Step 2: Type-check + commit**

```bash
npx -p typescript@latest tsc --noEmit -p tsconfig.json
git add public/js/matchup-picker.js
git commit -m "feat(ui): MatchupPicker with empty/confirmed/disputed states"
```

---

### Task 6.4: KellyDisplay component

**Files:**
- Create: `public/js/kelly-display.js`

- [ ] **Step 1: Create `public/js/kelly-display.js`**

```js
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
```

- [ ] **Step 2: Type-check + commit**

```bash
npx -p typescript@latest tsc --noEmit -p tsconfig.json
git add public/js/kelly-display.js
git commit -m "feat(ui): KellyDisplay with bankroll input and don't-bet warning"
```

---

### Task 6.5: History component

**Files:**
- Create: `public/js/history.js`

- [ ] **Step 1: Create `public/js/history.js`**

```js
// @ts-check
'use strict';

const History = (() => {
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
  /** @type {any} */ (window).History_ = History;
}
```

- [ ] **Step 2: Type-check + commit**

```bash
npx -p typescript@latest tsc --noEmit -p tsconfig.json
git add public/js/history.js
git commit -m "feat(ui): History strip with recent bets and lifetime ROI"
```

---

### Task 6.6: App orchestrator (the conductor)

**Files:**
- Create: `public/js/app.js`

- [ ] **Step 1: Create `public/js/app.js`**

```js
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
  const fighters = fightersJson.fighters.map((f) => f.id);
  const tipNpcs = npcsJson.tip_npcs.map((n) => n.id);

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
  const tipsContainer = document.getElementById('tips-container');
  const matchupContainer = document.getElementById('matchup-container');
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
    fighters,
    onAction: async (action, payload) => {
      const slotId = Schedule.slotIdAt(new Date());
      const body = action === 'create'
        ? { user_id: state.user_id, action, fighter_a: payload.fighter_a, fighter_b: payload.fighter_b }
        : { user_id: state.user_id, action, entry_id: payload.entry_id };
      const r = await Api.postMatchup(slotId, /** @type {any} */ (body));
      if (!r.ok) { showBanner("Couldn't reach shared state — local-only mode."); return; }
      hideBanner();
      _latest.slot = r.data;
      // Determine which entry the user is now voted for
      const slotKey = slotId;
      const myEntry = r.data.entries.find(e => e.voter_ids.includes(state.user_id));
      state.voted_slots[slotKey] = myEntry ? myEntry.id : '';
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

  /** @type {{slot: any, tips: any}} */
  let _latest = { slot: { entries: [] }, tips: { tips: [] } };

  function showBanner(msg) { banner.textContent = msg; banner.classList.add('visible'); }
  function hideBanner() { banner.classList.remove('visible'); }

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

  function _kellyFractionToNumber(f) {
    return f === 'full' ? 1.0 : f === 'quarter' ? 0.25 : 0.5;
  }

  function renderAll() {
    const now = new Date();
    const slotId = Schedule.slotIdAt(now);
    const msUntil = Schedule.nextSlotIn(now, slotId);
    const remaining = Math.max(0, msUntil);
    const m = Math.floor(remaining / 60000);
    const s = Math.floor((remaining % 60000) / 1000);
    cdValue.textContent = `${m}:${s.toString().padStart(2,'0')}`;
    const startsAt = Schedule.startsAtUtc(slotId);
    cdMeta.textContent = `slot #${slotId.slice(-3)} · starts ${startsAt.toUTCString().slice(17,22)} UTC · 8m window`;

    // Tips panel
    tipsContainer.innerHTML = '';
    const tips = (_latest.tips && _latest.tips.tips) ? _latest.tips.tips : [];
    const visibleTips = tips.filter(t => state.voted_tips[t.id] !== 'removed');
    for (const tip of visibleTips) {
      const card = document.createElement('div');
      const stance = state.voted_tips[tip.id];
      const upCount = tip.upvoters.length;
      const removeCount = tip.removers.length;
      const sign = tip.modifier_pct >= 0 ? '+' : '';
      card.style.cssText = `border-left:2px solid ${tip.modifier_pct>=0?'var(--green)':'var(--red)'};padding:0.4rem 0.6rem;margin-bottom:0.4rem;background:rgba(${tip.modifier_pct>=0?'74,122,42':'192,57,43'},0.05);font-size:0.82rem;`;
      const target = tip.type === 'matchup'
        ? `<strong>${tip.fighter_a}</strong> vs <strong>${tip.fighter_b}</strong> → ${tip.favored} <span style="color:${tip.modifier_pct>=0?'var(--green)':'var(--red)'};">${sign}${tip.modifier_pct}%</span>`
        : `<strong>${tip.favored}</strong> <span style="color:${tip.modifier_pct>=0?'var(--green)':'var(--red)'};">${sign}${tip.modifier_pct}%</span> all day`;
      card.innerHTML = `
        <div>${target}</div>
        <div style="font-size:0.7rem;color:var(--amber-dim);">from ${tip.source_npc.replace(/_/g,' ')} · ↑${upCount} ✕${removeCount}</div>
        <div style="margin-top:0.2rem;font-size:0.7rem;">
          <a href="#" data-act="upvote" data-id="${tip.id}" style="color:var(--green);" aria-label="Upvote tip">↑ upvote</a> ·
          <a href="#" data-act="remove" data-id="${tip.id}" style="color:var(--red);" aria-label="Remove tip from your feed">✕ remove</a>
          ${stance ? ` · <span style="color:var(--amber-dim);">(your stance: ${stance})</span>` : ''}
        </div>
      `;
      card.querySelectorAll('[data-act]').forEach(a => {
        a.addEventListener('click', async (e) => {
          e.preventDefault();
          const action = /** @type {'upvote'|'remove'} */ (a.getAttribute('data-act'));
          const tipId = a.getAttribute('data-id');
          state.voted_tips[tipId] = action === 'upvote' ? 'upvoted' : 'removed';
          State.save(state);
          const day = Schedule.localESTDate(new Date());
          const r = await Api.patchTip(day, tipId, { user_id: state.user_id, action });
          if (r.ok) _latest.tips = r.data;
          renderAll();
        });
      });
      tipsContainer.appendChild(card);
    }
    tipsContainer.appendChild(TipForm.render());

    // Matchup panel
    matchupContainer.innerHTML = '';
    const slot = _latest.slot;
    const pickedId = state.voted_slots[slotId] || null;
    matchupContainer.appendChild(MatchupPicker.render({ entries: slot.entries || [] }, pickedId));

    // Kelly panel
    kellyContainer.innerHTML = '';
    const pickedEntry = pickedId ? (slot.entries || []).find(e => e.id === pickedId) : null;
    if (pickedEntry) {
      // Math: filter tips by user's stance
      const activeTips = visibleTips;
      const p = Math_.aggregateProbability(activeTips, pickedEntry.fighter_a, pickedEntry.fighter_b);
      const fracN = _kellyFractionToNumber(state.kelly_fraction);
      const bet = Math_.kellyBet(p, state.bankroll, fracN);
      kellyContainer.appendChild(KellyDisplay.render({
        fighter_a: pickedEntry.fighter_a,
        fighter_b: pickedEntry.fighter_b,
        p, bankroll: state.bankroll, fraction: state.kelly_fraction, recommendedBet: bet
      }));
    } else {
      kellyContainer.appendChild(KellyDisplay.render(null));
    }

    // History
    historyContainer.innerHTML = '';
    historyContainer.appendChild(History_.render(state.history));
  }

  // Tick: update countdown every second; poll every 30s (10s in last minute)
  let lastPollAt = 0;
  setInterval(() => {
    const now = new Date();
    const slotId = Schedule.slotIdAt(now);
    const msUntil = Schedule.nextSlotIn(now, slotId);
    const interval = (msUntil > 0 && msUntil < 60_000) ? 10_000 : 30_000;
    if (now.getTime() - lastPollAt > interval) {
      lastPollAt = now.getTime();
      poll();
    } else {
      renderAll();
    }
  }, 1000);

  // Initial poll
  await poll();
})();
```

- [ ] **Step 2: Open `public/arena.html` in browser**

Expected: full UI renders. With Worker offline, banner shows. Tip form, matchup picker, history all populate from localStorage. Submitting a tip without Worker shows the banner but doesn't crash.

- [ ] **Step 3: Type-check + commit**

```bash
npx -p typescript@latest tsc --noEmit -p tsconfig.json
git add public/js/app.js
git commit -m "feat(ui): App orchestrator wires components, polls Worker, renders UI"
```

---

## Phase 7 — Clock home integration

The existing `public/index.html` is preserved exactly. We add (1) an Arena panel block under the clock pillar, (2) a new entry to the EVENTS array, and (3) a small polling script that updates the panel.

### Task 7.1: Extend CSP in index.html to allow Worker domain

**Files:**
- Modify: `public/index.html`

- [ ] **Step 1: Read existing CSP**

Run: `grep -n 'Content-Security-Policy' public/index.html | head -5`
Find the current `<meta http-equiv="Content-Security-Policy"` element.

- [ ] **Step 2: Update CSP to add Worker connect-src**

In `public/index.html`, find the existing CSP meta tag (line ~5) and change `connect-src 'self';` to:

```
connect-src 'self' https://gorgon-arena.workers.dev http://localhost:8787;
```

The full line becomes:

```html
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://fonts.gstatic.com; font-src https://fonts.gstatic.com; script-src 'self' 'unsafe-inline'; connect-src 'self' https://gorgon-arena.workers.dev http://localhost:8787; img-src 'self' data:; object-src 'none'; base-uri 'self';">
```

- [ ] **Step 3: Verify the page still loads**

Open `public/index.html` in a browser. Check console: no CSP violations.

- [ ] **Step 4: Commit**

```bash
git add public/index.html
git commit -m "chore(home): extend CSP to allow Worker domain"
```

---

### Task 7.2: Add Arena panel HTML + CSS to index.html

**Files:**
- Modify: `public/index.html`

- [ ] **Step 1: Add CSS for the arena panel**

In `public/index.html`, find the `</style>` tag (end of the existing styles). Just before it, add:

```css
/* ── Arena Home Panel ── */
.arena-home-panel {
  border: 1px solid var(--maroon);
  background: linear-gradient(180deg, var(--panel-bg), var(--panel-bg-deep));
  padding: 0.8rem 1rem;
  margin: 0.6rem auto 1rem;
  max-width: 1100px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}
.arena-home-panel .label {
  font-family: 'Cinzel', serif;
  color: var(--amber);
  font-size: 0.78rem;
  letter-spacing: 0.1em;
}
.arena-home-panel .countdown {
  color: var(--body-text);
  font-size: 1rem;
  margin-top: 0.25rem;
}
.arena-home-panel .countdown .v {
  color: var(--amber-bright);
  font-weight: bold;
  font-family: monospace;
}
.arena-home-panel .countdown .meta {
  color: var(--amber-dim);
  font-size: 0.78rem;
}
.arena-home-panel .matchup {
  color: var(--body-dim);
  font-size: 0.85rem;
  margin-top: 0.2rem;
}
.arena-home-panel .matchup .dot { color: var(--green); }
.arena-home-panel .open-btn {
  background: var(--maroon);
  color: var(--amber-bright);
  border: 1px solid var(--maroon-bright);
  padding: 0.5rem 1rem;
  font-family: 'Cinzel', serif;
  letter-spacing: 0.08em;
  cursor: pointer;
  font-size: 0.8rem;
  text-decoration: none;
}
.arena-home-panel .open-btn:hover { background: var(--maroon-mid); }
```

- [ ] **Step 2: Add the Arena panel HTML**

Find the line `<div class="clock-grid">` in `public/index.html`. Find its matching `</div>` (the closing of the clock-grid block — should be where the existing `<div class="section-rule"></div>` follows the clocks).

Just *after* the closing `</div>` of `clock-grid` (and before the `<div class="section-rule">`), insert:

```html
  <!-- ── Arena Copilot quick panel ── -->
  <div class="arena-home-panel" id="arena-home-panel">
    <div>
      <div class="label">RED WING ARENA</div>
      <div class="countdown">
        Next fight in <span class="v" id="arena-countdown">--:--</span>
        <span class="meta" id="arena-slot-meta"></span>
      </div>
      <div class="matchup" id="arena-matchup">
        <span class="dot">●</span> <span id="arena-matchup-text">No matchup entered yet</span>
      </div>
    </div>
    <a class="open-btn" href="arena.html" aria-label="Open Arena Copilot">OPEN ARENA →</a>
  </div>
```

- [ ] **Step 3: Verify the page renders with the new panel**

Open `public/index.html` in a browser. Expected: new "RED WING ARENA" panel between the clocks and the event schedule. Countdown shows `--:--` and "No matchup entered yet" (we'll wire it up in 7.3).

- [ ] **Step 4: Commit**

```bash
git add public/index.html
git commit -m "feat(home): add Arena Copilot panel under clock pillar"
```

---

### Task 7.3: Wire arena panel — countdown + matchup polling

**Files:**
- Modify: `public/index.html`

- [ ] **Step 1: Add polling JS**

In `public/index.html`, find the closing `</script>` tag of the existing JS (search for `// END OF JS`, or just find the last `</script>` before `</body>`). Just before that closing `</script>`, add:

```js
// ── Arena Copilot home panel wiring ──
(function() {
  const cdEl = document.getElementById('arena-countdown');
  const metaEl = document.getElementById('arena-slot-meta');
  const matchupEl = document.getElementById('arena-matchup-text');
  if (!cdEl) return;

  // Schedule helpers (inline duplicate to avoid loading the full schedule.js here)
  const EST_OFFSET_HOURS = -5;
  const SLOT_MS = 8 * 60 * 1000;
  function slotIdAt(d) {
    const shifted = new Date(d.getTime() + EST_OFFSET_HOURS * 3600 * 1000);
    const y = shifted.getUTCFullYear();
    const m = shifted.getUTCMonth() + 1;
    const day = shifted.getUTCDate();
    const startOfDay = Date.UTC(y, m - 1, day);
    const slot = Math.floor((shifted.getTime() - startOfDay) / SLOT_MS);
    return y.toString().padStart(4,'0') + '-' + m.toString().padStart(2,'0') + '-' + day.toString().padStart(2,'0') + '-' + slot.toString().padStart(3,'0');
  }
  function startsAtUtc(slotId) {
    const m = /^(\d{4})-(\d{2})-(\d{2})-(\d{1,3})$/.exec(slotId);
    const slot = parseInt(m[4], 10);
    const startOfDay = Date.UTC(+m[1], +m[2]-1, +m[3]) - EST_OFFSET_HOURS * 3600 * 1000;
    return new Date(startOfDay + slot * SLOT_MS);
  }
  function localESTDate(d) {
    const shifted = new Date(d.getTime() + EST_OFFSET_HOURS * 3600 * 1000);
    return shifted.getUTCFullYear() + '-' + String(shifted.getUTCMonth()+1).padStart(2,'0') + '-' + String(shifted.getUTCDate()).padStart(2,'0');
  }

  const API_BASE = window.location.hostname === 'localhost'
    ? 'http://localhost:8787'
    : 'https://gorgon-arena.workers.dev';

  let lastPollAt = 0;
  let latestMatchup = '';

  async function poll() {
    const now = new Date();
    const slotId = slotIdAt(now);
    const day = localESTDate(now);
    try {
      const r = await fetch(API_BASE + '/v1/state?slot=' + slotId + '&day=' + day);
      if (!r.ok) throw new Error('non-OK');
      const data = await r.json();
      const entries = (data.slot && data.slot.entries) || [];
      if (entries.length === 0) {
        latestMatchup = 'No matchup entered yet';
      } else {
        const top = entries.slice().sort((a, b) => b.voter_ids.length - a.voter_ids.length)[0];
        latestMatchup = entries.length === 1
          ? top.fighter_a + ' vs ' + top.fighter_b + ' · ' + top.voter_ids.length + ' vote' + (top.voter_ids.length===1?'':'s')
          : entries.length + ' competing entries — open arena to vote';
      }
    } catch (e) {
      latestMatchup = 'Shared state unreachable';
    }
  }

  function tick() {
    const now = new Date();
    const slotId = slotIdAt(now);
    const start = startsAtUtc(slotId);
    const ms = start.getTime() - now.getTime();
    if (ms > 0) {
      const m = Math.floor(ms / 60000);
      const s = Math.floor((ms % 60000) / 1000);
      cdEl.textContent = m + ':' + s.toString().padStart(2,'0');
    } else {
      cdEl.textContent = 'fight in progress';
    }
    metaEl.textContent = ' · slot #' + slotId.slice(-3) + ' · ' + start.toUTCString().slice(17,22) + ' UTC';
    matchupEl.textContent = latestMatchup;

    const interval = (ms > 0 && ms < 60_000) ? 10_000 : 30_000;
    if (now.getTime() - lastPollAt > interval) {
      lastPollAt = now.getTime();
      poll();
    }
  }

  poll();
  setInterval(tick, 1000);
  tick();
})();
```

- [ ] **Step 2: Verify the panel updates**

Open `public/index.html` in a browser (with the local Worker running via `cd worker && npm run dev`). Expected: countdown counts down second-by-second; matchup line updates when Worker is up. With Worker down, shows "Shared state unreachable" gracefully.

- [ ] **Step 3: Commit**

```bash
git add public/index.html
git commit -m "feat(home): wire arena panel polling for countdown and matchup"
```

---

### Task 7.4: Add arena fight to the EVENTS array (for chime alerts)

**Files:**
- Modify: `public/index.html`

- [ ] **Step 1: Find the EVENTS array**

Search for `const EVENTS = [` in `public/index.html` (around line 836).

- [ ] **Step 2: Add the new event entry at the end of the array**

Just before the closing `];` of `const EVENTS = [...]`, add:

```js
  // ── Casino Arena ──
  {
    id:           'arena-fight',
    name:         'Arena Fight',
    category:     'casino',
    gorgonTime:   '—',
    estDisplay:   'every 8 min from midnight EST',
    freq:         'Every 8 minutes',
    estMatch:     { every_n_minutes: 8, anchor_minute: 0 },
    enabled:      true,
  },
```

- [ ] **Step 3: Verify EVENTS-driven UI handles the new entry**

The existing event resolver in `index.html` may not understand `every_n_minutes` matchers. Find the `function isMatching(...)` (or similar) where `estMatch` is checked. If it doesn't handle `every_n_minutes`, add this case alongside existing `minute:` / `hour:` / `day:` checks:

Search for `estMatch` matching logic in the file. When found, add a branch:

```js
// Inside the estMatch matcher function, add:
if (typeof match.every_n_minutes === 'number') {
  // Anchor at midnight EST = 5:00 UTC
  const utcMin = estNow.getUTCHours() * 60 + estNow.getUTCMinutes();
  const estMin = ((utcMin + 24 * 60 - 300) % (24 * 60));   // shift -5h
  const anchorMin = match.anchor_minute || 0;
  return ((estMin - anchorMin) % match.every_n_minutes) === 0;
}
```

(If the existing resolver doesn't have an obvious extension point, the safer move is to leave the EVENTS entry but skip wiring the chime for it in v1 — it'll just appear in the schedule table without an active alarm. Add a TODO comment.)

- [ ] **Step 4: Commit**

```bash
git add public/index.html
git commit -m "feat(home): add Arena Fight to EVENTS array (every 8 min)"
```

---

## Phase 8 — Polish (privacy, 404, OG, _headers)

### Task 8.1: privacy.html

**Files:**
- Create: `public/privacy.html`

- [ ] **Step 1: Create `public/privacy.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://fonts.gstatic.com; font-src https://fonts.gstatic.com; img-src 'self' data:;" />
  <title>Privacy — Gorgon Clock</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Spectral:wght@400;600&family=Cinzel:wght@400;700&display=swap" rel="stylesheet" />
  <style>
    body { background: #0a0806; color: #d8cfc0; font-family: 'Spectral', Georgia, serif; max-width: 720px; margin: 0 auto; padding: 2rem 1.5rem; line-height: 1.55; }
    h1, h2 { font-family: 'Cinzel', serif; color: #e08c14; letter-spacing: 0.06em; }
    h1 { font-size: 1.6rem; }
    h2 { font-size: 1.1rem; margin-top: 1.4rem; padding-top: 0.6rem; border-top: 1px solid #5c1a10; }
    a { color: #c8780a; }
    code { background: #1a1612; padding: 0.1rem 0.3rem; }
    .footer { margin-top: 2rem; font-size: 0.85rem; color: #7a4808; }
  </style>
</head>
<body>
  <h1>Privacy &amp; Disclosures</h1>

  <p>Gorgon Clock is a fan-made tool for the MMO <em>Project Gorgon</em>. This page explains
  what data the site stores and where it goes.</p>

  <h2>What's stored locally (your browser)</h2>
  <p>The site uses <code>localStorage</code> on your device to keep settings and history between
  visits. Specifically:</p>
  <ul>
    <li><code>user_id</code> — a random pseudonymous identifier (e.g. <code>u_a8f31c2b</code>),
        generated on first visit. Never linked to your name, email, or PG character.</li>
    <li><code>bankroll</code> — the council balance you've entered (used only to compute
        Kelly bet recommendations on your device).</li>
    <li><code>tips</code>, <code>voted_slots</code>, <code>voted_tips</code>, <code>history</code>
        — your collected Hot Tips, the matchups you've voted for, and the bets you've logged.</li>
  </ul>
  <p>This data is "strictly necessary" for the tool to function. You can clear it at any time
  by clearing your browser's site data for this domain.</p>

  <h2>What's sent to our server</h2>
  <p>The arena copilot uses a tiny shared backend (Cloudflare Worker) so that one player's
  matchup entry is visible to others. When you submit a matchup, vote, or submit/upvote/remove
  a tip, your <code>user_id</code> is sent to the Worker along with the action. No other
  information is transmitted.</p>
  <p>Server-side data lives in Cloudflare's KV store and auto-expires 24 hours after the relevant
  fight or tip-day. There is no long-term retention.</p>

  <h2>What we don't do</h2>
  <ul>
    <li>No analytics, no tracking, no cookies (only functional <code>localStorage</code>).</li>
    <li>No third-party scripts beyond Google Fonts (which the
        <a href="https://policies.google.com/privacy">Google privacy policy</a> covers).</li>
    <li>No personal data is ever requested or stored.</li>
  </ul>

  <h2>Disclaimer</h2>
  <p>Not affiliated with Elder Game or Project Gorgon. Game data sourced from
  <a href="https://cdn.projectgorgon.com">cdn.projectgorgon.com</a> (publicly licensed for
  tool authors) and the community wiki. All trademarks belong to their owners.</p>

  <div class="footer"><a href="index.html">← back to clock</a></div>
</body>
</html>
```

- [ ] **Step 2: Commit**

```bash
git add public/privacy.html
git commit -m "feat: add privacy disclosure page"
```

---

### Task 8.2: 404.html

**Files:**
- Create: `public/404.html`

- [ ] **Step 1: Create `public/404.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Lost in the Mist — Gorgon Clock</title>
  <style>
    body { background: #0a0806; color: #d8cfc0; font-family: Georgia, serif; min-height: 100vh; display: flex; align-items: center; justify-content: center; flex-direction: column; gap: 1rem; }
    h1 { font-family: 'Cinzel', serif; color: #e08c14; font-size: 2rem; letter-spacing: 0.1em; }
    a { color: #c8780a; }
  </style>
</head>
<body>
  <h1>404</h1>
  <p>This page doesn't exist in this realm.</p>
  <a href="/">← Return to the clock</a>
</body>
</html>
```

- [ ] **Step 2: Commit**

```bash
git add public/404.html
git commit -m "feat: add custom 404 page"
```

---

### Task 8.3: Favicon + icon.svg + OG meta

**Files:**
- Create: `public/icon.svg`
- Create: `public/favicon.ico` (placeholder note — actual binary needs separate creation)
- Modify: `public/index.html`

- [ ] **Step 1: Create `public/icon.svg`**

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" fill="#0a0806"/>
  <circle cx="32" cy="32" r="24" fill="none" stroke="#e08c14" stroke-width="2.5"/>
  <line x1="32" y1="14" x2="32" y2="32" stroke="#e08c14" stroke-width="2.5"/>
  <line x1="32" y1="32" x2="42" y2="40" stroke="#c8780a" stroke-width="2.5"/>
  <circle cx="32" cy="32" r="2" fill="#e08c14"/>
</svg>
```

- [ ] **Step 2: Add favicon + OG meta to `public/index.html`**

Find the existing `<title>Gorgon Clock</title>` line. Add immediately after it:

```html
  <link rel="icon" type="image/svg+xml" href="icon.svg" />
  <meta name="description" content="Real-time clock and event tracker for the MMO Project: Gorgon. Translates real time into in-game time with chime alerts." />
  <meta property="og:title" content="Gorgon Clock" />
  <meta property="og:description" content="Real-time clock and event tracker for Project: Gorgon." />
  <meta property="og:type" content="website" />
```

- [ ] **Step 3: Note about favicon.ico**

A binary `.ico` file should be generated from `icon.svg`. For v1, the SVG icon link suffices — modern browsers prefer SVG icons. Add a TODO note in `MANUAL_TEST.md`:

Append to `MANUAL_TEST.md`:

```markdown
## Outstanding asset TODOs

- [ ] Generate `public/favicon.ico` from `public/icon.svg` for older browsers (use any online SVG-to-ICO converter).
```

- [ ] **Step 4: Commit**

```bash
git add public/icon.svg public/index.html MANUAL_TEST.md
git commit -m "feat: add favicon SVG and OG meta tags"
```

---

### Task 8.4: _headers file (forward-compat for Cloudflare Pages migration)

**Files:**
- Create: `public/_headers`

- [ ] **Step 1: Create `public/_headers`**

```
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: no-referrer
  Strict-Transport-Security: max-age=31536000; includeSubDomains
  Permissions-Policy: geolocation=(), microphone=(), camera=()

/data/*
  Cache-Control: public, max-age=300, must-revalidate

/js/*
  Cache-Control: public, max-age=300, must-revalidate
```

- [ ] **Step 2: Commit**

```bash
git add public/_headers
git commit -m "chore: add _headers file for future Cloudflare Pages migration"
```

---

## Phase 9 — Deployment + manual testing

### Task 9.1: GitHub Actions CI (typecheck + Worker tests)

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Create `.github/workflows/ci.yml`**

```yaml
name: ci
on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  typecheck:
    name: Browser JS type-check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npx -p typescript@latest tsc --noEmit -p tsconfig.json

  worker-test:
    name: Worker tests
    runs-on: ubuntu-latest
    defaults:
      run: { working-directory: worker }
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: npm test
      - run: npx tsc --noEmit
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add typecheck and Worker test workflow"
```

---

### Task 9.2: Worker deploy workflow

**Files:**
- Create: `.github/workflows/deploy-worker.yml`

- [ ] **Step 1: Create `.github/workflows/deploy-worker.yml`**

```yaml
name: deploy-worker
on:
  push:
    branches: [main]
    paths:
      - 'worker/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    defaults:
      run: { working-directory: worker }
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - name: Deploy
        run: npx wrangler deploy
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/deploy-worker.yml
git commit -m "ci: add Worker deploy workflow on push to main"
```

- [ ] **Step 3: Note about repo secrets**

Document in `README.md` (append a new "Deployment" section):

Append to `README.md`:

```markdown
## Deployment

The static site is auto-deployed by GitHub Pages from `public/` on every push to `main`.

The Cloudflare Worker is auto-deployed by `.github/workflows/deploy-worker.yml`. This requires
two repository secrets to be set:

- `CLOUDFLARE_API_TOKEN` — token with **Workers Scripts: Edit** + **Workers KV Storage: Edit** scopes
- `CLOUDFLARE_ACCOUNT_ID` — your Cloudflare account ID (visible in dashboard URL)

Before the first deploy:

1. In Cloudflare dashboard, create a KV namespace named `STATE` for production
   and `STATE_PREVIEW` for preview. Copy each namespace's ID.
2. Update `worker/wrangler.toml`'s `[[kv_namespaces]]` block: replace
   `PLACEHOLDER_REPLACE_WITH_REAL_KV_ID` with the production ID and
   `PLACEHOLDER_REPLACE_WITH_REAL_PREVIEW_ID` with the preview ID.
3. After first deploy, the Worker URL is `https://gorgon-arena.<your-subdomain>.workers.dev`.
   Update the hardcoded URL in `public/arena.html` (CSP `connect-src`) and
   `public/js/api.js` (`_base()` function) and `public/index.html` (CSP + arena panel script)
   if your subdomain differs from `gorgon-arena.workers.dev`.
```

Commit:

```bash
git add README.md
git commit -m "docs: add deployment instructions"
```

---

### Task 9.3: GitHub Pages config

**Files:**
- (No new files — configure via GitHub UI)

- [ ] **Step 1: Configure GitHub Pages source via UI**

Note in `MANUAL_TEST.md` (or implementation log):

> Repo Settings → Pages → Source: "Deploy from a branch" → Branch: `main` / `/public` folder. Save. The site should be live at `https://<username>.github.io/<repo>/` within 1–2 minutes.

This is a one-time UI action with no file change. Skip if GH Pages is already configured.

- [ ] **Step 2: Verify the deployed site loads**

After GH Pages is configured, visit the URL. Expect: existing clock home + new Arena panel + working `/arena.html` page (Worker may still be unreachable until step 4 below).

- [ ] **Step 3: Deploy the Worker (manual one-time)**

```bash
cd worker
npx wrangler kv:namespace create STATE
npx wrangler kv:namespace create STATE --preview
# Copy the IDs into wrangler.toml
npx wrangler deploy
```

The output prints `https://gorgon-arena.<your-subdomain>.workers.dev`. Note this URL — it goes into the references in step 4.

- [ ] **Step 4: Update production Worker URL in browser code**

If your Worker URL is not exactly `https://gorgon-arena.workers.dev`, update three places:

1. `public/arena.html` — CSP `connect-src` line
2. `public/index.html` — CSP `connect-src` line + arena panel script `API_BASE`
3. `public/js/api.js` — `_base()` function

Commit those changes:

```bash
git add public/arena.html public/index.html public/js/api.js
git commit -m "chore: update Worker production URL"
```

---

### Task 9.4: Manual test pass

**Files:**
- (No new files; reference `MANUAL_TEST.md`)

- [ ] **Step 1: Run through every checkbox in `MANUAL_TEST.md`**

Open `MANUAL_TEST.md`. Tick each box as you confirm the behavior. Note any failures inline as new TODO items.

- [ ] **Step 2: Mark TODOs from spec for in-play verification**

Document in a new file `docs/superpowers/specs/2026-05-06-arena-copilot-todos.md` what still needs in-play verification:

```markdown
# Arena Copilot — Outstanding TODOs

These items from the spec require in-play observation before being marked verified:

- **TODO-1:** Confirm fight schedule anchor is midnight EST. If wrong, change `EST_OFFSET_HOURS` in both `public/js/schedule.js` and `worker/src/schedule.ts`.
- **TODO-2:** Verify the full arena fighter list. Currently 7 entries from a truncated wiki page; could be 10. If different, update `public/data/arena_fighters.json` and the `KNOWN_FIGHTERS` var in `worker/wrangler.toml`.
- **TODO-3:** Verify favor thresholds for tip-NPCs other than Mandibles. Update `public/data/arena_tip_npcs.json` `favor_required` field and flip `verified: true` as confirmed.
- **TODO-4:** Verify total tips-per-day limit (~12 estimated). No code change expected; informational only.
- **TODO-5:** Final domain decision (`gorgon-arena.workers.dev` placeholder is in CSP and code). Update if a custom domain is acquired.
- **TODO-6:** Generate `public/favicon.ico` from `public/icon.svg`.
```

- [ ] **Step 3: Commit final**

```bash
git add MANUAL_TEST.md docs/superpowers/specs/2026-05-06-arena-copilot-todos.md
git commit -m "docs: log manual-test pass and outstanding in-play TODOs"
```

---

## Plan Self-Review (run before handing off)

After writing the plan, the author (me) confirms:

- **Spec coverage:**
  - §3 Architecture → Phase 4 (Worker), Phase 5 (Api), Phase 6 (UI shell) ✓
  - §4 Data Model → Tasks 0.2 (static), 3.1 (localStorage), 4.5–4.6 (KV) ✓
  - §5 Math → Tasks 1.2, 1.3 ✓
  - §6 Worker API → Tasks 4.5–4.7 ✓
  - §7 User Flows → covered by component implementations + app.js (Tasks 6.2–6.6) ✓
  - §8 Page Layouts → Tasks 6.1, 7.1–7.2 ✓
  - §9 Components → Phase 6 ✓
  - §10 Worker Implementation → Phase 4 ✓
  - §11 Privacy/Security/Compliance → Phase 8 + CSP updates in 6.1, 7.1 ✓
  - §12 Error Handling → integrated into app.js (6.6) and Worker (4.7) ✓
  - §13 Testing → Tasks 1.1, 4.2–4.7 ✓
  - §14 Deployment → Phase 9 ✓
  - §16 Open TODOs → Task 9.4 ✓

- **Type consistency:** `Schedule.slotIdAt`, `Schedule.startsAtUtc`, `Schedule.nextSlotIn`, `Schedule.canStillBet`, `Schedule.localESTDate`, `State.load`, `State.save`, `State.checkDayRollover`, `Math_.aggregateProbability`, `Math_.kellyBet`, `Api.getState`, `Api.postMatchup`, `Api.deleteMatchup`, `Api.postTip`, `Api.patchTip` — all referenced consistently across tasks. ✓

- **No placeholders:** all code blocks are complete. The `wrangler.toml` placeholder IDs are intentionally tagged for one-time manual replacement during first deploy. ✓

- **Frequent commits:** every task ends with a commit step. ✓

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-05-06-arena-copilot.md`.**

Two execution options:

1. **Subagent-Driven (recommended)** — fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** — run tasks in this session using executing-plans, batch with checkpoints.

Which approach?
