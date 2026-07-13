# TICKET-STAT-14 — Customizable dashboard layout (reorder, hide/unhide rows)

- **Area:** Statistics & Dashboard
- **Type:** Feature
- **Traceability:** extends [dashboard-layout.md](../dashboard-layout.md); no existing FR-STAT covers layout personalization

## User story

As a user, I want to reorder and hide/unhide the panels on my Dashboard, so the page leads with the numbers I actually care about instead of a fixed, one-size-fits-all arrangement.

## Description

The Dashboard's row order today is hard-coded in the template — every user sees stats, then weekday/weekend split, then category breakdown + trend chart, and so on, in the same fixed sequence, with no way to skip a panel they don't use. This ticket adds a "Customize" mode where the user can drag rows into a new order and toggle individual rows hidden, persisted locally so the layout survives a reload.

## Current situation (as-is)

- [dashboard-overview.component.html](../../../src/app/feature-dashboard/components/dashboard-overview/dashboard-overview.component.html) renders seven content rows below the page header in a fixed, static order: (1) the primary `stats` block (income/expense/net/savings rate/spending rate, lines 7-39), (2) `app-weekday-weekend-split-panel` (lines 41-43), (3) `app-category-breakdown-panel` + `app-trend-chart-panel` in a two-column grid (lines 45-48), (4) `app-category-comparison-panel` (lines 50-52), (5) `app-top-transactions-panel` (lines 54-56), (6) `app-action-queue-panel` (lines 58-60), (7) `app-account-balance-strip` (line 62). There is no data-driven abstraction over "a row" — each is inlined directly in the template.
- No settings/preferences infrastructure exists for dashboard layout. The closest precedent is [category-comparison-settings.store.ts](../../../src/app/feature-dashboard/category-comparison-settings.store.ts) + [category-comparison-settings.repository.ts](../../../src/app/core/data-access/category-comparison-settings.repository.ts), a singleton-row Dexie table (`categoryComparisonSettings: 'id'`, added in [app-db.ts:597](../../../src/app/core/data-access/app-db.ts)) with a `get()`/setter repository and a signal store that hydrates on load — that exact shape (table → repository → store) is the pattern to replicate for layout preferences rather than inventing a new persistence mechanism.
- No drag-and-drop library is installed (`@angular/cdk` is not a dependency of this project — confirmed absent from `package.json`). [TICKET-ACC-04](../../v1.1_joint_accounts/tickets/TICKET-ACC-04-manual-account-ordering.md) deliberately chose move-up/move-down buttons over `@angular/cdk` for account reordering specifically to avoid adding the dependency; this ticket is the first to actually need drag interaction and is the natural place to introduce `@angular/cdk`'s Drag & Drop module.
- Some rows already self-hide based on data (e.g. `app-action-queue-panel` hides a card when its count is zero; the year-over-year sub-labels hide when there's no valid prior-year data). User-driven row hiding must compose with this existing conditional rendering, not replace it.

## Desired result (to-be)

- A `dashboardLayoutSettings` singleton-row Dexie table (additive `.version(9)`, no upgrade needed — same shape as `categoryComparisonSettings`) stores `rowOrder: DashboardRowId[]` and `hiddenRowIds: DashboardRowId[]`, where `DashboardRowId` is a fixed union of the seven rows listed above (e.g. `'stats' | 'weekday-weekend' | 'category-breakdown-trend' | 'category-comparison' | 'top-transactions' | 'action-queue' | 'account-balance'`).
- A `DashboardLayoutSettingsRepository` (core/data-access) exposes `get()` (falling back to today's default order with nothing hidden) and setters for row order / hidden set, mirroring `CategoryComparisonSettingsRepository`.
- A `DashboardLayoutSettingsStore` hydrates on dashboard load and exposes `rowOrder()`, `hiddenRowIds()`, `reorderRow()`, `toggleRowHidden()`, and `resetToDefault()`, persisting every change through the repository — never a direct `appDb` write.
- `dashboard-overview.component` renders its seven rows from an ordered, filtered list driven by the store instead of a static template sequence — visible rows in `rowOrder()` order, minus anything in `hiddenRowIds()` — while each row's own internal layout (e.g. the two-column breakdown/trend grid) is unchanged.
- A "Customize dashboard" toggle in the page header switches the Dashboard into an edit mode where each row shows a drag handle (`cdkDragHandle`, via `@angular/cdk`'s `DragDropModule`/`cdkDropList`/`cdkDrag`) and a hide/show control (eye icon); dragging reorders rows live, persisting on drop.
- Every draggable row also exposes keyboard-accessible move-up/move-down controls alongside the drag handle (not drag-only), consistent with the accessibility reasoning in TICKET-ACC-04.
- A "Reset to default layout" action in customize mode restores the original row order and unhides everything.
- The `@angular/cdk` Drag & Drop module is only loaded when customize mode is actually entered (e.g. via a deferrable `@defer (on interaction)` block on the customize-mode UI), so the base Dashboard bundle for users who never open customize mode doesn't pay for it — no `angular.json` budget increase should be needed as a result.

## Acceptance criteria

- [ ] `DashboardLayoutSettings` type + `DEFAULT_DASHBOARD_LAYOUT_SETTINGS` (full default row order, nothing hidden) added alongside the other settings types in `core/data-access`.
- [ ] `appDb` gains the `dashboardLayoutSettings: 'id'` table via a new additive `.version(9).stores(...)` block (previous version blocks untouched, no `.upgrade()` needed since it's a brand-new empty table).
- [ ] `DashboardLayoutSettingsRepository` and `DashboardLayoutSettingsStore` added following the `CategoryComparisonSettingsRepository`/`CategoryComparisonSettingsStore` shape; components/stores never touch `appDb.dashboardLayoutSettings` directly.
- [ ] Dashboard rows render in `rowOrder()` order and rows listed in `hiddenRowIds()` are omitted entirely (not just visually collapsed) from the normal (non-customize) view.
- [ ] A row's own existing conditional visibility (e.g. action-queue's zero-count cards, YoY sub-labels) still applies independently of — and in addition to — the user's hidden-row preference; hiding via customize mode never force-shows a row that would otherwise hide itself for lack of data.
- [ ] "Customize dashboard" toggle in the page header enters/exits an edit mode showing a drag handle and a hide/show (eye) control per row.
- [ ] Dragging a row via `cdkDropList`/`cdkDrag` reorders it live and persists the new order through the store/repository on drop.
- [ ] Each row also has keyboard-operable move-up/move-down controls that produce the same reorder as a drag, for users who can't or don't want to drag.
- [ ] Toggling a row's hide/show control persists immediately and is reflected the next time the Dashboard loads (survives a reload).
- [ ] "Reset to default layout" restores the original seven-row order and unhides every row, persisting that reset.
- [ ] The two-column `category-breakdown-panel`/`trend-chart-panel` row (and any other multi-component row) moves and hides as one unit — this ticket reorders/hides whole rows, not the individual panels inside a shared row.
- [ ] `@angular/cdk`'s Drag & Drop module is loaded lazily (only when customize mode is entered), verified by checking it isn't present in the eagerly-loaded Dashboard route chunk.
- [ ] `angular.json` bundle budgets are not raised; if the lazy-loaded customize-mode chunk still risks tripping a budget, that's solved by narrowing the `@defer` boundary further, not by raising the budget.
- [ ] Unit tests cover: the sort/filter that turns `rowOrder()` + `hiddenRowIds()` into a rendered row list (including the "unknown/missing row id falls back to default position" case, to stay forward-compatible if a row is added or removed in a later ticket); `reorderRow()`, `toggleRowHidden()`, and `resetToDefault()` all persist through the repository; a hidden row combined with its own zero-data self-hide doesn't double-hide or throw.
- [ ] Verified via the fallow skill and coding-conventions skill.
- [ ] Verified live in the browser: entering customize mode, dragging a row to a new position, hiding a row, reloading the page (order/hidden state persists), and resetting to default.

## Notes

- Scope is row-level reordering/hiding, not per-panel (sub-row) drag-and-drop or resizing — matches the "other customizable things" ask at a level the existing template structure supports without a larger rewrite. Per-panel-within-a-row customization (e.g. splitting the breakdown/trend row apart) is a reasonable future ticket once there's demand, not part of this one.
- This is the first ticket to introduce `@angular/cdk` to the project. Double-check the added parsed/gzip size against the `angular.json` budgets before merging; the `@defer (on interaction)` boundary around customize-mode UI is the intended mitigation per the Hard Rules in [CLAUDE.md](../../../CLAUDE.md) (lazy-load, don't raise budgets).
- Layout preferences are a single local, singleton settings row (no per-account or multi-profile layouts) — consistent with this being a local-first, single-user app today.
- If a future ticket adds/removes a dashboard row, `rowOrder()`'s "unknown id" fallback (new row appended at its default position; removed id simply ignored) keeps existing users' saved layouts from breaking — call this out in that future ticket rather than re-deriving it here.
