# TICKET-STAT-53 — "All time" follows the data and resets on sign-out

- **Area:** Date ranges (core/state)
- **Released in:** _unreleased_
- **Type:** Bug fix
- **Traceability:** CR6-24; fixes FR-STAT-7's `all-time` preset (TICKET-STAT-03, STAT-36/37) and the sign-out wipe of TICKET-AUTH-02

## User story

As a user who picks "All time", I want it to always mean "from my first transaction to today", so older history I import later, and tomorrow's transactions, are included — and so the next person who signs in on this browser doesn't inherit my dates.

## Description

"All time" is turned into two absolute dates once, when it is picked, and stored. Nothing re-resolves it: history imported later, or a day passing, leaves it stale, and picking it before transactions load stores today–today. `RangeStore` is exempt from the sign-out wipe as "UI choice, not data", but those stored dates are derived from the signed-in user's data.

## Current situation (as-is)

- [page-range-control.ts:128-139](../../../src/app/core/state/page-range-control.ts) — on `all-time`, calls `computeFullHistoryRange(activeAccounts, transactions, todayIso())` once and hands the result to `setPreset`.
- [range-state.store.ts:192-198](../../../src/app/core/state/range-state.store.ts) — `setPreset` stores that range as `fromExpr`/`toExpr`, or `{ from: todayIso(), to: todayIso() }` when none was passed; `resolveRawBoundary` reads the stored dates back for `all-time` from then on.
- [full-history-range.ts:13-34](../../../src/app/core/stats/full-history-range.ts) — `from` is the earliest of active accounts' opening dates and their transactions; with no accounts loaded yet it is today–today.
- [store-reset-registry.spec.ts:42-43](../../../src/app/core/store-reset/store-reset-registry.spec.ts) — `core/state/range-state.store.ts` is listed in `HOLDS_NO_USER_DATA`, so it never registers for the sign-out reset. User A picks "All time" (2019-03-01..), signs out; user B signs in on the same tab and the dashboard range starts at A's 2019-03-01.
- Examples: pick "All time" on 2026-11-14, import a 2018 export, or come back on 2026-11-16 — the range still ends 2026-11-14 and starts at the old earliest date.

## Desired result (to-be)

- While `quickRangeId` is `all-time`, `from`/`to` (and the URL mirror) are computed on read from the current accounts and transactions and today's date, so they follow new imports, deletes and the date. Nothing data-derived is frozen into `fromExpr`/`toExpr` for that preset.
- Until the stores the computation reads have hydrated, the page shows its loading state rather than resolving to today–today (the dashboard already gates on transactions + accounts).
- `RangeStore` registers for the sign-out reset (`registerStoreReset`) and returns every page to its default range; its entry leaves `HOLDS_NO_USER_DATA`.

## Acceptance criteria

- [ ] Pick "All time" with history from 2020-01-05, then add a transaction dated 2018-06-01: the range now starts 2018-06-01 without re-picking.
- [ ] Pick "All time" on 2026-11-14 (fake clock); advance to 2026-11-16: `to` is 2026-11-16.
- [ ] Picking "All time" before `TransactionsStore` hydrates, then letting it hydrate with history from 2020-01-05: the range is 2020-01-05..today, never today..today after load.
- [ ] Sign out after selecting "All time" (or any custom range), sign in as another user on the same tab: every page's range is back to its default.
- [ ] `store-reset-registry.spec.ts` no longer lists `range-state.store.ts`, and the "every signalStore is accounted for" case passes.
- [ ] Whatever reads the accounts/transactions for `all-time` does not make `TransactionsStore` hydrate on a page that never picks `all-time` (PERF-07's hydrate-on-first-injection stays intact).
- [ ] Unit tests cover the cases above in `range-state.store.spec.ts` / `page-range-control` specs.
- [ ] `ng lint`, `ng test`, `ng build --configuration development` pass.
- [ ] Live browser check: pick "All time", import an older CSV, see the range widen; sign out and in as a second user, see the default range.
- [ ] Verified via the fallow skill and coding-conventions skill.

## Notes

- Where the live computation sits is the implementer's call: inside `RangeStore` (it is in `core/state` beside `AccountsStore`/`TransactionsStore`, but must not inject them eagerly, see the PERF-07 criterion) or in `pageRangeControl`, with every reader of `RangeStore.from/to` going through it. Pick one and say why in the code.
- Recording "All time" in recently used ranges (TICKET-STAT-40) records the resolved dates today; keep that as is or record the preset id. Not required here.
- `RangeStore` still has its own UTC `todayIso` copy (line 46); [TICKET-SOLID-08](../../engineering/tickets/TICKET-SOLID-08-local-today.md) replaces it. No dependency either way.
