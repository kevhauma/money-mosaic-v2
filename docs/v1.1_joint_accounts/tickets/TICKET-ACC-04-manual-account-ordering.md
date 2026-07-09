# TICKET-ACC-04 — Manual account ordering

- **Area:** Accounts
- **Type:** Feature
- **Traceability:** extends FR-ACC-1; display order also drives the net-worth chart (FR-STAT-1)
- **Source story:** user-stories.md §1 — *"As a user, I want to reorder my accounts, so the accounts overview page and its net-worth chart reflect the order that matters to me instead of import order."*

## Description

Let the user choose the display order of their accounts instead of being stuck with Dexie insertion order. The order should apply everywhere `AccountsStore` is read in list form — the accounts overview grid and the net-worth history chart's legend/stack order — with no extra per-component wiring.

## Current situation (as-is)

- `AccountsStore` ([accounts.store.ts](../../../src/app/feature-accounts/accounts.store.ts)) populates `accounts`/`activeAccounts` via `setAllEntities(await accountsRepository.getAll(), accountConfig)`, with no sort. `accounts-overview.component.ts`'s `visibleAccounts` only filters archived vs. all — no sort either. Order is whatever Dexie's `toArray()` returns: effectively insertion/primary-key order.
- `Account` ([app-db.ts](../../../src/app/core/data-access/app-db.ts)) has no `sortOrder`/`position` field; schema is `accounts: '++id, name, type, archived'`.
- `accounts-overview.component.html` renders `app-net-worth-history-chart` above a card grid, both in the same unsorted order. The chart ([net-worth-history-chart.component.ts](../../../src/app/feature-accounts/components/net-worth-history-chart/net-worth-history-chart.component.ts)) is a stacked-area chart with **one band per `activeAccounts()`**, and its legend is built directly from `accounts.map(a => a.name)` — so today's account order *is* the chart's legend/stack order.
- No drag-and-drop library exists in the app (no `@angular/cdk` dependency) — no existing reorder pattern to reuse.

## Desired result (to-be)

- `Account` gains an optional, non-indexed `sortOrder?: number` field — additive, same pattern as v1.4's `Category.smoothAnnually`, no Dexie version bump.
- `AccountsStore`'s `accounts`/`activeAccounts` computed sort by `sortOrder` ascending, with accounts missing a `sortOrder` sorting after those that have one, in stable `id` order as a fallback — so existing data (nothing has `sortOrder` yet) renders exactly as today until the user reorders.
- `accounts-overview.component` gets move-up/move-down controls on each account card, persisting the new order immediately through `AccountsRepository` (never a direct `appDb` write).
- The net-worth chart needs **no chart-specific changes** — it already iterates `accounts()` directly, so the new order flows through automatically.

## Acceptance criteria

- [ ] `Account` gains an optional `sortOrder?: number` field (no Dexie schema version bump).
- [ ] `AccountsStore` exposes `accounts`/`activeAccounts` sorted by `sortOrder` ascending; accounts without a `sortOrder` sort after those with one, in stable `id` order.
- [ ] `accounts-overview.component.html` offers a way to move an account up/down in the grid; the change persists through `AccountsRepository`.
- [ ] The net-worth-history-chart's legend and stack order (and any other consumer reading `AccountsStore.accounts()`/`activeAccounts()`) reflects the new order with no additional per-component changes.
- [ ] Reordering has no effect on balances, net worth totals, or any FR-STAT figure — display order only.
- [ ] Unit tests cover the sort computed, including the "some accounts have no `sortOrder` yet" case, without TestBed, per the pure-logic testing convention.
- [ ] `angular.json` bundle budgets are not raised.
- [ ] Verified live in the browser: reordering accounts on `/accounts` persists across a page reload and is reflected in the net-worth chart's legend order.

## Notes

- Prefer move-up/move-down buttons over a drag-and-drop library — no `@angular/cdk` in the project today, so buttons keep the bundle smaller and stay keyboard-accessible by default without extra work. A full drag interaction is a reasonable follow-up if this feels clunky in practice (see "Considered, not ticketed yet" in user-stories.md).
- Existing accounts get `sortOrder` backfilled lazily (e.g. assigned on first reorder) rather than via a Dexie upgrade migration — the field is additive, so no data transform is required.
- Share the sort-by-`sortOrder`-with-fallback comparator with [TICKET-CAT-03](./TICKET-CAT-03-manual-category-ordering.md) if a natural common spot exists (e.g. `shared/utils`) rather than duplicating it.
