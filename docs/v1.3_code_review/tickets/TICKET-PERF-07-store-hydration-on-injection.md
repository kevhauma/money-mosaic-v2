# TICKET-PERF-07 — Move store hydration onto first injection (bundle split)

- **Area:** Performance (bundle splitting, startup)
- **Type:** Refactor
- **Traceability:** CR-5.1, re-ticketed out of [TICKET-PERF-05](./TICKET-PERF-05-hydrate-on-demand.md) per that ticket's own fallback note (2026-07-15) — CR-3.4 shipped there, this is the remainder

## User story

As a user, I want a lazy route's feature code (and the stores/repositories/services it alone
needs) to land in that route's own JS chunk, so visiting `/dashboard` doesn't pull `ImportService`,
`RulesEngineService`, and every other feature store's dependency graph into the initial bundle.

## Description

[TICKET-PERF-05](./TICKET-PERF-05-hydrate-on-demand.md) shipped CR-3.4 (non-blocking bootstrap for
`TransactionsStore`/`TransfersStore`, a `hydrated` signal, UI gating) but explicitly did **not**
move hydration onto first injection for any of the 11 stores — `app.config.ts`'s central
initializer still `inject()`s and awaits all of them, which is what pulls every store (and
everything each one imports) into the initial bundle regardless of which route is visited first.

That on-injection model was attempted during PERF-05 and abandoned for this ticket instead: a
spike found it would silently corrupt a large share of the existing store spec suite. Nearly every
`*.store.spec.ts` file follows the pattern `TestBed.inject(SomeStore); someStore.addMany(...)`
(or `patchState` directly) with **no** `.hydrate()` call, relying on the store never fetching on
its own. An unconditional `onInit`-triggered hydrate races that pattern: the store's own fetch
(against a mock that usually resolves `[]`) resolves at the test's next `await` and silently wipes
the manually-seeded entities before assertions run. Roughly 15+ spec files were affected across
`core/state`, `feature-categories`, `feature-import`, and `feature-dashboard`.

## Current situation (as-is)

- [app.config.ts](../../../src/app/app.config.ts) — the initializer still injects and (mostly)
  awaits all 11 stores; only `TransactionsStore`/`TransfersStore`/`CategoryModelStore` are
  fire-and-forget (TICKET-PERF-05).
- None of the 11 stores hydrate themselves on construction — `hydrate()` is a plain method callers
  invoke explicitly.
- **2026-07-15 update (complete):** all 11 stores now self-hydrate on first injection (see
  Progress below). `app.config.ts`'s initializer is down to `appDb.open()` + the dev-seed hook —
  no store is `inject()`ed there at all anymore.

## Desired result (to-be)

- Each store hydrates itself the first time it's injected (an `onInit`-triggered load or similar),
  so a lazy route pulls in only its own stores' data and code.
- The initializer shrinks further, ideally to just `appDb.open()` + the dev-seed hook.
- The existing spec suite is updated file-by-file (not worked around) so `TestBed.inject(Store)`
  either tolerates the store's own auto-hydrate (e.g. by seeding through the mocked repository and
  awaiting `hydrate()`/`hydrated()` before asserting) or the auto-hydrate is scoped so tests can
  opt out cleanly — decide and document the pattern before converting the first store, then apply
  it consistently.

## Acceptance criteria

- [x] Every store's spec file that currently does `inject + addMany` without hydrating is
      converted to the new pattern (or the auto-hydrate is proven not to race it) — full `ng test`
      green, not a subset. **Done:** the remaining 7-store DI-cascade cluster
      (`TransactionsStore`, `TransferSettingsStore`, `TransfersStore`, `CategoriesStore`,
      `RulesStore`, `AccountsStore`, `CategoryModelStore`) converted store-by-store leaf-first per
      the decided pattern below. Every spec across `core/state`, `feature-categories`,
      `feature-transactions`, and `feature-dashboard` that raced the new auto-hydrate was found via
      the actual `ng test` failures each store's conversion produced and fixed — either by moving
      repository-mock seeding before `TestBed.inject(Store)` (the common case) or, where a test
      specifically asserted a pre-hydration timing window that the DI cascade made unobservable
      (`RulesStore`'s counterparty-rule backfill test, the `dataReady`/`AccountsStore` partial-
      hydration test), restructuring it with deferred/controllable mock promises instead of
      deleting the assertion. `ng test` → 118 files / 934 tests green (full suite, not a subset).
