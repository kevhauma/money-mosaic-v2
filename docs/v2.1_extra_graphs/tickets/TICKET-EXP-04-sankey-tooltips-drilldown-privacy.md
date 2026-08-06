# TICKET-EXP-04 — Sankey amounts, share-of-total, drill-down and privacy mode

- **Area:** Explore
- **Type:** Feature
- **Traceability:** extends **FR-EXP-2** ([TICKET-EXP-02](./TICKET-EXP-02-money-flow-sankey.md)); applies FR-STAT drill-down conventions (`buildTransactionDrilldownParams`) and the privacy-mode rule from [TICKET-PRIV-01](../../v2/tickets/TICKET-PRIV-01-privacy-mode-dashboard.md).

## User story

As someone looking at a ribbon in the money flow diagram, I want to see what it's worth, what share of the total it is, and be able to click through to the transactions behind it, so the diagram is a way into my data rather than a picture I have to interpret and then go hunting.

## Description

Makes the Sankey interactive and settings-aware: formatted amounts and share-of-total in node and link tooltips, click-through to a filtered `/transactions` list, and full compliance with privacy mode.

## Current situation (as-is)

- After [TICKET-EXP-02](./TICKET-EXP-02-money-flow-sankey.md) the Sankey renders labels only; hovering shows ECharts' default tooltip (raw numbers, no currency, no locale) and clicking does nothing.
- The app has one drill-down contract: `buildTransactionDrilldownParams({ from, to, categoryId, accountId })` ([search-params.ts:19-28](../../../src/app/shared/utils/search-params.ts)) → `router.navigate(['/transactions'], { queryParams })`, used by the trend chart ([trend-chart-panel.component.ts:220-234](../../../src/app/feature-dashboard/components/trend-chart-panel/trend-chart-panel.component.ts)) and the stat cards. It supports **both** `categoryId` and `accountId` — which is exactly what a Sankey link identifies.
- Amounts and dates elsewhere go through `formatCurrency()`/`localeDate` ([currency-format.ts](../../../src/app/shared/utils/currency-format.ts), [date-format.ts](../../../src/app/shared/utils/date-format.ts)), settings-driven since TICKET-SET-03/04; percentages through `formatPercent` ([number-format.ts](../../../src/app/shared/utils/number-format.ts)).
- Privacy mode is `AppSettingsStore.privacyModeEnabled`, applied on the Dashboard by blurring figures via `mm-privacy-blur` while leaving proportional graphics visible ([weekday-weekend-split-panel.component.ts:31-33](../../../src/app/feature-dashboard/components/weekday-weekend-split-panel/weekday-weekend-split-panel.component.ts)). The Explore page has no privacy handling at all yet.

## Desired result (to-be)

- **Link tooltip:** `<source> → <target>`, the amount via `formatCurrency()`, and its share of that source node's outflow via `formatPercent` — e.g. "Main account → Groceries · €412.60 · 18% of this account's outflow".
- **Node tooltip:** the node name, its total (in for a destination, out for a source, both for an account), and its share of the period's total inflow.
- Both built with a pure formatter function in the panel's own file, unit-tested without a chart instance — the pattern [tooltip-formatter.ts](../../../src/app/shared/echarts/tooltip-formatter.ts) already established for axis tooltips.
- **Click-through**, using the Explore range's `from`/`to` plus whatever the clicked element identifies:
  - a `category` node or an `account → category` link → `categoryId` (`UNCATEGORISED_SENTINEL` for the uncategorised node);
  - an `account` node → `accountId`;
  - an `income:<categoryId> → account` link → both `categoryId` and `accountId`;
  - `savings`, `carried-in`, `left-over` and (with EXP-03) `group` nodes → range only, since no single transaction filter expresses them. These are visibly non-interactive (no pointer cursor, no click handler) rather than clickable-but-inert.
- **Privacy mode**: with it on, tooltips show names and percentages but no absolute amounts, node labels drop any amount suffix, and the sr-only table's amounts render inside `mm-privacy-blur`. Ribbon widths stay — a proportion is not a figure, the same line the Dashboard already draws.
- Keyboard/assistive-tech parity: the sr-only table's rows carry the same drill-down links as the canvas' click targets, so the interaction isn't mouse-only.

## Acceptance criteria

**Implementation note, 2026-08-06 — the sr-only table *withholds* amounts rather than blurring
them.** The to-be says the table's amounts "render inside `mm-privacy-blur`". They don't, and
mustn't: `.sr-only` clips the table to a 1px box, so a CSS filter paints nothing there, and a screen
reader reads the text out regardless — the blur would hide the figure from nobody and from nothing.
This is the rule TICKET-STAT-29's convention review already established and
[coding-conventions](../../../.claude/skills/coding-conventions/SKILL.md) now states outright
("Privacy mode blurs what is *seen* and withholds what is *read*"), so the row renders the literal
`hidden` in place of the amount. `mm-privacy-blur` stays the right tool for a *visible* figure; this
section has none outside the canvas.

