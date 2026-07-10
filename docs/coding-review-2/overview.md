# Money Mosaic — Code Review 2 Backlog (Overview)

Derived from [./code-review-dx-solid.md](./code-review-dx-solid.md) (DX / maintainability / SOLID review, 2026-07-07). Sibling to the [first review's backlog](../code-review/overview.md) (correctness/performance); `CR2-*` IDs trace back to the review doc. Most items here were fixed directly (no separate ticket file — the review item number plus the code link is the record); only six items got a full ticket. Each ticketed line links to a `tickets/TICKET-*.md` file carrying its own user story, description, as-is/to-be, and acceptance criteria.

The list below is in recommended build order, not grouped by review section:

- [ ] [TICKET-CLEANUP-01](./tickets/TICKET-CLEANUP-01-fallow-verified-dead-code.md) — Remove Fallow-verified dead code and correct the stale first-review CR-6.2 advice (CR2-6.4) — independent, ~10 lines; corrects the stale advice everything else should stop citing
- [x] [TICKET-TEST-01](./tickets/TICKET-TEST-01-orchestrator-store-specs.md) — Spec the four untested orchestrator stores (CR2-5.1) — safety net for the refactors below
- [x] [TICKET-SOLID-02](./tickets/TICKET-SOLID-02-type-import-domain.md) — Single-source the import domain unions (`signConvention`, `dateFormat`, `encoding`) (CR2-3.1/3.2) — small, independent
- [x] [TICKET-SOLID-03](./tickets/TICKET-SOLID-03-extract-transfer-cleanup-cascade.md) — Extract the shared transfer-cleanup cascade helper (CR2-4.2, CR2-4.3, also deletes the dead `DeleteAccountResult` alias) — small, independent
- [ ] De-duplicate rule field/operator display labels between `rule-form` and `rule-summary` (CR2-3.3) — small independent cleanup, can slot in alongside SOLID-02/03
- [ ] Schedule CR-6.1 (entity stores to `core/state`) before the next cross-store feature; add an interim `ownSavingsIbans` computed on `AccountsStore` meanwhile (CR2-4.1) — small independent cleanup, can slot in alongside SOLID-02/03
- [x] [TICKET-SOLID-04](./tickets/TICKET-SOLID-04-wizard-declarative-reparse.md) — Replace the wizard's hand-rolled reparse plumbing with a declarative pipeline (CR2-2.2) — moderate, independent of the SOLID-01 split
- [ ] [TICKET-SOLID-01](./tickets/TICKET-SOLID-01-split-transactions-overview.md) — Split `TransactionsOverviewComponent` into filter bar + selection model (CR2-2.1, folds in CR2-6.2's pure-filter-function extraction; sequence with [TICKET-NG-02](../code-review/tickets/TICKET-NG-02-overview-input-binding.md)) — the largest ticket
- [ ] Extract the categoryId-merge inside `ImportBatchesStore.commitImport` as a pure `applyCategoryUpdates` function (CR2-2.3, [import-batches.store.ts:40](../../src/app/feature-import/import-batches.store.ts)) — natural to do once SOLID-01 has settled the transactions-store patterns
- [ ] Decide yes/no on a `withPersistedCrud` signal-store feature for the five persist-then-patch CRUD stores, after [TICKET-NG-04](../code-review/tickets/TICKET-NG-04-finish-with-archivable.md) proves the store-feature pattern out (CR2-4.4) — standalone decision, no dependency on anything above
- [ ] Extract `createConfirmState<T>()` for the delete-confirm scaffolding duplicated between `accounts-overview` and `categories-overview` (CR2-6.3, Fallow `dup:edd1ec44`) — standalone cleanup, no dependency on anything above
- [ ] Decide on codifying Fallow for recurring runs — a minimal `.fallowrc.json` covering the known false-positive families plus an identity baseline (CR2-6.5) — standalone decision, no dependency on anything above
- [ ] Fix stale doc paths left by the `docs/v1` → `docs/v1.0_foundation` reorg — CLAUDE.md's knowledge table, the `project-map` skill, the code-review backlog's sibling link (CR2-1.1) — **no ticket filed yet**; a `TICKET-DX-01` link was named in the original story but the file was never created; doc/process hygiene, fully independent of the code items above, can run in parallel at any time
- [ ] Commit messages describe the actual diff (docs-only changes typed `docs:`, no claimed-but-unbuilt features), enforced via commitlint on the existing husky hook (CR2-1.2, `80af6be`/`1d97d49`) — doc/process hygiene, independent
- [ ] Decide one version-folder naming scheme (`vX.Y_name` everywhere or plain `vX`) before the next milestone folder is created (CR2-1.3) — doc/process hygiene, independent

## Definition of Done (applies to every ticket)

Per [../../CLAUDE.md](../../CLAUDE.md): `ng lint` + `ng test` + `ng build --configuration development` all pass, plus a live browser check for any UI-visible change. Dexie schema changes stay additive; the production bundle budget in `angular.json` is never raised.
