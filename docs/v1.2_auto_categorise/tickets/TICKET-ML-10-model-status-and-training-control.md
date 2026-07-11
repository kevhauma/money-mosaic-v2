# TICKET-ML-10 — Model status chip + Train/Retrain control

- **Area:** Auto-categorisation
- **Type:** Feature
- **Traceability:** adds FR-ML-10 (new)

## User story

As a user, I want to see whether the auto-categoriser has a trained model, how accurate it is, and when it
was last trained, and to (re)train it with one click, so I understand what's driving the suggestions I see
and stay in control of when training happens.

## Description

A small status component — a chip reflecting `CategoryModelStore`'s status (untrained / not enough data /
training / ready / stale / error), last-trained time, accuracy, and a Train/Retrain button — mounted on the
categories page (there is no dedicated settings page for this app).

## Current situation (as-is)

- [categories-overview.component.html](../../../src/app/feature-categories/components/categories-overview/categories-overview.component.html) /
  [.ts](../../../src/app/feature-categories/components/categories-overview/categories-overview.component.ts) has no model-status concept — this is the chosen
  mount point since no settings page exists anywhere in the app.
- No status-chip pattern exists yet specific to this feature; `AlertComponent`
  ([shared/ui](../../../src/app/shared/ui/)) and `BadgeComponent` are the existing primitives to compose
  from.

## Desired result (to-be)

- New `feature-categories/components/model-status/model-status.component.{ts,html}`:
  - Injects `CategoryModelStore` (ML-07).
  - Renders a status chip whose label/tone maps from `status()`:
    - `'untrained'` → neutral, "Not trained yet."
    - `'not-enough-data'` → neutral/info, actionable copy (e.g. "Categorise a few more transactions across
      at least two categories before training.")
    - `'training'` → spinner + "Training…", Train/Retrain button disabled meanwhile.
    - `'ready'` → success tone, shows `lastTrainedAt` (formatted) and `metrics.accuracy` (as a percent).
    - `'stale'` → warning tone, "Categories changed since training — retrain to refresh suggestions.",
      button label becomes "Retrain".
    - `'error'` → error tone, generic retry copy.
  - A Train/Retrain button (hidden or disabled during `'training'`) calls `categoryModelStore.train()`.
  - Mounted on `categories-overview.component.html`, added to its `imports` array.

## Acceptance criteria

- [ ] Each of the six statuses renders distinct, accurate copy and tone (no shared generic fallback text that fails to distinguish `'error'` from `'not-enough-data'`, for instance).
- [ ] The Train/Retrain button is disabled (or hidden) while `status() === 'training'`, preventing a second concurrent `train()` call.
- [ ] `'ready'` state displays `lastTrainedAt` in a human-readable format and `metrics.accuracy` as a whole percent.
- [ ] `'stale'` state's button reads "Retrain" (not "Train"), per the design's staleness-relabelling requirement.
- [ ] Clicking the button calls `CategoryModelStore.train()` exactly once per click, regardless of current status (as long as it isn't disabled).
- [ ] Only existing shared UI primitives (`AlertComponent`, `BadgeComponent`, `ButtonComponent`) are used for tone/layout — no new raw Tailwind color classes hand-picked per status.
- [ ] Mounted on `categories-overview.component.html` and added to its `imports` array.
- [ ] Unit tests cover: each status renders its expected copy/tone/button-disabled-state; clicking Train/Retrain calls `train()`; the button is inert during `'training'`.
- [ ] Verified live in the browser: with too little categorised data, the component shows the actionable "not enough data" copy; after categorising enough data and clicking Train, it shows a spinner then a success/accuracy state; renaming or removing a category flips it to the "stale"/"Retrain" state.
- [ ] Verified via the fallow skill and coding-conventions skill.

## Notes

- Independent of ML-08/ML-09 — all three are thin UI consumers of `CategoryModelStore` (ML-07) and can be
  built in parallel.
- No dashboard integration — per the version overview, this stays scoped to the categories page; a
  dashboard stat card is explicitly out of scope for v1.2.
