# TICKET-SRV-02 — Every Dexie table as a Drizzle table, owned by a user

- **Area:** Server
- **Released in:** _unreleased_
- **Type:** Feature
- **Traceability:** ports the whole data model in [`data-model/SKILL.md`](../../../.claude/skills/data-model/SKILL.md); planned for v3

## User story

As a user of a multi-account Money Mosaic, I want the server to hold my accounts, transactions, categories, rules and settings under my own name, so two people on the same installation never see each other's money.

## Description

Ports all 17 entities from the Dexie schema onto Drizzle/SQLite, each row owned by a `userId`, and moves the first-run seed from Dexie's `on('populate')` to a per-user seed that runs when an account is created. No client code changes here — this is the schema the rest of v3 reads and writes.

## Current situation (as-is)

- [`app-db.ts`](../../../src/app/core/data-access/app-db.ts) is the single source of truth: the `AppDb` Dexie subclass at **schema version 16**, every entity `type`, the seed data, and sixteen `.version(n).stores(...)` blocks. The tables are `accounts`, `transactions`, `transfers`, `transferSettings`, `categories`, `rules`, `mappingProfiles`, `importBatches`, `categoryModel`, `categoryModelSettings`, `categoryComparisonSettings`, `dashboardLayoutSettings`, `appSettings`, `salaryMetadata`, `savingsGoals`, `forecastSettings`, `loans`, `recurringOverrides`.
- **Seven of those are singletons keyed `id = 1`** (`transferSettings`, `appSettings`, `forecastSettings`, `categoryModel`, `categoryModelSettings`, `categoryComparisonSettings`, `dashboardLayoutSettings`), a pattern that only makes sense when a database belongs to one person.
- Dexie's `populate` hook seeds first-run data — KBC + Belfius mapping-profile templates, ~10 default categories, default transfer settings — and explicitly does **not** run for existing users.
- IndexedDB stores arbitrary structured clones, so nested objects (`Rule.conditions[]`, `MappingProfile.columns`, `Account.coOwners`, `Transaction.attributionOverride`, `Transaction.rawRow`) are stored as-is with no serialisation step. SQLite has no such luxury.
- `CategoryModelArtifact` holds three `ArrayBuffer` fields. As recorded at the bottom of [TICKET-DAT-05](../../data-management/tickets/TICKET-DAT-05-qr-code-data-sync.md), `JSON.stringify` silently turns each into an empty object, so the JSON export has always lost the trained model weights.
- `Transaction.fingerprint` is the dedupe hash from [`fingerprint.ts`](../../../src/app/shared/utils/fingerprint.ts); `SalaryMetadata.yearMonth` carries a **unique** index; Dexie enforces no foreign keys at all.

## Desired result (to-be)

- **A shared entity-types module, in a third location neither workspace owns.** The `type`
  definitions currently living in `app-db.ts` move to **`shared/entities.ts`** at the repo root,
  and both sides import them from there. `src/app/core/data-access/entities.ts` becomes a
  re-export of that module (and stays re-exported from the existing barrel), so **no import path
  in `src/app/` changes**. One definition of `Account`, `Transaction`, `Category` and the rest,
  read by both sides — the client cannot drift from the wire shape without a type error.

  > **Amended 2026-09-23.** This bullet originally had the server `import type` straight from
  > `src/app/core/data-access/entities.ts`. TICKET-SRV-01 shipped two ESLint guards that forbid
  > exactly that (`src/**` may not import `server/**`, and vice versa) — the first because a value
  > import would drag `better-sqlite3` into the browser bundle, which is a `CLAUDE.md` hard rule.
  > Rather than punch a hole in a guard that is protecting a hard rule, the shared types get their
  > own home. Decided with the user; the alternative considered and rejected was hand-mirroring
  > the 29 types server-side, which would have given up this bullet's whole reason for existing.
  >
  > `shared/` holds **framework-free, dependency-free plain TypeScript only** — no Angular, no
  > Dexie, no Drizzle. The 29 entity types already qualify: Dexie appears in `app-db.ts` only in
  > the `AppDb` class, never in the type definitions. Both `tsconfig.app.json` and
  > `server/tsconfig.json` need a path mapping for it, and the two ESLint guards need `shared/**`
  > permitted from both sides while everything else stays forbidden.
