# TICKET-CLEANUP-02 — Codify the verified fallow false-positive families in `.fallowrc.json`

- **Area:** Tooling / codebase intelligence
- **Type:** Refactor
- **Traceability:** CR3-6; closes CR2-6.5 with concrete contents (review §5 supplies the verification)

## User story

As a developer running fallow (locally or in a future CI gate), I want the verified false-positive families configured away, so a fallow run on this repo reports only signal — cycles, dupes, complexity — and nobody burns time re-investigating (or worse, "cleaning") working code.

## Description

CR3 §5 manually traced fallow's raw dead-code output: all 19 "unused exports" are used in-file and/or by specs, all 23 "unused class members" are DI-invoked repository methods, and `tailwindcss` is correctly a devDependency. That knowledge currently lives only in the review doc; this ticket moves it into config plus a committed baseline so future runs (and CR4) start clean.

## Current situation (as-is)

- No `.fallowrc.json` exists (`fallow config --path` exits 3); every run re-reports the ~64 known-noise findings alongside the real ones.
- [category-model.worker.ts:301](../../../src/app/core/ml/category-model.worker.ts) — `getTensorCount`, the one genuinely spec-only export (deliberate leak-detection hook), is indistinguishable from dead code in the output.

## Desired result (to-be)

- A committed `.fallowrc.json` per review §6:
  - `"ignoreExportsUsedInFile": true` (clears the in-file-used export family),
  - `"ignoreDependencies": ["tailwindcss"]`,
  - `"rules": { "unused-class-members": "off" }` (DI-blind family, all 23 verified in use).
- `/** @expected-unused */` on `getTensorCount` (staleness-tracked, unlike a bare ignore comment).
- An identity baseline saved (`fallow dead-code --save-baseline`) and **committed** (note: fallow's default `.fallow/` dir is gitignored by `fallow init` — place the baseline somewhere tracked, e.g. `.fallow-baseline.json`, or un-ignore the file) so a future gate can fail on *new* findings only.

## Acceptance criteria

- [x] `fallow dead-code --format json --quiet` reports 0 unused exports/types/class-members and 0 dependency findings, while still reporting the 20 circular dependencies (until TICKET-SOLID-05 lands — the config must **not** suppress those).
- [x] `fallow dupes` and `fallow health` outputs are unaffected by the config (spot-check counts before/after).
- [x] The config file carries a comment linking to review §5 (`docs/v1.3_code_review/code-review-fallow.md`) as the evidence trail (`.fallowrc.json` accepts JSONC comments).
- [x] Baseline file is committed and `fallow dead-code --baseline <file>` runs clean.
- [x] Verified via the fallow skill (a fresh run shows the expected clean output); no app code changes, so no lint/test/build impact beyond the one JSDoc tag.

## Notes

- Deliberately **not** enabling a pre-commit fallow gate here — that's a separate opt-in decision (the CR2 backlog's hooks question); this ticket only makes any future gate trustworthy.
- When TICKET-SOLID-05 eliminates the cycles, re-save the baseline.
