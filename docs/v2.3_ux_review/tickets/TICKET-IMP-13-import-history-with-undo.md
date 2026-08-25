# TICKET-IMP-13 — Import history with per-batch undo

- **Area:** Import
- **Type:** Feature
- **Traceability:** UX review (UXR-10); extends FR-IMP-* — import batches are already recorded but never surfaced, and nothing can be undone

## User story

As someone importing three overlapping bank exports every month, I want to see what I have imported and be able to undo a batch, so that a mistaken import is a five-second fix rather than a manual cleanup.

## Current situation (as-is)

The app already models import batches — [import-batches.store.ts](../../../src/app/feature-import/import-batches.store.ts) exists and batches are persisted — but nothing in the UI lists them. There is no import history anywhere in the app, and no way to reverse an import once committed.

`/import` step 1 is a dashed drop zone with a "Browse" affordance and a disabled Back/Next bar positioned **above** it. The screen says nothing about duplicate detection, lists no previous import, and offers no undo.

Consequences observed in review:

- No "last imported" date on `/accounts`, on account detail, or anywhere in the shell — the user cannot tell which of several accounts is current. (Split out as [TICKET-ACC-13](./TICKET-ACC-13-last-imported-on-account-cards.md).)
- The target user's entire monthly workflow is importing several overlapping CSVs. The single thing that workflow risks — importing the same rows twice — is the thing the screen never mentions.

Nothing else in the app has undo either (re-run rules, bulk delete, bulk assign, clear transactions are all one-way), so this ticket establishes the pattern rather than matching one.

## Desired result (to-be)

- An import history view lists past batches with their date, source file, target account, and row count.
- A batch can be undone, removing exactly the rows it created and nothing else.
- Undo is honest about what it cannot reverse — rows since edited, re-categorised, or linked as transfers must be handled explicitly rather than silently deleted or silently skipped.
- The history is reachable from `/import`, so the user sees it before importing again.

## Acceptance criteria

### Implementation note, 2026-08-24 — hard delete, and why

**The scope decision the ticket asked for: undo is a hard delete of the batch's rows, not a
reversible archive.** The reasoning: the rows are *reproducible* — the user still has the CSV, and
re-importing it puts them back — so an archive would be a second copy of recoverable data, with its
own table, its own lifecycle, its own way of going stale, and its own un-undo path to design. What
re-importing does **not** restore is the work done after the import: a category set by hand, a
transfer linked. So instead of hiding that behind an archive, the confirm dialog *states* it —
`previewUndo` counts exactly those two things, and the sentence says what happens to each.

No schema change was needed: `ImportBatch` has been recorded since v1.0 and `ImportService.undoImport`
has existed since TICKET-IMP-01, including its transfer cleanup. What was missing was a surface, a
pre-flight report, and the honesty in the confirmation. `previewUndo` reads through the same
`getByImportBatch` the undo deletes through, so the count shown and the count removed cannot
disagree.

The history sits on **step 1** of the wizard, above the file queue: that is the moment the user is
about to import again, which is when knowing what they already have is worth something.

Convention review caught that the wizard's *own* summary step still hardcoded "This removes every
transaction this import added" — true, but the weaker of two sentences about one operation, and
silent about the categories and links. It now goes through the same `undoImportMessage` and the same
`previewUndo`, so there is one claim about undo in the app rather than two.

