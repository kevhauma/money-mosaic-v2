# TICKET-STAT-24 — Decision-table spec for `classifyForStats`

- **Area:** Dashboard / Stats
- **Released in:** [v2 Code review (CR4)](../../releases/v2_code_review/overview.md)
- **Type:** Refactor (test-only)
- **Traceability:** CR4-3 Option C ([solution doc](../../releases/v2_code_review/solutions/CR4-03-classify-for-stats.md))

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

- [x] Every branch of `classifyForStats` is hit by at least one table row (verify via coverage on this file). (Measured with `@vitest/coverage-v8`: **100% branch** — 40/40 — plus 100% statements/lines/functions, from the two spec files alone. The first run came back 97.5%, missing the `ownershipShare ?? 1` fallback inside the untagged-refund rule; two rows for a joint account with no share configured closed it. The coverage provider isn't a project dependency — it was installed with `npm install --no-save` for the measurement and removed afterwards, so `package.json`/`package-lock.json` are untouched.)
- [x] The nullified-before-savings ordering has a dedicated row that fails if the order flips (prove by locally swapping the checks once). (Proven: moving the `nullified` check below the savings check failed exactly two tests — the new `nullified wins over the savings check (TICKET-STAT-18)` row and the pre-existing prose test — and nothing else. The classifier was then restored from git; `git diff` on it is empty.)
- [x] No production code changes; `ng lint`, `ng test`, `ng build --configuration development` pass. (Lint clean, dev build clean, 1517/1519 tests pass — the two failures are the pre-existing TF.js training-timeout flakes in `category-model.worker.spec.ts`, unrelated to `core/stats`.)
- [x] Verified via the fallow skill and coding-conventions skill. (`fallow audit` verdict **pass**: 0 dead-code issues, 0 complexity findings, 0 clone groups. The spec is TestBed-free per the pure-logic testing convention.)

## Notes

- Boundary condition from the doc: any future restructuring must not re-fragment classification per aggregation (STAT-47's centralisation is deliberate) and must stay allocation-light on the hot path.

## Implementation notes

- The table lives in a **new** `classify-for-stats.decision-table.spec.ts` rather than replacing `classify-for-stats.spec.ts`. The existing file documents landmark cases in prose and is the better read for *why*; the table is the systematic net for *what*. 40 rows across four tables: exclusion ordering, own account, joint account, and `attributionOverride`.
- Each ordering row satisfies the *later* check as well, so it only passes while the earlier check still runs first — that's what makes a flipped pair fail rather than silently pass.
- Two behaviours the table pins that weren't previously covered anywhere, both consequences of where the `neutral`/refund rules sit rather than deliberate design: a **neutral-category joint outflow** is still counted as `jointSpend` (the neutral exclusion only reaches positive amounts via `coOwnerIn`, or the own-account path via `categoryKindContribution`), and a **`shared`-override inflow under an expense category** buckets as income by weight sign, because the untagged-refund rule is guarded on there being no override at all. Neither was changed — they are recorded as-is, per the ticket's "insurance, not restructuring" scope.
