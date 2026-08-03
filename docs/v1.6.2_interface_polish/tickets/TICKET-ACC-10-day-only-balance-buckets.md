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

- [x] Neither balance chart template renders `mm-granularity-picker`; component specs assert absence on
      both. (`account-balance-history-chart.component.html` / `account-balance-chart.component.html` keep
      the `mm-flex` header row with the title alone; both component specs — "renders no bucket picker — a
      balance is a level, not a period sum (TICKET-ACC-10)" — query for `mm-granularity-picker` and assert
      `null` while the "Balance history" title is still rendered)
- [x] Both charts compute their series at `'day'` regardless of the active date range; unit test driving
      a one-year range and asserting the granularity passed to `computeAccountBalanceTrends` is `'day'`.
      (`balance-trend-signals.spec.ts` — "buckets by day whatever the shared range is, and exposes no way
      to change that": sets the `accounts` range to 2026-01-01→2026-12-31, asserts
      `pickGranularityForSpan` for that span is *not* `'day'`, then asserts `trend.granularity` is
      `BALANCE_GRANULARITY`/`'day'` and every emitted `bucketKey` is a `YYYY-MM-DD`. Both component specs
      carry the same assertion against their own rendered series.)
- [x] `balanceTrendSignals` no longer exposes a writable `granularity`; its type change is reflected in
      both consumers and its spec. (`BalanceTrendSignals.granularity` is now a plain `Granularity`, not a
      signal — `balance-trend-signals.ts`; both components dropped their `granularity`/`setGranularity`
      fields, and `account-balance-chart` reads `this.trend.granularity` for its drill-down)
- [x] Clicking a point on the account-detail chart opens `/transactions` filtered to that single date
      (`from === to`) and that account; unit test on the drill-down params.
      (`account-balance-chart.component.spec.ts` — "drills down to the single clicked day, scoped to this
      account": asserts `navigate(['/transactions'], { queryParams: { from: key, to: key, accountId: '1' }})`
      with `from` and `to` both the clicked bucket key)
- [x] Clicking a band on the Accounts overview chart still navigates to that account's detail page;
      existing spec passes unchanged. (`onChartClick`/`accounts-overview` navigation untouched; the whole
      accounts suite is green)
- [x] The zoom slider still opens on the window derived from the page's date range; existing
      `computeZoomWindow` behaviour and specs unchanged. (`balance-trend-signals.spec.ts` "maps the shared
      range onto the series' own bucket keys for the zoom window" and
      `account-balance-history-chart.component.spec.ts` "the Accounts page's range re-scrubs the chart's
      zoom window, and the Dashboard's does not" both pass; browser: on `/accounts` with the range at
      August 2026, `dataZoom` reported `startValue: 122, endValue: 124` of a 125-day series)
- [x] `mm-granularity-picker` and the dashboard trend chart's use of it are untouched; `git diff` shows
      no change under `shared/ui/granularity-picker/` or in `trend-chart-panel`. (`git diff --stat` over
      both paths returns empty)
- [x] `computeAccountBalanceTrends` and its spec are unchanged. (`git diff --stat` over
      `core/stats/account-balance-trend.ts` and its spec returns empty — the fixed choice lives at the
      call site, the aggregation stays generic)
- [x] No persistence changes, no Dexie version bump. (nothing under `core/data-access/` in the diff; the
      only state touched is the in-memory `ChartOptionsKey` union, which loses its now-unused
      `account-detail-balance` member)
- [x] `angular.json` bundle budgets not raised. (`git diff --stat angular.json` empty; dev build initial
      total 2.15 MB)
- [x] Verified via the `fallow` skill and the `coding-conventions` skill. (`fallow audit --base HEAD`:
      verdict **pass**, zero introduced *and* zero inherited findings, 0 dead-code issues — removing the
      picker also cleared the two components' now-unused `GranularityPickerComponent` imports; `ng lint`
      clean, 2232/2232 specs green, dev build compiles)
- [x] Verified live in the browser: both charts open on a daily series with no picker, and a
      several-years-wide range still renders and zooms smoothly. (Done on the dev server at :4210. The
      Browser pane had been closed — the user chose to continue without it — so this pass reads the live
      echarts instances through Angular's dev-mode `ng.getDirectives` rather than screenshots.
      `/accounts` and `/accounts/1` both report `mm-granularity-picker` count **0**, the "Balance history"
      title still present, and 125/125 `YYYY-MM-DD` bucket keys. **Performance, per the ticket's note:**
      the seeded dataset is only 125 days, so a synthetic 10-year × 5-account series (18,250 points,
      the same option shape the builders emit) was pushed at the live chart — `setOption` took **78 ms**
      and a `dataZoom` action **37 ms**, so no `sampling: 'lttb'`/`large: true` is needed. No console
      errors.)

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
  **How it actually landed:** STAT-27 shipped first, so this ticket took its granularity plumbing back
  out of both balance charts. The accounts overview keeps its STAT-27 hidden-series filter and dragged
  zoom under `'accounts-balance-history'`; the account-detail chart now uses none of the store, so
  `'account-detail-balance'` was dropped from `ChartOptionsKey` rather than left as a key nothing writes.
  STAT-27's bucket-change acceptance criterion was re-pointed at the dashboard trend panel — the chart
  that still has a picker — and that supersession is recorded on STAT-27's own criterion, not left to be
  inferred from here.