- [x] An import history lists each batch with date, file name, target account, and number of rows imported. (`app-import-history` on step 1. Live on :4210 after importing a two-row file: `25/08/2026 · imp13-history.csv · Everyday Checking · 2 rows · Undo`. `toImportHistoryRows` resolves every one of those display facts, newest first — and names a batch whose account was since deleted rather than dropping it, because a history that quietly omits an import is one you cannot trust to be complete.)
- [x] Undoing a batch removes exactly the transactions that batch created; no transaction from another batch is affected. (`getByImportBatch(batchId)` is the only filter on either path. Live: 41 transactions → import 2 → 43 → undo → **41**, with the seed's own rows untouched. `import.service.spec.ts` → *"counts only the rows this batch created"* asserts the batch id is what reaches the query, and the pre-existing `undoImport` cases cover the removal itself.)
- [x] Rows modified since import (edited category, manual `categoryManual` flag, transfer link) are surfaced before undo proceeds, with a stated outcome — not silently destroyed. (Verified live end to end: imported two rows, set a category by hand on one from `/transactions` (which sets `categoryManual`), then opened the undo — the dialog read *"1 of them has a category you set by hand — re-importing the file brings the rows back, not those categories."* The transfer clause reads *"…the other side of each link stays, as an ordinary transaction."* Both are counted by `previewUndo` and worded by `undoImportMessage`, five cases each in their specs.)
- [x] Undoing a batch that produced a transfer link also unlinks its counterpart cleanly, leaving the other side an ordinary transaction. (Unchanged behaviour, and it was already right: `undoImport` delegates to `TransferCleanupService.removeTransactionsWithTransferCleanup`, covered by `import.service.spec.ts` → *"undoImport unlinks a transfer whose other leg belongs to a different import batch"*. What this ticket adds is that the dialog now says so before the user commits to it.)
- [x] Undo is confirmed through the shared confirm dialog, stating what is removed and that it cannot itself be undone. (`mm-confirm-dialog` with `[danger]="true"`, on both surfaces. The message ends *"This cannot itself be undone."* — and the cost is read **before** the dialog opens, so the text never changes under someone already reading it.)
- [x] All reads and writes go through the store/repository layer in `core/data-access/` — no direct `appDb` table access from components or stores. (Component → `ImportBatchesStore.previewUndo`/`undoImport` → `ImportService` → `TransactionsRepository`/`ImportBatchesRepository`. Confirmed by convention review, which checked for `appDb` in the diff and found none.)
- [x] Any schema change is additive: a new `.version(n + 1).stores(...)` with an `.upgrade()` if data must transform; no shipped version block is edited. (There is no schema change: `app-db.ts` is untouched. Everything this needs was already recorded.)
- [x] Unit tests cover: history lists batches in order; undo removes only its own rows; undo with a since-edited row follows the stated outcome; undo of a transfer-linked batch unlinks the counterpart; undo of an already-undone batch is a safe no-op. (In order: `import-history-rows.spec.ts` → *"orders newest first"*; `import.service.spec.ts` → *"counts only the rows this batch created"* plus the existing `undoImport` cases; `undoImportMessage`'s manual-category and transfer-link cases plus the component's *"surfaces since-edited rows in the dialog before the undo proceeds"*; the existing cross-batch transfer case; and *"reports zero of everything for a batch that has already been undone"* + *"states that an already-undone batch has nothing left to remove"* — the dialog says *"Nothing left to remove"* rather than "removes 0 rows", which reads like a bug in the dialog rather than a fact about the batch. 172/172 pass across `feature-import`.)
- [x] Verified live in the browser: import a CSV, confirm it appears in history, undo it, confirm the transaction count returns to its prior value. (dev server :4210, 2026-08-24, three times over: the plain loop (41 → 43 → history lists it → undo → 41, history back to "Nothing imported yet", batch row gone); the since-edited loop above; and the wizard's own summary-step undo after the shared-message change. The database was left at its original 41 transactions and zero import batches each time.)
- [x] Verified via the fallow skill and coding-conventions skill. (Both fallow CI gates exit 0. `conventions-reviewer` returned four findings, all applied: a comment stranded onto the wrong method by the insertion, Prettier drift in two new files, a grammar slip and a missing component name in the project-map row, and the duplicated undo sentence on the summary step. `ng lint` clean, `ng build --configuration development` compiles, 3526/3526 tests pass.)

## Notes

- Scope decision needed early: whether undo is a hard delete of the batch's rows or a reversible archive. The former is simpler; the latter is safer and fits "reversible automation". Record which was chosen and why.
- `categoryManual` must never be overwritten or lost by an undo path, per CLAUDE.md.
- Related: [TICKET-IMP-14](./TICKET-IMP-14-duplicate-preview-before-commit.md) is the preventive half of the same problem — this ticket is the cure.
