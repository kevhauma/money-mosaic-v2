# TICKET-EXP-07 — Spending mosaic: a treemap of category groups → categories

- **Area:** Explore
- **Released in:** [v2.1 Extra graphs](../../releases/v2.1_extra_graphs/overview.md)
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

  **⚠ Superseded the same day by [TICKET-EXP-08](./TICKET-EXP-08-mosaic-transaction-level.md):
  there is no drill-down and no breadcrumb in the shipped chart.** On the feedback that the
  subdivisions should be visible without zooming in, the nested half of the note below was chosen
  over the interactive half: `leafDepth` is now unset, every level draws at once, and `nodeClick` is
  `false` because a click had nothing left to reveal and `zoomToNode` left the mosaic half outside
  its own box (with `roam` off *and* on). The note below is kept as the record of why the trade
  existed at all.

  **Implementation note, 2026-08-11 — one level at a time, not nested.** The two halves of "group
  tiles subdivided into their categories" and "clicking a group drills into it" turn out to be
  mutually exclusive in ECharts, and the drill-down is the half that was kept (`leafDepth: 1`). A
  treemap only *re-roots* on click when the clicked node has children that are not already drawn;
  with both levels rendered nested, `nodeClick: 'zoomToNode'` degrades into a raw zoom transform
  over the whole layout, which `roam: false` then gives the reader no way out of — the live check
  found the mosaic scaled half outside its own box with Housing's label clipped to "sing · 79%",
  and `leafDepth: 2` behaved identically. So the top level draws group totals beside the ungrouped
  categories (each group tile marked ▶), and a group's categories are one click away with the
  breadcrumb as the way back. The `sr-only` table still lists **both** levels, so nothing is lost
  to a reader of the figures. The breadcrumb's root crumb takes the series' `name`, so the series
  is named "All spending" — unnamed, the breadcrumb renders one crumb and the drilled-in reader is
  stuck.
- No expenses in range → the section renders nothing (EXP-01's page empty state covers
  no-data-anywhere).
- A visually-hidden figure table lists group → category = amount + share per
  [TICKET-STAT-20](../../dashboard/tickets/TICKET-STAT-20-trend-chart-accessible-numbers.md),
  `role="img"` + descriptive `aria-label` on the canvas host.

## Acceptance criteria

