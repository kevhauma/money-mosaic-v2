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

## Acceptance criteria

- [ ] **A write may not reference another user's row.** Every foreign-key field a request body carries (`transactions.accountId` / `categoryId`, `loans.categoryId`, `transfers.fromTransactionId` / `toTransactionId`, `recurringOverrides.anchorTransactionId`) is checked to belong to the signed-in user before the write, and a mismatch is a **404**, not a 403 — a row the caller does not own is a row that does not exist as far as they are concerned. Asserted by a test that signs in as one user and tries to reference another's row for each of those fields. (TICKET-SRV-02 left this deliberately unenforced at the schema level: composite `(userId, parentId)` foreign keys across eighteen tables were a bigger change than that ticket, and reads were never at risk because every query is user-scoped. This is where it gets enforced.)
- [ ] Every public method on all 17 repositories has a corresponding endpoint — asserted by a checklist test that enumerates the repository method names and fails on one with no route.
- [ ] Every endpoint returns 401 without a session, tested per router rather than for one sample route.
- [ ] **User B cannot read, update, or delete user A's rows.** For each entity: a list call returns only B's rows; a `GET`/`PATCH`/`DELETE` on A's id returns 404 and changes nothing. This is the ticket's central test and it runs against every table, not a sample.
- [ ] A body carrying a `userId` field is ignored (or rejected), never honoured — covered by a test that tries to create a row under another user's id.
- [ ] Bulk create, bulk update and bulk delete each run in one transaction: a forced failure on the last item leaves **none** of the batch applied.
- [ ] `PATCH /api/settings/<name>` creates the row when absent, merges when present, and leaves untouched fields alone — the `DEFAULT_*` fallback behaviour matches what the current repositories return for an unwritten singleton.
- [ ] Two concurrent single-field settings patches both survive (no lost update), asserted by a test issuing them against the same user.
- [ ] `PATCH /api/goals/sort-order` applies all rows or none.
- [ ] The `categoryModel` endpoints round-trip a multi-megabyte artifact without base64 inflation.
- [ ] A malformed body returns 400 naming the offending field and writes nothing.
- [ ] Backend tests cover every case above against an in-memory database with two seeded users.
- [ ] Verified via the fallow skill and coding-conventions skill.

## Notes

- **`exportAll` / `importAll` / `deleteAll` are deliberately not in this ticket.** They iterate every table at once and are the transport for [TICKET-SRV-07](./TICKET-SRV-07-migrate-local-database.md)'s migration and the existing backup features; they land in [TICKET-SRV-04](./TICKET-SRV-04-transactional-write-endpoints.md) with the other multi-table operations.
- **The router factory is worth the indirection here and would not normally be.** Ten near-identical routers is the kind of duplication that rots differently in each copy; one factory with per-entity extension points keeps the cross-user scoping — the thing that must never be wrong — in exactly one place.
- **404-for-another-user's-row is a deliberate choice** and slightly unusual for a trusted local network. It is chosen for handler simplicity rather than secrecy: one query, one branch, one test.
- Depends on [TICKET-SRV-02](./TICKET-SRV-02-drizzle-schema-per-user.md) (tables) and [TICKET-AUTH-01](../../auth/tickets/TICKET-AUTH-01-users-seeded-admin-login.md) (`requireAuth`). Nothing in the Angular app changes yet.
