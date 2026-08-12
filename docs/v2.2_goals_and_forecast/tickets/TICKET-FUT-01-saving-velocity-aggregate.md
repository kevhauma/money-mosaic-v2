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

- [x] `computeSavingVelocity` returns one `MonthlySavingPoint` per complete calendar month in the
      window, in chronological order, with `from`/`to` equal to that month's real boundary dates.
      (`measureMonths` in `saving-velocity.ts` walks `bucketKeysInRange`/`bucketDateBoundaries`;
      spec: "returns one point per complete calendar month, in order, with that month's real
      boundaries" plus the leap-February case asserting `2024-02-29`.)
- [x] The current (partial) month is excluded from the window whatever `today`'s day-of-month is.
      (`resolveWindow` ends at `Date.UTC(year, month, 0)`; spec `it.each` over `2026-08-01`,
      `2026-08-12`, `2026-08-31` — all three measure `['2026-06', '2026-07']` and drop August's 999.)
- [x] `basis: 'net-cash-flow'` reproduces `computePeriodStats(...).net` for each month, and
      `basis: 'savings-transfers'` reproduces `.savings` — asserted against `computePeriodStats`
      itself, not against hand-copied expectations. (Spec describe "bases agree with
      computePeriodStats" loops every returned point and compares to a live `computePeriodStats`
      call over that point's own `from`/`to`; a third case shows the two bases disagree — 1100 vs
      225 — so the parameter is real.)
- [x] `perMonth` is the mean over `monthsCovered`; `median`/`min`/`max` describe the same series.
      With an even number of months the median is the mean of the two middle values. (Spec
      "the spread behind the number": 100/500/300/200 → mean 275, median 250, min 100, max 500;
      odd-count case → median 200.)
- [x] Fewer complete months of history than requested → `monthsCovered` is the smaller number and
      `perMonth` divides by it; no history at all → `hasEnoughHistory: false`, `perMonth: 0`.
      (`resolveWindow` clamps to `historyStartMonth`; spec "clamps to the months actually
      available" asks for 12 months against 2 months of data → `monthsCovered: 2`, `perMonth: 400`
      (800/2, not 800/12); plus the empty-transactions and current-month-only-history cases.)
- [x] A month with no transactions is present in `months` with `amount: 0`. (Spec "emits a month
      with no transactions at all as amount 0 rather than dropping it" → `[400, 0, 0, 800]`,
      `monthsCovered: 4`.)
- [x] A window in which expenses exceed income returns a negative `perMonth`, unclamped. (Spec
      "returns a negative perMonth unclamped when expenses exceed income" → `perMonth: -200`,
      `min: -300`, `max: -100`.)
- [x] The function reads no clock — `today` is a parameter, and the spec proves it by running the
      same fixture at two different "todays" and getting two different windows. (Spec "reads no
      clock": the same four-month fixture at `2026-03-15` → `['2026-01','2026-02']`, at
      `2026-05-15` → `['2026-03','2026-04']`; no `Date.now()` in the module.)
- [x] Pure function in `core/stats/`, exported via `core/stats/index.ts`, no Dexie or store import;
      every per-transaction decision still goes through `classifyForStats` via `computePeriodStats`.
      (`src/app/core/stats/saving-velocity.ts` imports only `@/core/data-access` *types*,
      `@/shared/utils` date helpers and `./period-stats`; re-exported from `core/stats/index.ts`.)
- [x] Unit tests cover: month enumeration and boundaries; current-month exclusion; both bases
      against `computePeriodStats`; mean/median/min/max including the even-count median; clamped
      short history; zero history; empty months as zero; negative velocity; and the two-`today`
      clock-free case. (`src/app/core/stats/saving-velocity.spec.ts`, 15 cases across 5 describes.)
- [x] `ng lint` + `ng test` + `ng build --configuration development` all pass; `angular.json`
      budgets untouched. (Lint clean; 2744 tests / 249 files green; dev build completed;
      `angular.json` not in the diff.)
- [x] Verified via the fallow skill and coding-conventions skill. (`fallow audit --base HEAD` →
      verdict `pass`, 0 dead-code and 0 complexity findings. The first run flagged a CRAP-30
      moderate on the single big function; resolved by extracting `resolveWindow`/`measureMonths`
      rather than suppressing it. The `unused-export` on `computeSavingVelocity` carries the
      temporary `fallow-ignore-next-line` this ticket's Notes predicted — FUT-05 removes it.)

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
