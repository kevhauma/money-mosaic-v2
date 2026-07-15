# TICKET-LOAN-01 — `Loan` entity, `loans` table, and repository

- **Area:** Loans
- **Type:** Feature
- **Traceability:** adds FR-LOAN-1 (new)

## User story

As a user, I want the app to have a place to store any loan's terms — a mortgage, a car loan, a personal
loan, or anything else — and which category tracks its payments, so every later Loans feature has real
data to work with.

## Description

Introduce the `Loan` entity (general-purpose, tagged with a `loanType` for display only), an additive
Dexie table to persist it, and a thin repository — the data layer every other FR-LOAN ticket builds on. No
UI in this ticket.

## Current situation (as-is)

- [app-db.ts](../../../src/app/core/data-access/app-db.ts) defines `Account`, `Transaction`, `Transfer`,
  `TransferSettings`, `Category`, `Rule`, `MappingProfile`, `ImportBatch` as `type`s, each with a matching
  `.stores()` entry; current shipped schema version is **6** (see the `.version(6)` block).
- `core/data-access/` has one repository per entity (`accounts.repository.ts`,
  `categories.repository.ts`, etc.), each exported through
  [core/data-access/index.ts](../../../src/app/core/data-access/index.ts). No loan-related file exists
  anywhere in the codebase yet.
- `Category` ([app-db.ts:112-124](../../../src/app/core/data-access/app-db.ts#L112-L124)) has no notion of
  being "linked" to anything outside the categorisation/rules system.

## Desired result (to-be)

- New `LoanType` and `Loan` types in `app-db.ts`. **`loanType` is a display label only — it must never
  drive a branch in the amortization or progress math (LOAN-04/LOAN-05); a mortgage, a car loan, and a
  personal loan are amortized identically.**
  ```ts
  export type LoanType = 'mortgage' | 'auto' | 'personal' | 'student' | 'other';

  export type Loan = {
    id?: number;
    name: string;
    loanType: LoanType;
    principal: number; // original loan amount
    interestRate: number; // annual rate, percent (e.g. 3.5 for 3.5%)
    termMonths: number;
    startDate: string; // ISO yyyy-mm-dd
    categoryId: number; // FK -> Category.id; the expense category whose transactions count as payments
    archived: boolean;
    sortOrder: number;
  };
  ```
- A new `.version(<next free number>).stores({ ...full existing table map..., loans: '++id, categoryId, loanType, archived' })` block appended after the current `.version(6)` block — full table map repeated per the project's additive-versioning rule, no `.upgrade()` needed since it's a brand-new empty table.
- `core/data-access/loans.repository.ts` (file and class named `Loans`, not `Mortgage`) following the
  existing repository shape (`getAll`, `add`, `update`, `remove`), mirroring `categories.repository.ts`.
- `Loan`, `LoanType`, and `LoansRepository` exported through `core/data-access/index.ts`.

## Acceptance criteria

- [ ] `LoanType` and `Loan` types defined in `app-db.ts` with the fields above; the table, file, and type names use "loan"/"Loan", never "mortgage"/"Mortgage".
- [ ] New `.version(n)` block is additive — no edits to any existing `.version()` block — and repeats the full table map per the project's Dexie rule.
- [ ] `loans` table indexed on `++id, categoryId, loanType, archived`.
- [ ] `LoansRepository` implements `getAll`/`add`/`update`/`remove`, following the async, repository-per-entity convention; no component or store touches `appDb.loans` directly.
- [ ] Both are exported through `core/data-access/index.ts`.
- [ ] Unit tests cover: repository CRUD round-trips against a real (fake-indexeddb-backed) `appDb` instance, matching how `categories.repository.spec.ts`-style tests are structured, including at least one non-mortgage `loanType`.
- [ ] Verified via the fallow skill and coding-conventions skill.

## Notes

- No seed data — `this.on('populate')` is left untouched; loans are entirely user-created.
- `categoryId` is a plain number field, not a Dexie-enforced foreign key (Dexie has no FK constraints);
  the "one active loan per category" invariant is enforced at the form layer in LOAN-03, not here.
- `'mortgage'` appears exactly once in this ticket's surface area: as one literal value of the `LoanType`
  union. No symbol, file, or table name should contain the word "mortgage" — see the overview's Definition
  of Done.
