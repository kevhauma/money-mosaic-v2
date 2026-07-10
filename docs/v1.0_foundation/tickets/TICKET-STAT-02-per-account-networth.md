# TICKET-STAT-02 — Account balance-history charts (detail + overview)

- **Area:** Accounts (Statistics-flavoured)
- **Traceability:** extends FR-STAT-4 (net-worth-over-time) and FR-ACC-3 (balance derived from opening balance + transactions)

## User story

As a saver, I want a full-history balance chart on each account's detail page, plus a stacked all-accounts net-worth-history chart (toggleable per account) on the accounts overview, so I can see how each account's saldo has trended over its whole life and how the accounts add up.

## Description

Give each account a **full-history balance (saldo) chart** on its detail page, and give the accounts **overview** a **stacked-area chart of every account's balance over its full history**, where the stack totals combined net worth and individual accounts can be toggled on/off. This lives entirely in the **Accounts** feature — the Dashboard trend chart is intentionally left as-is (income/expense bars + one combined net-worth line) so the dashboard stays a general income/expense view and doesn't get cluttered with per-account lines.

## Current situation (as-is)

- [TrendChartPanelComponent](../../../src/app/feature-dashboard/components/trend-chart-panel/trend-chart-panel.component.ts) (Dashboard) plots income/expense bars + a **single combined** net-worth line from `statsStore.netWorthTrend()`. This stays exactly as it is.
- [AccountsDetailComponent](../../../src/app/feature-accounts/components/accounts-detail/accounts-detail.component.ts) shows the account's **current** balance as a single number, but no history of how it got there.
- [AccountsOverviewComponent](../../../src/app/feature-accounts/components/accounts-overview/accounts-overview.component.ts) lists accounts with current balances, but no combined history.
- The stats layer has `computeNetWorthTrend` (combined, range-scoped) but no per-account series, and echarts is currently registered only in the Dashboard lazy chunk ([echarts-setup.ts](../../../src/app/feature-dashboard/echarts-setup.ts)).

## Desired result (to-be)

**Account detail page** — a balance-over-time line for that one account:
- Spans the account's **full history** (opening-balance date / first transaction → today), independent of the global topbar date-range and grouping controls.
- Coloured by the account's configured colour; balance = opening balance + cumulative signed transactions (transfers included, consistent with net-worth/saldo semantics — FR-ACC-3).

**Accounts overview page** — a stacked-area net-worth-history chart:
- One filled band per account, stacked so the top edge is **combined net worth over time**; each band uses the account's colour with the account name in the legend.
- Full-history span with the same auto-picked granularity as the detail chart.
- Clicking a legend entry toggles that account's band in/out (echarts legend selection), keeping it readable as accounts grow.

**Both charts:**
- **Time scope = full history, own granularity** (decision): the charts ignore the global topbar range/grouping and always show the whole timeline. Granularity is auto-picked from the total span so the buckets stay legible — e.g. daily for short spans, weekly for medium, monthly for multi-year — reusing the existing `date-buckets` helpers rather than a parallel implementation.
- **Horizontal (time-axis) dataZoom** is enabled on both charts so the user can scrub/zoom into a sub-window of the full history without the buckets getting cramped. Use an [echarts `dataZoom`](https://echarts.apache.org/en/option.html#dataZoom) bound to the x (category/time) axis — both an `inside` zoom (mouse-wheel/drag/pinch) and a `slider` handle beneath the chart — with no vertical (y-axis) zoom.

## Acceptance criteria

- [x] The stats layer exposes a **per-account net-worth/balance-over-time series** bucketed by a given granularity, reusing the existing bucketing (`date-buckets` + `computeNetWorthTrend`) rather than a parallel implementation. The single-account detail chart and the stacked overview chart both consume this one function.
- [x] A pure helper computes the **full-history [from, to] range** (earliest of opening-balance date / first transaction → today) — a single-account variant for the detail chart and an all-accounts variant for the overview.
- [x] A pure helper **auto-picks the granularity** (day/week/month/quarter) from a span length, so short-lived and multi-year accounts both render legibly. Thresholds recorded in the code.
- [x] **Account detail:** renders a full-history balance line for that account, coloured by the account's colour, spanning its whole life and independent of the topbar range/grouping.
- [x] **Accounts overview:** renders a stacked-area chart where each account is a band in its own colour (name in the legend) and the stacked total equals combined net worth over time; legend clicks toggle individual accounts.
- [x] Archived accounts are **excluded** from the overview stacked net-worth chart entirely (never a toggleable band) — archiving means treated as if it never existed for aggregate stats, consistent with [with-archivable.ts](../../../src/app/shared/utils/with-archivable.ts)'s `activeEntities` convention and the same policy adopted in [TICKET-STAT-03](./TICKET-STAT-03-expanded-range-presets-default-grouping.md). The account **detail** page may still render an archived account's own history when navigated to directly — that's viewing one account on its own, not an aggregate stat.
- [x] Drill-down (FR-STAT-6): a click still reaches the underlying transactions — the overview navigates to the clicked account (its detail or its account-filtered transactions), and the detail chart drills into that account's transactions for the clicked bucket, carrying the account filter in the query params.
- [x] Both charts have a **horizontal (x/time-axis) dataZoom** — an `inside` zoom plus a `slider` beneath the chart, bound to the x axis only (no y-axis zoom) — so the user can scrub into any sub-window of the full history. The default view still shows the whole timeline.
- [x] Both charts update reactively (FR-STAT-5) on transaction edits/imports and on adding/removing accounts, via computed signals off the existing stores — no manual invalidation.
- [x] The **Dashboard trend chart is unchanged** — still income/expense bars + one combined net-worth line, no per-account series.
- [x] The `angular.json` bundle budget is **not raised** (Hard rules): the tree-shaken echarts registration is shared between the Dashboard and Accounts lazy chunks (factored into a shared chunk, not duplicated); stacked area needs no new chart import (`LineChart` + `areaStyle` + `stack`). The only new echarts import is the (lightweight) `DataZoomComponent` for the zoom slider — added once to the shared registration.
- [x] Unit tests cover: per-account series for ≥2 accounts, granularity auto-pick for a short vs long span, full-history range calculation, colour/legend mapping, and that the stacked bands sum to the combined net-worth total.

## Open questions (resolve before building)

1. **Negative-balance accounts in a stacked area** (e.g. a credit line) — stacked bands become visually ambiguous when a value goes below zero. Render such accounts as a line instead of a band, allow the stack to dip below zero, or something else? **Resolved:** every account stays one stacked band, including negative-balance ones — echarts natively stacks negative values below the zero axis while positive ones stack above, so the combined total still equals net worth exactly with no special-casing and every account stays a toggleable band.

## Notes

- Balance per account over time = opening balance + cumulative signed transactions up to each bucket boundary (transfers **included**). A transfer between two of the user's own accounts moves balance from one band to another with the stacked total unchanged — consistent with net-worth semantics.
- **echarts placement:** relocate the tree-shaken registration (currently `feature-dashboard/echarts-setup.ts`) to a shared location both features import, so the Accounts chunk reuses it via a common lazy chunk instead of pulling a second copy of echarts. Add `DataZoomComponent` to the `echarts.use([...])` list there so the x-axis zoom slider works (the current setup registers `LineChart`/`BarChart`/`PieChart` + `Tooltip`/`Grid`/`Legend` but no dataZoom).
- This ticket deliberately **removes** the earlier "per-account lines on the dashboard trend chart" direction — the dashboard stays general income/expense + combined net worth.
