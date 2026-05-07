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
