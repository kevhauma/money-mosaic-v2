# TICKET-PERF-05 — Hydrate stores on demand instead of all upfront

- **Area:** Performance (startup, store hydration)
- **Type:** Refactor
- **Traceability:** CR-3.4 + CR-5.1 (carried over from the first review, still open — re-verified 2026-07-14)

## User story

As a user opening the app, I want the landing route interactive after loading only the data it needs, so startup time tracks the dashboard's needs instead of the whole database.

## Description

An app initializer opens Dexie and hydrates **eleven** stores in sequence-then-parallel before the app renders — every route pays for every store. CR-3.4 proposed hydrating only what the landing route needs; CR-5.1 refines it to stores hydrating on first injection so the wiring lives with each store instead of a central list that must be maintained.

## Current situation (as-is)

- [app.config.ts:44-60](../../../src/app/app.config.ts) — the initializer chain: `appDb.open()` → `Promise.all([...10 hydrates])` → `categoryModelStore.hydrate()` → dev-seed.
- Every store exposes a `hydrate()` designed for exactly this central call.

## Desired result (to-be)

- Each store self-hydrates on first injection (e.g. a `withHydration` store feature or an `onInit`-triggered load guarded by a `hydrated` signal), so a lazy route pulls in only its stores' data.
- Consumers that render before data arrives get a defined loading state: each store exposes `hydrated: Signal<boolean>` and components/guards handle the brief false window (most already render empty states).
- The initializer shrinks to `appDb.open()` + the dev-seed hook; the eleven-store list is deleted.
- Cross-store expectations are made explicit: flows that assume another store is loaded (e.g. transfers auto-link reading transactions, dashboard stats reading several stores) must await/react to `hydrated` rather than relying on the old global barrier.

## Acceptance criteria

- [ ] ~~Landing on `/dashboard` hydrates only the stores the dashboard consumes (assert via spies in a spec, or a hydration log in dev); navigating to `/import` then hydrates its stores on first injection.~~ **Not delivered here — see Notes.** Re-ticketed as [TICKET-PERF-07](./TICKET-PERF-07-store-hydration-on-injection.md).
- [x] No visible regression on any route entered directly by URL (dashboard, transactions with query params, accounts detail, categories, learning, import) — live browser check for each, watching for flash-of-empty-state regressions.
- [x] The dev seed (TICKET-DEV-01) still runs once, after `appDb.open()`, before any store reads stale emptiness — its ordering contract is specced.
- [x] `commitImport`/`runAutoLink`/stats flows behave identically when their stores hydrated lazily (existing orchestrator-store specs from TICKET-TEST-01 pass; add a case entering the flow with a not-yet-hydrated dependency).
- [x] Unit tests cover: double-injection hydrates once; `hydrated` transitions false→true; a method called pre-hydration either awaits it or operates correctly on the hydrated result.
- [x] Verified via the fallow skill and coding-conventions skill.

## Notes

- Largest-risk ticket in this backlog — the global "everything is loaded" invariant is load-bearing in subtle places. Do it **after** TICKET-SOLID-05 (store relocation) so the moved files aren't rebased mid-flight, and keep TICKET-TEST-01's orchestrator specs green as the safety net.
- If a full on-injection model proves too invasive in one sitting, the recorded fallback is CR-3.4 alone (route-level hydration guards), with CR-5.1 re-ticketed.
- **2026-07-15 — fallback taken.** A full on-injection model (each store self-hydrating via an `onInit` hook the first time it's injected) was attempted and abandoned: nearly every `*.store.spec.ts` file follows the pattern `TestBed.inject(SomeStore); someStore.addMany(...)` with no `.hydrate()` call, relying on the store never fetching on its own. An unconditional auto-hydrate races that pattern — the store's own fetch (against a mock that usually resolves `[]`) resolves at the test's next `await` and silently wipes the manually-seeded entities before assertions run. This affected 15+ spec files across `core/state`, `feature-categories`, `feature-import`, and `feature-dashboard`, which is "too invasive in one sitting" per the fallback clause above. Implemented CR-3.4 instead: `TransactionsStore`/`TransfersStore` (the two tables large enough to matter, per the original review text) hydrate in the background without blocking the app initializer, each exposes `hydrated: Signal<boolean>`, and the flows that read them synchronously (`TransfersStore.runAutoLink`, `ImportBatchesStore.commitImport`/`undoImport`, `CategoriesStore.removeCategory`, `RulesStore.runRules`, `CategoryModelStore.hydrate`) await that `hydrated` state (idempotent, so cheap once already true) instead of assuming the old global barrier. UI views that would otherwise show a misleading "no data" during the brief hydration window (`transactions-overview`, dashboard stat cards/category-breakdown/top-transactions/action-queue panels, `net-worth-header`, `accounts-overview`/`accounts-detail` balance figures) gate on a `dataReady`/`hydrated` signal with a new `mm-loading-skeleton` primitive. CR-5.1 (bundle-splitting via on-injection hydration) is re-ticketed as [TICKET-PERF-07](./TICKET-PERF-07-store-hydration-on-injection.md), which should also own converting the affected spec files.
- Residual, deliberately not gated (acceptable brief flash, judged lower-visibility than the items above): `category-comparison-panel` (whole card may briefly read as "not enough history"), `weekday-weekend-split-panel` (card briefly absent), the sidebar's uncategorised-count nav badge, and chart panels (trend chart, net-worth history, account balance chart — these self-correct reactively with no misleading text, just a flat-then-jumps redraw).
