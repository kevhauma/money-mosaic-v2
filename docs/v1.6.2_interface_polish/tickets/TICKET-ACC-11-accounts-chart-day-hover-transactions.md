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

- [x] A pure day-lookup helper exists in `core/stats/` with a TestBed-free spec covering: a day with
      movement on two accounts; a day with movement on one of three; a day with none; a single-account
      input; and correct per-account day totals. (`core/stats/day-transactions.ts` —
      `buildDayTransactionIndex` + `dayMovementsFor`; `day-transactions.spec.ts` has one test per listed
      case, all TestBed-free, plus counterparty→description fallback and chart-order assertions)
- [x] The lookup excludes archived accounts on the overview, matching its `activeAccounts()` series, and
      returns an archived account's own transactions when that account is the one passed in (the detail
      page renders for archived accounts too); unit test both. (Falls out of the design rather than a
      branch: the `accounts` argument decides what is visible. `day-transactions.spec.ts` — "excludes an
      account that isn't in the list" and "returns an archived account's own transactions when that
      account is the one passed in")
- [x] Both balance charts use the shared tooltip formatter rather than `formatAxisTooltip`; component
      specs assert it on each. (`buildBalanceDayTooltip` wired in both option builders;
      `account-balance-history-chart.component.spec.ts` "hovering a day lists that day's transactions per
      account" and `account-balance-chart.component.spec.ts` "hovering a day lists that day's transactions
      with no account-name row" both drive the built option's `tooltip.formatter`)
- [x] The tooltip renders the day through `localeDate` and every amount through `formatCurrency`; unit
      test on the formatter output. (`balance-day-tooltip.spec.ts` — "renders the day through localeDate
      and every amount through formatCurrency": asserts `formatDate('2026-03-10')` is present and the raw
      bucket key is not)
- [x] On account detail the tooltip omits the account-name row and still shows the date, the day's
      transaction lines and the day's net change; unit test on the single-account rendering.
      (`showAccountNames: false`; `balance-day-tooltip.spec.ts` — "drops the account-name row on account
      detail, keeping the lines and the net". Confirmed live: no account name appears on any of
      `/accounts/1`'s 125 days.)
- [x] Accounts with no transactions that day are absent from the overview tooltip; unit test.
      (`balance-day-tooltip.spec.ts` — "omits accounts with no movement that day")
- [x] A day with no transactions renders the date plus a "No transactions" line on **both** charts, never
      an empty tooltip; unit test. (`balance-day-tooltip.spec.ts` — "falls back to a 'No transactions'
      line on a quiet day", looped over both `showAccountNames` values)
- [x] More than the per-account cap of transactions renders the cap plus a `+N more` line; unit test at
      the boundary (exactly the cap → no "more" line; cap + 1 → one), covering the detail chart too.
      (`balance-day-tooltip.spec.ts` — "shows exactly the per-account cap with no '+N more' line at the
      boundary" (5), "collapses the overflow into one '+N more' line at cap + 1" (6), and "truncates on
      account detail too" (30 → `+25 more`). **Scope addition, flagged rather than assumed:** live
      verification showed the two caps this criterion names are not enough on their own — each account
      also costs a name row, a net row and a `+N more`, so ten moving accounts would still be ~40 rows.
      A third cap, `MAX_ACCOUNTS = 4` with a trailing `+N more accounts`, was added and tested — "caps the
      accounts too, so a day that moved everything cannot outgrow the viewport".)
- [x] On the overview, each account's line carries its own colour marker matching its band; unit test
      asserting the marker is emitted per account. (Markers are taken from the hover params themselves —
      the very swatch echarts drew — keyed by series name; `balance-day-tooltip.spec.ts` — "names each
      account with its own band marker")
- [x] `formatAxisTooltip` and every non-balance chart's tooltip are unchanged; `git diff` touches no other
      chart's `tooltip` config. (`git diff` over `shared/echarts/tooltip-formatter.ts` is empty, and the
      only `tooltip:` blocks in the diff are the two balance charts')
- [x] Clicking a band on the overview still navigates to that account's detail page, and clicking a point
      on the detail chart still opens `/transactions` filtered to that day and account; existing specs
      pass unchanged (the detail chart's single-day drill-down comes from TICKET-ACC-10). (Neither
      `onChartClick` was touched; the TICKET-ACC-10 drill-down spec still passes)
- [x] Hover stays responsive on a full dataset — the lookup indexes transactions by day once rather than
      scanning the whole array per hover; unit test asserting the index is built from the input, plus a
      note in the helper's doc comment. (`balanceTrendSignals.dayIndex` is a `computed()` beside `series`,
      so it is rebuilt with the data and not per hover; the note is on `DayTransactionIndex`;
      `day-transactions.spec.ts` — "indexes the whole input once, so a hover is a Map lookup rather than
      an array scan" asserts 500 transactions produce 28 day entries up front)
- [x] No persistence changes, no Dexie version bump. (nothing under `core/data-access/` in the diff)
- [x] `angular.json` bundle budgets not raised. (`angular.json` untouched; dev build initial total
      2.15 MB)
- [x] Verified via the `fallow` skill and the `coding-conventions` skill. (`fallow audit --base HEAD`:
      verdict **pass**, zero introduced findings, after decomposing `buildDayTransactionIndex` (an
      `upsert` helper and an extracted comparator) and the tooltip's returned closure (`hoveredDay`,
      `headerFor`, `shownLineCount`, `renderMovements`), all of which had tripped the CRAP threshold;
      `ng lint` clean, 2251/2251 specs green, dev build compiles)
- [x] Verified live in the browser on **both** charts: hovering a day with a salary deposit names the
      deposit; hovering a quiet day says so; a payday with many rows truncates instead of overflowing.
      (Done on the dev server at :4210. The Browser pane had been closed — the user chose to continue
      without it — so this pass drives the live charts' own `tooltip.formatter` through Angular's
      dev-mode `ng.getDirectives` for all 125 days rather than hovering by hand.
      **`/accounts`:** 2026-05-01 → `<b>05/01/2026</b> ●Everyday Checking · ACME Corp: €2,800.00 · Net
      €2,800.00`; 2026-05-20 (an inter-account transfer) names both accounts with their own markers and
      opposite nets; 2026-04-01 → `No transactions`. **`/accounts/1`:** same days, same content, and no
      account-name row on any of the 125.
      **Truncation** could not be reproduced from the seeded data — no day there has more than two
      transactions on one account — so it is covered by the boundary unit tests above, and the
      *overflow* half was measured directly instead: the worst case the caps allow (4 accounts of 7,
      the 10-line budget spent, long counterparty names) rendered into the page at echarts' tooltip
      styling comes to 24 rows / **490 px** against an 800 px viewport. No console errors.)

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
