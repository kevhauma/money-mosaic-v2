# TICKET-IMP-22 — A line break inside a quoted CSV field imports correctly

- **Area:** Import
- **Released in:** _unreleased_
- **Type:** Bug fix
- **Traceability:** CR5-5 ([code review 5](../../releases/v3_code_review/code-review.md), re-confirmed by [CR6](../../releases/v3_code_review_2/code-review.md)); FR-IMP-3 (mapping), FR-IMP-6 (fingerprints), FR-IMP-8 (malformed rows reported); TICKET-IMP-06 (decode pipeline), TICKET-TXN-06 (original CSV line)

## User story

As someone whose bank allows multi-line notes, I want a quoted field with a line break in it to import as one row, so that the file isn't rejected with a misleading header error and descriptions don't change between imports.

## Description

The parser re-parses a file with quote handling switched off whenever PapaParse returns fewer rows than there are non-empty physical lines. That check was written for KBC's stray quote characters, but a legal quoted field containing a line break trips it every time. The fallback should only run when quoting is actually broken.

## Current situation (as-is)

- [`parseCsvText`](../../../src/app/core/import/csv-parse.ts) (lines 23-50) counts non-empty physical lines, parses with quotes on, and re-parses with `quoteChar` set to `NO_QUOTE_CHAR` when there is a `Quotes` error **or** `parsed.data.length < nonEmptyLines`. It adopts the lenient parse when it yields more rows.
- **Root cause:** `linesSwallowed` (line 39) can't tell a stray quote that swallowed lines apart from a correctly quoted multi-line field. Both give fewer rows than lines. For the multi-line case the lenient parse always yields more rows, so it is always adopted:
  - when every field is quoted, headers come out as `"Date"` with the quotes kept, `findMissingMappedColumns` reports every mapped column missing, and the file is blocked with a header-mismatch error (TICKET-IMP-03's message, wrong here);
  - when only some fields are quoted, the multi-line row is split in two and descriptions keep their quote marks, so fingerprints differ from a clean parse and duplicates get through.
- `rawLine` (lines 86-91) is taken from the physical-line split, so every row after a multi-line field gets the wrong original line, even when the strict parse is kept.
- [csv-parse.spec.ts](../../../src/app/core/import/csv-parse.spec.ts) has the stray-quote case and "does not adopt the lenient fallback for legitimately quoted fields", but no field containing a line break.

## Desired result (to-be)

- The lenient re-parse runs only when quoting is really broken: a PapaParse `Quotes` error, or a strict parse whose data rows don't have the header's column count. A strict parse where every row has the header's column count is kept, even with fewer rows than physical lines.
- A quoted field with a line break maps to one row, with the line break kept (or normalised) in its description and no quote marks.
- KBC-style stray quotes are still recovered with the existing warning.
- `rawLine` stays aligned with its own row after a multi-line field (taken from the parse, or left out for rows where it can't be known).

## Acceptance criteria

- [ ] A file with a fully quoted multi-line description parses with correct headers, no header-mismatch error, and one row per record.
- [ ] A file where only the description column is quoted and contains a line break parses as one row, without quote marks in the description.
- [ ] The existing specs still pass: "recovers rows swallowed by a stray opening quote and reports a warning" and "does not adopt the lenient fallback for legitimately quoted fields".
- [ ] Rows after a multi-line field carry their own `rawLine` (or none), never a neighbour's.
- [ ] Importing the same multi-line file twice reports every row as a duplicate the second time (stable fingerprints).
- [ ] Unit tests in `csv-parse.spec.ts` cover: fully quoted multi-line field; partly quoted multi-line field; stray quote plus a legal multi-line field in one file; `rawLine` alignment after a multi-line row.
- [ ] Verified via the fallow skill and coding-conventions skill.

## Notes

- Column count alone has an edge: a stray quote that swallows exactly one delimiter-free line can still leave the column count right. The `Quotes` error and the "lenient yields more rows _and_ consistent column counts" test together cover the KBC exports in the specs; add a real KBC sample to the spec if one is at hand.
- `normalizeDescription` in [fingerprint.ts](../../../src/app/shared/utils/fingerprint.ts) already collapses whitespace, line breaks included, so a description keeping its line break fingerprints the same as one with a space.
