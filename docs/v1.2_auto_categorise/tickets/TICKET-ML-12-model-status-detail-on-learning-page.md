# TICKET-ML-12 — Model status + training detail moved and expanded on the Learning page

- **Area:** Auto-categorisation
- **Type:** Refactor + Feature
- **Traceability:** extends FR-ML-10; adds FR-ML-12 (new)

## User story

As a user, I want to see everything about the auto-categoriser's current state — not just a status chip, but
what it actually knows (how many labelled examples, how many categories, when it was last trained, how
confident it is) — in one place, so I understand what's driving the suggestions I see.

## Description

Relocates `ModelStatusComponent` from the categories page to the new Learning page (ML-11) and expands it
with more diagnostic detail already available on `CategoryModelStore` but not currently surfaced, per the
feedback that "the model status is not clear at all."

## Current situation (as-is)

- [model-status.component.ts](../../../src/app/feature-categories/components/model-status/model-status.component.ts)
  (`ModelStatusComponent`, selector `app-model-status`) is mounted at
  [categories-overview.component.html:19](../../../src/app/feature-categories/components/categories-overview/categories-overview.component.html#L19).
  It shows: a status chip (label + tone per `CategoryModelStatus`), status copy, `lastTrainedAt`,
  `metrics.accuracy` as a whole percent, and a Train/Retrain button (disabled while `training`, relabelled
  "Retrain" only when `stale`).
- [category-model.store.ts](../../../src/app/feature-categories/category-model.store.ts) already holds, but
  the component doesn't surface: `metrics.trainedSampleCount` (line 27), `categoryIdByIndex.length` (the
  number of classes the current model was trained on, line 29/136/189), and the taxonomy-signature
  comparison that flips `ready`→`stale` (lines 119-120, 59-64 `activeTaxonomySignature`).
- [model-config.ts](../../../src/app/core/ml/model-config.ts) exposes further static context not shown
  anywhere: `MIN_TRAINING_LABELS` (25), `MIN_CATEGORIES` (2), `DEFAULT_FEATURE_CONFIG.dim` (8192 feature
  hash buckets), `MODEL_SCHEMA_VERSION`.
- [categories-overview.component.html](../../../src/app/feature-categories/components/categories-overview/categories-overview.component.html)
  line 19 mounts `<app-model-status />`; `categories-overview.component.ts`'s `imports` array includes
  `ModelStatusComponent`.

## Desired result (to-be)

- `ModelStatusComponent` (and its spec) physically relocate from
  `feature-categories/components/model-status/` to `feature-learning/components/model-status/`, importing
  `CategoryModelStore` from the `@/feature-categories` barrel (cross-feature import through the barrel, per
  [CLAUDE.md](../../../CLAUDE.md)'s hard rule) instead of the relative sibling path it used to use.
- `<app-model-status />` is removed from `categories-overview.component.html` and from that component's
  `imports` array; it's added to `learning-overview.component.html` (ML-11) and that component's `imports`.
- The component gains, alongside its existing chip/date/accuracy/button:
  - Trained-sample count and class count when `metrics`/`categoryIdByIndex` are populated (`'ready'` or
    `'stale'`): "Trained on {trainedSampleCount} labelled transactions across {categoryIdByIndex.length}
    categories."
  - In `'not-enough-data'`, the concrete numbers instead of only generic copy: how many labelled
    transactions and active categories exist now vs. the `MIN_TRAINING_LABELS`/`MIN_CATEGORIES` floor (this
    ticket adds read-only computed signals on the component for current label/category counts, sourced the
    same way `CategoryModelStore.train()` counts them — active categories with a `categoryId` set — not new
    store state).
  - In `'stale'`, which changed: the component can't diff old vs. new taxonomy (only a hash is persisted),
    so it keeps the existing generic "categories changed" copy but now also shows the last-known
    `trainedSampleCount`/class count for context.
- Visualising the network itself stays explicitly out of scope ("fun but not necessary" per the feedback
  file) — no charts, no weight/layer visualisation.

## Acceptance criteria

- [x] `ModelStatusComponent` no longer renders on `/categories`; it renders on `/learning` instead.
- [x] Each of the six statuses still renders distinct, accurate copy and tone (no regression from ML-10's
      original acceptance criteria).
- [x] `'ready'`/`'stale'` states additionally show trained-sample count and category count from
      `metrics.trainedSampleCount`/`categoryIdByIndex.length`.
- [x] `'not-enough-data'` shows the current labelled-transaction count and active-category count against the
      `MIN_TRAINING_LABELS`/`MIN_CATEGORIES` thresholds, not just generic copy.
- [x] The Train/Retrain button's existing behaviour (disabled during `'training'`, relabelled "Retrain" only
      when `'stale'`, calls `CategoryModelStore.train()` exactly once per click) is unchanged.
- [x] Only existing shared UI primitives (`AlertComponent`, `BadgeComponent`, `ButtonComponent`) are used —
      no new raw Tailwind colour classes hand-picked per status.
- [x] `CategoryModelStore` is injected via the `@/feature-categories` barrel from the component's new
      location, not a relative path reaching back into `feature-categories`.
- [x] Unit tests (moved + extended) cover: each status's copy/tone/button-disabled-state as before, plus the
      new sample/category-count display in `'ready'`/`'stale'`/`'not-enough-data'`.
- [x] Verified live in the browser: `/categories` no longer shows the model status card; `/learning` shows
      it with the expanded detail in each reachable status (untrained, not-enough-data, ready after
      training).
- [x] Verified via the fallow skill and coding-conventions skill.

## Notes

- Needs ML-11 (the `/learning` shell to mount into).
- Independent of ML-13/ML-14 — all three relocate/build distinct pieces of `/learning`'s content and can be
  built in parallel once ML-11 lands.
- `CategoryModelStore`/`CategoryModelService` themselves stay in `feature-categories` — only the UI
  component moves. Relocating the store as well was considered but is out of scope: it's an internal
  implementation detail the feedback file doesn't ask to change, and moving it adds refactor risk (import
  churn across every consumer) with no user-facing benefit.
