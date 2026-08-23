# TICKET-ACC-12 — Balance history plots each account at cumulative height

- **Area:** Accounts
- **Type:** Bug fix
- **Traceability:** UX review (UXR-2); FR-STAT-1 (net worth / per-account balances) — `stack: 'account-balance'` makes every series read as the running total, not its own balance

## User story

As someone checking an account balance against my bank statement, I want each account's line to show that account's balance, so that reading the chart gives me the same number my bank does.

## Current situation (as-is)

[account-balance-history-chart.component.ts:54-56](../../../src/app/feature-accounts/components/account-balance-history-chart/account-balance-history-chart.component.ts) builds every series with:

```ts
type: 'line',
stack: 'account-balance',
areaStyle: {},
```

ECharts `stack` makes each series render at the **sum of itself and all series below it**. So with two accounts at €7,691 and €9,206, the savings account's line sits at ~€17,000 — the combined total — while its own card elsewhere in the app correctly reads €9,206.42.

The chart is a stacked area chart, which is a legitimate way to show *net worth composition over time*. It is the wrong shape for the task the page presents it for: the page is account detail, the adjacent figure is a single account's balance, and the y-value a user reads off the line does not match it.

The stacking is asserted in [account-balance-history-chart.component.spec.ts:272-282](../../../src/app/feature-accounts/components/account-balance-history-chart/account-balance-history-chart.component.spec.ts), so this is deliberate, not an accident — but it makes the chart unusable for reconciliation, which is the app's core monthly workflow.

## Desired result (to-be)

- Each account's line plots that account's own balance, so a point read off the chart matches the account's stated balance and the user's bank statement.
- If composition-over-time is still wanted, it is an explicit opt-in (a "combined" toggle), not the default and not silent.
- The chart's own legend/labels make clear which mode is active.

## Acceptance criteria

- [ ] Series no longer stack by default: a given account's plotted y-value equals that account's balance at that date.
- [ ] A point read off the chart matches the balance shown on the same account's card/detail header for the same date.
- [ ] If a combined/stacked view is retained, it is opt-in and visibly labelled as a total.
- [ ] The existing spec asserting `stack: 'account-balance'` is updated to assert the new default, with a comment recording why stacking was removed (so it is not reintroduced as a "fix").
- [ ] Unit tests cover: two accounts produce two unstacked series at their own values; the single-account case is unchanged; the opt-in combined mode (if built) sums correctly.
- [ ] Verified live in the browser: `/accounts` balance history read against the account cards' balances for the same date.
- [ ] Verified via the fallow skill and coding-conventions skill.

## Notes

- `areaStyle: {}` on overlapping unstacked lines will occlude; expect to drop the fill or make it translucent once unstacked.
- This was found by a UX review, not by a failing test — the spec asserted the buggy behaviour, so the suite stayed green. Worth remembering when sampling closed tickets in the next review.
- Related: [TICKET-STAT-42](./TICKET-STAT-42-name-the-savings-measures.md), [TICKET-EXP-09](./TICKET-EXP-09-exclude-linked-transfers-from-sankey.md) — same theme of numbers the user cannot trust.
