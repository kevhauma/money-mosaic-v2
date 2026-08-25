# TICKET-EXP-03 — Category groups as an intermediate Sankey level

- **Area:** Explore
- **Released in:** [v2.1 Extra graphs](../../releases/v2.1_extra_graphs/overview.md)
- **Type:** Feature
- **Traceability:** extends **FR-EXP-2** ([TICKET-EXP-02](./TICKET-EXP-02-money-flow-sankey.md)); consumes `Category.group` (FR-CAT-*, [app-db.ts:137](../../../src/app/core/data-access/app-db.ts)).

## User story

As someone whose categories are already sorted into groups, I want the money flow diagram to route spending through those groups before it reaches individual categories, so I can see that half my money goes to "Housing" without counting six thin ribbons to work it out.

## Description

Adds an optional fourth level to the Sankey between accounts and categories, populated from `Category.group`, with a toggle on the Explore page. Categories with no group pass straight through to the destination level as they do today.

## Current situation (as-is)

- `Category.group?: string` has existed since the foundation schema ([app-db.ts:137](../../../src/app/core/data-access/app-db.ts)) and is editable in the Categories feature, but **no aggregate or chart reads it** — every breakdown in `core/stats/` groups by category id.
- After [TICKET-EXP-02](./TICKET-EXP-02-money-flow-sankey.md), `computeMoneyFlowGraph` emits a strict three-level graph (sources → accounts → destinations) with `FlowNode.level` typed `0 | 1 | 2`, and links always spanning exactly one level.
- The Explore page has no per-section controls yet; per-chart session state lives in `ChartOptionsStore` ([chart-options.store.ts](../../../src/app/core/state/chart-options.store.ts)), keyed by `ChartOptionsKey`.

## Desired result (to-be)

- `computeMoneyFlowGraph` takes an additional `groupCategories: boolean` parameter (defaulting to `false`, so existing callers and tests are unaffected) and `FlowNode.level` widens to `0 | 1 | 2 | 3`.
- When `groupCategories` is `true`:
  - Each expense category whose `group` is a non-empty string routes `account → group:<group> → category:<id>`, splitting what was one link into two of the same value.
  - A category with no `group` (or an empty one) links `account → category:<id>` directly, and that node sits at the *destination* level — the diagram tolerates a mixed depth rather than inventing an "Ungrouped" bucket that would read as a real group.
  - Savings and `left-over` nodes are unaffected: they are not categories and never gain a group level.
- Group nodes carry `kind: 'group'`, id `group:<name>`, and a colour derived from the group's member categories (the highest-total member's colour), so a group visually reads as its dominant category rather than an arbitrary palette slot.
- The per-account balance property from EXP-02 still holds with grouping on — inserting a pass-through level must not change any total. This is the single most valuable test in this ticket.
- A "Group categories" toggle in the Sankey section header, held for the session via `ChartOptionsStore` under a new `'explore-money-flow'` `ChartOptionsKey` (a `groupCategories?: boolean` entry field plus store accessor/mutator, mirroring the existing `granularity` pair), defaulting to on **when at least one category has a group** and hidden entirely when none do — a toggle that can only ever do nothing is worse than no toggle.
- The visually-hidden table reflects the current level structure, so grouping on/off changes the table too.

## Acceptance criteria

**Level numbers shifted, 2026-08-07 — [TICKET-EXP-06](./TICKET-EXP-06-money-flow-account-balance-tiers.md)** inserted a secondary-account tier, so a group now sits at level 3 and its member categories at level 4 (was 2 and 3). Every behaviour below is unchanged and its spec still passes; only the constants moved, and the specs now name them (`LEVEL_DESTINATION`, `LEVEL_GROUPED_CATEGORY`) rather than hardcoding numbers.

