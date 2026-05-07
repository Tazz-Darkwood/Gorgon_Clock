# Arena Copilot — Design Spec

**Date:** 2026-05-06
**Status:** Approved (awaiting user review of this written form)
**Author:** Brainstormed with Claude
**Scope:** v1 of the first new feature added to Gorgon Clock

---

## 1. Context and Vision

### Project identity

**Gorgon Clock is a temporal dashboard for Project Gorgon** — a fan-made web tool whose core identity is "*what's going on in Gorgon right now, what do you want to do?*" The existing clock home page (real-time PG clock + event schedule + chime alerts) is the foundation. New features extend it with more time-bound information.

### What this spec covers

The first new feature: a **betting copilot for the Red Wing Casino arena**. PG's casino runs an NPC vs NPC arena every 8 minutes, with players able to wager on outcomes. Players can collect "Hot Tips" from specific casino NPCs (when they reach Friends-or-higher favor), where each tip is a percentage modifier (`+10%`, `-5%`, etc.) on a fighter's win chance. Tips stack additively; tips reset at real-world midnight EST.

The copilot solves a real problem no existing tool solves: aggregating tips, computing the resulting win probability, and recommending an optimal bet size using the Kelly criterion. It also exposes a small shared state for community matchup-confirmation, so players don't have to manually enter who's fighting if someone else has already done it.

### Why this is feature #1

After surveying the data landscape (CDN, wiki, existing community tools), the arena betting domain is the only major **time-bound feature gap** in the PG tool ecosystem. PG Emissary covers calendar / lunar / market. Gorgon Codex covers items / recipes / build planning. Gorgon Apps covers brewing / surveying / pet breeding. **Nobody has built a betting copilot.** It's distinctively new, fits the temporal-dashboard identity, has clean data inputs, and has well-understood math.

### Out of scope for v1

These are real desires from brainstorming, deliberately deferred:

- Build planner with treasure-roll explorer
- Storage page (gift recipient finder, sellables, route optimization)
- Leveling pathfinder (recipe-grind optimizer, monster-farm planner)
- Item source explorer
- Chat-log integration via File System Access API (trade-chat mirror, keyword watch, auto-timer extraction)
- Wiki extraction layer (monster drops with quantities, scrape pipeline)
- Gardening / cheese box / mushroom box / boss respawn timers

All deferred to v2+. The arena copilot validates the technical path (static + Workers + KV); subsequent features extend that path.

---

## 2. Hard Facts (from data discovery)

These are *measured*, not assumed. Sources noted.

### From CDN data inventory

- **15 NPCs in `AreaCasino`** in `npcs.json`, of which 5 are confirmed tip-givers (Mandibles, Qatik, Irkima, Eveline Rastin, Arianna Fangblade) and 1 was confirmed Friends-favor by their own wiki page (Mandibles).
- **Kuzavek (the bookie) is not in `npcs.json`** — his betting interaction is not a standard NPC service type, so the official NPC data omits him. Documented on his wiki page.
- **The CDN has no Service Type related to "Tip" / "Hot" / "Arena" / "Wager" / "Bet"** across all 338 NPCs. Tip availability and favor thresholds are encoded only in NPC dialogue trees, not in published data. Verified via field-census of all distinct Service Types.
- **No CDN file maps monsters → items dropped**, **no monster levels**, **no spawn coordinates**. Monster-related data scattered across `ai.json` (templates, no levels/zones), `advancementtables.json` (vulnerabilities only), `sources_items.json` (one stub `Monster` entry across 9,612 items). Confirmed via exhaustive forensic search across 29 CDN files.

### From wiki (Kuzavek's page, the canonical reference)

- **Bet payout:** "Kuzavek will return double the initial bet minus a 10% fee. Ie. if a player bets 5,000 councils and places a winning bet, they will receive 9500 councils as a reward." → **Kelly's `b = 0.9`**.
- **Fight cadence:** "the NPC fights that occur each 8 minutes."
- **Tip mechanics:** "Most Hot Tips refer to two combatants, and have a number at the end such as (+5%). When these two combatants fight each other, the chance of victory is skewed in one's favor by the specified percentage. There are other Hot Tips that only refer to a single fighter. These apply to all battles the combatant is in. Hot Tips stack: sometimes the same fighter is mentioned in several tips; when this happens, the percentages from all relevant tips are added together."
- **Tip lifecycle:** "Different players may receive different tips each day, but all tips are accurate and valid during the **real-world day** that they are given out." (Resets at real-world midnight EST.)
- **Fighter list (partial — page truncated mid-Vizlark):** Corrrak, Dura, Gloz, Leo, Otis, Ushug, Vizlark.

### Derived math

- **Break-even probability:** with `b = 0.9`, `bp = q ⇒ 0.9p = 1−p ⇒ p = 0.5263`. Below this, expected value is negative — the tool MUST refuse to recommend a bet.
- **Slot ID derivation:** with 8-minute fights from midnight EST, exactly 180 slots per day. `slot_id = floor((seconds_since_midnight_EST) / 480)`. Format: `YYYY-MM-DD-NN` where `NN ∈ [0, 179]`.
- **EST anchor specifically:** "midnight EST" means strict UTC-5 (no DST shifts). PG's server clock does not observe DST. The `Schedule.EST_OFFSET_HOURS` constant is `-5`, fixed. If PG ever switches to America/New_York with DST, this is a single constant change.

