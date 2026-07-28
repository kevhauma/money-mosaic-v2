# TICKET-ACC-05 — Account card VM and `account-card` extraction for the accounts overview

- **Area:** Accounts
- **Type:** Refactor
- **Traceability:** CR4-1 §3 Options A+B ([solution doc](../solutions/CR4-01-template-complexity.md))

## User story

As a developer editing the accounts overview (an accelerating-churn file), I want each account card fed by a precomputed VM row and rendered by its own component, so the `@for` loop stops calling five component methods per account on every OnPush pass.

## Description

The clearest method-calls-in-loops case: build an `AccountCardVm` computed joining accounts with balances, shares, sort position, and resolved icon name, then extract the card as a presentational component emitting the row actions.

## Current situation (as-is)

- [accounts-overview.component.html](../../../src/app/feature-accounts/components/accounts-overview/accounts-overview.component.html) (cognitive 26): the `@for` card calls `balanceFor(account)` twice, `shareFor(account)` twice (plus a `!` assertion), `isFirst(account)`, `isLast(account)`, `accountIconName(account.icon)` — the per-row shape CR-2.3 eliminated from the transactions table.

## Desired result (to-be)

- One `computed()` producing `{ account, balance, shareDisplay, isFirst, isLast, iconName, ibanTail }[]`; the replaced methods become private helpers or disappear.
- An `account-card` component taking one VM row and emitting `edit`/`archive`/`delete`/`moveUp`/`moveDown`; overview template becomes header + grid of cards + empty state.

## Acceptance criteria

- [ ] Zero component-method calls and zero `!` assertions inside the card markup; all display facts come off the VM row.
- [ ] VM spec covers: balance join, share display (incl. the null case), first/last flags after reorder, icon resolution.
- [ ] Reordering, archive/unarchive, and delete flows still work (live browser check).
- [ ] `ng lint`, `ng test`, `ng build --configuration development` pass.
- [ ] Verified via the fallow skill and coding-conventions skill.

## Notes

- TICKET-ACC-06 extracts the shared balance block used here and in accounts-detail — keep this card's balance markup extraction-friendly (it moves there).
