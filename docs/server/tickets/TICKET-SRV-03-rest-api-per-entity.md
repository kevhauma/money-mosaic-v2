# TICKET-SRV-03 — A REST API for every entity, scoped to the signed-in user

- **Area:** Server
- **Released in:** _unreleased_
- **Type:** Feature
- **Traceability:** mirrors the repository layer documented in [`data-model/SKILL.md`](../../../.claude/skills/data-model/SKILL.md); planned for v3

## User story

As the Angular app, I want an HTTP endpoint for every read and write the repository layer performs, so the browser can stop being the database without any component or store having to change.

## Description

Exposes the tables from [TICKET-SRV-02](./TICKET-SRV-02-drizzle-schema-per-user.md) over HTTP, endpoint-for-method against the existing repository surface, with the signed-in user taken from the session on every single call. Single-row and single-table operations only — the multi-table write paths are [TICKET-SRV-04](./TICKET-SRV-04-transactional-write-endpoints.md).

## Current situation (as-is)

- Seventeen repositories in [`core/data-access/`](../../../src/app/core/data-access/) wrap Dexie tables and are exported through [`index.ts`](../../../src/app/core/data-access/index.ts). Components and stores **never** touch `appDb` directly — the repository is already the seam this ticket needs.
- The method surface is not uniform. Most repositories are `getAll` / `add` / `update` / `remove`, but:
  - [`transactions.repository.ts`](../../../src/app/core/data-access/transactions.repository.ts) adds `count`, `getByAccount`, `getByImportBatch`, `getByReimbursementTransferId`, `bulkAdd`, `bulkUpdate`, `bulkRemove`;
  - [`goals.repository.ts`](../../../src/app/core/data-access/goals.repository.ts) adds `bulkUpdateSortOrder`, which writes several rows in one Dexie transaction because a reorder always touches at least two;
  - [`app-settings.repository.ts`](../../../src/app/core/data-access/app-settings.repository.ts) has **fourteen** single-field setters (`setPrimaryColor`, `setLocale`, `setPrivacyMode`, …), each a read-merge-put against the `id = 1` singleton;
  - [`data-management.repository.ts`](../../../src/app/core/data-access/data-management.repository.ts) has `exportAll`, `importAll(data, mode)` and `deleteAll`, all of which iterate `appDb.tables` generically.
- Nothing is authenticated, because nothing is remote.

## Desired result (to-be)

- **Every route mounts behind `requireAuth`** from [TICKET-AUTH-01](../../auth/tickets/TICKET-AUTH-01-users-seeded-admin-login.md). The `userId` comes from the session and **from nowhere else**: no endpoint accepts a `userId` in a body, a query string, or a path.
- **A shared router factory** builds the common `GET /` (list), `POST /` (create), `PATCH /:id`, `DELETE /:id` for the uniform entities (`accounts`, `categories`, `rules`, `mappingProfiles`, `importBatches`, `transfers`, `savingsGoals`, `loans`, `salaryMetadata`, `recurringOverrides`), so ten tables do not become ten copies of the same forty lines. Per-entity routers extend it rather than replace it.
- **Cross-user access is a 404, not a 403.** An `:id` belonging to another user reads as "not found" — the row's existence is not information this API gives away, and it keeps the handler to one `where userId = ? and id = ?` clause with no second branch.
- **The awkward cases, spelled out:**
  - **Transactions** get the extra reads as query parameters on the list endpoint (`?accountId=`, `?importBatchId=`, `?reimbursementTransferId=`), plus `GET /api/transactions/count`, and bulk endpoints `POST /api/transactions/bulk` (create), `PATCH /api/transactions/bulk` (an array of `{ id, changes }`), `DELETE /api/transactions/bulk` (an array of ids). Each bulk call runs in **one** SQLite transaction.
  - **The seven singleton settings tables** get `GET /api/settings/<name>` and `PATCH /api/settings/<name>`. `PATCH` merges the supplied fields into the user's row, creating it if absent, which collapses `app-settings.repository.ts`'s fourteen setters into one endpoint — the setters keep their client-side signatures, they just each send a one-field patch. The merge happens **server-side inside a transaction**, so two concurrent tabs cannot lose each other's field the way a client-side read-merge-put would.
  - **Goal reordering** is `PATCH /api/goals/sort-order` with the full `{ id, sortOrder }[]`, applied atomically — a reorder is one user action and must not land half-applied.
  - **`categoryModel`** takes its blob fields as binary rather than base64-in-JSON; a trained artifact is megabytes and does not belong in a JSON body.
- **Request bodies are validated** against the shared entity types before they reach Drizzle, rejecting unknown and malformed fields with a 400 that names the field. This is a data-integrity measure, not a security one: the client is trusted, but a shape mismatch after a refactor should fail loudly at the boundary instead of writing a broken row.
- **Responses are the entity shapes the repositories already return** — same field names, same types, `number` ids — so [TICKET-SRV-05](./TICKET-SRV-05-repositories-over-http.md) can swap implementations without touching a single caller.

