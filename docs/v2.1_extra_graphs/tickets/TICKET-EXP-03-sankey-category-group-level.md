# TICKET-EXP-03 — Category groups as an intermediate Sankey level

- **Area:** Explore
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

- [ ] `computeMoneyFlowGraph` accepts `groupCategories` (default `false`) and emits group nodes only when it is `true` and the category actually has a non-empty `group`.
- [ ] Grouped categories produce two links of equal value (`account → group`, `group → category`); ungrouped categories keep their single direct link.
- [ ] Every total is identical with grouping on and off — asserted by a test comparing per-account inflow/outflow and per-category totals across both modes on the same fixture.
- [ ] Links still span exactly one level, and the graph stays acyclic, with grouping on.
- [ ] A group node's colour is its highest-total member category's colour.
- [ ] The toggle is hidden when no category in range has a group; when shown, it defaults to on and its choice survives navigation within the session (and resets on reload, per `ChartOptionsStore`'s in-memory contract).
- [ ] The sr-only table matches whichever level structure is currently rendered.
- [ ] Savings and left-over nodes are unchanged by grouping.
- [ ] Unit tests cover: a grouped and an ungrouped category in the same range; two categories sharing a group; a group whose name collides with a category name (distinct nodes, namespaced ids); totals preserved across both modes; the toggle-visibility condition.
- [ ] `ng lint` + `ng test` + `ng build --configuration development` all pass.
- [ ] Verified via the fallow skill and coding-conventions skill.
- [ ] Verified live in the browser: toggling grouping on real data reflows the diagram without changing the visible totals, and the toggle is absent on a dataset with no groups.

## Notes

- **Mixed depth is deliberate.** Forcing ungrouped categories through a synthetic "Ungrouped" node would create a fat ribbon that looks like a real spending group. ECharts' Sankey handles nodes terminating at different depths; letting them do so is the honest rendering.
- **Not a prompt to start grouping.** This ticket reads `Category.group` where it exists; it does not add group management UI, defaults, or suggestions. If groups turn out to be rarely used, that's a Categories-feature question, not a chart one.
- Needs TICKET-EXP-02. Independent of TICKET-EXP-04 (they touch different parts of the panel; whichever lands second rebases trivially).