- **One Drizzle table per entity**, in `server/src/schema/`, each with:
  - `id` — integer primary key autoincrement, matching the client's `number` ids. Ids stay unique **per table across all users**, so one user's ids are simply non-contiguous. Nothing in the app assumes contiguity.
  - `userId` — integer, not null, referencing `users.id` with cascade delete, and **indexed on every table**. This is what makes [TICKET-AUTH-03](../../auth/tickets/TICKET-AUTH-03-admin-user-management.md)'s user deletion a cascade rather than eighteen manual deletes.
  - The scalar fields as real columns, with the **same indexes the Dexie schema declared** (`transactions`: `accountId`, `bookingDate`, `categoryId`, `transferId`, `fingerprint`, `importBatchId`; `accounts`: `name`, `type`, `archived`; and so on) — each as a composite `(userId, field)` index, since every query is already user-scoped.
- **The seven singletons stop being singletons.** Each becomes one row per user with `userId` as the primary key, dropping the `id = 1` convention entirely. Their repositories' existing `?? DEFAULT_*` fallback behaviour is preserved: a user with no row reads the default, exactly as today.
- **Nested objects are stored as JSON text columns**, typed against the shared entity types: `Rule.conditions`, `Rule.action`, `MappingProfile.columns`, `Account.coOwners`, `Transaction.attributionOverride`, `Transaction.rawRow`, `AppSettings`'s id arrays, `DashboardLayoutSettings`'s row order. A JSON column cannot be indexed usefully, and none of these were indexed in Dexie either — with one exception: `transactions.attributionOverride.reimbursementTransferId` **was** indexed (schema v11). It becomes its own extracted scalar column alongside the JSON, so the lookup stays an index seek.
- **`CategoryModelArtifact`'s three `ArrayBuffer` fields become blob columns**, round-tripping as `Uint8Array`. This incidentally fixes the silent model-weight loss recorded in DAT-05 — a server-stored model is no longer passed through `JSON.stringify` at all.
- **Real constraints where Dexie had none**: `salaryMetadata` gets a unique `(userId, yearMonth)` index; `transactions.accountId`, `transactions.categoryId`, `loans.categoryId`, `transfers.fromTransactionId` / `toTransactionId`, and `recurringOverrides.anchorTransactionId` become foreign keys. **Delete behaviour is chosen per relation and written down in the schema file**, matching what the current deletion services do by hand — this is the one place SQLite will enforce something Dexie never did, so any mismatch surfaces as a constraint error rather than an orphan row.
- **A per-user seed function**, `seedUserDefaults(db, userId)`, carrying over exactly what the Dexie populate hook seeded: the KBC and Belfius mapping-profile templates (including the `columns.ownIban` and `headerSignature` values backfilled by schema versions 3 and 4), the ~10 default categories with their `isSystem` flag and `sortOrder`, the "Partner contribution" neutral category from v6, and the default `TransferSettings`. It is called when a user is created — by the first-boot admin seed and by [TICKET-AUTH-03](../../auth/tickets/TICKET-AUTH-03-admin-user-management.md)'s create-user endpoint.
- **The Dexie schema is not touched.** `app-db.ts` stays at version 16 and keeps working until [TICKET-SRV-08](./TICKET-SRV-08-retire-dexie.md) removes it, so the app remains runnable throughout the version.

## Acceptance criteria

