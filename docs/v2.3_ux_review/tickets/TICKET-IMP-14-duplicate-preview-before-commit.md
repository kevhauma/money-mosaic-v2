# TICKET-IMP-14 — Say how many rows are duplicates before committing an import

- **Area:** Import
- **Type:** Feature
- **Traceability:** UX review (UXR-11); extends FR-IMP-* — deterministic `fingerprint` de-duplication already exists but is never shown to the user

## User story

As someone importing overlapping bank exports, I want to be told how many rows are already in the app before I commit, so that I can import without fear of double-counting my money.

## Current situation (as-is)

Transactions carry a deterministic `fingerprint` (see [TICKET-DEV-01](../v1.0_foundation/tickets/TICKET-DEV-01-seed-dev-data.md), whose criteria require seeded rows to "pass the same invariants as imported rows and don't collide on a later real import"), so the machinery to recognise a duplicate exists.

The import wizard never surfaces it. Step 1 is a drop zone with no mention of duplicate handling; the preview and summary steps do not report how many incoming rows already exist. The user commits an import without knowing whether they are adding 40 new transactions or re-adding 38 they already have.

For a user whose stated workflow is three overlapping monthly exports, this is the highest-anxiety moment in the product, and the screen is silent at exactly that moment.

## Desired result (to-be)

- Before committing, the wizard states how many incoming rows are new and how many already exist.
- The duplicate rows are inspectable, not just counted, so the user can confirm the match is real.
- The user chooses what happens to duplicates (skip / import anyway) rather than the app deciding silently.
- Step 1 sets expectations up front: the drop zone says duplicates are detected, so the fear is answered before the file is even chosen.

## Acceptance criteria

### Implementation note, 2026-08-24 — the machinery existed, the screen was silent

Nothing about *sameness* changed: `partitionByFingerprint` was already the whole answer, and this
ticket runs it twice — once ahead of the commit, read-only, so the wizard can report it
(`ImportService.previewImport`), and once at commit time as before. Both call the same function
from the same `fingerprintCandidates`, so the counts shown are the counts that happen.

Skip was already the behaviour; it is now a stated default with a visible alternative. **Import
them anyway** is the new write path: in that mode the partition walks past every occurrence already
stored (`key|1`, `key|2`, …) so the row lands as a genuinely new one instead of colliding with the
row it duplicates.

Two things came out of convention review and are worth recording:

- The batch audit would have lost the distinction. In import-anyway mode nothing is skipped, so
  `rowsDuplicate` was 0 and a batch where 40 known rows were knowingly re-imported looked exactly
  like 40 genuinely new ones. `ImportBatch` gained an optional, non-indexed `rowsDuplicateImported`
  (no `.version()` bump needed) and the summary step shows a **Re-imported duplicates** tile when
  it is set. `rowsRead = rowsAdded + rowsDuplicate` still holds.
- The preview table's "show only the already-imported rows" filter could strand itself: the
  duplicate set is empty for the whole of each re-scan, and step 2 re-parses on every mapping edit,
  so the table would empty out *and* unmount the toggle that turns the filter off. It now falls
  back to all rows whenever there is nothing to filter to.

The scan's vocabulary lives in `feature-import/duplicate-scan.ts` — a `DuplicateScanVm` the session
joins once, plus the sentence, the toggle label and the alert status — rather than as six inputs
and four derivations on the map-step class, per the "a new import concern is a module" convention.

