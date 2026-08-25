# TICKET-ACC-05 — Account card VM and `account-card` extraction for the accounts overview

- **Area:** Accounts
- **Released in:** [v2 Code review (CR4)](../../releases/v2_code_review/overview.md)
- **Type:** Refactor
- **Traceability:** CR4-1 §3 Options A+B ([solution doc](../../releases/v2_code_review/solutions/CR4-01-template-complexity.md))

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

- [x] Zero component-method calls and zero `!` assertions inside the card markup; all display facts come off the VM row.
- [x] VM spec covers: balance join, share display (incl. the null/no-share case), first/last flags after reorder, icon resolution.
- [ ] Reordering, archive/unarchive, and delete flows still work (live browser check) — **skipped**: the user explicitly asked to skip live browser verification for this whole ticket batch. Automated coverage (accounts-overview's `accountCards VM` describe block + account-card.component.spec.ts) confirms the underlying logic and event wiring, but this was never exercised in a real browser.
- [x] `ng lint`, `ng test`, `ng build --configuration development` pass.
- [x] Verified via the fallow skill and coding-conventions skill.

## Notes

- TICKET-ACC-06 extracts the shared balance block used here and in accounts-detail — keep this card's balance markup extraction-friendly (it moves there).
- **VM design note:** `AccountCardVm.shareDisplay` is a non-nullable `number` paired with a `hasShare: boolean` flag, not `number | null` — confirmed via a failed build that Angular's template type-checker doesn't narrow a `!== null` check across repeated signal-input calls (`vm().shareDisplay`) the way it would a plain stable reference, and a share of exactly `0` is a legitimate value the `@if (expr; as alias)` truthy-check pattern (used elsewhere in the same template for `ibanTail`) can't safely gate on. `@let` (available in this Angular version) is a possible alternative that would let `shareDisplay` stay `number | null` and drop `hasShare` — noted as a future simplification, not applied here since it would be the first use of that syntax in the codebase and the current shape is tested and working.
- **Incidental fixes surfaced while verifying** (pre-existing, from TICKET-NG-10's format-settings consolidation, not scoped to this ticket but blocking full-suite `ng test`): added a global `afterEach` reset in `src/test-setup.ts` (the systemic fix for cross-spec-file locale/currency-symbol leakage, replacing the per-file patches from STAT-23/earlier), hardened `transactions-overview.component.spec.ts` with a deterministic `AppSettingsRepository` mock, and excluded `src/test-setup.ts` from `tsconfig.app.json` (it started tripping the app build once it used a Vitest global).
