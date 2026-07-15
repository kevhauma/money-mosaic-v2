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
      green, not a subset.
- [ ] Landing on `/dashboard` hydrates only the stores the dashboard consumes (assert via spies in
      a spec, or a hydration log in dev); navigating to `/import` then hydrates its stores (
      `MappingProfilesStore`, `ImportBatchesStore`) on first injection, not at bootstrap.
- [ ] Bundle analysis (or `ng build --configuration development` chunk listing) confirms
      import/categories-only code (`ImportService`, `RulesEngineService`, `CategoryModelService`,
      the ML worker) no longer ships in the initial chunk.
- [ ] No visible regression on any route entered directly by URL (dashboard, transactions with
      query params, accounts detail, categories, learning, import) — live browser check for each.
- [ ] Dev seed's ordering contract (categories hydrated before its `categoryIdByName` read,
      accounts/transactions/transfers force-refreshed after writing) still holds under
      construction-triggered hydration — re-verify the sequencing TICKET-PERF-05 documented in
      `dev-seed.service.ts` still can't race.
- [ ] Verified via the fallow skill and coding-conventions skill.

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
