# Money Mosaic — v1 Build Checklist (User Stories)

Derived from [finance-app-spec.md](./finance-app-spec.md). Ordered so each section is buildable on top of the last (data layer → accounts → import → transactions → categorisation → transfers → stats → data management → polish). Check items off as they're completed. FR/NFR IDs are kept in parentheses for traceability back to the spec.

## 0. Foundation

- [x] Scaffold the Angular workspace (standalone, signals, strict mode, no SSR)
- [x] Wire up Tailwind CSS v4 + daisyUI
- [x] Set up Dexie (IndexedDB) and the `core/data-access` repository pattern
- [x] Build one placeholder feature end-to-end (`feature-dashboard`) to prove the stack works
- [ ] As a developer, I want the full Dexie schema (accounts, transactions, transfers, categories, rules, mappingProfiles, importBatches) defined in `app-db.ts` v1, so every later feature has its persistence layer ready (§5 Data Model)
- [ ] As a developer, I want app bootstrap to hydrate all source signals from IndexedDB before the app renders, so the UI never flashes empty state (§7 Signals Architecture)

## 1. Accounts (FR-ACC)

- [ ] As a user, I want to create an account with name, type (Checking/Savings/Joint/Invest), optional IBAN, opening balance, opening-balance date, and colour/icon, so I can start tracking a real bank account (FR-ACC-1)
- [ ] As a user, I want to edit, archive, or delete an account, and be warned about associated transactions before deleting, so I don't lose data by accident (FR-ACC-2)
- [ ] As a user, I want each account's current balance derived from opening balance + its transactions (never stored as a mutable field), so the number I see is always trustworthy (FR-ACC-3)
- [ ] As a user, I want my account's IBAN used as a matching key for transfer detection, so transfers between my own accounts are found automatically later (FR-ACC-4)

## 2. CSV Import (FR-IMP)

