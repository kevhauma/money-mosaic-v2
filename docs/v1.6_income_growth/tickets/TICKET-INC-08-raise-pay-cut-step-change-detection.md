# TICKET-INC-08 — Raise / pay-cut step-change detection

- **Area:** Income
- **Type:** Feature
- **Traceability:** adds FR-INC-8 (new)

## User story

As a user, I want to be notified when one of my recurring income categories has a sustained step-change in its typical amount (e.g. my salary category jumps from ~€2,500/mo to ~€2,800/mo for several consecutive periods), so a raise or pay cut is surfaced instead of buried in a chart — categories flagged per FR-INC-4 are evaluated on their smoothed series, so their annual lump sum is never mistaken for a step-change.

## Description

Flags when a recurring income category's typical monthly amount has sustained a step-change (a raise or a pay cut), so it surfaces as a notice instead of being buried in the trend chart.

## Current situation (as-is)

- No step-change/anomaly detection exists anywhere in the codebase — this is genuinely new logic, not a reuse of an existing pattern (already flagged in the v1.6 vision's "Considered, not ticketed" section as the one story with no existing infra to build on).

## Desired result (to-be)

- New pure helper `detectIncomeStepChanges(series, categoriesById)` in `core/stats/income-step-change-detection.ts`, operating on `smoothAnnualLumpSums(computeIncomeCategorySeries(...))`'s **monthly** series (this detector only runs at `granularity === 'month'` — a step-change concept doesn't translate cleanly to day/week/quarter buckets):
  - For each category, compare the trailing 3-month average ending at bucket _i_ against the trailing 3-month average ending at bucket _i-3_ (a non-overlapping before/after window).
  - Flag a step-change when the relative difference exceeds a fixed threshold (**±15%**) and holds for **all 3 months** of the "after" window (not just the boundary month) — this rejects a single unusually-high/low month from registering as a "raise."
  - Returns `{ categoryId: number; changedAtBucketKey: string; direction: 'increase' | 'decrease'; fromAvg: number; toAvg: number; pctChange: number }[]`, one entry per detected change (a category can have more than one over its history, e.g. a raise then later a pay cut).
  - Requires at least 6 months of the category's history before it's eligible (3 "before" + 3 "after") — categories with shorter history never flag, avoiding noisy false positives on brand-new income streams.
- `IncomeOverviewComponent` renders detected changes as dismissible `mm-alert` callouts (e.g. "Salary increased ~12% around March 2026") above the trend chart.

## Acceptance criteria

- [ ] Uses the smoothed series (FR-INC-4) as input, so a category's annual lump sum never registers as a step-change — unit test: a category with a flat €500/mo baseline plus one flagged annual €2,000 bonus month produces zero detected changes.
- [ ] A genuine sustained shift (e.g. €2,500 → €2,800 held for 3+ months) is detected with the correct `direction` and approximate `pctChange`; unit test.
- [ ] A single one-off high/low month (not sustained) does **not** trigger a false positive; unit test.
- [ ] Categories with less than 6 months of history never flag; unit test.
- [ ] Runs only at `granularity === 'month'`; other granularities return an empty result rather than misapplying the 3-month window.
- [ ] `angular.json` bundle budgets not raised.
- [ ] Verified live in the browser: seed a salary category with a step increase partway through the history, confirm a callout appears; confirm a flagged annual-bonus category produces no callout.

## Notes

- Threshold (±15%) and window (3 months) are fixed constants for this ticket, not user-configurable — a settings surface for tuning sensitivity is a reasonable v1.7 follow-up if the fixed threshold proves too noisy/quiet in practice.
- Depends on FR-INC-4 (consumes the smoothed series) — build after it.
