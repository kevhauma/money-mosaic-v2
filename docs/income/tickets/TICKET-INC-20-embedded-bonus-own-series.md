# TICKET-INC-20 — A smoothed embedded bonus gets its own series on the income trend chart

- **Area:** Income
- **Released in:** [v1.6 Income & growth](../../releases/v1.6_income_growth/overview.md)
- **Type:** Feature
- **Traceability:** revises TICKET-INC-13 (embedded-bonus smoothing) / extends FR-INC-2, FR-INC-10

## User story

As a user whose 13th month is baked into a salary deposit, I want the bonus I recorded to appear as its own
band on the Income-by-month chart, so I can see how much of my year was bonus instead of having it silently
folded back into my salary line.

## Description

TICKET-INC-13 lifts a recorded bonus out of its deposit month and spreads it across the year — but it hands
each series back its *own* removed total, so the bonus lands straight back on the salary band and becomes
invisible. This gives the redistributed amount its own series, its own legend entry and its own colour, so
the chart says "of this year, this much was bonus" rather than quietly inflating salary by a twelfth.

## Current situation (as-is)

- [embedded-bonus-smoothing.ts](../../../src/app/core/stats/embedded-bonus-smoothing.ts)'s `reshapeSeries`
  redistributes with `value + removedPerYear.get(year) / bucketsPerYear.get(year)` — **the same series it
  came off**. TICKET-INC-13's amendment note chose this deliberately, to preserve each series' annual total
  exactly.
- Consequence: on a flat 2,000/month salary with a June deposit of 4,000 carrying `bonus: 2000`, every
  month draws exactly 2,166.67 of "Salary". The spike is gone, which was the fix — but so is the bonus. The
  legend has no bonus entry, the tooltip attributes the twelfth to Salary, and the only place the figure
  survives is the salary details form the user typed it into.
- Everything downstream inherits the same blind spot: the growth panel
  ([income-growth-panel.component.ts](../../../src/app/feature-income/components/income-growth-panel/income-growth-panel.component.ts))
  and the step-change detector
  ([income-step-change-detection.ts](../../../src/app/core/stats/income-step-change-detection.ts)) both read
  `IncomeStore.incomeTrend()` and see one salary series that includes bonus.
- Meanwhile FR-INC-4's *category* smoothing has the opposite property: a bonus with its own category keeps
  its own band on the chart, it's only flattened across the year. The two mechanisms are supposed to be
  complements, and today they present differently for the same underlying event.

## Desired result (to-be)

- `smoothEmbeddedBonuses` returns the trend with one **extra `CategorySeriesEntry` appended**: everything
  removed from every series that year, spread evenly across that year's buckets. Real categories keep only
  their non-bonus remainder; the new entry carries the bonus.
- The synthetic entry is identified by an exported sentinel — `SMOOTHED_BONUS_CATEGORY_ID = -1` — rather
  than `categoryId: null`, which already means "Uncategorised" to
  [gross-net-ratio.ts](../../../src/app/core/stats/gross-net-ratio.ts)'s counted-series filter. Dexie
  auto-increment ids start at 1, so a negative id can never collide with a real category. Name and colour
  are constants on the module (`'Bonus (spread over the year)'` and a fixed colour distinct from the
  category palette) — it is a derived band, not a `Category` row.
- The entry appears **only when something was actually removed**; a range with no recorded bonus keeps
  returning the input object by reference, unchanged, with no empty extra series in the legend.
- Totals are unaffected: the sum across all series per bucket, and per year, is identical to today's — the
  bonus moves between series, it isn't added or dropped. The yearly panel (a single total bar series) and
  the chart's `sr-only` table therefore need no change at all.
- [income-step-change-detection.ts](../../../src/app/core/stats/income-step-change-detection.ts) **skips the
  synthetic series**: a bonus that grows from 2,000 one year to 4,000 the next would otherwise register as a
  sustained +100% "raise" in January, which is exactly the phantom event FR-INC-8 exists to avoid.
- `rawIncomeTrend` is untouched, so FR-INC-9's gap detection and the "Net vs gross" section (which reads
  `rawIncomeTrend`) keep seeing the real deposit in its real month and are unaffected by the new series.

## Acceptance criteria

