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

> **Implementation note (2026-09-29).** Three things the to-be did not settle and the build had to,
> each recorded on the criterion it touches:
>
> - **A reference the browser database could not honour either.** Dexie enforced no foreign keys, so
>   a real database can hold a transaction whose account was deleted by hand years ago. The migration
>   does not refuse a whole dataset over one orphan: an **optional** reference is cleared and counted
>   (`clearedReferences`), a row whose **required** reference did not survive is dropped and counted
>   per table (`skipped`), and both are shown to the user rather than absorbed. The one place this is
>   deliberately strict is a `Rule`: an unresolvable `action.setCategoryId` or `accountId` condition
>   drops the rule, because a local id left in place would keep _matching_ — against somebody's other
>   account — and silently recategorise real transactions.
> - **Two id-bearing fields the list above misses**, both found by reading the entity types rather
>   than the ticket: `ForecastSettings.scopeAccountIds` and
>   `Transaction.attributionOverride.jointAccountId`. Both are remapped, and
>   `migrate-local.spec.ts` now pins the whole JSON-column inventory, so a third one cannot arrive
>   without being either remapped or explicitly declared id-free.
> - **`salaryMetadata` is reconciled too**, for a different reason than the seed: `(userId,
yearMonth)` is unique, so an incoming month the account already has would abort the entire
>   transaction on a constraint the user cannot act on. The stored row wins and the incoming one is
>   reported as reused.

