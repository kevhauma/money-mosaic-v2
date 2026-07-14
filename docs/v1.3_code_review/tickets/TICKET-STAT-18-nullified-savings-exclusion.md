# TICKET-STAT-18 — Exclude nullified transactions from `savings`/`savingsRate`

- **Area:** Statistics (core/stats)
- **Type:** Bug fix
- **Traceability:** CR3-1.1; violates TICKET-TXN-04's acceptance criteria ("excluded from income, expense, net cash flow, savings rate")

## User story

As a user who nullified a savings movement (e.g. a mistaken or reversed deposit), I want it excluded from the `savings` figure and `savingsRate`, so the dashboard's savings stats reflect only real, kept savings — as the nullify feature promises.

## Description

`computePeriodStats` checks `isSavingsMovement` before `nullified`, so a nullified transaction whose counterparty is an own savings IBAN still adds to `savings` and inflates `savingsRate`. TICKET-TXN-04 and the function's own docblock both say a nullified transaction is skipped outright.

## Current situation (as-is)

- [period-stats.ts:76-86](../../../src/app/core/stats/period-stats.ts) — per-transaction check order is `inRange → isSavingsMovement (savings += …; continue) → transferId → nullified`. The savings branch `continue`s before the nullified check is ever reached.
- [category-breakdown.ts:100-105](../../../src/app/core/stats/category-breakdown.ts) checks the same predicates in a different order (`transferId → nullified → isSavingsMovement`) — harmless there since every branch is a bare `continue`, but the inconsistency is how this bug went unnoticed.

## Desired result (to-be)

- `if (transaction.nullified) continue;` runs **before** the `isSavingsMovement` branch in `computePeriodStats`.
- The `transferId` check stays **below** the savings check — a linked transfer leg whose counterparty is a savings account must keep counting toward `savings` (TICKET-TRF-02's linked-pair case).
- Docblock and behaviour agree again.

## Acceptance criteria

- [ ] A nullified transaction with an own-savings-IBAN counterparty contributes 0 to `savings`, `savingsRate`, `income`, and `expense`.
- [ ] A *linked transfer leg* to a savings account (not nullified) still contributes to `savings` — regression-guarded, since it depends on the check order this ticket touches.
- [ ] Unit tests cover: nullified savings deposit (excluded), nullified savings withdrawal (excluded), non-nullified savings deposit (still counted), linked savings transfer leg (still counted).
- [ ] Existing `period-stats.spec.ts` cases pass unchanged.
- [ ] Verified via the fallow skill and coding-conventions skill.

## Notes

- Two-line fix plus specs; do this **before** TICKET-STAT-19 so the shared classifier codifies the corrected order as the single source of truth.
