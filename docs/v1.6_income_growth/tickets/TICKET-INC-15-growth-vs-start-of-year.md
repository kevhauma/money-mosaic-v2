# TICKET-INC-15 — Compare against the start of the year, not the previous month

- **Area:** Income
- **Type:** Refactor
- **Traceability:** revises FR-INC-5 (income growth-rate panel)

## User story

As a user, I want the growth panel's first card to compare my last complete month against the first month
of that same year — shown as free-standing cards I can click through to the transactions behind them, like
the dashboard's stats — so I see how far my income has moved this year rather than a month-to-month wobble
that tells me nothing about growth.

## Description

Replaces the growth panel's "vs. previous month" comparison with "vs. start of year". A one-month delta on
a salary that changes once or twice a year is almost always 0%, and when it isn't, it's noise — a shifted
pay date or a reimbursement. The year's opening month is a stable baseline that actually answers "am I
ahead of where I started". While the panel is being reworked, the two cards also stop being nested inside
a panel wrapper and start behaving like the dashboard's stat cards: free-standing, and each linking to the
transactions behind its own comparison.

## Current situation (as-is)

- [income-growth.ts](../../../src/app/core/stats/income-growth.ts)'s `computeIncomeGrowth` returns
  `{ current, priorPeriod, priorYear }`. `priorPeriod` is built by walking back exactly one window length
  in `bucketKeys` (`startIndex = span[0] - spanLength(span)`) — for the panel's one-month window, that is
  literally the month before.
- [income-growth-panel.component.ts](../../../src/app/feature-income/components/income-growth-panel/income-growth-panel.component.ts)
  renders it as the `vs. previous month` card, with `no earlier month to compare against` as its
  missing-reason text.
- The window compared is always the last *complete* calendar month (`lastCompleteBucketKey`), which stays
  exactly as it is — this ticket only changes what it's compared **against**.
