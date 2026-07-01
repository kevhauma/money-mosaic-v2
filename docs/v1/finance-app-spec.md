# Personal Finance Tracker — Product & Technical Specification (v1)

**Status:** Draft for review
**Stack:** Angular (signals-first), Tailwind CSS, daisyUI
**Persistence:** Local-first (IndexedDB, no backend)
**Scope of this doc:** Vision, scope, functional requirements, data model, non-functional requirements, and a phased roadmap. Open decisions are listed at the end.

---

## 1. Vision & Principles

A private, local-first web app that turns raw bank CSV exports into an honest picture of your money: what comes in, what goes out, where it goes, and what you're actually worth across all your accounts.

**Core loop:** Import CSV → auto-categorise & auto-link transfers → see the truth in stats.

**Guiding principles**

1. **Local-first & private.** All financial data lives in the browser (IndexedDB). Nothing is ever sent to a server. This is a feature, not a limitation.
2. **Correctness over cleverness.** The numbers must be trustworthy. Internal transfers must never inflate income or expense.
3. **Signals as the source of truth.** A small set of writable source signals; every statistic is a `computed()` derivation. The UI is a projection of state.
4. **Robust import over pretty import.** Bank formats change and vary. A generic, remappable importer beats a fragile hardcoded one.
5. **Reversible automation.** Auto-categorisation and auto-linking are helpful defaults the user can always inspect and override.

---

## 2. Scope

### In scope (v1)
- Multiple accounts of types: **Checking, Savings, Joint, Invest** — all modelled as **cash ledgers**.
- CSV import with **bank presets** + a **generic column-mapping wizard**, with **saved mapping profiles** per bank/account.
- De-duplication on re-import.
- **Manual** and **rules-based** categorisation, with manual override.
- **Automatic transfer linking** between the user's own accounts (IBAN-first, amount+date fallback).
- Core statistics: income, expense, net cash flow, savings rate, category breakdown, per-account balances, net worth — sliced by month and by account.
- Backup via full **JSON export/import**.

### Explicitly out of scope for v1 (parked)
- Real investment portfolio tracking (holdings, market valuation, returns). Invest accounts are cash ledgers only in v1.
- Multi-currency. v1 assumes **EUR**.
- Split transactions (one transaction → multiple categories).
- Budgets, forecasting, subscription detection (v2).
- Any server, sync, auth, or account sharing.

---

## 3. Personas (lightweight)

- **The reconciler** — imports monthly from 2–3 accounts, wants an accurate income/expense picture and to catch overspending.
- **The saver** — cares about savings rate and net-worth-over-time, moves money between checking/savings frequently (transfer correctness matters most here).
- **The privacy-conscious** — refuses cloud finance tools; local-first is the reason they'll use this at all.

---

## 4. Functional Requirements

IDs are stable references for later discussion.

### 4.1 Accounts
- **FR-ACC-1** User can create an account with: name, type (Checking/Savings/Joint/Invest), optional IBAN, opening balance, opening-balance date, colour/icon.
- **FR-ACC-2** User can edit, archive (hide without deleting), and delete accounts. Deleting an account warns about associated transactions.
- **FR-ACC-3** Account **current balance is derived** = opening balance + sum of its transactions. It is never stored as a mutable field.
- **FR-ACC-4** IBAN is used as a matching key for transfer detection when present.

### 4.2 CSV Import
- **FR-IMP-1** User selects a CSV file and an account to import into.
- **FR-IMP-2** System attempts to **auto-detect a bank preset** (by header signature / filename hints). On match, it pre-fills the mapping.
- **FR-IMP-3** If no preset matches, the **mapping wizard** lets the user map columns: date, amount (or separate debit/credit columns), description, counterparty name, counterparty IBAN, and optional running balance. User also sets: delimiter, decimal separator, date format, encoding, header row count, and sign convention.
- **FR-IMP-4** A **live preview** shows the first N rows parsed with the current mapping before committing.
- **FR-IMP-5** The mapping is saved as a reusable **Mapping Profile** and offered automatically on the next import for the same bank/account.
- **FR-IMP-6** **De-duplication:** each transaction gets a deterministic fingerprint (see §5). On import, rows whose fingerprint already exists in the dataset are skipped. Duplicate fingerprints *within the same file* are preserved (they are two real transactions).
- **FR-IMP-7** Import produces an **Import Batch** summary: rows read, added, skipped-as-duplicate, date range covered. The batch is undoable (removes exactly the transactions it added).
- **FR-IMP-8** Malformed rows are reported, not silently dropped; the user can proceed with the valid rows.

**v1 preset targets (Belgium):** KBC, Belfius, BNP Paribas Fortis, ING, Argenta. (CODA structured statements → v2; it is not CSV.)

