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

## Review fixes (2026-09-24)

The `conventions-reviewer` pass verified the port against a real SQLite database and found one
genuine bug plus a set of seams between the two sessions this ticket was built across.

1. **`loans.categoryId` CASCADE was silently destroying loans, and the comment ruling out the
   alternative was wrong.** Deleting a category took the loan with it — name, principal, rate,
   term, all of it — which is strictly worse than the orphan row it was meant to replace. The
   schema file argued RESTRICT was unavailable because deleting a *user* cascades into
   `categories` and `loans` in an unspecified order. The ordering concern is real, but it skipped
   the option that solves it: **NO ACTION** (Drizzle's default — just omit `onDelete`) is deferred
   to end-of-statement, so the user delete has already cascaded both children away by the time the
   constraint is checked. Verified against the real migration: deleting a category is now
   **refused** with the loan intact, and deleting a user still succeeds. The migration was
   regenerated; `0000_users_and_sessions` was not touched.
2. **Admin seeding was two transactions, not one.** The `users` insert sat outside
   `seedUserDefaults`' transaction, so a failure there left an admin with no categories, no mapping
   profiles and no transfer settings — permanently, because the `count(*) > 0` guard means that
   half-seeded state is never retried. `seedUserDefaults` now takes a database *or* a transaction
   and opens neither, so the caller owns the unit: creating a user and seeding them is one atomic
   step. TICKET-AUTH-03's create-user endpoint gets the same guarantee for free.
3. **The `shared/` ESLint guard blocked the two workspaces but not their dependencies.** Importing
   `dexie`, `drizzle-orm` or `@ngrx/signals` *directly* into `shared/` was allowed — the more
   likely mistake, since it couples every consumer to a persistence library without ever naming a
   workspace. The group now covers them, verified with a probe. `shared-module.spec.ts` also
   checked two hardcoded filenames; it now reads the folder, so a third module is covered the
   moment it lands.
4. **Insert types existed for one singleton out of seven.** Made uniform — SRV-03 and SRV-04 need
   all of them.
5. **The bundle criterion was measured on the wrong build.** It says "`ng build` reports no change"
   and was ticked against a *development* build showing +40 B. Re-measured on the production build
   the criterion actually names: **851.94 kB initial total, identical to the pre-SRV-02 baseline.**
   The 40 bytes were dev-build module banner comments, which production strips.
6. Two specs had each hand-rolled the same open/migrate/close harness; extracted to
   `server/src/db.testing.ts` alongside the existing `app.testing.ts`. Plus three stale file
   references, a dead `shared/**/*.spec.ts` include in `tsconfig.spec.json` (Angular's test builder
   only discovers specs under `src/`, so a spec there would never have run), and a duplicated
   `drizzle-orm` import.

**Recorded, deliberately not fixed here:** nothing in the schema stops a *write* creating a row
owned by user A that references user B's row — confirmed accepted against the real migration.
Enforcing it means a `uniqueIndex(id, userId)` on every parent plus composite foreign keys across
eighteen tables, which is a larger change than this ticket. Reads were never at risk, since every
query is user-scoped. It is now an acceptance criterion on TICKET-SRV-03 and TICKET-SRV-04, which
own the write paths, and the isolation criterion below says plainly what it does and does not cover.

## Acceptance criteria

- [x] All 18 object stores in `app-db.ts` (the 17 entities plus `recurringOverrides`) have a corresponding Drizzle table — asserted by a test that enumerates the Dexie table names and the Drizzle schema exports and fails on any name present in one and not the other. (`server/src/schema/dexie-parity.spec.ts` → "has a Drizzle table for every Dexie store, and no entity table Dexie does not have": both sides are derived — Dexie's from parsing `app-db.ts`'s `.stores()` strings, Drizzle's from `Object.values(schema)` filtered with `is(value, SQLiteTable)` — and compared as sorted name lists. Eighteen table modules in `server/src/schema/`, all re-exported from `index.ts`.)
- [x] Every table has a `userId` column that is not null, indexed, and cascades on user deletion. (`dexie-parity.spec.ts` → "schema: row ownership", one `it.each` case per entity table, asserting `notNull`, a foreign key to `users` on `userId` with `onDelete: 'cascade'`, and either an index led by `userId` or a primary key on it. The rules are written once, in `server/src/schema/columns.ts`'s `ownerId()` / `ownerPrimaryKey()` builders, rather than eighteen times.)
- [x] Every index declared in the Dexie `.stores()` strings exists as an index on the Drizzle table — asserted by a test that parses the Dexie schema strings rather than a hand-written list, so a future Dexie index cannot silently go unported. (`dexie-parity.spec.ts` → "ports every index Dexie declared on %s". `readDexieSchema()` reads `app-db.ts` as a **file** — importing it would trip the SRV-01 ESLint guard — folds every `.stores({...})` block in declaration order with last-declaration-wins, which is Dexie's own carry-forward rule, and requires a composite `(userId, field)` index for each entry. A parser guard case asserts it found all eighteen stores, so the suite cannot pass vacuously against an empty parse.)
- [x] `transactions.attributionOverride.reimbursementTransferId` is queryable through an index, not a JSON scan. (Extracted into its own scalar `reimbursementTransferId` column alongside the JSON in `server/src/schema/transactions.ts`; `server/src/schema/entities.spec.ts` → "seeks the extracted column through an index instead of scanning the JSON" runs `EXPLAIN QUERY PLAN` over `WHERE userId = ? AND reimbursementTransferId = ?` and asserts the plan names `transactions_userId_reimbursementTransferId_idx`. The parity spec's dotted-keypath mapping is what ties that column back to Dexie's v11 index.)
- [x] `salaryMetadata` rejects a second row for the same user and month; the repository's upsert-by-month behaviour still resolves rather than throwing. (`uniqueIndex('salaryMetadata_userId_yearMonth_idx')` in `server/src/schema/salary-metadata.ts`; `entities.spec.ts` → "schema: salaryMetadata uniqueness" — a plain second insert throws `UNIQUE`, the same insert with `onConflictDoUpdate` targeting `(userId, yearMonth)` leaves exactly one row holding the new value, and two users may each hold `2026-02`.)
- [x] The `categoryModel` blob columns round-trip an `ArrayBuffer` byte-for-byte, including a multi-megabyte artifact. (`bytes()` → `blob(..., { mode: 'buffer' })` in `columns.ts`, used for all three fields of `server/src/schema/category-model.ts`; `entities.spec.ts` → "schema: categoryModel blob columns" round-trips 1 KB and 4 MB of non-uniform bytes and compares with `Buffer.equals`. The same test pins the DAT-05 bug this fixes, by asserting `JSON.stringify(buffer)` is still `'{}'`.)
- [x] Each JSON column round-trips its nested shape unchanged, including `Transaction.rawRow` with keys containing quotes, newlines and non-ASCII characters (real bank CSVs contain all three). (`json<T>()` → `text(..., { mode: 'json' }).$type<T>()` in `columns.ts`; `entities.spec.ts` → "schema: JSON columns" round-trips `AWKWARD_RAW_ROW` — embedded double quotes, an embedded newline, a tab, and `€`/`Ñ`/`é`/em-dash — asserting deep equality *and* key order, plus `Account.coOwners`, `Transaction.attributionOverride`, `Rule.conditions`/`action`, `MappingProfile.headerSignature`/`columns`, `DashboardLayoutSettings.rowOrder`/`hiddenRowIds` and `AppSettings.recentRanges`.)
- [x] `seedUserDefaults` produces the same categories, mapping profiles and transfer settings a fresh Dexie database produces — asserted by a test comparing against the seed constants `app-db.ts` still exports. (`server/src/seed-user-defaults.ts`, called from `auth/seed.ts` when the first-boot admin is created; `server/src/seed-user-defaults.spec.ts` compares every seeded row field by field against `DEFAULT_CATEGORIES`, `DEFAULT_MAPPING_PROFILE_TEMPLATES` and `DEFAULT_TRANSFER_SETTINGS` imported from `shared/seed-data.js` — which is exactly what `app-db.ts` exports, since `core/data-access/seed-data.ts` re-exports that module and `app-db.ts` re-exports it in turn, so these are the same objects Dexie's `populate` hook writes. Covers the v3/v4 `columns.ownIban` backfill and the v6 "Partner contribution" category.)
- [x] Two users seeded in the same database each get their own copy, and neither's rows are visible in a query scoped to the other. (`seed-user-defaults.spec.ts` → "gives two users their own copy, neither visible in the other scope": same category names, disjoint id sets, two `transferSettings` rows. `entities.spec.ts` → "schema: per-user isolation" widens that to all eighteen tables with a row each for two users, asserting every user-scoped count is non-zero and equal on both sides.

  **What this does *not* cover, stated plainly so it is not mistaken for full isolation:** the schema stops nothing from *writing* a row owned by user A that references user B's row — `transactions(userId: A, accountId: <B's account>)` is accepted today, as are `loans.categoryId` and the `transfers`/`recurringOverrides` transaction references. Enforcing it in the schema means a `uniqueIndex(id, userId)` on every parent plus composite `(userId, parentId)` foreign keys across eighteen tables, which is a larger change than this ticket. **Reads are unaffected** — every query is user-scoped, so no user can see another's data — so this is a write-path validation gap, and it now has an acceptance criterion in [TICKET-SRV-03](./TICKET-SRV-03-rest-api-per-entity.md) and [TICKET-SRV-04](./TICKET-SRV-04-transactional-write-endpoints.md), which are the tickets that own writes.)
- [x] Deleting a user removes every row they own across all 18 tables, by cascade, with foreign keys enabled. (`entities.spec.ts` → "cascades across all eighteen tables and leaves the other user untouched": asserts `pragma foreign_keys` is 1, fills all eighteen tables for two users, deletes one `users` row, and requires every table to be empty for them and still populated for the survivor. This test is what forced `loans.categoryId` off RESTRICT, whose immediate checking makes it hostage to the order SQLite cascades the two children in; it takes NO ACTION instead, which refuses the category delete but is deferred to end-of-statement so the user delete still works. The reasoning is written down in `server/src/schema/loans.ts`.)
- [x] Moving the entity types out of `app-db.ts` changes no import path in `src/app/` — `ng lint`, `ng test` and `ng build --configuration development` all still pass with the Dexie app untouched. (`git diff` adds or changes no `import` line anywhere under `src/app/` except the six files that *are* the seam: the new one-line re-exports `core/data-access/entities.ts` and `seed-data.ts`, and the four modules that now re-export a union they own from `shared/` — `core/theme/accent-colors.ts`, `core/stats/saving-velocity.ts`, `core/ml/model-config.ts`, `shared/utils/format-settings.ts`. Verified 2026-09-24: `ng lint` clean, `ng test` 3602 passed in 307 files, `ng build --configuration development` succeeds. `app-db.ts` stays at Dexie version 16 with every shipped version block untouched.)
- [x] `shared/entities.ts` imports nothing — no Angular, no Dexie, no Drizzle — and both workspaces compile against it. Asserted by the two typechecks passing plus a check that the module has no import statements. (`server/src/shared-module.spec.ts` parses every `import`/`export … from` specifier out of the source and requires `entities.ts` to have **none at all**, `seed-data.ts` to reach no further than its sibling `./entities.js`, and `shared/package.json` to declare neither `dependencies` nor `devDependencies`. Both workspaces compile against it: `npm --prefix server run typecheck` clean, `ng build --configuration development` clean.)
- [x] The TICKET-SRV-01 ESLint guards still hold in both directions: `src/**` importing `server/**` is still an error, and so is the reverse. Only `shared/**` crosses. Verified with a deliberate probe import each way, as SRV-01 did. (Three throwaway probe files, run 2026-09-24 and deleted afterwards. `src/app/probe-guard.ts` importing `../../server/src/types` → 1 `no-restricted-imports` error; `server/src/probe-guard.ts` importing `../../src/app/core/data-access/entities.js` → 1 error; `shared/probe-guard.ts` importing both → 2 errors, from the third guard block this ticket adds. Each probe also imported `shared/entities` in the same file and **that** line reported nothing, which is the half that proves the seam is open where it is supposed to be.)
- [x] `ng build` reports **no change** to the initial bundle — the shared module is types only, so it erases entirely. (Measured on the **production** build — the one this criterion names and the one `angular.json`'s budgets govern — 2026-09-24: **initial total 851.94 kB raw**, identical to the figure TICKET-SRV-01 recorded before any of this existed. `shared/entities.ts` is types only and leaves no trace whatsoever in the output.

  A first pass measured the *development* build instead and recorded +40 B, which was reported as "no change" when it was not quite that. The 40 bytes were esbuild's dev-build module banner comments for `shared/seed-data.ts` and its re-export shim — splitting one emitting module into two adds per-module overhead — and production strips them, so the real answer is exactly zero. No bundle budget was touched; the only `angular.json` edit in this ticket is a lint pattern.)
- [x] Verified via the fallow skill and coding-conventions skill. (2026-09-24: `npx fallow dead-code --baseline .fallow-baseline.json --fail-on-issues --quiet` exit 0 — no new findings against the tracked baseline — and `npx fallow health --complexity --max-cognitive 30 --max-cyclomatic 30 --max-crap 1000 --fail-on-issues --quiet` exit 0. Conventions re-read and applied: `type` over `interface`, arrow-`const` functions, single quotes via Prettier, `describe('{module}: {operation}')` spec naming matching `db.spec.ts` / `auth/seed.spec.ts`, specs adjacent to their source and run against an in-memory database rather than `server/data/`, camelCase Drizzle columns, and SRV-01's rule that a shared concern gets its own home rather than a hole punched in a guard. `npm --prefix server run lint` and `npx ng lint` both clean.)

## Notes

- **Ids are not remapped here.** Server-assigned ids are new and unrelated to whatever a browser's IndexedDB assigned; reconciling an existing local database against them is [TICKET-SRV-07](./TICKET-SRV-07-migrate-local-database.md)'s entire job.
- **Foreign keys are a behaviour change, not just a schema one.** Dexie enforced nothing, so the app's deletion services ([`account-deletion.service.ts`](../../../src/app/core/accounts/account-deletion.service.ts), [`transaction-deletion.service.ts`](../../../src/app/core/transactions/transaction-deletion.service.ts), [`transfer-cleanup.service.ts`](../../../src/app/core/transfers/transfer-cleanup.service.ts)) clean up references by hand. Those hand-written cleanups move server-side in [TICKET-SRV-04](./TICKET-SRV-04-transactional-write-endpoints.md); the FK constraints here are the safety net that proves they are complete. Expect the constraint errors to find at least one path the current code leaves orphaned.
- **Why composite `(userId, field)` indexes rather than plain ones**: every query in the new API filters by `userId` first, so a single-column index on `bookingDate` would have the wrong leading column and SQLite would ignore it.
- The Dexie **version history** (16 blocks of migrations and backfills) is **not** ported. The Drizzle schema is the *end state* of those 16 versions; the historical upgrade steps only ever mattered for databases that already existed, and a server database starts empty. `app-db.ts`'s version blocks stay exactly as they are — they are a shipped record, per the repo's hard rules.
- Depends on [TICKET-SRV-01](./TICKET-SRV-01-express-sqlite-drizzle-skeleton.md) (the Drizzle setup) and [TICKET-AUTH-01](../../auth/tickets/TICKET-AUTH-01-users-seeded-admin-login.md) (the `users` table these all reference).
