# Money Mosaic — Code Review 2 Tickets

Tickets for the DX/maintainability/SOLID backlog stories in [../user-stories.md](../user-stories.md). Each ticket carries a description, current situation (as-is), desired result (to-be), and detailed acceptance criteria. `CR2-*` IDs trace back to [../code-review-dx-solid.md](../code-review-dx-solid.md).

| Ticket | Area | Title | Source |
|---|---|---|---|
| [SOLID-01](./TICKET-SOLID-01-split-transactions-overview.md) | SRP (Transactions) | Split `TransactionsOverviewComponent` into filter bar + selection model | CR2-2.1 |
| [SOLID-02](./TICKET-SOLID-02-type-import-domain.md) | OCP / type safety (Import) | Single-source the import domain unions (`signConvention`, `dateFormat`, `encoding`) | CR2-3.1, CR2-3.2 |
| [SOLID-03](./TICKET-SOLID-03-extract-transfer-cleanup-cascade.md) | DRY (Core) | Extract the shared transfer-cleanup cascade helper | CR2-4.2, CR2-4.3 |
| [SOLID-04](./TICKET-SOLID-04-wizard-declarative-reparse.md) | SRP (Import) | Replace the wizard's hand-rolled reparse plumbing with a declarative pipeline | CR2-2.2 |
| [TEST-01](./TICKET-TEST-01-orchestrator-store-specs.md) | Testing | Spec the four untested orchestrator stores | CR2-5.1 |
| [CLEANUP-01](./TICKET-CLEANUP-01-fallow-verified-dead-code.md) | Dead code | Remove Fallow-verified dead code (and correct stale CR-6.2) | CR2-6.4 |

Suggested order: **CLEANUP-01** (independent, ~10 lines) → **TEST-01** (safety net for the rest) → **SOLID-02 / SOLID-03** (small, independent) → **SOLID-04** → **SOLID-01** (after or with [NG-02](../../code-review/tickets/TICKET-NG-02-overview-input-binding.md)).

## Definition of Done (applies to every ticket)

Per [CLAUDE.md](../../../CLAUDE.md): `ng lint` + `ng test` + `ng build --configuration development` all pass, plus a live browser check for any UI-visible change. Dexie schema changes stay additive; the production bundle budget in `angular.json` is never raised.