### 4.3 Transactions
- **FR-TXN-1** A transaction has: account, booking date, (optional value date), signed amount (negative = outflow, positive = inflow), raw description, optional counterparty name & IBAN, optional category, optional transfer link, optional user notes.
- **FR-TXN-2** User can manually edit a transaction's category and notes. Manual category assignment is "sticky" and is never overwritten by rules.
- **FR-TXN-3** User can search/filter transactions by account, date range, category, text, and amount range.
- **FR-TXN-4** User can manually mark two transactions as a transfer pair, or unlink an auto-detected pair.

### 4.4 Categorisation
- **FR-CAT-1** User can manage categories: name, kind (Expense/Income), colour, icon, optional group. Ships with sensible defaults (Groceries, Shopping, Subscriptions, Housing, Transport, Eating Out, Utilities, Health, Income:Salary, etc.).
- **FR-CAT-2** **Rules engine:** a rule has ordered conditions on fields (description / counterparty name / counterparty IBAN / amount / account) with operators (contains, equals, regex, >, <, between) and an action (assign category). Rules have priority; first match wins unless "continue" is set.
- **FR-CAT-3** Rules run automatically on import and can be re-run on demand across existing transactions. Rules **never override a manually-set category**.
- **FR-CAT-4** "Always categorise this merchant as X" is a one-click shortcut that creates a rule from the selected transaction's counterparty.
- **FR-CAT-5** Uncategorised transactions are surfaced prominently so the user can clear the backlog.

### 4.5 Transfers (internal movements)
- **FR-TRF-1** A transfer links two transactions in two of the user's own accounts and is **excluded from income and expense aggregates** but **included in net worth** (it nets to zero).
- **FR-TRF-2** **Auto-linking runs across the entire dataset on every import**, not just on new rows, so a later-imported counterpart retroactively pairs and reclassifies an earlier one-sided movement.
- **FR-TRF-3** Matching confidence:
  - **High** — counterparty IBAN equals one of the user's own account IBANs (auto-link).
  - **Medium** — a *unique* opposite-sign, equal-amount pair within a ±3-day window across two own accounts (auto-link).
  - **Low/ambiguous** — multiple candidate matches; **not auto-linked**, surfaced in a review list for one-click confirmation.
- **FR-TRF-4** The ±3-day window and confidence behaviour are configurable in settings.
- **FR-TRF-5** Until matched, a one-sided movement is treated as a normal in/outflow, but if its counterparty IBAN is an own account it is flagged as "likely transfer" even before the pair arrives.

### 4.6 Statistics & Dashboard
- **FR-STAT-1** Per-account current balance and combined **net worth**.
- **FR-STAT-2** Per-period (default: current calendar month) **income**, **expense**, **net cash flow**, and **savings rate** = (income − expense) / income, with transfers excluded from both income and expense.
- **FR-STAT-3** **Category breakdown** for the selected date range (expense-by-category, income-by-source), as totals and share-of-total.
- **FR-STAT-4** Trends: income/expense and net-worth-over-time, bucketed at the selected grouping granularity across the selected date range.
- **FR-STAT-5** All stats respond instantly to edits (recategorising a transaction updates every affected figure) via computed signals.
- **FR-STAT-6** Every aggregate is drill-downable to the underlying transactions.
- **FR-STAT-7** User can pick a custom **date range** (quick presets: This month, Last month, This quarter, This year, plus a custom picker) and a **grouping granularity** — day, week, month, or quarter — that determines how all period-based stats and trends are bucketed. Default: current calendar month, grouped by month. Range and grouping are independent: e.g. a full year range grouped by week is valid.

### 4.7 Data Management
- **FR-DAT-1** Full **export** of all data to a single JSON file (backup / device migration).
- **FR-DAT-2** **Import** of such a JSON file (restore / merge), with a clear replace-vs-merge choice.
- **FR-DAT-3** "Delete all data" with confirmation.
- **FR-DAT-4** The app requests **persistent storage** so the browser won't silently evict the database.

---

## 5. Data Model

Source-of-truth entities (persisted in IndexedDB). Everything statistical is derived, not stored.

**Account**
`id, name, type (checking|savings|joint|invest), iban?, currency ('EUR'), openingBalance, openingBalanceDate, color, icon, archived`

**Transaction**
`id, accountId, bookingDate, valueDate?, amount (signed), currency, rawDescription, counterpartyName?, counterpartyIban?, categoryId?, transferId?, importBatchId, fingerprint, notes?, createdAt`

**Transfer**
`id, fromTransactionId, toTransactionId, method (auto-iban|auto-amountdate|manual), confidence, linkedAt`
*(Both linked transactions carry the same `transferId`.)*

