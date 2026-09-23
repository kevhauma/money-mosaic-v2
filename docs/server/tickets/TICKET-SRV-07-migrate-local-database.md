# TICKET-SRV-07 — Move the database already in your browser into your account, once

- **Area:** Server
- **Released in:** _unreleased_
- **Type:** Feature
- **Traceability:** reuses the export/import machinery from [TICKET-DAT-01](../../data-management/tickets/TICKET-DAT-01-full-data-export-import.md); planned for v3

## User story

As an existing user with years of imported transactions in my browser, I want the app to offer to move that data into my new account the first time I sign in, so upgrading does not mean starting from scratch.

## Description

Detects a pre-v3 `money-mosaic` IndexedDB database in the browser, offers to upload it into the signed-in account, **remaps every id** so local ids do not collide with server-assigned ones, and then offers to clear the local copy. One-time, opt-in, and safe to decline.

## Current situation (as-is)

- Every existing user's data lives in the IndexedDB database named `money-mosaic` at schema version 16, and there is no other copy of it unless they exported one.
- [`data-management.repository.ts`](../../../src/app/core/data-access/data-management.repository.ts) already has `exportAll(): Promise<AppDataExport>` — it iterates `appDb.tables` and is entirely transport-agnostic, which is exactly why [TICKET-DAT-05](../../data-management/tickets/TICKET-DAT-05-qr-code-data-sync.md) could reuse it for QR transfer.
- After [TICKET-SRV-05](./TICKET-SRV-05-repositories-over-http.md) the repositories no longer read Dexie, so the local database is still on disk but nothing in the app opens it. **It is invisible, not gone** — and it stays that way until this ticket or the user clears their site data.
- Local ids were assigned by Dexie's `++id` starting at 1 for each table. Server ids are assigned by SQLite autoincrement across all users. The two id spaces are unrelated and **will collide**.
- `AppDataExport` carries a `schemaVersion`, which `importAll` compares against `appDb.verno` to refuse a newer-schema payload.
- Two known defects in the existing export are relevant: `CategoryModelArtifact`'s `ArrayBuffer` fields are lost to `JSON.stringify` (recorded at the bottom of DAT-05), and merge-mode upserts by primary key.

## Desired result (to-be)

- **Detection**: on sign-in, the app checks for the `money-mosaic` IndexedDB database (via `indexedDB.databases()` where available, falling back to opening it and checking for tables) and whether it holds any rows. An empty or absent database means no prompt, ever.
- **The offer**, shown once per browser per account: a dialog stating how much data was found (accounts, transactions, date range) and what will happen. Three outcomes — move it now, remind me later, never ask again on this browser — with the choice recorded in `localStorage` keyed by user id, since the whole point is that it precedes having usable server state.
- **Id remapping is the substance of this ticket.** The upload builds a per-table map from local id to the id the server assigns, then rewrites every reference before it is written:
  - `Transaction.accountId`, `.categoryId`, `.transferId`, `.importBatchId`, `.attributionOverride.reimbursementTransferId`
  - `Transfer.fromTransactionId`, `.toTransactionId`
  - `Rule.action.setCategoryId` and any category id inside `conditions`
  - `MappingProfile.defaultAccountId`
  - `ImportBatch.accountId`, `.mappingProfileId`
  - `Loan.categoryId`
  - `RecurringOverride.anchorTransactionId`
  - `AppSettings.excludedIncomeCategoryIds`, `.smoothedBonusCategoryIds`, `.heatmapExcludedCategoryIds`, `.mainIncomeCategoryId`
  - `CategoryComparisonSettings`'s excluded category ids
  - **`Transfer` and `Transaction` reference each other**, so transactions are written first with `transferId` left null, transfers are written next, and the transactions are then patched with their new `transferId` — all inside one server transaction.
