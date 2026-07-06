# Money Mosaic — Code Review Tickets

Tickets for the code-review backlog stories in [../user-stories.md](../user-stories.md). Each ticket carries a description, current situation (as-is), desired result (to-be), and detailed acceptance criteria. `CR-*` IDs trace back to [../../code-review-optimizations.md](../../code-review-optimizations.md).

## §7 Angular patterns

| Ticket | Area | Title | Source story |
|---|---|---|---|
| [NG-01](./TICKET-NG-01-shared-mm-modal.md) | Angular patterns (shared UI) | Extract a shared `mm-modal` component (dialog open/close sync) | user-stories §7, CR-7.1 |
| [NG-02](./TICKET-NG-02-overview-input-binding.md) | Angular patterns (Transactions) | Bind transactions filters via `input()` instead of route snapshot | user-stories §7, CR-7.2 |
| [NG-03](./TICKET-NG-03-url-mirror-skip-noop.md) | Angular patterns (App shell / routing) | Skip redundant navigations in the URL-mirroring effect | user-stories §7, CR-7.3 |
| [NG-04](./TICKET-NG-04-finish-with-archivable.md) | Angular patterns (shared store feature) | Finish `withArchivable` (drop dead `setArchived` or fold the flow in) | user-stories §7, CR-7.4 |

## Definition of Done (applies to every ticket)

Per [CLAUDE.md](../../../CLAUDE.md): `ng lint` + `ng test` + `ng build --configuration development` all pass, plus a live browser check for any UI-visible change. Dexie schema changes stay additive; the production bundle budget in `angular.json` is never raised.