- [x] The preview or summary step reports counts of new vs already-present rows for the incoming file. (Step 2, above the row preview: *"0 rows new, 3 already in this account — those will be skipped."* Observed live on :4210 importing the same CSV twice. `duplicateScanSummary` in `duplicate-scan.ts`, six cases in `duplicate-scan.spec.ts`.)
- [x] The already-present rows can be inspected individually, not only counted. (Each row's Status cell reads **already imported** instead of **valid** — all three did on the second import, live. Because the table is capped at 50 rows, a *"Show the 3 rows already imported"* toggle filters it down to them; `import-preview-step.component.spec.ts` covers the marking, the filter, and the row count in the "showing the first N" note.)
- [x] The user can choose to skip duplicates or import them anyway, with skip as the default. (Two radios in a `role="radiogroup"` labelled *"Rows already in this account"*; observed live with **Skip them** checked on arrival. `ImportWizardSession.duplicateHandling` is `signal<DuplicateHandling>('skip')` and is reset per file, so an override on one export is never inherited by the next — pinned by *"resets the choice for the next file, so one override is not inherited"*.)
- [x] Committing with skip selected imports exactly the new rows and leaves existing rows untouched — no edit to an existing row's category, `categoryManual` flag, or transfer link. (Live: second import of the same file reported **Added 0, Skipped duplicates 3**. `import.service.spec.ts` → *"skip (the default) imports exactly the new rows and leaves the existing ones untouched"* asserts one row added, `duplicateCount` 2, and `bulkUpdate` **not called at all** — the only update this path can make is TICKET-TXN-06's rawLine/rawRow backfill, so nothing on an existing row is rewritten.)
- [x] Step 1 states that duplicates are detected before a file is selected. (Under the drop zone: *"Overlapping exports are fine — rows you have already imported are recognised and counted before anything is added."* Read back from the live page before any file was chosen.)
- [x] Multi-file import reports duplicates **within** the incoming set as well as against existing data, since three exports may overlap each other. (By sequencing rather than by a second mechanism: the wizard commits file by file, so file 2 is scanned against a database that already contains file 1. Pinned by *"counts a second file overlapping the first, once the first has been committed"*. Within a single file, two identical rows are **not** duplicates — FR-IMP-6 keeps genuinely-repeated same-day rows, which is what the occurrence-qualified key is for.)
- [x] Detection reuses the existing `fingerprint` rather than introducing a second, divergent notion of sameness. (`previewImport` and `commitImport` both call `this.fingerprintCandidates(...)` then `partitionByFingerprint`; the extracted helper is what makes divergence impossible rather than merely unlikely. `duplicateHandling` decides what happens to a recognised row, never what counts as one.)
- [x] All reads go through the repository layer in `core/data-access/`. (`previewImport` does one `TransactionsRepository.getByAccount` and pure arithmetic; the wizard reaches it through `ImportBatchesStore.previewImport`, keeping one door onto the import machinery. No component or session touches `appDb`.)
- [x] Unit tests cover: an all-new file reports zero duplicates; a fully-overlapping file reports all rows as existing; a partially-overlapping file splits correctly; skip imports only the new rows; import-anyway imports all; two incoming files overlapping each other are counted. (All six in `import.service.spec.ts` → *"duplicate preview and handling (TICKET-IMP-14)"*, plus the account-does-not-exist-yet case, the two audit cases, three `partitionByFingerprint` import-mode cases, five session cases, four preview-component cases and eleven `duplicate-scan` cases. 233/233 pass across `feature-import` + `core/import`.)
- [x] Verified live in the browser by importing the same CSV twice and confirming the second run reports every row as already present. (dev server :4210, 2026-08-24. First run: *"All 3 rows are new"* → **Added 3, Skipped duplicates 0**. Second run of the identical file: *"0 rows new, 3 already in this account — those will be skipped"*, all three rows marked **already imported**, skip preselected → **Added 0, Skipped duplicates 3**. Import-anyway was then exercised too: the sentence became *"0 rows new plus 3 already in this account — all 3 will be added"* and the summary read **Added 3 · Re-imported duplicates 3**. Both batches were undone/removed afterwards and the database confirmed back at its original 41 transactions and 0 import batches.)
- [x] Verified via the fallow skill and coding-conventions skill. (Both fallow CI gates exit 0. `conventions-reviewer` returned ten findings, all applied: the stranded filter, the audit gap, a JSDoc orphaned onto the wrong symbol, raw `<label>`/typography where `mm-label`/`variant="caption"` exist, a missing `role="radiogroup"`, the six-inputs-on-the-map-step concern moved into `duplicate-scan.ts`, an unjustified RxJS pipeline now carrying its justification, an unpluralised toggle label, a summary that ignored the user's choice, and four unformatted files. `ng lint` clean, `ng build --configuration development` compiles.)

## Notes

- Prevention half of [TICKET-IMP-13](./TICKET-IMP-13-import-history-with-undo.md); either is useful alone, and IMP-14 is the cheaper of the two. Consider shipping this one first.
- The wizard's Back/Next bar currently sits **above** the drop zone on step 1, against every wizard convention, and both buttons are disabled and greyed so the card opens with a dead toolbar. Small, related, and worth fixing while this file is open — not required by these criteria.
