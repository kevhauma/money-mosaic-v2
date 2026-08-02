# TICKET-ACC-11 — Hovering a day on a balance chart shows that day's transactions

- **Area:** Accounts
- **Type:** Feature
- **Traceability:** extends FR-STAT-2 / TICKET-STAT-12 (shared axis tooltip), needs [TICKET-ACC-10](./TICKET-ACC-10-day-only-balance-buckets.md)

## User story

As a user, I want hovering a day on either balance chart to tell me what actually happened that day — which
transactions moved the balance — so I can explain a step in the line without leaving the page to go filter
the transactions list.

## Description

Once a point on a balance chart is one day ([TICKET-ACC-10](./TICKET-ACC-10-day-only-balance-buckets.md)),
the tooltip can answer the question the chart provokes. Today both charts repeat the balances that are
already drawn; this ticket makes them list that day's transactions — grouped by account on the Accounts
overview, and for the one account in view on account detail.

## Current situation (as-is)

- Both balance charts set `tooltip: { trigger: 'axis', formatter: formatAxisTooltip }`:
  [account-balance-history-chart.component.ts](../../../src/app/feature-accounts/components/account-balance-history-chart/account-balance-history-chart.component.ts)
  (overview, one stacked band per active account) and
  [account-balance-chart.component.ts](../../../src/app/feature-accounts/components/account-balance-chart/account-balance-chart.component.ts)
  (detail, one line for one account).
- [formatAxisTooltip](../../../src/app/shared/echarts/tooltip-formatter.ts) renders the bucket label plus
  one `marker + seriesName: formatCurrency(value)` line per series — i.e. the **balance** on that day.
  That's the same information the bands and the line already convey; the hover adds precision, not an
  answer. On the detail chart it is thinner still: one unlabelled balance figure.
- The transactions behind a point are reachable only by clicking, and the two charts click to different
  places — the overview navigates to the **account detail page**
  (`router.navigate(['/accounts', account.id])`), the detail chart to `/transactions` filtered to the
  bucket and account.
- The data is available on both pages: `TransactionsStore.transactions()` is already injected by
  [balance-trend-signals.ts](../../../src/app/feature-accounts/balance-trend-signals.ts) to build the
  series, and `Transaction` carries `bookingDate`, `accountId`, `amount`, `rawDescription`,
  `counterpartyName`, `categoryId`.

## Desired result (to-be)

- **A new pure lookup in `core/stats/`** — one day, grouped by account: given the day's ISO date, the
  transactions and the accounts in view, it returns per account the transactions booked that day
  (description/counterparty, signed amount) plus that account's day total. Pure and TestBed-free, like
  its neighbours. **Both charts call it**; the detail chart simply passes a one-account list, so a single
  account is the degenerate case of the same function rather than a second code path.
- **One shared tooltip formatter** built on that lookup, used by both charts in place of
  `formatAxisTooltip`:
  - **Header:** the day, through the app's `localeDate` formatting (TICKET-SET-04), not the raw
    `YYYY-MM-DD` bucket key.
  - **Per account with movement that day:** the account name (with its marker colour), each transaction
    as `counterparty/description — signed amount`, and the account's net change for the day.
  - **Accounts with no movement are omitted** — a day where one account moved should show one account,
    not a list of zeroes.
  - **A day with no transactions at all** falls back to a short "No transactions" line under the date,
    so the tooltip never renders empty.
- **On account detail the account heading is dropped** — the page is already that one account, so the
  tooltip shows the date, the day's transaction lines, and the day's net change without a redundant name
  row. Same formatter, driven by a flag or by the single-account input; not a forked implementation.
- **The tooltip is capped.** At most a handful of transactions per account (e.g. 5) and a total cap
  across accounts, with a `+N more` line when truncated — a payday with thirty lines must not render a
  tooltip taller than the viewport. The detail chart uses the same per-account cap, so a busy single
  account truncates too.
- **Amounts and dates go through the app's formatters** (`formatCurrency`, `localeDate`), never raw
  numbers.
- **`formatAxisTooltip` is untouched** and stays the shared default for every other axis chart (dashboard
  trend, income by month, net vs gross). Only the two balance charts move off it.
- **Click behaviour is unchanged on both charts**: the overview still opens the account's detail page, the
  detail chart still opens `/transactions` filtered to that day and account. The tooltip answers in place;
  the click still navigates.

## Acceptance criteria

- [ ] A pure day-lookup helper exists in `core/stats/` with a TestBed-free spec covering: a day with
      movement on two accounts; a day with movement on one of three; a day with none; a single-account
      input; and correct per-account day totals.
- [ ] The lookup excludes archived accounts on the overview, matching its `activeAccounts()` series, and
      returns an archived account's own transactions when that account is the one passed in (the detail
      page renders for archived accounts too); unit test both.
- [ ] Both balance charts use the shared tooltip formatter rather than `formatAxisTooltip`; component
      specs assert it on each.
- [ ] The tooltip renders the day through `localeDate` and every amount through `formatCurrency`; unit
      test on the formatter output.
- [ ] On account detail the tooltip omits the account-name row and still shows the date, the day's
      transaction lines and the day's net change; unit test on the single-account rendering.
- [ ] Accounts with no transactions that day are absent from the overview tooltip; unit test.
- [ ] A day with no transactions renders the date plus a "No transactions" line on **both** charts, never
      an empty tooltip; unit test.
- [ ] More than the per-account cap of transactions renders the cap plus a `+N more` line; unit test at
      the boundary (exactly the cap → no "more" line; cap + 1 → one), covering the detail chart too.
- [ ] On the overview, each account's line carries its own colour marker matching its band; unit test
      asserting the marker is emitted per account.
- [ ] `formatAxisTooltip` and every non-balance chart's tooltip are unchanged; `git diff` touches no other
      chart's `tooltip` config.
- [ ] Clicking a band on the overview still navigates to that account's detail page, and clicking a point
      on the detail chart still opens `/transactions` filtered to that day and account; existing specs
      pass unchanged (the detail chart's single-day drill-down comes from TICKET-ACC-10).
- [ ] Hover stays responsive on a full dataset — the lookup indexes transactions by day once rather than
      scanning the whole array per hover; unit test asserting the index is built from the input, plus a
      note in the helper's doc comment.
- [ ] No persistence changes, no Dexie version bump.
- [ ] `angular.json` bundle budgets not raised.
- [ ] Verified via the `fallow` skill and the `coding-conventions` skill.
- [ ] Verified live in the browser on **both** charts: hovering a day with a salary deposit names the
      deposit; hovering a quiet day says so; a payday with many rows truncates instead of overflowing.

## Notes

- **Depends on [TICKET-ACC-10](./TICKET-ACC-10-day-only-balance-buckets.md)**: with a month bucket, "the
  transactions of that day" has no referent, and that ticket fixes *both* charts to day buckets. Build
  them in that order.
- **HTML tooltip, not a custom overlay.** echarts' `formatter` returning an HTML string is what every
  other tooltip in the app already does; a floating Angular component would be a much larger change for
  the same result.
- **One helper and one formatter for both charts, not two.** The single-account case is the same question
  with a shorter answer; forking it would guarantee the two tooltips drift on the next change to either.
  The only difference is the suppressed account-name row.
- The per-hover cost is the thing to watch: build the day index once per series computation, not per
  `formatter` call. The detail chart's index is cheap (one account); the overview's is the one to measure.