## Review fixes (2026-09-25)

The `conventions-reviewer` pass probed ~35 requests against a real in-memory app with two signed-in
users. **The user-scoping boundary held — no query path reaches another user's row**, and the
constraint-suppression contract holds across UNIQUE, CHECK and the `loans.categoryId` NO ACTION key.
Five things were fixed.

1. **The ownership check had a hole, and the docs said it didn't.** Deriving references from
   `getTableConfig` covers declared foreign keys — but five id fields are deliberately *plain*
   columns (`importBatches.accountId`, `mappingProfiles.defaultAccountId`,
   `transactions.transferId` / `importBatchId`, `recurringOverrides.mergedIntoTransactionId`), so
   the derivation could not see them and nothing checked them. All five were **verified accepting a
   write pointing at another user's row**. Not a cross-user breach — reads stay user-scoped, so the
   stored id resolves to nothing, and since the fields were unchecked rather than checked-and-404'd
   they were not an existence oracle either — but it let a caller dangle their own data, and the
   acceptance criterion, the README and the project-map skill all read as though the class of hole
   was closed. `ownership.ts` now carries an explicit `SOFT_REFERENCES` map that the derivation
   unions in; all five answer 404, with a regression test each.
2. **A derived column bypassed both validation and the ownership check.**
   `attributionOverride.reimbursementTransferId` is extracted into a scalar column by the server, so
   it never passes through `parseEntityBody` — and SQLite's INTEGER affinity *keeps* an
   unconvertible value as TEXT rather than rejecting it. `POST` with `{reimbursementTransferId:
   "abc"}` returned 201 and permanently broke the index seek that column exists for. Now validated,
   with the same "names the field" 400 as the rest of the body.
3. **JSON columns validated as "any object", so a `number[]` field accepted `{}`** — a 200 whose
   body makes `.includes()` throw in the browser. `$type<T>` is erased at runtime, so the shape is
   now recorded at the schema level (`jsonArray` + `JSON_ARRAY_COLUMNS`) and the 400 says which of
   the two it wanted.
4. **`toId` used bare `Number()`**, so `0x10` became 16, `1e1` became 10, and `' 1'`/`'+1'` became
   1 — silently reinterpreting an id as a different, existing row, against the stated contract that
   a malformed entry is rejected. Digits only now.
5. `PATCH /bulk` reported the item count as `updated`, so two items naming the same row answered
   `{updated: 2}`; it counts rows now. The salary-metadata upsert turned an impossible `undefined`
   row into a 200 with `{}`; it throws instead. Plus a miscounted comment and an import-order slip.

**Deliberately still out of scope**, and consistent with this ticket's "shape, not semantics" line:
no value-range validation. `ownershipShare: 99` on a joint account, a negative `grossWage`, and a
transfer whose two legs are the same transaction are all accepted. Flagged here so the boundary is
a decision rather than an oversight.

## Acceptance criteria

> **Implementation notes, 2026-09-24.** Three decisions the to-be section above did not anticipate,
> recorded here rather than silently:
>
> - **`categoryModel` is served at `/api/categoryModel`, not under `/api/settings/`.** The to-be
>   says "the seven singleton settings tables get `GET`/`PATCH` `/api/settings/<name>`" and then, in
>   the next bullet, that the model takes its blobs as binary. Both cannot be true of one endpoint:
>   the model's body is `application/octet-stream` in a self-describing envelope
>   ([`http/binary-artifact.ts`](../../../server/src/http/binary-artifact.ts)), and it is an
>   artifact rather than a setting. So `/api/settings/<name>` covers **six** singletons and the
>   model gets `GET`/`PUT`/`DELETE` of its own.
> - **Singleton responses carry no `id`.** The `id: 1` in `DEFAULT_APP_SETTINGS` and friends is the
>   old one-database-per-person convention that TICKET-SRV-02 replaced with "the owner is the key".
>   The endpoints answer with the fields and nothing else; TICKET-SRV-05 is where the client stops
>   expecting one.
> - **The `DEFAULT_*` singleton fallbacks moved to [`shared/seed-data.ts`](../../../shared/seed-data.ts)**
>   (re-exported unchanged from `app-db.ts`, so no `src/app/` import path changed). The Notes below
>   say nothing in the Angular app changes yet, and behaviourally nothing did — but the server has
>   to answer an unwritten singleton with the *same* object the Dexie repository falls back to, and
>   a copy on each side would have drifted the first time a default changed.

