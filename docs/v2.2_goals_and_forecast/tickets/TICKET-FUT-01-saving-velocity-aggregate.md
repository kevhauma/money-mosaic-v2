# TICKET-FUT-01 — Saving velocity: how much I actually saved per month, over a configurable lookback

- **Area:** Forecast
- **Type:** Feature
- **Traceability:** adds **FR-FUT-1**. Consumed by [TICKET-FUT-05](./TICKET-FUT-05-goal-affordability-projection.md)
  and [TICKET-FUT-07](./TICKET-FUT-07-projected-net-worth-chart.md); its two parameters get their
  controls in [TICKET-FUT-06](./TICKET-FUT-06-forecast-controls.md). Graduated from gap #2 of
  [competitive-analysis.md](../../v9999_ideas/competitive-analysis.md).

## User story

As someone deciding whether I can afford something, I want the app to measure how much I actually
put aside per month over a window I choose, so every forecast it shows me is built on my own
history rather than on a number I made up.

## Description

A pure aggregate that folds the last *N* complete calendar months into a per-month saving rate,
on either of two bases (money left over, or money moved into savings accounts), together with the
month-by-month series and the spread behind it. No UI — this is the number every other ticket in
this version consumes.

## Current situation (as-is)

- [`computePeriodStats`](../../../src/app/core/stats/period-stats.ts) already produces
  `income`/`expense`/`savings`/`net`/`savingsRate` for one `[from, to]` window, routing every
  per-transaction decision through
  [`classifyForStats`](../../../src/app/core/stats/classify-for-stats.ts) — so `net` (income −
  expense) and `savings` (net movement into own savings accounts) are both already defined and
  already agree with the Dashboard's stat cards.
- Nothing folds that over a *sequence* of months to produce a rate. The Dashboard calls it once for
  the selected range; [`stats.store.ts`](../../../src/app/feature-dashboard/stats.store.ts) holds
  the result and nothing else.
- [`bucketKeysInRange`/`bucketDateBoundaries`](../../../src/app/shared/utils) already enumerate
  calendar-month buckets and their boundary dates — the mechanism
  [`computeAccountBalanceHistory`](../../../src/app/core/stats/account-balance-history.ts) walks.
- Every forward-looking aggregate in the repo is **clock-free**: `detectRecurringPayments`
  ([recurring-payments.ts](../../../src/app/core/stats/recurring-payments.ts)) and
  `projectOccurrences` ([recurring-projection.ts](../../../src/app/core/stats/recurring-projection.ts))
  both take "today" as a parameter rather than reading `Date.now()`, which is what makes them
  testable. This aggregate follows that.

## Desired result (to-be)

- New `core/stats/saving-velocity.ts`, exported from
  [`core/stats/index.ts`](../../../src/app/core/stats/index.ts):

  ```ts
  export type SavingBasis = 'net-cash-flow' | 'savings-transfers';

  export type MonthlySavingPoint = { bucketKey: string; from: string; to: string; amount: number };

  export type SavingVelocity = {
    basis: SavingBasis;
    /** Complete calendar months actually measured — may be fewer than requested. */
    monthsCovered: number;
    months: MonthlySavingPoint[];
    /** Arithmetic mean per month — the estimator the projections accumulate. */
    perMonth: number;
    /** The typical month, for the readout. Not what the ETA maths uses. */
    median: number;
    min: number;
    max: number;
    /** False when zero complete months fall inside the window; `perMonth` is then 0. */
    hasEnoughHistory: boolean;
  };

  export const computeSavingVelocity = (
    transactions: Transaction[],
    options: {
      today: string;
      lookbackMonths: number;
      basis: SavingBasis;
      ownSavingsIbans?: ReadonlySet<string>;
      categoriesById?: ReadonlyMap<number, Category>;
      accountsById?: ReadonlyMap<number, Account>;
    },
  ): SavingVelocity => { /* … */ };
  ```

- **Whole calendar months only.** The window is the last `lookbackMonths` *complete* months ending
  with the last month before `today`'s month — the current, partial month is excluded, since a
  forecast run on the 3rd would otherwise read as a catastrophic month.
