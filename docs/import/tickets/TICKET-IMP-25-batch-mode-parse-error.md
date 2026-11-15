# TICKET-IMP-25 — Batch import shows a later file's parse error

- **Area:** Import
- **Released in:** _unreleased_
- **Type:** Bug fix
- **Traceability:** CR6-21, parse-error part ([code review 6](../../releases/v3_code_review_2/code-review.md)); FR-IMP-8 (malformed rows reported, not silently dropped); TICKET-IMP-02 (batch mapping), TICKET-IMP-03 (header mismatch per file), TICKET-IMP-12 (batch wait card)

## User story

As someone importing several files under one shared mapping, I want a later file that fails to parse to say so and offer me a way out, so that it doesn't sit on "imports automatically once parsed" forever with Confirm greyed out.

## Description

In batch mode, a later file either auto-commits, or shows the wait card. The wait card only knows about a header mismatch. A hard parse error, or a file whose rows are all invalid, leaves it saying the file will import automatically, which never happens.

## Current situation (as-is)

- [`ImportWizardSession.step2View`](../../../src/app/feature-import/import-wizard-session.ts) (lines 316-320) returns `batch-mismatch` only when `headerMismatchMessage()` is set, and `batch-waiting` for everything else.
- The auto-commit effect (lines 334-344) commits only when the parse is `done` with at least one valid row.
- [`batch-wait-card.component.html`](../../../src/app/feature-import/components/batch-wait-card/batch-wait-card.component.html) shows `mismatchMessage` or, otherwise, "Using the batch mapping — this file imports automatically once parsed."
- **Root cause:** `step2View` has no branch for `parseError()` or for a `done` parse with no valid rows. Both fall through to `batch-waiting`. With a parse error, `ctaViewModel` disables Confirm (line 302), so the only exit is "Map this file individually", and nothing says why. With all rows invalid, nothing auto-commits and the card still promises it will.
- The comment on `Step2View` (lines 42-48) says a hard parse error surfaces via `parseError` inside `manual-map`. That only holds outside batch mode.

## Desired result (to-be)

- In batch mode, a hard parse error shows on the wait card with the file name and the error, plus "Map this file individually" (the same hand-off as a header mismatch).
- A file whose parse yields no valid rows says so ("No rows in <file> could be read with the batch mapping") with the same hand-off, instead of the auto-import promise.
- "Imports automatically once parsed" shows only while the file is parsing or about to auto-commit.

## Acceptance criteria

- [ ] A later batch file whose parse errors shows the error on the wait card, never the auto-import line.
- [ ] A later batch file with zero valid rows shows a "no readable rows" message with "Map this file individually", and isn't committed.
- [ ] A file that parses with some valid rows still auto-commits (FR-IMP-8 behaviour unchanged).
- [ ] Unit tests in `import-wizard-session.spec.ts` cover: batch file parse error → error view; batch file all-invalid → no-rows view, no commit; mixed valid/invalid → auto-commit. A component spec covers the wait card's error text.
- [ ] Live browser check: a 3-file batch where file 2 is corrupt shows its error and lets you map it individually. Files 1 and 3 import.
- [ ] Verified via the fallow skill and coding-conventions skill.

## Notes

- Needs TICKET-IMP-20 first: without it, a parse that _rejects_ (rather than returning `{ error }`) kills the pipeline before any view can show it.
- Whether this is a fifth `Step2View` value or the existing `batch-mismatch` carrying a general message is an implementation choice. Update the `Step2View` comment either way.
- The other half of CR6-21 (Back after a partial batch re-commits files) is TICKET-IMP-26.
