# Engineering — ticket index

Every ticket for this area, whichever release shipped it. This file is an **index**: the build order, dependency notes and scope decisions for a given release live in that release's own overview under [docs/releases/](../releases/), linked from each ticket's **Released in** line.

**50 tickets** — 31 done, 19 open.

## CLEANUP

- [x] [TICKET-CLEANUP-01](./tickets/TICKET-CLEANUP-01-fallow-verified-dead-code.md) — Remove Fallow-verified dead code (and correct stale CR-6.2) · _Code review 2 (CR2)_
- [x] [TICKET-CLEANUP-02](./tickets/TICKET-CLEANUP-02-fallow-config.md) — Codify the verified fallow false-positive families in `.fallowrc.json` · _v1.3 Code review (CR3)_
- [x] [TICKET-CLEANUP-03](./tickets/TICKET-CLEANUP-03-residual-clones.md) — Fold the residual verified clones (structural-filters block, deletion-cascade glue) · _v1.3 Code review (CR3)_
- [x] [TICKET-CLEANUP-04](./tickets/TICKET-CLEANUP-04-dexie-minimal-version-declarations.md) — Future Dexie versions declare only the tables they change · _v1.3 Code review (CR3)_
- [x] [TICKET-CLEANUP-05](./tickets/TICKET-CLEANUP-05-delete-bento-grid.md) — Delete the unrendered `bento-grid`/`bento-item` components · _v2 Code review (CR4)_
- [ ] [TICKET-CLEANUP-06](./tickets/TICKET-CLEANUP-06-fallow-zero-noise-gate.md) — Drive the Fallow clean-tree report to zero and gate on new findings · _v2 Code review (CR4)_

## NG

