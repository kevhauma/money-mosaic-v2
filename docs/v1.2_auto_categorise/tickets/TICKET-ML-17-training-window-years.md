# TICKET-ML-17 — Training window: previous N years

- **Area:** Auto-categorisation
- **Type:** Feature
- **Traceability:** extends FR-ML-5, FR-ML-7, FR-ML-10/FR-ML-12 (new)

## User story

As a user, I want to restrict model training to the last N years of my transactions, so old categorisation
habits that no longer reflect how I categorise today don't muddy the model's predictions.

## Description

Adds an optional "training window" to the Learning page: when set, `CategoryModelStore.train()` only draws
labelled samples from transactions dated within the last N years instead of the user's entire categorised
history. Spending habits, merchants, and category choices drift over time (job change, moved house, a
category that used to mean one thing and now means another) — training on everything ever categorised can
teach the model outdated associations. This ticket lets the user say "only learn from the last N years"
via a simple preset selector, without deleting or excluding the older transactions from anything else in
the app.

A relative "previous N years" control is deliberately simpler than a free from/to date-range picker: it
covers the actual need (discount stale history) with one choice instead of two, needs no date-input
validation (from ≤ to, etc.), and reads clearly on the Learning page ("Training window: last 2 years").

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

- `CategoryModelStore` gains a `trainingWindowYears` signal (`number | null`, `null` = no restriction, the
  existing all-history behaviour) plus a `setTrainingWindowYears(years: number | null)` method. Persisted
  via the existing `CategoryModelRepository`/`categoryModel` table so the chosen window survives a reload
  (additive field on the existing persisted artifact/config, no new Dexie table or version needed unless
  the current shape can't hold it — reuse `categoryModel`'s row if it can).
- `train()` filters `transactionsStore.transactions()` by `transaction.date >= (today - trainingWindowYears
  years)` (when `trainingWindowYears` is non-null) before building `samples`, in addition to the existing
  `categoryId`/active-category filter. The cutoff is computed at train time (relative to "now"), not stored
  as a fixed date.
- `ModelStatusComponent` (Learning page) gains a simple "Training window" control — a daisyUI select/segmented
  control with preset options (e.g. Last 1 year / Last 2 years / Last 3 years / Last 5 years / All time),
  wired to `categoryModelStore.setTrainingWindowYears`. "All time" maps to `null`. No free date inputs, no
  dependency on the unbuilt v1.8 picker.
- `labelledTransactionCount` (and the "not enough data" messaging) reflects the same window-filtered count
  the next `train()` call would actually use, so the displayed number never disagrees with training
  eligibility.
- Selecting or changing the window does not retrain automatically — it only affects the *next* Train/Retrain
  click, consistent with the existing manual-only training model (no auto-retrain-on-change).

## Acceptance criteria

- [x] `CategoryModelStore` exposes `trainingWindowYears` (signal) and `setTrainingWindowYears()`; default is
      `null` (unrestricted, matching today's behaviour exactly — no regression for users who never touch
      this control).
- [x] `train()` excludes transactions older than `trainingWindowYears` years before "now" (when set) from
      `samples`, using an inclusive cutoff comparison on `transaction.date`.
- [x] The chosen window is persisted through `CategoryModelRepository` (not a direct `appDb` write) and
      restored on app reload.
- [x] `ModelStatusComponent`'s training-window control renders on the Learning page with preset options
      (e.g. 1/2/3/5 years plus "All time"), updates the store on change, and "All time" clears back to
      unrestricted (`null`).
- [x] `labelledTransactionCount` / the "not enough data" copy use the same window-filtered sample count as
      `train()` would, verified by a test that sets a narrow window and confirms both the displayed count and
      the eligibility gate (`MIN_TRAINING_LABELS`) move together.
- [x] Unit tests cover: `train()` with `trainingWindowYears = null` (unchanged all-history behaviour), `train()`
      with a window that excludes some but not all labelled transactions, a window that drops the sample count
      below `MIN_TRAINING_LABELS` (falls back to `'not-enough-data'`), and window persistence round-trip
      through the repository.
- [x] `categoryManual` and every other existing training/suggestion behaviour is unaffected when
      `trainingWindowYears` is `null`.
- [x] Verified via the fallow skill and coding-conventions skill.

## Notes

- Deliberately does **not** depend on `docs/v1.8_extended_date_range_picker` — that's an unticketed, unbuilt
  Grafana-style picker, and a free from/to range is more control than this need requires. A preset "previous
  N years" selector covers the core need (discount stale history) with a simpler, less error-prone UI.
- Scope is training-sample selection only — it does not hide, archive, or otherwise affect the older
  transactions anywhere else in the app (transactions list, stats, rules). They stay fully visible and
  categorised as before; they're simply excluded from what the model learns from.
- If a genuine need for an arbitrary from/to training window emerges later, it's a natural follow-up once
  the v1.8 picker exists — not a prerequisite for this ticket.
