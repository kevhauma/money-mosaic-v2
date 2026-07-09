# Money Mosaic — v1.1 Joint accounts

Split out of the v1.5 line item in [../v2/requirements.md](../v2/requirements.md) — *"joint-account splitting (configurable share, own-account deposits excluded)"*. These stories refine v1 behaviour for **joint accounts**: how much of a shared pot counts as *my* net worth, how money arriving from a partner/other person is kept out of my income, and the aggregation/matching pitfalls that follow. FR/NFR IDs trace back to [../v1/finance-app-spec.md](../v1/finance-app-spec.md); where behaviour changes a shipped FR, the story says so explicitly.

**Net-worth model decision (governs this whole section):** joint accounts use **contribution tracking**, not share-of-balance. My stake in a joint account is what *I* put in (deposits from my own accounts + my own income into the pot, at 100%) minus my share of what the pot *spends* — not a flat fraction of the bank balance. This keeps transfers into a joint account netting to zero in net worth. The trade-off (an informal "my partner owes the pot" balance can show up as my net worth) is accepted and documented in the tickets.

## 1. Accounts (FR-ACC)

- [ ] As someone with a shared account, I want to set my ownership/contribution share on a joint account, so the app has the input it needs to count only my part of the shared money — pre-filled as `1 / (number of people on the account)` once co-owners are registered (e.g. 50% for 2 people, 33% for 3), staying editable and only committed once I confirm it ([TICKET-ACC-02](./tickets/TICKET-ACC-02-joint-ownership-share.md), extends FR-ACC-1)
- [ ] As someone sharing an account with one or more other people, I want to register each co-owner and the IBAN(s) they pay in from, so the app can tell each person's contributions apart from mine and from external money ([TICKET-ACC-03](./tickets/TICKET-ACC-03-multi-owner-coowner-ibans.md), extends FR-ACC-1 / FR-ACC-4)

## 3. Transactions (FR-TXN)

- [ ] As someone with a shared account, I want to manually correct a transaction that landed in the wrong "personal vs. joint" bucket — a joint expense I accidentally fronted from my own account, a personal expense accidentally paid from the joint account (mine or a co-owner's) — so a one-off mistake doesn't distort my net worth or expense stats, while a co-owner reimbursing *my* personal expense into the joint pot keeps working with no extra step from me ([TICKET-TXN-03](./tickets/TICKET-TXN-03-manual-attribution-override.md), extends FR-TXN-1 / FR-TXN-2)
- [ ] As a user, I want to mark any transaction as neither income nor expense, so a situation the app's categorisation or joint-account model doesn't support (a correction, a reversal, anything that doesn't fit) doesn't distort my stats — without having to invent a category or an ownership split for it ([TICKET-TXN-04](./tickets/TICKET-TXN-04-nullify-transaction.md), extends FR-TXN-1, changes FR-STAT-2 / FR-STAT-3)

## 4. Categorisation (FR-CAT)

- [ ] As someone with a shared account, I want money paid into a joint account by my partner or another person marked as a non-income "contribution" that still affects the balance but never counts as my income, so a partner's salary landing in our joint account doesn't inflate my income and savings rate ([TICKET-CAT-02](./tickets/TICKET-CAT-02-neutral-category-kind.md), extends FR-CAT-1 / FR-STAT-2)

## 6. Statistics & Dashboard (FR-STAT)

- [ ] As someone with a shared account, I want my net worth to count only my contribution to a joint account (my deposits and income in, minus my share of joint spending) rather than the whole shared balance, so the number reflects money that is actually mine ([TICKET-STAT-03](./tickets/TICKET-STAT-03-contribution-net-worth.md), changes FR-STAT-1 / FR-TRF-1 semantics for joint accounts)

## 5. Transfers (FR-TRF)

- [ ] As someone with a shared account, I want a partner's one-sided deposit into a joint account to not be mistaken for a transfer between my own accounts, so an unrelated same-amount transaction of mine isn't silently linked to it ([TICKET-TRF-03](./tickets/TICKET-TRF-03-guard-partner-inflow-matching.md), extends FR-TRF-3 / FR-TRF-5)