### Open TODOs (verifications outstanding from in-play observation)

- **TODO-1 (schedule anchor):** verify fights are anchored to midnight EST (currently assumed). If different, change one constant in `Schedule.SLOT_EPOCH`.
- **TODO-2 (fighter list completeness):** Kuzavek's wiki page truncated at Vizlark; verify total count (probably ~7–10).
- **TODO-3 (tip-NPC favor levels):** only Mandibles confirmed (Friends). Others default to Friends pending in-play verification.
- **TODO-4 (tips-per-day):** estimated ~12 tips / day across 5 NPCs (≈2–3 per NPC). Architecture handles arbitrary counts; no spec change needed if assumption is wrong.

---

## 3. Architecture

### High-level

```
┌──────────────────────┐         ┌─────────────────────┐
│  GitHub Pages        │         │  Cloudflare Worker  │
│  (static files)      │ <─────> │  (matchup / tips    │
│  • index.html        │  HTTPS  │   shared state API) │
│  • arena.html        │         │  • GET  /v1/state   │
│  • js/*.js           │         │  • POST /v1/state   │
│  • data/*.json       │         │  • PATCH /v1/tips/  │
│  • privacy.html      │         │  • GET  /v1/health  │
│  • 404.html          │         └──────────┬──────────┘
│  • _headers          │                    │
└──────────────────────┘                    ▼
        ▲                          ┌─────────────────────┐
        │ deploy on push            │  Cloudflare KV      │
        │ to main                   │  (24h TTL per key)  │
        └─ GitHub Actions ─────────►│  • slot:YYYY-MM-DD-NN│
                                    │  • tips:YYYY-MM-DD  │
                                    │  • rate:<ip-hash>   │
                                    └─────────────────────┘
```

### Tech stance

- **Browser:** vanilla JS (`.js` files + JSDoc annotations for type checking, no build step). Existing `index.html` is single-file vanilla; arena copilot keeps that aesthetic.
- **Worker:** TypeScript (Wrangler default, compiled at deploy).
- **Type checking:** `tsc --noEmit --checkJs` over `public/js/*.js` runs in CI.
- **No frameworks** (React/Svelte/Vue all rejected). Future migration to **htmx** is acceptable if v2+ features warrant it.
- **No bundler.** Static files are served as authored.
- **No external runtime dependencies in the browser** (no CDN scripts beyond Google Fonts, which is already restricted in existing CSP).

### Hosting

- **GitHub Pages**, free tier, HTTPS automatic, custom-domain-ready.
- **Cloudflare Workers**, free tier (100K req/day, 100K KV reads/day, 1K KV writes/day, 1GB KV storage). Verified in research that our request/response pattern fits free tier with ~10× headroom.
- **No backend servers**, no databases, no Render web services. The legacy `legacy_django_gorgon_clock/` directory is dead code and can be removed at implementation time.

---

## 4. Data Model

### Cloudflare KV

#### `slot:YYYY-MM-DD-NN` — current matchup state per fight slot

```json
{
  "_v": 1,
  "slot_id": "2026-05-06-042",
  "starts_at_utc": "2026-05-06T10:36:00Z",
  "entries": [
    {
      "id": "ent_a8f3",
      "fighter_a": "Otis",
      "fighter_b": "Leo",
      "first_at": "2026-05-06T10:30:12Z",
      "voter_ids": ["u_3df1", "u_6ca2", "u_b412"]
    },
    {
      "id": "ent_2c91",
      "fighter_a": "Otis",
      "fighter_b": "Vizlark",
      "first_at": "2026-05-06T10:31:01Z",
      "voter_ids": ["u_9e44"]
    }
  ]
}
```

**TTL:** 86400s (24h) from `starts_at_utc`. KV self-cleans.

#### `tips:YYYY-MM-DD` — shared tip pool per real-world day

```json
{
  "_v": 1,
  "day": "2026-05-06",
  "tips": [
    {
      "id": "tip_x7q2",
      "type": "matchup",
      "source_npc": "Mandibles",
      "fighter_a": "Otis",
      "fighter_b": "Leo",
      "favored": "Otis",
      "modifier_pct": 10,
      "submitted_by": "u_3df1",
      "submitted_at": "2026-05-06T18:14:00Z",
      "upvoters": ["u_3df1", "u_6ca2", "u_b412"],
      "removers": ["u_9e44"]
    },
    {
      "id": "tip_y9k1",
      "type": "fighter",
      "source_npc": "Eveline_Rastin",
      "fighter_a": "Vizlark",
      "fighter_b": null,
      "favored": "Vizlark",
      "modifier_pct": -5,
      "submitted_by": "u_b412",
      "submitted_at": "2026-05-06T18:32:00Z",
      "upvoters": ["u_b412"],
      "removers": []
    }
  ]
}
```

