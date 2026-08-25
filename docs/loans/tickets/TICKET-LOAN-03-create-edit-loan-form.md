# TICKET-LOAN-03 — Create/edit loan form

- **Area:** Loans
- **Released in:** [v1.7 Loan tracker](../../releases/v1.7_loan_tracker/overview.md)
- **Type:** Feature
- **Traceability:** adds FR-LOAN-3 (new)

## User story

As a user, I want to create a loan of any type — mortgage, auto, personal, student, or other — with its
loan terms, and pick which expense category tracks its payments, so the app knows what to track and where
the payments come from.

## Description

A modal form (type, name, principal, interest rate, term, start date, linked category) that creates or
edits a `Loan`, reusing the existing form component shapes from `feature-accounts`/`feature-categories`.

## Current situation (as-is)

- [account-form.component.ts](../../../src/app/feature-accounts/components/account-form/account-form.component.ts)
  is the closest precedent: a `MmModalComponent`-hosted `ReactiveFormsModule` form using
  `InputComponent`/`SelectComponent`/`ButtonComponent` from `@/shared/ui`, with a form-level `ValidatorFn`
  for cross-field invariants (there: unique co-owner IBANs).
- `CategoriesStore.activeCategories` ([categories.store.ts](../../../src/app/feature-categories/categories.store.ts))
  is the existing computed for populating a category picker, already used elsewhere (e.g. rule-form).
- No loan form exists yet; `LoansStore` (LOAN-02) currently only exposes CRUD with no validation around
  `categoryId` uniqueness.

## Desired result (to-be)

- `feature-loans/components/loan-form/loan-form.component.ts`: `MmModalComponent`-hosted reactive form
  with fields `loanType` (required, `SelectComponent` with options Mortgage/Auto/Personal/Student/Other —
  presented as an ordinary dropdown, mortgage is not visually distinguished or defaulted specially),
  `name` (required), `principal` (required, > 0), `interestRate` (required, 0–100), `termMonths` (required,
  > 0, integer), `startDate` (required, defaults to today), `categoryId` (required, `SelectComponent`
  populated from `CategoriesStore.activeCategories().filter(c => c.kind === 'expense')`).
- A form-level `ValidatorFn` (mirroring `uniqueCoOwnerIbansValidator`'s shape) rejects a `categoryId`
  already used by another **active** loan, regardless of `loanType` — a mortgage and a car loan cannot
  share a category any more than two mortgages could. Excludes the loan currently being edited. Surfaced
  as a clear inline error ("This category is already linked to <loan name>").
- Help text under the category field explains the "assigned category" model: any transaction in this
  category counts toward payoff, and it should be principal+interest only (no escrow/tax bundled in for a
  mortgage, no bundled insurance for an auto loan, etc.).
- `LoansOverviewComponent` (LOAN-02's shell) gets an "Add loan" button opening the form in create mode;
  LOAN-06's cards will later open it in edit mode.

## Acceptance criteria

- [x] Form validates all required fields, including a `loanType` selection, and rejects a `categoryId` already linked to another active loan (of any type), with a readable error naming the conflicting loan. (`loan-form.component.ts` — `duplicateCategoryValidator` (form-level) + per-field validators; `loan-form.component.spec.ts` covers both; confirmed live in the browser below.)
- [x] Submitting calls `LoansStore.addLoan`/`updateLoan`, never `appDb` directly. (`loans-overview.component.ts`'s `saveLoan`; `loans-overview.component.spec.ts`'s "delegates a new loan to LoansStore.addLoan" test asserts on the mocked `LoansRepository.add`, never `appDb`.)
- [x] Category picker only lists active, `kind: 'expense'` categories. (`loan-form.component.ts`'s `categoryOptions` computed — `activeCategories().filter(c => c.kind === 'expense')`; confirmed live — the picker showed only the seeded expense categories, e.g. no "Salary"/"Other Income".)
- [x] `sortOrder` is assigned consistently with how `accounts`/`categories` assign it on creation (append to end). (`loans.store.ts`'s `addLoan` — highest existing `sortOrder` + 1, the `GoalsStore.addGoal` convention; confirmed live — the mortgage got `sortOrder: 0`, the car loan `sortOrder: 1`, read directly from IndexedDB.)
- [x] Unit tests cover: valid submission for at least two different `loanType` values, missing-required-field rejection, duplicate-active-category rejection across different loan types, and that editing a loan excludes itself from the duplicate check. (`loan-form.component.spec.ts` — mortgage + auto submissions, a missing-all-fields rejection, a mortgage/auto cross-type duplicate rejection, and an editing-excludes-itself case plus a still-flags-a-genuine-conflict-while-editing case.)
- [x] Verified via the fallow skill and coding-conventions skill. (`ng lint`/`ng test`/`ng build --configuration development` all pass; `npx fallow dead-code --baseline .fallow-baseline.json --fail-on-issues --quiet` and `npx fallow health --complexity --max-cognitive 30 --max-cyclomatic 30 --max-crap 1000 --fail-on-issues --quiet` both exit 0. No coding-conventions violations found.)
- [x] Verified live in the browser: create a mortgage-type loan and a separate auto-type loan on different categories, then attempt a third loan reusing one of those categories and confirm the inline error names the correct existing loan. (`preview_start` on `dev`; added "Home mortgage" (mortgage, Housing category) and "Car loan" (auto, Transport category) — both persisted to IndexedDB's `loans` table with `sortOrder` 0/1; a third "Personal loan" (personal type) reusing the Housing category was rejected inline with exactly "This category is already linked to Home mortgage." and the dialog stayed open — no submission reached the repository.)

## Notes

- `interestRate` is stored as a plain percentage number (e.g. `3.5`), consistent with how `Account`
  doesn't use fractional rates elsewhere in the codebase — keep it human-readable, not a 0–1 fraction.
- Archiving a loan's linked category independently (via Categories) is not blocked by this ticket;
  LOAN-05's progress calculation simply has fewer transactions to find if that happens. Not handled specially.
- `loanType` options are presented in a fixed, flat order (Mortgage, Auto, Personal, Student, Other) — no
  type is pre-selected by default, so the user makes an explicit choice every time.
