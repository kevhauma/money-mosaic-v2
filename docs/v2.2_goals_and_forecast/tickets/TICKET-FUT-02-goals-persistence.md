# TICKET-FUT-02 — Goals persistence: a `savingsGoals` table, its repository and store

- **Area:** Goals
- **Type:** Feature
- **Traceability:** adds **FR-FUT-2**. Rendered by
  [TICKET-FUT-04](./TICKET-FUT-04-goals-list-crud-reorder.md); consumed by
  [TICKET-FUT-05](./TICKET-FUT-05-goal-affordability-projection.md). The `forecastSettings` row it
  also creates is edited by [TICKET-FUT-06](./TICKET-FUT-06-forecast-controls.md).

## User story

As someone saving toward several things at once, I want my goals and my forecast preferences to
survive a browser reload, so the plan I set up is still there tomorrow.

## Description

Adds the persistence layer for this version: a `savingsGoals` entity table (name, target amount,
manual order, optional wanted-by date) and a `forecastSettings` singleton row (lookback window,
saving basis, safety net), each with a repository and a store. No UI.

## Current situation (as-is)

- There is no concept of a goal, a target amount, or a forecast preference anywhere in the app —
  confirmed by [competitive-analysis.md](../../v9999_ideas/competitive-analysis.md) gap #2 ("we
  track savings movements but give them no target or narrative").
- [`app-db.ts`](../../../src/app/core/data-access/app-db.ts) is at `.version(13)`
  (`salaryMetadata`). From `.version(11)` onward the file's own convention is to declare **only**
  the new or index-changed tables — the comment above `.version(11)` states this, and `.version(12)`
  (`appSettings`) and `.version(13)` are both single-table additive blocks with no `.upgrade()`.
- The two shapes to mirror already exist side by side:
  - an **entity** table with manual ordering — `categories: '++id, name, kind, archived'` with an
    optional `sortOrder` field, a plain [`CategoriesRepository`](../../../src/app/core/data-access/categories.repository.ts),
    and [`CategoriesStore`](../../../src/app/core/state/categories.store.ts) built on
    `withEntities` + `sortedBySortOrder` + `withArchivable`;
  - a **singleton settings row** — `dashboardLayoutSettings: 'id'`, whose
    [repository](../../../src/app/core/data-access/dashboard-layout-settings.repository.ts) does a
    read-merge-put per field so writing one field cannot clobber another, and whose `get()` falls
    back to an exported `DEFAULT_*` constant when the row has never been written.
- `computeReorderUpdates`/`compareBySortOrder` ([sortable.ts](../../../src/app/shared/utils/sortable.ts))
  already turn a move into the minimal set of `sortOrder` updates.

## Desired result (to-be)

- **One additive Dexie block, `.version(14)`**, declaring both new tables and nothing else:

  ```ts
  this.version(14).stores({
    savingsGoals: '++id, sortOrder',
    forecastSettings: 'id',
  });
  ```

  Both are brand-new empty tables, so no `.upgrade()` is needed — the `appSettings`/`salaryMetadata`
  precedent. Versions 1–13 are untouched.

- Entity type in `app-db.ts`, alongside `Category`:

  ```ts
  export type SavingsGoal = {
    id?: number;
    name: string;
    /** What it costs, in the app's currency. Always positive. */
    targetAmount: number;
    /** Manual funding order — goals are paid for top-down, so this drives every ETA (FUT-05). */
    sortOrder?: number;
    /** Optional "I want this by" date (ISO `YYYY-MM-DD`) — turns the ETA into on-track/behind. */
    targetDate?: string;
    note?: string;
    archived: boolean;
    /** ISO date the goal was created — the only ordering fallback before a manual order exists. */
    createdAt: string;
  };

  export type ForecastSettings = {
    id: 1;
    /** Complete months of history the velocity is measured over (FUT-01). */
    lookbackMonths: number;
    basis: SavingBasis;
    /** Cash kept aside and never spent on a goal — the emergency float. Never negative. */
    safetyNetAmount: number;
    /**
     * Accounts the forecast is allowed to consider (FUT-08). `undefined` or empty = every account,
     * which is the behaviour of every ticket before FUT-08 — declared here so the row has one
     * shape, since a non-indexed field needs no version bump either way (the CAT-10 precedent).
     */
    scopeAccountIds?: number[];
  };

  export const DEFAULT_FORECAST_SETTINGS: ForecastSettings = {
    id: 1,
    lookbackMonths: 6,
    basis: 'net-cash-flow',
    safetyNetAmount: 0,
  };
  ```

