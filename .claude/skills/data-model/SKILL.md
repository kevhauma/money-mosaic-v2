---
name: data-model
description: Data-model reference for MoneyMosaicVibe — the entities, the server's Drizzle/SQLite schema, per-user ownership, the migration workflow, and the repository layer that reaches it over HTTP. Use when adding/changing entities, writing queries, or planning a schema migration.
---

# Data Model (SQLite / Drizzle, reached over HTTP)

The data lives on the server, in one SQLite file, one set of rows per user account. Three places
describe it and they are not interchangeable:

| What | Where |
| --- | --- |
| The entity **types** — one definition both workspaces compile against | [`shared/entities.ts`](../../../shared/entities.ts) |
| The **tables** — columns, indexes, foreign keys, CHECKs | [`server/src/schema/`](../../../server/src/schema/), one module per table, re-exported from `schema/index.ts` |
| The **client's door onto them** — one repository per entity, each an `/api` call | [`src/app/core/data-access/`](../../../src/app/core/data-access/) |

`core/data-access/entities.ts` and `seed-data.ts` are one-line re-exports of the two `shared/`
modules, and the `core/data-access` barrel re-exports those — which is why every `src/app/` import
still reads `from '@/core/data-access'` and no consumer names `shared/`. `csv-options.ts` is the
barrel's third non-repository member: the option lists behind three of the CSV unions, which the
import wizard's dropdowns iterate and `shared/` may not hold because they are a UI affordance. It
lived in the deleted `app-db.ts` and stayed on this side of the barrel so no import path changed
(TICKET-SRV-08). **Nothing in the browser
persists anything** (TICKET-SRV-10): the theme, the landing-page "seen" flag and the backup-reminder
dismissal that used to be `localStorage` keys are the `uiPreferences` singleton now, and `src/` has no
`localStorage` call left. Don't add one back — a new piece of interface state that must survive a
reload is a `uiPreferences` column.

**Endpoints, running the server and backing the file up live in
[`server/README.md`](../../../server/README.md)** — read that rather than re-deriving a route list
here. This file is about the *shape* of the data.

## Entities (declared in `shared/entities.ts`, tabled in `server/src/schema/`)

Every entity table below carries a not-null, cascading `userId` and is indexed on it. The "Indexed
by" column lists what else is indexed, and **each of those is a composite `(userId, field)`** — a
single-column index on `bookingDate` would have the wrong leading column for a query that filters by
owner first. The eight **singletons** are one row per user, keyed on `userId` itself: the old
`id = 1` convention is gone, because it only made sense while a database belonged to one person.

