# Money Mosaic — v1 Build Checklist (Overview)

Derived from [finance-app-spec.md](./finance-app-spec.md). Listed in build order (data layer → accounts → import → transactions → categorisation → transfers → stats) — each item is buildable on top of the ones before it, so this list's order **is** the recommended order, not a grouping by area. Check items off as they're completed. FR/NFR IDs are kept in parentheses for traceability back to the spec. Each ticketed line links to a `tickets/TICKET-*.md` file carrying its own user story, description, as-is/to-be, and acceptance criteria — this file is only the index + build order.

- [x] Scaffold the Angular workspace (standalone, signals, strict mode, no SSR)
- [x] Wire up Tailwind CSS v4 + daisyUI
- [x] Set up Dexie (IndexedDB) and the `core/data-access` repository pattern
- [x] Build one placeholder feature end-to-end (`feature-dashboard`) to prove the stack works
- [x] Full Dexie schema (accounts, transactions, transfers, categories, rules, mappingProfiles, importBatches) defined in `app-db.ts` v1 (§5 Data Model)
- [x] App bootstrap hydrates all source signals from IndexedDB before the app renders (§7 Signals Architecture)
- [x] Persistent sidebar nav + topbar app shell (added once Accounts needed real navigation; [ui-layout-spec.md](./ui-layout-spec.md) §1)
- [x] [TICKET-DEV-01](./tickets/TICKET-DEV-01-seed-dev-data.md) — Seed sample dev data on a fresh browser in dev mode (dev-only, supports bootstrap hydration, no production FR)
- [x] Create an account with name, type, optional IBAN, opening balance/date, colour/icon (FR-ACC-1)
- [x] Edit, archive, or delete an account, warned about associated transactions first (FR-ACC-2)
- [x] Account balance derived from opening balance + transactions, never a mutable stored field (FR-ACC-3)
- [x] Account IBAN used as a matching key for transfer detection (FR-ACC-4, high-confidence tier of transfer auto-linking)
- [x] [TICKET-ACC-01](./tickets/TICKET-ACC-01-clear-account-transactions.md) — Clear an account's transactions without deleting the account (extends FR-ACC-2)
- [x] Pick a CSV file and the account to import it into (FR-IMP-1)
- [x] Auto-detect the bank's format and pre-fill the mapping (FR-IMP-2)
- [x] Mapping wizard for any bank's CSV when no preset matches (FR-IMP-3)
- [x] Live preview of the first rows under the current mapping before committing (FR-IMP-4)
- [x] Column mapping saved as a reusable profile per bank/account (FR-IMP-5)
- [x] Duplicate rows skipped on re-import via deterministic fingerprint; same-day in-file duplicates kept (FR-IMP-6)
- [x] Undoable import summary (rows read/added/skipped, date range) (FR-IMP-7)
- [x] Malformed rows reported, not silently dropped; valid rows still proceed (FR-IMP-8)
- [x] CSV parsing runs in a Web Worker so the UI doesn't freeze on large files (NFR-PERF-2)
- [x] A failed import leaves data untouched (transactional import) (NFR-RESIL-1)
- [x] [TICKET-IMP-02](./tickets/TICKET-IMP-02-batch-multi-file-mapping.md) — Map a multi-file import batch once instead of re-mapping every file (extends FR-IMP-1/FR-IMP-3)
- [x] [TICKET-IMP-03](./tickets/TICKET-IMP-03-header-mismatch-error.md) — Surface a header/mapping mismatch per file (extends FR-IMP-8)
- [x] [TICKET-IMP-04](./tickets/TICKET-IMP-04-combined-map-preview-step.md) — Combine map + preview into one screen with the confirm bar pinned at the top (FR-IMP-4)
- [ ] [TICKET-IMP-01](./tickets/TICKET-IMP-01-bank-presets.md) — Bank presets for KBC, Belfius, BNP Paribas Fortis, ING, and Argenta (FR-IMP §"v1 preset targets", Open Decision #5) — **partial:** KBC + Belfius shipped (unverified against a real export); BNP Paribas Fortis/ING/Argenta remain — **the only ticket still open**, independent of everything else, incremental as real sample exports become available
- [x] Every transaction stores account, booking date, optional value date, signed amount, raw description, optional counterparty, category, transfer link, notes (FR-TXN-1)
- [x] Manually edit a transaction's category/notes; a manual category "sticks" against rules (FR-TXN-2)
- [x] Search/filter transactions by account, date range, category, text, amount range (FR-TXN-3)
- [x] Manually mark or unlink a transfer pair (FR-TXN-4)
- [x] [TICKET-TXN-01](./tickets/TICKET-TXN-01-bulk-category-assign.md) — Bulk-assign a category to selected rows via a bulk-action bar (ui-layout-spec.md §4.3)
- [x] [TICKET-TXN-02](./tickets/TICKET-TXN-02-virtualized-table.md) — Virtualize the transactions table (NFR-PERF-1)
- [x] Manage categories (name, kind, colour, icon, optional group) with sensible shipped defaults (FR-CAT-1)
- [x] Rules engine (conditions, operators, priority, first-match-wins or continue) assigns categories automatically (FR-CAT-2)
- [x] Rules run on import and re-runnable on demand, never overriding a manual category (FR-CAT-3)
- [x] One-click "always categorise this merchant as X" shortcut creates a rule from a transaction (FR-CAT-4)
- [x] Uncategorised transactions surfaced prominently (FR-CAT-5)
- [x] [TICKET-CAT-01](./tickets/TICKET-CAT-01-and-or-rule-conditions.md) — AND/OR combinators for rule conditions instead of an implicit AND (extends FR-CAT-2)
- [x] Transfers between own accounts linked and excluded from income/expense but included in net worth (FR-TRF-1)
- [x] Auto-linking re-runs across the entire dataset on every import (FR-TRF-2)
- [x] High-confidence (same-IBAN) and unique medium-confidence matches auto-linked; ambiguous ones wait for confirmation (FR-TRF-3)
- [x] Matching window and confidence behaviour configurable in settings (FR-TRF-4)
- [x] One-sided movement to an own-account IBAN flagged "likely transfer" before its pair arrives (FR-TRF-5)
- [x] [TICKET-TRF-01](./tickets/TICKET-TRF-01-clear-category-on-link.md) — Clear category when a transaction is linked as a transfer (extends FR-TRF-1)
- [x] [TICKET-TRF-02](./tickets/TICKET-TRF-02-classify-savings-movements.md) — Classify money moved into savings as "savings", not expense (extends FR-TRF-1)
- [x] Each account's current balance and combined net worth (FR-STAT-1)
- [x] Income, expense, net cash flow, and savings rate for the selected date range (FR-STAT-2)
- [x] Category breakdown (expense-by-category, income-by-source) as totals and share-of-total (FR-STAT-3)
- [x] Income/expense trends and net-worth-over-time bucketed at chosen grouping (FR-STAT-4)
- [x] Every stat updates instantly via computed signals (FR-STAT-5)
- [x] Every aggregate drill-down links to its underlying transactions (FR-STAT-6)
- [x] Global date-range picker with presets plus a custom range, and a grouping control (FR-STAT-7)
- [x] Heavy aggregates memoized per `(accountId, granularity, bucketKey)` (NFR-PERF-1) — pragmatic single-pass interpretation, see original ticket notes for the true-incremental-caching trade-off
- [x] ~~[TICKET-STAT-01](./tickets/TICKET-STAT-01-custom-range-enable.md)~~ — superseded by TICKET-STAT-03 below, kept for traceability
- [x] [TICKET-STAT-02](./tickets/TICKET-STAT-02-per-account-networth.md) — Full-history balance chart per account, plus a stacked all-accounts net-worth chart (extends FR-STAT-4/FR-ACC-3)
- [x] [TICKET-STAT-03](./tickets/TICKET-STAT-03-expanded-range-presets-default-grouping.md) — Expanded date-range presets with a linked default grouping (extends FR-STAT-7)

---

Data Management, cross-cutting polish, and the v1.5/v2/v3 roadmap have moved to [../v2/requirements.md](../v2/requirements.md).

## Open decisions blocking some stories above

From spec §9 — resolve before/while building the affected story:
1. Transfer window & confidence defaults (±3 days, no auto-link on ambiguous) — affects the Transfers items
2. Category structure (flat + optional group for v1) — affects the Categorisation items
3. Splits confirmed out of v1 — affects nothing in this list (excluded already)
4. Currency EUR-only for v1 — affects the Data Model, already assumed above
5. Bank preset priority (which of KBC/Belfius/BNP Fortis/ING/Argenta first) — affects TICKET-IMP-01
6. ~~Period definition (calendar month default)~~ **Resolved:** custom date range + day/week/month/quarter grouping, defaulting to the current calendar month grouped by month — see FR-STAT-7

## Definition of Done (applies to every ticket)

Per [CLAUDE.md](../../CLAUDE.md): `ng lint` + `ng test` + `ng build --configuration development` all pass, plus a live browser check for any UI-visible change. Dexie schema changes stay additive; the production bundle budget in `angular.json` is never raised.
