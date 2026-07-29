# TICKET-SET-06 — Move Data Management nav/route under Settings

- **Area:** App Settings
- **Type:** Refactor
- **Traceability:** relocates the existing FR-DAT-1/FR-DAT-2/FR-DAT-3 surface (export, import, delete-all — [v1.4 TICKET-DAT-01](../../v1.4_data_management/tickets/TICKET-DAT-01-full-data-export-import.md), [TICKET-DAT-03](../../v1.4_data_management/tickets/TICKET-DAT-03-delete-all-data.md)); no new capability, no FR change

## User story

As a user, I want data export/import/delete-all to live inside Settings rather than as its own top-level sidebar item, so the primary nav only lists the everyday workflows (Dashboard, Accounts, Transactions, Categories, Learning, Import) and infrequent app-management actions are grouped together under Settings.

## Description

`Data` currently sits as its own item in the primary sidebar nav, alongside day-to-day workflow destinations, even though export/import/delete-all are infrequent, whole-app-management actions — the same category as Settings' theme picker (and the [GitHub link ticket, TICKET-PUB-06](../tickets/TICKET-PUB-06-github-repo-link.md), if its Settings half is built). This ticket relocates the nav item and route into Settings without changing any of the underlying export/import/delete-all behaviour.

## Current situation (as-is)

- [app.routes.ts:57-61](../../../src/app/app.routes.ts) mounts `feature-data-management` as its own sibling route directly under the app shell: `path: 'data'`, alongside `dashboard`, `accounts`, `transactions`, etc.
- [app-shell.component.html:91-96](../../../src/app/core/layout/app-shell/app-shell.component.html) renders a "Data" `<li>` in the primary sidebar `<ul>` (the same list as Dashboard/Accounts/Transactions/Categories/Learning/Import), pointing at `routerLink="/data"`. Settings is deliberately pinned in a separate bottom-anchored `<ul>` ([app-shell.component.html:99-106](../../../src/app/core/layout/app-shell/app-shell.component.html)) — Data is not currently grouped with it.
- [feature-settings/settings.routes.ts](../../../src/app/feature-settings/settings.routes.ts) has a single `''` route rendering `SettingsOverviewComponent` (theme picker only) — no child routes exist yet.
- [feature-data-management/data-management.routes.ts](../../../src/app/feature-data-management/data-management.routes.ts) has a single `''` route rendering `DataManagementOverviewComponent` (export/import/delete-all) — this component itself does not need to change, only where it's mounted.
- [feature-categories/categories.routes.ts](../../../src/app/feature-categories/categories.routes.ts) already shows the established pattern for a feature exposing more than one route (`''` for the overview, `'rules'` for a sub-page) — the pattern to mirror for `settings`.

## Desired result (to-be)

- `app.routes.ts` no longer has a top-level `path: 'data'` sibling route; the app shell's primary route list is unchanged apart from removing it.
- `feature-settings/settings.routes.ts` gains a `path: 'data'` child route, lazy-loading `DATA_MANAGEMENT_ROUTES` from the `@/feature-data-management` barrel (cross-feature import via barrel, per the project's import rule) — so the existing `DataManagementOverviewComponent` now renders at `/settings/data`.
- `app-shell.component.html`'s primary sidebar `<ul>` no longer has a "Data" item; the sidebar's route count in that list drops by one.
- `settings-overview.component.html` gains a small link/section pointing into `/settings/data` (e.g. a `mm-paper` card with an icon, label, and short description — "Data — Export, import, or delete all app data"), so the feature stays discoverable from the page that now owns it.
- No change to `DataManagementOverviewComponent`'s own behaviour (export/import/delete-all logic, `DataManagementRepository` usage) — this ticket only moves where it's mounted and linked from.

## Implementation note (added 2026-07-29 by TICKET-DAT-04)

**Shipped as an embedded section, superseding the route-based criteria below.** Data management is not a sub-route of Settings: `settings-overview.component.html` renders `<app-data-management-overview />` inline, below the theme picker. There is no `/settings/data` route and no link card.

Reconstructed from history: the single implementation commit ([e142f88](../../../), 2026-07-22) never touched `settings.routes.ts` at all while ticking the two route/link criteria in the same commit — so the pivot to embedding was a decision made during implementation and the ticks were simply premature, not a later drift away from a route that once existed.

The criteria below are re-marked to describe what shipped. [TICKET-DAT-04](../../v2_code_review/tickets/TICKET-DAT-04-commit-to-embed-set06-repair.md) ratified the embed as the intended design (CR4-8 Option A, with CR4-5's "Settings stays one page" decision) and deleted the leftover `data-management.routes.ts` / `DATA_MANAGEMENT_ROUTES` that the route-based plan had left behind.

## Acceptance criteria

- [x] `app.routes.ts` no longer registers a top-level `path: 'data'` route.
- [x] ~~`feature-settings/settings.routes.ts` adds a `path: 'data'` child route resolving to `DATA_MANAGEMENT_ROUTES`~~ — **superseded**: no child route was added. `DataManagementOverviewComponent` is embedded directly in `settings-overview.component.html`, imported from the `@/feature-data-management` barrel by the component rather than a route. `DATA_MANAGEMENT_ROUTES` was deleted entirely by TICKET-DAT-04.
- [x] The "Data" `<li>` is removed from `app-shell.component.html`'s primary sidebar `<ul>`; no other primary nav items are reordered or altered.
- [x] ~~`settings-overview.component.html` renders a link/card into `/settings/data`~~ — **superseded**: it renders the section itself, below the existing theme-picker section, so no link is needed.
- [x] Export, import, and delete-all continue to work unchanged at their new location (no regression in `DataManagementRepository` calls or dialogs).
- [x] Unit tests cover: `app-shell` no longer rendering a "Data" nav item; `settings-overview` rendering the embedded `app-data-management-overview` (`settings-overview.component.spec.ts`); and, since TICKET-DAT-04, that `/data` no longer resolves (`app.routes.spec.ts`). The `settings.routes.ts` child-route assertion is void with the route.
- [x] Verified via the fallow skill and coding-conventions skill.
- [ ] Verified live in the browser: sidebar no longer shows a separate "Data" item; `/settings` shows the embedded data-management section with export/import/delete-all all still functioning; a direct visit to the old `/data` URL no longer resolves — **still open**: TICKET-DAT-04 re-attempted this and the user asked to skip live browser verification for that whole ticket batch. What *is* verified automatically: `app.routes.spec.ts` shows `/data` rejects with Angular's "Cannot match any routes" (no wildcard route exists, so the navigation fails rather than redirecting), and the two component specs above cover the sidebar and the embed.

## Notes

- Purely a navigation/routing relocation — no Dexie schema change, no new repository or store, no behavioural change to export/import/delete-all.
- Independent of the other Settings-track tickets (SET-02/03/04/05, PRIV-01) and of [TICKET-PUB-06](./TICKET-PUB-06-github-repo-link.md) — no build-order dependency either way, though it pairs naturally with PUB-06's optional Settings "About" section if both land around the same time (both add a small secondary section below the theme picker).
- If a future ticket restructures Settings into multiple sub-pages more broadly (theme, data, about, etc.) this ticket's `settings.routes.ts` child-route pattern is the one to extend — no further routing rework should be needed.