- **A `POST /api/data/migrate-local` endpoint** takes the whole export and performs the insert-and-remap server-side in a single transaction, returning a per-table count of what landed. Doing the remap on the server is what makes it atomic; doing it client-side would mean hundreds of round trips with no way to roll back.
- **Refusing to overwrite**: if the account already holds data beyond the per-user seed, the dialog says so and offers **merge into what is there** or **replace everything**, with replace requiring an explicit confirmation naming what it will destroy. The default is to refuse and explain, not to guess.
- **The trained category model transfers as bytes**, not through `JSON.stringify` — the migration reads the artifact's `ArrayBuffer` fields directly from Dexie and posts them to SRV-02's blob columns, so the model survives the move even though the JSON export never could. The seeded per-user defaults the account already has are reconciled rather than duplicated: a seeded category matching an incoming one by name and `isSystem` is reused, not re-created.
- **After a successful move**, the dialog offers to delete the local IndexedDB database, stating plainly that the server now holds the only copy and suggesting a file export first. Declining leaves it untouched — it is a free backup.
- **Idempotent and resumable**: the operation either completes or leaves the account exactly as it was, and can be run again from the Data section if it was declined or failed.

## Acceptance criteria

- [ ] A browser with no `money-mosaic` database, or an empty one, never shows the prompt.
- [ ] The prompt states real counts read from the local database, and the "never ask again" choice survives a reload.
- [ ] **Every relationship survives the move**: a test migrates a fixture containing linked transfers, categorised transactions, rules referencing categories, an import batch, a loan, recurring overrides and populated settings, then asserts every foreign key resolves to the right row by its *content*, not its id.
- [ ] The transfer/transaction mutual reference is resolved correctly — both legs of a linked transfer point at each other after the move.
- [ ] Ids are not preserved and nothing depends on their preservation — the test fixture deliberately uses ids that collide with rows already on the server.
- [ ] The whole migration is one server transaction: a forced failure partway leaves the account **exactly** as it was, with no partial rows, verified by a full row count per table before and after.
- [ ] Migrating into an account that already has data offers merge or replace, defaults to neither, and requires an explicit confirmation for replace.
- [ ] The seeded default categories and mapping profiles are reused rather than duplicated — a migration into a freshly seeded account does not produce two "Groceries".
- [ ] The trained category model arrives with its weights intact and produces the same predictions after the move as before — asserted by scoring a fixed set of descriptions on both sides.
- [ ] Declining the local-delete leaves the IndexedDB database intact; accepting removes it and the prompt never returns.
- [ ] The migration can be re-run from the Data section after being declined.
- [ ] Unit tests cover detection, the three prompt outcomes, and the client-side upload; backend tests cover the remap, atomicity, merge/replace and seed reconciliation.
- [ ] Verified via the fallow skill and coding-conventions skill.
- [ ] Verified live in the browser: with a real pre-v3 database present, sign in, accept the move, and confirm the dashboard, transactions, transfers, income and loans pages all show what they showed before — including the auto-categoriser's suggestions.

## Notes

- **The id remap is the only genuinely novel logic in v3.** Everything else is a port; this is new code doing something that has never been done in this codebase, against data the user cannot get back if it goes wrong. It deserves the largest share of the testing effort and a real database to rehearse against.
- **Content-based assertions, not id-based ones.** A test that checks `transaction.categoryId === 3` proves nothing after a remap. The fixture tests must resolve through to the row and compare what it says.
- **This must ship before [TICKET-SRV-08](./TICKET-SRV-08-retire-dexie.md)**, which deletes the Dexie code this migration reads through. After SRV-08 the only route out of an old browser database is the JSON file export — still possible, but manual, and it loses the trained model.
- Merge-mode's overwrite-by-primary-key hazard that DAT-01 and DAT-05 both carry does **not** apply here, because this path never preserves incoming ids. That is a genuine improvement over the QR and file transports, and worth noting if two-way sync is ever revisited (`topic-multi-device`).
- Depends on [TICKET-SRV-04](./TICKET-SRV-04-transactional-write-endpoints.md) (the data endpoints) and [TICKET-SRV-05](./TICKET-SRV-05-repositories-over-http.md) (the app is on the server by then, so "local" is unambiguous).