- [x] Landing on `/dashboard` hydrates only the stores the dashboard consumes; navigating to
      `/import` then hydrates its stores (`MappingProfilesStore`, `ImportBatchesStore`) on first
      injection, not at bootstrap. **Shipped** for all 11 stores now — see Progress.
- [x] Bundle analysis (`ng build --configuration development` chunk listing) confirms
      import-only code (`ImportService`, `MappingProfilesStore`, `ImportBatchesStore`) no longer
      ships in the initial chunk. **Now also true for `RulesEngineService`/`CategoryModelService`/
      the ML worker**: `RulesStore` and `CategoryModelStore` both moved to on-injection hydration
      this pass, so nothing eagerly injects them from `app.config.ts` anymore. Verified via
      `ng build --configuration development --verbose`: `worker-YCOHDBNT.js` (category-model-worker)
      and `worker-ZFCQCP22.js` (csv-parse-worker) both list under "Lazy chunk files", not "Initial
      chunk files"; grepping the 5 initial-chunk JS files for `RulesEngineService`,
      `CategoryModelService`, `MappingProfilesStore`, `ImportBatchesStore` finds none (one
      unrelated substring hit for `ImportService` was a leftover JSDoc comment string, not an
      import).
- [x] No visible regression on any route entered directly by URL (dashboard, transactions with
      query params, accounts detail, categories, learning, import) — live browser check for each,
      2026-07-15. Every route renders correctly with no console errors once reached via in-app
      navigation (direct-URL entry hits the pre-existing `app.ts` redirect bug noted below,
      unrelated to this change). Also specifically checked the two dashboard-settings stores' and
      the three newly-converted entity stores' hydration-flash risk: **the conventions-reviewer
      subagent caught a real gap** — `AccountsStore`, `CategoriesStore`, and `RulesStore` moved off
      the blocking initializer without gaining a `hydrated: Signal<boolean>` the way
      `TransactionsStore`/`TransfersStore` already had, so `/accounts`, `/categories`, and
      `/categories/rules` could flash their "no data yet — add one" empty-state CTA during the
      on-injection hydration window before the real list arrived. Fixed: added
      `withState({ hydrated: false })` + `{ hydrated: true }` on the hydrate patchState to all
      three (matching the established `TransactionsStore`/`TransfersStore` pattern from
      TICKET-PERF-05), and gated `accounts-overview`/`categories-overview`/`rules-overview`'s
      top-level empty-state check behind `!store.hydrated()` → `<mm-loading-skeleton>` first. Added
      a regression test per component (pending-promise repository mock, asserts the skeleton shows
      and the empty-state text does not) — `ng test` green after the fix, live-browser reverified.
      **Unrelated pre-existing bug found in passing** (not caused by this change, `app.ts`
      untouched): a full page reload/typed-URL entry to any route without matching `from`/`to`
      query params bounces to `/dashboard` due to a `router.navigate([], {...})` call missing
      `relativeTo` in `app.ts`'s range-mirroring effect — flagged separately, not fixed here.
- [x] Dev seed's ordering contract still holds under construction-triggered hydration — **verified**:
      `dev-seed.service.ts`'s own constructor now injects (and thus construction-hydrates) all four
      stores it touches (`AccountsStore`, `TransactionsStore`, `TransfersStore`, `CategoriesStore`);
      its `seedIfEmpty()` still explicitly awaits each store's *initial* hydrate before writing, then
      force-refreshes the three it mutates afterward — `AccountsStore.hydrate()` gained the same
      `{ force?: boolean }` option `TransactionsStore`/`TransfersStore` already had (needed once its
      `hydrate()` became idempotent/cached; previously it always re-fetched). Class doc comment
      updated to describe the new self-hydration ordering. `dev-seed.service.spec.ts` passes
      unmodified; live-browser dashboard/accounts checks against the already-seeded dev database
      confirmed correct rendering throughout every conversion step (a from-empty-IndexedDB re-seed
      run was not exercised live — the destructive "clear all IndexedDB databases" action needed to
      force one was declined by the environment's safety classifier as an unscoped destructive
      action; the unit-level contract is covered by `dev-seed.service.spec.ts`).
