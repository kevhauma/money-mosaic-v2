# TICKET-IMP-18 — End an import on what changed, not on row counts

- **Area:** Import
- **Released in:** _unreleased_
- **Type:** Feature
- **Traceability:** FR-IMP-*, FR-CAT-3 (rules on import), FR-CAT-5 (uncategorised backlog), FR-TRF-2 (auto-linking); design round 2026-10-18 (`.impeccable/mocks/decision/onepage-receipt.html`, "When it's done")

## User story

As someone who just imported a month of transactions, I want to see what the import did — how many my rules sorted, how many still need a category, how many transfers were linked — with the next step one click away, so that the import ends somewhere useful instead of on a row count.

## Description

The **What changed** section opens under the folded import once every file is done. It totals the run and reads the live store, so its numbers follow the user as they sort.

## Current situation (as-is)

- [import-summary-step.component.html](../../../src/app/feature-import/components/import-summary-step/import-summary-step.component.html) shows rows read / added / skipped and a date range per file, with a comment that transfer-review and uncategorised links were deferred because "those features don't exist yet" — they have since shipped.
- "Done" goes to `/accounts`.

## Desired result (to-be)

- Headline: how many transactions were added and the period they cover.
- Money in and money out for the added transactions, leaving out linked transfers and moves to savings.
- Three lines: categorised automatically; need a category (links to the transactions page filtered to uncategorised); transfers linked (kept out of income and spending).
- One line per file: account, added, skipped, and **Undo** with the existing impact dialog (TICKET-IMP-13).
- Primary action: "Sort the 26" when anything needs a category, otherwise "Go to the dashboard". Plus "Import more files".

## Acceptance criteria

_Implementation note (2026-10-18): built inside today's wizard as its step 3 ("What changed"), replacing `import-summary-step`; mounting it under the folded import is TICKET-IMP-15's job. "Sort the N" opens the whole uncategorised backlog, not only this run's rows, as the criterion says._


- [x] The counts come from `TransactionsStore` for the added transaction ids, using the same uncategorised rule as the backlog (no category, not a transfer, not a savings movement). (`summariseImport` in [import-what-changed.ts](../../../src/app/feature-import/import-what-changed.ts) looks each added id up in `transactionsById` and counts "need a category" as membership of `TransactionsStore.uncategorisedTransactions()` itself, so it cannot drift from the backlog; "categorised automatically" = a category, not `categoryManual`, not a transfer. Specs: `import-what-changed.spec.ts` "splits the run into…", "follows the user as they sort…". Live: a 4-row import with one move to savings showed "3 need a category", matching the sidebar backlog badge of 3.)
- [x] Money in / out exclude linked transfers and savings movements. (`summariseImport` skips `transferId != null` and `isSavingsMovement`; spec "totals money in and out without the linked transfer or the savings movement"; live: −€300 to Rainy Day Savings left out, money out read −€66,70 = 54,20 + 12,50.)
- [x] Undo per file shows the existing impact message and removes that file's line. (Each file line's Undo reads `previewUndo` and states `undoImportMessage` — the import history's sentence; confirming emits that result to `ImportWizardSession.onUndo`, which drops it from `commitResults`. Specs: component "states the import history's undo cost for that file…", session "undoes that one file and removes only its line". Live: dialog read "This deletes the 4 transactions imported from imp18-october.csv into Everyday Checking…"; after confirming the line was gone and the transaction count was back to 41.)
- [x] "Sort the N" opens `/transactions` filtered to uncategorised; the button is "Go to the dashboard" when N is 0. (`mm-button` gained a `queryParams` input; link built with `buildTransactionDrilldownParams`. Specs: "sends \"Sort the N\" to the uncategorised list", "turns into \"Go to the dashboard\" once nothing needs a category". Live: "Sort the 3" → `/transactions?categoryId=uncategorised`; after the undo the button read "Go to the dashboard".)
- [x] "Import more files" resets the page. (Emits `importMore` → `ImportWizardSession.startNewImport()`; spec "emits importMore from \"Import more files\""; live: returned to Select with an empty queue.)
- [x] Unit tests cover: the totals, the three counts including a transfer and a savings movement, the period, and undo. (`import-what-changed.spec.ts` — 10 cases incl. `formatImportPeriod`, `toImportFileLines`; `import-what-changed.component.spec.ts` — 6 cases; `import-wizard-session.spec.ts` onUndo case. Full `ng test`: 347 files / 3947 tests passing.)
- [x] Verified via the fallow skill and coding-conventions skill. (`fallow dead-code --baseline` and `fallow health --complexity …` both exit 0; `conventions-reviewer` found no high/medium issues — its two low fixes applied (`buildTransactionDrilldownParams`, file caption on the view-model); the third, `class="text-error"` on the Undo button, kept to match `import-history`'s Undo.)

## Notes

- Part of the one-page import (TICKET-IMP-15); replaces `import-summary-step`.
