# TICKET-ML-17 — Training date-range filter

- **Area:** Auto-categorisation
- **Type:** Feature
- **Traceability:** extends FR-ML-5, FR-ML-7, FR-ML-10/FR-ML-12 (new)

## User story

As a user, I want to restrict model training to a date range of my transactions, so old categorisation
habits that no longer reflect how I categorise today don't muddy the model's predictions.

## Description

Adds an optional "training window" date range to the Learning page: when set, `CategoryModelStore.train()`
only draws labelled samples from transactions inside that range instead of the user's entire categorised
history. Spending habits, merchants, and category choices drift over time (job change, moved house, a
category that used to mean one thing and now means another) — training on everything ever categorised can
teach the model outdated associations. This ticket lets the user say "only learn from the last N months" (or
any explicit range) without deleting or excluding the older transactions from anything else in the app.

## Current situation (as-is)

- [category-model.store.ts:153-168](../../../src/app/feature-categories/category-model.store.ts) — `train()`
  takes no arguments and builds `samples` from **every** transaction in
  `transactionsStore.transactions()` that has a `categoryId` in an active category — no date filtering
  exists anywhere in the training path.
- [model-status.component.ts:98-112](../../../src/app/feature-learning/components/model-status/model-status.component.ts) —
  `labelledTransactionCount` mirrors that same unfiltered count for the "not enough data" copy; `train()`
  at line 123 calls `categoryModelStore.train()` with no parameters.
- [model-config.ts](../../../src/app/core/ml/model-config.ts) — `MIN_TRAINING_LABELS = 25` and
  `MIN_CATEGORIES = 2` are the only training-eligibility gates today; no notion of a date window.
- `docs/v1.8_extended_date_range_picker/requirements.md` describes a full Grafana-style date-range picker
  that hasn't been ticketed or built yet — out of scope as a dependency here (see Notes).

## Desired result (to-be)

- `CategoryModelStore` gains a `trainingDateRange` signal (`{ from: string; to: string } | null`,
  ISO date strings, `null` = no restriction, the existing all-history behaviour) plus a
  `setTrainingDateRange(range: { from: string; to: string } | null)` method. Persisted via the existing
  `CategoryModelRepository`/`categoryModel` table so the chosen window survives a reload (additive field on
  the existing persisted artifact/config, no new Dexie table or version needed unless the current shape
  can't hold it — reuse `categoryModel`'s row if it can).
- `train()` filters `transactionsStore.transactions()` by `transaction.date` against `trainingDateRange`
  (when non-null) before building `samples`, in addition to the existing `categoryId`/active-category filter.
- `ModelStatusComponent` (Learning page) gains a simple "Training data range" control — two native date
  inputs (from/to) plus a "Clear" affordance to go back to unrestricted — wired to
  `categoryModelStore.setTrainingDateRange`. No dependency on the unbuilt v1.8 picker; a plain
  daisyUI/Tailwind date-input pair is sufficient here.
- `labelledTransactionCount` (and the "not enough data" messaging) reflects the same date-filtered count
  the next `train()` call would actually use, so the displayed number never disagrees with training
  eligibility.
- Selecting or changing the range does not retrain automatically — it only affects the *next* Train/Retrain
  click, consistent with the existing manual-only training model (no auto-retrain-on-change).

## Acceptance criteria

- [ ] `CategoryModelStore` exposes `trainingDateRange` (signal) and `setTrainingDateRange()`; default is
      `null` (unrestricted, matching today's behaviour exactly — no regression for users who never touch
      this control).
- [ ] `train()` excludes transactions outside `trainingDateRange` (when set) from `samples`, using an
      inclusive from/to comparison on `transaction.date`.
- [ ] The chosen range is persisted through `CategoryModelRepository` (not a direct `appDb` write) and
      restored on app reload.
- [ ] `ModelStatusComponent`'s date-range control renders on the Learning page, updates the store on change,
      and offers a way to clear back to unrestricted.
- [ ] `labelledTransactionCount` / the "not enough data" copy use the same date-filtered sample count as
      `train()` would, verified by a test that sets a narrow range and confirms both the displayed count and
      the eligibility gate (`MIN_TRAINING_LABELS`) move together.
- [ ] Unit tests cover: `train()` with `trainingDateRange = null` (unchanged all-history behaviour), `train()`
      with a range that excludes some but not all labelled transactions, a range that drops the sample count
      below `MIN_TRAINING_LABELS` (falls back to `'not-enough-data'`), and range persistence round-trip
      through the repository.
- [ ] `categoryManual` and every other existing training/suggestion behaviour is unaffected when
      `trainingDateRange` is `null`.
- [ ] Verified via the fallow skill and coding-conventions skill.

## Notes

- Deliberately does **not** depend on `docs/v1.8_extended_date_range_picker` — that's an unticketed, unbuilt
  Grafana-style picker. This ticket uses a minimal two-date-input control so it isn't blocked on that work;
  if the v1.8 picker ships later, swapping it in here is a natural (optional) follow-up, not a prerequisite.
- Scope is training-sample selection only — it does not hide, archive, or otherwise affect the older
  transactions anywhere else in the app (transactions list, stats, rules). They stay fully visible and
  categorised as before; they're simply excluded from what the model learns from.
- A relative "last N months" quick-pick is a reasonable follow-up but not required here — explicit from/to
  dates cover the core need.
