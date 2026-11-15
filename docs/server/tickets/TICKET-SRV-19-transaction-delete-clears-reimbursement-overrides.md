# TICKET-SRV-19 — Deleting transactions clears overrides naming their deleted transfers

- **Area:** Server
- **Released in:** _unreleased_
- **Type:** Bug fix
- **Traceability:** FR-TXN-4 (unlink a transfer), TICKET-TXN-03 (attribution override, reimbursement); CR6-7 ([code review](../../releases/v3_code_review_2/code-review.md))

## User story

As someone who marks joint expenses as reimbursed, I want undoing an import or deleting transactions to also clear any "reimbursed by" link to a transfer that disappeared with them, so my stats stay right and I can still edit those expenses.

## Description

Unlinking a transfer already clears every `attributionOverride.reimbursementTransferId` that pointed at it. Deleting the transfer's transactions doesn't. Import undo, account delete or clear, and bulk delete all remove the transfer but leave expenses naming it, and the client store never hears about it.

## Current situation (as-is)

- `cleanupTransfersForRemovedTransactions` in [`transfer-cleanup.ts`](../../../server/src/operations/transfer-cleanup.ts) (lines 67–112) deletes the transfers touching the doomed rows and clears the surviving leg's `transferId`. It doesn't look at `reimbursementTransferId`. `TransferCleanupResult` (lines 37–42) has no field for it.
- `clearDanglingOverrides` in [`transfers.ts`](../../../server/src/routes/transfers.ts) (lines 99–130) does exactly that job, but only the unlink route calls it (line 187, returned as `clearedAttributionOverrides`).
- Every delete path goes through `removeTransactionsWithTransferCleanup` and so skips it:
  - [`import.ts`](../../../server/src/routes/import.ts) `POST /:batchId/undo`, lines 203–217, which also passes on only two named fields of the result;
  - [`accounts.ts`](../../../server/src/routes/accounts.ts) `cascadeTransactions`, lines 49–58, behind both account routes;
  - [`transactions.ts`](../../../server/src/routes/transactions.ts) `POST /delete`, lines 208–235.
- Example: joint expense T is reimbursed by transfer R, whose legs came from batch 7. Undo batch 7: R is gone but T still names it. Stats treat T as not reimbursed, and editing T fails with "The selected reimbursement transfer no longer exists." ([`attribution-override.ts`](../../../src/app/core/transactions/attribution-override.ts) line 47).
- Client mirrors read only the two existing lists:
  - [`transactions.store.ts`](../../../src/app/core/state/transactions.store.ts) line 157;
  - [`import-batches.store.ts`](../../../src/app/core/state/import-batches.store.ts) line 173;
  - [`accounts.store.ts`](../../../src/app/core/state/accounts.store.ts) lines 215 and 236.

## Desired result (to-be)

- `clearDanglingOverrides` moves into `operations/transfer-cleanup.ts`. `cleanupTransfersForRemovedTransactions` runs it for every transfer it deletes, skipping transactions that are themselves being removed. The unlink route calls the moved function.
- `TransferCleanupResult` gains `clearedAttributionOverrides: { id, attributionOverride }[]` on the server and in [`transfer-cleanup-result.ts`](../../../src/app/core/transfers/transfer-cleanup-result.ts). Import undo, both account routes and `POST /delete` return it.
- Each store that mirrors a cleanup result patches those transactions' `attributionOverride`, the way `TransfersStore.unlink` already does ([`transfers.store.ts`](../../../src/app/core/state/transfers.store.ts) lines 91–97).
- Only `reimbursementTransferId` is dropped; `mode` and `jointAccountId` stay, as on unlink.

## Acceptance criteria

- [ ] Undoing a batch whose transfer reimbursed a surviving expense clears that expense's `reimbursementTransferId`, in the JSON and the derived column, and reports it in `clearedAttributionOverrides`. (`import.spec.ts`, new case.)
- [ ] The same holds for `POST /transactions/delete`, `DELETE /accounts/:id` and `POST /accounts/:id/transactions/delete`. (`transfer-cleanup.spec.ts` covers the shared function; one route spec per path asserts the response field.)
- [ ] An override on a transaction that is itself being deleted isn't reported. Another user's transactions are never touched.
- [ ] The unlink route's existing "clears dangling overrides" cases still pass against the moved function.
- [ ] `TransactionsStore`, `ImportBatchesStore` and `AccountsStore` apply `clearedAttributionOverrides` to the affected transactions. (One spec case per store.)
- [ ] `categoryManual` and `categoryId` on the affected transactions are unchanged.
- [ ] Persistence stays behind the existing repositories and operation services; no new direct API calls from stores or components.
- [ ] `ng lint`, `ng test`, `ng build --configuration development`, `npm run test:server`, `npm --prefix server run lint` and `npm --prefix server run typecheck` pass.
- [ ] Verified via the fallow skill and coding-conventions skill.

## Notes

- `clearDanglingOverrides` uses `deriveReimbursementTransferId` from `routes/transactions.ts`. Moving it into `operations/` means moving that derive helper too, or importing a route module from an operation; prefer moving it.
- This doesn't repair overrides already left dangling by earlier deletes. Re-saving the expense without a reimbursement clears one.
