# TICKET-EXP-07 — Spending mosaic: a treemap of category groups → categories

- **Area:** Explore
- **Type:** Feature
- **Traceability:** adds **FR-EXP-4**. Graduated 2026-08-07 from this version's "Considered, not
  ticketed yet", where it was named the cheapest replacement should
  [TICKET-EXP-05](./TICKET-EXP-05-3d-spending-landscape.md)'s kill criteria fire — they did
  (EXP-05 closed won't-do at its feasibility gate; FR-EXP-3 retired undelivered). Consumes
  FR-STAT-3's breakdown via `computeCategoryBreakdown`.

## User story

As someone who thinks in proportions, I want my spending laid out as a mosaic — big tiles for big
groups, subdivided into their categories — so I can see at a glance what dominates a period and
what's a rounding error, in the picture the app is named after.

## Description

Adds the Explore page's replacement showpiece: an ECharts treemap of the range's expenses, one
level of category groups subdividing into category tiles, area-true (a tile twice as big is twice
the money), with ECharts' native drill-down and breadcrumb. Ships inside core ECharts — no new
dependency, no bundle risk, none of EXP-05's feasibility hazards.

## Current situation (as-is)

- [TICKET-EXP-05](./TICKET-EXP-05-3d-spending-landscape.md) is closed won't-do (`echarts-gl`
  cannot resolve against ECharts 6 / zrender 6 strict `exports`), so the Explore page has no
  showpiece section; its named alternatives were this treemap and an isometric SVG landscape.
- Composition views today: the Dashboard's category breakdown pie (flat categories, FR-STAT-3)
  and the Sankey's destination level ([money-flow-graph.ts](../../../src/app/core/stats/money-flow-graph.ts)),
  whose ribbon widths are honest but not *area-comparable at a glance*. Nothing shows groups and
  categories nested in one proportional picture.
- [computeCategoryBreakdown](../../../src/app/core/stats/category-breakdown.ts) already delivers
  per-category expense totals + shares for a range, every decision routed through
  `classifyForStats`, refund-clamped (TICKET-STAT-11). It carries no `Category.group` structure.
- [echarts-setup.ts](../../../src/app/shared/echarts/echarts-setup.ts) registers
  `PieChart, BarChart, LineChart, HeatmapChart, SankeyChart` — no `TreemapChart`.

## Desired result (to-be)

- New pure `core/stats/spending-mosaic.ts`:
  ```ts
  computeSpendingMosaic(expenseByCategory, categoriesById): MosaicNode[]
  ```
  a fold of `computeCategoryBreakdown().expenseByCategory` into a two-level tree — group nodes
  holding their categories' tiles, categories without a `group` as top-level tiles, uncategorised
  as its own explicitly-labelled tile. **It consumes the breakdown rather than re-classifying**,
  so the mosaic and the pie can never disagree about a total — the sum of leaves equals the sum of
  the breakdown's entries by construction.
- `TreemapChart` registered once in the shared [echarts-setup.ts](../../../src/app/shared/echarts/echarts-setup.ts)
  alongside `SankeyChart`, same reasoning recorded in the file's comment (echarts lives only in
  lazy chunks; the production `initial` budget is untouched).
- New `app-spending-mosaic-panel` under `feature-explore/components/spending-mosaic-panel/`,
  `OnPush`, option built by a pure exported `buildSpendingMosaicOption` (the
  `buildMoneyFlowChartOption` precedent), rendered on `/explore` as its own section.
- Reads the Explore range (`rangeStore.from('explore')`/`to('explore')`) and
  `TransactionsStore`/`CategoriesStore`/`AccountsStore` from `@/core/state` — this chart *does*
  follow the range, unlike the recurring section.
- Tiles: label = name + share of expenses; leaf colour from `Category.color`, uncategorised from
  the neutral fallback, group tiles styled from their children; amounts in tooltips via
  `formatCurrency()`, masked under privacy mode (the
  [TICKET-EXP-04](./TICKET-EXP-04-sankey-tooltips-drilldown-privacy.md) treatment).
- ECharts' built-in drill-down: clicking a group zooms into its categories, the breadcrumb
  navigates back — no custom state, nothing in `ChartOptionsStore`.
- No expenses in range → the section renders nothing (EXP-01's page empty state covers
  no-data-anywhere).
- A visually-hidden figure table lists group → category = amount + share per
  [TICKET-STAT-20](../../v1.3_code_review/tickets/TICKET-STAT-20-trend-chart-accessible-numbers.md),
  `role="img"` + descriptive `aria-label` on the canvas host.

## Acceptance criteria

- [ ] `computeSpendingMosaic` is a pure function fed from `computeCategoryBreakdown` output (no
      re-classification — `classifyForStats` does not appear in the file), exported from
      [core/stats/index.ts](../../../src/app/core/stats/index.ts); the summed leaf values equal
      the summed breakdown entries, asserted in a spec.
- [ ] Grouped categories nest under their group tile; ungrouped categories are top-level tiles;
      uncategorised expenses get their own labelled tile, never folded into a group.
- [ ] `TreemapChart` is registered in the shared echarts setup and nowhere else;
      `angular.json` budgets unchanged; the production `initial` bundle does not grow.
- [ ] The panel renders on `/explore`, reacts to the Explore range, and renders nothing when the
      range holds no expenses.
- [ ] Clicking a group drills into it and the breadcrumb returns; tile labels show name + share;
      tooltips show `formatCurrency()` amounts and mask under privacy mode.
- [ ] The sr-only figure table mirrors every tile's group, name, amount and share; the chart host
      carries `role="img"` with a descriptive label.
- [ ] Unit tests cover: the tree fold (grouped, ungrouped, uncategorised, empty); the
      leaf-sum-equals-breakdown-sum property; the option builder keying tiles and colours
      correctly; panel render/empty/range-reaction; privacy masking.
- [ ] `ng lint` + `ng test` + `ng build --configuration development` all pass.
- [ ] Verified via the fallow skill and coding-conventions skill.
- [ ] Verified live in the browser: the mosaic renders on `/explore` with real data, tile areas
      visibly match the Dashboard pie's proportions for the same range, and group drill-down
      works.

## Notes

- **Answering the objection that parked it.** The "Considered" entry noted this shows the same
  composition as the pie and the Sankey's destination level, in a third form. What earns its
  place: it is the only *hierarchical, area-true* view — groups and their categories in one
  proportional picture, where the pie is flat and capped by legibility and Sankey ribbons are
  read by width, not area. With EXP-05 dead, it is also the page's showpiece at zero dependency
  cost — and the app is literally named after it.
- Expenses only, deliberately — income composition is the pie's `incomeBySource` half and the
  Sankey's level 0; a mixed-sign treemap has no honest area semantics.
- The isometric SVG landscape named in EXP-05's Notes remains unticketed; if the appetite for a
  *time* × category showpiece returns, that is its own ticket with its own risk profile. This
  ticket replaces the *showpiece*, not the time dimension.
- **Needs [TICKET-EXP-01](./TICKET-EXP-01-explore-page-scaffold.md)** (shipped). Independent of
  the Sankey tickets and of every REC/CAT ticket.
