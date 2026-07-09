# Money Mosaic — v1.1 Tickets

Tickets for the **joint-account refinement** user stories in [../user-stories.md](../user-stories.md). Each ticket carries a description, current situation (as-is), desired result (to-be), and detailed acceptance criteria. FR/NFR IDs trace back to [../../v1/finance-app-spec.md](../../v1/finance-app-spec.md).

These seven ship together as one coherent change — the net-worth contract (STAT-03) consumes the account fields (ACC-02 share + ACC-03 co-owner registry) and the contribution classification (CAT-02); TRF-03 protects the matching that CAT-02 depends on; TXN-03 adds the manual escape hatch for one-off misattributions on top of STAT-03's classifier; TXN-04 is a smaller, independent escape hatch (account/category agnostic) that can ship any time after CAT-02 establishes the income/expense-exclusion pattern it mirrors. Suggested build order: **ACC-02 + ACC-03 → CAT-02 → TRF-03 → STAT-03 → TXN-03**, with **TXN-04** free to land in parallel once CAT-02 is in.

| Ticket | Area | Title | Source story |
|---|---|---|---|
| [ACC-02](./TICKET-ACC-02-joint-ownership-share.md) | Accounts | Ownership/contribution share on joint accounts | user-stories §1, extends FR-ACC-1 |
| [ACC-03](./TICKET-ACC-03-multi-owner-coowner-ibans.md) | Accounts | Multi-owner joint accounts with per-contributor IBANs | user-stories §1, extends FR-ACC-1 / FR-ACC-4 |
| [CAT-02](./TICKET-CAT-02-neutral-category-kind.md) | Categorisation | "Neutral" category kind for partner/external contributions | user-stories §4, extends FR-CAT-1 / FR-STAT-2 |
| [STAT-03](./TICKET-STAT-03-contribution-net-worth.md) | Statistics & Dashboard | Contribution-based net worth for joint accounts | user-stories §6, changes FR-STAT-1 / FR-TRF-1 semantics |
| [TRF-03](./TICKET-TRF-03-guard-partner-inflow-matching.md) | Transfers | Guard transfer auto-matching against one-sided partner inflows | user-stories §5, extends FR-TRF-3 / FR-TRF-5 |
| [TXN-03](./TICKET-TXN-03-manual-attribution-override.md) | Transactions | Manual attribution override for misattributed joint/personal expenses | user-stories §3, extends FR-TXN-1 / FR-TXN-2 |
| [TXN-04](./TICKET-TXN-04-nullify-transaction.md) | Transactions | Nullify a transaction (neither income nor expense) | user-stories §3, extends FR-TXN-1, changes FR-STAT-2 / FR-STAT-3 |

## Definition of Done (applies to every ticket)

Per [../../../CLAUDE.md](../../../CLAUDE.md): `ng lint` + `ng test` + `ng build --configuration development` all pass, plus a live browser check for any UI-visible change. Dexie schema changes stay additive (next version is **6** — current shipped version is 5); the production bundle budget in `angular.json` is never raised. Components/stores persist through a repository, never a direct `appDb.<table>` write. Rules never overwrite a manually-set category (`categoryManual`).


order:
- ACC-02 (ownership share) and ACC-03 (co-owner registry) are the foundation — no blocking dependencies, and everything else (CAT-02, TRF-03, STAT-03, TXN-03) explicitly traces back to them.
- CAT-02 (neutral category) needs ACC-03's co-owner IBAN registry for auto-tagging.
- TRF-03 (transfer-matching guard) needs ACC-03 too.
- STAT-03 (contribution net worth) explicitly says "do not start until ACC-02 + ACC-03 + CAT-02 are all merged."
- TXN-03 (manual attribution override) explicitly says "build last in the v1.1 sequence."
- TXN-04 (nullify transaction) is independent/standalone — no joint-account dependency at all.

---

## QoL addendum

Added later, after the joint-account set above had already shipped (ACC-02/03, CAT-02, STAT-03 are `[x]` in user-stories.md; TRF-03, TXN-03, TXN-04 remain open independently of this addendum). These six are grouped into v1.1 by *timing* — ship before any further new-feature work (e.g. v1.4 Income growth) — not by relationship to joint accounts or to each other. **All six are mutually independent.**

| Ticket | Area | Title | Source story |
|---|---|---|---|
| [TRF-04](./TICKET-TRF-04-normalize-iban-matching.md) | Transfers | Normalize IBAN comparisons for savings/transfer detection (**bugfix**) | user-stories §5, fixes FR-TRF-1/3/5, FR-STAT-2 |
| [TXN-05](./TICKET-TXN-05-inline-category-quickset.md) | Transactions | Inline category quick-set on transaction rows | user-stories §3, extends FR-TXN-2 |
| [TXN-06](./TICKET-TXN-06-original-csv-line-detail.md) | Transactions / Import | Keep the original CSV line and show it in a transaction detail view | user-stories §3, extends FR-TXN-1 / FR-IMP-1 |
| [ACC-04](./TICKET-ACC-04-manual-account-ordering.md) | Accounts | Manual account ordering | user-stories §1, extends FR-ACC-1 |
| [CAT-03](./TICKET-CAT-03-manual-category-ordering.md) | Categorisation | Manual category ordering | user-stories §4, extends FR-CAT-1 |
| [STAT-10](./TICKET-STAT-10-unified-date-range-picker.md) | Statistics / shared UI | Unified from/to date-range field | user-stories §6, extends FR-STAT-7, touches FR-TXN-3 |

Suggested order (impact/effort, not dependency):

1. **TRF-04** — bugfix, root cause already confirmed, smallest and most contained change.
2. **TXN-05** — highest daily-friction reduction, reuses the existing bulk-assign write path.
3. **TXN-06** — adds a field captured at import time; do before ACC-04/CAT-03 so the transaction edit-form popup change and the new `rawLine` field aren't reviewed alongside unrelated reorder UI.
4. **ACC-04** / **CAT-03** — same shape (add `sortOrder`, sort in the store, add move-up/move-down UI); build back-to-back so the reorder interaction stays consistent between the two.
5. **STAT-10** — touches two existing call sites (topbar switcher, transaction filters); do last since it has the widest visual surface to verify.

**Addendum-specific DoD notes:** no Dexie schema version bump for this set — ACC-04, CAT-03, and TXN-06 each add one optional, non-indexed field (`sortOrder` ×2, `rawLine`) the same additive way v1.4's planned `Category.smoothAnnually` does; TRF-04 is comparison-logic only. No new dependency (e.g. `@angular/cdk`) is pulled in for ACC-04/CAT-03 — see "Considered, not ticketed yet" in `user-stories.md`.