- [x] `computeMoneyFlowGraph` accepts `groupCategories` (default `false`) and emits group nodes only when it is `true` and the category actually has a non-empty `group`. (`money-flow-graph.ts` signature + `insertGroupLevel`; specs `is off by default, so an existing caller sees exactly the three-level graph it saw before` and `reports how many drawn category links could be grouped…` — the latter also covers a whitespace-only `group` reading as no group)
- [x] Grouped categories produce two links of equal value (`account → group`, `group → category`); ungrouped categories keep their single direct link. (spec `splits a grouped category into two links of equal value, and leaves an ungrouped one direct`; plus `merges two categories of one group into a single account → group ribbon`, since without `mergeFlows` an account spending on two members would draw two parallel identical ribbons)
- [x] Every total is identical with grouping on and off — asserted by a test comparing per-account inflow/outflow and per-category totals across both modes on the same fixture. (spec `keeps every total identical with grouping on and off — the property the level must not break`, which checks per-account in/out, all three category totals, `left-over`, and that the group node is a pass-through)
- [x] ~~Links still span exactly one level~~, and the graph stays acyclic, with grouping on. — **relaxed by EXP-06 to "strictly downhill"** along with EXP-02's twin criterion; acyclicity is unchanged and still asserted. (spec `still runs strictly downhill with grouping on, alongside an account-to-account transfer`, over a fixture with grouped + ungrouped categories and a transfer between two own accounts)
- [x] A group node's colour is its highest-total member category's colour. (spec `colours a group as its highest-total member category` — Rent €900 beats Groceries €500; the total is summed per category across accounts, not taken from one link)
- [x] The toggle is hidden when no category in range has a group; when shown, it defaults to on and its choice survives navigation within the session (and resets on reload, per `ChartOptionsStore`'s in-memory contract). (panel specs `hides the toggle entirely when no category in range has a group`, `shows the toggle, defaulted on, once a category in range has one`, `keeps the choice in ChartOptionsStore, so it survives a remount within the session`; visibility is driven by `MoneyFlowGraph.groupableCategoryCount`, so no second graph computation is needed to answer it)
- [x] The sr-only table matches whichever level structure is currently rendered. (spec `rewrites the sr-only table to whichever level structure is drawn` — asserts the exact 4 rows with grouping on and the exact 3 rows after clicking it off, same figures throughout)
- [x] Savings and left-over nodes are unchanged by grouping. (spec `leaves transfers and left-over untouched by grouping` — identical link objects either way. Renamed by EXP-06, which made a savings account an ordinary tier-2 account node rather than a terminal `savings` one; the property being asserted is the same.)
- [x] Unit tests cover: a grouped and an ungrouped category in the same range; two categories sharing a group; a group whose name collides with a category name (distinct nodes, namespaced ids); totals preserved across both modes; the toggle-visibility condition. (`money-flow-graph.spec.ts` describe `computeMoneyFlowGraph: category groups (TICKET-EXP-03)`, 9 cases; `keeps a group and a category of the same name apart` covers the collision via a category literally named "Living" alongside the group "Living"; plus 4 panel cases and 4 `chartGroupCategories` cases in `chart-options-control.spec.ts`)
- [x] `ng lint` + `ng test` + `ng build --configuration development` all pass. (lint: "All files pass linting"; test: 237 files / 2437 tests passed; build: complete, `grep -c echarts …/main.js` → 0)
- [x] Verified via the fallow skill and coding-conventions skill. (`fallow audit --base HEAD`: 0 dead-code issues, 0 duplication clone groups; every complexity finding on `money-flow-graph.ts` is `crap`-only — max cyclomatic 10 of 20, max cognitive 12 of 15 — i.e. flagged by fallow's assumed-zero coverage rather than by either threshold)
- [ ] Verified live in the browser: toggling grouping on real data reflows the diagram without changing the visible totals, and the toggle is absent on a dataset with no groups. — **left open at the user's instruction**, for the reason recorded on [TICKET-EXP-02](./TICKET-EXP-02-money-flow-sankey.md): with the Browser pane closed, `document.hidden` is true and `requestAnimationFrame` never fires, so no chart in the app paints and a "does it reflow" check cannot be made honestly. Note the dev profile's 11 categories currently carry no `group`, so the toggle's *absent* half is the state that would show there today.

## Notes

- **Mixed depth is deliberate.** Forcing ungrouped categories through a synthetic "Ungrouped" node would create a fat ribbon that looks like a real spending group. ECharts' Sankey handles nodes terminating at different depths; letting them do so is the honest rendering.
- **Not a prompt to start grouping.** This ticket reads `Category.group` where it exists; it does not add group management UI, defaults, or suggestions. If groups turn out to be rarely used, that's a Categories-feature question, not a chart one.
- Needs TICKET-EXP-02. Independent of TICKET-EXP-04 (they touch different parts of the panel; whichever lands second rebases trivially).