- Each month's amount comes from `computePeriodStats` over that month's boundaries: `net` for
  `net-cash-flow`, `savings` for `savings-transfers`. The velocity can therefore never disagree
  with the Dashboard's own figures for the same month.
- **Short history is clamped, not faked.** Fewer complete months available than requested →
  `monthsCovered` reports what was actually measured and the mean divides by that, never by
  `lookbackMonths`. Zero complete months → `hasEnoughHistory: false`, `perMonth: 0`, `months: []`.
- **A negative velocity is a real answer** and is returned as-is, never clamped to zero — deciding
  what "you are losing €120/month" means for a goal belongs to
  [TICKET-FUT-05](./TICKET-FUT-05-goal-affordability-projection.md), not here.
- Months with no transactions at all are still emitted, as `amount: 0` — a gap month is evidence,
  and silently dropping it would inflate the mean.

## Acceptance criteria

- [ ] `computeSavingVelocity` returns one `MonthlySavingPoint` per complete calendar month in the
      window, in chronological order, with `from`/`to` equal to that month's real boundary dates.
- [ ] The current (partial) month is excluded from the window whatever `today`'s day-of-month is.
- [ ] `basis: 'net-cash-flow'` reproduces `computePeriodStats(...).net` for each month, and
      `basis: 'savings-transfers'` reproduces `.savings` — asserted against `computePeriodStats`
      itself, not against hand-copied expectations.
- [ ] `perMonth` is the mean over `monthsCovered`; `median`/`min`/`max` describe the same series.
      With an even number of months the median is the mean of the two middle values.
- [ ] Fewer complete months of history than requested → `monthsCovered` is the smaller number and
      `perMonth` divides by it; no history at all → `hasEnoughHistory: false`, `perMonth: 0`.
- [ ] A month with no transactions is present in `months` with `amount: 0`.
- [ ] A window in which expenses exceed income returns a negative `perMonth`, unclamped.
- [ ] The function reads no clock — `today` is a parameter, and the spec proves it by running the
      same fixture at two different "todays" and getting two different windows.
- [ ] Pure function in `core/stats/`, exported via `core/stats/index.ts`, no Dexie or store import;
      every per-transaction decision still goes through `classifyForStats` via `computePeriodStats`.
- [ ] Unit tests cover: month enumeration and boundaries; current-month exclusion; both bases
      against `computePeriodStats`; mean/median/min/max including the even-count median; clamped
      short history; zero history; empty months as zero; negative velocity; and the two-`today`
      clock-free case.
- [ ] `ng lint` + `ng test` + `ng build --configuration development` all pass; `angular.json`
      budgets untouched.
- [ ] Verified via the fallow skill and coding-conventions skill.

## Notes

- **Why the mean drives the projection and the median only describes it.** Affordability is
  cumulative — you reach a target by adding up months — and the sum of *N* months is exactly
  `N × mean` by definition, while `N × median` is a number that corresponds to nothing. The median
  is still worth showing (a €2.000 holiday-pay month makes the mean flattering), which is why
  `min`/`max`/`median` are returned for [TICKET-FUT-06](./TICKET-FUT-06-forecast-controls.md)'s
  readout to sit honesty next to the estimate.
- **Why both bases exist.** `savings-transfers` matches the Dashboard's existing savings-rate card
  and is the stricter reading; `net-cash-flow` matches what most people mean by "what I managed to
  save", and someone who never moves money to a savings account reads as €0/month under the strict
  basis. Neither is wrong, so the parameter is real and its control ships in FUT-06. No default is
  chosen here — the caller always passes one.
- Ignoring recurring bills that are known to be coming (`projectOccurrences`) is deliberate for
  this version: velocity is a *measured* rate, and blending measurement with projection would make
  the number impossible to explain. A recurring-aware refinement is recorded in the version
  overview's "Considered, not ticketed yet".
- No Dexie change and no UI — this ticket is verified by its spec alone, like
  [TICKET-REC-01](../../v2.1_extra_graphs/tickets/TICKET-REC-01-recurring-payment-detection.md).
  Expect a temporary `unused-export` fallow suppression until FUT-05 lands, removed by that ticket.