- [x] [TICKET-NG-01](./tickets/TICKET-NG-01-shared-mm-modal.md) — Extract a shared `mm-modal` component (dialog open/close sync) · _Code review 1 (CR1)_
- [x] [TICKET-NG-02](./tickets/TICKET-NG-02-overview-input-binding.md) — Bind transactions filters via `input()` instead of route snapshot · _Code review 1 (CR1)_
- [x] [TICKET-NG-03](./tickets/TICKET-NG-03-url-mirror-skip-noop.md) — Skip redundant navigations in the URL-mirroring effect · _Code review 1 (CR1)_
- [x] [TICKET-NG-04](./tickets/TICKET-NG-04-finish-with-archivable.md) — Finish `withArchivable` (remove dead `setArchived` or fold the flow in) · _Code review 1 (CR1)_
- [x] [TICKET-NG-05](./tickets/TICKET-NG-05-shared-balance-trend-scaffolding.md) — Share the balance-trend signal scaffolding between the two history charts · _v1.3 Code review (CR3)_
- [x] [TICKET-NG-06](./tickets/TICKET-NG-06-confirm-dialog-on-mm-modal.md) — Rebuild `ConfirmDialogComponent` on top of `mm-modal` · _v1.3 Code review (CR3)_
- [x] [TICKET-NG-07](./tickets/TICKET-NG-07-create-confirm-state.md) — Extract `createConfirmState<T>()` for the delete-confirm scaffolding · _v1.3 Code review (CR3)_
- [x] [TICKET-NG-08](./tickets/TICKET-NG-08-with-persisted-crud-decision.md) — Decide (and if yes, build) a `withPersistedCrud` signal-store feature · _v1.3 Code review (CR3)_
- [x] [TICKET-NG-09](./tickets/TICKET-NG-09-mm-modal-focus-restore.md) — `mm-modal` restores focus to its trigger on close · _v1.3 Code review (CR3)_
- [x] [TICKET-NG-10](./tickets/TICKET-NG-10-locale-aware-formatting.md) — Locale-aware formatting: fix the drift, consolidate the channels, guard recurrence · _v2 Code review (CR4)_
- [ ] [TICKET-NG-11](./tickets/TICKET-NG-11-dashboard-waits-for-settings.md) — The dashboard waits for its settings stores, so no write starts from unloaded defaults (bug fix, CR6-14 — the dashboard gates only on transactions + accounts, so a toggle after a failed settings load overwrites the saved list with defaults) — independent · _unreleased_
- [ ] [TICKET-NG-12](./tickets/TICKET-NG-12-settings-inputs-keep-typing.md) — Settings text fields never drop typed characters (bug fix, CR6-27 — `linkControlToSetting` saves every keystroke and writes each late reply back into the focused field) — independent · _unreleased_
- [ ] [TICKET-NG-13](./tickets/TICKET-NG-13-failed-saves-surfaced.md) — Failed saves are shown; dialogs close only on success (bug fix, CR6-19 — goal/loan forms close before the save runs and nothing surfaces a rejected write) — independent · _unreleased_
- [ ] [TICKET-NG-14](./tickets/TICKET-NG-14-hydration-generation-guard.md) — Store hydration ignores loads a reset or newer load superseded (bug fix, CR5-7 — `createHydration` has no generation guard, so a load in flight at sign-out patches the next user's store) — independent · _unreleased_
- [ ] [TICKET-NG-15](./tickets/TICKET-NG-15-api-client-keeps-http-status.md) — ApiClient keeps the HTTP status on its rejections (bug fix, CR6-26 — `asRejection` flattens 4xx/5xx to a plain `Error`, so `reportIfUnexpected` logs every server answer) — independent · _unreleased_
- [ ] [TICKET-NG-16](./tickets/TICKET-NG-16-no-negative-zero.md) — Formatters never print "-0,00" or "-0%" (bug fix, CR5-24 — default `signDisplay` keeps the minus on a value that rounds to zero, and `moneyColor` tests `< 0`) — independent · _unreleased_
- [ ] [TICKET-NG-17](./tickets/TICKET-NG-17-reorder-ties-renumbered.md) — Reorder renumbers tied or missing sort orders, and new accounts/categories get one (bug fix, CR6-20 — swapping two equal order values writes the same value to both) — independent · _unreleased_
- [ ] [TICKET-NG-18](./tickets/TICKET-NG-18-reorder-within-visible-list.md) — Reorder swaps within the visible list, not with hidden archived rows (bug fix, CR6-20 — `moveAccount`/`moveCategory` pick the neighbour from the full list, archived included) — independent · _unreleased_
- [ ] [TICKET-NG-19](./tickets/TICKET-NG-19-accounts-store-no-raw-remove.md) — `AccountsStore` exposes no `remove()` that skips the delete cascade (CR6-20; TICKET-NG-08's `withPersistedCrud` always adds a public `remove`) — independent · _unreleased_
- [ ] [TICKET-NG-20](./tickets/TICKET-NG-20-atomic-reorder.md) — Moving an account or category saves both positions atomically (bug fix, CR6-20 — two independent PATCHes via `Promise.all`; goals already use one bulk request) — independent · _unreleased_
- [ ] [TICKET-NG-21](./tickets/TICKET-NG-21-api-client-absent-uses-status.md) — `ApiClient.absent()` checks the status, not `instanceof HttpErrorResponse` (bug fix, CR6-26 — the identity check the file itself warns against) — independent · _unreleased_
- [ ] [TICKET-NG-22](./tickets/TICKET-NG-22-list-toggles-keep-clicks.md) — Settings list toggles never lose a click (bug fix, CR6-27 — each toggle sends the whole list built from client state before the previous write landed) — independent · _unreleased_

## PERF

- [x] [TICKET-PERF-01](./tickets/TICKET-PERF-01-echarts-eager-bundle.md) — echarts is eagerly bundled into the initial chunk, breaking the production budget · _v1.2 Auto-categorise_
- [x] [TICKET-PERF-02](./tickets/TICKET-PERF-02-rules-compile-once.md) — Sort rules and compile regexes once per run-rules pass · _v1.3 Code review (CR3)_
- [x] [TICKET-PERF-03](./tickets/TICKET-PERF-03-import-batch-id-index.md) — Index `importBatchId` (and `attributionOverride.reimbursementTransferId`) on transactions · _v1.3 Code review (CR3)_
- [x] [TICKET-PERF-04](./tickets/TICKET-PERF-04-batch-hot-write-paths.md) — Batch the hot write paths into bulk transactions · _v1.3 Code review (CR3)_
- [x] [TICKET-PERF-05](./tickets/TICKET-PERF-05-hydrate-on-demand.md) — Hydrate stores on demand instead of all upfront · _v1.3 Code review (CR3)_
- [x] [TICKET-PERF-06](./tickets/TICKET-PERF-06-defer-dashboard-panels.md) — Defer below-fold dashboard panels with `@defer (on viewport)` · _v1.3 Code review (CR3)_
- [x] [TICKET-PERF-07](./tickets/TICKET-PERF-07-store-hydration-on-injection.md) — Move store hydration onto first injection (bundle split) · _v1.3 Code review (CR3)_

## SOLID

- [ ] [TICKET-SOLID-01](./tickets/TICKET-SOLID-01-split-transactions-overview.md) — Split `TransactionsOverviewComponent` into filter bar + selection model · _Code review 2 (CR2)_
- [x] [TICKET-SOLID-02](./tickets/TICKET-SOLID-02-type-import-domain.md) — Single-source the import domain unions (`signConvention`, `dateFormat`, `encoding`) · _Code review 2 (CR2)_
- [x] [TICKET-SOLID-03](./tickets/TICKET-SOLID-03-extract-transfer-cleanup-cascade.md) — Extract the shared transfer-cleanup cascade helper · _Code review 2 (CR2)_
- [x] [TICKET-SOLID-04](./tickets/TICKET-SOLID-04-wizard-declarative-reparse.md) — Replace the wizard's hand-rolled reparse plumbing with a declarative pipeline · _Code review 2 (CR2)_
- [x] [TICKET-SOLID-05](./tickets/TICKET-SOLID-05-entity-stores-to-core.md) — Move the shared entity stores to `core/state`, breaking all 20 barrel cycles · _v1.3 Code review (CR3)_
- [x] [TICKET-SOLID-06](./tickets/TICKET-SOLID-06-attribution-fieldset-extraction.md) — Extract the attribution-override fieldset from `transaction-edit-form` · _v1.3 Code review (CR3)_
- [x] [TICKET-SOLID-07](./tickets/TICKET-SOLID-07-range-state-store-to-core-state.md) — Move `range-state.store.ts` to `core/state/` under the widened placement rule · _v2 Code review (CR4)_
- [ ] [TICKET-SOLID-08](./tickets/TICKET-SOLID-08-local-today.md) — One local-date "today" helper replaces the ~25 UTC copies (bug fix, CR5-11, FR-STAT-7 — "today" is `new Date().toISOString().slice(0, 10)`, the UTC date, in 24 places) — independent · _unreleased_
- [ ] [TICKET-SOLID-09](./tickets/TICKET-SOLID-09-shared-balance-formula.md) — Client and MCP share one balance formula (CR6-A4, FR-STAT-1) — independent · _unreleased_
- [ ] [TICKET-SOLID-10](./tickets/TICKET-SOLID-10-one-month-step-rule.md) — One month-step rule that clamps to month-end (bug fix, CR6-A1 — `addMonths` lets the day overflow while `stepBy` and the month-end helpers clamp) — do before LOAN-17, REC-13, FUT-11 · _unreleased_
- [ ] [TICKET-SOLID-11](./tickets/TICKET-SOLID-11-drop-private-date-helpers.md) — Private date-helper copies use the canonical `date-buckets` helpers (CR5-23, CR6-A1) — after SOLID-10 · _unreleased_
- [ ] [TICKET-SOLID-12](./tickets/TICKET-SOLID-12-one-percent-delta.md) — One `percentDelta` replaces the four private copies (CR6-A4, CR5-23, FR-STAT-11) — independent · _unreleased_

## TEST

- [x] [TICKET-TEST-01](./tickets/TICKET-TEST-01-orchestrator-store-specs.md) — Spec the four untested orchestrator stores · _Code review 2 (CR2)_
- [x] [TICKET-TEST-02](./tickets/TICKET-TEST-02-first-review-spec-gaps.md) — Close the first review's remaining spec gaps (CR-9) · _v1.3 Code review (CR3)_
- [x] [TICKET-TEST-03](./tickets/TICKET-TEST-03-import-wizard-flow-specs.md) — Pin the import wizard's flow-level behaviors with specs · _v2 Code review (CR4)_
