# TICKET-SRV-14 — An import renumbers a row whose id another account holds instead of taking it over

- **Area:** Server
- **Released in:** _unreleased_
- **Type:** Bug fix
- **Traceability:** FR-DAT-2 (import a backup); reverses [TICKET-SRV-12](./TICKET-SRV-12-import-takes-over-colliding-ids.md)

## User story

As someone sharing a Money Mosaic server with other accounts, I want restoring a backup into my account to leave everyone else's data alone, so a restore can never empty another person's categories, rules or accounts.

## Description

TICKET-SRV-12 made `POST /api/data/import` take over any row whose id another account held: the row's contents became the backup's and its `userId` moved to the importer. In practice this emptied a real account. A backup restored into a second account took most of the first account's categories, rules and accounts. That account's transactions were left pointing at rows it no longer owned, and the MCP tools showed the other account's names for them.

## Current situation (as-is)

- `upsertRow` in [`data.ts`](../../../server/src/routes/data.ts) wrote `userId` together with the replacement values, so a colliding row changed hands.
- Ids are unique per table across all accounts, so restoring a backup into an account other than its own collides on almost every row.

## Desired result (to-be)

- Before anything is written, `planImportIds` ([`operations/import-ids.ts`](../../../server/src/operations/import-ids.ts)) finds every document id another account holds. It gives each one a fresh id above both the table's highest id and the document's highest id.
- `remapReferences` rewrites every reference to a renumbered row:
  - foreign keys and soft references (`referencesOf`)
  - the settings id columns (`appSettings`, `categoryComparisonSettings`, `forecastSettings`)
  - the ids inside JSON (`rules.action.setCategoryId`, an `accountId` rule condition, `transactions.attributionOverride.reimbursementTransferId`)
- `upsertRow` no longer writes `userId` on update. If it would ever meet another account's row, it throws and rolls back the import.
- Ids that are free, or already the importer's, are kept, so a same-account restore is unchanged.

## Acceptance criteria

- [x] Importing another account's backup answers 204. That account keeps every row under the same ids, with its references unchanged. (`data.spec.ts` → "renumbers rows whose ids another account holds, and leaves that account's rows alone".)
- [x] The importer's copies get fresh ids, and their category, account, transfer and rule references point at those copies. (Same test: transaction `categoryId`/`transferId`, transfer legs, rule `action` and `accountId` condition.)
- [x] Settings id columns and `attributionOverride.reimbursementTransferId` are rewritten, and unplanned ids are left alone. (`import-ids.spec.ts`.)
- [x] Same-account restore, replace, merge, the dangling-reference guard and the deleted-account soft reference cases still pass. (`npm run test:server`: 40 files, 503 tests.)
- [x] `server/README.md` describes the renumbering instead of the takeover.

## Notes

- **This does not repair data an earlier import already moved.** Those rows still sit in the account that ran the import. Moving them back is a one-off SQL fix against the live database, not something this endpoint can do.
- A `categoryModel` uploaded after a cross-account restore still names the backup's category ids. A restore into a different account means retraining, which already happens for a `replace` import.
- A new id-carrying settings or JSON field has to be added to `EMBEDDED` in `import-ids.ts`. If it is missed, a cross-account restore leaves that field pointing at the other account's row (a stale reference, not a takeover).
