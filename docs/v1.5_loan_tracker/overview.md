# Money Mosaic — v1.5 Loan tracker (Overview)

A loan — a mortgage, a car loan, a personal loan, student debt — is one of the largest, longest-running
liabilities a household tracks, but today it's invisible in Money Mosaic beyond an ordinary expense
category — there's no sense of how much principal is left, whether payments are on pace, or how much has
actually been paid down versus what a textbook amortization schedule would predict. v1.5 turns a category
the user **already assigns during normal categorization** into a live payoff picture: remaining balance,
percentage paid off, and a projected payoff date, kept in sync automatically as new transactions are
imported and categorized. Each ticketed line links to a `tickets/TICKET-*.md` file carrying its own user
story, description, as-is/to-be, and acceptance criteria — this file is only the index + build order.

**This is a general loan tracker, not a mortgage-only one — deliberately named and modelled that way so
both the user and future developers never have to guess.** The entity is `Loan`, not `Mortgage`; it carries
a required `loanType` field (`'mortgage' | 'auto' | 'personal' | 'student' | 'other'`) shown as a badge on
every card and used nowhere in the payoff math itself — a mortgage, a car loan, and a personal loan are
amortized identically (principal, fixed annual rate, term), so `loanType` is purely a label for
"what is this," never a branch in the calculation logic. The route is `/loans`, the feature is
`feature-loans/`, the store is `LoansStore`, the repository is `LoansRepository`, and the core logic lives
in `core/loans/` — no "mortgage" identifier appears anywhere in the code, so a reader (or an AI agent)
grepping the codebase never gets a false signal that this only handles home loans. The nav label and page
heading read "Loans." A user creating their first entry picks a type from a dropdown (mortgage is simply
the first/most common option, not a special case).

**Scope is "assigned category counts as payment," full loan model, any loan type.** The tracker reuses
categorization instead of inventing a parallel per-transaction tagging system: each loan links to exactly
one expense category, and any transaction in that category — however it got there (a rule, manual pick, or
import) — counts toward that loan's payoff. Multiple loans are supported (e.g. a mortgage plus a car loan
plus a partner's student loan), each with its own category, its own type, and its own progress. Within a
loan, the model is a **full loan model**: original principal, a fixed annual interest rate, and a term in
months drive a theoretical amortization schedule, which is then reconciled against what the user actually
paid — so an overpayment shows up as being ahead of schedule and interest saved, not just a bigger number
in a progress bar.

**Architecture:** a new routed feature, `/loans` → `feature-loans/` (own `loans.store.ts`,
`loans.routes.ts`, nav entry — same shape as `feature-accounts`/`feature-income`), *not* a dashboard panel
or a tab bolted onto Accounts. New pure aggregation lives in `core/loans/`, mirroring the `core/stats/`
pattern: `amortization.ts` (schedule from principal/rate/term alone, no transaction data, no `loanType`
branching) and `loan-progress.ts` (walks the linked category's actual transactions against that schedule to
compute real balance, principal/interest paid, and schedule drift). One schema-level addition: a new
`loans` table (Dexie schema **v7** — additive, no `.upgrade()` needed, since it's a brand-new empty table;
if v1.4's `grossWageEntries` lands first and claims v7, this becomes v8 — whichever is the next free
version number at implementation time) with its own thin repository, `loans.repository.ts`, following the
existing one-repository-per-entity convention.

## Loans (FR-LOAN — new)

This introduces a new requirement family, **FR-LOAN**. Like v1.4's set, these tickets are **not** mutually
independent, so the list below is ordered by dependency, not by FR number:

- [ ] [TICKET-LOAN-01](./tickets/TICKET-LOAN-01-loan-entity-and-repository.md) — `Loan` entity (with `loanType`), `loans` table, and repository (adds FR-LOAN-1) — prerequisite for every other ticket
- [ ] [TICKET-LOAN-02](./tickets/TICKET-LOAN-02-loans-page-scaffold.md) — Dedicated Loans page (route, store, nav) (adds FR-LOAN-2) — needs LOAN-01
- [ ] [TICKET-LOAN-03](./tickets/TICKET-LOAN-03-create-edit-loan-form.md) — Create/edit loan form, with type + linked-category assignment (adds FR-LOAN-3) — needs LOAN-01, LOAN-02
- [ ] [TICKET-LOAN-04](./tickets/TICKET-LOAN-04-scheduled-amortization-calculation.md) — Scheduled amortization calculation (adds FR-LOAN-4) — pure function, type-agnostic, only needs LOAN-01's types; can be built in parallel with LOAN-02/03
- [ ] [TICKET-LOAN-05](./tickets/TICKET-LOAN-05-actual-payoff-progress.md) — Actual payoff progress from linked transactions (adds FR-LOAN-5) — needs LOAN-04's schedule shape and LOAN-03 to have a real loan + category to compute against
- [ ] [TICKET-LOAN-06](./tickets/TICKET-LOAN-06-loans-overview-cards.md) — Loans overview cards with type badge + payoff progress bar (adds FR-LOAN-6) — needs LOAN-03 (loans to list) and LOAN-05 (progress numbers)
- [ ] [TICKET-LOAN-11](./tickets/TICKET-LOAN-11-archive-delete-loan.md) — Archive/delete a loan (adds FR-LOAN-11) — needs LOAN-01, LOAN-03; independent of the progress/chart tickets, can slot in any time after
- [ ] [TICKET-LOAN-07](./tickets/TICKET-LOAN-07-balance-over-time-chart.md) — Balance-over-time chart, scheduled vs. actual (adds FR-LOAN-7) — needs LOAN-04 + LOAN-05
- [ ] [TICKET-LOAN-08](./tickets/TICKET-LOAN-08-amortization-schedule-table.md) — Amortization schedule table (adds FR-LOAN-8) — needs LOAN-04 only; independent of LOAN-07, can run in parallel
- [ ] [TICKET-LOAN-09](./tickets/TICKET-LOAN-09-linked-payments-list.md) — Linked payments list on loan detail (adds FR-LOAN-9) — needs LOAN-01 + `TransactionsStore`; fairly independent, can slot in any time after LOAN-02
- [ ] [TICKET-LOAN-10](./tickets/TICKET-LOAN-10-ahead-behind-schedule-indicator.md) — Ahead/behind-schedule + interest-saved indicator (adds FR-LOAN-10) — needs LOAN-05, last since it's the most derived figure

