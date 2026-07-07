# Money Mosaic — Code Review 2 Backlog (User Stories)

Derived from [./code-review-dx-solid.md](./code-review-dx-solid.md) (DX / maintainability / SOLID review, 2026-07-07). Sibling to the [first review's backlog](../code-review/user-stories.md) (correctness/performance); `CR2-*` IDs trace back to the review doc. Ordered most-impactful-first within each section.

## 1. Developer experience

- [ ] As a developer (or agent) onboarding via CLAUDE.md, I want every documented spec path to resolve after the `docs/v1` → `docs/v1.0_foundation` reorg — CLAUDE.md's knowledge table, the `project-map` skill, and the code-review backlog's sibling link — so the documented entry points stop routing readers to files that don't exist ([TICKET-DX-01](./tickets/TICKET-DX-01-fix-stale-doc-paths.md), CR2-1.1)
- [ ] As a developer using `git log`/`bisect`, I want commit messages that describe the actual diff (docs-only changes typed `docs:`, no claimed features that aren't in the code), enforced cheaply via commitlint on the existing husky hook, so history archaeology stops chasing phantom implementations like the "TensorFlow.js categorizer" that is one markdown file (CR2-1.2, `80af6be`/`1d97d49`)
- [ ] As a maintainer of `docs/`, I want one version-folder naming scheme decided (either `vX.Y_name` everywhere or plain `vX`) before the next milestone folder is created, so we don't repeat the rename that caused the broken links above (CR2-1.3)

## 2. Single Responsibility

- [ ] As a developer, I want `TransactionsOverviewComponent` split along its natural seams — a filter-bar child owning the form/debounce pipeline and a reusable selection model powering the bulk-action bar — so the 366-line component stops being the file every transactions change must touch and each concern is testable alone ([TICKET-SOLID-01](./tickets/TICKET-SOLID-01-split-transactions-overview.md), CR2-2.1; sequence with [TICKET-NG-02](../code-review/tickets/TICKET-NG-02-overview-input-binding.md))
- [x] As a developer, I want the import wizard's re-parse pipeline expressed declaratively (`toObservable → debounceTime → switchMap → toSignal`) instead of a hand-rolled token counter + `setTimeout` + effect, with one `resetParseState()` replacing the three drifting reset sites, so staleness and cancellation are the framework's job ([TICKET-SOLID-04](./tickets/TICKET-SOLID-04-wizard-declarative-reparse.md), CR2-2.2)
- [ ] As a developer, I want the categoryId-merge inside `ImportBatchesStore.commitImport` extracted as a pure `applyCategoryUpdates(transactions, updates)` function, so the orchestrator method reads as pure sequencing and the transform gets a TestBed-free spec (CR2-2.3, [import-batches.store.ts:40](../../src/app/feature-import/import-batches.store.ts))

## 3. Open/Closed & type safety

- [x] As a developer, I want `MappingProfile`'s `signConvention`/`dateFormat`/`encoding` declared as the closed unions they actually are (single-sourced, with the map-step's option lists derived from them and `CsvImportService.parse` accepting `Omit<MappingProfile, 'id'>`), so adding a format/convention is one union edit the compiler propagates, and the `as` casts in `csv-import.service` and `import-wizard` disappear ([TICKET-SOLID-02](./tickets/TICKET-SOLID-02-type-import-domain.md), CR2-3.1/3.2)
- [ ] As a developer, I want rule field/operator display labels declared once per feature instead of duplicated between `rule-form` and `rule-summary` (where they've already drifted), so renaming "Counterparty IBAN" is a one-file change and any intentional form-vs-summary wording difference is visible side by side (CR2-3.3)

## 4. Dependency structure & duplication

- [x] As a developer, I want the transfer-cleanup cascade (collect transferIds → remove transfers → clear surviving side) extracted into one `core/transfers` helper used by both `ImportService.undoImport` and `AccountDeletionService`, so the subtle "surviving side may also be doomed" invariant lives in exactly one place ([TICKET-SOLID-03](./tickets/TICKET-SOLID-03-extract-transfer-cleanup-cascade.md), CR2-4.2; also deletes the unused `DeleteAccountResult` alias, CR2-4.3)
- [ ] As a developer, I want CR-6.1 (entity stores promoted to `core/state`) scheduled before the next cross-store feature — the `setOwnSavingsIbans` push-down effect and the triplicated `savingsAccountIbans` derivation are the predicted workarounds arriving — and, as an interim, an `ownSavingsIbans` computed on `AccountsStore` for the two consumers that can inject it (CR2-4.1)
- [ ] As a maintainer, I want an explicit yes/no decision on a `withPersistedCrud` signal-store feature for the five stores repeating the persist-then-patch CRUD quartet — only after [TICKET-NG-04](../code-review/tickets/TICKET-NG-04-finish-with-archivable.md) proves the store-feature pattern out — so the consolidation is a recorded decision rather than boilerplate accretion by default (CR2-4.4)

## 5. Testing gaps

- [x] As a developer, I want specs pinning the four untested orchestrator stores — `ImportBatchesStore.commitImport` sequencing, `CategoriesStore.removeCategory` cascade, `RulesStore.moveRule` (including the equal-priority no-op edge), and `TransfersStore` link/unlink mirroring — so the refactors elsewhere in this backlog land against a safety net ([TICKET-TEST-01](./tickets/TICKET-TEST-01-orchestrator-store-specs.md), CR2-5.1)

## 6. Fallow static analysis (verified findings)

- [ ] As a developer, I want the transactions filter callback — the app's only critical complexity finding (cyclomatic 34 / cognitive 45, inside the #1 hotspot file) — extracted as a pure `matchesTransactionFilters(...)` function with a TestBed-free spec table, so the heaviest decision logic in the codebase is independently testable (CR2-6.2, folded into [TICKET-SOLID-01](./tickets/TICKET-SOLID-01-split-transactions-overview.md))
- [ ] As a developer, I want the delete-confirm scaffolding duplicated between `accounts-overview` and `categories-overview` (Fallow `dup:edd1ec44` — `deleteConfirmOpen`/`deleteTarget` signals + `deleteMessage` computed) extracted into a `createConfirmState<T>()` utility in `shared/utils`, so the third delete-with-confirmation flow doesn't clone it again (CR2-6.3)
- [ ] As a developer, I want the grep-verified dead symbols removed — `TransactionsRepository.add`/`.remove`, `MappingProfilesRepository.getByBankAndAccount`/`.remove`, and the dead `export` keywords on `describeCondition`/`DEFAULT_TEXT_DEBOUNCE_MS` — and the first review's CR-6.2 story corrected so nobody deletes the now-live `getByAccount` on stale advice ([TICKET-CLEANUP-01](./tickets/TICKET-CLEANUP-01-fallow-verified-dead-code.md), CR2-6.4)
- [ ] As a maintainer, I want a decision on codifying Fallow for recurring runs — a minimal `.fallowrc.json` covering the known false-positive families (§6.5: signalStore-DI class members, `tailwindcss`, spec-stub inputs) plus an identity baseline so future runs report only new findings — since the conventions already list Fallow as a verification step (CR2-6.5)