- [x] Verified via the coding-conventions skill (conventions-reviewer subagent, 2026-07-15). Found
      one Medium issue (the `hydrated`-signal gap above, fixed) and two Low/Info nits (a one-sentence
      comment-consistency gap in `TransferSettingsStore`'s `onInit`, and a repeated inline
      `store.status() !== 'untrained'` guard in `CategoryModelStore` worth factoring into a
      `stillUntrained()` helper) — both applied. **Fallow could not run**: the CLI's `git diff`
      invocation isn't supported by this repo's git version (2.22.0.windows.1, from 2019) —
      `--changed-since` fails with git's own `usage: git diff [...]` error regardless of the base
      ref given. Environment limitation, not addressed here.

## Progress (2026-07-15)

Landed store-by-store per this ticket's own fallback clause, starting with the 4 stores that have
**no store-to-store dependencies** (unlike the `Accounts`/`Transactions`/`Transfers`/`Categories`/
`Rules`/`CategoryModel`/`TransferSettings` cluster PERF-05's Notes describe — that DI cascade is
still the reason the remaining 7 stay bootstrapped centrally):

- `MappingProfilesStore`, `ImportBatchesStore` (feature-import) — the exact `/import` example this
  ticket's acceptance criteria named.
- `CategoryComparisonSettingsStore`, `DashboardLayoutSettingsStore` (feature-dashboard settings) —
  first-injected by `dashboard-overview.component.ts` at the same lazy boundary.

Each gained an idempotent `hydrate()` (cached promise, matching `TransactionsStore`/`TransfersStore`'s
existing PERF-05 pattern) fired via `withHooks({ onInit(store) { void store.hydrate(); } })`, and was
removed from `app.config.ts`'s central initializer. `MappingProfilesStore.detectTemplateForFile` also
awaits its own `hydrate()` first, since it reads `profiles()` synchronously and — unlike the two
settings stores' UI reads — a stale-empty read here would silently degrade bank-template
auto-detection rather than just show a brief visual default.