**Category**
`id, name, kind (expense|income), group?, color, icon, archived, isSystem`

**Rule**
`id, name, priority, enabled, continueOnMatch, conditions: [{ field, operator, value }], action: { setCategoryId }`

**MappingProfile**
`id, name, bankPreset?, delimiter, decimalSeparator, dateFormat, encoding, headerRows, signConvention, columns: { date, amount? , debit?, credit?, description, counterpartyName?, counterpartyIban?, balance? }, defaultAccountId?`

**ImportBatch**
`id, accountId, fileName, mappingProfileId, importedAt, rowsRead, rowsAdded, rowsDuplicate, dateFrom, dateTo`

**Fingerprint (dedupe key):** a hash of `accountId + bookingDate + amount + normalizedDescription + (counterpartyIban ?? '')`. If a bank provides a per-line statement/sequence reference, include it to make the key stronger.

**Aggregation rules (the correctness core)**
- `income  = Σ amount where amount > 0 AND transferId is null`
- `expense = Σ |amount| where amount < 0 AND transferId is null`
- `savingsRate = (income − expense) / income`
- `netWorth = Σ (account.openingBalance + Σ its transaction amounts)` — transfers net to zero and are correctly included.

---

## 6. Non-Functional Requirements

- **NFR-PRIV-1** No network transmission of financial data. No third-party analytics on financial content.
- **NFR-PERF-1** Smooth interaction with ~10k+ transactions. Aggregates memoized per account/month so a single edit does not recompute all history.
- **NFR-PERF-2** CSV parsing runs without freezing the UI (Web Worker for large files).
- **NFR-STORE-1** Versioned IndexedDB schema with forward migrations. Every export records its schema version.
- **NFR-A11Y-1** Keyboard-navigable, screen-reader-labelled, WCAG AA contrast (daisyUI themes chosen accordingly).
- **NFR-RESP-1** Responsive from mobile to desktop.
- **NFR-RESIL-1** Import is transactional: a failed import leaves the database unchanged.

---

## 7. Signals Architecture (shape, not implementation)

- **Source signals:** `accounts`, `transactions`, `categories`, `rules`, `mappingProfiles`, `importBatches`, `settings`.
- **Derived (`computed`) signals:** account balances, net worth, per-bucket income/expense/net/savings rate (bucketed by the active date range + grouping granularity), category breakdowns, uncategorised queue, transfer-review queue, range/account trends.
- **Persistence layer:** an `effect()` (or explicit service calls) mirrors source-signal changes into IndexedDB; on boot, the DB hydrates the source signals.
- **Memoization:** heavy aggregates keyed by `(accountId, granularity, bucketKey)` — e.g. `(accountId, 'month', '2026-07')` or `(accountId, 'week', '2026-W27')` — so edits invalidate only the touched buckets, and switching grouping granularity doesn't require recomputing buckets that are already cached at that granularity.

---

## 8. Roadmap

**v1 — MVP (this doc)**
Accounts (4 types as cash ledgers) · CSV import (presets + wizard + saved profiles) · dedupe · manual + rules categorisation · auto transfer linking (IBAN-first) · core stats with custom date range + grouping (day/week/month/quarter) · JSON backup · local-first IndexedDB.

**v1.5 — Refinements**
Account manager (per-account colour, priority/display order, initial saldo — assumes no legacy transactions before it, renaming) · joint-account splitting (deposits from the paired account excluded from aggregates; every other transaction counted at a per-account share, default 50/50, configurable per joint account) · category manager (dedicated screen surfacing the rules engine as per-category auto-assign rule sets, e.g. "description contains {store name}") · loading/calculating-state animations (import progress, aggregate recompute).

**v2 — Depth**
Subscription/recurring detection · split transactions · category groups/hierarchy · budgets · richer trend analytics (forecasted/projected buckets) · multi-currency · CODA import.

**v3 — Investing & intelligence**
Real portfolio tracking (holdings, price feed, valuation, returns) · forecasting/insights · optional encrypted sync.

---

## 9. Open Decisions (need your call)

1. **Transfer window & confidence defaults** — ±3 days and "don't auto-link ambiguous" proposed. Accept?
2. **Category structure** — flat-with-optional-group for v1, full hierarchy deferred to v2. OK?
3. **Splits** — confirmed out of v1?
4. **Currency** — EUR-only for v1 confirmed?
5. **Bank preset priority** — which of KBC / Belfius / BNP Fortis / ING / Argenta do you actually use, so we build those presets first?
6. ~~**Period definition** — calendar month as the default reporting period, with custom ranges in v2. OK, or do you want custom ranges in v1?~~ **Resolved:** custom date range + grouping (day/week/month/quarter) is in v1 (FR-STAT-7), defaulting to the current calendar month grouped by month.
