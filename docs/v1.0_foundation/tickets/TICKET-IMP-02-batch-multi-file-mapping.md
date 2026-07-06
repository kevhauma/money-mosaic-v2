# TICKET-IMP-02 — Map a multi-file import batch once

- **Area:** CSV Import
- **Traceability:** extends FR-IMP-1 / FR-IMP-3
- **Source story:** user-stories.md §2 — *"As a user, I want to select multiple CSV files, optionally link each to an account, and map the whole batch once instead of re-mapping every file."*

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

## Acceptance criteria

- [ ] After the map step, the wizard offers to apply the current mapping to all remaining queued files (e.g. an "apply to all files" affirmation or a batch-map mode selected up front).
- [ ] When batch mapping is active, files 2..N skip the manual map step and go straight to parse → preview → commit using the shared `MappingProfile`, each still committing under its own `accountId`.
- [ ] Each file's live preview (FR-IMP-4) is still shown before its rows are committed, so batch mapping never silently commits an unreviewed file.
- [ ] The user can opt out for a specific file and map it individually (covers files whose headers don't match — hand-off point to [TICKET-IMP-03](./TICKET-IMP-03-header-mismatch-error.md)).
- [ ] The final summary step (FR-IMP-7) reports per-file results (rows read/added/skipped, date range) for **all** files in the batch, and each file's batch remains independently undoable.
- [ ] Duplicate-fingerprint skipping (FR-IMP-6) and transactional/atomic commit (NFR-RESIL-1) behave per file exactly as today.
- [ ] Existing single-file import behaviour is unchanged when the queue has one file.
- [ ] Unit tests cover: batch mapping applied across ≥2 files, per-file account retained, per-file override, and per-file summary/undo.

## Notes

- This is primarily a wizard control-flow change in `ImportWizardComponent`; the parse/commit services already operate per file and need no change.
- Coordinate with [TICKET-IMP-03](./TICKET-IMP-03-header-mismatch-error.md): a mismatched file in a batch-mapped run is exactly when the per-file override path is needed.