**Why these 4 first:** their specs already seed entities through the mocked repository's return
value (or don't touch entities at all), never via a synchronous `addMany`/`patchState` call outside
`hydrate()` — so none hit the corruption race PERF-05's abandoned attempt found. Full `ng test`,
`ng lint`, and `ng build --configuration development` all pass. Added 9 new tests (2-3 per store):
"hydrates on first injection without a caller invoking `hydrate()`" and "idempotent: double
injection + repeated calls only fetch once" for all 4, plus one confirming
`detectTemplateForFile` awaits the on-injection hydrate before matching — closing the coverage gap
the conventions review flagged (917 → 926 tests).

## Progress (2026-07-15, part 2 — DI-cascade cluster, ticket complete)

Converted the remaining 7 stores leaf-first per the DI graph documented in the Spec-conversion
pattern section above: `TransactionsStore`, `TransferSettingsStore` (both leaves) →
`TransfersStore` → `CategoriesStore`, `RulesStore` → `AccountsStore` → `CategoryModelStore` (last —
depends on all three of Categories/Transactions/Rules). After each store's conversion, `ng test`
was run to find every spec the new auto-hydrate raced, fixed immediately, then re-run to green
before moving to the next store — never batching multiple stores' spec fixes together.

**Idempotency prerequisite:** `CategoriesStore`, `RulesStore`, `TransferSettingsStore`,
`AccountsStore`, and `CategoryModelStore` all had plain non-cached `hydrate()` methods (every call
re-fetched); each gained the same `let hydration: Promise<void> | null = null` cached-promise guard
`TransactionsStore`/`TransfersStore` already used, before wiring `withHooks({ onInit })`.
`AccountsStore.hydrate()` additionally gained the `{ force?: boolean }` re-fetch option the other
two already had, needed once `dev-seed.service.ts`'s post-write refresh could no longer rely on it
always re-fetching (see the dev-seed acceptance criterion above).

**Spec fixes, by shape of the race:**
- Most failures were the pattern the decided section above anticipated: a spec called
  `TestBed.inject(SomeStore); someStore.addMany(...)` (in its own spec or as a dependency-store seed
  in another store's spec, e.g. `accounts.store.spec.ts` seeding `TransactionsStore`) — fixed by
  moving the seed to `repository.getAll.mockResolvedValue([...])` **before** `TestBed.inject`, then
  `await store.hydrate()`. Affected: `transactions.store.spec.ts`, `transfers.store.spec.ts`,
  `accounts.store.spec.ts`, `transactions-overview.component.spec.ts`.
- One shape the decided pattern hadn't anticipated: component specs providing a `CategoriesRepository`
  mock with only `add` stubbed (no `getAll`) — safe when `CategoriesStore` was never
  auto-hydrated, a `TypeError: categoriesRepository.getAll is not a function` once it was. Fixed by
  adding `getAll: vi.fn().mockResolvedValue([])` to the mock in
  `category-breakdown-panel`/`category-comparison-panel`/`top-transactions-panel`/`trend-chart-panel`'s
  specs.
- Two tests asserted a *pre-hydration timing window* that the DI cascade made physically
  unobservable once fixed (constructing a dependent store now also fires the dependency's own
  onInit hydrate at the same instant): `rules.store.spec.ts`'s counterparty-rule-backfill test
  (injecting `RulesStore` transitively constructs `TransactionsStore`, whose hydrate settles by the
  time the test's own `await store.hydrate()` for rules returns) and
  `accounts.store.spec.ts`'s `dataReady` partial-hydration test (both `TransactionsStore` and
  `TransfersStore` fire at the same `AccountsStore` construction instant, so a single `await`
  flushes both). Per the decided pattern's rule 5, these weren't deleted — the first was reframed to
  drop the now-stale "not hydrated yet" premise while keeping the functional assertion (`runRules`
  still awaits hydration correctly); the second was restructured with deferred/controllable mock
  promises (`new Promise((resolve) => { resolveTransactions = resolve; })`) so each dependency's
  settlement could be driven independently again.

**A genuine new race, not a test artifact:** converting `CategoryModelStore` exposed a real
production bug. Its `hydrate()` used to run once, fully, before any route rendered (app-bootstrap
fire-and-forget); now it runs lazily on first injection, so a user can click "Train" (feature-
learning's `model-status` panel) while `hydrate()` is still mid-flight loading a *stale* persisted
model. Without a guard, whichever finishes last wins — `hydrate()` resolving after `train()` would
silently clobber a fresh training result's `'ready'` status back to the stale artifact's
`'ready'`/`'stale'`/`'untrained'`, and could load the old model into the ML worker *after* a new one
was just trained. Fixed with a `stillUntrained()` check re-tested after every `await` boundary
inside `hydrate()` (`train()` moves `status` off `'untrained'` synchronously as its first action,
before its own first `await`, so the check is race-free) — `hydrate()` backs off entirely once
`train()` has claimed the store. Added a dedicated regression test
(`category-model.store.spec.ts`: "a concurrent train() while the on-injection hydrate is still in
flight wins") that fails without the guard.

**Conventions review (2026-07-15) caught a real gap this pass introduced:** `AccountsStore`,
`CategoriesStore`, `RulesStore` moved off the blocking initializer without gaining a
`hydrated: Signal<boolean>` the way `TransactionsStore`/`TransfersStore` already had from
TICKET-PERF-05 — meaning `/accounts`, `/categories`, `/categories/rules` could flash their "no data
yet" empty-state CTA during the on-injection hydration window. Fixed by adding the same `hydrated`
signal + `<mm-loading-skeleton>` gating pattern to all three stores and their overview components,
with a regression test per component. See the "No visible regression" acceptance criterion above
for detail.

**Final state:** `app.config.ts`'s `provideAppInitializer` is now just `appDb.open()` +
`isDevMode()` dev-seed dynamic import — no store is injected there at all. All 11 stores
self-hydrate via `withHooks({ onInit })` the first time any route/component injects them. `ng lint`
clean; `ng test` → 118 files / 934 tests green; `ng build --configuration development` confirms
`RulesEngineService`/`CategoryModelService`/the ML worker/import-only code all excluded from the
initial chunk.

## Spec-conversion pattern (decided 2026-07-15, before converting the remaining 7-store cluster)

The race: `TestBed.inject(SomeStore)` constructs the store, and an unconditional `onInit` hook
fires `hydrate()` synchronously at that point — its repository call resolves later, on a
microtask. Many specs across the 15+ affected files seed a store (often a *dependency* store, not
even the one under test — e.g. `accounts.store.spec.ts` calling
`TestBed.inject(TransactionsStore); transactionsStore.addMany([...])` before injecting
`AccountsStore`) synchronously via `addMany`/`patchState`, with no `.hydrate()` call anywhere. Once
that store self-hydrates on injection, its mocked repository (`getAll` typically defaults to
`[]`) resolves after the seed and silently wipes it via `setAllEntities([])` before assertions run.

**Decided pattern: seed exclusively through the mocked repository, never through
`addMany`/`patchState` as a stand-in for hydration.** This matches production, where `addMany` is
a post-hydration mutation method, not a seeding mechanism — so it converts tests to match reality
instead of adding a workaround (per this ticket's to-be section).

1. Configure `repository.getAll.mockResolvedValue([...])` **before** `TestBed.inject(Store)`, not
   after — `onInit` calls `repository.getAll()` synchronously (only its resolution is async), so
   ordering only matters relative to `inject`, not to any later `await`.
2. Replace seeding-via-`addMany`/`patchState` with the mock-then-inject-then-`await
   store.hydrate()` shape the 4 already-converted stores' specs use (e.g.
   [mapping-profiles.store.spec.ts](./mapping-profiles.store.spec.ts)):
   `mappingProfilesRepository.getAll.mockResolvedValue([...])` → `TestBed.inject(...)` → `await
   store.hydrate()`.
3. Dependency-store seeding follows the same rule, in dependency order: mock the dependency's
   repository and inject/await it (or let a parent store's constructor-time `inject()` cascade do
   it — same outcome, since `hydrate()` is idempotent) before asserting on the store under test.
4. Mid-test mutations stay as direct method calls (`updateTransaction`, `removeMany`,
   `archiveAccount`, …) — those run after the initial hydrate already resolved and aren't part of
   the race; only *pre-assertion seeding* is in scope for conversion.
5. Tests that deliberately probe the pre-hydration window (e.g. `AccountsStore: dataReady
   mirrors...`) keep *not* awaiting hydrate immediately — that gap is the thing under test, not a
   bug to fix.

**Prerequisite this pattern depends on:** `CategoriesStore`/`RulesStore`/`TransferSettingsStore`/
`CategoryModelStore`'s `hydrate()` methods are plain `async () => { patchState(...) }` today —
not cached/idempotent like the 4 converted stores and `TransactionsStore`/`TransfersStore`
already are. Each needs the same cached-promise guard added *before* its `onInit` hook goes in,
otherwise an explicit `await store.hydrate()` in a test (or any second injection) double-fetches
and double-patches:

```ts
let hydration: Promise<void> | null = null;
const hydrate = (): Promise<void> => {
  if (!hydration) {
    hydration = repository.getAll().then((rows) => patchState(store, setAllEntities(rows, config)));
  }
  return hydration;
};
```

Conversion order follows the DI graph leaf-first, so each store's own `onInit` hydrate is already
safe by the time a dependent store's `onInit` cascades into constructing it: `TransactionsStore`,
`TransferSettingsStore` (both leaves) → `TransfersStore` (needs both) → `CategoriesStore`,
`RulesStore` (both need only `TransactionsStore`) → `AccountsStore` (needs
Transactions/Transfers/Categories) → `CategoryModelStore` (needs
Categories/Transactions/Rules, last).

## Notes

- Read [TICKET-PERF-05](./TICKET-PERF-05-hydrate-on-demand.md)'s Notes section first — it records
  the DI-cascade analysis (injecting `AccountsStore` transitively constructs `TransactionsStore`/
  `TransfersStore`/`CategoriesStore`/`TransferSettingsStore`) that shapes how much bundle-splitting
  is actually achievable here, and the dependency graph between the 11 stores.
- `CategoryModelStore`'s `hydrate()` still awaits `categoriesStore.hydrate()` /
  `transactionsStore.hydrate()` / `rulesStore.hydrate()` internally, even though those three now
  also self-hydrate on their own first injection (which `CategoryModelStore`'s constructor-time
  `inject()` calls already trigger) — **kept deliberately, not simplified away.** Removing it would
  mean `activeTaxonomySignature()`/`refreshSuggestions()` read those stores' entities the instant
  they're *constructed* rather than the instant they're *hydrated*, which are no longer the same
  moment once hydration is async-on-injection; the explicit await is what makes that gap safe.
- Largest-risk ticket in this backlog, same caveat as its predecessor: if the spec-suite conversion
  proves too invasive in one sitting, land it store-by-store rather than all 11 at once. **In the
  event, the remaining 7-store cluster converted cleanly in one sitting** once the spec pattern was
  decided up front — the DI-cascade risk PERF-05's abandoned attempt hit materialized as ordinary,
  fixable `ng test` failures (found and fixed store-by-store, never batched) rather than the
  widespread silent corruption that attempt described, plus one genuine new production race
  (`CategoryModelStore.hydrate()` vs. `train()`) and one real UI-regression gap
  (`hydrated`-signal parity for `AccountsStore`/`CategoriesStore`/`RulesStore`), both caught and
  fixed before landing — see Progress part 2 for both.
