# Money Mosaic — v1 Build Checklist (User Stories)

Derived from [finance-app-spec.md](./finance-app-spec.md). Ordered so each section is buildable on top of the last (data layer → accounts → import → transactions → categorisation → transfers → stats). Check items off as they're completed. FR/NFR IDs are kept in parentheses for traceability back to the spec.

## 0. Foundation

- [x] Scaffold the Angular workspace (standalone, signals, strict mode, no SSR)
- [x] Wire up Tailwind CSS v4 + daisyUI
- [x] Set up Dexie (IndexedDB) and the `core/data-access` repository pattern
- [x] Build one placeholder feature end-to-end (`feature-dashboard`) to prove the stack works
- [x] As a developer, I want the full Dexie schema (accounts, transactions, transfers, categories, rules, mappingProfiles, importBatches) defined in `app-db.ts` v1, so every later feature has its persistence layer ready (§5 Data Model)
- [x] As a developer, I want app bootstrap to hydrate all source signals from IndexedDB before the app renders, so the UI never flashes empty state (§7 Signals Architecture)
- [x] As a user, I want a persistent sidebar nav + topbar app shell, so features are actually reachable (not in the original checklist — added as groundwork once Accounts needed real navigation; see [ui-layout-spec.md](./ui-layout-spec.md) §1)
- [x] As a developer, I want a set of sample accounts and transactions auto-seeded on dev-server startup when the database is empty, so I can test features on a fresh browser without importing a CSV first ([TICKET-DEV-01](./tickets/TICKET-DEV-01-seed-dev-data.md), dev-only — supports §0 bootstrap hydration, no production FR)

## 1. Accounts (FR-ACC)

