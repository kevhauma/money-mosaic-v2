# TICKET-SRV-05 — Repositories talk HTTP instead of Dexie

- **Area:** Server
- **Released in:** _unreleased_
- **Type:** Refactor
- **Traceability:** preserves the repository rule in [`CLAUDE.md`](../../../CLAUDE.md) ("components and stores never touch the database directly"); planned for v3

## User story

As a developer of this app, I want the switch from IndexedDB to the server to happen entirely inside the repository layer, so twenty-odd features, their stores and their tests carry on working without being rewritten.

## Description

Reimplements all 17 repositories in [`core/data-access/`](../../../src/app/core/data-access/) over `HttpClient` against the API from [TICKET-SRV-03](./TICKET-SRV-03-rest-api-per-entity.md) and [TICKET-SRV-04](./TICKET-SRV-04-transactional-write-endpoints.md), keeping every public method signature byte-identical. This is the pivot: after it, the app's data lives on the server.

## Current situation (as-is)

- Each repository is a thin `@Injectable({ providedIn: 'root' })` wrapper over a Dexie table. [`accounts.repository.ts`](../../../src/app/core/data-access/accounts.repository.ts) is the archetype — four arrow-function properties returning `appDb.accounts.toArray()`, `.add()`, `.update()`, `.delete()`.
- **All methods are already `async`** and return promises, which is the property that makes this swap possible at all: a network call fits the same shape a Dexie call had.
- Nine call sites outside the repositories reach for `appDb` directly to open multi-table transactions. [TICKET-SRV-04](./TICKET-SRV-04-transactional-write-endpoints.md) built the **server half** of those — the endpoints exist and are tested — but **the four client services still hold their Dexie bodies**, so this ticket rewires them alongside the repositories.

  > **Amended 2026-09-25.** This bullet originally said "by the time this ticket starts, only repositories and bootstrap touch `appDb`". SRV-04 scoped itself to the server half, correctly: calling those endpoints needs `HttpClient` and the auth interceptor from [TICKET-AUTH-02](../../auth/tickets/TICKET-AUTH-02-login-screen-session-guard.md), which is not one of its dependencies, and until _this_ ticket the app must still work with the server switched off. So the client rewiring lands here, where the point of no return is already declared. Don't start on the assumption that the services are already ported.

- The repository specs (`transactions.repository.spec.ts`, `goals.repository.spec.ts`, `app-settings.repository.spec.ts`, and six others) run against a real Dexie database through the `fake-indexeddb` polyfill in [`test-setup.ts`](../../../src/test-setup.ts), which is global because Vitest runs with `isolate: false`.
- `HttpClient` is provided by [TICKET-AUTH-02](../../auth/tickets/TICKET-AUTH-02-login-screen-session-guard.md), with the credentials and 401 interceptor already in place.

## Desired result (to-be)

- **Every repository's public surface is unchanged** — same method names, same parameters, same return types, including the `Promise<number>` that Dexie's `update` returned (the count of updated rows; the API returns the same count so callers checking it keep working).
- **A shared `ApiClient`** wraps `HttpClient` with the base path, the JSON handling, and one place to turn an error response into a thrown `Error` carrying the server's message. Repositories call it; none of them constructs a URL by hand more than once.
- **`appDb` leaves `core/data-access/` entirely** — no repository imports it. `app-db.ts` itself survives this ticket (it is deleted in [TICKET-SRV-08](./TICKET-SRV-08-retire-dexie.md)) but nothing reads from it except the migration path in [TICKET-SRV-07](./TICKET-SRV-07-migrate-local-database.md).
- **The fourteen `AppSettings` setters stay**, each sending a one-field `PATCH` to the settings endpoint. Their read-merge-put body disappears: the merge is the server's job now, which also removes the lost-update risk two tabs currently have.
- **Repository specs move off `fake-indexeddb`** onto `HttpTestingController`, asserting the request method, URL, and body for each method, and the mapping of the response back to the entity shape. The behaviour the old specs proved about Dexie semantics (upsert-by-month in `salary-metadata`, the `DEFAULT_*` fallback for an unwritten singleton, `bulkUpdateSortOrder` atomicity) is now the **server's** behaviour and is covered by SRV-03's backend tests — the client spec asserts the right call is made, not what SQLite does with it.
- **Store and component specs that stub a repository keep working untouched.** Any that reach through to a real Dexie database instead of stubbing get converted to `HttpTestingController` or a repository stub, whichever is smaller.
- **No component, store, template or feature module changes.** If one does, that is a leak in the repository abstraction and it gets fixed at the repository, not at the caller — the one exception being loading and error handling, which is [TICKET-SRV-06](./TICKET-SRV-06-bootstrap-hydration-over-network.md)'s job and deliberately out of scope here.