> **Implementation note, 2026-08-02 — two criteria are amended, both because they ask for something
> no smoothing pass can deliver.** (1) "Per-bucket … totals identical to the raw series" is false by
> construction: spreading a bonus across its year *moves money between buckets*, so the deposit month
> necessarily drops. What this ticket actually guarantees, and what the to-be section says in prose
> ("the sum across all series per bucket, and per year, is identical to **today's**"), is that the new
> band changes nothing versus TICKET-INC-13's existing output — the bonus moves between *series*
> within a bucket, never in or out of one. The per-*year* half is exact against the raw series and is
> asserted as such. (2) The `computeGrossNetRatio` criterion asks for "the ratio unchanged when the
> smoothed trend is passed through", which is likewise unattainable — the smoothed trend genuinely has
> a different June. Its own parenthetical names the real point ("it reads `rawIncomeTrend`, and this
> pins that"), so the tests assert that instead: the sentinel keeps the `categoryId === null` branch
> untouched, and the panel's figures come from the raw trend.

- [x] `smoothEmbeddedBonuses` appends exactly one extra series when any bonus was removed, carrying that
      year's removed total spread evenly across that year's buckets — unit test over the flat
      2,000/month + June 4,000 `bonus: 2000` fixture asserting Salary is flat 2,000 in all twelve months and
      the bonus series is `2000/12` in all twelve.
      (`embedded-bonus-smoothing.spec.ts`, "drops June to the flat monthly figure, with the bonus's
      twelfth on its own band" — Salary's twelve months collapse to one distinct value, June included, at
      2,000; the band is `2000/12` in all twelve. "appends exactly one extra series…" pins `series` at
      length 2.)
- [x] ~~Per-bucket and~~ per-year totals across all series are identical to the raw series — unit test on the
      same fixture (the existing "preserves the year's total exactly" guarantee must still hold, now summed
      including the new entry). **Amended per the note above:** per-bucket is asserted against
      TICKET-INC-13's output rather than the raw series.
      (`embedded-bonus-smoothing.spec.ts`: "preserves the year's total exactly, summed across every
      series" — 26,000 in, 26,000 out across both series; "preserves the per-bucket total across all
      series, not just the per-year one" — every bucket equals raw + a twelfth, minus June's spike, which
      is exactly the pre-INC-20 stacked height.)
- [x] Multiple years each get their own removed total spread within their own year — unit test over a
      two-year fixture with different bonuses, asserting no cross-year bleed.
      (`embedded-bonus-smoothing.spec.ts`, "keeps each year's bonus inside its own year rather than
      averaging across history": 2024's band sums to 1,200 and 2025's to 2,000, with per-year stacked
      totals of 25,200 and 26,000.)
- [x] No bonus anywhere in range still returns the input object **by reference**, with no extra series —
      unit test asserting `toBe`; likewise `granularity !== 'month'`.
      (`embedded-bonus-smoothing.spec.ts` → "nothing to smooth": the `toBe` identity cases plus "adds no
      empty extra series when there was nothing to remove"; "monthly granularity only" covers
      day/week/quarter/year. Both guards return before the append.)
- [x] The synthetic entry uses the exported `SMOOTHED_BONUS_CATEGORY_ID` sentinel, not `null`, and
      `computeGrossNetRatio`'s `categoryId === null` branch is provably unaffected — ~~unit test asserting the
      ratio is unchanged when the smoothed trend is passed through~~ (it reads `rawIncomeTrend`, and this
      pins that). **Amended per the note above.**
      (`embedded-bonus-smoothing.ts:19` exports the sentinel as `-1`; the spec asserts no series carries
      `categoryId: null`. `gross-net-ratio.spec.ts`, "leaves the counted-series filter's null branch
      untouched" — excluding a category through the smoothed trend still drops exactly that category's
      500 — and "reads the raw series, so the bonus band never reaches the take-home figures", which
      pins June's net at 800 off the raw trend and shows the smoothed one differs.)
- [x] `detectIncomeStepChanges` ignores the synthetic series — unit test with a bonus doubling between two
      years asserting no step-change event is produced for it, while a genuine salary raise in the same
      fixture still is.
      (`income-step-change-detection.ts:86-90` skips the sentinel; `income-step-change-detection.spec.ts`,
      "ignores the redistributed-bonus band, while still flagging a real raise beside it" — a band going
      `2000/12` → `4000/12` at the year boundary yields no event, while the salary raise in the same
      fixture still reports at `2026-07`.)
- [x] The trend chart renders the extra band with its own legend entry and its own colour, and legend
      clicks toggle it like any other series — component test on `buildIncomeTrendChartOption`'s output.
      (`income-overview.component.spec.ts`, "draws the redistributed-bonus band like any other series":
      its name is its own legend entry — which is what echarts toggles on a legend click, no extra code —
      with its own colour and the same `stack`. Confirmed live: the chart legend reads "Salary | Other
      Income | Bonus (spread over the year)".)
- [x] `IncomeStore.rawIncomeTrend()` is unchanged, and the "Net vs gross" section's figures are unchanged —
      regression test.
      (`income.store.spec.ts`, "leaves rawIncomeTrend showing the real deposit in its real month" —
      July's raw value stays 1,000. Confirmed live: with the band on the chart, "Net vs gross" still read
      June net €2,406.42 / gross €4,200.00 / take-home 57.3%, identical before and after the main
      category was set, and the events rail still listed the bonus under JUN.)
- [x] Persistence untouched: no new `AppSettings` field, no Dexie version bump, no direct `appDb` access.
      (This ticket's own diff is `core/stats/` + the chart spec only — `mainIncomeCategoryId` belongs to
      TICKET-INC-19. `smoothEmbeddedBonuses` derives the band at query time from `SalaryMetadata.bonus`;
      nothing is written.)
- [x] Unit tests cover: the appended series' values; totals preserved per bucket and per year; multi-year
      isolation; both by-reference pass-throughs; the sentinel id; step-change exclusion; and the chart
      option's legend/series output.
      (All of the above — `embedded-bonus-smoothing.spec.ts` alone is 29 cases. Full suite green: 220
      files, 2119 tests.)
- [x] `angular.json` bundle budgets not raised. (`angular.json` untouched — not in `git status`; the dev
      build reports no budget warnings.)
- [x] Verified via the `fallow` skill and the `coding-conventions` skill.
      (`fallow audit --base HEAD` → verdict `pass`: 0 dead-code issues, 0 duplication, 0 boundary
      violations, all 5 complexity findings `introduced: false`. `conventions-reviewer` found no
      hard-rule violations; its actionable findings were applied. It flagged the band's fixed
      `#c9a227` as not theme-aware, unlike TICKET-SET-08's `resolveGrossSeriesColor` — kept as a module
      constant because this ticket's to-be section specifies exactly that, and noted below as follow-up.)
- [x] Verified live in the browser: record a bonus on a month with a visible spike and confirm the chart
      shows a separate bonus band across that year, the salary band drops to its flat figure, and the
      take-home panel still shows the bonus in its real month.
      (Dev server on :4210, June 2026 carrying `bonus: 1400`. The chart legend gained a third entry,
      "Bonus (spread over the year)", drawn as a distinct gold band stacked above the categories across
      all five buckets at €280.00 each (1,400 ÷ 5). June's Salary band dropped from its 2,800 deposit to
      €1,400.00. Stacked totals — 280 / 4,080 / 2,686.42 / 4,080 / 4,080 — sum to €15,206.42, matching
      the yearly panel and the raw deposits exactly. "Net vs gross" still showed June net €2,406.42
      against gross €4,200.00, and the events rail still read "Bonus of €1,400.00 recorded on your salary
      details" under JUN. No console errors.)

## Notes

- **Not a real `Category` row.** No transaction belongs to it — it's derived from `SalaryMetadata.bonus` at
  query time, like every other smoothing pass on this page, so a Dexie category would be a row nothing can
  ever be assigned to and would show up in every category picker in the app. The user-visible outcome
  ("bonus is its own thing on the chart") is the same.
- Pairs with [TICKET-INC-19](./TICKET-INC-19-main-income-category-for-embedded-bonus.md), which changes
  where the bonus is *taken from*. Independent of it — this ticket only changes where the removed amount
  *lands* — but shipping INC-19 first makes the removal single-sourced, so the new band is unambiguously
  "bonus taken off my main income category".
- The alternative discriminator, an optional `synthetic?: true` flag on `CategorySeriesEntry`, was rejected:
  that type is shared with the dashboard's composition trend, and a sentinel id local to this module keeps
  the change inside the one file that creates the series.
- FR-INC-4's per-category smoothing is deliberately *not* changed to match — a flagged bonus category
  already has its own band, which is exactly the shape this ticket gives the embedded case.
- **Follow-up: the band's colour is theme-blind.** `SMOOTHED_BONUS_SERIES_COLOR` is one fixed hex on
  the module, as this ticket's to-be section specifies, while TICKET-SET-08 routes the gross series
  through `resolveGrossSeriesColor` so it tracks the active theme's plot background. Across the app's
  nine theme styles a single gold is a compromise, not a tuned choice, and it has not been
  CVD-validated against the per-theme categorical palettes. Moving it into
  `shared/echarts/chart-theme.ts` beside the palettes it has to contrast with is the obvious next
  step, and is a change to that module rather than to this one.
