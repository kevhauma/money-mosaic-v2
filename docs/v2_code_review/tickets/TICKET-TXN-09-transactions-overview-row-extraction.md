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

- [ ] No string concatenation, method calls, or `$any` casts inside row markup; row display facts come off the VM.
- [ ] Category quick-set still respects `categoryManual` semantics (a user pick sets the manual flag exactly as today) — covered by spec.
- [ ] VM spec covers `ariaLabel` assembly and `categoryId` derivation; select-cell spec covers typed emit incl. the uncategorized case.
- [ ] Selection (row + bulk), inline edit, unlink, and pagination still work (live browser check).
- [ ] `ng lint`, `ng test`, `ng build --configuration development` pass.
- [ ] Verified via the fallow skill and coding-conventions skill.

## Notes

- The doc flagged Option C as probable over-extraction (wide input/output surface); the user chose to build it anyway — keep the row component's contract as narrow as the VM allows (one row input + grouped output events) to mitigate.
- The top-level skeleton/empty/table ladder stays — page states are the page's job.
- Coordinate with TICKET-SOLID-01 (../../coding-review-2/tickets/TICKET-SOLID-01-split-transactions-overview.md) if still open — same file.