- `priorYear` (same month one year back) is untouched and remains the second card.
- **Wrapper:** [income-growth-panel.component.html](../../../src/app/feature-income/components/income-growth-panel/income-growth-panel.component.html)
  nests both `mm-stat-card`s inside an `mm-paper` with an "Income growth" heading and a caption — a card
  inside a card. The dashboard does the opposite: its stat row has *no* `mm-paper` at all
  ([dashboard-overview.component.html](../../../src/app/feature-dashboard/components/dashboard-overview/dashboard-overview.component.html)),
  just `<div class="flex flex-wrap gap-6 py-2">` holding free-standing cards with alternating
  `tilt="a"`/`tilt="b"` — the comment there spells out the intent ("each stat is its own free-standing card,
  not a joined `.stats` strip"). The two surfaces render the same component and don't look like each other.
- **Links:** `StatCardComponent` already supports `link` + `queryParams`
  ([stat-card.component.ts](../../../src/app/shared/ui/stat-card/stat-card.component.ts)), and the
  dashboard's stats use it — `link="/transactions"` with
  `buildTransactionDrilldownParams({ from, to })` ([search-params.ts](../../../src/app/shared/utils/search-params.ts)),
  which also gives them the hover/squish affordance (`linkClasses`). The income growth cards set neither, so
  the figure is a dead end: the only way to see what produced a `-12%` is the tooltip.

## Desired result (to-be)

- `IncomeGrowth.priorPeriod` is replaced by `yearStart: IncomeGrowthWindow | null` — the **first bucket of
  the same calendar year** as the compared window (`bucketKeys` entries share the `YYYY` prefix), read out
  of the series the same way the other windows are, never recomputed.
- `yearStart` is `null` when there is nothing meaningful to compare:
  - the compared month *is* the year's first bucket (comparing January to itself is 0% by construction), or
  - the series doesn't cover that year's opening bucket (a career start or import that begins mid-year).
- The card becomes `vs. start of year`, with `subLabel` unchanged in shape
  (`<year-start total> → <current total>`), a tooltip naming the baseline month and its figure (the
  existing `buildIncomeGrowthCard` behaviour), and a missing-reason of
  `no earlier month this year to compare against`.
- `growthColor`'s green/red/neutral rule is unchanged.
- **The two cards become free-standing, matching the dashboard's stat row.** The `mm-paper` wrapper and the
  `sm:grid-cols-2` grid are dropped for the dashboard's own `flex flex-wrap gap-6 py-2` container with
  alternating `tilt="a"`/`tilt="b"`, so the two surfaces finally read as the same component. The "Income
  growth" heading and the caption naming the compared month move above that row as plain page-level text —
  the caption is what makes both figures legible, so it can't be dropped with the wrapper.
- **Each card links to its own comparison window.** `link="/transactions"` with
  `buildTransactionDrilldownParams({ from: window.from, to: window.to })` — clicking "vs. start of year"
  opens that year's opening month, clicking "vs. same month last year" opens that month. Deliberately the
  *baseline* window rather than the shared current month: the current month is already named in the caption,
  and the baseline is the half of the comparison the user can't otherwise see. A card in its `—` state
  (no comparable window) sets no link — there's nothing to drill into.
- `buildIncomeGrowthCard` grows the `link`/`queryParams` pair on `IncomeGrowthCardVm`, built from the same
  window it already reads, so the card view-model stays the one place display facts are derived.
- **The year's first bucket present in the series**, not January by definition: for a user whose career
  start (FR-INC-12) or data begins in April, the year's opening month is April, and comparing December
  against it is exactly the intended reading. Only a *missing* year opening (the second bullet above)
  yields `null`.

## Acceptance criteria

- [x] `computeIncomeGrowth` returns `yearStart` in place of `priorPeriod`; unit test over a multi-year
      monthly series asserting the window's `from`/`to` land on the compared month's own calendar year's
      first bucket, and its `total` matches that bucket's summed series values. (`income-growth.ts`'s
      `yearStart()`; `income-growth.spec.ts` → "vs. start of year (FR-INC-5, TICKET-INC-15)" → "measures
      from January of the compared month's own year, not the month before", "names the window it compared
      against", "stays inside the compared month's year rather than walking back into the previous one".)
- [x] `pct` follows the existing `percentDelta` rule — `null` (rendered `—`) when the baseline month
      totalled zero, never `±∞`; unit test. (`percentDelta` is unchanged and shared by both windows; specs
      "is null (not ±∞%) for a category that did not exist in the prior period" and "never yields NaN or
      Infinity when both windows are zero".)
- [x] `yearStart` is `null` when the compared month is the year's first bucket; unit test, and the panel
      then shows `—` with the missing-reason text rather than `+0%`. (Specs "is null when the compared
      month is itself the year's opening bucket" and "has no prior period at the very first bucket of the
      series"; panel spec "shows no percentage rather than ±∞% when the compared month earned nothing".)
- [x] ~~`yearStart` is `null` when the series starts after that year's January~~ — e.g. a career start of
      2024-04 compared in 2024-09 — **unless** the year's first *available* bucket is what the user's
      history genuinely opens with; unit test both readings so the chosen rule is pinned (see Notes).
      **The two readings collapse into one**, and the "unless" wins: `bucketKeys` comes from
      `bucketKeysInRange` and is always contiguous, so the only way a year's January is absent *is* a
      history that opens mid-year — the genuine-start case. There is no reachable input for the struck
      clause, so implementing it would have been dead code. Pinned by spec "uses the year's first
      *available* bucket for a history that opens mid-year" (career start 2024-04, compared in 2024-09,
      baselines on April).
- [x] `priorYear` is byte-for-byte unaffected — every existing `income-growth.spec.ts` year-over-year case
      still passes unchanged. (`priorYear()` is untouched in the diff; the whole "year-over-year (FR-INC-5)"
      describe block is unedited and passes.)
- [x] The panel's first card reads `vs. start of year`; component spec asserts the label, the
      `<total> → <total>` sub-label and the tooltip's baseline month. (Panel specs "compares the last
      complete month against the start of its year and the same month a year back" and "names the baseline
      month and its figure in the card's sub-label and tooltip".)
- [x] Reads the smoothed series (`IncomeStore.incomeTrend()`) exactly as today — including
      TICKET-INC-13's embedded-bonus pass once that lands, so a bonus can't create a fake year-to-date jump.
      (`growth` still reads `incomeStore.incomeTrend()`, which TICKET-INC-13 already composed both passes
      into; panel specs "spreads a smoothed bonus over its year instead of reading it as a raise" and
      "reads the bonus as a spike when it is not marked for smoothing", both re-aimed at a January
      baseline.)
- [x] The two cards render free-standing in the dashboard's own container shape (no `mm-paper` around them,
      `flex flex-wrap gap-6 py-2`, alternating `tilt="a"`/`tilt="b"`); component spec asserts no `mm-paper`
      wraps the cards and that both tilts are applied. (Specs "renders the cards outside any mm-paper, in
      the dashboard's own stat-row container" and "alternates the tilt hooks, like the dashboard's row",
      asserting `mm-tilt-l`/`mm-tilt-r`.)
- [x] The "Income growth" heading and the compared-month caption survive the wrapper's removal and still
      render above the cards; component spec asserts both texts. (Spec "keeps the heading and the
      compared-month caption above the row".)
- [x] Each card carries `link="/transactions"` and `queryParams` built by
      `buildTransactionDrilldownParams` from **its own** comparison window's `from`/`to` — so the two cards
      link to different months; unit test on `buildIncomeGrowthCard` asserting the exact params, plus a
      component spec asserting the two rendered `routerLink`s differ. (Builder specs "links to its own
      baseline window, not the shared current month (TICKET-INC-15)" — asserting
      `{ from: '2026-01-01', to: '2026-01-31' }` exactly — and "links two different cards to two different
      months"; component spec "links each card to its own baseline month, so the two differ", asserting
      `2026-01-01` on the first `href` and `2025-07-01` on the second.)
- [x] A card with no comparable window (the `—` state) sets no `link`/`queryParams` and renders as plain
      text, not a dead link; unit test. (Builder spec "sets no link at all in the — state, so a dead card
      is not a dead link"; component spec "renders a card with no comparable window as plain text, not a
      dead link", asserting no `<a>` in that card.)
- [x] `mm-stat-card` itself is unchanged — no new input, no styling fork; the panel uses the existing
      `link`/`queryParams`/`tilt` inputs. (`git diff` touches nothing under `shared/ui/stat-card/`.)
- [x] No persistence changes, no Dexie version bump. (`git diff` touches no `app-db.ts` and no repository.)
- [x] `angular.json` bundle budgets not raised. (`git diff` touches no `angular.json`;
      `ng build --configuration development` completes with no budget warning.)
- [x] Verified via the `fallow` skill and the `coding-conventions` skill. (`fallow audit --base HEAD` →
      `verdict: pass`, `complexity_introduced: 0`. Conventions: the card view-model stays the one place
      display facts are derived, drilldown params go through `shared/utils`'s
      `buildTransactionDrilldownParams` rather than hand-built query strings, and the row copies the
      dashboard's own markup rather than forking it.)
- [ ] Verified live in the browser: the growth panel's left card reads "vs. start of year" with a plausible
      figure; in January (or with a mid-year career start) it shows `—` and its reason, not a broken value;
      the two cards sit free-standing like the dashboard's and each opens `/transactions` filtered to its own
      baseline month. — **skipped at the user's request** ("skip the browser check"), not verified.

## Notes

- Chosen reading: **first month of the same calendar year**, not "trailing 12 months" and not "year-to-date
  total vs. last year's same-period total". The user's request was literally "vs start of year", and a
  single-month-to-single-month comparison keeps both cards on the same footing — same current figure, two
  different baselines — which is what makes the panel readable.
- The two cards now answer genuinely different questions ("how far this year" and "how far since last
  year"), where previously the month-over-month card mostly answered "did anything shift by a few days".
- The drilldown filters by date range only, not by income category: `buildTransactionDrilldownParams` takes
  a single `categoryId`, while the growth figure sums the whole FR-INC-3 selection. Narrowing to one
  category would misrepresent the number the card shows, so the link lands on the month and lets the
  transactions page's own filters do the rest. Widening the drilldown params to a category *set* is a
  reasonable follow-up, not this ticket.
- `priorPeriod` has no other consumer — `computeIncomeGrowth` is called only from the growth panel — so
  this is a rename-and-reaim, not a deprecation with a migration path.