**TTL:** 86400s from start of next day (so today's tips remain visible until ~24h after midnight reset).

**Note:** `submitted_by` is server-internal — used only for the user's own "did I submit this?" check (compare to local `user_id`). Never displayed in the UI (full anonymity per design decision).

#### `rate:<sha256(ip)>` — rate limit counter

```
Value: integer count
TTL:   60s
Limit: 5 writes per minute per IP (rejection threshold)
```

Hashed because Cloudflare Worker provides IP via `request.headers.get('CF-Connecting-IP')`; we don't need it in raw form.

### LocalStorage (per browser)

Single key: `gorgon_clock_state`. Value:

```json
{
  "_v": 1,
  "user_id": "u_3df1",
  "tips_day": "2026-05-06",
  "bankroll": 50000,
  "kelly_fraction": "half",
  "voted_slots": {
    "2026-05-06-042": "ent_a8f3"
  },
  "voted_tips": {
    "tip_x7q2": "upvoted",
    "tip_y9k1": "removed"
  },
  "history": [
    {
      "slot_id": "2026-05-06-039",
      "matchup": ["Otis", "Leo"],
      "predicted_p": 0.62,
      "bet": 4500,
      "won": true,
      "delta": 4050,
      "logged_at": "2026-05-06T10:32:00Z"
    }
  ]
}
```

`history[]` is capped at 200 entries (FIFO eviction).

`tips_day` rolls over at local-EST midnight. On rollover: archive any logged outcomes into `history`, blank `voted_tips` (yesterday's tips disappear when KV's `tips:YESTERDAY` expires), keep `voted_slots` until each entry's slot's KV TTL expires.

`user_id` is generated once on first visit via `crypto.randomUUID()` truncated/prefixed to `u_xxxxxx`. Never PII. Pseudonymous.

### Static JSON shipped with the app

#### `public/data/arena_fighters.json`

```json
{
  "_v": 1,
  "fighters": [
    {"id": "Corrrak",  "species": "Ranalon",       "style": "Fosulf martial style"},
    {"id": "Dura",     "species": "Orc",           "style": "Sword and shield"},
    {"id": "Gloz",     "species": "Goblin Bear",   "style": "Claws, rending"},
    {"id": "Leo",      "species": "Rahu",          "style": "Natural claws and limbs"},
    {"id": "Otis",     "species": "Ogre",          "style": "Bone-shattering"},
    {"id": "Ushug",    "species": "Orc",           "style": "Staff fighter"},
    {"id": "Vizlark",  "species": "Psychic Mantis","style": "Psychic powers"}
  ],
  "_TODO": "Verify completeness (TODO-2). Wiki page truncated mid-Vizlark."
}
```

#### `public/data/arena_tip_npcs.json`

```json
{
  "_v": 1,
  "tip_npcs": [
    {"id": "Mandibles",        "favor_required": "Friends", "verified": true,
     "verification_source": "wiki Mandibles page — 'rewards her friends with...a hot tip'"},
    {"id": "Qatik",            "favor_required": "Friends", "verified": false},
    {"id": "Irkima",           "favor_required": "Friends", "verified": false},
    {"id": "Eveline_Rastin",   "favor_required": "Friends", "verified": false},
    {"id": "Arianna_Fangblade","favor_required": "Friends", "verified": false}
  ],
  "_TODO": "Verify favor thresholds for non-Mandibles entries (TODO-3)."
}
```

---

## 5. Math (the testable core)

`public/js/math.js` exports a single namespace `Math_`:

### `Math_.aggregateProbability(tips, fighter_a, fighter_b) → number ∈ [0.01, 0.99]`

Pure function. Sums modifiers per the rules quoted from Kuzavek's wiki page:

```
P(fighter_a) = 0.5
              + Σ tips where (favored == fighter_a, type == "fighter")
              − Σ tips where (favored == fighter_b, type == "fighter")
              + tip where (type == "matchup", fighter_a/fighter_b match this matchup, favored == fighter_a)
              − tip where (type == "matchup", fighter_a/fighter_b match this matchup, favored == fighter_b)
```

Modifiers in `tips[].modifier_pct` are integers; convert to fractions (`/100`) when summing.

Clamp to `[0.01, 0.99]` to keep Kelly math stable.

### `Math_.kellyBet(p, bankroll, fraction) → integer (councils)`

Pure function. With `b = 0.9`:

```
edge = 0.9 × p − (1 − p) = 1.9p − 1

if edge ≤ 0:
  return 0      // refuse to bet — house edge exceeds info edge

f_full = edge / 0.9
bet = round(bankroll × f_full × fraction)
return bet
```

`fraction` ∈ {1.0, 0.5, 0.25} corresponding to Full / Half / Quarter Kelly.

### Why this design

- **Pure functions** mean no DOM, no fetch, no localStorage. Trivially testable.
- **Clamping at the boundary** handles malformed input from the UI gracefully.
- **`b = 0.9` is a constant** — if PG ever changes the casino fee, change one line.
- **Refuse to bet on negative edge** is a key feature, not a bug. The tool's value is partly in saying "don't bet."

### Tests

`public/tests.html` runs in any browser, no framework:

- empty tips → 0.5
- single fighter modifier applied to favored side
- multiple fighter modifiers stack
- matchup-specific tip applies only when fighters match
- matchup-specific tip ignored when fighters differ
- clamping at 0.99 for absurd modifiers
- Kelly returns 0 at p ≤ 0.5263
- Kelly returns 0 with zero bankroll
- Half-Kelly is exactly half Full-Kelly
- All assertion results displayed as ✓/✗ rows on the page

Worker logic tested via Vitest in `worker/src/index.test.ts`.

---

## 6. Worker API

Base URL: `https://gorgon-arena.<account>.workers.dev` (final domain TBD; placeholder for now).

All endpoints are prefixed `/v1/` to enable future API versioning without breaking deployed clients.

### `GET /v1/state?slot=YYYY-MM-DD-NN&day=YYYY-MM-DD`

Returns combined matchup + tip pool in one request. Edge-cached for 5s.

```json
{
  "slot": { /* slot KV value, or {entries: []} if empty */ },
  "tips": { /* tips KV value, or {tips: []} if empty */ },
  "server_time_utc": "2026-05-06T10:35:42Z"
}
```

`server_time_utc` lets the client detect clock skew (warn user if drift > 30s).

### `POST /v1/matchup?slot=YYYY-MM-DD-NN`

Body:
```json
{
  "user_id": "u_3df1",
  "action": "create" | "vote",
  "fighter_a": "Otis",
  "fighter_b": "Leo",
  "entry_id": "ent_a8f3"   // required for action=vote, omit for action=create
}
```

Server validates:
- Slot ID format and not in distant past/future
- Fighter names exist in known list (matches `arena_fighters.json`)
- `fighter_a !== fighter_b`
- `user_id` matches format `u_[A-Za-z0-9]{4,16}`
- For `create`: appends new entry, adds user to `voter_ids`
- For `vote`: removes user from any other entry in the slot, adds to specified `entry_id`

Returns updated slot.

### `DELETE /v1/matchup?slot=YYYY-MM-DD-NN`

Body: `{ "user_id": "u_3df1" }`

Removes user from whichever entry they previously voted for. Idempotent. Returns updated slot.

### `POST /v1/tips?day=YYYY-MM-DD`

Body:
```json
{
  "user_id": "u_3df1",
  "type": "matchup" | "fighter",
  "source_npc": "Mandibles",
  "fighter_a": "Otis",
  "fighter_b": "Leo",      // null for type=fighter
  "favored": "Otis",
  "modifier_pct": 10
}
```

Validates:
- All fighter names in known list
- `source_npc` in known list (matches `arena_tip_npcs.json`)
- For `type=matchup`: `fighter_a`, `fighter_b` both present, distinct, `favored` is one of them
- For `type=fighter`: `fighter_b` is `null`, `favored == fighter_a`
- `modifier_pct` ∈ [-50, 50] integer

Appends new tip with submitter auto-added to `upvoters`. Returns updated tips list.

### `PATCH /v1/tips/:tip_id?day=YYYY-MM-DD`

Body:
```json
{
  "user_id": "u_3df1",
  "action": "upvote" | "remove" | "reset"
}
```

Updates `upvoters` / `removers` per the action. `reset` clears the user from both lists. Returns updated tips list.

### `GET /v1/health`

Returns `{ "ok": true, "ts": "..." }`. No KV access. Used for monitoring.

### Cross-cutting Worker behavior

- **CORS:** allowed origin = our deployed Pages domain (TBD). Preflight handled.
- **Rate limit:** all writes go through a per-IP counter. 5 writes/minute. Exceeded → 429 with `Retry-After`.
- **Schema version check:** if KV value's `_v` is missing or differs from current, treat as missing (i.e., fresh slot). Migration logic added when v changes.
- **Logging:** every write logs structured JSON `{ts, endpoint, user_id_hashed, slot_id, action}` to Cloudflare's dashboard. No raw IPs, no PII.
- **Caching:** `GET /v1/state` returns `Cache-Control: max-age=5, public`. Edge cache invalidates on write via `caches.default.delete()`.

---

## 7. User Flows

### Flow A — First visit ever

1. Browser opens site → existing clock home loads → `localStorage` empty
2. New "Red Wing Arena" panel renders **directly under the clock pillar**, before the existing event schedule. Shows "Next fight in M:SS" countdown + matchup snippet (if any) + "[ Open Arena → ]" button
3. User clicks button → `arena.html` loads
4. First-visit modal: *"Quick setup — what's your council balance? You can update this anytime."*
5. User enters bankroll → modal dismisses → page renders empty tips + matchup picker + greyed Kelly bar
6. `localStorage` initialized: `user_id` (random UUID), `bankroll`, `tips_day` (today EST), empty `tips` / `voted_*` / `history`

### Flow B — Returning visit, mid-day, after collecting in-game tips

1. Page loads; `tips_day === today` → shows today's tip pool
2. User clicks "+ Add Hot Tip" → inline form: source NPC dropdown, type radio, fighter dropdown(s), modifier ± and value
3. User submits → `POST /v1/tips` → tip appended, card appears in list with "from <anonymous>" label
4. Other tips in pool appear as default-included; user can `↑ Upvote` (visual confirmation badge) or `✕ Remove` (hides from their feed)

### Flow C — Day rollover at midnight EST

1. `Schedule` ticks every second, compares `localDate(EST) !== State.tips_day`
2. On change: any unlogged outcomes from `voted_slots` get archived to `history`, `tips_day` updates, `voted_tips` blanks (yesterday's tips disappear when KV `tips:YESTERDAY` expires anyway)
3. Tips panel shows empty state: *"It's a new arena day. Visit the casino NPCs to gather today's Hot Tips."*

### Flow D — Live matchup interaction (the hot path)

```
[page load / poll tick]
    ↓
[fetch GET /v1/state?slot=N&day=D]
    ↓
[entries.length === 0?]
    yes → show empty state, "Be first — pick fighters" form
    no  → render entries with vote counts; user clicks to confirm or "+ enter different"
    ↓
[user pick]
    ↓
[POST /v1/matchup with action=vote or create]
    ↓
[server returns updated slot]
    ↓
[State.voted_slots[N] = entry_id]
    ↓
[render Math_.aggregateProbability for picked entry]
    ↓
[bankroll set?]
    no  → show "Set bankroll to see recommended bet"
    yes → render Math_.kellyBet result
    ↓
[poll every 30s; switch to 10s in final 60s before fight]
[on T-0: fight starts, UI locks, "Bets closed" state]
```

### Flow E — Disagreement

1. Multiple entries in the slot
2. UI lists them, sorted by `voter_ids.length` desc, with vote counts per entry
3. User picks any one — `Math_` runs on that pick, regardless of count
4. If user changes mind: "← pick a different one" link → same `POST /v1/matchup` with new `entry_id` → server unvotes from old, votes for new

### Flow F — Outcome logging

1. After T+8 minutes (slot duration), UI says "Bets closed — fight in progress"
2. After ~1–2 minutes more, UI prompts: *"Did <fighter_picked> win? [Yes] [No]"*
3. User answers → entry added to `history`
4. History strip updates: lifetime ROI, win rate, last-N matches

---

## 8. Page Layouts

### `index.html` (existing, with one new panel)

The new arena panel sits directly under the clock pillar, before the event schedule:

```
┌──────────────────────────────────────────────────────┐
│  GORGON CLOCK   [centered title]                     │
│  ──────────────────────────────                      │
│                                                       │
│  [Local Time]  [Server EST]  [Gorgon Time]           │
│                                                       │
│  ─────────── NEW ARENA PANEL ─────────                │
│  ┌─────────────────────────────────────────┐         │
│  │ RED WING ARENA                          │         │
│  │ Next fight in 4:32 · slot #042 · 09:36  │         │
│  │ ✓ Confirmed: Otis vs Leo · 3 votes      │         │
│  │                       [ OPEN ARENA → ]  │         │
│  └─────────────────────────────────────────┘         │
│                                                       │
│  EVENT SCHEDULE & CHIME ALERTS                        │
│  [existing event table]                               │
│                                                       │
│  [Quick Add Temporary Event]                          │
│                                                       │
│  [Footer]                                             │
└──────────────────────────────────────────────────────┘
```

The panel uses the same maroon/amber/dark Cinzel/Spectral aesthetic as the rest of the page.

A new entry is appended to the existing `EVENTS` array:

```js
{
  id: 'arena-fight',
  name: 'Arena Fight',
  category: 'casino',
  estDisplay: 'every 8 min from midnight EST',
  freq: 'Every 8 minutes',
  estMatch: { every_n_minutes: 8, anchor: 'midnight_EST' },
  enabled: true
}
```

This makes the existing chime + bell + filter infrastructure work for arena fights automatically (5-min warning, "Now!" chime).

### `arena.html` (new)

Layout (desktop, max-width 900px, two-column):

```
┌──────────────────────────────────────────────────────────┐
│             ARENA COPILOT                                 │
│      RED WING CASINO · BETTING ASSISTANT                  │
│  ──────────────────────────────────────                   │
│                                                            │
│  ┌──── COUNTDOWN PILLAR ──────────────────┐              │
│  │  Next Fight Begins In                   │              │
│  │              4:32                        │              │
│  │  slot #042 · starts 09:36 PM EST · 8m   │              │
│  └─────────────────────────────────────────┘              │
│                                                            │
│  ┌─ TODAY'S HOT TIPS ──┐  ┌─ CURRENT MATCHUP ────────┐   │
│  │ resets at midnight  │  │ ┌───────────────────────┐│   │
│  │                     │  │ │   OTIS  vs  LEO       ││   │
│  │ ✓ Otis +10% (M)     │  │ │ ✓ confirmed · 3 votes ││   │
│  │ ✕ Vizlark -5% (E)   │  │ └───────────────────────┘│   │
│  │ Otis +3% (Q)        │  │                          │   │
│  │                     │  │ Win Probability:         │   │
│  │ [+ Add Hot Tip]     │  │ [Otis 63% ▓▓▓▓▓▓│LEO 37%]│   │
│  │                     │  │ break-even at 53%        │   │
│  │                     │  │                          │   │
│  │                     │  │ Bankroll: [50,000] [Half]│   │
│  │                     │  │ ┌──────────────────────┐ │   │
│  │                     │  │ │  RECOMMENDED BET     │ │   │
│  │                     │  │ │  5,267 councils      │ │   │
│  │                     │  │ │  edge +9.7% · ½K     │ │   │
│  │                     │  │ └──────────────────────┘ │   │
│  └─────────────────────┘  └──────────────────────────┘   │
│                                                            │
│  ┌─ RECENT HISTORY ─────────────────────────────────┐    │
│  │ #041 Otis won +4500 │ #040 Vizlark lost -3000 │ ...   │
│  │ Lifetime: +18,420 (12W / 7L)                          │
│  └────────────────────────────────────────────────────┘   │
│                                                            │
│  [Footer with disclaimer]                                  │
└──────────────────────────────────────────────────────────┘
```

Three matchup-card states (covered visually in mockup):

1. **Empty** — no entries yet. Two fighter dropdowns + "Submit matchup" button.
2. **Confirmed (one entry)** — single highlighted card with vote count. Subtle "← pick different / enter new" link.
3. **Disputed (multiple entries)** — list of entries, top-most has highest votes; user picks. No auto-pick. (Win % only renders after pick.)

Mobile responsive: columns stack vertically, all functionality preserved.

### `privacy.html` (new)

Single-page disclosure. Plain language. Covers:

- What data is stored locally (`user_id`, `bankroll`, `tips`, `history`)
- What data is sent to Workers (matchup votes, tip submissions, all pseudonymous via `user_id`)
- That `user_id` is a random pseudonymous identifier, never linked to PII
- That data is auto-purged 24h after relevance (KV TTL)
- That this is a fan tool not affiliated with Elder Game / Project Gorgon
- A contact for data inquiries (GitHub issues link, since there's no email)

### `404.html` (new)

Custom Not Found page with the same aesthetic, link back to home.

---

## 9. Component Breakdown (browser code)

All in `arena.html` plus `public/js/*.js` files. Module pattern: namespace objects.

| File | Namespace | Job |
|---|---|---|
| `js/schedule.js` | `Schedule` | Slot ID derivation; countdown to next fight; polling cadence (30s default, 10s in final 60s); day-rollover detection |
| `js/state.js` | `State` | LocalStorage read/write; schema migration; day-rollover archival; `user_id` generation; custom-event dispatch on changes |
| `js/api.js` | `Api` | Fetch wrapper around Worker endpoints; error handling; offline detection; rate-limit detection |
| `js/math.js` | `Math_` | Pure functions: `aggregateProbability`, `kellyBet`. **Zero I/O.** Tests in `tests.html` |
| `js/tip-form.js` | `TipForm` | Render add-tip form, validate, dispatch to `Api` |
| `js/matchup-picker.js` | `MatchupPicker` | Render empty / confirmed / disputed states; handle picks; dispatch to `Api` and `State` |
| `js/kelly-display.js` | `KellyDisplay` | Render win-% bar + Kelly card; reads `State`, calls `Math_` |
| `js/history.js` | `History` | Render bottom strip; reads `State.history` |
| `js/app.js` | `App` | Orchestrator: poll tick, render dispatch, day-rollover handler, error boundary |
| `arena.html` | — | Loads all the above; minimal inline boot code |

`index.html` gets a small additional `<script>` block (~50 lines) that polls `/v1/state` every 30s for the upcoming-slot panel and renders the countdown.

### Communication patterns

- **State → UI:** `State` fires `CustomEvent` on changes; render functions listen and re-render. No reactive framework.
- **Polling tick:** `Schedule` runs a single `setInterval` (1Hz) driving both the countdown and matchup polls.
- **Worker → Browser:** plain `fetch()` with JSON. No websockets.

---

## 10. Cloudflare Worker Implementation Notes

### File layout

```
worker/
├── wrangler.toml
├── package.json
└── src/
    ├── index.ts        ← router; ~150 lines
    ├── matchup.ts      ← matchup endpoint logic
    ├── tips.ts         ← tip endpoint logic
    ├── schedule.ts     ← slot ID validation, time helpers
    ├── validation.ts   ← shared validators (fighter names, user_id, modifier ranges)
    ├── ratelimit.ts    ← per-IP counter logic
    └── index.test.ts   ← Vitest suite
```

### Key dependencies

- `@cloudflare/workers-types` (TypeScript types for Worker runtime)
- `vitest` + `@cloudflare/vitest-pool-workers` (test runner)
- `wrangler` (CLI deploy tool)

### Worker secrets

None in v1. If we ever add bot-token-based moderator endpoints, they'd go through `wrangler secret put`.

### Bindings declared in `wrangler.toml`

```toml
[[kv_namespaces]]
binding = "STATE"
id = "<production_kv_id>"

[vars]
ALLOWED_ORIGINS = "https://<our-domain>"
KNOWN_FIGHTERS  = "Corrrak,Dura,Gloz,Leo,Otis,Ushug,Vizlark"
KNOWN_TIP_NPCS  = "Mandibles,Qatik,Irkima,Eveline_Rastin,Arianna_Fangblade"
```

Validation lists hardcoded in vars match the static JSON shipped to the browser. Any new fighter or tip-NPC must be added in both places.

---

## 11. Privacy, Security, Compliance

### Privacy disclosure

`public/privacy.html` is a v1 deliverable. Plain language. Covers:

- localStorage contents (functional, not for tracking)
- Pseudonymous `user_id` sent to Workers
- 24h KV TTL on shared state
- No analytics, no third-party tracking, no cookies
- No personal data ever collected
- Fan-tool disclaimer
- Link to GitHub repo for data inquiries

### Content Security Policy

Both `index.html` and `arena.html` carry a strict CSP via `<meta http-equiv>` (GitHub Pages doesn't support custom headers, so meta-CSP is the path).

```
default-src 'self';
style-src   'self' 'unsafe-inline' https://fonts.googleapis.com https://fonts.gstatic.com;
font-src    https://fonts.gstatic.com;
script-src  'self' 'unsafe-inline';
connect-src 'self' https://gorgon-arena.<account>.workers.dev;
img-src     'self' data:;
object-src  'none';
base-uri    'self';
```

`'unsafe-inline'` for scripts is needed because we use inline `<script>` blocks. This is a known trade-off; we accept it because we don't render any user-submitted text (eliminating the XSS surface).

### `_headers` file (for future Cloudflare Pages migration)

Shipped in `public/_headers` for forward compatibility. GitHub Pages ignores it. If we ever migrate hosting to Cloudflare Pages, these headers activate automatically.

```
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: no-referrer
  Strict-Transport-Security: max-age=31536000; includeSubDomains
  Permissions-Policy: geolocation=(), microphone=(), camera=()
```

### Worker CORS

Restrict to specific origin (the deployed GitHub Pages URL). No wildcard. Preflight `OPTIONS` handled by router.

### Worker rate limiting

Per-IP counter, 5 writes/minute. Prevents trivial spam without blocking legitimate use.

### Fan-tool disclaimer

Tiny text in the footer of every page:

> *Not affiliated with Elder Game or Project Gorgon. Game data sourced from cdn.projectgorgon.com (publicly licensed for tool authors) and the community wiki. All trademarks belong to their owners.*

### Schema versioning

Every KV value and `localStorage` blob carries a top-level `"_v": 1`. Migration logic added when `v` changes.

### API versioning

All Worker endpoints prefixed `/v1/`. Future breaking changes go to `/v2/` while keeping `/v1/` alive for older browsers.

### Accessibility

- ARIA labels on all icon-only buttons (`✓`, `⚠`, `↑`, `✕`)
- All interactive elements keyboard-focusable
- Color contrast meets WCAG AA (the existing palette already does)
- `prefers-reduced-motion` honored: no animations on the countdown for users with motion-reduction enabled

### Open Graph + favicon

Standard OG tags on both `index.html` and `arena.html`. Favicon at `public/favicon.ico` + `public/icon.svg`.

---

## 12. Error Handling

### Network / Worker errors

| Failure | User experience | Code path |
|---|---|---|
| Worker 5xx / network error | Banner: "Can't reach shared state — showing your local view only" | `Api` returns sentinel; UI continues with `voter_ids: ['<self>']` only |
| Worker malformed JSON | Same banner | `Api` parse-with-try-catch, treats as unreachable |
| 429 rate limit | Banner: "Too many votes — wait 60s"; vote buttons disabled | `Api` reads `Retry-After`, schedules re-enable |
| CORS misconfig | Same as 5xx | Caught at first dev test; not expected in prod |

### LocalStorage errors

| Failure | User experience | Code path |
|---|---|---|
| Disabled (private mode) | Banner: "Browser storage unavailable — settings won't persist" | Feature-detect; in-memory fallback |
| Quota exceeded | Same banner | Try/catch on writes; clear `history[]` first if needed |
| Stale schema (`_v` mismatch) | Silent migration | `State.migrate()` runs on load; resets if no migration path |

### Time / clock edge cases

| Failure | User experience |
|---|---|
| System clock wrong > 30s | Warning banner; trust server time for slot ID |
| Day rollover while open | Tips panel wipes; "It's a new arena day" empty state |
| Mid-fight load (bets closed) | "Fight in progress" lock; vote buttons hidden; Kelly hidden |
| Schedule anchor wrong (TODO-1) | Single-line constant fix in `Schedule.SLOT_EPOCH` |

### User input errors

| Failure | User experience |
|---|---|
| Tip form: blank field | Inline form errors |
| Modifier outside ±50 | Reject in form validation |
| Bankroll: non-numeric | Inline reject; revert to last good |
| Submitting unknown fighter | Dropdown only contains known fighters; impossible by UI |

### Concurrency

| Failure | Resolution |
|---|---|
| Two users vote same 100ms | KV write serializes; both eventually counted on next poll |
| Vote count off by 1 momentarily | Auto-corrects on next 30s poll |
| Two tabs same browser | Both read/write own snapshots; last write wins; refresh on focus |

### Things we explicitly don't handle in v1

- Authentication / OAuth (no need; rate limit suffices)
- Cookie consent banner (only functional storage; no consent legally required)
- Offline mode beyond local-only fallback
- Mobile-specific touch interactions (responsive layout only)
- Browser support older than latest 2 versions of Chrome/Firefox/Safari/Edge
- Real-time push (WebSockets / SSE)
- Geographic restrictions

---

## 13. Testing Strategy

| Layer | What | Tool | Where it runs |
|---|---|---|---|
| 1 | `Math_` pure functions | Browser asserts in `tests.html` | Manually pre-deploy; optionally headless CI later |
| 2 | Worker endpoints | Vitest + `@cloudflare/vitest-pool-workers` | CI on every PR |
| 3 | `Schedule` + `State` migration | Browser asserts in `tests.html` | Same as Layer 1 |
| 4 | Type safety | `tsc --noEmit --checkJs` | CI on every PR |
| 5 | UX manual checklist | `MANUAL_TEST.md` | Pre-merge |

### Manual test checklist (`MANUAL_TEST.md`)

1. Open `arena.html` in Chrome — verify three matchup states render
2. Open in Firefox + Safari — verify cross-browser parity
3. Empty → submit → confirmed → vote → unvote → re-vote
4. Stop the Worker mid-session — verify local-only banner appears
5. Set system time to 11:59 PM EST → wait 2 minutes → verify day rollover wipe
6. Mobile width (≤ 480px) → verify column stacking
7. Keyboard-only navigation → verify all interactions reachable
8. Screen reader (VoiceOver / NVDA) → verify ARIA labels announced

---

## 14. Deployment

### GitHub Action: type-check + Worker tests on every PR

```yaml
name: ci
on: [pull_request]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npx -p typescript@latest tsc --noEmit --checkJs --allowJs public/js/*.js
      - run: cd worker && npm ci && npm test
```

### GitHub Action: deploy on push to main

```yaml
name: deploy
on:
  push:
    branches: [main]
jobs:
  pages:    # GitHub Pages deploys public/ automatically; nothing to do here
  worker:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: cd worker && npm ci && npx wrangler deploy
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
```

Cloudflare API token added to repo secrets at implementation time.

### Branch protection

Main branch protected. Required: passing CI checks + 1 self-approval (since solo dev).

---

## 15. Effort Estimate

Rough sizing (for the writing-plans phase to refine):

| Task | Estimate |
|---|---|
| Static data files (`arena_fighters.json`, `arena_tip_npcs.json`) | 0.5 day |
| `Math_` module + tests | 1 day |
| `Schedule` + `State` modules | 1 day |
| `Api` module | 0.5 day |
| Page UI (`arena.html` + the 4 component files) | 2 days |
| Cloudflare Worker (all endpoints) | 1 day |
| Worker tests | 0.5 day |
| `index.html` arena panel | 0.5 day |
| Privacy / 404 / `_headers` / OG / favicon | 0.5 day |
| CI workflow | 0.5 day |
| Manual testing pass | 1 day |
| **Total** | **~9 days of focused work for v1** |

---

## 16. Open TODOs (carry into implementation phase)

1. **TODO-1:** Verify schedule anchor (assumed midnight EST). One-line constant fix if wrong.
2. **TODO-2:** Verify fighter list completeness (have 7 from truncated wiki page; could be 10).
3. **TODO-3:** Verify favor-level thresholds for all tip-NPCs except Mandibles.
4. **TODO-4:** Verify tips-per-day cap (~12 estimated).
5. **TODO-5:** Final domain selection for GitHub Pages and Worker (custom domain optional).

None of these block implementation; all are content questions resolvable during play-testing.

---

## 17. Out of Scope (deferred to v2+)

- Build planner with treasure-roll explorer
- Storage page (gift recipient finder, sellables, route optimization)
- Leveling pathfinder
- Item source explorer
- Chat-log integration via FSA
- **FiteClub chat-channel parser** — players sometimes share tips via the `FiteClub` chat channel using a compact format. v2 candidate for a paste-or-import flow that pre-fills the TipForm:
  - Per-fighter line: `<initial> <±N>%` optionally with `(<note>)` — regex `/^([A-Z])\s+([+-]?\d+)%(?:\s*\(([^)]*)\))?/`
  - Matchup line: `<initial>><initial> +N%` — regex `/^([A-Z])>([A-Z])\s+([+-]?\d+)%/`
  - Multiple tips per message; cancellations done by re-posting inverse sign.
  - Fighter initials are currently unique (C/D/G/L/O/U/V) so single-letter mapping is unambiguous; revisit if a new fighter collides.
- Wiki extraction layer for monster drops
- Gardening / cheese box / mushroom box / boss respawn timers
- Real-time push (WebSockets)
- PWA / offline mode
- Mobile-native interactions (PWA install)
- Localization

---

## Approval

**Pending: user review of this written form.** Once approved, transition to writing-plans skill for implementation plan.
