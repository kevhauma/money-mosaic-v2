# TICKET-INC-13 — Smooth an embedded bonus out of the income-by-month chart

- **Area:** Income
- **Released in:** [v1.6 Income & growth](../../releases/v1.6_income_growth/overview.md)
- **Type:** Bug fix
- **Traceability:** extends FR-INC-4 (annual lump-sum smoothing) / FR-INC-10 (`SalaryMetadata.bonus`)

## User story

As a user, I want the bonus I recorded on a month's salary details to be spread across its year on the
Income-by-month chart the same way a flagged bonus *category* is, so a 13th month baked into my regular
salary deposit stops drawing a spike I already told the app about.

## Description

`SalaryMetadata.bonus` (FR-INC-10) is the user telling the app "this part of that month's deposit was a
13th month / vacation pay, not regular wage". Today that statement only reaches the take-home-rate panel
(FR-INC-11); the headline "Income by month" chart, the growth panel and the step-change detector all still
draw the full deposit, so the spike FR-INC-4 exists to remove survives for exactly the users whose payroll
embeds the bonus rather than paying it separately.

## Current situation (as-is)

- `SalaryMetadata.bonus` has exactly one consumer:
  [gross-net-ratio.ts](../../../src/app/core/stats/gross-net-ratio.ts) subtracts it from `net` before
  dividing. Nothing else in `core/stats/` reads it.
- The chart, growth panel (FR-INC-5) and step-change detector (FR-INC-8) all read
  `IncomeStore.incomeTrend()` ([income.store.ts](../../../src/app/feature-income/income.store.ts)), which is
  `smoothAnnualLumpSums(rawIncomeTrend(), smoothedBonusCategoryIds(), INCOME_GRANULARITY)`.
- **Root cause:** [annual-lump-sum-smoothing.ts](../../../src/app/core/stats/annual-lump-sum-smoothing.ts)
  smooths a whole *category's* yearly total across that year's buckets. A bonus embedded inside the regular
  salary deposit is not its own transaction and not its own category, so it has no id to appear in
  `smoothedBonusCategoryIds` — the smoothing pass simply never sees it, and its month keeps the whole
  deposit. TICKET-INC-04's Notes already record these as "two separate, complementary mechanisms"; the
  second mechanism just never got a smoothing pass of its own.
- Consequence today: a June deposit of 4,160 (2,000 of it holiday pay) draws a June spike on the chart, can
  trip FR-INC-8's ±15% step-change detector as a phantom raise, and inflates the `vs. previous month` card
  in July's direction — all from data the user already annotated.

## Desired result (to-be)

- New pure helper `smoothEmbeddedBonuses(trend, salaryMetadataByMonth, granularity)` in
  `core/stats/embedded-bonus-smoothing.ts`, shaped like `smoothAnnualLumpSums`: takes an
  `IncomeCategorySeries`, returns one with each year's recorded bonuses lifted out of their deposit months
  and spread evenly across that year's buckets.
  - **Removal**, per bucket with a `bonus`: subtract it *pro rata* across the series that are non-zero in
    that bucket (their share of that bucket's total). One income category is the overwhelmingly common
    case, where this is simply "take it off the salary line"; pro rata keeps it well-defined when it isn't,
    without needing to guess which category the deposit landed in. Never drives a series negative — the
    removal is capped at that bucket's total (see Notes).
  - **Redistribution**, per calendar year: add the year's removed total back across that year's buckets
    evenly, ~~split between series by each series' share of that year's (bonus-free) total~~ **handing each
    series back its own removed total**. Each series' *annual* total is therefore preserved exactly — only
    its month-to-month shape changes.

    > **Amended 2026-08-01, during implementation.** The struck wording and the sentence after it
    > contradict each other: removal is pro rata *per bucket*, so re-splitting the pooled total by each
    > series' share of the *year* only returns to a series what it lost when those two shares happen to
    > coincide. Preserving each series' annual total — which both the sentence above and acceptance
    > criterion 1 require — means giving each series back exactly what came off it. In the
    > overwhelmingly common single-income-category case the two readings are identical.
  - `granularity !== 'month'` is a documented pass-through no-op (the same rule
    `smoothAnnualLumpSums` follows — `salaryMetadata` is keyed `YYYY-MM`, so any other bucket size has
    nothing to join on). Returns the input object by reference when no month in range carries a `bonus`.
- `IncomeStore.incomeTrend` composes both passes:
  `smoothEmbeddedBonuses(smoothAnnualLumpSums(rawIncomeTrend(), …), salaryMetadataByMonth(), INCOME_GRANULARITY)`.
  `rawIncomeTrend` is untouched, so FR-INC-9's gap detection and FR-INC-11's take-home panel keep reading
  the real deposit in the real month.
- No new setting: entering a bonus figure *is* the opt-in. A user who wants that month to keep its spike
  simply doesn't record the bonus.

## Acceptance criteria

- [x] `smoothEmbeddedBonuses()` preserves each year's total exactly (sum of smoothed buckets in a year ≈ sum
      of raw buckets in that year, within rounding) and preserves each series' own annual total — unit test
      over a flat 2,000/month salary plus a June deposit of ~~4,160~~ **4,000** with `bonus: 2000`.
      (`embedded-bonus-smoothing.spec.ts` → "preserves the year's total exactly" and "preserves each
      series' own annual total, not just the year's". **Fixture amount corrected**: at 4,160 the next
      criterion is unsatisfiable, since 4,160 − 2,000 = 2,160 ≠ the flat 2,000 it asks June to drop to.)
