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

- [ ] Both charts render identically to before (same option object for the same inputs — assert via the existing pure option-builder specs) and the granularity picker still defaults per TICKET-STAT-15 and stays independent per chart afterwards.
- [ ] `dup:db831d48` no longer appears in `fallow dupes`.
- [ ] Unit tests cover the factory: default granularity derivation, zoom window from the shared range, and jointLegContext wiring.
- [ ] Verified via the fallow skill and coding-conventions skill, plus a live browser check of both charts (render, zoom, granularity switch, click-through drilldown/navigation).

## Notes

- The two `onChartClick` handlers differ intentionally (drilldown to transactions vs. navigate to account) — leave them on the components.
- Depending on where the factory lands relative to TICKET-SOLID-05 (store injection), sequence loosely after it or keep the factory store-agnostic (take signals as parameters, as sketched).
