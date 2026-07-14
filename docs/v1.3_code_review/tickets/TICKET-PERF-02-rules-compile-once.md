# TICKET-PERF-02 — Sort rules and compile regexes once per run-rules pass

- **Area:** Performance / robustness (core/categorisation)
- **Type:** Refactor
- **Traceability:** CR-3.2 (carried over from the first review, still open) + CR3-4; fallow security candidate `f3f50dc9d91e7527` (CWE-1333, low)
- **Fallow evidence (2026-07-14):** the app's only security finding — non-literal pattern to `new RegExp()` at rule-matching.ts:38, reachable from entry, blast radius 55

## User story

As a user with many rules and thousands of transactions, I want a "run rules" pass to prepare each rule once instead of per transaction, so bulk categorisation stays fast and a single pathological regex can't freeze the app for the whole pass.

## Description

`resolveCategoryForTransaction` filters and sorts the full rule list on **every transaction**, and `conditionMatches` compiles a `new RegExp` on **every evaluation** of a regex condition. For an N-transaction × M-rule pass that's N redundant sorts and up to N×M regex compilations. Compiling once per pass also shrinks the ReDoS blast radius fallow flagged: in a local-first app the only "attacker" is the user's own rule, but a catastrophically-backtracking pattern currently re-runs its worst case against every transaction's fields.

## Current situation (as-is)

- [rule-matching.ts:63-81](../../../src/app/core/categorisation/rule-matching.ts) — `resolveCategoryForTransaction` does `[...rules].filter(...).sort(...)` inside the per-transaction call.
- [rule-matching.ts:36-41](../../../src/app/core/categorisation/rule-matching.ts) — `case 'regex': new RegExp(String(condition.value), 'i')` per evaluation; invalid patterns are already caught and return `false`.
- Rule pattern length is unbounded at the input ([rule-form.component.ts](../../../src/app/feature-categories/components/rule-form/rule-form.component.ts) has no max length on the value field for regex conditions).

## Desired result (to-be)

- A pass-level preparation step (e.g. `prepareRules(rules): PreparedRule[]` — enabled-filtered, priority-sorted, each regex condition pre-compiled to a `RegExp | null`) built **once** by the rules engine; the per-transaction path consumes prepared rules only.
- An invalid regex compiles to `null` once and its condition evaluates `false` (current behaviour preserved, computed once).
- A sane max length on regex pattern input (e.g. 200 chars) enforced in the rule form as cheap ReDoS damage limitation.

## Acceptance criteria

- [x] `resolveCategoryForTransaction` (or its replacement) performs no `.sort()` and no `new RegExp()` per transaction — verified by the code shape and a spec that counts compilations via a spy/wrapper or asserts on the prepared structure.
- [x] Rule semantics unchanged: priority order, `enabled` filtering, `continueOnMatch` override, `conditionMatch: 'any'|'all'`, case-insensitive matching — existing `rule-matching.spec.ts` and `rules-engine.service` specs pass unchanged.
- [x] Rules still never overwrite `categoryManual` transactions (existing spec stays green — this pass must not touch that logic).
- [x] Pattern-length cap: entering an over-limit regex in the rule form shows a validation error; existing stored longer patterns (if any) still evaluate (cap is input-side only, no migration).
- [x] Fallow security re-run: the finding either disappears (if the compile moves behind a literal-safe helper) or is suppressed with `// fallow-ignore-next-line security-sink` plus a comment citing this ticket's mitigation.
- [x] Verified via the fallow skill and coding-conventions skill.

## Notes

- Entry points to route through the prepared pass: `RulesEngineService.runAndPersist` (import flow) and the "run rules" action in the rules UI.
- Do not attempt regex *safety analysis* (backtracking detection) — out of scope and unreliable; the cap + once-per-pass compile is the agreed mitigation.

## Execution notes (2026-07-14)

- Added `prepareRules(rules): PreparedRule[]` (filter `enabled` + sort by priority + pre-compile each regex condition once) and `resolveCategoryForPreparedRules` to `rule-matching.ts`. `resolveCategoryForTransaction` is kept as a convenience wrapper (`resolveCategoryForPreparedRules(transaction, prepareRules(rules))`) so its existing spec passes unchanged; `RulesEngineService.applyToTransactions` now calls `prepareRules` once per pass instead of going through the wrapper per transaction.
- `matchesRule`/`conditionMatches` (used directly by `core/ml/rule-proposal-mining.ts` and existing specs) were left compiling on demand — out of scope per the ticket's named entry points (only `RulesEngineService.runAndPersist` and the rules UI "run rules" action).
- Verified "compiles once" with a `toString()`-counting fake pattern rather than `vi.spyOn(globalThis, 'RegExp')` — spying the native `RegExp` constructor breaks its own `.test()`/`instanceof` semantics in this environment, so the count is taken via `String(condition.value)` calls instead (the same value the real compile step stringifies).
- `MAX_REGEX_PATTERN_LENGTH = 200` cap added as a conditional validator (`regexPatternMaxLength`) on the shared `value` control in `rule-form.component.ts`, active only while its sibling `operator` control is `regex`; re-validated via `(change)` handlers on both the field and operator selects.
- Fallow security finding `f3f188c9d91b5d51` (rule-matching.ts, dynamic-regex/CWE-1333) persisted after the once-per-pass change (still reachable, blast radius dropped 55 → 32) — suppressed with `// fallow-ignore-next-line security-sink` directly above the `new RegExp(...)` call, citing this ticket's mitigation.
