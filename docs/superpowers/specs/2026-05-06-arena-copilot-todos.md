# Arena Copilot — Outstanding TODOs

These items from the spec require in-play observation before being marked verified:

- **TODO-1:** Confirm fight schedule anchor is midnight EST. If wrong, change `EST_OFFSET_HOURS` in both `public/js/schedule.js` and `worker/src/schedule.ts`.
- **TODO-2:** Verify the full arena fighter list. Currently 7 entries from a truncated wiki page; could be 10. If different, update `public/data/arena_fighters.json` and the `KNOWN_FIGHTERS` var in `worker/wrangler.toml`.
- **TODO-3:** Verify favor thresholds for tip-NPCs other than Mandibles. Update `public/data/arena_tip_npcs.json` `favor_required` field and flip `verified: true` as confirmed.
- **TODO-4:** Verify total tips-per-day limit (~12 estimated). No code change expected; informational only.
- **TODO-5:** Final domain decision (`gorgon-arena.workers.dev` placeholder is in CSP and code). Update if a custom domain is acquired.
- **TODO-6:** Generate `public/favicon.ico` from `public/icon.svg`.
- **TODO-7:** First-deploy steps — create Cloudflare KV namespaces, replace placeholders in `worker/wrangler.toml`, run `npx wrangler deploy`, configure GitHub Pages source to `main` / `/public`. See README "Deployment" section.
- **TODO-8:** Manual test pass — walk through every checkbox in `MANUAL_TEST.md` after first deploy and tick each box as confirmed in production.
- **v2:** FiteClub chat-channel parser — see §17 of the design spec for format and regex.
