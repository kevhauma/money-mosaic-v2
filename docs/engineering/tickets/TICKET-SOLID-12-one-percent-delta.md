# TICKET-SOLID-12 — One `percentDelta` replaces the four private copies

- **Area:** Statistics (core/stats)
- **Released in:** _unreleased_
- **Type:** Refactor
- **Traceability:** CR6-A4 (`percentDelta` part), CR5-23; the "null, not ±∞%" rule of FR-STAT-11 (TICKET-STAT-07) and the income-growth figures (FR-INC-5, TICKET-INC-05 / TICKET-INC-16)

## User story

As a developer changing how a percentage change is computed, I want one function every stat uses, so year-over-year, income growth and the category comparison can't round or guard differently.

## Description

"(current − prior) / |prior|, or `null` when prior is 0" is written four times under two names, and inlined twice more. They agree today; one shared function with one spec keeps it that way.

## Current situation (as-is)

- Named copies: [year-over-year.ts:53-54](../../../src/app/core/stats/year-over-year.ts) `percentDelta`, [income-growth.ts:59-60](../../../src/app/core/stats/income-growth.ts) `percentDelta`, [category-period-comparison.ts:34-35](../../../src/app/core/stats/category-period-comparison.ts) `percentDelta`, [gross-net-growth.ts:19-20](../../../src/app/core/stats/gross-net-growth.ts) `percentFrom`.
- Inline copies of the same expression (found while confirming; not in CR5-23): [yearly-income-summary.ts:27-30](../../../src/app/core/stats/yearly-income-summary.ts) `percentVsPrior` (adds a partial-year guard around it), [multi-year-income-comparison.ts:58-61](../../../src/app/core/stats/multi-year-income-comparison.ts) `pctChange`.
- Not a copy: [income-step-change-detection.ts:102](../../../src/app/core/stats/income-step-change-detection.ts) returns 0, not `null`, for a zero base — a different contract; leave it.

## Desired result (to-be)

- `percentDelta(current, prior): number | null` exported from one `core/stats` module (e.g. `percent-delta.ts`) and the `core/stats` barrel; the four named copies are deleted and the two inline expressions call it (keeping their own extra guards).
- It stays in `core/stats`, not root `shared/`: no server code computes a percentage change.

## Acceptance criteria

- [ ] `percentDelta(120, 100)` is 0.2; `(80, 100)` is −0.2; `(50, -100)` is 1.5; `(10, 0)` is `null`.
- [ ] `grep -rn "/ Math.abs(" src/app/core/stats` outside specs matches only the shared function and `income-step-change-detection.ts`.
- [ ] Specs of year-over-year, income-growth, category-period-comparison, gross-net-growth, yearly-income-summary and multi-year-income-comparison pass unchanged.
- [ ] `ng lint`, `ng test`, `ng build --configuration development` pass.
- [ ] Verified via the fallow skill and coding-conventions skill.

## Notes

- Pure refactor; no browser check.
- The balance formula (the other CR6-A4 duplicate) is [TICKET-SOLID-09](./TICKET-SOLID-09-shared-balance-formula.md).
