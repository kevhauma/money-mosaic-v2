# TICKET-STAT-22 — Empty dashboard state directing to Import

- **Area:** Dashboard
- **Type:** Feature
- **Traceability:** new capability; no existing FR-STAT-* covers a no-data state. Related first-impression gap already called out (but not fixed) by [TICKET-PUB-01](./TICKET-PUB-01-home-landing-page.md)'s Description: "the root route redirects straight into the Dashboard, which is meaningless (and, on a first run, empty) without context."

## User story

As a first-time user with no imported transactions yet, I want the Dashboard to tell me there's nothing to show and point me straight at the Import page, so I'm not staring at a wall of blank stat cards and empty charts with no idea what to do next.

## Description

Adds a dedicated empty-state view on the Dashboard for the case where the user has zero transactions, replacing the stat cards/chart panels (which currently just render zeroes/blank) with a single message and a call-to-action button routing to `/import`.

## Current situation (as-is)

- [dashboard-overview.component.html](../../../src/app/feature-dashboard/components/dashboard-overview/dashboard-overview.component.html) has no no-data branch: once `statsStore.dataReady()` is `true`, it always renders the row switch (`stats`, `weekday-weekend`, `category-breakdown-trend`, `category-comparison`, `top-transactions`, `action-queue`, `account-balance`) from [dashboard-overview.component.ts:63-68](../../../src/app/feature-dashboard/components/dashboard-overview/dashboard-overview.component.ts) — on an empty database this renders stat cards showing `€0.00` and chart panels with nothing to plot, not a helpful message.
- [transactions.store.ts](../../../src/app/core/state/transactions.store.ts) exposes `hydrated` (state) and `transactions` (an entities-computed signal, line 55) that together already answer "is the user's transaction set empty" (`hydrated() && transactions().length === 0`) — nothing on the Dashboard reads it today.
- A reusable `mm-empty-state` component already exists at [empty-state.component.ts](../../../src/app/shared/ui/empty-state/empty-state.component.ts) (`title` required input, optional `message`, `[icon]`/`[action]` content projections) and is already used the same way on other empty overview pages, e.g. [accounts-overview.component.html:26-32](../../../src/app/feature-accounts/components/accounts-overview/accounts-overview.component.html) ("No accounts yet" + an `ng-icon` + a call-to-action `mm-button`) — this ticket follows that exact established pattern rather than inventing a new one.
- The Import feature is routed at `path: 'import'` in [app.routes.ts:44-45](../../../src/app/app.routes.ts), lazy-loaded via `@/feature-import`.

## Desired result (to-be)

- `dashboard-overview.component.ts` injects `TransactionsStore` and exposes a computed, e.g. `hasNoTransactions = computed(() => this.transactionsStore.hydrated() && this.transactionsStore.transactions().length === 0)`.
- `dashboard-overview.component.html` branches on this signal (once hydrated) ahead of the existing row loop: when `true`, renders `mm-empty-state` with a title like "No transactions yet", a short message explaining the Dashboard fills in once data is imported, and an `mm-button` (`[routerLink]="/import"`) reading "Import transactions"; when `false`, renders the existing `visibleRows()` row switch unchanged.
- The empty state fully replaces the stat cards/chart rows (not layered alongside zeroed-out cards) — a first-time user sees one clear message and one clear action, not seven empty-looking panels plus a small note.
- Customize mode (`customizeMode()`, TICKET-STAT-14) is not reachable while the empty state is showing, since there's nothing to reorder/hide yet — the "Customize dashboard" header button and the empty state are mutually exclusive with the row content, consistent with how the existing `@if (!customizeMode())` branch already gates row rendering.
- Once the user imports at least one transaction, the Dashboard reflects the change reactively (no reload required) since `transactions()` is a live signal off `TransactionsStore`.

## Acceptance criteria

- [x] `dashboard-overview.component.ts` computes a "no transactions" state from `TransactionsStore.hydrated()`/`transactions()`, not from `StatsStore`'s period-filtered stats (so it reflects the *entire* dataset being empty, not just the currently selected date range). (`hasNoTransactions` computed at [dashboard-overview.component.ts:67-69](../../../src/app/feature-dashboard/components/dashboard-overview/dashboard-overview.component.ts); covered by the "stays hidden for a date range with no hits" spec.)
- [x] When there are zero transactions, the Dashboard renders `mm-empty-state` (title + message + icon + CTA), following the same composition already used on [accounts-overview.component.html](../../../src/app/feature-accounts/components/accounts-overview/accounts-overview.component.html), instead of the stat-card/chart-panel rows. (Branch at [dashboard-overview.component.html:24-32](../../../src/app/feature-dashboard/components/dashboard-overview/dashboard-overview.component.html); "replaces the dashboard rows with mm-empty-state..." spec asserts no `.stat`/`app-account-balance-strip` alongside it.)
- [x] The CTA button navigates to `/import` (uses `routerLink`, not a manual navigation call). (`<mm-button ... link="/import">`, which renders an `<a [routerLink]>`; "points the call-to-action at /import via routerLink" spec asserts `href === '/import'`.)
- [x] The empty state does not show while `statsStore.dataReady()`/`transactionsStore.hydrated()` is still loading — the existing loading-skeleton path is unaffected; the empty-state check only applies once hydration has completed. (`hasNoTransactions` is gated on `transactionsStore.hydrated()`; "shows the loading skeleton rather than the empty state while transactions are still hydrating" spec, in its own un-hydrated `TestBed`.)
- [x] Once transactions exist, the normal row-based Dashboard renders as it does today — no regression to `visibleRows()`/TICKET-STAT-14 customize mode for non-empty accounts. (All pre-existing row/customize-mode specs pass after seeding one transaction; "swaps back to the row-based dashboard as soon as a transaction exists" spec.)
- [x] Unit tests cover: the empty-state branch rendering when `transactions()` is empty and `hydrated()` is true; the normal row branch rendering once transactions exist; the CTA's `routerLink` pointing at `/import`. (New `describe('empty state (TICKET-STAT-22)')` block plus the un-hydrated describe block in [dashboard-overview.component.spec.ts](../../../src/app/feature-dashboard/components/dashboard-overview/dashboard-overview.component.spec.ts); full suite run: 185 files / 1522 tests passed.)
- [ ] Verified via the fallow skill and coding-conventions skill. (`ng lint` and `ng build --configuration development` both pass; the `fallow` CLI and `conventions-reviewer` subagent calls are currently blocked by a transient tool-safety-classifier outage for the active model — not skipped, pending retry.)
- [ ] Verified live in the browser: with an empty IndexedDB (fresh profile / cleared data), open `/dashboard` and confirm the empty state renders with a working "Import transactions" link to `/import`; import a CSV and confirm the Dashboard switches to the normal stat/chart view without a manual reload.

## Notes

- Distinct from [TICKET-PUB-01](./TICKET-PUB-01-home-landing-page.md): PUB-01 handles the *first visit to the app* (root route, outside the shell, one-time via a `localStorage` flag); this ticket handles *the Dashboard specifically having no data*, which can recur any time all transactions are deleted, and renders inside the normal app shell like every other empty-state page. The two are complementary, not overlapping — a returning user who deletes all their data should still see this state on the Dashboard even though they're long past the PUB-01 landing page.
- Independent of every other v2 ticket — no schema change, no `appSettings` involvement, safe to build any time.
- Scoped to the Dashboard only, matching how `mm-empty-state` is already applied per-page (Accounts, Categories, etc.) rather than as a global app-wide concept.
