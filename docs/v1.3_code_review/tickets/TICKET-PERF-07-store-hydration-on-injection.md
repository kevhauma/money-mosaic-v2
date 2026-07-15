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
- **2026-07-15 update:** 4 of the 11 stores now self-hydrate on injection (see Progress below); the
  initializer only still blocks bootstrap on the remaining 7 (`AccountsStore`, `TransferSettingsStore`,
  `CategoriesStore`, `RulesStore`, plus `TransactionsStore`/`TransfersStore`/`CategoryModelStore`
  fire-and-forget per PERF-05).

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

- [ ] Every store's spec file that currently does `inject + addMany` without hydrating is
      converted to the new pattern (or the auto-hydrate is proven not to race it) — full `ng test`
      green, not a subset. **Partial:** the 4 stores converted so far (see Progress) needed no spec
      changes — none of their specs manually seed entities via `addMany`/`patchState` before an
      `await`, so the race this criterion is guarding against doesn't apply to them. The 15+
      affected spec files (`core/state`, `feature-categories`, `feature-import` batch/transaction
      mirroring, `feature-dashboard`) belong to the remaining 7-store cluster and are still open.
- [x] Landing on `/dashboard` hydrates only the stores the dashboard consumes; navigating to
      `/import` then hydrates its stores (`MappingProfilesStore`, `ImportBatchesStore`) on first
      injection, not at bootstrap. **Shipped** for these two stores plus
      `CategoryComparisonSettingsStore`/`DashboardLayoutSettingsStore` (dashboard-only settings) —
      see Progress.
- [x] Bundle analysis (`ng build --configuration development` chunk listing) confirms
      import-only code (`ImportService`, `MappingProfilesStore`, `ImportBatchesStore`) no longer
      ships in the initial chunk. **Not yet true for `RulesEngineService`/`CategoryModelService`/the
      ML worker** — `RulesStore` (unconverted, still eagerly bootstrapped) already depends on
      `RulesEngineService`/`CoOwnerContributionService`, so they remain in the initial bundle until
      `RulesStore` itself moves to on-injection hydration (part of the remaining 7-store work).
- [x] No visible regression on any route entered directly by URL (dashboard, transactions with
      query params, accounts detail, categories, learning, import) — live browser check for each,
      2026-07-15. Every route renders correctly with no console errors once reached via in-app
      navigation. Also specifically checked the two dashboard-settings stores' hydration-flash risk
      the conventions review flagged: customized a non-default dashboard row order, hid a row, and
      excluded a category from the comparison panel, then hard-reloaded — settings round-tripped
      correctly with no lost/reverted state and no console errors (the reload lands the render
      after IndexedDB's fetch resolves, too fast for this manual check to isolate a single-frame
      flash either way, but the state itself is never corrupted). **Unrelated pre-existing bug found
      in passing** (not caused by this change, `app.ts` untouched): a full page reload/typed-URL
      entry to any route without matching `from`/`to` query params bounces to `/dashboard` due to a
      `router.navigate([], {...})` call missing `relativeTo` in `app.ts`'s range-mirroring effect —
      flagged separately, not fixed here.
- [ ] Dev seed's ordering contract still holds under construction-triggered hydration — **not
      re-verified**; the dev seed (`dev-seed.service.ts`) doesn't touch any of the 4 stores
      converted so far (only `AccountsStore`/`TransactionsStore`/`TransfersStore`/`CategoriesStore`),
      so this criterion is unaffected by this pass and stays open for the remaining cluster.
- [x] Verified via the coding-conventions skill (conventions-reviewer subagent, 2026-07-15, no
      findings). **Fallow could not run**: the CLI's `git diff` invocation isn't supported by this
      repo's git version (2.22.0.windows.1, from 2019) — `--changed-since` fails with git's own
      `usage: git diff [...]` error regardless of the base ref given. Environment limitation, not
      addressed here.

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

**Remaining scope** (not attempted this pass — the DI-cascade cluster PERF-05's Notes flagged as the
real risk): `AccountsStore`, `TransactionsStore`, `TransfersStore`, `TransferSettingsStore`,
`CategoriesStore`, `RulesStore`, `CategoryModelStore`. These have the cross-store `inject()` calls
that transitively construct each other, and their specs are the 15+ files that follow the
`inject + addMany` pattern this ticket's first acceptance criterion is about. That conversion —
deciding the spec pattern, converting file-by-file, and re-verifying the dev-seed ordering contract
— is still open.

## Notes

- Read [TICKET-PERF-05](./TICKET-PERF-05-hydrate-on-demand.md)'s Notes section first — it records
  the DI-cascade analysis (injecting `AccountsStore` transitively constructs `TransactionsStore`/
  `TransfersStore`/`CategoriesStore`/`TransferSettingsStore`) that shapes how much bundle-splitting
  is actually achievable here, and the dependency graph between the 11 stores.
- `CategoryModelStore`'s `hydrate()` already awaits `categoriesStore.hydrate()` /
  `transactionsStore.hydrate()` / `rulesStore.hydrate()` internally (TICKET-PERF-05) — if those
  three also move to on-injection, that internal chaining likely becomes redundant and can be
  simplified.
- Largest-risk ticket in this backlog, same caveat as its predecessor: if the spec-suite conversion
  proves too invasive in one sitting, land it store-by-store rather than all 11 at once.
