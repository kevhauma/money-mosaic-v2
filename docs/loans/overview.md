# Loans — ticket index

Every ticket for this area, whichever release shipped it. This file is an **index**: the build order, dependency notes and scope decisions for a given release live in that release's own overview under [docs/releases/](../releases/), linked from each ticket's **Released in** line.

**19 tickets** — 15 done, 4 open.

- [x] [TICKET-LOAN-01](./tickets/TICKET-LOAN-01-loan-entity-and-repository.md) — `Loan` entity, `loans` table, and repository · _v1.7 Loan tracker_
- [x] [TICKET-LOAN-02](./tickets/TICKET-LOAN-02-loans-page-scaffold.md) — Dedicated Loans page · _v1.7 Loan tracker_
- [x] [TICKET-LOAN-03](./tickets/TICKET-LOAN-03-create-edit-loan-form.md) — Create/edit loan form · _v1.7 Loan tracker_
- [x] [TICKET-LOAN-04](./tickets/TICKET-LOAN-04-scheduled-amortization-calculation.md) — Scheduled amortization calculation · _v1.7 Loan tracker_
- [x] [TICKET-LOAN-05](./tickets/TICKET-LOAN-05-actual-payoff-progress.md) — Actual payoff progress from linked transactions · _v1.7 Loan tracker_
- [x] [TICKET-LOAN-06](./tickets/TICKET-LOAN-06-loans-overview-cards.md) — Loans overview cards · _v1.7 Loan tracker_
- [x] [TICKET-LOAN-07](./tickets/TICKET-LOAN-07-balance-over-time-chart.md) — Balance-over-time chart, scheduled vs. actual · _v1.7 Loan tracker_
- [x] [TICKET-LOAN-08](./tickets/TICKET-LOAN-08-amortization-schedule-table.md) — Amortization schedule table · _v1.7 Loan tracker_
- [x] [TICKET-LOAN-09](./tickets/TICKET-LOAN-09-linked-payments-list.md) — Linked payments list on loan detail · _v1.7 Loan tracker_
- [x] [TICKET-LOAN-10](./tickets/TICKET-LOAN-10-ahead-behind-schedule-indicator.md) — Ahead/behind-schedule + interest-saved indicator · _v1.7 Loan tracker_
- [x] [TICKET-LOAN-11](./tickets/TICKET-LOAN-11-archive-delete-loan.md) — Archive/delete a loan · _v1.7 Loan tracker_
- [x] [TICKET-LOAN-12](./tickets/TICKET-LOAN-12-what-if-projection-engine.md) — Forward-looking what-if projection engine · _v1.7 Loan tracker_
- [x] [TICKET-LOAN-13](./tickets/TICKET-LOAN-13-what-if-tab-recurring-overpayment.md) — "What-if" tab on loan detail, with a recurring-overpayment simulator · _v1.7 Loan tracker_
- [x] [TICKET-LOAN-14](./tickets/TICKET-LOAN-14-lump-sum-scenario-with-early-repayment-fee.md) — Lump-sum what-if scenarios, with an estimated early-repayment fee · _v1.7 Loan tracker_
- [x] [TICKET-LOAN-15](./tickets/TICKET-LOAN-15-remaining-caption-overflows-card.md) — Loan card's "remaining" caption escapes the card border · _v2.3 UX review_
- [ ] [TICKET-LOAN-16](./tickets/TICKET-LOAN-16-loan-payments-filter.md) — Only real repayments count toward loan progress (bug fix, FR-LOAN-5 — payments are filtered by category only, so payouts, nullified and pre-start rows count by absolute amount) — independent; do early · _unreleased_
- [ ] [TICKET-LOAN-17](./tickets/TICKET-LOAN-17-what-if-lump-sums-month-end.md) — What-if lump sums land exactly once near month-end (bug fix, FR-LOAN-14 — `addMonths` lets the day overflow, so a month repeats or is skipped) — needs TICKET-SOLID-10 · _unreleased_
- [ ] [TICKET-LOAN-18](./tickets/TICKET-LOAN-18-loans-page-stale-copy.md) — The loans page no longer says loan tracking is "on its way" (bug fix, FR-LOAN-2 — pre-v1.7 placeholder copy in the empty state) — independent · _unreleased_
- [ ] [TICKET-LOAN-19](./tickets/TICKET-LOAN-19-loan-pages-wait-for-data.md) — The loans pages wait for their data (bug fix, FR-LOAN-2 / FR-LOAN-6 — no hydration gate, so loading or a failed load shows "no loans", "Loan not found" or "0% paid") — independent · _unreleased_
