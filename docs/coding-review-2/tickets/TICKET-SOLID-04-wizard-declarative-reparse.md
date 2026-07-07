# TICKET-SOLID-04 — Replace the wizard's hand-rolled reparse plumbing with a declarative pipeline

- **Area:** SRP / Angular patterns (feature-import)
- **Type:** Refactor
- **Traceability:** CR2-2.2

## Description

`ImportWizardComponent` coordinates live re-parsing with three manual mechanisms: a `parseToken` counter to reject stale worker results, a `reparseTimer` (`setTimeout`) for debounce, and a constructor `effect()` that must remember to cancel both and reset four signals. The conventions reserve RxJS for exactly this kind of inherently stream-shaped boundary: `debounceTime` + `switchMap` give debounce and staleness-cancellation declaratively, and `toSignal` brings the result back into the signal graph. Separately, the four parse-state signals are reset from three different call sites with overlapping subsets — one forgotten line away from a stale-state bug.

## Current situation (as-is)

- [import-wizard.component.ts:80-115](../../../src/app/feature-import/components/import-wizard/import-wizard.component.ts) — `parseToken`, `reparseTimer`, and the effect that clears the timer, bumps the token, sets `parsing`, and schedules `runParse`.
- [import-wizard.component.ts:134-152](../../../src/app/feature-import/components/import-wizard/import-wizard.component.ts) — `runParse` re-checks the token at three points to guard stale writes.
- Parse-state resets in three places with drift potential: the effect's invalid branch (96–103), `runCommit`'s next-file branch (184–188), `startNewImport` (202–211).

## Desired result (to-be)

- One reactive pipeline replaces the token/timer: derive a `computed` of `{ step, file, mapResult }`, pipe `toObservable(...)` through `debounceTime(PARSE_DEBOUNCE_MS)` and `switchMap` into the worker parse (mapping error/success into one state object), and land it with `toSignal`. `switchMap` supersedes in-flight results when inputs change — `parseToken` and `reparseTimer` are deleted.
- Parse UI state (`parsing`, `parsedRows`, `parseError`, `parseWarnings`) is either derived from that one pipeline state or reset through a single private `resetParseState()` — no call site hand-picks a subset of signals.
- The UX invariants survive: the debounce window itself counts as "parsing" (confirm stays disabled so a fast click can't commit stale rows), and an invalid mapping shows the neutral placeholder, not stale rows.

## Acceptance criteria

- [x] `parseToken`, `reparseTimer`, and all manual `setTimeout`/`clearTimeout` are gone from the component; staleness is handled by `switchMap` (or an equivalent single declarative operator chain).
- [x] Exactly one code path resets/derives the parse-state signals; `runCommit` and `startNewImport` no longer enumerate them individually.
- [x] Behaviour preserved, verified by the existing + extended [import-wizard.component.spec.ts](../../../src/app/feature-import/components/import-wizard/import-wizard.component.spec.ts): (a) editing the mapping twice quickly results in one parse whose result lands; (b) a slow parse superseded by a newer mapping never overwrites newer rows; (c) `parsing()` is true from the moment the mapping turns valid until fresh rows land; (d) invalidating the mapping clears rows/error/warnings.
- [x] The worker contract is untouched (`CsvImportService.parse` unchanged; note the worker itself isn't cancellable — `switchMap` only needs to drop its late result, matching today's token semantics).
- [x] Multi-file flow still works: committing file 1 of 2 moves to file 2 with a clean map/preview; the summary appears after the last file; "start new import" fully resets.
- [x] Verified live in the browser with a 2-file import, including rapid mapping edits during parse; no console errors.
- [x] The `angular.json` bundle budget is **not** raised.

## Notes

- `rxjs-interop` (`toObservable`/`toSignal`) is already used in this codebase ([transactions-overview.component.ts](../../../src/app/feature-transactions/components/transactions-overview/transactions-overview.component.ts), [import-map-step.component.ts](../../../src/app/feature-import/components/import-map-step/import-map-step.component.ts)) — no new dependency, and it matches the "RxJS at stream boundaries, signals everywhere else" convention.
- Watch the `step() !== 2` gate: it must remain part of the pipeline's input so leaving step 2 drops any pending parse, same as today.
