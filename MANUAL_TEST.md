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
