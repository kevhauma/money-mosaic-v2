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

- [x] Series no longer stack by default: a given account's plotted y-value equals that account's balance at that date. (`account-balance-history-chart.component.ts` — `stack: 'account-balance'` is now applied only under the `{ stacked }` option, which defaults to `false`; `areaStyle` drops to `{ opacity: 0.12 }` so overlapping lines stay readable. Pinned by "plots two accounts at their own balances, not at a running total".)
- [x] A point read off the chart matches the balance shown on the same account's card/detail header for the same date. (Already asserted by "plots the account's balancesById figure, not its jointAccountStakeById figure" — the plotted point equals `AccountsStore.balancesById()`, which is exactly what the card renders. Unstacking is what makes that per-series equality true of the *drawn* height too.)
- [x] If a combined/stacked view is retained, it is opt-in and visibly labelled as a total. (`account-balance-history-chart.component.html` — a "Per account" / "Combined total" `join` group, plus an `mm-text` caption that reads "the top edge is the combined total across every account, not any one account's balance" whenever the combined view is on. Held for the session in `ChartOptionsStore` via the new `chartStacked` control, never persisted.)
- [x] The existing spec asserting `stack: 'account-balance'` is updated to assert the new default, with a comment recording why stacking was removed (so it is not reintroduced as a "fix"). (`account-balance-history-chart.component.spec.ts`, "names and colours each line after its account" — the comment above the assertion names the €7,691/€9,206 symptom and says stacking now lives on the opt-in argument, covered by its own case.)
- [x] Unit tests cover: two accounts produce two unstacked series at their own values; the single-account case is unchanged; the opt-in combined mode (if built) sums correctly. (Three new cases in `account-balance-history-chart.component.spec.ts`, plus a component-level case that the chart opens per-account and only stacks once `setStacked(true)` runs, and five cases for `chartStacked` in `chart-options-control.spec.ts`. 18 tests in the chart file, all green.)
- [ ] Verified live in the browser: `/accounts` balance history read against the account cards' balances for the same date. — **deferred, not skipped**: the user chose a single browser pass over the whole v2.3 batch rather than one per ticket; tick this when that pass runs.
- [x] Verified via the fallow skill and coding-conventions skill. (`npx fallow dead-code --baseline … --fail-on-issues` and `npx fallow health --complexity …` both exit 0. The `conventions-reviewer` subagent raised four items, all applied: the toggle's labels/pressed state moved onto a `viewOptions()` computed, the caption moved from a raw `text-xs` to `mm-text variant="caption"`, `stacked` became a trailing options object rather than a sixth positional flag, and the "stacked" wording in `accounts-overview`, `balance-day-tooltip.ts` and `balance-trend-signals.ts` was corrected. Its fifth point — that this is now the 5th inline copy of the segmented-button markup and a `shared/ui` primitive is overdue — is recorded in Notes below rather than built here.)

## Notes

- `areaStyle: {}` on overlapping unstacked lines will occlude; expect to drop the fill or make it translucent once unstacked.
- This was found by a UX review, not by a failing test — the spec asserted the buggy behaviour, so the suite stayed green. Worth remembering when sampling closed tickets in the next review.
- Related: [TICKET-STAT-42](./TICKET-STAT-42-name-the-savings-measures.md), [TICKET-EXP-09](./TICKET-EXP-09-exclude-linked-transfers-from-sankey.md) — same theme of numbers the user cannot trust.
- **Follow-up raised while building this, deliberately not built here:** the "Per account / Combined total" group is the fifth inline copy of the same daisyUI `join` segmented-button markup (`income-yearly-panel`, `model-status`, `settings-currency-locale-section`, `column-map-amount-field`, and now this), while `mm-granularity-picker`/`mm-cycle-picker` are the same pattern already promoted to `shared/ui`. A shared `mm-segmented` primitive is overdue; promoting it is its own ticket.
- **`accountDisplayOrder`'s reversal is now only literally true in the combined view.** TICKET-ACC-09 reverses the card list because echarts draws `series[0]` as the *bottom* band of a stack. Unstacked there is no band order to line up with. The reversal is kept — it is still the chart's series/legend order, and flipping it would silently invert every card's up/down arrow via `storeDirectionFor` — but that re-decision is recorded in `account-list-order.ts`'s doc comment rather than made here.
