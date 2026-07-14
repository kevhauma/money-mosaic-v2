# TICKET-ML-16 — Confidence-gradient colouring for the suggestion badge

- **Area:** Auto-categorisation
- **Traceability:** extends FR-ML-13 (suggestions table); adds FR-ML-16

## User story

As a user reviewing the suggestions table, I want the suggested-category badge's colour to reflect how
confident the model is — red for low confidence, green for high confidence — so I can tell at a glance which
suggestions are worth a closer look before accepting them.

## Description

Colours the "Suggested" badge in the Learning page's suggestions table on a continuous red-to-green scale
driven by `row.confidence`, instead of the single flat outline colour it uses today. Text (name + percentage)
is unchanged; only the badge's colour becomes confidence-driven.

## Current situation (as-is)

- [suggestions-table.component.html:50-52](../../../src/app/feature-learning/components/suggestions-table/suggestions-table.component.html#L50-L52)
  renders every suggestion with the same `<mm-badge variant="outline" size="sm">{{ row.suggestedCategoryName }}
  ({{ row.confidence * 100 | number: '1.0-0' }}%)</mm-badge>` — colour does not vary with `row.confidence`.
- [badge.component.ts](../../../src/app/shared/ui/badge/badge.component.ts): `BadgeComponent` only accepts a
  fixed discrete `BadgeColor` (`neutral | primary | secondary | accent | info | success | warning | error`)
  mapped straight to a daisyUI `badge-*` class — there is no mechanism today for a continuously-interpolated
  colour driven by a numeric value.
- `row.confidence` ([suggestions-table.component.ts](../../../src/app/feature-learning/components/suggestions-table/suggestions-table.component.ts))
  is already a `0..1` float sourced from `CategoryModelStore.suggestions()`, so the value needed for the
  gradient is already on the row — no store/model change required.

## Desired result (to-be)

- The suggestion badge's background/border colour interpolates continuously between red (confidence → 0) and
  green (confidence → 1), rather than snapping between a small number of discrete daisyUI colour classes.
- Since `BadgeComponent`'s `color`/`variant` inputs only support the fixed daisyUI palette, the gradient is
  applied as an inline computed style (e.g. an HSL or RGB interpolation from a pure helper function) passed
  via `BadgeComponent`'s existing `class`/host binding, or a new opt-in input on `BadgeComponent` if inline
  styling on a shared UI primitive is judged against convention — implementer's call, but the interpolation
  math itself must live in a small, independently unit-testable pure function (e.g.
  `core/ml/` or `shared/utils/`), not inlined in the template.
- Colour is computed per row from `row.confidence`; text content and layout are unchanged.
- Contrast: the interpolated colour must keep the badge text legible at both ends of the gradient and in dark
  mode (e.g. drive only the background/border hue and keep a fixed readable text colour, or verify computed
  contrast at both extremes) — check visually in the browser per the acceptance criteria below.

## Acceptance criteria

- [x] A pure function (unit-testable in isolation) maps a `0..1` confidence value to a red→green colour,
      verified at `0`, `1`, and at least one midpoint.
- [ ] The suggestions-table badge's colour visibly changes with `row.confidence` — a low-confidence row (e.g.
      near 0.5, the acceptance-threshold floor) reads visibly redder than a high-confidence row (e.g. near
      1.0), verified live in the browser with rows spanning the range.
- [ ] Badge text stays legible against the interpolated colour at both the low and high ends of the range, in
      both light and dark theme.
- [x] No other badge usage in the app (e.g. `rule-proposals` or elsewhere) is affected — the gradient applies
      only to the suggestions-table suggested-category badge.
- [x] Unit tests cover: the colour-interpolation function's boundary and midpoint values; the suggestions-table
      component passing the correct computed colour/style per row.
- [ ] Verified live in the browser: `/learning`'s suggestions table shows a visible red-to-green spread across
      rows of differing confidence.
- [ ] Verified via the fallow skill and coding-conventions skill.

## Notes

- Needs [TICKET-ML-13](./TICKET-ML-13-suggestions-table-on-learning-page.md) (creates the suggestions table
  and badge this ticket recolours) — independent of every other open ticket otherwise, can ship any time
  after ML-13.
- Purely presentational — no change to `CategoryModelStore`, the training worker, or any Dexie table.
- Scope is the suggestions-table badge only; the `mm-badge`'s discrete daisyUI-colour API for every other
  caller in the app is unchanged.
