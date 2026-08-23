# TICKET-STAT-42 — Name what each savings measure actually counts

- **Area:** Stats / Dashboard
- **Type:** Bug fix
- **Traceability:** UX review (UXR-1); extends FR-STAT-2 — three surfaces answer "how much do I save?" with three different numbers and none states its definition

## User story

As someone reading my dashboard, I want each savings figure to say what it measures, so that two numbers differing five-fold stop looking like a bug in my own data.

## Current situation (as-is)

Three surfaces answer the same user question with three different numbers, all unlabelled:

- **"Savings rate 10.7%"** — [period-stats.ts:53](../../../src/app/core/stats/period-stats.ts) computes `savingsRate: income === 0 ? null : savings / income`, where `savings` counts **only money actually moved into savings accounts**.
- **"57.1% of income kept"** — [net-margin.ts](../../../src/app/core/stats/net-margin.ts) is a different measure entirely; its own header comment says it is "distinct from `savingsRate` (which only counts money actually moved into savings accounts) (TICKET-STAT-21)".
- **"You saved about €1,600.10/month"** on `/future` — a third framing again.

The first two render as adjacent tiles in the same KPI strip on `/dashboard`. Both are correct. Nothing on any of the three surfaces names its definition, so the only way to learn why they differ is to read `net-margin.ts`.

The definitions are already written down — they live in code comments, where the user cannot reach them.

## Desired result (to-be)

- Each figure's label states what it counts, so the difference is self-evident: "Moved to savings" (10.7%) and "Kept" (57.1%) rather than two unqualified percentages.
- Each tile carries a one-sentence definition reachable from the tile itself (tooltip or info affordance), sourced from the same wording the code comments already use.
- `/future`'s monthly figure names which of the two it derives from.
- No calculation changes — this ticket is labelling only. The numbers are right; their presentation is not.

## Acceptance criteria

- [ ] The dashboard tile currently labelled "Savings rate" names the measure as money moved into savings accounts, and the tile currently labelled "% of income kept" names itself as income minus all spending.
- [ ] Each of the two tiles exposes a one-sentence definition without leaving the dashboard.
- [ ] `/future`'s "You saved about €X/month" states which measure it is derived from.
- [ ] No change to `savingsRate` or `netMargin` arithmetic — existing stats specs pass unmodified.
- [ ] Unit tests cover: the labels render for a populated period; the definition text is present for both tiles; the zero-income case still renders the existing `null` guard rather than a label over a missing number.
- [ ] Verified live in the browser: both tiles readable side by side, definitions reachable, no layout regression in the KPI strip.
- [ ] Verified via the fallow skill and coding-conventions skill.

## Notes

- Wording should come from the existing comments rather than being reinvented, so code and UI cannot drift apart again.
- Related: [TICKET-ACC-12](./TICKET-ACC-12-unstack-balance-history-chart.md) is the other half of the same trust problem — a number that is not just unexplained but actively wrong to read off the chart.
- Out of scope: consolidating to a single savings measure. Both are genuinely useful; the defect is that neither is named.