- [x] Link and node tooltips show currency- and locale-formatted amounts via `formatCurrency()`/`formatPercent` — no raw numbers, no hardcoded `€` or `.`/`,` handling. (`formatMoneyFlowLinkTooltip` / `formatMoneyFlowNodeTooltip` in `money-flow-panel.component.ts`; specs assert the exact strings under `withCleanFormatSettings()`, e.g. `Main account → Groceries<br/>€500.00<br/>23.8% of Main account's outflow`)
- [x] Tooltip content is produced by a pure exported formatter with its own unit tests (no `TestBed`, no chart instance). (describe `money flow tooltips (TICKET-EXP-04)` — 5 cases, all against a plain `MoneyFlowGraph` fixture through `summariseMoneyFlow`, no fixture and no chart)
- [x] Clicking a category node/link navigates to `/transactions` with the Explore range and that `categoryId`; an account node adds `accountId`; an income link carries both. (`moneyFlowDrilldownParams`; specs `filters by category for a category node and for the ribbon that lands on it` and `filters by account for an account node, and by both for an income ribbon`, plus the component-level `navigates on a canvas click, with the Explore range and the clicked identity`, which asserts the real `router.navigate` call)
- [x] The uncategorised node drills down with `UNCATEGORISED_SENTINEL`, matching the trend chart's existing behaviour. (spec `drills an uncategorised node down with the shared sentinel, like the trend chart`)
- [x] `savings`, `carried-in`, `left-over` (and `group`, if EXP-03 has landed) are non-interactive and visibly so. (spec `makes savings, carried-in and left-over non-interactive, in params and in cursor` — asserts both `undefined` params and `cursor: 'default'` on the emitted nodes *and* links, against `'pointer'` for the interactive ones; `group` covered by `still reaches the category once a group level sits in between`, and `does not navigate for a non-interactive element` proves the click handler returns without navigating)
- [x] With privacy mode on, no absolute amount is legible anywhere in the section — tooltips, labels, or sr-only table — while the ribbons still render at full fidelity. (spec `withholds every amount with privacy mode on, keeping the ribbons and the links`: the sr-only table contains no `€` and reads `hidden`, the node-label formatter and the tooltip formatter both come back `€`-free, and the series still carries all 3 links. Plus the pure-formatter case `drops every absolute amount under privacy mode, and keeps the proportions`, which keeps the percentages deliberately — a proportion is not a figure.)
- [x] The sr-only table's rows link to the same filtered transaction lists as the corresponding canvas elements. (spec `links each interactive sr-only row to the same filtered list its ribbon navigates to` — asserts the two `href`s exactly, and that the non-interactive left-over row is the third row and *not* a link)
- [x] Unit tests cover: the link formatter and node formatter (including the privacy-mode variants); the drill-down params for each interactive node/link kind; the non-interactive kinds producing no navigation. (`money-flow-panel.component.spec.ts` — 5 tooltip cases, 6 drill-down cases, 4 component-level interaction/privacy cases)
- [x] `ng lint` + `ng test` + `ng build --configuration development` all pass. (lint: "All files pass linting"; test: 237 files / 2452 tests passed; build: complete, `grep -c echarts …/main.js` → 0)
- [x] Verified via the fallow skill and coding-conventions skill. (`fallow audit --base HEAD`: 0 dead-code issues, 0 duplication clone groups; every complexity finding across the ticket's files is `crap`-only — max cyclomatic 13 of 20, max cognitive 12 of 15 — i.e. flagged by fallow's assumed-zero coverage rather than by either threshold)
- [ ] Verified live in the browser: hover and click each interactive element kind against real data and confirm the resulting `/transactions` list matches the ribbon's amount, then repeat with privacy mode on. — **left open at the user's instruction**, for the reason recorded on [TICKET-EXP-02](./TICKET-EXP-02-money-flow-sankey.md): with the Browser pane closed, `document.hidden` is true and `requestAnimationFrame` never fires, so no chart paints and neither a hover nor a canvas click can be exercised.

## Notes

- **The drill-down is the reason a large Sankey is worth the space.** Without it the diagram is a poster; with it, it is a query interface over the same data the Transactions page already filters.
- **Share-of-total needs a stated denominator.** "18%" alone invites the wrong reading, so every percentage names what it's a share of.
- Needs TICKET-EXP-02. Independent of TICKET-EXP-03; if EXP-03 ships first, this ticket also covers the `group` node's tooltip (its total and share) and its non-interactive status.