## Considered, not ticketed yet

- **Type-specific behaviour** (e.g. escrow handling unique to mortgages, or a residual/balloon payment
  unique to some auto loans) — explicitly out of scope for v1.5. `loanType` is a label only; every loan is
  amortized with the same principal/rate/term math regardless of type. A type-specific calculation mode
  would need its own ticket and its own opt-in, not a silent branch keyed off `loanType`.
- **Variable/adjustable interest rate mid-term** — v1.5 assumes one fixed rate for the full term, for every
  loan type. A rate-change history (multiple rate segments over a loan's life) is a reasonable follow-up
  once the fixed-rate model is proven, but it complicates both the schedule and progress calculations
  enough to warrant its own version.
- **Non-monthly payment frequency** (biweekly/quarterly) — monthly only for v1.5, matching how loans are
  near-universally billed. Would need `amortization.ts` and `loan-progress.ts` both parameterised by
  frequency, plus a UI control; not worth the complexity until a real user asks for it.
- **Forward-looking overpayment "what-if" simulator** ("if I pay €200 extra per month, when do I pay this
  off?") — FR-LOAN-5/FR-LOAN-10 already reconcile *real* overpayments retroactively, but a hypothetical
  forward projection is a distinct feature and a natural v1.5-adjacent follow-up once the actual-progress
  math has shipped and been trusted.
- **Refinancing** (replacing one loan with a new rate/term, carrying forward the remaining balance) — out
  of scope; a user can archive the old loan (LOAN-11) and create a new one with the refinanced terms,
  accepting that the two show up as separate cards rather than one continuous history.
- **Escrow / property tax / insurance bundled into the tracked payment** — v1.5 only models loan paydown
  (principal + interest), for every loan type. If a user's linked category includes escrow or other
  bundled costs, the actual-progress math will over-count principal reduction — worth a callout in the
  create/edit form's help text (LOAN-03), not a ticket of its own.
- **Dashboard integration** (a loan payoff stat card on the main dashboard) — deliberately deferred to keep
  v1.5 scoped to its own page, consistent with how v1.4 kept income off the dashboard. Could return as a
  v1.6-adjacent ticket once the Loans page itself has proven useful.
- **Multiple categories per loan** (e.g. distinguishing a "scheduled payment" category from an "extra
  principal payment" category) — v1.5 keeps a strict one-category-per-loan link for simplicity; the
  actual-progress math already treats every payment as a lump regardless of size, so an extra payment made
  from the same category is already captured. Revisit only if users want the split visualised separately.

## Definition of Done (applies to every ticket)

Per [../../CLAUDE.md](../../CLAUDE.md): `ng lint` + `ng test` + `ng build --configuration development` all
pass, plus a live browser check for any UI-visible change. **This set adds one Dexie schema change**
(LOAN-01's `loans` table, next free schema version — additive, no `.upgrade()` needed) and no changes to
any shipped version block. Every FR-LOAN aggregate derives from existing `Transaction`/`Category` data plus
the new `Loan` entity — no new fields are added to `Transaction` or `Category`. The production bundle
budget in `angular.json` is never raised. Components/stores never touch `appDb` tables directly — always
through a repository (`LoansRepository` for the new table). A loan's linked category must be an active,
`kind: 'expense'` category not already linked to another *active* loan (enforced in the create/edit form,
LOAN-03) — this is a form-level invariant, not a schema constraint, matching how `categoryManual` and other
cross-entity rules are enforced elsewhere in the app. **No file, type, route, or identifier in this feature
should be named "mortgage"** — `loanType: 'mortgage'` is the only place the word appears, as a data value a
user picks, never as a symbol name.
