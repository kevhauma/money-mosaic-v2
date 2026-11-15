# TICKET-IMP-26 — Back after a partial batch never commits a file again

- **Area:** Import
- **Released in:** _unreleased_
- **Type:** Bug fix
- **Traceability:** CR6-21, Back part ([code review 6](../../releases/v3_code_review_2/code-review.md)); FR-IMP-6 (de-duplication), FR-IMP-7 (import batch summary); TICKET-IMP-02 (multi-file batch), TICKET-IMP-18 (What changed)

## User story

As someone importing several files, I want going Back partway through a batch to leave the files I already imported alone, so that pressing Next again doesn't re-import them as empty batches and fill What changed with duplicate entries.

## Description

After some files of a batch are committed, Back returns to step 1 but keeps the commit results. Next then starts again at the first file, so every already-committed file is committed a second time. Its rows are all duplicates, so each second commit makes an empty batch and a second What changed entry.

## Current situation (as-is)

- [`ImportWizardSession.goBack`](../../../src/app/feature-import/import-wizard-session.ts) (lines 360-362) only steps `step` down. The Back button ([import-wizard.component.html](../../../src/app/feature-import/components/import-wizard/import-wizard.component.html)) is disabled only on step 1 or while committing.
- `goNext` case 1 (line 351) sets `currentFileIndex` to 0 and goes to step 2. `commitResults` is never touched, and the queue keeps the committed files.
- **Root cause:** nothing records which queued files are already committed, and Next always restarts at index 0. In batch mode the auto-commit effect commits file 0 again as soon as it parses (`autoCommittedFileIndex` was already moved on to a later index). Manually, Confirm does the same. Each repeat partitions every row as a duplicate (`skip`), creates a 0-row `ImportBatch` in import history, and appends a second result to `commitResults`, which What changed lists.

## Desired result (to-be)

- Once any file of the batch is committed, Back no longer re-opens the committed files. Smallest fix: Back is disabled after the first commit, with a tooltip or caption saying the imported files can be undone from What changed or Import history.
- Whatever the mechanism, a file is committed at most once per session, and What changed lists each file once.

## Acceptance criteria

- [ ] After file 1 of 3 is committed, Back can't lead to file 1 being committed again (Back disabled, or Next resumes at the first uncommitted file).
- [ ] No 0-row batch is created by navigating Back and Next in a partially committed batch, and `commitResults` holds one entry per file.
- [ ] Back still works before anything is committed (step 2 → step 1, mapping kept as today).
- [ ] Unit tests in `import-wizard-session.spec.ts` cover: commit file 1, Back, Next → file 1 isn't committed again (manual and batch auto-commit paths); Back before any commit still returns to step 1.
- [ ] Live browser check: 3-file import, confirm file 1, try Back, and confirm import history gains no empty batch.
- [ ] Verified via the fallow skill and coding-conventions skill.

## Notes

- The alternative to disabling Back is letting step 1 edit the uncommitted files and resuming at the first of them. That needs committed files marked in the queue (and kept out of removal), so step 1 can't shift indices under `currentFileIndex`. Only worth it if users need to re-pick accounts mid-batch.
- Independent of TICKET-IMP-25 (the parse-error half of CR6-21).
