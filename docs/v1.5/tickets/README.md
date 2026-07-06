# Money Mosaic — v1.5 Tickets

Tickets for the **joint-account refinement** user stories in [../user-stories.md](../user-stories.md). Each ticket carries a description, current situation (as-is), desired result (to-be), and detailed acceptance criteria. FR/NFR IDs trace back to [../../v1/finance-app-spec.md](../../v1/finance-app-spec.md).

These five ship together as one coherent change — the net-worth contract (STAT-03) consumes the account fields (ACC-02 share + ACC-03 co-owner registry) and the contribution classification (CAT-02); TRF-03 protects the matching that CAT-02 depends on. Suggested build order: **ACC-02 + ACC-03 → CAT-02 → TRF-03 → STAT-03**.

| Ticket | Area | Title | Source story |
|---|---|---|---|
| [ACC-02](./TICKET-ACC-02-joint-ownership-share.md) | Accounts | Ownership/contribution share on joint accounts | user-stories §1, extends FR-ACC-1 |
| [ACC-03](./TICKET-ACC-03-multi-owner-coowner-ibans.md) | Accounts | Multi-owner joint accounts with per-contributor IBANs | user-stories §1, extends FR-ACC-1 / FR-ACC-4 |
| [CAT-02](./TICKET-CAT-02-neutral-category-kind.md) | Categorisation | "Neutral" category kind for partner/external contributions | user-stories §4, extends FR-CAT-1 / FR-STAT-2 |
| [STAT-03](./TICKET-STAT-03-contribution-net-worth.md) | Statistics & Dashboard | Contribution-based net worth for joint accounts | user-stories §6, changes FR-STAT-1 / FR-TRF-1 semantics |
| [TRF-03](./TICKET-TRF-03-guard-partner-inflow-matching.md) | Transfers | Guard transfer auto-matching against one-sided partner inflows | user-stories §5, extends FR-TRF-3 / FR-TRF-5 |

## Definition of Done (applies to every ticket)

Per [../../../CLAUDE.md](../../../CLAUDE.md): `ng lint` + `ng test` + `ng build --configuration development` all pass, plus a live browser check for any UI-visible change. Dexie schema changes stay additive (next version is **6** — current shipped version is 5); the production bundle budget in `angular.json` is never raised. Components/stores persist through a repository, never a direct `appDb.<table>` write. Rules never overwrite a manually-set category (`categoryManual`).