## Implementation notes (2026-09-29)

Five decisions taken while building this, recorded here rather than left implicit.

- **`TransfersRepository.remove` and `TransactionsRepository.bulkRemove` are deleted, not ported**,
  as [TICKET-SRV-04](./TICKET-SRV-04-transactional-write-endpoints.md)'s review asked. Both raw
  endpoints exist, and both remove rows _without_ the transfer cleanup — the orphan state SRV-04
  exists to prevent. Their only caller was `TransferCleanupService`, whose whole body is server-side
  now, so the service went with them: `core/transfers/transfer-cleanup.service.ts` is gone and its
  two result types live in [`transfer-cleanup-result.ts`](../../../src/app/core/transfers/transfer-cleanup-result.ts),
  which is what the stores still read. `api.spec.ts`'s registry lost both entries.
- **`ApiClient` sends a field set to `undefined` as `null`.** `table.update(id, { x: undefined })`
  deleted the property in Dexie, and `TransactionsStore.bulkClearCategory`, the four clearable
  `AppSettings` setters and `ForecastSettingsRepository.setScopeAccountIds` all depend on it.
  `JSON.stringify` drops an `undefined` value instead, which would turn every "clear this" into a
  patch naming no field at all. The conversion is recursive, because `bulkUpdate` carries its
  changes one level down inside `{ id, changes }`.
- **`update` resolves to 1, and a row that is not there now rejects instead of resolving 0.** Dexie
  answered the count of rows changed; the API answers 404. No caller branches on the count — checked
  at each of the eight call sites that remain, the rest having gone server-side with the operation
  services — so what changes is an error where there used to be a silent zero, which is the honest
  answer now the row lives somewhere another client can delete it.
- **`app.config.ts` imports `appDb` from its file rather than through the `core/data-access`
  barrel.** The barrel re-exports seventeen `@Injectable` repositories whose decorators esbuild
  cannot tree-shake, so reaching one `open()` through it put the whole data layer — now including
  its `HttpClient` plumbing — in the eager bundle. Same reasoning as the `AppTitleStrategy` import
  directly above it, and it is what turns this ticket's bundle line from +4 kB into **−25 kB**.
- **Component specs get an answering backend, not a stub per repository.** `provideFakeApi()`
  ([`fake-api.testing.ts`](../../../src/app/core/data-access/fake-api.testing.ts)) answers the way an
  _empty account_ would — empty lists, `{}` singletons, a create echoed back with an id — which is
  precisely the state the `appDb.<table>.clear()` hooks in those specs used to put them in. It
  replaces those hooks one for one, and `seedApi(url, body)` replaces the `put(...)` a spec seeded
  with. Repository and operation specs use `withApiTesting()` instead, because what _they_ assert is
  which request was made.

## The repository surface, as it was before this ticket

The signatures every caller was written against, read out of the seventeen repositories at
`93fb31a`. They are **unchanged** by this ticket, and
[`repository-surface.spec.ts`](../../../src/app/core/data-access/repository-surface.spec.ts) pins
each one as an exact type equality, so this list cannot go stale without a failing build.

