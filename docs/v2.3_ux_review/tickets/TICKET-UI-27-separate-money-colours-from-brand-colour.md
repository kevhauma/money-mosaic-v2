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

### Implementation note, 2026-08-23 — what "used by every money figure" was taken to mean

The tokens replace the **alert palette wherever a money figure's colour is decided by its sign**. They
do not repaint figures that were deliberately uncoloured: the transactions table, the import preview
and the two suggestion lists mark losses only and leave a positive amount in the body ink, because
tinting every positive row green would colour most of a long table. That split is the reason
`money-color.ts` exports two helpers rather than one — `moneyColor` for a sign-coloured figure,
`negativeMoneyColor` for a losses-only surface.

Growth **percentages** (`income-growth-panel`, `income-yearly-panel`) and the over/under-average
badges (`category-comparison-panel`, `income-events-sidebar`) keep `success`/`warning`: they are not
money figures, and `warning` was never one of the two colours in collision.

- [x] Dedicated money-positive / money-negative custom properties exist and are used by every money figure, including the Net worth tile. (`--mm-money-positive` / `--mm-money-negative`, declared in all ten daisyUI theme blocks and consumed by the un-layered `.mm-money-positive` / `.mm-money-negative` hooks in `styles.css`. Reached from markup through `MoneyTextColor` on `mm-text`/`mm-stat-card` and the `moneyColor` / `negativeMoneyColor` helpers. Converted: the Net worth tile and Net cash flow tile (`dashboard-overview`), `account-balance-block`, `top-transactions-panel`, `transaction-row`, `suggestions-table`, `rule-proposals`, `transfer-review`, `import-preview-step`.)
- [x] In both default themes, a positive figure is visually distinguishable at a glance from a negative one, and neither is the brand red. (The Net worth tile is sign-coloured instead of `color="primary"`, so a positive figure now renders `--mm-money-positive` — the success green at hue 145 — against the brand coral at hue 25. `--color-error` moved from hue 20 to hue 0 in both defaults, 25° clear of the brand.)
- [x] The Net worth tile retains its existing hero styling hooks across all ten themes (no regression in `mm-net-worth` plate/blob rendering). (True by construction: the plate, wash and label colours come from the `.mm-net-worth.stat` rules in `styles.css` and the three per-theme overrides in `anti-polish` / `memphis` / `skeuomorphism`, all keyed on the class. Only the `color` input on the figure changed; `class="mm-net-worth"` is untouched.)
- [x] A guard fails when a theme's primary and error hues are within a stated minimum distance — an automated check, not a review convention. Applies to all ten themes; `retro-futurism` (14°) is the closest existing case and must either pass or be adjusted. (`src/themes/theme-palette.spec.ts` parses the real `styles.css` and `src/themes/*.css` off disk — not a fixture copy — and fails any theme under `MIN_BRAND_ERROR_HUE_DISTANCE = 20`. It also asserts the exact set of ten theme names, so a theme that stops parsing fails loudly rather than skipping its own guard, and that every theme block states its own `--mm-money-*` pair. `retro-futurism` was adjusted: error hue 28 → 15, now 27° from its amber primary.)
- [x] Unit tests cover: a positive amount resolves the positive token; a negative amount resolves the negative token; the hue-distance guard fails a deliberately-colliding fixture theme. (`money-color.spec.ts` — positive, negative, zero-is-positive, and "never returns a daisyUI palette name". `typography.component.spec.ts` — the money colours resolve to `.mm-money-*` hook classes, not `text-*` utilities. `theme-palette.spec.ts` — a fixture theme carrying the exact `primary 25 / error 20` pair the defaults shipped with is reported as colliding at 5°. 3393 tests green.)
- [ ] Verified live in the browser across the default light theme, the default dark theme, and at least `retro-futurism` and `memphis`. — **deferred, not skipped**: the user chose a single browser pass over the whole v2.3 batch rather than one per ticket; tick this when that pass runs.
- [x] Verified via the fallow skill and coding-conventions skill. (`npx fallow dead-code --baseline … --fail-on-issues` and `npx fallow health --complexity …` both exit 0. `conventions-reviewer` raised six items; four were applied in a follow-up: `MoneyTextColor` and both helpers moved to `shared/utils/money-color.ts` — the convention is that formatting helpers live in `shared/utils`, and the cycle argument for keeping them in `shared/ui` did not hold since a `type` import is erased; `MM_MONEY_POSITIVE_CLASS`/`MM_MONEY_NEGATIVE_CLASS` joined `theme-hooks.ts` beside the other hook constants; the three raw `[class.mm-money-negative]` bindings became `mm-text [color]`; and the five inline `amount < 0 ? … : …` ternaries moved onto row view-models (`TransactionRowVm.amountColor`, `SuggestionRow.amountColor`, `previewRows`) or onto a bound `amountColor` field. Its two remaining points are notes, recorded below.)

## Notes

- Do not "fix" this by changing the Net worth tile to `color="success"` — every money figure in the app has the same exposure, and the next theme would reintroduce it. The token plus the guard is the fix.
- Choosing the minimum hue distance is a design call; 20° was the reviewer's suggestion but the number should be set deliberately and recorded in the guard.
- Related: [TICKET-SET-10](./TICKET-SET-10-default-locale-to-belgian.md) — the other change that touches every screen at once.
- **Why the error hue moved rather than the brand hue.** The deformable design language is coral /
  periwinkle / mint (`design-language.md` §1) — coral at hue 25 *is* the brand, so moving
  `--color-primary` would be a redesign, not a fix. `--color-error` moved to hue 0 instead: still
  unmistakably an alert colour, 25° clear of the brand, and the same re-hue applied to both light and
  dark so the two modes stay consistent.
- **The floor is 20°, recorded in `MIN_BRAND_ERROR_HUE_DISTANCE`** with the reasoning beside it:
  `memphis` at 35° is the closest theme that was already fine and `retro-futurism` at 14° is the one
  that had to move, so 20 sits in the gap between the two. Raising it re-opens several palettes;
  lowering it puts the original bug back in reach.
- **`money-color.ts` lives in `shared/utils/` and owns `MoneyTextColor`.** It was first written into
  `shared/ui/typography/` on the theory that returning a `TextColor` member would close a barrel
  cycle the other way round; the conventions review pointed out that the import is type-only and so
  erased at compile time, and that formatting helpers belong in `shared/utils` regardless.
  `typography.component.ts` now imports the union rather than declaring it, which also stops
  `money-color.ts` importing a type through a component file.
- **Two figures deliberately left on the alert palette**, both checked and both out of scope by the
  implementation note above: `loan-what-if`'s "net saved" reads `warning` when negative (a warning,
  not a loss), and `anti-polish` pins the Net worth figure to its plate ink at specificity 0,4,0,
  which outranks `.mm-money-*` — that is the hero treatment AC 3 protects, so it stays, and it is on
  the list for the deferred browser pass.