- [x] **A write may not reference another user's row.** Every foreign-key field a request body carries (`transactions.accountId` / `categoryId`, `loans.categoryId`, `transfers.fromTransactionId` / `toTransactionId`, `recurringOverrides.anchorTransactionId`) is checked to belong to the signed-in user before the write, and a mismatch is a **404**, not a 403 — a row the caller does not own is a row that does not exist as far as they are concerned. Asserted by a test that signs in as one user and tries to reference another's row for each of those fields. (TICKET-SRV-02 left this deliberately unenforced at the schema level: composite `(userId, parentId)` foreign keys across eighteen tables were a bigger change than that ticket, and reads were never at risk because every query is user-scoped. This is where it gets enforced.) (`assertReferencesOwned` in [`server/src/http/ownership.ts`](../../../server/src/http/ownership.ts), called inside the write transaction by `insertOwnedRow`/`updateOwnedRow`; the field list is **derived** from `getTableConfig(...).foreignKeys` rather than typed out. [`references.spec.ts`](../../../server/src/routes/references.spec.ts) signs in as Alice and points each of the six fields at Bob's row — 404 every time, nothing written, and the same body with her own ids is a 201 — plus the patch path (`PATCH /api/transactions/:id` with Bob's `accountId` → 404, row unmoved). [`ownership.spec.ts`](../../../server/src/http/ownership.spec.ts) asserts the derived set is exactly those six fields, so a check that stopped running would fail rather than silently pass.)
- [x] Every public method on all 17 repositories has a corresponding endpoint — asserted by a checklist test that enumerates the repository method names and fails on one with no route. ([`api.spec.ts`](../../../server/src/routes/api.spec.ts) reads the method names out of `src/app/core/data-access/*.repository.ts` as files — the TICKET-SRV-01 ESLint guard forbids importing them — and compares them to its endpoint map **in both directions**, so a new repository method and a stale map entry each fail. It then issues every mapped endpoint over HTTP and asserts none answers the app's own "No route for …". `DataManagementRepository` is excluded per this ticket's Notes.)
- [x] Every endpoint returns 401 without a session, tested per router rather than for one sample route. (Each router mounts behind `requireAuth` individually in [`app.ts`](../../../server/src/app.ts), driven by the [`createApiRouters`](../../../server/src/routes/api.ts) registry; `api.spec.ts`'s "answers 401 on every mounted router" iterates that registry, so a router added later is covered without anyone remembering to. A sibling test asserts an unknown `/api` path is still a JSON 404 rather than a misleading 401.)
- [x] **User B cannot read, update, or delete user A's rows.** For each entity: a list call returns only B's rows; a `GET`/`PATCH`/`DELETE` on A's id returns 404 and changes nothing. This is the ticket's central test and it runs against every table, not a sample. ([`entity-router.spec.ts`](../../../server/src/routes/entity-router.spec.ts) is a `describe.each` over [`samples.testing.ts`](../../../server/src/routes/samples.testing.ts)'s eleven entity routers — 80 tests — and `api.spec.ts` asserts that sample list covers every mounted entity router, so a table added later cannot slip past it. The scoping itself is one clause in one place: `rowWithId` in [`entity-router.ts`](../../../server/src/routes/entity-router.ts).)
- [x] A body carrying a `userId` field is ignored (or rejected), never honoured — covered by a test that tries to create a row under another user's id. (`IGNORED_FIELDS` in [`validate.ts`](../../../server/src/http/validate.ts) drops `userId` and `id` before the values reach Drizzle; the router adds the session's `userId` afterwards. Asserted per entity by `entity-router.spec.ts`'s "ignores a userId in the body…" — the row is Alice's, absent from Bob's list and a 404 to his `GET` — and at unit level by `validate.spec.ts`.)
- [x] Bulk create, bulk update and bulk delete each run in one transaction: a forced failure on the last item leaves **none** of the batch applied. (`POST`/`PATCH`/`DELETE /api/transactions/bulk` in [`transactions.ts`](../../../server/src/routes/transactions.ts) — validation runs *inside* `db.transaction`, so a malformed last row takes the earlier inserts back with it. [`transactions.spec.ts`](../../../server/src/routes/transactions.spec.ts) forces each of the three: a bad `amount` on item 2 (400 naming the field and the item index, list still holds only the two seeded rows), a last row referencing Bob's account (404, nothing added), and a last id belonging to Bob on both the patch and the delete (404, the first row unchanged / undeleted).)
- [x] `PATCH /api/settings/<name>` creates the row when absent, merges when present, and leaves untouched fields alone — the `DEFAULT_*` fallback behaviour matches what the current repositories return for an unwritten singleton. ([`settings.ts`](../../../server/src/routes/settings.ts) reads, creates-or-merges and reads back in one transaction, layering the row over the shared `DEFAULT_*`. [`settings.spec.ts`](../../../server/src/routes/settings.spec.ts) runs all six singletons through it: an unwritten row equals the `DEFAULT_*` constant exactly, the first patch creates and the second merges without disturbing the first field, a patch of one NOT NULL column fills the rest from the defaults (`transferSettings` → `autoLinkMediumConfidence: true`), and `trainingWindowYears: null` survives as a value rather than being dropped. The constants are the *same objects* the repositories fall back to — they moved to `shared/seed-data.ts` (see the note above) rather than being copied.)
- [x] Two concurrent single-field settings patches both survive (no lost update), asserted by a test issuing them against the same user. (`settings.spec.ts` → "concurrent patches": two `PATCH /api/settings/appSettings` in one `Promise.all` leave `locale` *and* `privacyMode` set, and two racing to *create* `forecastSettings` end with both fields plus the untouched default `basis`. Each patch is a single `UPDATE … SET <that column>` inside a transaction, so neither writes back a stale copy of the other's field.)
- [x] `PATCH /api/goals/sort-order` applies all rows or none. ([`goals.ts`](../../../server/src/routes/goals.ts); [`goals.spec.ts`](../../../server/src/routes/goals.spec.ts) applies a two-row swap, then proves a list containing another user's goal answers 404 with *neither* row moved, and that a malformed `sortOrder` is a 400 before anything is written.)
- [x] The `categoryModel` endpoints round-trip a multi-megabyte artifact without base64 inflation. ([`category-model.ts`](../../../server/src/routes/category-model.ts) plus the envelope in [`binary-artifact.ts`](../../../server/src/http/binary-artifact.ts): `[uint32 header length][header JSON][blob][blob][blob]`, `application/octet-stream`, its own 64mb limit. [`category-model.spec.ts`](../../../server/src/routes/category-model.spec.ts) PUTs a 3 MB artifact, GETs it back, asserts the response is within 1 kB of the bytes sent — base64 would be ~4/3 of it — and compares `weightData` byte for byte. A truncated envelope and a metadata field that is not a column are both 400s that write nothing.)
- [x] A malformed body returns 400 naming the offending field and writes nothing. ([`validate.ts`](../../../server/src/http/validate.ts) derives the check from the Drizzle table — unknown field, wrong type, value outside the column's union, missing required field, null on a NOT NULL column — and runs before the statement is built. [`validate.spec.ts`](../../../server/src/http/validate.spec.ts) pins the wording of each (`Unknown field "nickname" for accounts`, `Invalid value for "type": expected one of checking, savings, joint, invest`, …); `entity-router.spec.ts` asserts per entity that the row count is unchanged afterwards.)
- [x] Backend tests cover every case above against an in-memory database with two seeded users. (`startTwoUserApp()` in [`samples.testing.ts`](../../../server/src/routes/samples.testing.ts) boots the real app against `:memory:` — never `server/data/` — and signs in Alice and Bob, each with their own account, category and two transactions. `npm run test:server`: **24 files, 286 tests, all passing**.)
- [x] Verified via the fallow skill and coding-conventions skill. (Both CI gates exit 0: `fallow dead-code --baseline .fallow-baseline.json --fail-on-issues` and `fallow health --complexity --max-cognitive 30 --max-cyclomatic 30 --max-crap 1000 --fail-on-issues`. Conventions: routers take the Drizzle instance alone, `requireAuth` is mounted per router rather than blanket on `/api`, no SQLite constraint message can reach a client (asserted by `entity-router.spec.ts`'s "never answers with a SQLite constraint message"), harnesses live in `*.testing.ts`, `shared/` still imports nothing outside itself (`shared-module.spec.ts`), and no migration was needed — this ticket adds no column. `ng lint`, `ng test`, `ng build --configuration development`, `npm --prefix server run lint` and `typecheck` all pass; the `project-map` skill gained the new `http/` layer and route modules.)

## Notes

- **`exportAll` / `importAll` / `deleteAll` are deliberately not in this ticket.** They iterate every table at once and are the transport for [TICKET-SRV-07](./TICKET-SRV-07-migrate-local-database.md)'s migration and the existing backup features; they land in [TICKET-SRV-04](./TICKET-SRV-04-transactional-write-endpoints.md) with the other multi-table operations.
- **The router factory is worth the indirection here and would not normally be.** Ten near-identical routers is the kind of duplication that rots differently in each copy; one factory with per-entity extension points keeps the cross-user scoping — the thing that must never be wrong — in exactly one place.
- **404-for-another-user's-row is a deliberate choice** and slightly unusual for a trusted local network. It is chosen for handler simplicity rather than secrecy: one query, one branch, one test.
- Depends on [TICKET-SRV-02](./TICKET-SRV-02-drizzle-schema-per-user.md) (tables) and [TICKET-AUTH-01](../../auth/tickets/TICKET-AUTH-01-users-seeded-admin-login.md) (`requireAuth`). Nothing in the Angular app changes yet.
