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

Static site: GitHub Pages, source = `main` / `/public`.

Worker (one-time setup):

1. Create a Cloudflare KV namespace, paste its ID into `worker/wrangler.toml`.
2. `cd worker && npx wrangler deploy`
3. If your Worker URL isn't `gorgon-arena.workers.dev`, update the hardcoded
   references in `public/arena.html` (CSP `connect-src`), `public/index.html`
   (CSP + arena panel `API_BASE`), and `public/js/api.js` (`_base()`).
