# TICKET-IMP-06 — Decode CSV files once, slice previews, and move decoding into the worker

- **Area:** Import (CSV pipeline)
- **Type:** Refactor
- **Traceability:** CR-4.1, CR-4.2, CR-4.3 (carried over from the first review, all still open — re-verified 2026-07-14)

## User story

As a user importing a large bank export, I want header detection and preview to read only the file's head, and full parsing to decode off the main thread, so the import wizard stays responsive regardless of file size.

## Description

Every step of the import pipeline currently decodes the **entire** file on the main thread: `detectHeaders` and `previewRawRows` each do `file.arrayBuffer()` + full `TextDecoder.decode()` just to read a handful of rows, and the wizard calls them repeatedly (per encoding/delimiter change). `parse` also decodes on the main thread and posts the full decoded string to the worker, copying it across the boundary instead of transferring raw bytes.

## Current situation (as-is)

- [csv-import.service.ts:39-61](../../../src/app/core/import/csv-import.service.ts) — `detectHeaders` and `previewRawRows` decode the full file per call, no caching.
- [csv-import.service.ts:8-36](../../../src/app/core/import/csv-import.service.ts) — `parse` decodes the full text on the main thread, then `postMessage`s the string (structured-clone copy) to the worker.
- CR-4.3 (low priority): the worker keys rows by header name; index-keyed rows would be smaller and rename-proof — see [csv-parse.ts](../../../src/app/core/import/csv-parse.ts) / [csv-row-mapper.ts](../../../src/app/core/import/csv-row-mapper.ts).

## Desired result (to-be)

- Header/preview reads decode only a sliced head of the file (~64 KB is plenty for headers + 6 preview rows) and cache the decoded head per `(File, encoding)` so repeated wizard interactions don't re-read.
- `parse` posts the `ArrayBuffer` (as a [transferable](https://developer.mozilla.org/en-US/docs/Web/API/Worker/postMessage#transfer)) plus the encoding; the worker decodes. Main-thread decode of the full file disappears.
- CR-4.3's column-index keying is **optional scope** — take it only if it falls out naturally of the worker-request change; otherwise leave and note it.

## Acceptance criteria

- [x] No full-file `TextDecoder.decode()` remains on the main thread in `csv-import.service.ts` (header/preview use a sliced blob; parse defers to the worker).
- [x] The worker request carries an `ArrayBuffer` in the transfer list (post-call, the buffer is detached on the main thread — assert in a spec).
- [x] Existing import behaviour is unchanged: presets detect (including the `windows-1252` encodings per CR-1.4), preview renders, commit produces identical transactions — `csv-parse.spec.ts` / `import.service.spec.ts` / map-step specs pass. **Live browser import of a sample file skipped per explicit user request this session** — worth a manual pass before shipping if that hasn't happened separately.
- [x] Unit tests cover: sliced header detection on a file larger than the slice; cache hit on a second `detectHeaders` call with the same file+encoding; changed encoding busts the cache.
- [x] Verified via the fallow skill and coding-conventions skill.

## Notes

- Slicing a multi-byte encoding can cut a character at the boundary — decode the slice with `{ fatal: false }` and drop the final possibly-truncated line; headers/preview never need it.
- `ng build --configuration development` is the canary for worker-bundling regressions (per CLAUDE.md) — run it early, not just at the end.
