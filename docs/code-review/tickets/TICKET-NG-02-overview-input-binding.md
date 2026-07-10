# TICKET-NG-02 — Bind transactions filters via `input()` instead of route snapshot

- **Area:** Angular patterns (Transactions)
- **Type:** Refactor
- **Traceability:** CR-7.2, FR-STAT-6 (drill-down pre-filtering)

## User story

As a developer, I want `TransactionsOverviewComponent` to bind `from`/`to`/`categoryId`/`accountId` via `input()` instead of reading `route.snapshot.queryParamMap`, so it's less code and reacts to same-route navigations with new params.

## Description

`TransactionsOverviewComponent` reads its drill-down pre-filters from `route.snapshot.queryParamMap` once at construction. Switch to component `input()` bindings (with `withComponentInputBinding()`), so the component is smaller and reacts when a new drill-down navigates to the same route with different query params.

## Current situation (as-is)

- [transactions-overview.component.ts:117](../../../src/app/feature-transactions/components/transactions-overview/transactions-overview.component.ts) injects `ActivatedRoute` and reads `this.route.snapshot.queryParamMap` once into `initialQueryParams`, then seeds the `filterForm` from `.get(STAT_QUERY_PARAMS.accountId/from/to/categoryId)`.
- Because it's a `snapshot` read taken at construction, a second drill-down to the already-active transactions route (e.g. a different category from the dashboard) does **not** re-seed the filters — the component instance is reused and the snapshot is stale.

## Desired result (to-be)

- The component exposes `accountId`, `from`, `to`, and `categoryId` as `input()`s bound from the matching query params via the router's component-input binding.
- Query-param changes on same-route navigations flow into the filter form, so a new drill-down re-applies its pre-filter without a full component teardown.
- `ActivatedRoute` and the `snapshot.queryParamMap` read are removed from this component.

## Acceptance criteria

- [x] `withComponentInputBinding()` is enabled on the router config (if not already) so route query params map to component inputs.
- [x] `TransactionsOverviewComponent` declares `accountId`/`from`/`to`/`categoryId` `input()`s (keyed to `STAT_QUERY_PARAMS`) and no longer injects `ActivatedRoute` or reads `snapshot.queryParamMap`.
- [x] Initial drill-down still pre-filters exactly as today (FR-STAT-6): landing from Dashboard/Categories with query params seeds account/date/category filters.
- [x] A same-route navigation with different query params (e.g. dashboard drill-down for category A then category B) re-applies the new pre-filter without needing a route reload.
- [x] Free-text/amount filters (not URL-backed) and the debounced-text + structural-filter pipeline (CR-2.4/CR-2.3) are unaffected.
- [x] Unit tests cover: inputs seed the form on init, and a change to the `categoryId` input re-seeds the filter. Existing transactions-overview specs still pass.
- [x] Verified live in the browser: two consecutive drill-downs to different categories both land pre-filtered; deep-link URL still works on first load.

## Notes

- Watch the interaction with the URL-mirroring effect in [app.ts:80](../../../src/app/app.ts) and CR-7.3 (NG-03) — inputs read params, the app-level effect writes `from`/`to`/`groupBy`; make sure re-seeding from inputs doesn't fight the mirror.
- `STAT_QUERY_PARAMS` stays the single source of param key names.