- [x] That fixture's June bucket drops to the flat monthly figure and every other month of that year rises
      by `2000 / 12` — unit test asserting the actual per-bucket values, not just the total. (Spec "drops
      June to the flat monthly figure and lifts every month of the year by the bonus's twelfth", which
      asserts `2000 + 2000/12` on June, January and December and that all twelve values are identical.)
- [x] A year with no `bonus` recorded anywhere passes through unchanged, and the whole helper returns the
      input object **by reference** when no month in range carries a bonus — unit test asserting `toBe`.
      (Specs "returns the input object by reference when no month in range carries a bonus", "…for a month
      with salary details but no bonus", "ignores a bonus recorded for a month outside the series".)
- [x] `granularity !== 'month'` returns the input series unchanged for every category — `it.each` over
      day/week/quarter/year asserting `toBe` on the input object. (Spec block "smoothEmbeddedBonuses:
      monthly granularity only".)
- [x] A `bonus` larger than that month's total selected-category income is capped at the total rather than
      driving a series negative; unit test (see Notes for why this is reachable).
      (`removableBonuses()`'s `Math.min`; specs "caps the removal at that month's counted income rather
      than driving a series negative" and "leaves a month with no counted income at zero, not NaN".)
- [x] A month with a `SalaryMetadata` row but no `bonus`, and a bonus-only row with no `grossWage`, both
      behave correctly (the latter still smooths — the bonus is a fact independent of the gross entry).
      (Specs "returns the input object by reference for a month with salary details but no bonus" and
      "still smooths a bonus-only row with no grossWage — the bonus is a fact of its own".)
- [x] Both smoothing passes compose: a category flagged under FR-INC-4 *and* a month carrying an embedded
      bonus produce the same annual total as the raw series — unit test at `IncomeStore` level.
      (`income.store.spec.ts` → "IncomeStore: incomeTrend composes both smoothing passes (TICKET-INC-13)"
      → "preserves the year's total when a flagged category and an embedded bonus both apply", asserting
      13,200 overall plus 12,000/1,200 per series, and that both passes visibly fired.)
- [x] `IncomeStore.rawIncomeTrend()` is unchanged, and `computeGrossNetRatio` still receives it — regression
      test that the take-home panel keeps the bonus in its real month (TICKET-INC-11's criterion 1 must
      still hold). (`income.store.ts` composes the new pass into `incomeTrend` only, leaving
      `rawIncomeTrend` untouched; spec "leaves rawIncomeTrend showing the real deposit in its real month";
      `income-gross-net-panel.component.spec.ts`'s existing suite still passes unchanged.)
- [x] Persistence untouched: no new `AppSettings` field, no Dexie version bump, no direct `appDb` access.
      (`git diff` touches no `app-db.ts`, no repository, and no `appSettings` field — the whole change is
      one new pure module plus its wiring.)
- [x] `angular.json` bundle budgets not raised. (`git diff` touches no `angular.json`;
      `ng build --configuration development` completes with no budget warning.)
- [x] Verified via the `fallow` skill and the `coding-conventions` skill. (`fallow audit --base HEAD` →
      `verdict: pass`, `complexity_introduced: 0` after splitting `reshapeSeries`/`bucketsPerYearOf` out
      of the main function; the new module follows `annual-lump-sum-smoothing.ts`'s shape exactly —
      pure, exported through `core/stats/index.ts`, granularity guard and by-reference pass-through.)
- [ ] Verified live in the browser: record a bonus on a month with a visible salary spike, confirm the
      "Income by month" chart flattens it across that year while the take-home panel keeps showing it in its
      real month. — **skipped at the user's request** ("skip the browser check"), not verified.

## Notes

- The cap in criterion 5 is genuinely reachable, not defensive padding: the bonus is entered against the
  whole deposit, but `net` only counts the categories the user selected under FR-INC-3 — deselect the
  salary category and the month's counted income can be smaller than the bonus recorded against it.
- Redistribution is evenly across the year's buckets (not across the *remaining* buckets), matching
  `smoothAnnualLumpSums` exactly — a user comparing the two mechanisms shouldn't find they smooth
  differently.
- Deliberately query-time, like FR-INC-4: recorded bonuses are never written back onto transactions, so
  editing or clearing a month's bonus re-shapes the chart immediately.
- Interacts with TICKET-INC-14: that ticket takes the *other* branch, deliberately excluding smoothed
  income from the take-home basis. These stay consistent because both read the same recorded `bonus` figure
  — this one redistributes it on the trend chart, that one removes it from the ratio.
