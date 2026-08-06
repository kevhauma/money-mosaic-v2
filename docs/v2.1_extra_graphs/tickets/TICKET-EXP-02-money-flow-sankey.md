# TICKET-EXP-02 — Money flow Sankey: where income arrives and where it leaves

- **Area:** Explore
- **Type:** Feature
- **Traceability:** new capability, adds **FR-EXP-2**. Consumes the same classification contract as every stat (FR-STAT-*, via `classifyForStats`) and the savings/transfer semantics of FR-TRF-1. Graduated from the "Extra graphs" idea in [v9999_ideas/requirements.md](../../v9999_ideas/requirements.md) ("sankey, income, intermediate, outcome. outside -> accounts -> category groups if exist -> category (how to deal with savings accounts?)").

## User story

As someone who knows their totals but not their plumbing, I want one diagram showing my income flowing into my accounts and back out into categories and savings, so I can see the whole shape of a period's money in a single picture instead of reconstructing it from four separate charts.

## Description

Adds the Explore page's headline section: an ECharts Sankey with three levels — income sources → accounts → destinations (expense categories, savings accounts, and what was left over) — computed by a new pure aggregate that guarantees the diagram *balances*, so a flow that looks twice as thick really is twice as much money.

## Current situation (as-is)

- Every existing aggregate answers one axis at a time: [category-breakdown.ts](../../../src/app/core/stats/category-breakdown.ts) totals per category, [period-stats.ts](../../../src/app/core/stats/period-stats.ts) totals income/expense/savings, [account-balance-history.ts](../../../src/app/core/stats/account-balance-history.ts) tracks one account's balance. Nothing relates *source* to *account* to *destination* — there is no graph/flow model anywhere in `core/stats/`.
- [classify-for-stats.ts:43-96](../../../src/app/core/stats/classify-for-stats.ts) is the single classification pipeline and already answers most of the hard questions this diagram asks: it returns `{ kind: 'income' | 'expense', amount, categoryId }`, `{ kind: 'savings', amount }` for a movement into/out of an own savings IBAN (`isSavingsMovement`, checked *before* the `transferId` skip so a linked savings transfer still counts), and `{ kind: 'skip' }` for everything excluded — out-of-range, `nullified`, zero-amount, non-savings linked transfers, `neutral` categories, and co-owner/`notMine` joint legs. `amount` is a *signed delta* and can be negative (a refund netting a bucket down).
- `savingsAccountIbans(accounts)` ([transfer-matching.ts:78](../../../src/app/core/transfers/transfer-matching.ts)) yields the normalized IBANs of `type === 'savings'` accounts; `ownAccountIbans` does the same for all accounts.
- `Account` carries `id`, `name`, `type` (`checking | savings | joint | invest`), `iban`, `color` ([app-db.ts:20-46](../../../src/app/core/data-access/app-db.ts)); `Category` carries `name`, `kind`, optional `group`, `color` ([app-db.ts:127-144](../../../src/app/core/data-access/app-db.ts)).
- [echarts-setup.ts](../../../src/app/shared/echarts/echarts-setup.ts) registers no `SankeyChart`.
- After [TICKET-EXP-01](./TICKET-EXP-01-explore-page-scaffold.md) the Explore page exists with its own range and an empty section.

## Desired result (to-be)

### The aggregate

- New pure `core/stats/money-flow-graph.ts`:
  ```ts
  computeMoneyFlowGraph(
    transactions, categoriesById, accountsById, from, to, ownSavingsIbans,
  ): MoneyFlowGraph            // { nodes: FlowNode[]; links: FlowLink[] }
  ```
  `FlowNode = { id: string; name: string; level: 0 | 1 | 2; color: string; kind: 'income-source' | 'carried-in' | 'account' | 'category' | 'savings' | 'left-over'; categoryId?: number | null; accountId?: number }`, `FlowLink = { source: string; target: string; value: number }`.
