# Money Mosaic — v1 Remaining Tickets

Tickets for the **unchecked** user stories in [../user-stories.md](../user-stories.md). Each ticket carries a description, current situation (as-is), desired result (to-be), and detailed acceptance criteria. FR/NFR IDs trace back to [../finance-app-spec.md](../finance-app-spec.md).

| Ticket | Area | Title | Source story |
|---|---|---|---|
| [DEV-01](./TICKET-DEV-01-seed-dev-data.md) | Dev Tooling | Seed sample dev data on a fresh browser in dev mode | user-stories §0, dev-only |
| [ACC-01](./TICKET-ACC-01-clear-account-transactions.md) | Accounts | Clear an account's transactions without deleting the account | user-stories §1, extends FR-ACC-2 |
| [IMP-01](./TICKET-IMP-01-bank-presets.md) | Import | Bank presets for BNP Paribas Fortis, ING & Argenta | user-stories §2, FR-IMP, Open Decision #5 |
| [IMP-02](./TICKET-IMP-02-batch-multi-file-mapping.md) | Import | Map a multi-file import batch once | user-stories §2, FR-IMP-1/3 |
| [IMP-03](./TICKET-IMP-03-header-mismatch-error.md) | Import | Surface header/mapping mismatch per file | user-stories §2, FR-IMP-8 |
| [TXN-01](./TICKET-TXN-01-bulk-category-assign.md) | Transactions | Bulk-assign a category to selected rows | user-stories §3, ui-layout §4.3 |
| [TXN-02](./TICKET-TXN-02-virtualized-table.md) | Transactions | Virtualize the transactions table | user-stories §3, NFR-PERF-1 |
| [CAT-01](./TICKET-CAT-01-and-or-rule-conditions.md) | Categorisation | AND/OR combinators for rule conditions | user-stories §4, FR-CAT-2 |
| [TRF-01](./TICKET-TRF-01-clear-category-on-link.md) | Transfers | Clear category when a transaction is linked | user-stories §5, FR-TRF-1 |
| [TRF-02](./TICKET-TRF-02-classify-savings-movements.md) | Transfers | Classify money moved into savings as "savings", not expense | user-stories §5, extends FR-TRF-1 |
| [STAT-01](./TICKET-STAT-01-custom-range-enable.md) | Stats | Enable custom range on "Custom" preset | user-stories §6, FR-STAT-7 (bug) |
| [STAT-02](./TICKET-STAT-02-per-account-networth.md) | Stats | Per-account net-worth-over-time chart | user-stories §6, FR-STAT-4 |

## Definition of Done (applies to every ticket)

Per [CLAUDE.md](../../../CLAUDE.md): `ng lint` + `ng test` + `ng build --configuration development` all pass, plus a live browser check for any UI-visible change. Dexie schema changes stay additive; the production bundle budget in `angular.json` is never raised.
