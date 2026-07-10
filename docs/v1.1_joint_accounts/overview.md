# Money Mosaic — v1.1 Joint accounts (Overview)

Split out of the v1.5 line item in [../v2/requirements.md](../v2/requirements.md) — *"joint-account splitting (configurable share, own-account deposits excluded)"*. These stories refine v1 behaviour for **joint accounts**: how much of a shared pot counts as *my* net worth, how money arriving from a partner/other person is kept out of my income, and the aggregation/matching pitfalls that follow. FR/NFR IDs trace back to [../v1/finance-app-spec.md](../v1/finance-app-spec.md); where behaviour changes a shipped FR, the ticket says so explicitly. Each ticketed line links to a `tickets/TICKET-*.md` file carrying its own user story, description, as-is/to-be, and acceptance criteria — this file is only the index + build order, and the two lists below are listed in recommended build order, not grouped by FR area.

**Net-worth model decision (governs the whole joint-account track):** joint accounts use **contribution tracking**, not share-of-balance. My stake in a joint account is what *I* put in (deposits from my own accounts + my own income into the pot, at 100%) minus my share of what the pot *spends* — not a flat fraction of the bank balance. This keeps transfers into a joint account netting to zero in net worth. The trade-off (an informal "my partner owes the pot" balance can show up as my net worth) is accepted and documented in the tickets.

**QoL addendum (added after the joint-account track shipped):** six unrelated small changes — reordering accounts/categories, faster inline categorisation, a unified date-range field, viewing a transaction's original CSV line, and a bugfix — folded into this same version rather than a new one, since they're meant to ship **before** any further new-feature work (e.g. v1.4 Income growth). It is a fully independent track: none of the six depend on the joint-account track or on each other; they're grouped here by timing, not by relationship. TICKET-TRF-04 is a **bugfix**, everything else is a **Feature**.

## Joint-account track

The net-worth contract (STAT-03) consumes the account fields (ACC-02 share + ACC-03 co-owner registry) and the contribution classification (CAT-02); TRF-03 protects the matching that CAT-02 depends on; TXN-03 adds the manual escape hatch for one-off misattributions on top of STAT-03's classifier; TXN-04 is a smaller, independent escape hatch that can ship any time after CAT-02 establishes the income/expense-exclusion pattern it mirrors.

- [x] [TICKET-ACC-02](./tickets/TICKET-ACC-02-joint-ownership-share.md) — Ownership/contribution share on joint accounts (extends FR-ACC-1)
- [x] [TICKET-ACC-03](./tickets/TICKET-ACC-03-multi-owner-coowner-ibans.md) — Multi-owner joint accounts with per-contributor IBANs (extends FR-ACC-1 / FR-ACC-4)
- [x] [TICKET-CAT-02](./tickets/TICKET-CAT-02-neutral-category-kind.md) — "Neutral" category kind for partner/external contributions (extends FR-CAT-1 / FR-STAT-2, needs ACC-03's co-owner IBAN registry)
- [ ] [TICKET-TRF-03](./tickets/TICKET-TRF-03-guard-partner-inflow-matching.md) — Guard transfer auto-matching against one-sided partner inflows (extends FR-TRF-3 / FR-TRF-5, needs ACC-03; protects the matching CAT-02 depends on)
- [x] [TICKET-STAT-03](./tickets/TICKET-STAT-03-contribution-net-worth.md) — Contribution-based net worth for joint accounts (changes FR-STAT-1 / FR-TRF-1 semantics; do not start until ACC-02 + ACC-03 + CAT-02 are merged)
- [ ] [TICKET-TXN-03](./tickets/TICKET-TXN-03-manual-attribution-override.md) — Manual attribution override for misattributed joint/personal expenses (extends FR-TXN-1 / FR-TXN-2; build last in this track)
- [ ] [TICKET-TXN-04](./tickets/TICKET-TXN-04-nullify-transaction.md) — Nullify a transaction, neither income nor expense (extends FR-TXN-1, changes FR-STAT-2 / FR-STAT-3; independent/standalone, free to land any time in parallel)

## QoL addendum track (impact/effort, not dependency)

- [ ] [TICKET-TRF-04](./tickets/TICKET-TRF-04-normalize-iban-matching.md) — Normalize IBAN comparisons for savings/transfer detection (**bugfix**) (fixes FR-TRF-1/3/5, FR-STAT-2) — root cause already confirmed, smallest and most contained change
- [ ] [TICKET-TXN-05](./tickets/TICKET-TXN-05-inline-category-quickset.md) — Inline category quick-set on transaction rows (extends FR-TXN-2) — highest daily-friction reduction, reuses the existing bulk-assign write path
- [ ] [TICKET-TXN-06](./tickets/TICKET-TXN-06-original-csv-line-detail.md) — Keep and show the original CSV line on a transaction (extends FR-TXN-1 / FR-IMP-1) — do before ACC-04/CAT-03 so the edit-form popup change and the new `rawLine` field aren't reviewed alongside unrelated reorder UI
- [ ] [TICKET-ACC-04](./tickets/TICKET-ACC-04-manual-account-ordering.md) — Manual account ordering (extends FR-ACC-1) — same shape as CAT-03, build back-to-back so the reorder interaction stays consistent
- [ ] [TICKET-CAT-03](./tickets/TICKET-CAT-03-manual-category-ordering.md) — Manual category ordering (extends FR-CAT-1) — same shape as ACC-04, build back-to-back
- [ ] [TICKET-STAT-10](./tickets/TICKET-STAT-10-unified-date-range-picker.md) — Unified from/to date-range field (extends FR-STAT-7, touches FR-TXN-3) — touches two existing call sites, do last since it has the widest visual surface to verify

## Considered, not ticketed yet

- **Drag-and-drop reordering** — TICKET-ACC-04/TICKET-CAT-03 default to move-up/move-down buttons to avoid pulling in `@angular/cdk` (not currently a dependency) just for two lists. A real drag interaction is a reasonable follow-up if buttons feel clunky in practice.
- **Bulk inline categorisation shortcuts beyond the existing bulk bar** (e.g. keyboard-driven "categorise and advance to next row") — TICKET-TXN-05 only removes the modal/save round-trip for a single row; a faster bulk-triage flow is a different, larger story.

## Definition of Done (applies to every ticket)

Per [../../CLAUDE.md](../../CLAUDE.md): `ng lint` + `ng test` + `ng build --configuration development` all pass, plus a live browser check for any UI-visible change. Dexie schema changes stay additive (next version is **6** — current shipped version is 5); the production bundle budget in `angular.json` is never raised. Components/stores persist through a repository, never a direct `appDb.<table>` write. Rules never overwrite a manually-set category (`categoryManual`).

**Addendum-specific DoD notes:** no Dexie schema version bump for this set — ACC-04, CAT-03, and TXN-06 each add one optional, non-indexed field (`sortOrder` ×2, `rawLine`) the same additive way v1.4's `Category.smoothAnnually` does; TRF-04 is comparison-logic only. No new dependency (e.g. `@angular/cdk`) is pulled in for ACC-04/CAT-03 — see "Considered, not ticketed yet" above.
