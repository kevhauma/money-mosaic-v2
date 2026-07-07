# TICKET-NG-03 — Skip redundant navigations in the URL-mirroring effect

- **Area:** Angular patterns (App shell / routing)
- **Type:** Refactor
- **Traceability:** CR-7.3, FR-STAT-7 (range/grouping deep-linking)
- **Source story:** code-review/user-stories.md §7 — *"As a developer, I want the URL-mirroring effect to skip navigating when params already match the current snapshot, so it can't ping-pong or schedule redundant navigations right after the initial read-in."*

## Description

The app-shell effect that mirrors range/grouping state into the URL calls `router.navigate(...)` unconditionally whenever the signals change — including right after it reads the initial params in at construction. Guard it so it only navigates when the target params actually differ from the current URL.

## Current situation (as-is)

- [app.ts:80](../../../src/app/app.ts): the constructor first reads `from`/`to`/`groupBy` from `route.snapshot.queryParamMap` and pushes them into `RangeStore`, then an `effect()` reads those same store signals back and calls `router.navigate([], { queryParams, queryParamsHandling: 'merge', replaceUrl: true })`.
- On the initial read-in the effect fires and navigates to params that already match the URL — a redundant navigation. Any later state change navigates even when the resulting query string is unchanged.

## Desired result (to-be)

- The effect compares its computed `queryParams` against the current route snapshot (`route.snapshot.queryParamMap`) and returns early — skipping `router.navigate` — when they already match.
- The initial mirror after read-in is a no-op; only genuine range/grouping changes trigger a navigation.

## Acceptance criteria

- [x] The URL-mirroring effect in `app.ts` skips `router.navigate` when the computed `from`/`to`/`groupBy` already equal the current `route.snapshot.queryParamMap` values.
- [x] Deep-linking (FR-STAT-7) still works: loading a URL with `from`/`to`/`groupBy` hydrates `RangeStore` and does **not** immediately re-navigate.
- [x] Changing the range or grouping still updates the URL exactly once per change (still `replaceUrl: true`, `queryParamsHandling: 'merge'`).
- [x] No navigation ping-pong with the transactions input-binding work (NG-02) or `RangeStore` updates.
- [x] Unit tests cover: no navigation when params already match, and one navigation when `groupBy` changes. Existing app specs still pass.
- [x] Verified live in the browser: changing range/grouping updates the URL; a hard reload of a deep-linked URL doesn't cause a redundant history/navigation churn (no console warnings).

## Notes

- Comparison must account for value formatting (e.g. `groupBy` enum, ISO date strings) so an equal-but-differently-typed value isn't treated as a change.
- Keep `replaceUrl: true` so range tweaks don't spam browser history.
