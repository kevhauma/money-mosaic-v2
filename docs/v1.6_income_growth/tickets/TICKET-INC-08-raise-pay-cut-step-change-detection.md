# TICKET-INC-08 — Raise / pay-cut step-change detection

- **Area:** Income
- **Type:** Feature
- **Traceability:** adds FR-INC-8 (new)

## User story

As a user, I want to be notified when one of my recurring income categories has a sustained step-change in its typical amount (e.g. my salary category jumps from ~€2,500/mo to ~€2,800/mo for several consecutive periods), so a raise or pay cut is surfaced instead of buried in a chart — categories flagged per FR-INC-4 are evaluated on their smoothed series, so their annual lump sum is never mistaken for a step-change.

## Description

Flags when a recurring income category's typical monthly amount has sustained a step-change (a raise or a pay cut), so it surfaces as a notice instead of being buried in the trend chart.

## Current situation (as-is)

- No step-change/anomaly detection exists anywhere in the codebase — this is genuinely new logic, not a reuse of an existing pattern (already flagged in the v1.6 vision's "Considered, not ticketed" section as the one story with no existing infra to build on). Still true as of this refresh.
- The closest *presentation* precedent is the dashboard's [action-queue-panel](../../../src/app/feature-dashboard/components/action-queue-panel/action-queue-panel.component.ts) — derived "here's what changed / needs you" cards, each hidden when its count is zero, computed live from stores rather than persisted.
- Amounts in any user-facing copy must go through `formatCurrency()` ([currency-format.ts](../../../src/app/shared/utils/currency-format.ts)) — the currency symbol, its position, and the number locale are user settings since TICKET-SET-03/04, so a hardcoded `€` in a callout string is now wrong.

## Desired result (to-be)

- New pure helper `detectIncomeStepChanges(trend, categoriesById, granularity)` in `core/stats/income-step-change-detection.ts`, operating on `smoothAnnualLumpSums(computeIncomeCategorySeries(...))`'s **monthly** `{ bucketKeys, series }` output (this detector only runs at `granularity === 'month'` — a step-change concept doesn't translate cleanly to day/week/quarter buckets):
  - For each category, compare the trailing 3-month average ending at bucket _i_ against the trailing 3-month average ending at bucket _i-3_ (a non-overlapping before/after window).
  - Flag a step-change when the relative difference exceeds a fixed threshold (**±15%**) and holds for **all 3 months** of the "after" window (not just the boundary month) — this rejects a single unusually-high/low month from registering as a "raise."
  - Returns `{ categoryId: number; changedAtBucketKey: string; direction: 'increase' | 'decrease'; fromAvg: number; toAvg: number; pctChange: number }[]`, one entry per detected change (a category can have more than one over its history, e.g. a raise then later a pay cut).
  - Requires at least 6 months of the category's history before it's eligible (3 "before" + 3 "after") — categories with shorter history never flag, avoiding noisy false positives on brand-new income streams.
- `IncomeOverviewComponent` renders detected changes as dismissible `mm-alert` callouts (e.g. "Salary increased ~12% around March 2026") above the trend chart.

## Acceptance criteria

**Implementation notes, 2026-08-01 — four deviations from the to-be above, recorded as built:**

1. **The threshold shipped at ±10%, not the ±15% named in the to-be and Notes.** Those two sections
   contradict the user story and acceptance criterion 2 below, which both give "€2,500/mo →
   €2,800/mo" as the raise this feature exists to catch — and that is **+12%**, which ±15% silently
   ignores. A detector that misses its own motivating example fails its user story, so the criterion
   won over the constant. The Notes' point stands unchanged: it is a fixed constant, and a
   sensitivity setting remains the follow-up.
2. **A second rule was needed: the before-window must have no spike of its own.** The to-be's two
   rules (±threshold on the averages, held by all three months of the after window) reject a one-off
   high month when it lands — but three months later that same spike sits *inside* the
   before-window, drags its average up by a third of its excess, and a perfectly normal quarter
   reads as a 40% pay cut. Criterion 3 is only actually met with this third rule, so it is in.
