# TICKET-CLEANUP-01 — Remove Fallow-verified dead code (and correct stale CR-6.2)

- **Area:** Dead code (core/data-access, feature-categories, shared/utils)
- **Type:** Chore
- **Traceability:** CR2-6.4 (Fallow 3.2.0 `dead-code`, 2026-07-07, each item grep-verified); supersedes part of first-review CR-6.2/CR-6.3

## Description

A Fallow dead-code pass, manually verified item by item (16 of its 20 `unused-class-member` findings were false positives — see review §6.5), leaves a short list of genuinely dead symbols. One additional outcome: the *first* review's CR-6.2 story is now stale — it recommends deleting `TransactionsRepository.getByAccount`, which has since become load-bearing. This ticket removes what's actually dead and corrects that story so nobody deletes live code on old advice.

## Current situation (as-is)

Grep-verified (2026-07-07) dead symbols:

- `TransactionsRepository.add` and `.remove` ([transactions.repository.ts:13,22](../../../src/app/core/data-access/transactions.repository.ts)) — zero call sites (all writers use the bulk methods or `update`).
- `MappingProfilesRepository.getByBankAndAccount` and `.remove` ([mapping-profiles.repository.ts:8,23](../../../src/app/core/data-access/mapping-profiles.repository.ts)) — zero call sites (the store's `findForBankAndAccount` filters in memory; nothing deletes profiles yet).
- `describeCondition` ([rule-summary.ts:20](../../../src/app/feature-categories/rule-summary.ts)) — used only within its own file; the `export` is dead.
- `DEFAULT_TEXT_DEBOUNCE_MS` ([debounced-text.ts:7](../../../src/app/shared/utils/debounced-text.ts)) — used only as the in-file default; the `export` is dead.
- Already tracked by CR-6.3 (do here if convenient): un-export the `AppDb` class ([app-db.ts:291](../../../src/app/core/data-access/app-db.ts); the `appDb` singleton stays exported) and the `RangeState` type ([range-state.store.ts:4](../../../src/app/core/stats/range-state.store.ts)).
- **Stale advice:** [../../code-review/user-stories.md](../../code-review/user-stories.md) CR-6.2 lists `TransactionsRepository.getByAccount` as confirmed-unused, but `AccountDeletionService.cascadeTransactions` ([account-deletion.service.ts:61](../../../src/app/core/accounts/account-deletion.service.ts)) now calls it.

## Desired result (to-be)

- The four dead repository members are deleted; the two dead `export` keywords are removed (declarations stay).
- CR-6.2's story text in the first review's backlog no longer names `getByAccount` as removable (annotate, don't rewrite history: e.g. a bracketed correction with date).
- If a symbol must stay exported for a concrete near-term plan (e.g. `MappingProfilesRepository.remove` for a planned profiles-management UI), keep it with a `/** @expected-unused */` JSDoc tag instead of silence, so the intent is machine-checked for staleness.

## Acceptance criteria

- [x] `TransactionsRepository.add`/`.remove` and `MappingProfilesRepository.getByBankAndAccount`/`.remove` no longer exist (or carry `@expected-unused` with a reason referencing a planned story).
- [x] `describeCondition` and `DEFAULT_TEXT_DEBOUNCE_MS` are no longer exported; their in-file usages are untouched.
- [x] `TransactionsRepository.getByAccount` is **not** removed; the CR-6.2 story text is corrected with a dated note.
- [x] Re-running `fallow dead-code --format json --quiet` shows none of the addressed symbols; the known false-positive families from review §6.5 are the only remaining noise.
- [x] `ng lint` + `ng test` + `ng build --configuration development` pass (the dev build is the real check here — it catches any missed import of a deleted member).

## Notes

- Do **not** act on Fallow's other `unused-class-member` findings — they're the signalStore-DI false-positive family documented in review §6.5. When in doubt: `fallow dead-code --trace <file>:<export>` plus a repo grep before deleting anything.
- Sibling story CR2-6.3 (extract `createConfirmState<T>()` for the duplicated delete-confirm scaffolding, `dup:edd1ec44`) can ride along in the same PR if convenient, but isn't required by this ticket's ACs.