- [ ] All 18 object stores in `app-db.ts` (the 17 entities plus `recurringOverrides`) have a corresponding Drizzle table — asserted by a test that enumerates the Dexie table names and the Drizzle schema exports and fails on any name present in one and not the other.
- [ ] Every table has a `userId` column that is not null, indexed, and cascades on user deletion.
- [ ] Every index declared in the Dexie `.stores()` strings exists as an index on the Drizzle table — asserted by a test that parses the Dexie schema strings rather than a hand-written list, so a future Dexie index cannot silently go unported.
- [ ] `transactions.attributionOverride.reimbursementTransferId` is queryable through an index, not a JSON scan.
- [ ] `salaryMetadata` rejects a second row for the same user and month; the repository's upsert-by-month behaviour still resolves rather than throwing.
- [ ] The `categoryModel` blob columns round-trip an `ArrayBuffer` byte-for-byte, including a multi-megabyte artifact.
- [ ] Each JSON column round-trips its nested shape unchanged, including `Transaction.rawRow` with keys containing quotes, newlines and non-ASCII characters (real bank CSVs contain all three).
- [ ] `seedUserDefaults` produces the same categories, mapping profiles and transfer settings a fresh Dexie database produces — asserted by a test comparing against the seed constants `app-db.ts` still exports.
- [ ] Two users seeded in the same database each get their own copy, and neither's rows are visible in a query scoped to the other.
- [ ] Deleting a user removes every row they own across all 18 tables, by cascade, with foreign keys enabled.
- [ ] Moving the entity types out of `app-db.ts` changes no import path in `src/app/` — `ng lint`, `ng test` and `ng build --configuration development` all still pass with the Dexie app untouched.
- [ ] `shared/entities.ts` imports nothing — no Angular, no Dexie, no Drizzle — and both workspaces compile against it. Asserted by the two typechecks passing plus a check that the module has no import statements.
- [ ] The TICKET-SRV-01 ESLint guards still hold in both directions: `src/**` importing `server/**` is still an error, and so is the reverse. Only `shared/**` crosses. Verified with a deliberate probe import each way, as SRV-01 did.
- [ ] `ng build` reports **no change** to the initial bundle — the shared module is types only, so it erases entirely.
- [ ] Verified via the fallow skill and coding-conventions skill.

## Notes

- **Ids are not remapped here.** Server-assigned ids are new and unrelated to whatever a browser's IndexedDB assigned; reconciling an existing local database against them is [TICKET-SRV-07](./TICKET-SRV-07-migrate-local-database.md)'s entire job.
- **Foreign keys are a behaviour change, not just a schema one.** Dexie enforced nothing, so the app's deletion services ([`account-deletion.service.ts`](../../../src/app/core/accounts/account-deletion.service.ts), [`transaction-deletion.service.ts`](../../../src/app/core/transactions/transaction-deletion.service.ts), [`transfer-cleanup.service.ts`](../../../src/app/core/transfers/transfer-cleanup.service.ts)) clean up references by hand. Those hand-written cleanups move server-side in [TICKET-SRV-04](./TICKET-SRV-04-transactional-write-endpoints.md); the FK constraints here are the safety net that proves they are complete. Expect the constraint errors to find at least one path the current code leaves orphaned.
- **Why composite `(userId, field)` indexes rather than plain ones**: every query in the new API filters by `userId` first, so a single-column index on `bookingDate` would have the wrong leading column and SQLite would ignore it.
- The Dexie **version history** (16 blocks of migrations and backfills) is **not** ported. The Drizzle schema is the *end state* of those 16 versions; the historical upgrade steps only ever mattered for databases that already existed, and a server database starts empty. `app-db.ts`'s version blocks stay exactly as they are — they are a shipped record, per the repo's hard rules.
- Depends on [TICKET-SRV-01](./TICKET-SRV-01-express-sqlite-drizzle-skeleton.md) (the Drizzle setup) and [TICKET-AUTH-01](../../auth/tickets/TICKET-AUTH-01-users-seeded-admin-login.md) (the `users` table these all reference).