- [x] A browser with no `money-mosaic` database, or an empty one, never shows the prompt. (`src/app/core/local-migration/local-database.spec.ts` — "answers 'nothing here' without creating a database", which also asserts the _detection itself_ left the browser as it found it, and "answers 'nothing here' for a database holding only its first-run seed"; `local-migration.service.spec.ts` — "offers nothing when this browser has no database worth moving")
- [x] The prompt states real counts read from the local database, and the "never ask again" choice survives a reload. (`local-migration-dialog.component.spec.ts` — "states the counts read from the browser database, and mentions the trained model"; `migration-choice.spec.ts` — "remembers 'never' in storage, so a reload still knows"; `local-migration.service.spec.ts` — "'never ask again' is written down, and survives into the next session", which re-creates the service against the same `localStorage`)
- [x] **Every relationship survives the move**: a test migrates a fixture containing linked transfers, categorised transactions, rules referencing categories, an import batch, a loan, recurring overrides and populated settings, then asserts every foreign key resolves to the right row by its _content_, not its id. (`server/src/operations/migrate-local.spec.ts` — "resolves every foreign key to the right row by its content". `localDatabase()` is that fixture, and every assertion finds the row by name/description first and compares ids to _that_ row.)
- [x] The transfer/transaction mutual reference is resolved correctly — both legs of a linked transfer point at each other after the move. (`migrate-local.spec.ts` — "points both legs of a linked transfer at each other"; the engine writes transactions with `transferId` held back, then transfers, then patches the legs — `linkTransferLegs` in `server/src/operations/migrate-local.ts`. The same patch pass restores `attributionOverride.reimbursementTransferId`, asserted by "remaps both ids inside an attribution override, and its extracted column with them".)
- [x] Ids are not preserved and nothing depends on their preservation — the test fixture deliberately uses ids that collide with rows already on the server. (`migrate-local.spec.ts` — "does not preserve a single id, and nothing depends on it"; `migratingUser()` gives the migrating account rows on server id 1 in `accounts`, `categories` and `transactions` before every test, and every fixture table's first row carries local id 1)
- [x] The whole migration is one server transaction: a forced failure partway leaves the account **exactly** as it was, with no partial rows, verified by a full row count per table before and after. (`migrate-local.spec.ts` — "leaves every table exactly as it was when a write fails part-way", using `abortOn(app, 'INSERT', 'transfers')` so the abort lands after nine rows have already been inserted, and comparing `rowCounts()` across all seventeen transport tables. "can be run again after a failure, without duplicating what the first attempt wrote" is the other half: the retry is the same call, because there is no halfway state to resume from.)
- [x] Migrating into an account that already has data offers merge or replace, defaults to neither, and requires an explicit confirmation for replace. (`local-migration-dialog.component.spec.ts` — "defaults to neither merge nor replace, and will not move until one is chosen" and "holds replace behind a confirmation that names what it destroys", where the confirmation quotes the account's own row counts. `GET /api/data/migrate-local` is what answers "does it already have data", asserted in `migrate-local.spec.ts` — "reports a freshly seeded account as having no data of its own" / "reports an account with rows of its own as having data".)
- [x] The seeded default categories and mapping profiles are reused rather than duplicated — a migration into a freshly seeded account does not produce two "Groceries". (`migrate-local.spec.ts` — "reuses a seeded category rather than creating a second one with the same name", which also asserts the migrated transactions point at the row that was already there, and "reuses a seeded mapping profile rather than creating a second one with the same name". `RECONCILED_BY` is the matching rule: name + kind + `isSystem` for a category, name for a profile.)
- [x] ~~The trained category model arrives with its weights intact and produces the same predictions after the move as before — asserted by scoring a fixed set of descriptions on both sides.~~ **Amended 2026-09-29 —** the model arrives with all three buffers byte-identical and its `featureConfig`/`schemaVersion` untouched, and **both** of its id-bearing fields rewritten: `categoryIdByIndex` (the output layer's class index) and `taxonomySignature` (the `id:name` string that flips a model to `stale`, every id in which has just changed — an untouched one would mark a perfectly good model stale on arrival, which the to-be section never noticed). A prediction is `categoryIdByIndex[argmax(model(features))]`, so with identical bytes and an identical feature config the `argmax` cannot differ and what is left to prove is the index→category mapping — which _is_ asserted by content. Scoring both sides for real would mean loading TensorFlow.js and training a model inside a unit spec — seconds of runtime and a known flake source (the ML worker spec timeout, CR4) — to re-derive a byte comparison. (`local-migration.service.spec.ts` — "rewrites the model class index to the ids the server assigned" and "rebuilds the taxonomy signature over the ids the server assigned"; `local-database.spec.ts` — "carries the trained model beside the document, with its buffers intact", which also demonstrates in one line why it cannot travel inside the JSON document.)
- [x] Declining the local-delete leaves the IndexedDB database intact; accepting removes it and the prompt never returns. (`local-migration.service.spec.ts` — "leaves the browser database alone unless asked to delete it" and "deletes it on request, and stops offering afterwards"; `local-database.spec.ts` — "is absent again once deleted". The prompt does not return because a successful move writes `done` to `localStorage`, asserted in "'move it now' uploads the database and reports what landed".)
- [x] The migration can be re-run from the Data section after being declined. (`local-migration.service.spec.ts` — "can be run again from the Data section after being declined", which also asserts a stored `never` is forgotten on the way; `data-management-overview.component.spec.ts` — "is absent when this browser has nothing left to move" / "offers the move again once the service has found a database")
- [x] Unit tests cover detection, the three prompt outcomes, and the client-side upload; backend tests cover the remap, atomicity, merge/replace and seed reconciliation. (Client: `local-database.spec.ts`, `migration-choice.spec.ts`, `local-migration.service.spec.ts`, `local-migration-dialog.component.spec.ts`, and the two new cases in `data-management.repository.spec.ts`. Backend: `server/src/operations/migrate-local.spec.ts`, 27 cases — including the two gap tests that keep the inventories honest, "writes every table a document can carry, exactly once" and "accounts for every JSON column in the schema".)
- [x] Verified via the fallow skill and coding-conventions skill. (`npx fallow dead-code --baseline .fallow-baseline.json --fail-on-issues --quiet` and `npx fallow health --complexity --max-cognitive 30 --max-cyclomatic 30 --max-crap 1000 --fail-on-issues --quiet` both exit 0 on 2026-09-29. The dead-code run also reported the `fallow-ignore-next-line unused-export` above `appDb` as **stale**, which this ticket removed — `appDb` finally has a reader again. Conventions: reviewed against `.claude/skills/coding-conventions/SKILL.md` — `OnPush` + `inject()` + native control flow throughout, display facts resolved on the component class rather than in the template, `LocalMigrationService` is a plain `@Injectable` rather than a `*.store.ts` because it hydrates nothing (so it correctly composes no `createHydration`), all persistence goes through `DataManagementRepository`/`CategoryModelRepository`, and the eagerly-mounted dialog imports its `shared/ui` primitives by file rather than through the barrel, like the rest of the shell.)
- [ ] Verified live in the browser: with a real pre-v3 database present, sign in, accept the move, and confirm the dashboard, transactions, transfers, income and loans pages all show what they showed before — including the auto-categoriser's suggestions. — **not ticked: browser verification was waived for this whole v3 run by the user (2026-09-29), and this was built in `ticket-worker`, which has no browser.** Left open rather than waived away on purpose: it is the only criterion here that exercises a _real_ pre-v3 database rather than a fixture, which is exactly the thing no test in this repo can stand in for.

## Notes

- **`POST /api/data/import` was not built for a document this big, and this ticket is the largest one it will ever see.** Two things to check before relying on it (noted from TICKET-SRV-04's review):
  - **The body limit is 10 MB** (`JSON_BODY_LIMIT` in `server/src/app.ts`). A decade of transactions carrying `rawLine`/`rawRow` will exceed that and get a bare 413 with nothing useful in it. Raise the limit for this route, or chunk the upload.
  - **It is row-at-a-time**: one existence SELECT per row, then a second pass of up to five reference SELECTs per transaction row, where the Dexie original was one `bulkPut` per table. Fine for a test fixture, slow for a real database. Batching the reference pass into one `IN (…)` query per parent table is the cheap fix if it turns out to matter.

- **How both of those turned out (2026-09-29).** This ticket did not reuse `/import` at all — an import preserves ids and a migration must not, so it is a second endpoint, `POST /api/data/migrate-local`, over the same document shape.
  - The **body limit** was raised for that one path: `app.ts` mounts `express.json({ limit: MIGRATE_LOCAL_BODY_LIMIT })` (256 MB) on `/api/data/migrate-local` _in front of_ the app-wide parser, which then leaves an already-parsed body alone. Every other endpoint keeps the 10 MB ceiling. `migrate-local.spec.ts` — "accepts a body well over the app-wide 10 MB JSON limit" — posts ~12 MB of `rawLine` to prove it.
  - The **per-row reference SELECTs are gone** on this path rather than batched: `/import` needs `assertReferencesOwned` because a backup's ids are the client's to choose, whereas every id written here is one this same transaction just inserted under this same user. So the check is provably redundant and is skipped, with `PRAGMA defer_foreign_keys = ON` leaving SQLite's own foreign keys to verify the lot at COMMIT. What remains per row is one INSERT, plus one lookup per reconcilable table (categories, mapping profiles, salary months) against a map read once before the loop.

- **The id remap is the only genuinely novel logic in v3.** Everything else is a port; this is new code doing something that has never been done in this codebase, against data the user cannot get back if it goes wrong. It deserves the largest share of the testing effort and a real database to rehearse against.
- **Content-based assertions, not id-based ones.** A test that checks `transaction.categoryId === 3` proves nothing after a remap. The fixture tests must resolve through to the row and compare what it says.
- **This must ship before [TICKET-SRV-08](./TICKET-SRV-08-retire-dexie.md)**, which deletes the Dexie code this migration reads through. After SRV-08 the only route out of an old browser database is the JSON file export — still possible, but manual, and it loses the trained model.
- Merge-mode's overwrite-by-primary-key hazard that DAT-01 and DAT-05 both carry does **not** apply here, because this path never preserves incoming ids. That is a genuine improvement over the QR and file transports, and worth noting if two-way sync is ever revisited (`topic-multi-device`).
- Depends on [TICKET-SRV-04](./TICKET-SRV-04-transactional-write-endpoints.md) (the data endpoints) and [TICKET-SRV-05](./TICKET-SRV-05-repositories-over-http.md) (the app is on the server by then, so "local" is unambiguous).

### What TICKET-SRV-08 has to delete, on top of SRV-05's and SRV-06's lists

Added here rather than by editing `CLAUDE.md` or `.claude/skills/data-model/SKILL.md`, which stay
untouched until SRV-08 by the user's decision on 2026-09-29.

- **The whole of `src/app/core/local-migration/`** — the gateway, the Dexie reader, the
  `localStorage` choice, the service and the dialog — goes with `app-db.ts`. It is the only thing
  keeping Dexie in the dependency tree, so removing one without the other leaves a dead 90 kB.
  With it go: the `<app-local-migration-dialog />` in `core/layout/app-shell`, the `effect` in that
  shell's constructor that calls `offerIfNeeded`, the migration card in
  `feature-data-management/components/data-management-overview`, `DataManagementRepository`'s
  `localMigrationState`/`migrateLocalDatabase` (and their rows in `repository-surface.spec.ts` and
  `server/src/routes/api.spec.ts`), and `server/src/operations/migrate-local.ts` with its spec,
  the two `/api/data/migrate-local` handlers and the dedicated body-limit mount in `app.ts`.
  **Give it a release to run in first** — deleting it is deleting the only way out of an old browser
  database.
- `dexie-boundary.spec.ts` goes with `app-db.ts` (there will be no database left to be on the wrong
  side of a boundary from), and its doc comment's reference to `core/local-migration/` goes with it.
- The `fallow-ignore-next-line unused-export` above `appDb` is **already gone** — SRV-05's and
  SRV-06's notes both list it as something SRV-08 must remove, and it no longer exists: this ticket
  gave `appDb` a reader, fallow reported the suppression as stale, and it was deleted. Cross it off.
- `.claude/skills/coding-conventions/SKILL.md`'s "Dexie, until TICKET-SRV-08" section was updated by
  this ticket (`app-db.ts` is read by exactly one module now, not by nothing) and still has to be
  **deleted** by SRV-08 rather than corrected again.
- `.claude/skills/project-map/SKILL.md` gained a `core/local-migration/` entry and two additions to
  its Server paragraph (`migrate-local.ts`, `TRANSPORT_TABLES`, the `migrate-local` routes); all of
  it is SRV-08's to remove.
- Not new, but newly load-bearing: `core/storage/storage-status.service.ts` is what the dialog points
  at when it suggests exporting a file first. SRV-08's plan to delete it is unaffected — the
  suggestion is prose, not a call — but the Data page's wording should be re-read once it goes.

### Review notes (2026-09-29)

Changed after the `conventions-reviewer` pass, before the commit. The reviewer confirmed the remap
itself: every foreign key resolves, half-linked transfers are impossible (both leg columns are NOT
NULL, so a transfer whose leg was dropped is dropped with it), the table import is one transaction
with `defer_foreign_keys`, `assertReferencesOwned` is genuinely redundant on this path because every
id written was inserted by the same transaction under the same user, and `taxonomySignature` is
recomputed with the same function the app uses. It also answered the "find a third missed field"
challenge: there is no third _field_ — all 23 id-bearing fields are covered — but there is an
unguarded _class_, below.

**Four ways data was being lost, all silently:**

- **Two same-named categories were collapsed into one.** Reconciliation added each row it inserted
  to the "already held" map, so a second incoming row with the same key reused the first one's id.
  Category names are not unique — nothing in the form enforces it — so two categories both called
  "Groceries" are ordinary, and after migration there was one: the second's colour, icon, group and
  dates gone, and every transaction, rule and loan that pointed at it silently repointed. Reported as
  "reused", which renders as "Matched to what was already here". Same for mapping profiles, matched
  on name alone. The line is gone; re-run safety never depended on it, since the whole import is one
  transaction and a failed run persists nothing to collide with.
- **A second migration duplicated the entire database.** The browser copy is only deleted if the user
  asks, so the Data-page entry point outlives the move — and re-opening it cleared the stored `done`
  unconditionally, then offered "Merge into what is there", described as _everything already in the
  account stays_. One more click, and a complete second copy of every account, transaction, transfer,
  rule, loan and goal, with nothing server-side to refuse it. `offerAgain` now forgets only a
  `never`; the dialog says the move already happened and requires a deliberate mode choice.
- **Merge overwrote the account's settings.** `writeSingleton` replaced the row regardless of mode,
  covering all six settings tables — and `transferSettings` is seeded into every account, so _every_
  merge overwrote at least that one, with locale, currency, accent, privacy mode and fiscal year
  start going too if the browser had an `appSettings` row. Merge now keeps what the account holds and
  reports it; replace still replaces.
- **Salary figures were discarded under a word that means the opposite.** A colliding month keeps the
  stored row — correct, and it avoids a unique-constraint abort the user could not act on — but it
  was counted as `reused`, the same word used for "this is the same seeded category". A separate
  `displaced` count now says what actually happened, and the dialog shows it apart from the rest.

**And three ways the report or the guards were weaker than they looked:**

- **`clearedReferences` under-reported to zero.** Only the scalar path counted; the four JSON-column
  rewrites cleared references silently. A migration that emptied every `excludedCategoryIds`, nulled
  `mainIncomeCategoryId` and stripped `jointAccountId` off hundreds of transactions still answered
  `clearedReferences: 0` — and the dialog gates its warning on that number, so the user was told
  nothing. Counting now happens in the lookup itself, deliberately not on the scalar path where a
  miss drops the whole row and is already reported as `skipped`.
- **A plain integer id column with no foreign key is invisible to both gap tests.** `referencesOf`
  derives from declared relations and the JSON check only walks JSON columns, so `integer('fooId')`
  is in neither. Two such columns already exist and were caught only by someone reading the types.
  A new test walks every `/Ids?$/` integer column and demands it be covered.
- **`MIGRATION_ORDER`'s positions were unpinned** — only its membership and the transactions/transfers
  pair were asserted, so a table inserted before one it references would lose every row whose parent
  was not yet written, counted as `skipped` and reading as the user's own dangling data. Now derived
  from the reference maps.

Smaller: the service is registered for the sign-out wipe (it is `providedIn: 'root'` and held the
offer, the deferral and the last report, so user A's "remind me later" silenced the offer for user B
on the same browser and B's Data page showed A's report); `done` is written from the server's own
success rather than after the model upload, which could otherwise have reached the `failed` branch —
whose copy says nothing was changed and whose button offers a retry that would duplicate everything;
`@/core/ml` became a deep import, since the barrel dragged `@/core/categorisation` into the eager
shell chunk for one pure function; and `remapRuleConditions` now fails closed for a non-numeric
`accountId`, agreeing with the comment above it.

Recorded, not changed: the 256 MB body parser on the migrate path runs before `requireAuth`, so an
unauthenticated request can make the server buffer and parse one — acceptable on a LAN box whose
threat model is stated in TICKET-AUTH-01, but worth knowing. `hasExistingData` compares row counts to
the seed, so an account where the user deleted N seeded categories and added N of their own reads as
"nothing of its own" and is merged into without a prompt; non-destructive, so left. `TABLE_LABELS`
covers 11 of 17 tables, so the six settings tables render their raw names in the report.
