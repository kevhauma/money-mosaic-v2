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

- [ ] Table renders all `termMonths` rows via `PaginatorComponent`, not an unpaginated full dump.
- [ ] Columns match the `AmortizationEntry` fields, currency-formatted.
- [ ] Re-renders correctly if the loan's terms are edited (LOAN-03's edit path) — the computed schedule updates, no stale cached table.
- [ ] Behaviour is identical regardless of `loanType` — no type-specific column or formatting.
- [ ] Unit tests cover: the component's computed schedule wiring (pagination slicing, not the math itself — that's LOAN-04's test surface).
- [ ] Verified via the fallow skill and coding-conventions skill.
- [ ] Verified live in the browser: open a loan's detail page, page through the schedule table, confirm the last row's remaining balance is 0.

## Notes

- Independent of LOAN-07 — both only need LOAN-04's output, can be built in either order or in parallel.
