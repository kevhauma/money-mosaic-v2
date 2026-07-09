# Money Mosaic — v1.1 Joint accounts

Split out of the v1.5 line item in [../v2/requirements.md](../v2/requirements.md) — *"joint-account splitting (configurable share, own-account deposits excluded)"*. These stories refine v1 behaviour for **joint accounts**: how much of a shared pot counts as *my* net worth, how money arriving from a partner/other person is kept out of my income, and the aggregation/matching pitfalls that follow. FR/NFR IDs trace back to [../v1/finance-app-spec.md](../v1/finance-app-spec.md); where behaviour changes a shipped FR, the story says so explicitly.

**Net-worth model decision (governs this whole section):** joint accounts use **contribution tracking**, not share-of-balance. My stake in a joint account is what *I* put in (deposits from my own accounts + my own income into the pot, at 100%) minus my share of what the pot *spends* — not a flat fraction of the bank balance. This keeps transfers into a joint account netting to zero in net worth. The trade-off (an informal "my partner owes the pot" balance can show up as my net worth) is accepted and documented in the tickets.

**QoL addendum (added after the original seven shipped):** six unrelated small changes — reordering accounts/categories, faster inline categorisation, a unified date-range field, viewing a transaction's original CSV line, and a bugfix — folded into this same version rather than a new one, since they're meant to ship **before** any further new-feature work (e.g. v1.4 Income growth). None of the six depend on the joint-account work above or on each other; they're grouped here by timing, not by relationship. TICKET-TRF-04 is a **bugfix**, everything else is a **Feature**.

## 1. Accounts (FR-ACC)

- [x] As someone with a shared account, I want to set my ownership/contribution share on a joint account, so the app has the input it needs to count only my part of the shared money — pre-filled as `1 / (number of people on the account)` once co-owners are registered (e.g. 50% for 2 people, 33% for 3), staying editable and only committed once I confirm it ([TICKET-ACC-02](./tickets/TICKET-ACC-02-joint-ownership-share.md), extends FR-ACC-1)
- [x] As someone sharing an account with one or more other people, I want to register each co-owner and the IBAN(s) they pay in from, so the app can tell each person's contributions apart from mine and from external money ([TICKET-ACC-03](./tickets/TICKET-ACC-03-multi-owner-coowner-ibans.md), extends FR-ACC-1 / FR-ACC-4)
- [ ] As a user, I want to reorder my accounts, so the accounts overview page and its net-worth chart (one band per account, legend in account order) reflect the order that matters to me instead of import order ([TICKET-ACC-04](./tickets/TICKET-ACC-04-manual-account-ordering.md), extends FR-ACC-1) — *QoL addendum*

## 3. Transactions (FR-TXN)

- [ ] As someone with a shared account, I want to manually correct a transaction that landed in the wrong "personal vs. joint" bucket — a joint expense I accidentally fronted from my own account, a personal expense accidentally paid from the joint account (mine or a co-owner's) — so a one-off mistake doesn't distort my net worth or expense stats, while a co-owner reimbursing *my* personal expense into the joint pot keeps working with no extra step from me ([TICKET-TXN-03](./tickets/TICKET-TXN-03-manual-attribution-override.md), extends FR-TXN-1 / FR-TXN-2)
- [ ] As a user, I want to mark any transaction as neither income nor expense, so a situation the app's categorisation or joint-account model doesn't support (a correction, a reversal, anything that doesn't fit) doesn't distort my stats — without having to invent a category or an ownership split for it ([TICKET-TXN-04](./tickets/TICKET-TXN-04-nullify-transaction.md), extends FR-TXN-1, changes FR-STAT-2 / FR-STAT-3)
- [ ] As a user, I want to set a transaction's category directly from the transaction list, without opening the edit modal, so clearing a backlog of uncategorised transactions doesn't take four clicks each ([TICKET-TXN-05](./tickets/TICKET-TXN-05-inline-category-quickset.md), extends FR-TXN-2) — *QoL addendum*
- [ ] As a user, I want to see the original CSV line a transaction came from, so I can check what the bank actually sent when a mapped field looks wrong ([TICKET-TXN-06](./tickets/TICKET-TXN-06-original-csv-line-detail.md), extends FR-TXN-1 / FR-IMP-1) — *QoL addendum*

## 4. Categorisation (FR-CAT)

- [x] As someone with a shared account, I want money paid into a joint account by my partner or another person marked as a non-income "contribution" that still affects the balance but never counts as my income, so a partner's salary landing in our joint account doesn't inflate my income and savings rate ([TICKET-CAT-02](./tickets/TICKET-CAT-02-neutral-category-kind.md), extends FR-CAT-1 / FR-STAT-2)
- [ ] As a user, I want to reorder my categories, so the ones I use most often sit at the top of every category picker (transaction edit, bulk assign, filters, rule actions) instead of wherever import or alphabetical order put them ([TICKET-CAT-03](./tickets/TICKET-CAT-03-manual-category-ordering.md), extends FR-CAT-1) — *QoL addendum*

## 6. Statistics & Dashboard (FR-STAT)

- [x] As someone with a shared account, I want my net worth to count only my contribution to a joint account (my deposits and income in, minus my share of joint spending) rather than the whole shared balance, so the number reflects money that is actually mine ([TICKET-STAT-03](./tickets/TICKET-STAT-03-contribution-net-worth.md), changes FR-STAT-1 / FR-TRF-1 semantics for joint accounts)
- [ ] As a user, I want the from/to date fields to be a single range control, so picking a custom period takes one interaction instead of juggling two separate date inputs — in both the topbar range switcher and the transaction filters ([TICKET-STAT-10](./tickets/TICKET-STAT-10-unified-date-range-picker.md), extends FR-STAT-7, touches FR-TXN-3) — *QoL addendum*

## 5. Transfers (FR-TRF)

- [ ] As someone with a shared account, I want a partner's one-sided deposit into a joint account to not be mistaken for a transfer between my own accounts, so an unrelated same-amount transaction of mine isn't silently linked to it ([TICKET-TRF-03](./tickets/TICKET-TRF-03-guard-partner-inflow-matching.md), extends FR-TRF-3 / FR-TRF-5)
- [ ] As a saver, I want money I move to my savings account detected as savings even when the IBAN on the transaction and on the account are formatted differently (spaces, case), so my savings rate reflects reality instead of silently reading 0% ([TICKET-TRF-04](./tickets/TICKET-TRF-04-normalize-iban-matching.md), fixes FR-TRF-1 / FR-TRF-3 / FR-TRF-5, FR-STAT-2) — *QoL addendum, bugfix*

## Considered, not ticketed yet

- **Drag-and-drop reordering** — TICKET-ACC-04/TICKET-CAT-03 default to move-up/move-down buttons to avoid pulling in `@angular/cdk` (not currently a dependency) just for two lists. A real drag interaction is a reasonable follow-up if buttons feel clunky in practice.
- **Bulk inline categorisation shortcuts beyond the existing bulk bar** (e.g. keyboard-driven "categorise and advance to next row") — TICKET-TXN-05 only removes the modal/save round-trip for a single row; a faster bulk-triage flow is a different, larger story.
