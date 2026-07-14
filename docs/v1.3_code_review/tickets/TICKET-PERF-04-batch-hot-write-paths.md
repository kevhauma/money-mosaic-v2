# TICKET-PERF-04 — Batch the hot write paths into bulk transactions

- **Area:** Performance (core write paths)
- **Type:** Refactor
- **Traceability:** CR-3.1 (carried over from the first review, still open — re-verified 2026-07-14)

## User story

As a user running rules or auto-linking transfers over a large dataset, I want the resulting writes batched, so a pass that touches hundreds of rows completes in a few IndexedDB transactions instead of hundreds.

## Description

Three hot paths persist row-by-row. The rules engine awaits one `update` per categorised transaction (the repository already exposes `bulkUpdate`, used by bulk category assignment). Transfer auto-linking calls `linkAuto` per candidate, and each call opens its **own** Dexie `rw` transaction. Category removal similarly fans out per-transaction updates.

## Current situation (as-is)

- [rules-engine.service.ts:36-40](../../../src/app/core/categorisation/rules-engine.service.ts) — `Promise.all(updates.map(update => transactionsRepository.update(...)))`; [transactions.repository.ts:17-18](../../../src/app/core/data-access/transactions.repository.ts) already has `bulkUpdate` (built for TICKET-TXN-01).
- [transfer-matching.service.ts:36-45](../../../src/app/core/transfers/transfer-matching.service.ts) — sequential `await linkAuto(...)` per candidate; each invocation opens its own `appDb.transaction('rw', …)` ([transfer-linking.service.ts:26](../../../src/app/core/transfers/transfer-linking.service.ts)).
- [categories.store.ts:71-80](../../../src/app/feature-categories/categories.store.ts) — category removal clears `categoryId`/`categoryManual` on referencing transactions; verify and batch its persistence the same way.

## Desired result (to-be)

- Rules pass: one `bulkUpdate` call for all updates.
- Auto-link pass: one `rw` transaction wrapping all links of the pass (e.g. a `linkAutoBatch(candidates)` on `TransferLinkingService` that reuses the single-link logic per candidate inside one transaction scope), so a mid-pass failure rolls back the whole pass instead of leaving it half-linked.
- Category removal: one bulk write for the clearing updates.

## Acceptance criteria

- [ ] No per-row `transactionsRepository.update` loops remain on the three named paths (bulk category assignment's existing path is the reference pattern).
- [ ] Auto-link runs in a single Dexie transaction per pass; a forced mid-pass failure (spec with a throwing fake) leaves zero new transfer rows and zero mutated transactions.
- [ ] Rule semantics unchanged, including the `categoryManual`/transfer-leg skips — existing `rules-engine.service` and `transfers.store` specs pass; TICKET-TRF-01's cleared-category-on-link behaviour is preserved inside the batch.
- [ ] Unit tests cover: N-update rules pass persists via one `bulkUpdate`; batch auto-link links all candidates atomically; category removal clears referencing rows in one write.
- [ ] Verified via the fallow skill and coding-conventions skill.

## Notes

- Sequence relative to TICKET-PERF-02 (rules pass preparation) is free — they touch different halves of the rules path; doing them together in one branch is sensible.
- All persistence stays behind repositories/services — the batch wrapper belongs in `TransferLinkingService`, not in a store.
