# TICKET-STAT-24 — Decision-table spec for `classifyForStats`

- **Area:** Dashboard / Stats
- **Type:** Refactor (test-only)
- **Traceability:** CR4-3 Option C ([solution doc](../solutions/CR4-03-classify-for-stats.md))

## User story

As a developer who will someday edit the stats classifier, I want its behavior pinned by an exhaustive decision-table spec, so a future edit changes one table row instead of requiring me to re-reason about the interaction of exclusion ordering, override modes, joint special cases, and category-kind netting.

## Description

The chosen scope for CR4-3 is insurance, not restructuring: leave [classify-for-stats.ts](../../../src/app/core/stats/classify-for-stats.ts) untouched and extend its spec into a systematic table over the input axes. Options A (exclusion steps as data) and B (named joint strategies) are deliberately deferred until the next joint-account feature forces the file open — opening a hot-path, currently-correct file cold was judged the least attractive path.

## Current situation (as-is)

- [classify-for-stats.ts](../../../src/app/core/stats/classify-for-stats.ts): 54 lines, cyclomatic 26; the exclusion ordering (range → nullified → zero → savings → transfer-linked) and its constraints live only in a 22-line comment. [classify-for-stats.spec.ts](../../../src/app/core/stats/classify-for-stats.spec.ts) covers landmark cases, not the combination space.

## Desired result (to-be)

- An `it.each` decision table: rows of `(override mode | none) × (account joint/own) × (category kind) × (amount sign) × (nullified/transfer/savings flags)` → expected `StatsClassification`, with helper builders keeping rows readable.
- Ordering-sensitive cases (the TICKET-STAT-18 class of bug — a check inserted on the wrong side) each have an explicit row.

## Acceptance criteria

- [ ] Every branch of `classifyForStats` is hit by at least one table row (verify via coverage on this file).
- [ ] The nullified-before-savings ordering has a dedicated row that fails if the order flips (prove by locally swapping the checks once).
- [ ] No production code changes; `ng lint`, `ng test`, `ng build --configuration development` pass.
- [ ] Verified via the fallow skill and coding-conventions skill.

## Notes

- Boundary condition from the doc: any future restructuring must not re-fragment classification per aggregation (STAT-19's centralisation is deliberate) and must stay allocation-light on the hot path.
