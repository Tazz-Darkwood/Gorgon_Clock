# Gorgon Clock

A temporal dashboard for the MMO **Project: Gorgon** — fan-made, browser-only.

## What it is

The home page is a real-time clock that translates real time into Gorgon (PG) time
and surfaces in-game events with chime alerts. The arena copilot (`/arena.html`) is
a betting assistant for the Red Wing Casino: it aggregates Hot Tips you've gathered
in-game, computes win probabilities, and uses the Kelly criterion to recommend an
optimal bet size given your bankroll.

## Architecture

- Static frontend on Render (vanilla JS, no bundler, no framework)
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

## Deployment

### Static site (Render)

Render auto-deploys from `main` whenever it changes. The Render service is configured
once via its dashboard (publish directory: `public/`); no code config lives in this repo.
Live at https://darkwood-clock.onrender.com/.

### Worker (Cloudflare)

The Worker is deployed manually from a terminal. **Do this any time you change anything
under `worker/src/`** — Render does not deploy the Worker, only the static site.

**Step 1.** Pull latest main:

```bash
git checkout main
git pull
```

**Step 2.** Step into the worker directory. ⚠️ This matters: running `wrangler deploy`
from the repo root deploys the wrong thing.

```bash
cd worker
```

**Step 3.** Install deps (only needed the first time, or when `package.json` changes):

```bash
npm install
```

**Step 4.** Deploy:

```bash
npx wrangler deploy
```

The first time you do this, wrangler opens a browser tab to log into Cloudflare —
approve it. Afterward, the last few lines of output print the live Worker URL,
which should be:

```
https://orgon--lock.steven-bayiates.workers.dev
```

**Step 5.** Smoke-test by opening that URL with `/v1/health` appended. You should
see `{"ok":true,"ts":"..."}`. Then load https://darkwood-clock.onrender.com/arena.html
and confirm the red "Can't reach shared state" banner is NOT showing.

### One-time setup (already done)

For future maintainers spinning up a fresh deployment:

1. Create three Cloudflare KV namespaces in the dashboard: `STATE`, `STATE_PREVIEW`, `STATE_TEST`.
2. Paste the three IDs into `worker/wrangler.toml`.
3. The Worker name in `wrangler.toml` (`orgon--lock`) determines the workers.dev subdomain.
   If you change it, update the hardcoded URL in three places: CSP `connect-src` in
   `public/arena.html` and `public/index.html`, plus the production branch of `_base()`
   in `public/js/api.js` and `API_BASE` in the inline script of `public/index.html`.
4. The CORS allowlist `ALLOWED_ORIGINS` in `worker/wrangler.toml` lists which static-site
   origins the Worker accepts requests from. If you move the static site, update it.

### Common deploy mistakes

- **`wrangler deploy` from the repo root.** Wrangler picks up the closest config; running
  from the root means it ignores `worker/wrangler.toml`. Always `cd worker` first.
- **The deployed URL doesn't match the hardcoded one.** If Cloudflare prints a different
  URL than `orgon--lock.steven-bayiates.workers.dev` (e.g., a different account
  subdomain), the browser code can't reach it. Fix by updating the four references in
  the previous section, or rename the Worker via `wrangler.toml` to match.
