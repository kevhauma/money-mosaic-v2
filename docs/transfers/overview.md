# Transfers — ticket index

Every ticket for this area, whichever release shipped it. This file is an **index**: the build order, dependency notes and scope decisions for a given release live in that release's own overview under [docs/releases/](../releases/), linked from each ticket's **Released in** line.

**8 tickets** — 6 done, 2 open.

- [x] [TICKET-TRF-01](./tickets/TICKET-TRF-01-clear-category-on-link.md) — Clear category when a transaction is linked as a transfer · _v1.0 Foundation_
- [x] [TICKET-TRF-02](./tickets/TICKET-TRF-02-classify-savings-movements.md) — Classify money moved into savings as "savings", not "expense" · _v1.0 Foundation_
- [x] [TICKET-TRF-03](./tickets/TICKET-TRF-03-guard-partner-inflow-matching.md) — Guard transfer auto-matching against one-sided partner inflows · _v1.1 Joint accounts_
- [x] [TICKET-TRF-04](./tickets/TICKET-TRF-04-normalize-iban-matching.md) — Normalize IBAN comparisons for savings/transfer detection · _v1.1 Joint accounts_
- [x] [TICKET-TRF-05](./tickets/TICKET-TRF-05-mutual-iban-corroboration.md) — High-confidence matching links my own transfer leg, not a co-owner's same-amount contribution · _v1.1 Joint accounts_
- [x] [TICKET-TRF-06](./tickets/TICKET-TRF-06-make-transfer-review-visible.md) — Transfer review is invisible, and linked pairs still read "Uncategorised" · _v2.3 UX review_
- [ ] [TICKET-TRF-07](./tickets/TICKET-TRF-07-auto-link-respects-manual-category.md) — Auto-link never clears a hand-set category or re-links an unlinked pair (bug fix, CR5-3, FR-TRF-2 — the auto-link pool ignores `categoryManual` and nothing records an unlink; independent) · _unreleased_
- [ ] [TICKET-TRF-08](./tickets/TICKET-TRF-08-transfer-settings-form-after-hydration.md) — The transfer settings form shows the saved settings (bug fix, CR6-10, FR-TRF-4 — the form is filled once from the store's pre-load defaults; independent) · _unreleased_
