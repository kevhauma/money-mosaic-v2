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

- [ ] Landing on `/dashboard` hydrates only the stores the dashboard consumes (assert via spies in a spec, or a hydration log in dev); navigating to `/import` then hydrates its stores on first injection.
- [ ] No visible regression on any route entered directly by URL (dashboard, transactions with query params, accounts detail, categories, learning, import) — live browser check for each, watching for flash-of-empty-state regressions.
- [ ] The dev seed (TICKET-DEV-01) still runs once, after `appDb.open()`, before any store reads stale emptiness — its ordering contract is specced.
- [ ] `commitImport`/`runAutoLink`/stats flows behave identically when their stores hydrated lazily (existing orchestrator-store specs from TICKET-TEST-01 pass; add a case entering the flow with a not-yet-hydrated dependency).
- [ ] Unit tests cover: double-injection hydrates once; `hydrated` transitions false→true; a method called pre-hydration either awaits it or operates correctly on the hydrated result.
- [ ] Verified via the fallow skill and coding-conventions skill.

## Notes

- Largest-risk ticket in this backlog — the global "everything is loaded" invariant is load-bearing in subtle places. Do it **after** TICKET-SOLID-05 (store relocation) so the moved files aren't rebased mid-flight, and keep TICKET-TEST-01's orchestrator specs green as the safety net.
- If a full on-injection model proves too invasive in one sitting, the recorded fallback is CR-3.4 alone (route-level hydration guards), with CR-5.1 re-ticketed.
