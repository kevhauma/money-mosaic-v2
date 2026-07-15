# TICKET-NG-05 — Share the balance-trend signal scaffolding between the two history charts

- **Area:** Angular patterns (feature-accounts charts)
- **Type:** Refactor
- **Traceability:** CR3-2.3; the granularity default rule is TICKET-STAT-15's
- **Fallow evidence (2026-07-14):** `dup:db831d48` — 109 tokens / 17 lines, the largest clone group in the app

## User story

As a developer, I want the identical `range`/`granularity`/`jointLegContext`/`zoomWindow` computed chains of the two history charts defined once, so a change to the trend pipeline (e.g. a new granularity rule) can't land in one chart and miss the other.

## Description

`AccountBalanceChartComponent` and `NetWorthHistoryChartComponent` wire the exact same reactive scaffolding around `computeAccountBalanceTrends` — they differ only in scope (one account vs. all active accounts) and the final ECharts option builder. Extract a shared helper so ~40 duplicated lines per component collapse and TICKET-STAT-15's "default granularity from the shared range on first render" rule has a single home.

## Current situation (as-is)

- [account-balance-chart.component.ts:74-115](../../../src/app/feature-accounts/components/account-balance-chart/account-balance-chart.component.ts) — `range`, `granularity` signal, `jointLegContext`, `points`, `zoomWindow` computeds.
- [net-worth-history-chart.component.ts:83-124](../../../src/app/feature-accounts/components/net-worth-history-chart/net-worth-history-chart.component.ts) — the same five members, near-verbatim (`series` instead of `points`).

## Desired result (to-be)

- A shared factory (e.g. `balanceTrendSignals(accounts: Signal<Account[]>)` in feature-accounts, or `core/stats` if it stays store-free) returning `{ granularity, series, zoomWindow }`; each component keeps only its inputs, its option-builder computed, and its click handler.
- The `jointLegContext` construction (currently duplicated including its explanatory comment) lives inside the factory.

## Acceptance criteria

- [x] Both charts render identically to before (same option object for the same inputs — assert via the existing pure option-builder specs, untouched by this change) and the granularity picker still defaults per TICKET-STAT-15 and stays independent per chart afterwards (each component keeps its own `balanceTrendSignals()` call, so its `granularity` signal is a separate instance).
- [x] `dup:db831d48` no longer appears in `fallow dupes` — not independently re-verified (fallow's `git diff` invocation still fails against this repo's git 2.22.0, the same environment limitation TICKET-PERF-07 hit), but the ~40 duplicated lines per component this clone group pointed at (the `range`/`granularity`/`jointLegContext`/`points-or-series`/`zoomWindow` chain) no longer exist in either component — both now call the single `balanceTrendSignals()` factory.
- [x] Unit tests cover the factory: default granularity derivation, zoom window from the shared range, and jointLegContext wiring — see `balance-trend-signals.spec.ts` (granularity default, zoomWindow wiring, a joint-account jointSpend-stake assertion, and independent series per accounts-list input).
- [x] Verified via the coding-conventions skill (conventions-reviewer subagent, clean, no findings) — the fallow skill couldn't run for the reason above, not skipped silently. Live browser check: net-worth history chart (Accounts page) renders, granularity switch (Month → Quarter → back) redraws correctly, zoom slider present; account detail's balance chart renders and its click-through drilldown to `/transactions` with the right account/date-range query params was confirmed working. No console errors across the session.

## Notes

- The two `onChartClick` handlers differ intentionally (drilldown to transactions vs. navigate to account) — left on the components, untouched.
- The factory (`feature-accounts/balance-trend-signals.ts`) takes `accounts: Signal<Account[]>` as its only parameter and injects its own store dependencies (`AccountsStore`/`TransactionsStore`/`TransfersStore`/`CategoriesStore`/`RangeStore`) rather than taking them as parameters — same idiom as `shared/utils/debounced-text.ts`'s `debouncedTextSignal()`. Must be called from an injection context (both call sites are component field initializers, sequenced after TICKET-SOLID-05's store relocation to `core/state`).
