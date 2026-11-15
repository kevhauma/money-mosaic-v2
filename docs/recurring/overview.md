# Recurring — ticket index

Every ticket for this area, whichever release shipped it. This file is an **index**: the build order, dependency notes and scope decisions for a given release live in that release's own overview under [docs/releases/](../releases/), linked from each ticket's **Released in** line.

**15 tickets** — 11 done, 4 open.

- [x] [TICKET-REC-01](./tickets/TICKET-REC-01-recurring-payment-detection.md) — Detect recurring payments: same counterparty, similar amount, regular rhythm · _v2.1 Extra graphs_
- [x] [TICKET-REC-02](./tickets/TICKET-REC-02-recurring-payments-panel.md) — Recurring payments panel: what repeats, what it costs per month · _v2.1 Extra graphs_
- [x] [TICKET-REC-03](./tickets/TICKET-REC-03-upcoming-bills-calendar.md) — Upcoming bills: expected payments as a calendar or a list · _v2.1 Extra graphs_
- [x] [TICKET-REC-04](./tickets/TICKET-REC-04-recurring-change-flags.md) — Flag what changed: price increases, missed payments, stopped series · _v2.1 Extra graphs_
- [x] [TICKET-REC-05](./tickets/TICKET-REC-05-recurring-honours-category-range.md) — The recurring list honours a category's applicability range · _v2.1 Extra graphs_
- [x] [TICKET-REC-06](./tickets/TICKET-REC-06-stopped-series-collapsed.md) — Collapse the stopped series group, closed by default · _v2.1 Extra graphs_
- [x] [TICKET-REC-07](./tickets/TICKET-REC-07-weekly-and-fortnightly-detection.md) — Weekly rhythms survive real data, and fortnightly becomes a cadence · _v2.1 Extra graphs_
- [x] [TICKET-REC-08](./tickets/TICKET-REC-08-fuzzy-description-clustering.md) — A card payment whose description carries a terminal ID still clusters with itself · _v2.1 Extra graphs_
- [x] [TICKET-REC-09](./tickets/TICKET-REC-09-recurring-includes-joint-accounts.md) — Recurring detection sees joint-account payments, at their full amount · _v2.1 Extra graphs_
- [x] [TICKET-REC-10](./tickets/TICKET-REC-10-recurring-table-fits-without-scrolling.md) — The recurring table fits its panel, with long payment names truncated · _v2.1 Extra graphs_
- [x] [TICKET-REC-11](./tickets/TICKET-REC-11-recurring-needs-correction-affordances.md) — Recurring detection can't be corrected, and over-claims · _v2.3 UX review_
- [ ] [TICKET-REC-12](./tickets/TICKET-REC-12-two-step-merge-keeps-payments.md) — Merging recurring series in two steps keeps every payment (bug fix, FR-REC-2 — `applyRecurringOverrides` folds the duplicate's raw series, not its merged form) — independent · _unreleased_
- [ ] [TICKET-REC-13](./tickets/TICKET-REC-13-next-expected-date-calendar-step.md) — Next expected date steps by calendar month (bug fix, FR-REC-1 / FR-REC-3 — `nextExpectedDate` is last date + median gap in days) — needs TICKET-SOLID-10 · _unreleased_
- [ ] [TICKET-REC-14](./tickets/TICKET-REC-14-category-end-no-phantom-payment.md) — A category end date doesn't create a phantom payment (bug fix, FR-REC-3 / FR-CAT-9 — `boundedByCategoryWindow` clamps a later next date onto `activeUntil` instead of dropping it) — independent · _unreleased_
- [ ] [TICKET-REC-15](./tickets/TICKET-REC-15-dismiss-merge-in-flight-guard.md) — Double-clicking Dismiss or Merge records one override (bug fix, FR-REC-2 — no in-flight guard, so two identical overrides are stored) — independent · _unreleased_
