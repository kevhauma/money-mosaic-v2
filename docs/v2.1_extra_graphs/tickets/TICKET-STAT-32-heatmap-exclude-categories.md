# TICKET-STAT-32 — Exclude categories from the spending heatmap

- **Area:** Dashboard
- **Type:** Feature
- **Traceability:** extends **FR-STAT-15** ([TICKET-STAT-29](./TICKET-STAT-29-spending-heatmap-panel.md)); mirrors the exclusion control the category period comparison panel already offers for FR-STAT-8 ([TICKET-STAT-04](../../v1.3_dashboard_insights/tickets/TICKET-STAT-04-category-period-comparison.md)).

## User story

As someone whose rent dwarfs everything else, I want to exclude categories from the spending heatmap, so the colour scale is set by the spending I'm actually studying instead of by one fixed cost that lands on the same day every month.

## Description

Adds an "Exclude categories" checklist to the heatmap panel — the same control, in the same place, as the category period comparison panel's — and drops the excluded categories out of the heatmap entirely.

## Current situation (as-is)

- [category-comparison-panel.component.html](../../../src/app/feature-dashboard/components/category-comparison-panel/category-comparison-panel.component.html) already has the pattern: an `mm-dropdown` in the panel header with a checkbox per active expense category and a count beside the trigger, backed by `excludableCategories`/`toggleExcluded` on its component and persisted through [`CategoryComparisonSettingsStore`](../../../src/app/feature-dashboard/category-comparison-settings.store.ts) → its own `categoryComparisonSettings` singleton table.
- The heatmap panel has no such control: `computeCategoryCycleHeatmap` ranks every expense category in range, so one dominant fixed cost takes a row *and* sets `maxAmount`, which is what the colour ramp is scaled against — every other category's cells wash out to near-empty.
- The newer convention for a preference like this is a field on the already-shipped `appSettings` singleton (`excludedIncomeCategoryIds`, `smoothedBonusCategoryIds`, `mainIncomeCategoryId` — all additive, non-indexed, no version bump), not a table of its own; `categoryComparisonSettings` predates `appSettings` existing.
- `Other` folds everything outside the top N *plus* uncategorised spend, so "excluded" must mean **dropped**, not "moved into Other" — otherwise excluding rent would leave its €950 in the grid under a different label and change nothing.

## Desired result (to-be)

- New additive `appSettings` field `heatmapExcludedCategoryIds: number[] | undefined` (no schema version bump, same reasoning as `excludedIncomeCategoryIds`), with `AppSettingsRepository.setHeatmapExcludedCategoryIds` and `AppSettingsStore.setHeatmapExcludedCategoryIds` following those fields exactly.
- `computeCategoryCycleHeatmap` takes an `excludedCategoryIds: ReadonlySet<number>` and skips those transactions outright — before ranking, before the `Other` fold, and before `maxAmount`. An excluded category's spend appears nowhere in the grid and does not influence the colour scale.
- The panel header gains the same `mm-dropdown` checklist as the comparison panel: one row per active **expense** category, a `(n)` count on the trigger when anything is excluded, hidden entirely when there are no expense categories to exclude.
- Excluding every category leaves nothing to plot, which the panel already handles — `hasSpend()` goes false and the row self-hides.
- Exclusions are per-panel: this list is deliberately *not* shared with the category period comparison panel's, since "not interesting to compare period-over-period" and "drowning out the heatmap's colour scale" are different judgements about different charts.

> **Implementation note, 2026-08-06 — the checklist was extracted, not copied.** The to-be below
> describes adding "the same `mm-dropdown` checklist as the comparison panel" to the heatmap. Copying
> it produced a 23-line duplicate that `fallow dupes` flagged immediately, so the control is now one
> shared component,
> [app-category-exclusion-dropdown](../../../src/app/feature-dashboard/components/category-exclusion-dropdown/category-exclusion-dropdown.component.ts),
> and **both** panels render it. It owns the checklist and the toggle arithmetic; each panel still
> owns its own persistence, which keeps the two exclusion lists separate exactly as specified. This
> touches already-shipped code (the comparison panel), which is deliberate: extracting on the second
> use is cheaper than a third copy, and it dropped both templates' complexity as a side effect.

## Acceptance criteria

