# TICKET-MCP-03 — The rule matcher moves to `shared/`, and the agent can run rules

- **Area:** MCP
- **Released in:** _unreleased_
- **Type:** Feature
- **Traceability:** FR-CAT-2 / FR-CAT-3 (rule matching, and never overwriting manual categories); needs TICKET-MCP-01

## User story

As someone maintaining categorisation rules with an agent, I want it to preview which transactions a rule would change and then apply the rules on the server, so a rule can be tested and put to work without me opening the app.

## Description

Rule matching runs only in the browser today. This ticket moves the pure matcher, and the pure "which rows change" step, into `shared/`. The UI then imports them from there, and the server can use them too. It then adds a destructive `run_rules` MCP tool that previews the changes first and applies them on confirm.

## Current situation (as-is)

- [`rule-matching.ts`](../../../src/app/core/categorisation/rule-matching.ts) is pure. Its only imports are types from `@/core/data-access`, which re-exports [`shared/entities.ts`](../../../shared/entities.ts). It holds `OPERATORS_BY_FIELD`, `prepareRules` (keeps enabled rules, sorts by `priority` ascending, compiles regexes) and `resolveCategoryForPreparedRules` (the last matching rule wins, and a rule without `continueOnMatch` stops the run).
- [`RulesEngineService.applyToTransactions`](../../../src/app/core/categorisation/rules-engine.service.ts) is pure apart from its Angular wrapper. It skips manual rows and transfer-linked rows, and returns `{id, categoryId}` only for rows whose category would change.
- Rules are applied only when the UI calls `runRules` ([rules.store.ts](../../../src/app/feature-categories/rules.store.ts)): from "Run rules", when a rule is created from a counterparty or from conditions, and on import. Saving a rule from the form does not run rules.
- [`shared/`](../../../shared/) may import nothing outside itself. An ESLint block and `server/src/shared-module.spec.ts` enforce this.

## Desired result (to-be)

- **Move:**
  - `rule-matching.ts` moves to `shared/` and imports its types from `./entities.js`.
  - The pure body of `applyToTransactions` moves next to it. It returns each update's **deciding rule id** as well as its `categoryId`.
  - `RulesEngineService`, the rules form and every other UI importer now import from the shared module, through the existing barrels where those rules apply.
  - `rule-matching.spec.ts` moves with it. The UI behaves exactly as before.
- **`run_rules` input:** `ruleIds?: number[]`, `confirm?: boolean`.
- **Which transactions:** all of the user's, minus manual rows and transfer-linked rows, the same filter as the UI.
- **Without `ruleIds`:** every enabled rule, exactly as "Run rules" does it.
- **With `ruleIds`:**
  - the evaluation is still the full one: all enabled rules **plus** the named rules, even disabled ones;
  - only updates whose deciding rule is one of `ruleIds` are kept.

  That way, testing or applying one rule gives exactly what a full run would do with that rule switched on. That's the Q8 "what would this rule change?" preview.

- **Without `confirm`:**
  - nothing is written;
  - the tool returns the total number of changes, a count per rule, and the first 200 changes in detail (date, amount, counterparty, current and new category name, deciding rule).
- **With `confirm: true`:**
  - the tool recomputes and applies in one transaction;
  - rule results set `categoryId` only and leave `categoryManual` false, as the UI does;
  - it returns the totals and `[{transactionId, previousCategoryId}]` for every changed row, so the run can be reverted with `assign_categories`.
- The tool is marked destructive.

## Acceptance criteria

> **Implementation note (2026-11-15):** `rule-matching.spec.ts` stays in `src/app/core/categorisation/` rather than moving to `shared/`: `ng test` only discovers specs under `src/` and the server suite only under `server/src/` (see `shared-module.spec.ts`), so a spec in `shared/` would never run. It imports through the re-export, so it still tests the shared module.

- [x] The matcher and the pure apply step live in `shared/`, import nothing outside it, and `shared-module.spec.ts` passes. (`shared/rule-matching.ts`, moved with `git mv`, imports only `./entities.js`; new `applyRules` returns `{id, categoryId, ruleId}`; `shared-module.spec.ts` green)
- [x] No file in `src/` still contains matcher logic. The UI rule run and the rule form behave as before, and the existing rule specs pass unchanged apart from import paths. (`src/app/core/categorisation/rule-matching.ts` is now a one-line re-export of `shared/rule-matching`, so every `@/core/categorisation` importer is unchanged; `RulesEngineService.applyToTransactions` delegates to `applyRules`; the existing rule specs pass with no edits — `rule-matching.spec.ts` gained an `applyRules` describe, see note)
- [x] `run_rules` never touches manual or transfer-linked rows (covered by a spec). (`server/src/mcp/run-rules.spec.ts` "never touches manual or transfer-linked rows")
- [x] Without `confirm`, nothing is written. The preview's totals equal what confirm then applies. (`server/src/mcp/run-rules.spec.ts` "writes nothing without confirm, and the preview totals equal what confirm applies")
- [x] With `ruleIds`, a higher-priority rule that would win still wins, and its rows are left out of the result (covered by a spec). A named disabled rule is evaluated. (`server/src/mcp/run-rules.spec.ts` "with ruleIds, a higher-priority winner still wins…" and "evaluates a named disabled rule, and ignores it otherwise")
- [x] Confirm sets `categoryId` and leaves `categoryManual` false. It returns every changed row's `previousCategoryId`. (`server/src/mcp/run-rules.spec.ts` "confirm sets categoryId only, leaving the row non-manual, and returns the previous category")
- [x] Only the token user's rules and transactions are read or written. Another user's rule id in `ruleIds` is an error. (`server/src/mcp/run-rules.spec.ts` "reads and writes only the token user's rules and rows, and refuses another user's rule id")
- [x] `ng lint`, `ng test` and `ng build --configuration development` pass, as do `npm --prefix server run lint`, `npm --prefix server run typecheck` and `npm run test:server`. Verified via the fallow skill and the coding-conventions skill. (ng lint clean; ng test 349 files / 3976 tests; ng build dev OK; server lint, typecheck, 472 tests green; fallow dead-code + health exit 0 after repointing the existing `resolveCategoryForTransaction` ignore in `.fallowrc.json` to the moved file)
- [x] Browser check: "Run rules" on the Rules page still categorises a freshly imported batch. (2026-11-15, Orca browser on a scratch DB: a fresh 3-row import batch plus a "contains delhaize → Groceries" rule; clicking "Re-run rules" showed "Re-ran rules: 2 transactions recategorised." and `GET /api/transactions?importBatchId=1` showed both Delhaize rows on Groceries, non-manual, and the Shell row untouched)

## Notes

- **Why the deciding rule id:** without it, `ruleIds` would mean "run only these rules" and could assign a category that a higher-priority rule overrides in a real run. Tracking the deciding rule keeps a subset run consistent with a full one.
- **Saving a rule still doesn't apply it,** in the UI or in TICKET-MCP-04. Applying is always this separate, confirmed step. That's what lets rule editing skip confirmation (decided 2026-11-14).
- Applying a whole year to every transaction is fine at personal scale in SQLite. Batch it only if a profile shows a problem.
- Moving the matcher also makes `OPERATORS_BY_FIELD` available to the server, which TICKET-MCP-04 needs to validate rules.
