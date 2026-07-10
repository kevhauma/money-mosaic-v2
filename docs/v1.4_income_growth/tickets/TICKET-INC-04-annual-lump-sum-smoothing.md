# TICKET-INC-04 — Annual lump-sum smoothing

- **Area:** Income
- **Type:** Feature
- **Traceability:** adds FR-INC-4 (new)

## User story

As a user, I want to optionally mark an income category as an annual lump sum (13th month, vacation pay, a holiday bonus — real income, but deposited once a year), so that single deposit doesn't read as a spike on the by-category trend, a false spurt in the growth-rate panel, or a phantom raise/step-change alert.

## Description

Optional per-category flag so a once-a-year deposit (13th month, vacation pay, holiday bonus) reads as smoothed-in income on the trend/growth/step-change views, rather than a monthly spike or a false raise alert.

## Current situation (as-is)

- `Category` ([app-db.ts](../../../src/app/core/data-access/app-db.ts)) has no field for this; `kind` only distinguishes expense/income/neutral.
- `computeIncomeCategorySeries()` (FR-INC-2) returns the true per-bucket amount for every category, so a June bonus shows as a one-bucket spike.

## Desired result (to-be)

- New optional field on `Category`: `smoothAnnually?: boolean`. Non-indexed, so **no Dexie version bump** — `.stores()` only declares indexes, and this field is never queried by one. Reuses `CategoriesStore.updateCategory(id, { smoothAnnually: true })` (already generic over `Partial<Category>`); a checkbox in [category-form.component.html](../../../src/app/feature-categories/components/category-form/category-form.component.html) ("Spread this category evenly across the year (e.g. a 13th month or holiday bonus)"), visible only when `kind === 'income'`.
- New pure helper `smoothAnnualLumpSums(series, categoriesById, granularity)` in `core/stats/annual-lump-sum-smoothing.ts`: takes `computeIncomeCategorySeries()`'s output; for each category with `smoothAnnually === true`, groups that category's bucket values by calendar year (from `bucketStart`), sums each year's total, and replaces every bucket belonging to that year with `yearTotal / bucketsInThatYear` — only when `granularity === 'month'` (the only granularity where "one big bucket vs. twelve small ones" is the actual problem). For `day`/`week`/`quarter` granularity the function is a documented pass-through no-op for flagged categories.
- FR-INC-2's chart, FR-INC-5's growth panel, and FR-INC-8's step-change detector all consume `smoothAnnualLumpSums(computeIncomeCategorySeries(...), ...)` instead of the raw series directly.

## Acceptance criteria

- [ ] `smoothAnnualLumpSums()` preserves each year's category total exactly (sum of smoothed buckets in a year ≈ sum of raw buckets in that year, within rounding) — unit test asserts this for a category with an all-months-flat pattern plus one spike month.
- [ ] Unflagged categories pass through completely unchanged (reference-equal totals, not just numerically equal) — unit test.
- [ ] `granularity !== 'month'` returns the input series unchanged for every category, flagged or not.
- [ ] Category form shows the "spread evenly" checkbox only for `kind === 'income'`, and it persists via `updateCategory` (no new store method needed).
- [ ] `angular.json` bundle budgets not raised; no Dexie version bump.
- [ ] Verified live in the browser: flag "Other Income" as annual lump-sum, add a one-off bonus transaction, confirm the FR-INC-2 chart shows it spread across the year's months rather than a single spike.

## Notes

- Deliberately query-time (recomputed from raw data on every read) rather than writing smoothed values back to transactions — keeps the flag freely toggleable and never mutates real transaction amounts. A consequence: flagging a category smooths its **whole** history retroactively, since the flag isn't a per-transaction fact — documented behaviour, not a bug.
- Gross/net ratio (FR-INC-11) explicitly does **not** use this smoothed series — it needs the real amount in the real month to match against that month's entered gross wage.