- [x] As a user, I want to create an account with name, type (Checking/Savings/Joint/Invest), optional IBAN, opening balance, opening-balance date, and colour/icon, so I can start tracking a real bank account (FR-ACC-1)
- [x] As a user, I want to edit, archive, or delete an account, and be warned about associated transactions before deleting, so I don't lose data by accident (FR-ACC-2)
- [x] As a user, I want each account's current balance derived from opening balance + its transactions (never stored as a mutable field), so the number I see is always trustworthy (FR-ACC-3)
- [x] As a user, I want my account's IBAN used as a matching key for transfer detection, so transfers between my own accounts are found automatically later (FR-ACC-4) — implemented as the high-confidence tier of §5 Transfers auto-linking
- [x] As a user, I want to clear a bank account of its transactions (e.g. to re-import if something's wrong) without deleting the full account, so I can start its history fresh while keeping the account, its settings, and mapping profiles ([TICKET-ACC-01](./tickets/TICKET-ACC-01-clear-account-transactions.md), extends FR-ACC-2)

## 2. CSV Import (FR-IMP)

- [x] As a user, I want to pick a CSV file and the account to import it into, so I can bring in a bank export (FR-IMP-1)
- [x] As a user, I want the app to auto-detect my bank's format from the file and pre-fill the mapping, so I don't have to configure it every time (FR-IMP-2)
- [x] As a user, I want a mapping wizard (date, amount/debit+credit, description, counterparty name/IBAN, running balance, delimiter, decimal separator, date format, encoding, header rows, sign convention) when no preset matches, so any bank's CSV can be imported (FR-IMP-3)
- [x] As a user, I want a live preview of the first rows under my current mapping before committing, so I can catch mistakes before importing (FR-IMP-4)
- [x] As a user, I want my column mapping saved as a reusable profile per bank/account, so re-imports are one click (FR-IMP-5)
- [x] As a user, I want duplicate rows (by deterministic fingerprint) skipped on re-import, while genuine same-day duplicates within one file are kept, so re-importing a file is always safe (FR-IMP-6, §5 Fingerprint)
- [x] As a user, I want an import summary (rows read/added/skipped, date range) that I can undo as a whole batch, so I can safely recover from a bad import (FR-IMP-7)
- [x] As a user, I want malformed rows reported instead of silently dropped, and to still be able to proceed with the valid rows, so one bad line doesn't block my whole import (FR-IMP-8)
- [x] As a user, I want CSV parsing to run in a Web Worker so the UI doesn't freeze on large files (NFR-PERF-2)
- [x] As a user, I want a failed import to leave my data untouched (transactional import), so I never end up with a half-imported mess (NFR-RESIL-1)
- [ ] As a developer, I want bank presets for KBC, Belfius, BNP Paribas Fortis, ING, and Argenta, prioritised by what the user actually uses (FR-IMP §"v1 preset targets", Open Decision #5) — **partial:** KBC + Belfius shipped (column signatures unverified against a real export, best-effort only); BNP Paribas Fortis/ING/Argenta deferred to a follow-up
- [ ] As a user, I want to select multiple CSV files, optionally link each to an account, and map the whole batch once instead of re-mapping every file, so importing several months across accounts isn't tedious (extends FR-IMP-1/FR-IMP-3 — today ImportWizardComponent loops the mapping step per file)
- [ ] As a user, I want a visible error when a file's headers don't match the batch's chosen mapping, so I immediately know which file needs handling instead of it silently parsing wrong (extends FR-IMP-8)
- [x] As a user, I want the column mapping and the row preview on one screen with a live preview whenever the mapping is valid, and the Back/Next controls pinned at the top, so I can get through a multi-file import faster without scrolling to confirm each file ([TICKET-IMP-04](./tickets/TICKET-IMP-04-combined-map-preview-step.md), FR-IMP-4 — today ImportWizardComponent splits map and preview across steps 2 and 3 with the confirm button at the bottom)

## 3. Transactions (FR-TXN)

- [x] As a user, I want every transaction to store account, booking date, optional value date, signed amount, raw description, optional counterparty name/IBAN, category, transfer link, and notes, so nothing about a transaction is lost (FR-TXN-1)
- [x] As a user, I want to manually edit a transaction's category or notes, and have that manual category "stick" so rules never silently overwrite it (FR-TXN-2)
- [x] As a user, I want to search/filter transactions by account, date range, category, text, and amount range, so I can find what I'm looking for (FR-TXN-3)
- [x] As a user, I want to manually mark two transactions as a transfer pair, or unlink an auto-detected one, so I can correct the system when it's wrong (FR-TXN-4)
- [ ] As a user, I want to select multiple transactions and assign one category to all of them via a bulk-action bar, so clearing a backlog doesn't mean editing one row at a time (ui-layout-spec.md §4.3 — today selection is capped at 2 rows and only used for transfer linking)
- [ ] As a developer, I want the transactions table to virtualize row rendering (e.g. CDK virtual scroll) instead of rendering every filtered row at once, so the screen stays smooth at 10k+ transactions (NFR-PERF-1 — supersedes the "paginate at 50 rows" note in ui-layout-spec.md §4.3, which was never implemented)

## 4. Categorisation (FR-CAT)

- [x] As a user, I want to manage categories (name, kind, colour, icon, optional group) with sensible defaults shipped out of the box, so I'm not starting from zero (FR-CAT-1)
- [x] As a user, I want a rules engine (ordered conditions on description/counterparty/amount/account with contains/equals/regex/comparison operators, priority, first-match-wins or continue) that assigns categories automatically, so I don't have to categorise everything by hand (FR-CAT-2)
- [x] As a user, I want rules to run on import and be re-runnable on demand across existing transactions, but never override a manually-set category, so automation stays safely reversible (FR-CAT-3)
- [x] As a user, I want an "always categorise this merchant as X" one-click shortcut that creates a rule from a transaction's counterparty, so teaching the system is effortless (FR-CAT-4)
- [x] As a user, I want uncategorised transactions surfaced prominently, so I can clear the backlog instead of losing track of them (FR-CAT-5)
- [x] As a user, I want to combine a rule's conditions with AND/OR instead of an implicit AND across all of them, so one rule can express "description contains X OR description contains Y" without duplicating rules (extends FR-CAT-2 — matchesRule() currently requires every condition to match)

## 5. Transfers (FR-TRF)

- [x] As a saver, I want transfers between my own accounts linked and excluded from income/expense (but included in net worth), so moving money to savings never looks like spending (FR-TRF-1, §5 Aggregation rules) — linking sets `transferId` on both sides; the income/expense exclusion itself is exercised once §6 Statistics is built on top of it
- [x] As a user, I want auto-linking to re-run across the entire dataset on every import, so a later-imported counterpart retroactively pairs with an earlier one-sided movement (FR-TRF-2)
- [x] As a user, I want high-confidence matches (same-IBAN) and unique medium-confidence matches (opposite-sign, equal-amount, within a configurable day window) auto-linked, while ambiguous matches wait for my one-click confirmation, so linking is accurate, not just automatic (FR-TRF-3)
- [x] As a user, I want the matching window and confidence behaviour configurable in settings, so I can tune it to how I actually bank (FR-TRF-4)
- [x] As a user, I want a one-sided movement to an own-account IBAN flagged "likely transfer" even before its pair arrives, so I'm not misled by a temporarily-incomplete import (FR-TRF-5)
- [ ] As a user, I want a transaction linked as a transfer to have no category and be excluded from income/expense on the dashboard, while still counting normally toward its account's balance, so a transfer never gets miscategorised as spending or income (extends FR-TRF-1 — income/expense exclusion already works via the `transferId` checks in `period-stats.ts`/`category-breakdown.ts`, and account balances already include transfers unexcluded; the gap is that `categoryId` isn't cleared when a transaction is linked, so a rule-assigned or manually-set category can survive on a linked transaction)
- [ ] As a saver, I want money I move into a savings account reported as "savings" rather than "expense", and never requiring a category, so putting money aside doesn't look like spending or nag me for a category ([TICKET-TRF-02](./tickets/TICKET-TRF-02-classify-savings-movements.md), extends FR-TRF-1 — today a savings movement is only kept out of expenses when it happens to be linked; an unlinked one-sided movement to a savings account still counts as expense and shows up as uncategorised)

## 6. Statistics & Dashboard (FR-STAT)

- [x] As a user, I want to see each account's current balance and my combined net worth, so I know where I stand (FR-STAT-1)
- [x] As a reconciler, I want income, expense, net cash flow, and savings rate (transfers excluded from both sides) for the selected date range, so I get an honest picture of whatever period I'm looking at (FR-STAT-2)
- [x] As a user, I want a category breakdown for the selected date range (expense-by-category, income-by-source) as totals and share-of-total, so I can see where money actually goes (FR-STAT-3)
- [x] As a saver, I want income/expense trends and net-worth-over-time bucketed at my chosen grouping granularity, so I can see if I'm actually getting ahead at whatever resolution matters to me (FR-STAT-4)
- [x] As a user, I want every stat to update instantly when I recategorise or edit a transaction, via computed signals, so the dashboard never shows stale numbers (FR-STAT-5, §7 Signals Architecture)
- [x] As a user, I want every aggregate drill-down able to its underlying transactions, so I can verify any number I see (FR-STAT-6)
- [x] As a user, I want a global date-range picker (with This month/Last month/This quarter/This year presets plus a custom range) and a day/week/month/quarter grouping control, so I can view my finances at whatever timeframe and resolution I actually want, not just a fixed calendar month (FR-STAT-7)
- [x] As a developer, I want heavy aggregates memoized per `(accountId, granularity, bucketKey)`, so a single edit doesn't recompute all history and switching grouping doesn't discard already-cached buckets (NFR-PERF-1) — **pragmatic interpretation:** each aggregate is one shared O(n)/O(n log n) pass (grouped once, reused by every consumer) rather than truly incremental per-bucket caching; true incremental diffing was judged overkill for realistic v1 data sizes and is deferred
- [ ] As a user, I want selecting "Custom" in the topbar date-range dropdown to actually enable the from/to date pickers, so I can pick a custom range instead of the inputs staying disabled (bug fix, FR-STAT-7 — RangeGroupingSwitcherComponent.onPresetChange() currently no-ops for 'custom', so the disabled binding never releases)
- [ ] As a saver, I want a per-account net-worth-over-time chart alongside the combined one, so I can see how each account individually trends, not just my total (extends FR-STAT-4 — TrendChartPanelComponent currently only plots one combined net-worth line)

---

Data Management, cross-cutting polish, and the v1.5/v2/v3 roadmap have moved to [../v2/requirements.md](../v2/requirements.md).

## Open decisions blocking some stories above

From spec §9 — resolve before/while building the affected story:
1. Transfer window & confidence defaults (±3 days, no auto-link on ambiguous) — affects §5 Transfers stories
2. Category structure (flat + optional group for v1) — affects §4 Categorisation stories
3. Splits confirmed out of v1 — affects nothing in this list (excluded already)
4. Currency EUR-only for v1 — affects §5 Data Model, already assumed above
5. Bank preset priority (which of KBC/Belfius/BNP Fortis/ING/Argenta first) — affects the CSV Import preset story
6. ~~Period definition (calendar month default)~~ **Resolved:** custom date range + day/week/month/quarter grouping, defaulting to the current calendar month grouped by month — see the new FR-STAT-7 story above
