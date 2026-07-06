# TICKET-TXN-02 — Virtualize the transactions table

- **Area:** Transactions
- **Traceability:** NFR-PERF-1 (supersedes the "paginate at 50 rows" note in ui-layout-spec.md §4.3)
- **Source story:** user-stories.md §3 — *"As a developer, I want the transactions table to virtualize row rendering (e.g. CDK virtual scroll) instead of rendering every filtered row at once, so the screen stays smooth at 10k+ transactions."*

## Description

Render only the rows currently in view (windowed/virtual scrolling) so the transactions table stays smooth with 10k+ transactions, rather than materialising the whole filtered set.

## Current situation (as-is)

- The table is currently **paginated**, not virtualized: [TransactionsOverviewComponent](../../../src/app/feature-transactions/components/transactions-overview/transactions-overview.component.ts) uses `PAGE_SIZE = 50` and `createPagination(...)`, and `rows` joins only `pagination.pagedItems()` — so the DOM only ever holds ≤50 `<tr>`.
- This already bounds DOM cost (the original perf risk), but the story explicitly asks for **virtual scroll** as the intended UX (continuous scrolling of the full filtered set) rather than page-by-page navigation.
- `filteredTransactions` still computes the full filtered array in memory (that's expected and fine); only rendering needs windowing.

## Desired result (to-be)

- A single scrollable table over the full filtered result set, rendering only the visible window of rows (e.g. Angular CDK `cdk-virtual-scroll-viewport`), staying smooth at 10k+ rows.
- The per-row join (account name, category, transfer, likely-transfer, selected) remains bounded to the rendered window, as pagination bounds it today.

## Acceptance criteria

- [ ] The transactions table renders only the visible row window; DOM `<tr>` count stays roughly constant regardless of filtered result size (verify at 10k+ rows).
- [ ] Scrolling through 10k+ filtered transactions is smooth (no long frames / visible jank); the full set is reachable by scrolling.
- [ ] The per-row view-model join stays scoped to rendered rows (no full-set `.find()` per row) — preserving the CR-2.3 optimisation.
- [ ] All existing table behaviour is preserved: structural + debounced-text filtering, sort (newest first), row selection (incl. TICKET-TXN-01 bulk selection and transfer linking), edit, transfer link/unlink, likely-transfer badges, and drill-down query-param pre-filtering (FR-STAT-6).
- [ ] Selection state survives scrolling (selecting a row, scrolling it out of view, and back, keeps it selected).
- [ ] A decision is recorded on pagination: either replaced by virtual scroll or kept as an alternative — the two shouldn't silently conflict. Whichever is chosen, no dead pagination code is left wired to the template.
- [ ] The `angular.json` bundle budget is **not** raised; if CDK scrolling adds weight, it's lazy-loaded within the transactions feature (per Hard rules).
- [ ] Unit tests updated to reflect the rendering model (viewport-driven rows rather than paged slice), and existing transactions-overview specs still pass.

## Notes / open question

- Because pagination already caps DOM cost, confirm with product whether virtual scroll is still wanted for v1 or whether the paginated implementation satisfies NFR-PERF-1. If the latter, this ticket closes as "satisfied by pagination" with a note; otherwise implement virtual scroll as above.
- `@angular/cdk` scrolling is the natural fit given the Angular 21 stack; watch bundle size.