- `GoalsRepository` (`getAll`/`add`/`update`/`remove`/`bulkUpdate` for reorder) and
  `ForecastSettingsRepository` (`get` + one read-merge-put setter per field), both in
  `core/data-access/` and exported from its barrel.
- `GoalsStore` in `core/state/`, `providedIn: 'root'`, built on `withEntities` +
  `sortedBySortOrder` + `withArchivable` exactly as `CategoriesStore` is, exposing `goals`
  (ordered), `activeGoals`, `hydrated`, and methods `addGoal`/`updateGoal`/`removeGoal`/`reorder`.
  A new goal gets `sortOrder` = highest existing + 1, so it lands last rather than jumping the
  queue.
- `ForecastSettingsStore` in `core/state/`, hydrating from the repository and exposing the three
  settings plus per-field setters — defaults applied when the row does not exist yet.
- Both stores exported from [`core/state/index.ts`](../../../src/app/core/state/index.ts); both
  repositories from [`core/data-access/index.ts`](../../../src/app/core/data-access/index.ts).
- Data management (export/import/wipe) picks up the two new tables so a backup is still complete —
  see [`data-management.repository.ts`](../../../src/app/core/data-access/data-management.repository.ts).

## Acceptance criteria

- [ ] `.version(14)` adds `savingsGoals` and `forecastSettings` and **only** those two tables;
      no shipped version block (1–13) is edited, and no `.upgrade()` is added.
- [ ] `SavingsGoal` and `ForecastSettings`/`DEFAULT_FORECAST_SETTINGS` are exported from
      `app-db.ts` and re-exported by the `core/data-access` barrel.
- [ ] `GoalsRepository` covers add/update/remove/getAll plus a bulk `sortOrder` write for reorder;
      `ForecastSettingsRepository.get()` returns `DEFAULT_FORECAST_SETTINGS` when the row is absent,
      and each setter read-merge-puts so it cannot clobber the other two fields.
- [ ] `GoalsStore` exposes goals ordered by `sortOrder` (goals without one sorting last, then by
      `createdAt`), and a newly added goal receives the next `sortOrder` rather than `undefined`.
- [ ] `GoalsStore.reorder` persists via `computeReorderUpdates` through the repository, never a
      direct `appDb.savingsGoals` write from a component or store method body.
- [ ] `ForecastSettingsStore` hydrates from the repository and each setter persists; an unwritten
      row reads as the defaults (6 months, `net-cash-flow`, safety net 0).
- [ ] Both new tables are included in the data-management export, import and wipe paths, and the
      round trip restores goals with their order intact.
- [ ] All persistence goes through the repositories — no component or store touches `appDb` tables
      directly.
- [ ] Unit tests cover: the `.version(14)` schema being present and versions 1–13 unchanged;
      repository CRUD; settings fallback to defaults and per-field read-merge-put; store ordering
      including the no-`sortOrder` fallback; next-`sortOrder` on add; reorder persistence; and the
      data-management round trip.
- [ ] `ng lint` + `ng test` + `ng build --configuration development` all pass; `angular.json`
      budgets untouched.
- [ ] Verified via the fallow skill and coding-conventions skill.

## Notes

- **Why a table and not `appSettings`.** Goals are an unbounded list of user-created rows with an
  order — the definition of an entity table. `forecastSettings` *could* have been three more fields
  on `appSettings`, but `appSettings` is the portable app-wide row (currency, locale, privacy) and
  these three are one feature's parameters; keeping them separate matches
  `categoryComparisonSettings`/`dashboardLayoutSettings`, which made the same call.
- **Why `forecastSettings` is persisted while chart options are not.** `ChartOptionsStore`
  ([chart-options.store.ts](../../../src/app/core/state/chart-options.store.ts)) is deliberately
  in-memory, because a hidden series surviving a restart reads as the app being broken. These three
  are inputs to a figure the user will act on — a forecast that silently reset to a 6-month window
  every reload would be worse, not safer. The reversal is intentional and scoped to this row.
- `archived` is carried from the start rather than added later: a reached goal that the user wants
  out of the list but not deleted is the obvious next request, and `withArchivable` already exists.
  No UI for it ships in FUT-04 — the field simply isn't set yet.
- The `SavingBasis` type is FUT-01's; `app-db.ts` imports it from `@/core/stats` (a type-only
  import, so no runtime dependency from data-access to stats). If that direction is rejected by the
  conventions review, inline the union in `app-db.ts` and have FUT-01 import it back the other way.
