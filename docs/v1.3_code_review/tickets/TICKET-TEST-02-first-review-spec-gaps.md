# TICKET-TEST-02 — Close the first review's remaining spec gaps (CR-9)

- **Area:** Testing (core services, stores)
- **Type:** Refactor (test-only)
- **Traceability:** CR-9 (carried over from the first review; the four test-only bullets still open on its backlog)

## User story

As a developer refactoring the import/deletion paths (several tickets in this backlog touch them), I want the behaviours the first review called out pinned by specs, so those refactors can't silently change shipped semantics.

## Description

Four spec gaps named by CR-9 remain open. They're pure test additions — no production code changes — and they de-risk TICKET-PERF-04/PERF-05/IMP-06 and TICKET-CLEANUP-03, all of which touch the code under these gaps.

## Current situation (as-is)

- [import.service.spec.ts](../../../src/app/core/import/import.service.spec.ts) — no case for `undoImport`'s *cross-import* transfer-cleanup branch (a removed transaction auto-linked to one from a **different** batch/account must unlink the surviving side).
- No spec pins the `AccountsStore.removeAccount` cascade end-to-end since CR-1.1 shipped (the service has specs; the store-level flow contract does not — check [accounts.store.spec.ts](../../../src/app/feature-accounts/accounts.store.spec.ts) and cover what's missing, not what exists).
- The chosen `partitionByFingerprint` within-file duplicate semantics (CR-1.2's occurrence-counter fix) lack an explicit spec naming the two directions: same-fingerprint-twice-in-one-file, and re-import of an overlapping export.
- The `csv-row-mapper` spec tables exist and are good — this bullet is a **convention**, not a gap: new date formats/amount conventions get their table entry test-first. Record it in the spec file's header comment rather than writing speculative tests.

## Desired result (to-be)

- Each of the first three gaps has a named, failing-first spec case in the file that owns the behaviour; the fourth is a one-line convention comment atop the spec tables.

## Acceptance criteria

- [ ] `import.service.spec.ts` gains: "undoImport unlinks a transfer whose other leg belongs to a different import batch" (asserting the survivor's `transferId` is cleared and the transfer row removed).
- [ ] A store-level spec pins `removeAccount`: account row gone, its transactions gone, cross-account transfer survivors unlinked, stores patched to match — mirroring the delete-confirmation's promise.
- [ ] `partitionByFingerprint` (or its host's) spec names both duplicate-semantics cases explicitly.
- [ ] Convention comment added to the `csv-row-mapper` spec tables ("add new formats here test-first").
- [ ] All new specs use the existing fake-indexeddb global setup (`src/test-setup.ts`) where they touch Dexie — no per-spec polyfill wiring.
- [ ] `ng test` passes; no production code changed (`git diff src/app --stat` shows spec/comment files only).

## Notes

- Land **before** TICKET-PERF-04 and TICKET-IMP-06 if possible — that's the point of the safety net; it's also the cheapest ticket in the backlog to pick up cold.
