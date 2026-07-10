# TICKET-IMP-02 — Map a multi-file import batch once

- **Area:** CSV Import
- **Traceability:** extends FR-IMP-1 / FR-IMP-3

## User story

As a user, I want to select multiple CSV files, optionally link each to an account, and map the whole batch once instead of re-mapping every file.

## Description

When several files in one import batch share the same bank format, let the user map once and apply that mapping to the whole batch, instead of walking the map → preview → commit loop separately for each file.

## Current situation (as-is)

- [ImportWizardComponent](../../../src/app/feature-import/components/import-wizard/import-wizard.component.ts) already supports a **queue** of files (`queue`, `currentFileIndex`) and per-file account selection in step 1 (`canAdvanceFromStep1` requires every queued file to have an `accountId`).
- But mapping is **per file**: `runCommit()` advances `currentFileIndex`, then resets `mapResult`/`parsedRows` and sends the user back to **step 2 (map)** for the next file. So a 6-file, one-bank import means mapping 6 times.
- There is no notion of "reuse the previous file's mapping" within a single wizard run.

## Desired result (to-be)

- After mapping the first file, the user can apply that same mapping to the remaining queued files, mapping the batch once.
- Per-file account linking (already present) is preserved — batch mapping applies the column mapping, not the account.
- The user can still override the mapping for an individual file when a file doesn't fit the batch mapping.
- **Refined after initial delivery (explicit user request):** requiring a manual "Confirm & continue" click for every batch-mapped file defeated the point of mapping once — a file that parses cleanly under the shared mapping now commits itself automatically, with no click. The wizard only pauses and hands control back to the user when a file *isn't* clean (a header mismatch or a hard parse error), which is exactly when the per-file override below is needed.

## Acceptance criteria

- [x] After the map step, the wizard offers to apply the current mapping to all remaining queued files (e.g. an "apply to all files" affirmation or a batch-map mode selected up front). — an "Apply this mapping to the remaining N files" checkbox next to the map form, shown whenever files remain after the current one.
- [x] When batch mapping is active, files 2..N skip the manual map step and go straight to parse → preview → commit using the shared `MappingProfile`, each still committing under its own `accountId`. — and now commit automatically once parsing resolves cleanly, without a click.
- [x] Each file's live preview (FR-IMP-4) is still shown before its rows are committed, so batch mapping never silently commits an unreviewed file. — **updated interpretation:** batch-mapped files still run through the same live-parse pipeline and render a preview frame before committing, but no longer wait for a click — auto-commit only fires on a clean parse (no header mismatch, no parse error); either of those still blocks and requires the user to act (map the file individually).
- [x] The user can opt out for a specific file and map it individually (covers files whose headers don't match — hand-off point to [TICKET-IMP-03](./TICKET-IMP-03-header-mismatch-error.md)). — "Map this file individually" button, shown both generally in batch mode and specifically alongside a header-mismatch error; an overridden file always requires an explicit confirm click, even on a clean parse.
- [x] The final summary step (FR-IMP-7) reports per-file results (rows read/added/skipped, date range) for **all** files in the batch, and each file's batch remains independently undoable. — already true of the existing per-file `commitResults` array/summary rendering; unaffected by this change.
- [x] Duplicate-fingerprint skipping (FR-IMP-6) and transactional/atomic commit (NFR-RESIL-1) behave per file exactly as today. — commit/undo logic in `ImportBatchesStore`/`ImportService` untouched.
- [x] Existing single-file import behaviour is unchanged when the queue has one file. — with 0 files remaining after the current one, the checkbox never renders and `batchMapping` never activates.
- [x] Unit tests cover: batch mapping applied across ≥2 files, per-file account retained, per-file override, and per-file summary/undo.

## Notes

- This is primarily a wizard control-flow change in `ImportWizardComponent`; the parse/commit services already operate per file and need no change.
- Coordinate with [TICKET-IMP-03](./TICKET-IMP-03-header-mismatch-error.md): a mismatched file in a batch-mapped run is exactly when the per-file override path is needed.
- Auto-advance is implemented as an `effect()` in `ImportWizardComponent`'s constructor that watches parse state and fires `runCommit()` once a batch-mapped file parses with at least one valid row (malformed individual rows, per FR-IMP-8, don't block it) — guarded against double-firing with a plain `autoCommittedFileIndex` field, not a signal.
