# TICKET-STAT-48 — Year-over-year needs a fully covered prior year

- **Area:** Statistics (core/stats)
- **Released in:** _unreleased_
- **Type:** Bug fix
- **Traceability:** CR6-16; fixes FR-STAT-11 ([TICKET-STAT-07](./TICKET-STAT-07-year-over-year-comparison.md)); restores the "hide, don't lie" rule `income-growth.ts` already states

## User story

As a user whose history starts part-way through last year, I want the year-over-year comparison to stay hidden until the prior year is fully covered by my data, so I never see "+80% income" that only means "last year had six months of imports".

## Description

The comparison drops a prior year only when that whole shifted range lies before the first transaction. A shifted range that _starts_ before the data does is still compared, so the prior figure is a partial year passed off as a full one.

## Current situation (as-is)

- [year-over-year.ts:101](../../../src/app/core/stats/year-over-year.ts) — `if (shifted.to < earliest) break;` is the only coverage check. History from 2025-06-10, range 2026-01-01..2026-11-15: the 1-year-back range 2025-01-01..2025-11-15 has `to` after `earliest`, so it is computed over ~5 months of data and income reads as roughly +80%.
- [income-growth.ts:35](../../../src/app/core/stats/income-growth.ts) documents YoY as "`null` when the series doesn't cover it in full — 'hide, don't lie', as in `computeYearOverYearComparison`", which the code does not do.
- Consumer: [stats.store.ts:156](../../../src/app/feature-dashboard/stats.store.ts) (`yearOverYear`).

## Desired result (to-be)

- A prior year qualifies only when `shifted.from >= earliest`; the loop stops at the first year that fails, so `priorYears` holds only fully covered years and `delta` is `null` when the immediate prior year is partial.
- The docblock on `computeYearOverYearComparison` states the full-coverage rule.

## Acceptance criteria

- [ ] History from 2025-06-10, range 2026-01-01..2026-11-15: `priorYears` is empty and `delta` is `null`.
- [ ] History from 2025-01-01, same range: 2025-01-01..2025-11-15 qualifies and `delta` is computed against it.
- [ ] History from 2024-03-01, `yearsBack = 3`, range 2026-01-01..2026-11-15: exactly one prior year (2025) is returned; 2024 is partial and stops the loop.
- [ ] Existing specs in `year-over-year.spec.ts` pass; the "stops requesting years earlier than the dataset's earliest transaction" case is updated or joined by a partial-start case.
- [ ] `ng lint`, `ng test`, `ng build --configuration development` pass.
- [ ] Live browser check: with history starting mid-last-year, the dashboard's YoY figures are hidden; with a full prior year they show.
- [ ] Verified via the fallow skill and coding-conventions skill.

## Notes

- `earliest` is taken from the transactions passed in, not account opening dates; keep that (the aggregator isn't account-scoped).
- Same boundary rule as the yearly income summary's partial-year guard; no shared helper is needed for one comparison.
