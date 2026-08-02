# TICKET-ACC-10 — Balance history is a daily series: drop the bucket picker from Accounts and account detail

- **Area:** Accounts
- **Type:** Refactor
- **Traceability:** revises TICKET-STAT-15 (per-chart granularity) for the Accounts feature; extends TICKET-STAT-02 (balance history)

## User story

As a user, I want the balance charts to always plot a daily balance, so the chart stops offering bucket
sizes that don't mean anything for a running balance and I stop having to set it back to Day.

## Description

A balance is a *level*, not a sum over a period — "March's balance" is only ever the balance on one
particular day of March. The bucket picker on the two balance charts therefore offers four options whose
only effect is to throw away days. This ticket fixes both charts to day buckets and removes the picker.

## Current situation (as-is)

- Both balance charts render an `mm-granularity-picker` with all five options
  ([granularity-picker.component.ts](../../../src/app/shared/ui/granularity-picker/granularity-picker.component.ts)
  — day/week/month/quarter/year):
  - [account-balance-history-chart.component.html](../../../src/app/feature-accounts/components/account-balance-history-chart/account-balance-history-chart.component.html)
    (Accounts overview, all active accounts, stacked),
  - [account-balance-chart.component.html](../../../src/app/feature-accounts/components/account-balance-chart/account-balance-chart.component.html)
    (account detail, one account).
- Both get their granularity from
  [balance-trend-signals.ts](../../../src/app/feature-accounts/balance-trend-signals.ts), which seeds a
  `signal<Granularity>` from `pickGranularityForSpan(rangeStore.from(), rangeStore.to())` — so on a
  wide range the chart *opens* on Month or Year, not Day, and the user has to change it every visit.
- `computeAccountBalanceTrends`
  ([account-balance-trend.ts](../../../src/app/core/stats/account-balance-trend.ts)) takes the
  granularity and emits one point per bucket. For a running balance that means one sample per bucket —
  every intra-bucket movement disappears, and a month with a large mid-month dip reads flat.
- The zoom slider (`dataZoom`) already covers the "too many points" case the coarser buckets were
  presumably meant to answer: the series is full history and the range scrubs the window
  (TICKET-STAT-03).

## Desired result (to-be)

- **Both balance charts compute at `'day'`, always.** `balanceTrendSignals` stops seeding from
  `pickGranularityForSpan` and stops exposing a writable granularity; it exposes the fixed value the two
  charts and their drill-down share.
- **The `mm-granularity-picker` is removed from both templates.** The card header keeps its "Balance
  history" title; on the Accounts overview the header still has room for the chart's own controls if a
  later ticket adds any.
- **`mm-granularity-picker` itself is untouched** — the dashboard trend chart still uses it, and this is
  a per-chart decision, not a retirement of the primitive.
- **Click-through still works and lands on a single day.** Both charts navigate via
  `bucketDateBoundaries(bucketKey, granularity)`; with a fixed `'day'` the start and end collapse to the
  same date, so a click opens `/transactions` filtered to exactly that day (scoped to the account, on the
  detail chart).
- **The fixed choice is documented where it will be read** — a comment in `balance-trend-signals.ts`
  saying a balance is a level rather than a period sum, so the next chart added to this feature doesn't
  reintroduce the picker on autopilot.
- **`computeAccountBalanceTrends` keeps its `granularity` parameter.** It is generic aggregation in
  `core/stats/`, its spec covers every bucket size, and nothing is gained by narrowing it — the fixed
  choice belongs at the call site.

## Acceptance criteria

- [ ] Neither balance chart template renders `mm-granularity-picker`; component specs assert absence on
      both.
- [ ] Both charts compute their series at `'day'` regardless of the active date range; unit test driving
      a one-year range and asserting the granularity passed to `computeAccountBalanceTrends` is `'day'`.
- [ ] `balanceTrendSignals` no longer exposes a writable `granularity`; its type change is reflected in
      both consumers and its spec.
- [ ] Clicking a point on the account-detail chart opens `/transactions` filtered to that single date
      (`from === to`) and that account; unit test on the drill-down params.
- [ ] Clicking a band on the Accounts overview chart still navigates to that account's detail page;
      existing spec passes unchanged.
- [ ] The zoom slider still opens on the window derived from the page's date range; existing
      `computeZoomWindow` behaviour and specs unchanged.
- [ ] `mm-granularity-picker` and the dashboard trend chart's use of it are untouched; `git diff` shows
      no change under `shared/ui/granularity-picker/` or in `trend-chart-panel`.
- [ ] `computeAccountBalanceTrends` and its spec are unchanged.
- [ ] No persistence changes, no Dexie version bump.
- [ ] `angular.json` bundle budgets not raised.
- [ ] Verified via the `fallow` skill and the `coding-conventions` skill.
- [ ] Verified live in the browser: both charts open on a daily series with no picker, and a
      several-years-wide range still renders and zooms smoothly.

## Notes

- **Performance is the thing to actually check while building.** Ten years of history at day granularity
  is ~3,650 points per account, and the Accounts overview stacks one series per active account. Verify
  on the largest realistic dataset before ticking the browser criterion; if it stutters, the fix is
  echarts-side (`sampling: 'lttb'`, `large: true`) — **not** bringing the picker back.
- This ticket also removes the "opens on Month, must be set to Day every time" annoyance, which is the
  same complaint from the other end.
- [TICKET-ACC-11](./TICKET-ACC-11-accounts-chart-day-hover-transactions.md) depends on this landing:
  showing "that day's transactions" in the tooltip is only well-defined once a point *is* a day.
- Interacts with [TICKET-STAT-27](./TICKET-STAT-27-session-persistent-chart-options.md), which persists
  per-chart granularity for the session — these two charts simply won't have a granularity entry to
  persist. Whichever lands second should leave the other's behaviour intact.