- [x] `appSettings` gains `heatmapExcludedCategoryIds` as an additive optional field — no `.version()` bump, no new table, no `.upgrade()`; written only through `AppSettingsRepository`/`AppSettingsStore`, never `appDb.appSettings` from the component. ([app-db.ts](../../../src/app/core/data-access/app-db.ts) field + `DEFAULT_APP_SETTINGS` entry, `git diff` shows no `.version(...)` change; `setHeatmapExcludedCategoryIds` on [app-settings.repository.ts](../../../src/app/core/data-access/app-settings.repository.ts) (read-merge-put) and [app-settings.store.ts](../../../src/app/core/state/app-settings.store.ts). The panel calls the store; no `appDb` reference exists in either component. The export/import round-trip spec in `data-management.repository.spec.ts` now carries the field too.)
- [x] `computeCategoryCycleHeatmap` accepts the excluded set and skips those transactions entirely: they take no row, land in no `Other` cell, and do not raise `maxAmount`. (Skipped in `accumulateCellTotals` and filtered out of the ranking; specs "drops an excluded category from the rows, the cells and the colour scale" (asserts `maxAmount` falls from 900 to 40) and "does not fold an excluded category into Other — that would leave the same money in the grid".)
- [x] The panel header renders the exclusion dropdown with a checkbox per active expense category and a count on the trigger, matching the comparison panel's markup and placement; it is absent when there are no expense categories. (Shared `app-category-exclusion-dropdown`, same markup and same header position as the comparison panel's; panel spec "renders the shared exclusion checklist with every active expense category", and the component's own spec covers the active-expense-only filter and the no-categories case.)
- [x] Toggling a category updates the heatmap immediately and survives a reload. (Panel spec "ticking a category in the checklist writes the whole set through AppSettingsStore" drives a real checkbox `change` event; "drops an excluded category from the grid and rescales the colours" asserts the recompute. Persistence is the `appSettings` row, hydrated on first injection like every other setting — the reload half is structural, and the export/import round-trip spec proves the field is stored.)
- [x] The heatmap's exclusions are independent of the category period comparison panel's — changing one leaves the other's set alone. (Two different stores and two different rows: `AppSettingsStore.heatmapExcludedCategoryIds` vs. `CategoryComparisonSettingsStore.excludedCategoryIds`. The shared dropdown deliberately takes the set as an input and emits the next one rather than persisting anything itself, which is what keeps them apart.)
- [x] With every category excluded, the panel self-hides rather than rendering an empty grid. (Aggregate spec "leaves nothing to plot when every spending category is excluded" and panel spec "self-hides when everything is excluded", which asserts the rendered panel is empty.)
- [x] Unit tests cover: an excluded category's spend absent from rows, cells and `maxAmount`; an excluded category *not* falling into `Other`; an empty/`undefined` exclusion list behaving exactly as before; the store/repository round-trip; the panel's dropdown rendering, count, and toggle wiring. (All named cases exist across [category-cycle-heatmap.spec.ts](../../../src/app/core/stats/category-cycle-heatmap.spec.ts)'s new `describe('computeCategoryCycleHeatmap: excluded categories (TICKET-STAT-32)')` — including "behaves exactly as before for an empty exclusion set", which asserts deep equality against the default-argument call — plus the panel's four cases and the shared component's six.)
- [x] `ng lint` + `ng test` + `ng build --configuration development` all pass. (`verifier` subagent, final run: lint clean; **234 test files / 2392 tests, 2391 passed**; dev build clean. The extraction was re-run through the dashboard suite too: 12 files / 119 tests green. The one failure is a known load-dependent flake in `feature-import`'s wizard spec — a fixed 350 ms wall-clock sleep — which passes on an isolated re-run and touches no dashboard code.)
- [x] Verified via the fallow skill and coding-conventions skill. (`fallow audit --base HEAD` first reported **1 duplication group** — the copied 23-line checklist — which is what prompted the extraction above; it now reports **0 dead code, 0 duplication**, and the heatmap template's cognitive complexity fell from 18 to 10 with the component class no longer flagged at all.)
- [ ] Verified live in the browser: excluding the dominant category rescales the heatmap's colours and drops its row; the choice survives a reload; the comparison panel's own exclusions are unaffected. **Open — blocked, not skipped:** the Browser pane stopped being displayed, so the page never composites frames and the panel's `@defer (on viewport)` trigger never fires. Covered by the component specs above in the meantime.

## Notes

- **Why `appSettings` rather than a `heatmapSettings` table.** The v1.6 income settings established the cheaper convention for exactly this shape (a list of category ids), and it needs no schema version. Copying `categoryComparisonSettings`' table-per-panel would add a fourth singleton table for one array.
- Categories offered are active expense categories only — an income category has nothing to contribute to an expense heatmap, and an archived one shouldn't reappear in a checklist.
- Independent of [TICKET-STAT-31](./TICKET-STAT-31-heatmap-cycles-fit-the-range.md); the two touch different parts of the panel.
