# TICKET-TXN-09 — Transactions-overview row VM, `category-select-cell`, and `transaction-row` extraction

- **Area:** Transactions
- **Type:** Refactor
- **Traceability:** CR4-1 §5 Options A+B+C ([solution doc](../solutions/CR4-01-template-complexity.md)) — C included by explicit user decision, overriding the doc's over-extraction caution

## User story

As a developer maintaining the transactions table, I want the row's derived display facts on the `rows()` VM, the per-row category quick-set select as a typed component, and the row itself extracted, so the 166-line page template orchestrates page states instead of rendering row internals.

## Description

Three moves on the row loop: (A) extend the existing `rows()` VM with `ariaLabel` and `categoryId`; (B) extract a `category-select-cell` taking `options` + `selectedId` and emitting a typed `number | undefined`; (C) extract a full `transaction-row` component hosting the cells. The page keeps its legitimate skeleton/empty/table ladder.

## Current situation (as-is)

- [transactions-overview.component.html](../../../src/app/feature-transactions/components/transactions-overview/transactions-overview.component.html) (cognitive 25): checkbox `aria-label` built by string concatenation in the template (which is why `formatDate` is exposed as a bare class field); the per-row category `<select>` renders the full `activeCategories()` option list × ~50 rows; `$any($event.target).value` cast feeds `onCategoryChange`.

## Desired result (to-be)

- `rows()` VM rows carry `ariaLabel` and `categoryId` (string form for `[selected]` logic); the `formatDate` class-field exposure goes away.
- `category-select-cell` component owns the option list template and emits a typed value — the `$any` cast is deleted.
- `transaction-row` component hosts the cells and relays the page's selection/edit/unlink handlers; the page template renders `@for (row) { <app-transaction-row … /> }`.

## Acceptance criteria

- [x] No string concatenation, method calls, or `$any` casts inside row markup; row display facts come off the VM. (The `!` assertions went too — `TransactionRowVm.id` and `transferId` are resolved in the class, so neither the page's `@for`/track nor the unlink button asserts on an optional Dexie id.)
- [x] Category quick-set still respects `categoryManual` semantics (a user pick sets the manual flag exactly as today) — covered by spec. (`onCategoryChange` is unchanged apart from taking an already-typed `number | undefined` instead of parsing a raw string; its three TICKET-TXN-05 specs still assert the `categoryManual: true` write, the set-back-to-Uncategorised write, and the same-category no-op.)
- [x] VM spec covers `ariaLabel` assembly and `categoryId` derivation; select-cell spec covers typed emit incl. the uncategorized case. (New `row view-model (TICKET-TXN-09)` describe block in the overview spec: aria-label from counterparty and from the raw-description fallback, `categoryId` for a known category / an uncategorised row / an id the store doesn't know, plus the archived-excluding option list. `category-select-cell.component.spec.ts` covers the option list, both preselect cases, and the `7` / `undefined` emits.)
- [ ] Selection (row + bulk), inline edit, unlink, and pagination still work (live browser check) — **skipped**: the user explicitly asked to skip live browser verification for this whole ticket batch. `transaction-row.component.spec.ts` (11 tests) covers every relayed event and `transactions-overview.component.spec.ts` keeps its selection/bulk/pagination scenarios, but none of this was exercised in a real browser.
- [x] `ng lint`, `ng test`, `ng build --configuration development` pass. (Lint clean, dev build clean, 1457/1458 tests pass. The one failure — `category-model.worker.spec.ts` "trains on a small labeled dataset" — is a pre-existing 20s-timeout flake in the TF.js training test, reproduced on the unmodified tree before this ticket and in isolation; nothing in this change touches `core/ml`.)
- [x] Verified via the fallow skill and coding-conventions skill. (`fallow audit`: 0 dead-code issues, 0 new clone groups; the overview template's cognitive complexity drops 25 → 9, cyclomatic 7. The remaining CRAP-score findings are the repo-wide baseline for uncovered-by-fallow Angular templates — the already-shipped ACC-05/ACC-06 components report the same class of finding.)

## Notes

- The doc flagged Option C as probable over-extraction (wide input/output surface); the user chose to build it anyway — keep the row component's contract as narrow as the VM allows (one row input + grouped output events) to mitigate.
- The top-level skeleton/empty/table ladder stays — page states are the page's job.
- Coordinate with TICKET-SOLID-01 (../../coding-review-2/tickets/TICKET-SOLID-01-split-transactions-overview.md) if still open — same file.

## Implementation notes

- **`app-transaction-row` is an element, not a `tr` attribute selector.** Hosting the row on `tr[app-transaction-row]` would keep `tbody > tr > td` without a wrapper element, but the project's `@angular-eslint/component-selector` rule requires the selector to *start* with `app-`/`mm-`, which that form fails. The component therefore renders its own `<tr>` and sets `:host { display: contents }` so the table layout is unaffected — the same technique `app-account-balance-block` (TICKET-ACC-06) uses, and the one deviation from the conventions skill's "leave `styleUrls` empty" rule, for structure rather than styling.
- `TransactionRowVm` dropped the old `category: Category | undefined` field: the only consumer was the `<select>`'s `[selected]` logic, now served by the `categoryId` string. An id the store doesn't know still collapses to "Uncategorised", matching the pre-extraction lookup.
- The `<option>` list is stringified once in the page's `categoryOptions()` computed rather than inside each cell, so the ~50 rows share one array instead of each mapping `activeCategories()`.
- Removed alongside: the page's now-unused `formatDate` class field, six template-only imports (`NgIcon`, both pipes, `mm-badge`/`mm-flex`/`mm-text`), and its `provideIcons` block — including `tablerArrowsExchange`, which no template in the feature referenced.