3. **`detectIncomeStepChanges(trend, granularity)` — no `categoriesById` parameter.** The helper
   returns `categoryId`s; naming them is presentation, and doing it in `core/stats` would have meant
   passing a map the function never otherwise needs. `buildStepChangeCallout()` in the component
   resolves names, which is also where `formatCurrency`/`formatDate` belong.
4. **Dismissal is per visit, not persisted.** The to-be says "dismissible" without saying for how
   long. These callouts are a re-derivable reading of the data — the action-queue-panel shape the
   as-is section points at — not a task list, so persisting a dismissal would mean a schema change
   to remember that the user has seen a fact that is still true. Dismissing clears it from view for
   the session.

- [x] Uses the smoothed series (FR-INC-4) as input, so a category's annual lump sum never registers as a step-change — unit test: a category with a flat €500/mo baseline plus one flagged annual €2,000 bonus month produces zero detected changes. (The component reads `IncomeStore.incomeTrend()`, which is already smoothed. Unit spec `leaves an annual lump sum alone once it has been smoothed (FR-INC-4)`; end-to-end in the component spec's `produces no callout for an annual lump sum the user has flagged for smoothing (FR-INC-4)`, which renders a flat 500/mo salary plus a flagged 6,000 June bonus and asserts zero alerts. Spec `is doubly safe on an unsmoothed bonus: a lone spike clears neither window rule` records that the noise rules catch it even unflagged.)
- [x] A genuine sustained shift (e.g. €2,500 → €2,800 held for 3+ months) is detected with the correct `direction` and approximate `pctChange`; unit test. (Spec `flags a raise held for three months, with its direction and size` uses exactly those figures — `direction: 'increase'`, `pctChange ≈ 0.12`. Detected only because of implementation note 1.)
- [x] A single one-off high/low month (not sustained) does **not** trigger a false positive; unit test. (Specs `ignores a single unusually high month`, `ignores a single unusually low month`, and `measures against a before-window with no spike of its own` — the last covering the delayed false positive of implementation note 2. `tolerates ordinary month-to-month variation in the baseline` guards the opposite failure.)
- [x] Categories with less than 6 months of history never flag; unit test. (Specs `never flags a category with less than six months of history`, `flags once the category reaches six months`, and `counts history from the category’s first payment, not the start of the chart` — leading zero buckets are "before it existed", not months of no income.)
- [x] Runs only at `granularity === 'month'`; other granularities return an empty result rather than misapplying the 3-month window. (`it.each` over day/week/quarter/year returns `[]` on a series that does flag at `'month'` — asserted in the same describe, so the guard can't pass by being vacuous.)
- [x] Callout copy formats amounts via `formatCurrency()` — no hardcoded currency symbol or separator. (Specs `formats both amounts through formatCurrency — no hardcoded symbol or separator` and `follows the currency setting rather than printing a euro sign`, which switches the symbol to `$` and asserts the copy contains no `€`. Dates go through `formatDate()` for the same reason.)
- [x] `angular.json` bundle budgets not raised. (`git diff` touches no `angular.json`; the change adds one pure helper and a component built from the shipped `mm-alert`/`mm-button`.)
- [ ] Verified live in the browser: seed a salary category with a step increase partway through the history, confirm a callout appears; confirm a flagged annual-bonus category produces no callout. — **not done:** the user waived live browser checks for this v1.6 batch. Covered instead by the component spec, which renders the real component over a year of transactions stepping 2,500 → 2,900 mid-year and asserts one "Salary increased" alert, then asserts zero alerts for the flagged-bonus history.

## Notes

- Threshold (**±10% as shipped** — see implementation note 1; ±15% as originally written) and
  window (3 months) are fixed constants for this ticket, not user-configurable — a settings surface for tuning sensitivity is a reasonable follow-up version if the fixed threshold proves too noisy/quiet in practice. (The original note said "v1.7"; v1.7 is now the Loan tracker, so this is an unscheduled follow-up, not a v1.7 commitment.)
- Depends on FR-INC-4 (consumes the smoothed series) — build after it.