- **Node ids are namespaced by kind** — `income:<categoryId|none>`, `account:<id>`, `category:<categoryId|none>`, `savings:<accountId|other>`, plus the two synthetic singletons `carried-in` and `left-over`. A category and an account sharing a name must not collapse into one node.
- **Levels are strict**: level 0 = income sources + `carried-in`; level 1 = accounts; level 2 = expense categories + savings + `left-over`. Every link goes from level *n* to level *n+1*, which is what makes the graph acyclic by construction (ECharts' Sankey cannot render a cycle).
- **Every transaction goes through `classifyForStats`**, and only its result is used:
  - `income` → link `income:<categoryId>` → `account:<transaction.accountId>`.
  - `expense` → link `account:<transaction.accountId>` → `category:<categoryId>`.
  - `savings` → link `account:<transaction.accountId>` → `savings:<the own savings account whose IBAN matches the counterparty>`, falling back to a single `savings:other` node when the counterparty IBAN matches no known account.
- **Signed amounts are netted, then filtered.** A refund or a savings withdrawal produces a negative `amount`; it is netted into its link's running total, and any link whose total is ≤ 0 after netting is dropped (ECharts renders a negative-value link as a graphical artefact, not as "money going the other way"). Dropped links are counted and exposed on the result as `nettedOutLinkCount` so the UI can say so rather than silently under-report.
- **The graph balances per account**, which is the correctness property that makes the picture honest:
  - `inflow(account)` = its income links; `outflow(account)` = its expense + savings links.
  - `outflow > inflow` → add a `carried-in` → `account` link for the difference (money the account already held before the range, or received outside it).
  - `inflow > outflow` → add an `account` → `left-over` link for the difference (what stayed put).
  Without this, ECharts silently rebalances the picture itself and the ribbon widths stop meaning anything.
- Uncategorised income and uncategorised expense get their own explicitly-labelled nodes ("Uncategorised income" / "Uncategorised"), never folded into a real category.
- Node colour comes from the entity's own `color` (account or category), `CHART_NO_COLOR_FALLBACK` for uncategorised, and theme colours from `resolveChartCategoricalColors()` for the two synthetic nodes.

### The rendering

- `SankeyChart` registered in [echarts-setup.ts](../../../src/app/shared/echarts/echarts-setup.ts) alongside the existing chart types, with the file's comment extended to say why it is registered there rather than per-feature (one shared registration point; echarts already lives only in lazy chunks, so the production `initial` budget is untouched — the rule in CLAUDE.md is not to raise budgets, and this does not).
- New `app-money-flow-panel` under `feature-explore/components/money-flow-panel/`, `OnPush`, with the ECharts option built by a pure exported function so it is testable without `TestBed` (the `buildColumnChartOption` precedent from [trend-chart-panel.component.ts:55](../../../src/app/feature-dashboard/components/trend-chart-panel/trend-chart-panel.component.ts)).
- Reads `rangeStore.from('explore')`/`to('explore')`, `TransactionsStore`, `CategoriesStore`, `AccountsStore` from `@/core/state` — never a repository or `appDb` directly.
- Node labels show the name; amounts are added by [TICKET-EXP-04](./TICKET-EXP-04-sankey-tooltips-drilldown-privacy.md), which also handles privacy mode.
- Degenerate ranges render honestly: no income in range → level 0 is just `carried-in`; no transactions at all → the section renders nothing (the page's own empty state, from EXP-01, covers the no-data-anywhere case).
- A visually-hidden table lists every link as source → target = amount, per [TICKET-STAT-20](../../v1.3_code_review/tickets/TICKET-STAT-20-trend-chart-accessible-numbers.md)'s convention, with `role="img"` and a summary label on the canvas host.

## Acceptance criteria

- [ ] `core/stats/money-flow-graph.ts` exports `computeMoneyFlowGraph` as a pure function (no DI, no store, no Dexie), exported from [core/stats/index.ts](../../../src/app/core/stats/index.ts).
- [ ] Every per-transaction decision routes through `classifyForStats()`; the aggregate re-checks none of `transferId`, `nullified`, savings-IBAN membership or joint weighting itself.
- [ ] Node ids are namespaced per kind; a category and an account with the same name produce two distinct nodes.
- [ ] Every emitted link goes from level *n* to level *n+1* — asserted by a unit test over a fixture containing accounts, categories, savings and joint legs, so the graph is provably acyclic.
- [ ] Per account, income in equals expense + savings + left-over, or carried-in makes up the difference — asserted numerically in a test for both directions (an account that overspends its range income, and one that underspends).
- [ ] Links netting to ≤ 0 are dropped, and the count is reported on the result rather than discarded silently.
- [ ] Savings movements land on a per-savings-account node, with an "other" fallback when the counterparty IBAN matches no known account; a savings *withdrawal* nets that link down instead of appearing as income.
- [ ] Uncategorised income and uncategorised expense each render as their own labelled node.
- [ ] `SankeyChart` is registered in the shared echarts setup and nowhere else; `angular.json`'s budgets are unchanged and the production `initial` bundle does not grow (echarts stays lazy-only).
- [ ] The panel renders on `/explore`, reacts to the Explore range, and renders nothing when the range holds no transactions.
- [ ] A visually-hidden table mirrors every link's figures, and the chart host carries `role="img"` with a descriptive `aria-label`.
- [ ] Unit tests cover: a single-account single-income single-expense flow end to end; an account that overspends (carried-in) and one that underspends (left-over); a savings deposit and a withdrawal; an expense refund netting a link down and, at zero, dropping it; a linked non-savings transfer producing no links at all; a joint account's `ownershipShare` reaching the links through `classifyForStats`; uncategorised income and expense nodes; an empty range returning empty `nodes`/`links`.
- [ ] `ng lint` + `ng test` + `ng build --configuration development` all pass.
- [ ] Verified via the fallow skill and coding-conventions skill.
- [ ] Verified live in the browser: the Sankey renders on `/explore` with real imported data, ribbon widths visibly match the Dashboard's income/expense/savings totals for the same range, and changing the range redraws it.

## Notes

- **Why carried-in / left-over instead of just drawing what happened.** A Sankey is read as a conservation diagram: what enters a node leaves it. Feeding ECharts unbalanced data doesn't produce an error, it produces a *plausible-looking* picture with meaningless widths. Naming the imbalance ("carried in", "left over") is both honest and useful — "left over" is the period's savings-in-place, and a large "carried in" is the visual form of living off a buffer.
- **Savings are a destination, not an expense** — matching `classifyForStats`, where a savings movement is its own `kind` and is deliberately excluded from expense. This is the answer to the idea note's open question "how to deal with savings accounts?": a savings account appears as a *terminal node*, not as an account node with outgoing flows, because within a range money into savings is where the story ends. Spending *from* a savings account still appears normally, as an account-level outflow, since that transaction lives on the savings account itself.
- **Own-account transfers that aren't savings** (checking → checking) produce no links, exactly as they produce no stats — `classifyForStats` skips them. Drawing them would double-count.
- **Level count is fixed at three here**; the category-group level from the idea note is [TICKET-EXP-03](./TICKET-EXP-03-sankey-category-group-level.md), kept separate so this ticket can ship and be read against real data first.
- Needs TICKET-EXP-01. Prerequisite for EXP-03 and EXP-04.
