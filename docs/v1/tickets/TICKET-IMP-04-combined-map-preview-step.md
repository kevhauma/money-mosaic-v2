# TICKET-IMP-04 — Combine map + preview into one screen with a top confirm bar

- **Area:** CSV Import
- **Type:** Feature
- **Traceability:** FR-IMP-4 (live preview), refines FR-IMP-3; UI ergonomics
- **Source story:** user-stories.md §2 — *"As a user, I want the column mapping and the row preview on one screen with a live preview whenever the mapping is valid, and the Back/Next controls pinned at the top, so I can confirm a multi-file import without scrolling."*

## Description

Collapse the separate **Map** (step 2) and **Preview** (step 3) stages of the import wizard into a single screen: the mapping form on top, a live preview of the parsed rows below it that refreshes whenever the mapping is valid, and the Back / Next-Confirm controls pinned at the top so the user can advance each file without scrolling past the mapping form and preview table. This shaves one full click-and-scroll cycle per file, which compounds across a multi-file batch.

## Current situation (as-is)

- The wizard is a 4-step machine — `WizardStep = 1 | 2 | 3 | 4` — in [import-wizard.component.ts](../../../src/app/feature-import/components/import-wizard/import-wizard.component.ts). Map is step 2, Preview is step 3.
- Step 2 renders [ImportMapStepComponent](../../../src/app/feature-import/components/import-map-step/import-map-step.component.ts) and binds its `result` model. `result` is already non-null **only when the mapping form is valid** (`updateResult()` sets it to `null` on `form.invalid`), so there is a clean "mapping is valid" signal to hang a live preview on.
- Advancing from step 2 calls `goNext()` → `runParse()`, which calls `csvImportService.parse(...)`, stores `parsedRows`, and only then flips to step 3, where [ImportPreviewStepComponent](../../../src/app/feature-import/components/import-preview-step/import-preview-step.component.ts) renders `[rows]="parsedRows()"`. So mapping and preview never coexist; the user commits to the map step before seeing parsed output.
- The nav controls live at the **bottom** of the card: in [import-wizard.component.html](../../../src/app/feature-import/components/import-wizard/import-wizard.component.html) the `card-actions` Back/Next block sits after the `@switch` body (lines 55–83). On the long mapping form the user must scroll to the bottom to reach Next, then again to Confirm on the preview step.
- Committing (`runCommit()`) already loops per file: it advances `currentFileIndex` and resets back to step 2 for the next file, so the map↔preview round-trip is paid once per file in a batch.

## Desired result (to-be)

- Map and preview render on **one** screen. The mapping form sits above a live preview table.
- Whenever the mapping is valid (`mapResult()` non-null), the preview parses and updates automatically — no explicit "Next to preview" click. While invalid, the preview area shows a neutral "complete the required mapping fields" hint instead of stale rows.
- Back and the primary action (Next / Confirm import / Confirm & continue) are reachable at the **top** of the screen without scrolling, in addition to (or instead of) the current bottom placement.
- The primary action reflects the same states it does today: parsing, importing, "Confirm & continue" when more files remain, "Confirm import" on the last file.
- The wizard is now effectively 3 stages (Select → Map+Preview → Summary); the `steps` indicator and any `WizardStep`-dependent logic are updated to match, and per-file batching behaviour (TICKET-IMP-02 direction) is preserved.

## Acceptance criteria

- [ ] The mapping form and a row preview are visible on the same screen for a queued file; there is no longer a separate preview-only step to click through.
- [ ] The preview refreshes automatically whenever `mapResult()` is non-null (mapping valid), and shows a neutral placeholder (not stale/last-file rows) whenever the mapping is invalid or not yet complete.
- [ ] Parse still runs through `CsvImportService.parse(...)` and malformed-row reporting (FR-IMP-8) is unchanged — a bad line is surfaced in the preview and doesn't block importing the valid rows.
- [ ] Back and the primary confirm action are reachable at the top of the screen without scrolling; the primary action's label/disabled states still cover: mapping incomplete, parsing…, importing…, "Confirm & continue" (more files queued), "Confirm import" (last file).
- [ ] Committing a file still goes through `ImportBatchesStore.commitImport(...)` and mapping persistence through `MappingProfilesStore` — no direct Dexie table writes — and per-file `accountId`, duplicate-fingerprint skipping (FR-IMP-6), and atomic commit (NFR-RESIL-1) are unchanged.
- [ ] In a multi-file batch, files 2..N land on the same combined screen with their own live preview; the final Summary step (FR-IMP-7) still reports per-file results and each batch stays independently undoable.
- [ ] The `steps` progress indicator and `WizardStep` typing/logic reflect the merged stage (Select → Map+Preview → Summary) with no dead step-3 branch left behind.
- [ ] Unit tests cover: preview populated automatically once mapping becomes valid; preview cleared/placeholder when mapping goes invalid; top confirm action disabled while mapping invalid and while parsing/committing; advancing through a ≥2-file batch commits each file under its own account and reaches Summary.
- [ ] Verified live in the browser: a single-file import and a 2-file import can each be completed from the top confirm control without scrolling to reach it, with the preview updating as the mapping is edited.

## Notes

- This is primarily a control-flow + template change in `ImportWizardComponent`; `ImportMapStepComponent` already emits validity via its `result` model and `ImportPreviewStepComponent` already takes `[rows]`, so the pieces exist — the work is merging steps 2/3, driving parse reactively off `mapResult()`, and relocating the action bar.
- Debounce the reactive re-parse so every keystroke in the mapping form doesn't spawn a parse; parsing runs in a Web Worker (NFR-PERF-2) but rapid re-parses are still wasteful.
- Complements [TICKET-IMP-02](./TICKET-IMP-02-batch-multi-file-mapping.md) (map a batch once) and [TICKET-IMP-03](./TICKET-IMP-03-header-mismatch-error.md) (per-file header-mismatch error surfaces in the same combined preview). Do not raise the `angular.json` bundle budget.
