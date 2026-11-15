# TICKET-SRV-21 — The server skips already-present fingerprints on import commit

- **Area:** Server
- **Released in:** _unreleased_
- **Type:** Bug fix
- **Traceability:** FR-IMP-6 (de-duplication), FR-IMP-7 (batch counts), TICKET-IMP-14 (import-anyway); CR6-18, part, and CR6-A4 ([code review](../../releases/v3_code_review_2/code-review.md))

## User story

As someone importing a bank file, I want the same rows committed twice, for example from two open tabs, to land only once, so my balances never double.

## Description

Duplicate detection runs only in the browser. It reads the account's stored fingerprints before posting the commit, and the server inserts whatever it is sent. Two commits of the same file that overlap in time both pass the browser's check, so every row is inserted twice.

## Current situation (as-is)

- `ImportService.commitImport` in [`import.service.ts`](../../../src/app/core/import/import.service.ts) (from line 189):
  - reads the account's transactions with `getByAccount`;
  - partitions the rows with `partitionByFingerprint` (lines 97–136);
  - posts the accepted rows to `/import/commit`.
- `POST /import/commit` in [`import.ts`](../../../server/src/routes/import.ts) (lines 141–172) inserts every row it is sent through `insertImported` (lines 96–111). It never looks at fingerprints.
- `transactions_userId_fingerprint_idx` ([`transactions.ts`](../../../server/src/schema/transactions.ts) line 75) is a plain index, not a unique one, so SQLite doesn't refuse the second copy either.
- Accepted rows always carry a fingerprint the account doesn't hold yet, including "import anyway" rows (TICKET-IMP-14). `partitionByFingerprint` walks past every stored occurrence key (`<fingerprint>|<n>`). So a stored match at commit time can only mean another commit got there first.

## Desired result (to-be)

- Inside the commit transaction, the server skips any submitted row whose fingerprint the user already holds **for that account**. That is the same scope as the client's `getByAccount` check.
- The skipped rows are counted. The stored batch's `rowsAdded` and `rowsDuplicate` match what was actually inserted and skipped, and the response's `addedTransactions` and `duplicateCount` say the same, so the client store and the import history agree.
- A commit whose rows are all skipped still records its batch, with 0 added.
- Rows that are new are inserted exactly as today. The backfill patches are unchanged.

## Acceptance criteria

- [ ] Posting the same commit body twice inserts each transaction once. The second batch reports 0 added and all rows as duplicates. (`import.spec.ts` → new case "skips rows whose fingerprint the account already holds".)
- [ ] A fingerprint held by the same user on a **different** account, or by another user, is not skipped. (`import.spec.ts`, second case.)
- [ ] An "import anyway" commit (occurrence keys `|2`, `|3`, …) is still inserted in full. (`import.spec.ts`, third case.)
- [ ] The client applies the response's `addedTransactions` and `duplicateCount` and adds no rows the server skipped. (`import.service.spec.ts`, new case.)
- [ ] `categoryManual` on existing transactions is untouched by a skipped row.
- [ ] `npm run test:server`, `npm --prefix server run lint`, `npm --prefix server run typecheck`, `ng lint`, `ng test` and `ng build --configuration development` pass.
- [ ] Verified via the fallow skill and coding-conventions skill.

## Notes

- **No unique index.** Existing databases may already hold duplicate fingerprints from earlier double commits, so a unique index would fail its migration. Skipping inside the transaction is enough, because SQLite serialises writers.
- **Build after [TICKET-IMP-24](../../import/tickets/TICKET-IMP-24-fingerprint-normalised-iban.md)**, which normalises the IBAN inside the fingerprint (the other half of CR6-18). Otherwise this check compares fingerprints that IMP-24 is about to change.
- The review marks the double-commit case _likely_ (not reproduced). The code path above is confirmed.