| Entity                       | Table                        | Indexed by (composite with `userId`)                                                                                                                         | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ---------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Account`                    | `accounts`                   | `name`, `type`, `archived`                                                                                                    | type: checking/savings/joint/invest; currency fixed `'EUR'`; openingBalance + openingBalanceDate anchor balance math; `ownershipShare` (my fraction of a joint account, default 1); `coOwners: JointOwner[]` (name + IBANs + optional share for others on a joint account, TICKET-ACC-03); `sortOrder` for manual display ordering (TICKET-ACC-04)                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `Transaction`                | `transactions`               | `accountId`, `bookingDate`, `categoryId`, `transferId`, `fingerprint`, `importBatchId`, `reimbursementTransferId` | `fingerprint` = dedupe hash (`shared/utils/fingerprint.ts`); `categoryManual: true` ⇒ rules must never overwrite the category (FR-TXN-2, FR-CAT-3); `rawLine`/`rawRow` retain the original CSV row (TICKET-TXN-06); `attributionOverride` reweights a single transaction's contribution to net worth/income-expense for joint-account edge cases (TICKET-TXN-03); `nullified: true` excludes it from income/expense/savings-rate/category-breakdown while still counting toward balance (TICKET-TXN-04)                                                                                                                                                                                                                                                                           |
| `Transfer`                   | `transfers`                  | `fromTransactionId`, `toTransactionId`                                                                                      | method: auto-iban / auto-amountdate / manual; confidence: high / medium / manual                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `TransferSettings`           | `transferSettings`           | _singleton_ — keyed on `userId`                                                                                                          | matchWindowDays (default 3), autoLinkMediumConfidence (default true)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `Category`                   | `categories`                 | `name`, `kind`, `archived`                                                                                                    | kind: expense/income/**neutral** (neutral counts toward balance/net worth but is excluded from income/expense/savings-rate/breakdown — e.g. a partner's contribution, TICKET-CAT-02); `isSystem` marks seeded defaults; `sortOrder` for manual ordering (TICKET-CAT-03); optional `activeFrom`/`activeUntil` give the category the period it actually applied to (FR-CAT-9, TICKET-CAT-10) — both **non-indexed**, both inclusive, an absent bound meaning unbounded on that side. **Independent of `archived`**: archiving is timeless ("hide this everywhere"), a window is a dated fact ("true until then"), so an ended category can still be offered for a transaction inside its own period. The shared boundary predicate is `categoryHasEnded` in `core/categorisation/category-applicability.ts` — read it rather than re-deriving the comparison                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `Rule`                       | `rules`                      | `priority`, `enabled`                                                                                                       | conditions[] (field/operator/value) + action `{ setCategoryId }`; `continueOnMatch`; `conditionMatch: 'all' \| 'any'` — AND vs OR across conditions (FR-CAT-2), absent/undefined on pre-v5 rules ⇒ treated as `'all'`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `MappingProfile`             | `mappingProfiles`            | `name`, `bankPreset`, `defaultAccountId`                                                                                      | CSV column mapping; `headerSignature` auto-detects bank templates; `columns.ownIban` auto-detects which account a file belongs to                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `ImportBatch`                | `importBatches`              | `accountId`, `importedAt`                                                                                                   | per-import audit: rowsRead/rowsAdded/rowsDuplicate (skipped), date range. `rowsDuplicateImported` (optional, non-indexed, TICKET-IMP-14) counts rows recognised as already present and **added anyway** on the user's say-so — kept separate so `rowsRead = rowsAdded + rowsDuplicate` still holds, and absent (reads as zero) on every batch where the default was left alone                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `RecurringOverride`          | `recurringOverrides`         | `anchorTransactionId`, `kind`                                                                                               | TICKET-REC-11's user corrections to *detected* recurring payments — `dismissed` (not really recurring) and `merged` (same payment as another row). Identified by `anchorTransactionId`, a transaction the series contains, **never** by `RecurringPaymentSeries.key`, which is `<cluster>\|<median amount>` and moves when the price does. Applied on top of every fresh detection run by `feature-recurring/recurring-overrides.ts`. |
| `CategoryModelArtifact`      | `categoryModel`              | _singleton_ — keyed on `userId`                                                                                                          | trained auto-categoriser weights/metadata (ML-04); written by `category-model.worker.ts`, read by `CategoryModelStore`/`CategoryModelService` in `feature-categories/`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `CategoryModelSettings`      | `categoryModelSettings`      | _singleton_ — keyed on `userId`                                                                                                          | training-window preset (`trainingWindowYears`, TICKET-ML-17); repository falls back to `DEFAULT_CATEGORY_MODEL_SETTINGS` when unwritten                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `CategoryComparisonSettings` | `categoryComparisonSettings` | _singleton_ — keyed on `userId`                                                                                                          | optional category exclusion list for the dashboard's category period-comparison panel                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `DashboardLayoutSettings`    | `dashboardLayoutSettings`    | _singleton_ — keyed on `userId`                                                                                                          | customizable dashboard row order + per-row visibility (TICKET-STAT-14)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `SalaryMetadata`             | `salaryMetadata`             | `yearMonth` — **unique** per user                                                                                           | one manually-entered row per calendar month (TICKET-INC-10): optional `grossWage` and `bonus` (the part of that month's deposit that was a 13th month / vacation / holiday bonus), plus a free-text `note`. The only figures on `/income` that aren't derived from imported transactions — a bank CSV records only what landed. Both amounts are optional and a row with neither is deleted rather than kept as zeros; `SalaryMetadataRepository.upsert()` resolves the row by month so a repeated save can't trip the unique index                                                                                                                                                                                                                                               |
| `AppSettings`                | `appSettings`                | _singleton_ — keyed on `userId`                                                                                                          | app-wide portable preferences (TICKET-SET-05): accent `primaryColor`, `currencySymbol`/`currencySymbolPosition`, `locale`, plus the `/income` page's `excludedIncomeCategoryIds`, `smoothedBonusCategoryIds`, `careerStartDate`, `mainIncomeCategoryId` and `grossColor`, the help guides' `seenGuideSlugs`, and the Dashboard's `privacyMode` (TICKET-PRIV-01). **This is the table to extend for a new user preference** — every field is non-indexed and optional, so every column here is nullable, so an unset value falls back to the reader’s `?? DEFAULT_*` — but a new one is still a real column and still needs a migration. Fields are typed required-but-possibly-`undefined` and default to `undefined`, never a concrete value; each reader applies its own `?? DEFAULT_*`, so one setter's read-merge-put can't leak another's default into the row |
| `UiPreferences`              | `uiPreferences`              | _singleton_ — keyed on `userId`                                                                                                          | the interface's own state (TICKET-SRV-10): `themeStyle` (CHECK-pinned to `THEME_STYLE_IDS`), `hasVisited` (landing page, PUB-01), `backupReminderDismissed` (PUB-04). Same nullable tri-state as `appSettings`; falls back to `DEFAULT_UI_PREFERENCES`. Read once at bootstrap by `UiPreferencesService`, not by a store. Kept off `appSettings` because nobody edits these on a settings page |
| `SavingsGoal`                | `savingsGoals`               | `sortOrder`                                                                                                               | one thing the user is saving toward (TICKET-FUT-02): `name`, `targetAmount`, optional `targetDate`/`note`, `archived`, `createdAt`. `sortOrder` is indexed because it is the **funding order**, not a display preference — goals are paid for top-down, so moving one up pushes every goal below it further out (TICKET-FUT-05). Reordered through `GoalsRepository.bulkUpdateSortOrder` (one transaction, since a move touches two rows) |
| `ForecastSettings`           | `forecastSettings`           | _singleton_ — keyed on `userId`                                                                                                          | the `/future` page's own parameters (TICKET-FUT-02): `lookbackMonths`, `basis`, `safetyNetAmount`, plus the non-indexed `mode` (FUT-09) and `scopeAccountIds` (FUT-08) declared from the start so neither ticket bumps the version. Repository falls back to `DEFAULT_FORECAST_SETTINGS`, which declares **every** optional field explicitly as `undefined` — it seeds `ForecastSettingsStore`'s `withState`, and ngrx derives signal members from the seed's *keys*, so an omitted key means a later `patchState` is unreadable (the `DEFAULT_APP_SETTINGS` convention). **Deliberately persisted where `ChartOptionsStore` is in-memory** — these are inputs to a figure the user acts on, so a silent reset would be worse, not safer |
| `Loan`                       | `loans`                      | `categoryId`, `loanType`, `archived`                                                                                         | v1.7 loan tracker (TICKET-LOAN-01): `name`, `loanType` (`'mortgage' \| 'auto' \| 'personal' \| 'student' \| 'other'` — **display label only, never branches amortization/progress math**), `principal`, `interestRate` (annual %), `termMonths`, `startDate`, `categoryId` (FK -> `Category.id`, the one expense category whose transactions count as payments), `archived`, `sortOrder`. "One active loan per category" is a form-level invariant (LOAN-03), not a schema constraint |

## Schema, ownership and migrations

- **Every entity table is owned.** `columns.ts` holds the builders that make that true once instead
  of eighteen times: `ownerId()` (not null, `ON DELETE CASCADE`, so deleting a user is one
  statement) for a normal table, `ownerPrimaryKey()` for a singleton. Pair `ownerId()` with an index
  on it — SQLite does not index a foreign-key column on its own, and without it both the cascade and
  every user-scoped read scan the table.
- **The session is the only source of the user id.** No endpoint reads a `userId` from a body, a
  query string or a path, and one sent in a body is ignored. A foreign key in a request body must
  point at a row the caller owns — `http/ownership.ts` checks that, derived from the declared
  relations rather than from a hand-written list.
- **Column builders, all in [`columns.ts`](../../../server/src/schema/columns.ts)**: `json<T>()` for
  a nested object (`Rule.conditions`, `MappingProfile.columns`, `Account.coOwners`,
  `Transaction.rawRow`); `jsonArray<T>()` for one whose value is an array, which additionally
  records the name in `JSON_ARRAY_COLUMNS` so body validation can tell `[]` from `{}` at runtime —
  Drizzle erases `$type<T>`; `bytes()` for the three `ArrayBuffer` fields of the trained model;
  `inList()` for a CHECK pinning a text column to its TypeScript union, because Drizzle's SQLite
  `enum` is types-only and would let an unexpected string through a request body.
- **A JSON column cannot be indexed usefully.** Where one had to be, the value is *extracted* into a
  scalar column beside it and indexed there — `transactions.reimbursementTransferId` is the only
  case, and it must be written from the same value every time its JSON column is
  (`routes/transactions.ts`'s `DERIVED_COLUMNS`).
- **A new optional field on an existing entity is cheap but no longer free**: add it to
  `shared/entities.ts` *and* to the Drizzle table, then generate a migration. Only a field that must
  be **queried by** needs an index — and the index rides the same migration.
- **Migrations are the only way the schema changes.**

  ```bash
  npm run server:migrate          # drizzle-kit generate, then apply
  ```

  Then rename the generated `server/drizzle/NNNN_<random>.sql` to something descriptive and update
  the matching `tag` in `server/drizzle/meta/_journal.json` (drizzle-kit chains off `idx`, not the
  tag). **A shipped migration is never edited** — add another one. Pending migrations are applied on
  boot, before the server listens, and `/api/health` reports how many have run.
- A table module that is not re-exported from `schema/index.ts` is invisible to `drizzle-kit` and
  never reaches a migration. It is also invisible to `operations/user-rows.ts`'s derived
  `PER_USER_TABLES`/`TRANSPORT_TABLES`, which is what export, import and delete-a-user iterate — so
  the barrel is the registry, and adding to it is what makes a new table covered everywhere at once.
- **First-run data is seeded per user, not per database**: `server/src/seed-user-defaults.ts` writes
  the mapping-profile templates, the default categories and the default transfer settings from
  `shared/seed-data.ts` — the same constants the client's `DEFAULT_*` fallbacks are built from. It
  runs from `auth/seed.ts` (the first-boot `admin` account) and from `createUser`.
- **`DATA_SCHEMA_VERSION`** (`server/src/routes/data.ts`) is what a JSON backup declares and the
  highest version an import will accept. It is not the migration count. Raise it in the same change
  as any migration that alters what a document carries.

## Repository layer

One thin repository per entity in `core/data-access/` — `accounts`, `transactions`, `transfers`,
`transfer-settings`, `categories`, `rules`, `mapping-profiles`, `import-batches`, `category-model`
(both the artifact and its settings), `category-comparison-settings`, `dashboard-layout-settings`,
`app-settings`, `salary-metadata`, `goals`, `forecast-settings`, `loans`, `recurring-overrides`,
plus `data-management` — all exported through `core/data-access/index.ts`.
[`accounts.repository.ts`](../../../src/app/core/data-access/accounts.repository.ts) is the
archetype; read it before writing a new one.

- **A repository is a wrapper over an `/api` route.** Every method goes through the shared
  [`ApiClient`](../../../src/app/core/data-access/api-client.ts), which owns the `/api` base path,
  the JSON handling, and the one place a 4xx/5xx becomes a rejected `Error` carrying the server's
  own message. A repository that built its own request would have to remember all of it.
- **Components and signal stores never reach past a repository** — no `ApiClient`, no `HttpClient`,
  no `fetch`. All repository methods are `async`; stores call them from methods/effects, never from
  templates.
- **A multi-table write is one endpoint, not several calls.** Atomicity lives on the server now, so
  the four operation services (`import.service.ts`, `transaction-deletion.service.ts`,
  `transfer-linking.service.ts`, `account-deletion.service.ts`) each call a single transactional
  endpoint rather than orchestrating writes from the browser. A new multi-row operation means a new
  endpoint, not a loop of `PATCH`es.
- **A field explicitly set to `undefined` means "clear it", and goes on the wire as `null`.**
  `JSON.stringify` drops an `undefined` value, which would turn "clear this" into a patch naming no
  field at all — `ApiClient` converts it, recursively.
- **A settings singleton nobody has written reads as its `DEFAULT_*` constant.** The endpoint
  answers `{}` with the keys *absent*, so the repository must keep spreading the response over the
  constant: the stores derive their signal members from the seed object's **keys**, and a body
  missing a key produces a store missing a member.
- **A read can fail now, and a failure is not "empty".** Every store's memoised hydration is wrapped
  by `retryOnFailure` (`core/store-reset/`) so a rejection forgets itself instead of being cached
  for the session, and `withHydration` carries the loading/error pair a page renders instead of a
  confident zero.
- Two structural specs keep this honest, and both have bitten:
  [`repository-surface.spec.ts`](../../../src/app/core/data-access/repository-surface.spec.ts) pins
  every method's name, arity and return type, and
  [`api.spec.ts`](../../../server/src/routes/api.spec.ts) asserts every repository method has an
  endpoint that answers. Spec helpers: `withApiTesting()` + `callApi()` for a spec *about* which
  request is made, `provideFakeApi()` + `seedApi()` for a component spec that merely mounts a store
  that hydrates.

## Data flow

- **Import**: CSV file → `core/import/csv-parse.worker.ts` (PapaParse in Web Worker) → `csv-row-mapper.ts` (via MappingProfile) → fingerprint dedupe → `import.service.ts` writes Transactions + ImportBatch → `core/categorisation/rules-engine.service.ts` assigns categories → `core/transfers/transfer-matching.service.ts` auto-links transfers → signal stores hydrate from the API. The commit itself is one transactional endpoint, not a sequence of writes.
- **Auto-categorisation**: `feature-categories/category-model.store.ts` trains via `core/ml/category-model.worker.ts` (off main thread) over transactions bounded by `core/ml/training-window.ts`; results (`categoryModel` artifact) drive per-transaction suggestions surfaced in `feature-transactions` and reviewed on `/learning`; `core/ml/rule-proposal-mining.ts` mines confident predictions into candidate `Rule`s for the rule-proposal inbox.
- **Joint accounts**: a transaction on a `joint` account is weighted by `core/stats/classify-joint-leg.ts`/`joint-account-stake.ts` using the account's `ownershipShare`/`coOwners`, unless overridden per-transaction by `Transaction.attributionOverride`; `core/categorisation/co-owner-contribution.ts` attributes a leg to a specific co-owner by IBAN.
