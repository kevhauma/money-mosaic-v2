# Engineering — ticket index

Every ticket for this area, whichever release shipped it. This file is an **index**: the build order, dependency notes and scope decisions for a given release live in that release's own overview under [docs/releases/](../releases/), linked from each ticket's **Released in** line.

**33 tickets** — 20 done, 13 open.

## CLEANUP

- [ ] [TICKET-CLEANUP-01](./tickets/TICKET-CLEANUP-01-fallow-verified-dead-code.md) — Remove Fallow-verified dead code (and correct stale CR-6.2) · _Code review 2 (CR2)_
- [ ] [TICKET-CLEANUP-02](./tickets/TICKET-CLEANUP-02-fallow-config.md) — Codify the verified fallow false-positive families in `.fallowrc.json` · _v1.3 Code review (CR3)_
- [x] [TICKET-CLEANUP-03](./tickets/TICKET-CLEANUP-03-residual-clones.md) — Fold the residual verified clones (structural-filters block, deletion-cascade glue) · _v1.3 Code review (CR3)_
- [ ] [TICKET-CLEANUP-04](./tickets/TICKET-CLEANUP-04-dexie-minimal-version-declarations.md) — Future Dexie versions declare only the tables they change · _v1.3 Code review (CR3)_
- [x] [TICKET-CLEANUP-05](./tickets/TICKET-CLEANUP-05-delete-bento-grid.md) — Delete the unrendered `bento-grid`/`bento-item` components · _v2 Code review (CR4)_
- [ ] [TICKET-CLEANUP-06](./tickets/TICKET-CLEANUP-06-fallow-zero-noise-gate.md) — Drive the Fallow clean-tree report to zero and gate on new findings · _v2 Code review (CR4)_

## NG

- [x] [TICKET-NG-01](./tickets/TICKET-NG-01-shared-mm-modal.md) — Extract a shared `mm-modal` component (dialog open/close sync) · _Code review 1 (CR1)_
- [x] [TICKET-NG-02](./tickets/TICKET-NG-02-overview-input-binding.md) — Bind transactions filters via `input()` instead of route snapshot · _Code review 1 (CR1)_
- [x] [TICKET-NG-03](./tickets/TICKET-NG-03-url-mirror-skip-noop.md) — Skip redundant navigations in the URL-mirroring effect · _Code review 1 (CR1)_
- [x] [TICKET-NG-04](./tickets/TICKET-NG-04-finish-with-archivable.md) — Finish `withArchivable` (remove dead `setArchived` or fold the flow in) · _Code review 1 (CR1)_
- [x] [TICKET-NG-05](./tickets/TICKET-NG-05-shared-balance-trend-scaffolding.md) — Share the balance-trend signal scaffolding between the two history charts · _v1.3 Code review (CR3)_
- [x] [TICKET-NG-06](./tickets/TICKET-NG-06-confirm-dialog-on-mm-modal.md) — Rebuild `ConfirmDialogComponent` on top of `mm-modal` · _v1.3 Code review (CR3)_
- [ ] [TICKET-NG-07](./tickets/TICKET-NG-07-create-confirm-state.md) — Extract `createConfirmState<T>()` for the delete-confirm scaffolding · _v1.3 Code review (CR3)_
- [x] [TICKET-NG-08](./tickets/TICKET-NG-08-with-persisted-crud-decision.md) — Decide (and if yes, build) a `withPersistedCrud` signal-store feature · _v1.3 Code review (CR3)_
- [ ] [TICKET-NG-09](./tickets/TICKET-NG-09-mm-modal-focus-restore.md) — `mm-modal` restores focus to its trigger on close · _v1.3 Code review (CR3)_
- [x] [TICKET-NG-10](./tickets/TICKET-NG-10-locale-aware-formatting.md) — Locale-aware formatting: fix the drift, consolidate the channels, guard recurrence · _v2 Code review (CR4)_

## PERF

- [x] [TICKET-PERF-01](./tickets/TICKET-PERF-01-echarts-eager-bundle.md) — echarts is eagerly bundled into the initial chunk, breaking the production budget · _v1.2 Auto-categorise_
- [ ] [TICKET-PERF-02](./tickets/TICKET-PERF-02-rules-compile-once.md) — Sort rules and compile regexes once per run-rules pass · _v1.3 Code review (CR3)_
- [ ] [TICKET-PERF-03](./tickets/TICKET-PERF-03-import-batch-id-index.md) — Index `importBatchId` (and `attributionOverride.reimbursementTransferId`) on transactions · _v1.3 Code review (CR3)_
- [ ] [TICKET-PERF-04](./tickets/TICKET-PERF-04-batch-hot-write-paths.md) — Batch the hot write paths into bulk transactions · _v1.3 Code review (CR3)_
- [ ] [TICKET-PERF-05](./tickets/TICKET-PERF-05-hydrate-on-demand.md) — Hydrate stores on demand instead of all upfront · _v1.3 Code review (CR3)_
- [x] [TICKET-PERF-06](./tickets/TICKET-PERF-06-defer-dashboard-panels.md) — Defer below-fold dashboard panels with `@defer (on viewport)` · _v1.3 Code review (CR3)_
- [x] [TICKET-PERF-07](./tickets/TICKET-PERF-07-store-hydration-on-injection.md) — Move store hydration onto first injection (bundle split) · _v1.3 Code review (CR3)_

## SOLID

- [ ] [TICKET-SOLID-01](./tickets/TICKET-SOLID-01-split-transactions-overview.md) — Split `TransactionsOverviewComponent` into filter bar + selection model · _Code review 2 (CR2)_
- [x] [TICKET-SOLID-02](./tickets/TICKET-SOLID-02-type-import-domain.md) — Single-source the import domain unions (`signConvention`, `dateFormat`, `encoding`) · _Code review 2 (CR2)_
- [x] [TICKET-SOLID-03](./tickets/TICKET-SOLID-03-extract-transfer-cleanup-cascade.md) — Extract the shared transfer-cleanup cascade helper · _Code review 2 (CR2)_
- [x] [TICKET-SOLID-04](./tickets/TICKET-SOLID-04-wizard-declarative-reparse.md) — Replace the wizard's hand-rolled reparse plumbing with a declarative pipeline · _Code review 2 (CR2)_
- [ ] [TICKET-SOLID-05](./tickets/TICKET-SOLID-05-entity-stores-to-core.md) — Move the shared entity stores to `core/state`, breaking all 20 barrel cycles · _v1.3 Code review (CR3)_
- [x] [TICKET-SOLID-06](./tickets/TICKET-SOLID-06-attribution-fieldset-extraction.md) — Extract the attribution-override fieldset from `transaction-edit-form` · _v1.3 Code review (CR3)_
- [x] [TICKET-SOLID-07](./tickets/TICKET-SOLID-07-range-state-store-to-core-state.md) — Move `range-state.store.ts` to `core/state/` under the widened placement rule · _v2 Code review (CR4)_

## TEST

- [x] [TICKET-TEST-01](./tickets/TICKET-TEST-01-orchestrator-store-specs.md) — Spec the four untested orchestrator stores · _Code review 2 (CR2)_
- [ ] [TICKET-TEST-02](./tickets/TICKET-TEST-02-first-review-spec-gaps.md) — Close the first review's remaining spec gaps (CR-9) · _v1.3 Code review (CR3)_
- [x] [TICKET-TEST-03](./tickets/TICKET-TEST-03-import-wizard-flow-specs.md) — Pin the import wizard's flow-level behaviors with specs · _v2 Code review (CR4)_
