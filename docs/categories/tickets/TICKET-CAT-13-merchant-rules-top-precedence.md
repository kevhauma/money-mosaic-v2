# TICKET-CAT-13 — "Always categorise" and accepted ML rules take top precedence

- **Area:** Categories
- **Released in:** _unreleased_
- **Type:** Bug fix
- **Traceability:** CR6-8 ([code review 6](../../releases/v3_code_review_2/code-review.md)); FR-CAT-4 ("always categorise this merchant"), FR-CAT-2 (priority, first match wins), FR-ML-9 (accepting a rule proposal)

## User story

As someone who ticks "always categorise this merchant as Groceries", I want that choice to win over my older, broader rules, so the merchant actually ends up in the category I just picked.

## Description

The one-click merchant rule, and the rule an accepted ML proposal creates, are saved at the **lowest** precedence, so any older rule that also matches keeps winning. The user's most specific and most recent instruction should run first.

## Current situation (as-is)

- [`RulesStore.createRuleFromCounterparty`](../../../src/app/feature-categories/rules.store.ts) (lines 115–119) computes `Math.max(0, ...priorities)` and saves the new rule at `highestPriority + 10`.
- [`prepareRules`](../../../shared/rule-matching.ts) (line 106) sorts ascending — a lower number runs first — and `decidingRule` stops at the first match without `continueOnMatch`. So the new rule runs **last**.
- [`CategoryModelStore.acceptProposal`](../../../src/app/feature-categories/category-model.store.ts) (line 279) delegates to the same method, so accepted ML proposals have the same problem.
- Example: a rule "description contains POS → Shopping" (priority 10) exists. On an Albert Heijn POS row the user picks "always categorise as Groceries". The new rule gets priority 20. The run that follows still files every Albert Heijn POS row under Shopping.

## Desired result (to-be)

- `createRuleFromCounterparty` saves the new rule at `Math.min(0, ...priorities) - 10`, so it runs before every existing rule. Both the transaction-row shortcut and `acceptProposal` get this through the one method.
- The backfill run that follows (`runRules`) therefore assigns the merchant's category to its non-manual rows, even when an older rule also matches.
- Priorities may go negative. The schema and the MCP `create_rule` tool already allow any integer.

## Acceptance criteria

- [ ] With an existing rule "description contains POS → Shopping" (priority 10), "always categorise Albert Heijn as Groceries" creates a rule with priority 0 or lower. After the backfill, a non-manual row "POS ALBERT HEIJN 1234" (counterparty "Albert Heijn") is Groceries.
- [ ] With rules at priorities −5, 10 and 30, the new merchant rule is saved at −15.
- [ ] Accepting an ML rule proposal creates its rule at the same top precedence (same method, covered by a `category-model.store.spec.ts` case).
- [ ] A row with `categoryManual: true` keeps its category through the backfill. Rules never overwrite a manual category.
- [ ] The rule is saved through `RulesStore.addRule` → `RulesRepository`, never by a direct API call.
- [ ] Unit tests in `rules.store.spec.ts` cover: no rules (priority −10); mixed priorities including a negative one; the new rule beating an older overlapping rule in the run that follows; a manual row left untouched.
- [ ] `ng lint`, `ng test` and `ng build --configuration development` pass. Verified via the fallow skill and coding-conventions skill.
- [ ] Browser check: with a broader rule in place, "always categorise" on a row moves every matching non-manual row to the chosen category, and the new rule shows at the top of the Rules list.

## Notes

- The rule form's default priority for a hand-made rule ([`rules-overview.component.ts`](../../../src/app/feature-categories/components/rules-overview/rules-overview.component.ts) line 84, `max + 10`) stays as it is. A rule the user builds by hand is placed by them; only the one-click paths get top precedence.
- Choosing "always categorise" twice for the same merchant leaves two rules. The newer one now runs first, which matches the user's latest choice.