```text
AccountsRepository / CategoriesRepository / RulesRepository / LoansRepository
  getAll(): Promise<Entity[]>              add(entity: Entity): Promise<number>
  update(id: number, changes: Partial<Entity>): Promise<number>
  remove(id: number): Promise<void>

MappingProfilesRepository    getAll, add, update  (no remove)
ImportBatchesRepository      getAll(); getById(id: number): Promise<ImportBatch | undefined>; add; remove
RecurringOverridesRepository getAll, add, remove
TransfersRepository          getAll(); getByIds(ids: number[]): Promise<Transfer[]>; add
SalaryMetadataRepository     getAll(); upsert(entry: SalaryMetadata): Promise<number>; remove
GoalsRepository              getAll, add, update, remove;
                             bulkUpdateSortOrder(updates: { id: number; sortOrder: number }[]): Promise<void>
TransactionsRepository       getAll(); count(): Promise<number>;
                             getByAccount(accountId: number): Promise<Transaction[]>;
                             update(id, changes): Promise<number>;
                             bulkUpdate(updates: { id: number; changes: Partial<Transaction> }[]): Promise<number>;
                             bulkAdd(transactions: Transaction[]): Promise<number[]>;
                             getByImportBatch(importBatchId: number): Promise<Transaction[]>;
                             getByReimbursementTransferId(transferId: number): Promise<Transaction[]>
CategoryModelRepository      get(): Promise<CategoryModelArtifact | undefined>;
                             save(artifact: CategoryModelArtifact): Promise<1>; clear(): Promise<void>;
                             getSettings(): Promise<CategoryModelSettings>;
                             setTrainingWindowYears(trainingWindowYears: number | null): Promise<number>
TransferSettingsRepository   get(): Promise<TransferSettings>;
                             update(changes: Partial<TransferSettings>): Promise<number>
CategoryComparisonSettingsRepository  get(); setExcludedCategoryIds(ids: number[]): Promise<number>
DashboardLayoutSettingsRepository     get(); setRowOrder(rowOrder: DashboardRowId[]): Promise<number>;
                                      setHiddenRowIds(hiddenRowIds: DashboardRowId[]): Promise<number>
ForecastSettingsRepository   get(); setLookbackMonths(n: number); setBasis(basis: SavingBasis);
                             setSafetyNetAmount(n: number); setMode(mode: ForecastMode);
                             setScopeAccountIds(ids: number[])            — each Promise<number>
AppSettingsRepository        get(): Promise<AppSettings>, plus fourteen setters, each Promise<number>:
                             setPrimaryColor(AccentColorId | undefined), setCurrencySymbol(string),
                             setCurrencySymbolPosition(CurrencySymbolPosition), setLocale(string),
                             setExcludedIncomeCategoryIds(number[]), setHeatmapExcludedCategoryIds(number[]),
                             setCareerStartDate(string | undefined), setSmoothedBonusCategoryIds(number[]),
                             setGrossColor(AccentColorId | undefined), setMainIncomeCategoryId(number | undefined),
                             setPrivacyMode(boolean), setFiscalYearStartMonth(number),
                             setRecentRanges(RecentRange[])
DataManagementRepository     exportAll(): Promise<AppDataExport>;
                             importAll(data: AppDataExport, mode: ImportMode): Promise<void>;
                             deleteAll(): Promise<void>

Deleted rather than ported (TICKET-SRV-04's review): TransfersRepository.remove,
TransactionsRepository.bulkRemove.
```

## Acceptance criteria