- [ ] As a user, I want to pick a CSV file and the account to import it into, so I can bring in a bank export (FR-IMP-1)
- [ ] As a user, I want the app to auto-detect my bank's format from the file and pre-fill the mapping, so I don't have to configure it every time (FR-IMP-2)
- [ ] As a user, I want a mapping wizard (date, amount/debit+credit, description, counterparty name/IBAN, running balance, delimiter, decimal separator, date format, encoding, header rows, sign convention) when no preset matches, so any bank's CSV can be imported (FR-IMP-3)
- [ ] As a user, I want a live preview of the first rows under my current mapping before committing, so I can catch mistakes before importing (FR-IMP-4)
- [ ] As a user, I want my column mapping saved as a reusable profile per bank/account, so re-imports are one click (FR-IMP-5)
- [ ] As a user, I want duplicate rows (by deterministic fingerprint) skipped on re-import, while genuine same-day duplicates within one file are kept, so re-importing a file is always safe (FR-IMP-6, §5 Fingerprint)
- [ ] As a user, I want an import summary (rows read/added/skipped, date range) that I can undo as a whole batch, so I can safely recover from a bad import (FR-IMP-7)
- [ ] As a user, I want malformed rows reported instead of silently dropped, and to still be able to proceed with the valid rows, so one bad line doesn't block my whole import (FR-IMP-8)
- [ ] As a user, I want CSV parsing to run in a Web Worker so the UI doesn't freeze on large files (NFR-PERF-2)
- [ ] As a user, I want a failed import to leave my data untouched (transactional import), so I never end up with a half-imported mess (NFR-RESIL-1)
- [ ] As a developer, I want bank presets for KBC, Belfius, BNP Paribas Fortis, ING, and Argenta, prioritised by what the user actually uses (FR-IMP §"v1 preset targets", Open Decision #5)

## 3. Transactions (FR-TXN)

- [ ] As a user, I want every transaction to store account, booking date, optional value date, signed amount, raw description, optional counterparty name/IBAN, category, transfer link, and notes, so nothing about a transaction is lost (FR-TXN-1)
- [ ] As a user, I want to manually edit a transaction's category or notes, and have that manual category "stick" so rules never silently overwrite it (FR-TXN-2)
- [ ] As a user, I want to search/filter transactions by account, date range, category, text, and amount range, so I can find what I'm looking for (FR-TXN-3)
- [ ] As a user, I want to manually mark two transactions as a transfer pair, or unlink an auto-detected one, so I can correct the system when it's wrong (FR-TXN-4)

## 4. Categorisation (FR-CAT)

- [ ] As a user, I want to manage categories (name, kind, colour, icon, optional group) with sensible defaults shipped out of the box, so I'm not starting from zero (FR-CAT-1)
- [ ] As a user, I want a rules engine (ordered conditions on description/counterparty/amount/account with contains/equals/regex/comparison operators, priority, first-match-wins or continue) that assigns categories automatically, so I don't have to categorise everything by hand (FR-CAT-2)
- [ ] As a user, I want rules to run on import and be re-runnable on demand across existing transactions, but never override a manually-set category, so automation stays safely reversible (FR-CAT-3)
- [ ] As a user, I want an "always categorise this merchant as X" one-click shortcut that creates a rule from a transaction's counterparty, so teaching the system is effortless (FR-CAT-4)
- [ ] As a user, I want uncategorised transactions surfaced prominently, so I can clear the backlog instead of losing track of them (FR-CAT-5)

## 5. Transfers (FR-TRF)

- [ ] As a saver, I want transfers between my own accounts linked and excluded from income/expense (but included in net worth), so moving money to savings never looks like spending (FR-TRF-1, §5 Aggregation rules)
- [ ] As a user, I want auto-linking to re-run across the entire dataset on every import, so a later-imported counterpart retroactively pairs with an earlier one-sided movement (FR-TRF-2)
- [ ] As a user, I want high-confidence matches (same-IBAN) and unique medium-confidence matches (opposite-sign, equal-amount, within a configurable day window) auto-linked, while ambiguous matches wait for my one-click confirmation, so linking is accurate, not just automatic (FR-TRF-3)
- [ ] As a user, I want the matching window and confidence behaviour configurable in settings, so I can tune it to how I actually bank (FR-TRF-4)
- [ ] As a user, I want a one-sided movement to an own-account IBAN flagged "likely transfer" even before its pair arrives, so I'm not misled by a temporarily-incomplete import (FR-TRF-5)

## 6. Statistics & Dashboard (FR-STAT)

- [ ] As a user, I want to see each account's current balance and my combined net worth, so I know where I stand (FR-STAT-1)
- [ ] As a reconciler, I want per-period income, expense, net cash flow, and savings rate (transfers excluded from both sides), so I get an honest picture of a given month (FR-STAT-2)
- [ ] As a user, I want a category breakdown for a period (expense-by-category, income-by-source) as totals and share-of-total, so I can see where money actually goes (FR-STAT-3)
- [ ] As a saver, I want month-over-month income/expense trends and net-worth-over-time, so I can see if I'm actually getting ahead (FR-STAT-4)
- [ ] As a user, I want every stat to update instantly when I recategorise or edit a transaction, via computed signals, so the dashboard never shows stale numbers (FR-STAT-5, §7 Signals Architecture)
- [ ] As a user, I want every aggregate drill-down able to its underlying transactions, so I can verify any number I see (FR-STAT-6)
- [ ] As a developer, I want heavy aggregates memoized per `(accountId, yearMonth)`, so a single edit doesn't recompute all history (NFR-PERF-1)

## 7. Data Management (FR-DAT)

- [ ] As a privacy-conscious user, I want to export all my data to a single JSON file, so I have a portable backup that never touches a server (FR-DAT-1)
- [ ] As a user, I want to import a JSON backup with a clear replace-vs-merge choice, so I can restore or migrate devices safely (FR-DAT-2)
- [ ] As a user, I want a "delete all data" action with confirmation, so I can start fresh without digging through dev tools (FR-DAT-3)
- [ ] As a user, I want the app to request persistent storage, so the browser doesn't silently evict my financial data (FR-DAT-4)
- [ ] As a developer, I want every export to record its schema version and the IndexedDB schema to support forward migrations, so old backups keep working after upgrades (NFR-STORE-1)

## 8. Cross-cutting polish

- [ ] As a user, I want the app fully keyboard-navigable, screen-reader-labelled, and WCAG AA compliant, so it's usable by everyone (NFR-A11Y-1)
- [ ] As a user, I want the layout responsive from mobile to desktop, so I can check my finances from any device (NFR-RESP-1)
- [ ] As a privacy-conscious user, I want confirmation that no financial data is ever transmitted over the network and no third-party analytics run on financial content, so "local-first" is actually true, not just marketed (NFR-PRIV-1)
- [ ] As a user, I want the app to stay smooth with 10k+ transactions, so performance doesn't degrade as my history grows (NFR-PERF-1)

---

## Later phases (parked, not part of this checklist's "done")

**v1.5 — Refinements:** account manager (colour/order/rename), joint-account splitting (configurable share, own-account deposits excluded), category manager with per-category rule sets, loading/calculating-state animations.

**v2 — Depth:** subscription/recurring detection, split transactions, category groups/hierarchy, budgets, custom date ranges, multi-currency, CODA import.

**v3 — Investing & intelligence:** real portfolio tracking (holdings/price feed/valuation/returns), forecasting/insights, optional encrypted sync.

## Open decisions blocking some stories above

From spec §9 — resolve before/while building the affected story:
1. Transfer window & confidence defaults (±3 days, no auto-link on ambiguous) — affects §5 Transfers stories
2. Category structure (flat + optional group for v1) — affects §4 Categorisation stories
3. Splits confirmed out of v1 — affects nothing in this list (excluded already)
4. Currency EUR-only for v1 — affects §5 Data Model, already assumed above
5. Bank preset priority (which of KBC/Belfius/BNP Fortis/ING/Argenta first) — affects the CSV Import preset story
6. Period definition (calendar month default) — affects §6 Statistics stories
