# TICKET-IMP-03 — Surface header/mapping mismatch per file

- **Area:** CSV Import
- **Traceability:** extends FR-IMP-8
- **Source story:** user-stories.md §2 — *"As a user, I want a visible error when a file's headers don't match the batch's chosen mapping, so I immediately know which file needs handling instead of it silently parsing wrong."*

## Description

When a file is parsed under a mapping whose expected columns/headers don't line up with that file's actual headers, show a clear, file-specific error rather than letting the mapper produce silently-wrong rows.

## Current situation (as-is)

- [ImportWizardComponent.runParse()](../../../src/app/feature-import/components/import-wizard/import-wizard.component.ts) only distinguishes a hard parse `error` from success; valid vs malformed **rows** are surfaced (FR-IMP-8) via `ParsedRowResult`, but a **structural** mismatch (right CSV, wrong mapping) can still parse into rows that are individually "valid" yet semantically wrong.
- With [TICKET-IMP-02](./TICKET-IMP-02-batch-multi-file-mapping.md) applying one mapping across many files, a file with different headers would be mapped against the wrong columns with no signal to the user.

## Desired result (to-be)

- Before/while parsing a file under a given mapping, the wizard validates the file's header row against the mapping's expected columns and, on mismatch, blocks the silent path and shows a per-file error naming the file and the mismatch.
- The user is directed to remap that specific file (ties into the per-file override from TICKET-IMP-02).

## Acceptance criteria

- [ ] A header/mapping validation runs when a file is parsed with a mapping (single-file and batch modes both).
- [ ] Mismatch is detected when the mapping's referenced columns aren't present/aligned in the file's header row (e.g. expected column name/index absent, or delimiter yields a different column count than the mapping assumes).
- [ ] On mismatch, a visible error identifies **which file** and **what didn't match** (e.g. "expected column 'Bedrag' not found in statement.csv"), and does **not** proceed to commit that file.
- [ ] The user can remap the offending file individually and continue; other files in the batch are unaffected.
- [ ] A genuinely matching file shows no false-positive error.
- [ ] The distinction between this structural mismatch and per-row malformed data (existing FR-IMP-8 handling) is preserved — malformed rows still let the user proceed with valid rows; a header mismatch blocks that file until remapped.
- [ ] Unit tests cover: matching header (no error), missing mapped column (error), wrong delimiter/column-count (error), and that a mismatch on one batch file doesn't block the others.

## Notes

- Validation belongs near the mapping/parse boundary (`CsvImportService` / `csv-row-mapper`) so both wizard modes reuse it.
