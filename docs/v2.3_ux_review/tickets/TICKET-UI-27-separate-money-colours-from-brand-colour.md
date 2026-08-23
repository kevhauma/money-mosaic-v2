# TICKET-UI-27 — Positive net worth renders in the same red as a loss

- **Area:** UI / Theming
- **Type:** Bug fix
- **Traceability:** UX review (UXR-4); extends the money-display convention — `--color-primary` and `--color-error` are five degrees of hue apart in both default themes

## User story

As someone glancing at my dashboard, I want a positive number to look positive, so that my own net worth does not read as an alarm.

## Current situation (as-is)

The dashboard's Net worth tile passes `color="primary"` ([dashboard-overview.component.html:65](../../../src/app/feature-dashboard/components/dashboard-overview/dashboard-overview.component.html)). That is a deliberate hero treatment with per-theme style hooks (`mm-net-worth`), not a stray utility class — so the defect is in the palette, not the markup.

In [styles.css](../../../src/styles.css) the two default themes set:

| Theme | `--color-primary` | `--color-error` | Hue distance |
|---|---|---|---|
| default light | `oklch(68% 0.19 25)` | `oklch(64% 0.21 20)` | **5°** |
| default dark | `oklch(74% 0.18 25)` | `oklch(70% 0.19 20)` | **5°** |

So brand colour, the active-nav pill, the import wizard's current step, and *negative money* are all the same red. A positive net worth of `+€16,898.26` renders in the loss colour, directly beside a green "Net cash flow". Two positive numbers, adjacent, opposite colour semantics.

This affects only the shipped defaults. Of the eight custom themes in [src/themes/](../../../src/themes/), most keep primary well clear of error — cyberpunk (195 vs 18), liquid-glass (292 vs 22), neumorphism (278 vs 25), skeuomorphism (80 vs 25), anti-polish (100 vs 25). Only `retro-futurism` (42 vs 28, 14°) and `memphis` (350 vs 25, 35°) run close. The experimental themes largely got this right; the theme every user sees first did not.

## Desired result (to-be)

- Money figures are coloured by dedicated semantic tokens (positive / negative) that no theme may alias to its brand colour.
- The Net worth tile keeps its hero treatment — plate, blob wash, per-theme hooks — without borrowing the error hue for its figure.
- A theme cannot be added in future whose primary is perceptually confusable with its error colour.

## Acceptance criteria

- [ ] Dedicated money-positive / money-negative custom properties exist and are used by every money figure, including the Net worth tile.
- [ ] In both default themes, a positive figure is visually distinguishable at a glance from a negative one, and neither is the brand red.
- [ ] The Net worth tile retains its existing hero styling hooks across all ten themes (no regression in `mm-net-worth` plate/blob rendering).
- [ ] A guard fails when a theme's primary and error hues are within a stated minimum distance — an automated check, not a review convention. Applies to all ten themes; `retro-futurism` (14°) is the closest existing case and must either pass or be adjusted.
- [ ] Unit tests cover: a positive amount resolves the positive token; a negative amount resolves the negative token; the hue-distance guard fails a deliberately-colliding fixture theme.
- [ ] Verified live in the browser across the default light theme, the default dark theme, and at least `retro-futurism` and `memphis`.
- [ ] Verified via the fallow skill and coding-conventions skill.

## Notes

- Do not "fix" this by changing the Net worth tile to `color="success"` — every money figure in the app has the same exposure, and the next theme would reintroduce it. The token plus the guard is the fix.
- Choosing the minimum hue distance is a design call; 20° was the reviewer's suggestion but the number should be set deliberately and recorded in the guard.
- Related: [TICKET-SET-10](./TICKET-SET-10-default-locale-to-belgian.md) — the other change that touches every screen at once.
