# TICKET-IMP-21 — A committed import is never reported as failed

- **Area:** Import
- **Released in:** _unreleased_
- **Type:** Bug fix
- **Traceability:** CR5-6 ([code review 5](../../releases/v3_code_review/code-review.md)), CR6-A3 ([code review 6](../../releases/v3_code_review_2/code-review.md)); FR-IMP-7 (import batch summary), FR-CAT-3 (rules on import), FR-TRF-2 (auto-link on every import)

## User story

As someone importing a bank file, I want the app to treat the moment my rows are saved as final, so that a later hiccup in categorising or linking never tells me the import failed, hides the rows I just imported, or makes the retry import nothing.

## Description

Confirming an import saves the rows on the server in one transaction, then runs rules, co-owner tagging and auto-link as separate requests, and only after all of that puts the rows in the store. If any follow-up fails, the rows are saved but missing from the screen, and the wizard says the import failed. The server commit should be the point of no return: put its result in the store straight away, then run the follow-ups, each one reporting its own failure without undoing the import's success.

## Current situation (as-is)

- [`ImportBatchesStore.commitImport`](../../../src/app/core/state/import-batches.store.ts) (lines 128-160): `importService.commitImport` (the one transactional `POST /import/commit`), then `rulesEngineService.runAndPersist`, then `coOwnerContributionService.runAndPersist`, and only then `addEntity(result.batch)` + `transactionsStore.addMany(...)` (lines 146-147), then `transfersStore.runAutoLink()` (line 157).
- [`ImportWizardSession.runCommit`](../../../src/app/feature-import/import-wizard-session.ts) (lines 447-462) wraps that whole call in one `try/catch` and sets `commitError` to "Couldn't import <file>: …" on any rejection.
- **Root cause:** the store treats "saved on the server" and "categorised, tagged and linked" as one step. A rejection from rules, co-owner tagging or auto-link reaches the wizard's catch, which reports the import as failed although the server committed it. The batch and rows never reach the store (when rules or tagging failed), so they are missing until reload. Pressing Confirm again partitions every row as a duplicate and creates a 0-row batch, and the real rows never get rules.
- **Already fixed by TICKET-IMP-19:** the first half of CR5-6. A rejected `/import/commit` now sets `commitError` instead of being an unhandled rejection. What's still open is the failure after a successful commit.

## Desired result (to-be)

- Right after `importService.commitImport` resolves, the store adds the batch and the uncategorised rows (and applies `backfilledTransactions`). From then on, the import has succeeded.
- Rules, co-owner tagging and auto-link each run after that. A failure in one is caught, recorded, and patches nothing it didn't persist. The steps after it still run where they can.
- The wizard advances (next file or What changed) whenever the commit succeeded, and shows a non-blocking warning naming the step that failed, for example "Imported 42 rows from bank.csv, but the rules couldn't run. Use Run rules on the Rules page." `commitError` is kept for a commit that really failed.
- A retry never creates a 0-row batch for rows that are already saved.

## Acceptance criteria

- [ ] The batch and its added rows are in `ImportBatchesStore` / `TransactionsStore` as soon as `POST /import/commit` succeeds, before rules, tagging or auto-link run.
- [ ] A rejection from `rulesEngineService.runAndPersist`, `coOwnerContributionService.runAndPersist` or `transfersStore.runAutoLink` doesn't reject `commitImport`. The result says which follow-up failed, and the wizard shows it as a warning, not as `commitError`.
- [ ] The wizard moves to the next file or to What changed after a commit whose follow-ups failed. Batch auto-advance doesn't stall on it.
- [ ] A rejected `/import/commit` (or the pre-commit hydration) still sets `commitError` and doesn't advance, as TICKET-IMP-19 left it.
- [ ] Rules still never overwrite a `categoryManual` row (unchanged by this ticket, re-checked by a spec).
- [ ] Persistence stays in `ImportService`, the categorisation services and the stores. No component calls the API.
- [ ] Unit tests cover: rules reject → rows in the store uncategorised, warning set, wizard advances; tagging rejects → rule categories kept; auto-link rejects → rows categorised, warning set; commit rejects → `commitError`, no advance.
- [ ] Live browser check: make the rules step fail (for example stop the API right after the commit request, or stub a 500 on the rules write) and confirm the rows appear, the warning names the step, and What changed lists the file.
- [ ] Verified via the fallow skill and coding-conventions skill.

## Notes

- CR6-A3's larger fix is to run rules, tagging and auto-link inside `/import/commit` on the server, as one transaction. The rules engine is already in `shared/rule-matching.ts` (MCP `run_rules` runs it server-side), but co-owner tagging and transfer matching live in `src/app/core`. Moving them is a bigger change. This ticket makes the client honest first, and the server move can be its own ticket.
- `addedTransactions` returned to What changed must reflect whatever categorisation did persist, so its counts stay true.