- [x] No file under `src/app/core/data-access/` imports `appDb`, except the migration helper SRV-07 adds — asserted by a test or a lint rule, not by inspection. ([`dexie-boundary.spec.ts`](../../../src/app/core/data-access/dexie-boundary.spec.ts) reads the folder with `node:fs` and asserts the **identifier** `appDb` appears in no file's code — by identifier rather than by import path, so a repository reaching it through the folder's own barrel would still fail. Comments are stripped first, since several doc comments explain what the code used to do. `app-db.ts` and its spec are the two named exemptions, and the file list is asserted non-trivial so an empty pass cannot look like a passing one. It bit on its first run, catching `data-management.repository.ts`.)
- [x] Every repository method has the same name, arity and return type it had before — asserted by comparing against the signatures recorded in this ticket, so a silent signature change is caught. (The section above is the record; [`repository-surface.spec.ts`](../../../src/app/core/data-access/repository-surface.spec.ts) is the enforcement — an exact-type-equality pin per repository, plus a runtime case per repository asserting that the methods an instance carries, and their arity, are exactly the expected set. Proven to bite: changing `AccountsRepository.remove` to `Promise<number>` fails `ng test` at build with `TS2322: Type 'true' is not assignable to type 'never'`. Reverted afterwards.)
- [x] `git diff` touches **no** file under `src/app/feature-*/` other than specs, and no file in `src/app/shared/` — the seam held, or the ticket is not done. (`git status --short | grep -E 'src/app/(feature-|shared/)' | grep -v '\.spec\.ts'` is empty. Everything outside `core/data-access/` is the four operation services SRV-04 deliberately left for this ticket, `core/transfers/`'s barrel and cleanup result types, and the one-line `appDb` import in `app.config.ts` — none of them a feature or a shared module.)
- [x] Each repository method issues exactly one request to the documented endpoint with the documented body, covered per method by `HttpTestingController`. (Eighteen spec files under `core/data-access/`, one per repository, with a case per method: `callApi(...)` invokes the method, asserts the single request's verb, URL — query string included — and body, answers it, and asserts what the repository made of the response. `withApiTesting()`'s `afterEach` verify is what makes "exactly one" an assertion rather than a hope; `GoalsRepository`'s empty reorder leans on it to prove it makes _no_ request at all.)
- [x] A 4xx/5xx response surfaces as a rejected promise carrying the server's message, not a silent `undefined`. ([`api-client.spec.ts`](../../../src/app/core/data-access/api-client.spec.ts) runs 400/404/409/500 through one case and asserts the rejection carries the server's own sentence, plus a fallback for a failure with no body. At repository level: `accounts.repository.spec.ts` (a 404 on `remove`), `categories.repository.spec.ts` (SRV-04's 409 naming the loan) and `data-management.repository.spec.ts` (the newer-schema refusal, whose wording the user is shown). The two `getOptional` paths are the deliberate exception and are asserted as such.)
- [x] `update` still resolves to the number of rows changed, and callers that branch on it (the settings setters, `bulkUpdate`) still behave the same. (Asserted per repository: `update` resolves `1`, and `bulkUpdate` resolves the endpoint's `updated` **row** count — rows, not items, so two updates naming one id count once. _Difference, deliberately: a row that no longer exists answered `0` under Dexie and is a 404 here, so it rejects rather than resolving zero. No caller branches on the count — all eight `…Repository.update(...)` call sites discard it — so nothing behaves differently except that a write against a deleted row now says so._)
- [x] The nine repository specs are converted and pass; no repository spec depends on `fake-indexeddb` any more. (All ten that existed are converted — `app-settings`, `categories`, `category-comparison-settings`, `category-model`, `data-management`, `forecast-settings`, `goals`, `loans`, `salary-metadata`, `transactions` — and the eight repositories that had no spec gained one, so every repository is now covered. None of the eighteen names `appDb`, which `dexie-boundary.spec.ts` enforces for the whole folder. `app-db.spec.ts` keeps the polyfill, because the Dexie schema is what it is about and that survives until TICKET-SRV-08.)
- [x] `ng test` is green in full, with the same test count or higher — a converted spec that quietly lost cases fails this. (**332 files, 3800 tests, all passing, and zero unhandled rejections**, against 3602 before the v3 work began. `import.service.spec.ts` kept all 29 of its cases through the rewrite of its commit and undo halves. The one unhandled rejection this ticket originally shipped with was first written up here as TICKET-SRV-06's to remove; the review pass proved otherwise — it was a single spec case missing its `await setup()`, so it ran the one `it` in its file without a fake backend. Fixed here.)
- [x] `ng build --configuration development` succeeds and the initial bundle does not grow (Dexie is still bundled at this point; it shrinks in SRV-08). The `angular.json` budgets are **not** raised. (Initial total **2.27 MB against 2.29 MB at `93fb31a`** — measured by stashing the diff and rebuilding. The app's own eager chunk goes 291.34 kB → 266.23 kB: the repositories gained HTTP code, and `app.config.ts` stopped dragging all seventeen of them into the eager bundle to reach `appDb.open()`. No budget touched.)
- [x] Verified via the fallow skill and coding-conventions skill. (Both CI gates exit 0: `fallow dead-code --baseline .fallow-baseline.json --fail-on-issues --quiet` and `fallow health --complexity --max-cognitive 30 --max-cyclomatic 30 --max-crap 1000 --fail-on-issues --quiet`. Conventions: `ApiClient` sits at the repository's tier and nothing above it touches `HttpClient`; testing helpers are `*.testing.ts`, excluded from `tsconfig.app.json`; no store, template or feature module changed; `ng lint`, `npm --prefix server run lint` and `npm --prefix server run typecheck` are clean and prettier ran over both workspaces. The `coding-conventions` and `project-map` skills were updated in this same change.)
- [ ] Verified live in the browser: with the server running, sign in and confirm every page — dashboard, transactions, accounts, categories, import, income, loans, recurring, future, explore, learning, settings — renders its data from the API. — not ticked: browser verification waived by the user for the whole v3 server/auth run. It is the one check nothing here stands in for, and it is worth more once [TICKET-SRV-06](./TICKET-SRV-06-bootstrap-hydration-over-network.md) has given an unreachable server something to say — until then an offline user gets a blank screen with console errors, by design.

## Notes

- **A settings endpoint answers `{}` for a row that was never written — keys _absent_, not present-with-`undefined`.** So the repository must keep spreading the response over its `DEFAULT_*` constant rather than returning the body straight through. This is not cosmetic: `ForecastSettingsStore` and `AppSettingsStore` derive their signal members from the seed object's **keys**, so a body missing a key produces a store missing a member — the `withState`-needs-every-key gotcha that TICKET-FUT-* hit in v2.2. Noted from TICKET-SRV-03's review, while it is cheap.

- **This ticket is the point of no return for the local-first premise.** Up to here the app still works with the server switched off; after it, it does not. That is why [TICKET-SRV-06](./TICKET-SRV-06-bootstrap-hydration-over-network.md) (what the app does when the server is unreachable) is sequenced immediately after and should not be deferred — between the two, an offline user gets a blank screen with console errors.
- **The per-method signature check earns its place.** Seventeen repositories reimplemented by hand is exactly the situation where a `Promise<void>` quietly becomes a `Promise<number>` and a caller's `if` starts always-truthing. The compiler catches most of it; the check catches the rest.
- **Expect the abstraction to leak in exactly one place: latency.** Dexie resolved in microseconds off the same thread; the API resolves over a network. Nothing in the acceptance criteria above covers perceived speed — that is SRV-06's loading states and, if the dashboard's chained reads turn out to be slow, a follow-up ticket for batching them. Do not pre-optimise it here.
- Depends on [TICKET-SRV-03](./TICKET-SRV-03-rest-api-per-entity.md), [TICKET-SRV-04](./TICKET-SRV-04-transactional-write-endpoints.md) and [TICKET-AUTH-02](../../auth/tickets/TICKET-AUTH-02-login-screen-session-guard.md).

### Review notes (2026-09-29)

Changed after the `conventions-reviewer` pass, before the commit. The reviewer confirmed the seam
held — no `feature-*` or `shared/` non-spec file changed, both new structural gates genuinely bite,
and the `undefined → null` conversion is recursive, array-safe and cannot corrupt a real `null`.
What it found:

- **A failed hydration was remembered forever.** Every store memoises `hydration` so the first
  injection starts one load and later callers await it. Against Dexie a read effectively never
  rejected, so caching the promise and caching a _success_ were the same thing — over HTTP they are
  not, and a single 500 or dropped connection would leave that store empty until sign-out, with
  `rehydrateAll()` the only thing that could clear it. `retryOnFailure` (in `core/store-reset`) now
  wraps all sixteen memoised hydrations so a rejection forgets itself on the way past. This is only
  the _retry being possible_; TICKET-SRV-06 still owns showing the failure and offering the retry —
  but it could not have been built on top of a cached rejection.
- **A 404 meaning "no such route" was read as "no such row".** `getOptional` mapped any 404 to
  `undefined`, and `notFoundHandler` answers a mistyped or unmounted path with the same status and
  the same JSON shape — so a wrong URL would have read as "this account has no trained model" for as
  long as it took somebody to wonder why a saved thing never came back. `notFound()` now carries
  `clientCode: 'row_not_found'` and `absent()` requires it, which is the rule this project already
  applies to an ambiguous 401. `getBytes` decodes its `ArrayBuffer` error body to read that code, so
  the one endpoint that most needs the distinction is not the one that cannot make it.
- **`CoOwnerContributionService.runAndPersist` was N parallel PATCHes.** It was a `Promise.all` of
  cheap local writes under Dexie; over HTTP it is one request per touched transaction, and a failure
  partway through leaves the import half-categorised with nothing saying which half. Now one
  `bulkUpdate` — the transactional endpoint that already existed for exactly this.
- **`TransfersRepository.getByIds` was dead** and only the surface spec was keeping it alive: its
  sole caller was `TransferCleanupService`, deleted by this ticket. Removed with the same reasoning
  applied to `remove` and `bulkRemove`.
- **Sixteen `appDb.<table>.clear()` calls survived in eleven component specs**, with comments about
  fake-indexeddb that this ticket made false — clearing a database nothing reads and keeping `src/**`
  specs on the Dexie polyfill for no reason. Removed, along with one assertion that checked a table
  stayed empty; it now asserts through `apiCalls()` that nothing was _written_, which is stricter.
- Two traps in the new harnesses: the fake backend answered a collection write with the seed rather
  than the echo (so a seeded collection plus a create would have resolved an id of `undefined`), and
  `failApiCall` resolved a _sentence_ when a call unexpectedly succeeded, which `toBeDefined()` would
  have passed. Both closed. The fake's 404 also now carries `row_not_found`, matching the server.

Deliberately not changed:

- **`CLAUDE.md` and `.claude/skills/data-model/SKILL.md` are now wrong, not merely dated** — most
  sharply `data-model`'s "multi-table writes go inside `appDb.transaction('rw', …)`", which is the
  rule this ticket replaced with one endpoint each. Decided with the user on 2026-09-29: both stay as
  they are until **TICKET-SRV-08**, which owns the rewrite, so the docs are corrected once rather
  than twice. **SRV-08 must cover `data-model/SKILL.md`, not just `CLAUDE.md`** — including its
  frontmatter `description`, which still sells it as the reference for the repository layer.
- The last-admin-style check-then-write concerns do not apply here, but two performance notes do, and
  both predate this ticket: `commitImport` downloads a whole account twice per import purely to build
  a fingerprint index (a local index scan before, two JSON downloads now), and the dedupe read still
  sits outside the commit transaction — a window that was microseconds and is now a round trip, so
  two tabs importing the same file can both pass dedupe. Worth a line in SRV-06/07's notes.
- `data-management.repository.spec.ts` lost two round-trip pins with no exact server-side counterpart
  (`Category.activeFrom`/`activeUntil`, and the non-indexed `appSettings` fields). The mitigation is
  `validate.ts`'s unknown-field 400: a column missing from the Drizzle schema fails loudly on import
  rather than silently dropping, which is the failure those pins guarded against.
