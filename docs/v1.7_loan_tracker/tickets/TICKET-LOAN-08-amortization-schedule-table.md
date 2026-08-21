# TICKET-LOAN-08 — Amortization schedule table

- **Area:** Loans
- **Type:** Feature
- **Traceability:** adds FR-LOAN-8 (new)

## User story

As a user, I want to see the full month-by-month scheduled breakdown of principal vs. interest for any
loan, so I understand where my money is going over the life of the loan, whatever it's for.

## Description

A paginated table on the Loan detail page rendering LOAN-04's `computeAmortizationSchedule` output — one
row per month with payment, principal portion, interest portion, and remaining balance.

## Current situation (as-is)

- `shared/ui/paginator/paginator.component.ts` is the existing pagination primitive, already used by the
  transactions list — reuse it here rather than rendering a 360-row table unpaginated for a 30-year
  mortgage (shorter for a car or personal loan, but still worth paginating consistently).
- LOAN-04's `computeAmortizationSchedule` already returns the full `AmortizationEntry[]` needed; no new
  core logic required for this ticket.

## Desired result (to-be)

- `feature-loans/components/loan-amortization-table/loan-amortization-table.component.ts`: reads a `loan`
  input, computes `computeAmortizationSchedule(...)` via a component-level `computed`, and renders it
  through `PaginatorComponent` (same page-size convention as the transaction list).
- Columns: Month/Date, Payment, Principal, Interest, Remaining balance — currency-formatted consistently
  with `SignedAmountPipe`/existing currency display conventions.
- Rendered on the Loan detail page (`/loans/:id`), as a collapsible/secondary panel below the balance chart
  (LOAN-07) — this is reference detail, not the primary at-a-glance view.

## Acceptance criteria

- [x] Table renders all `termMonths` rows via `PaginatorComponent`, not an unpaginated full dump. (`loan-amortization-table.component.ts` — `createPagination({ items: rows, pageSize: 12 })`; `loan-amortization-table.component.spec.ts`'s pagination-math test asserts `rows()` holds all 30 rows while `pagedItems()` holds only 12.)
- [x] Columns match the `AmortizationEntry` fields, currency-formatted. (Month/Date/Payment/Principal/Interest/Remaining balance, each `formatCurrency()`/`formatDate()`d; `loan-amortization-table.component.spec.ts`'s exact-match test against `computeAmortizationSchedule`'s own output.)
- [x] Re-renders correctly if the loan's terms are edited (LOAN-03's edit path) — the computed schedule updates, no stale cached table. (`rows` is a `computed()` over `loan()` alone; `loan-amortization-table.component.spec.ts`'s "recomputes the schedule (and clamps the page) when the loan input changes" test — shrinks `termMonths` from 30 to 6 while on page 3, confirms both the row count and the clamped `currentPage` update.)
- [x] Behaviour is identical regardless of `loanType` — no type-specific column or formatting. (`loan-amortization-table.component.spec.ts`'s "renders identical columns/behaviour for a mortgage and a non-mortgage loanType" test compares the rendered `<thead>` text byte-for-byte.)
- [x] Unit tests cover: the component's computed schedule wiring (pagination slicing, not the math itself — that's LOAN-04's test surface). (`loan-amortization-table.component.spec.ts` — pagination math, last-page/last-row content, edit-triggered recompute+clamp, mortgage/auto parity, and the formatted-column exact-match check; none re-test `computeAmortizationSchedule`'s own math.)
- [x] Verified via the fallow skill and coding-conventions skill. (`ng lint`/`ng test`/`ng build --configuration development` all pass; both fallow gates exit 0. No coding-conventions violations found.)
- [x] Verified live in the browser: open a loan's detail page, page through the schedule table, confirm the last row's remaining balance is 0. (`preview_start` on `dev`; opened `/loans/1`, expanded the collapsed "Amortization schedule" panel — page 1 showed months 1–12 with real formatted currency/date values; jumped to page 20 of 20 and confirmed month 240 (the final row) shows exactly €0.00 remaining balance.)

## Notes

- Independent of LOAN-07 — both only need LOAN-04's output, can be built in either order or in parallel.
