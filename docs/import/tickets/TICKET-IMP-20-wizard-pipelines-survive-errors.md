# TICKET-IMP-20 — The import wizard survives a failed parse or duplicate scan

- **Area:** Import
- **Released in:** _unreleased_
- **Type:** Bug fix
- **Traceability:** CR6-2 ([code review 6](../../releases/v3_code_review_2/code-review.md)); FR-IMP-4 (live preview), FR-IMP-6 (de-duplication); TICKET-IMP-11 (wizard session), TICKET-IMP-14 (duplicate preview)

## User story

As someone importing a bank file, I want the wizard to show an error and keep working when one parse or duplicate check fails, so that a server hiccup or a file that changed on disk doesn't leave me on a dead screen until I leave the page.

## Description

The wizard's live parse and its duplicate scan are RxJS pipelines turned into signals. A single rejected promise errors the stream for good, so step 2 stops rendering and no later parse ever runs. Each pipeline should turn a failure into an error state the page shows, and stay alive for the next input.

## Current situation (as-is)

- [`ImportWizardSession.parseState`](../../../src/app/feature-import/import-wizard-session.ts) (lines 175-196) is `toSignal(toObservable(parseInput).pipe(switchMap(... from(csvImportService.parse(...)) ...)))` with no `catchError`. [`CsvImportService.parse`](../../../src/app/core/import/csv-import.service.ts) rejects when `file.arrayBuffer()` throws (`NotReadableError`, the file changed on disk) or when the worker's `onerror` fires (line 98).
- `duplicateScanState` (lines 249-264) has the same shape around `importBatchesStore.previewImport`, which rejects when `GET /transactions?accountId=` fails (server restart, expired session).
- **Root cause:** an error inside the inner `switchMap` propagates to the outer observable, which errors and completes. `toSignal` then rethrows that error on every read of `parseState()` / `duplicateScanState()`, so every computed built on them (`parsedRows`, `ctaViewModel`, `step2View`, `duplicateScan`) throws. Nothing is shown and no later input is ever parsed.
- `DuplicateScanState` has no error variant (`idle | scanning | done`), so there is nothing to show even if the error were caught.

## Desired result (to-be)

- A failed parse becomes `{ status: 'error', error }` (the variant `ParseState` already has), shown through the existing `parseError` path. The pipeline stays subscribed, so editing the mapping or retrying parses again.
- A failed duplicate scan becomes a new `error` state, shown in the map step as a short message (for example "Couldn't check for duplicates: <reason>"), and the next settled parse scans again.
- A failed duplicate scan doesn't block the import: `commitImport` partitions against the server's rows itself, and the default `skip` still holds. Confirm stays enabled and the message says the preview is unavailable.

## Acceptance criteria

- [ ] `catchError` sits inside each inner `switchMap` (not on the outer stream), so one failure never completes the outer observable.
- [ ] A rejected `parse` shows its message as the step 2 parse error, and Confirm is disabled. A later valid input parses and renders rows without a page reload.
- [ ] A rejected `previewImport` sets the duplicate scan to an error state. The map step shows it, `duplicateScan().known` is `false`, and Confirm stays enabled.
- [ ] Reading `parsedRows()`, `ctaViewModel()` and `step2View()` after either failure never throws.
- [ ] Unit tests in `import-wizard-session.spec.ts` cover: parse rejects → error state, then the next input parses; `previewImport` rejects → scan error, then the next parse scans again; the batch auto-commit effect doesn't fire on a parse error.
- [ ] Live browser check: with the API stopped mid-wizard, the map step shows the scan error. After a restart, a mapping edit re-parses and re-scans.
- [ ] Verified via the fallow skill and coding-conventions skill.

## Notes

- The parse error's message is whatever `parse` rejected with (`event.message` from the worker, the `DOMException` message for `arrayBuffer`). If that reads badly, wrap it as "Couldn't read <file>: <reason>".
- TICKET-IMP-25 (batch mode) builds on the error state this ticket keeps alive. Do this one first.