- [x] `computeSpendingMosaic` is a pure function fed from `computeCategoryBreakdown` output (no
      re-classification — `classifyForStats` does not appear in the file), exported from
      [core/stats/index.ts](../../../src/app/core/stats/index.ts); the summed leaf values equal
      the summed breakdown entries, asserted in a spec.
      (`core/stats/spending-mosaic.ts` — it imports only the `CategoryBreakdownEntry` type and
      `Category`; `classifyForStats` is neither imported nor called, and appears only in the doc
      comment that says so. `core/stats/index.ts` re-exports it. The property is asserted in
      `spending-mosaic.spec.ts` → "never re-classifies: its leaves sum to exactly what the breakdown
      it was fed sums to", which feeds a real `computeCategoryBreakdown()` result including a refund.)
- [x] Grouped categories nest under their group tile; ungrouped categories are top-level tiles;
      uncategorised expenses get their own labelled tile, never folded into a group.
      (`spending-mosaic.spec.ts` → "nests grouped categories under their group, heaviest tile first",
      "keeps an ungrouped category at the top level, as its own leaf tile", "gives uncategorised
      spending its own labelled top-level tile, never folded into a group", plus "treats a blank
      group as no group, and a vanished category as an unknown leaf".)
- [x] `TreemapChart` is registered in the shared echarts setup and nowhere else;
      `angular.json` budgets unchanged; the production `initial` bundle does not grow.
      (One `TreemapChart` import, in `shared/echarts/echarts-setup.ts`'s `echarts.use([...])`;
      `angular.json` is untouched in the diff. `ng build` production `Initial total` measured before
      and after the change: **842.82 kB both times**, byte-identical — echarts only ever loads from a
      lazy feature chunk.)
- [x] The panel renders on `/explore`, reacts to the Explore range, and renders nothing when the
      range holds no expenses.
      (`spending-mosaic-panel.component.spec.ts` → "renders the mosaic and its sr-only figure table
      when the range holds expenses", "renders nothing at all when the range holds no expenses",
      "reacts to the Explore range, not the Dashboard one" — the last one moves the *dashboard* range
      first and asserts nothing changes. Page wiring asserted in `explore-overview.component.spec.ts`,
      which now checks `app-spending-mosaic-panel mm-paper` in all three of its states.)
- [x] ~~Clicking a group drills into it and the breadcrumb returns~~; tile labels show name + share;
      tooltips show `formatCurrency()` amounts and mask under privacy mode.
      **The struck clause is no longer true of the shipped chart** — TICKET-EXP-08 replaced the
      drill-down with every level drawn at once, and removed `nodeClick` and the breadcrumb with it.
      It *was* true when ticked, and the evidence below is what was observed then.
      (Verified live — see the last criterion for the drill-down and the breadcrumb, which needed
      the `leafDepth: 1` / series-`name` corrections recorded in the to-be's implementation note.
      Labels and tooltips are covered by `spending-mosaic-panel.component.spec.ts` → "labels every
      tile with its name and share, groups included, and never with an amount" and "states the
      amount and the share in a tooltip, and drops only the amount under privacy mode"; the config
      itself by "leaves drill-down to echarts…", which now pins `nodeClick`, `breadcrumb.show`,
      `leafDepth` and the series name.)
- [x] The sr-only figure table mirrors every tile's group, name, amount and share; the chart host
      carries `role="img"` with a descriptive label.
      (`spendingMosaicRows` emits one row per tile — a group's own total as `All <group>` ahead of
      its members, ungrouped leaves under an explicit `Ungrouped` — asserted in "mirrors every tile
      — group totals, their members, and the ungrouped ones" and rendered by the component's spec.
      `role="img"` + the range-bearing `aria-label` asserted in "renders the mosaic and its sr-only
      figure table when the range holds expenses". Live, with a group set: the table listed
      `Living / All Living / €195.75 / 16.3%` above its two members, matching the Sankey's group
      ribbons to the cent.)
- [x] Unit tests cover: the tree fold (grouped, ungrouped, uncategorised, empty); the
      leaf-sum-equals-breakdown-sum property; the option builder keying tiles and colours
      correctly; panel render/empty/range-reaction; privacy masking.
      (16 new tests — `spending-mosaic.spec.ts` (6) and `spending-mosaic-panel.component.spec.ts`
      (10) — plus three assertions added to `explore-overview.component.spec.ts` for the new
      section.)
- [x] `ng lint` + `ng test` + `ng build --configuration development` all pass.
      (Run end-to-end by the `verifier` subagent on the final tree — 247 files / 2708 tests green,
      lint clean, dev build clean. It also reported that `app.routes.spec.ts`'s `/explore` test now
      runs close to the 30s Vitest timeout under full-suite load, since that route lazily pulls in
      this panel — noted as a flake risk in this ticket's Notes rather than silently patched.)
- [x] Verified via the fallow skill and coding-conventions skill.
      (`fallow audit --base HEAD`: verdict **pass** — 0 dead-code findings, 0 duplication, 0
      complexity findings. Its first run flagged two CRAP scores in `spending-mosaic.ts`, which is
      why the fold is now decomposed into `categoryOf`/`nameFor`/`groupOf`/`leafFor`/`groupFor`. The
      `conventions-reviewer` subagent reported no hard-rule or structural violations; its real
      finding — the `sr-only` `@for` tracking on display text, which two same-named categories would
      turn into an NG0955 — is fixed by `SpendingMosaicRow.id`.)
- [x] Verified live in the browser: the mosaic renders on `/explore` with real data, tile areas
      visibly match the Dashboard pie's proportions for the same range, and group drill-down
      works.
      (2026-08-11, `ng serve` on 4210, August 2026 range. The mosaic's labels read Housing 79%,
      Groceries 10.9%, Utilities 5.3%, Eating Out 2.3%, Transport 1.3% — **identical** to the
      Dashboard's category breakdown pie for the same range, and its tooltip figures match the
      Sankey's ribbons to the cent (Housing €950.00). Privacy mode drops the amount from the tooltip
      and keeps "79% of all spending". No expense category in the dataset had a `group`, so — with
      the user's agreement — Groceries and Utilities were temporarily grouped as "Living" via the
      Categories page, and **reverted afterwards** (both back to `group: undefined`, confirmed
      against IndexedDB). Grouped: a ▶ "Living · 16.3%" tile appeared, clicking it re-rooted the
      mosaic to Groceries · 10.9% + Utilities · 5.3%, the breadcrumb read "All spending › Living",
      and clicking "All spending" returned to the full mosaic. Two defects were found and fixed by
      this check: an empty white band across the top of the chart (the root node inheriting the
      group header bar) and the zoom-instead-of-drill behaviour recorded in the to-be.)

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
- **Follow-up worth its own ticket:** `app.routes.spec.ts`'s "resolves /explore" test took 30.6s
  under full-suite load against a 30s Vitest default timeout (8.6s in isolation), because that route
  now lazily pulls in this panel on top of the Sankey. It passed on the final run and did not
  reproduce alone, but it is one CPU-contention spike away from a red build; the fix is that spec's
  own timeout, not this feature's.
