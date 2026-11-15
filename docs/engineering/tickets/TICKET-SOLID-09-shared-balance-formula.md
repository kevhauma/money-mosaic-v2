# TICKET-SOLID-09 — Client and MCP share one balance formula

- **Area:** Root `shared/` + core/state (`AccountsStore`) + server MCP read tools
- **Released in:** _unreleased_
- **Type:** Refactor
- **Traceability:** CR6-A4 (balance-formula part); FR-STAT-1 (per-account balance) as shown in the app and returned by MCP `get_balances` (read tools of TICKET-MCP-01; `get_balances` itself added untracked in `fb5d1b75`)

## User story

As a user asking an agent for my balances, I want the same figures the Accounts page shows, so the two can never disagree after one side changes how a balance is counted.

## Description

The real bank balance — opening balance plus every transaction amount, joint accounts in full — is written once in `AccountsStore.balancesById` and again in the MCP `get_balances` tool, whose comment says it copies the client. Root `shared/` exists for exactly this: logic both workspaces run. Moving the definition there makes "what counts toward a balance" one function with one spec.

## Current situation (as-is)

- Client: [accounts.store.ts:55-76](../../../src/app/core/state/accounts.store.ts) — `transactionTotalsByAccountId` sums `amount` per account; `balancesById` adds `account.openingBalance`.
- Client history: [account-balance-history.ts:26-50](../../../src/app/core/stats/account-balance-history.ts) — starts a running total at `openingBalance` and adds amounts up to each bucket end.
- Server: [read-tools.ts:55-102](../../../server/src/mcp/read-tools.ts) — `totalsByAccount` (SQL `sum(amount)` per account, optionally `bookingDate <= upTo`) and `getBalances`: `cents(openingBalance + total)`; the docblock (lines 76-79) names the client formula it mirrors.
- Neither side excludes `nullified` rows (a balance is the bank's figure); that agreement is by convention only.

## Desired result (to-be)

- A framework-free module in root `shared/` (e.g. `shared/balance.ts`) exporting `accountBalance(openingBalance, transactionTotal)` and `transactionTotalsByAccount(transactions, upTo?)`, with the rule documented once: all rows count, nullified included, joint at 100%, `bookingDate <= upTo` when given.
- `AccountsStore.balancesById` and `computeAccountBalanceHistory` use it on the client.
- `getBalances` uses `accountBalance` for the addition and either keeps its SQL `sum` (so a 50k-row history isn't loaded into memory) with a comment that the SQL filter must match `transactionTotalsByAccount`, or calls the shared totaller over selected rows. Pick one and justify it in the code; a server spec compares the two either way.
- `shared/` imports nothing, as `server/src/shared-module.spec.ts` enforces.

## Acceptance criteria

- [ ] `accountBalance(1000, -250.5)` is 749.5; `transactionTotalsByAccount` over rows dated 2026-01-10 (+100) and 2026-02-10 (−40) with `upTo` 2026-01-31 gives 100 for that account, and 60 without `upTo`; a nullified row is included.
- [ ] `AccountsStore.balancesById` and MCP `get_balances` return the same balance for the same seeded data (server spec seeds a joint account at 50% and a nullified row, and asserts the full-amount balance).
- [ ] `get_balances` history entries match `accountBalance` with the same `upTo`.
- [ ] No second definition of the opening-plus-sum rule remains in `src/` or `server/src` (grep the two call sites).
- [ ] `shared-module.spec.ts` passes (the new module imports nothing).
- [ ] `npm --prefix server run lint`, `npm --prefix server run typecheck`, `npm run test:server` pass.
- [ ] `ng lint`, `ng test`, `ng build --configuration development` pass.
- [ ] Verified via the fallow skill and coding-conventions skill.

## Notes

- The arithmetic is one addition; the value is the single named rule and the cross-workspace spec. Don't grow it into a balance service.
- No visible change, so no browser check.
- `percentDelta` (the other CR6-A4 duplicate) is [TICKET-SOLID-12](./TICKET-SOLID-12-one-percent-delta.md); IBAN normalisation is CAT-14.
