# TICKET-TXN-13 — "Make rule from filter" matches what the filter shows

- **Area:** Transactions
- **Released in:** _unreleased_
- **Type:** Bug fix
- **Traceability:** CR6-9 ([code review 6](../../releases/v3_code_review_2/code-review.md)); FR-TXN-3 (filter by text and amount), FR-CAT-2 (rule conditions); TICKET-CAT-07 (make rule from filter), TICKET-TXN-10 (amount bounds)

## User story

As someone turning a filtered list into a rule, I want the rule to match the rows the filter is showing, so that a filter with 30 rows doesn't give me a rule that matches none of them, or quietly leaves out the €100.00 row my "min 100" included.

## Description

The text filter searches the description and the counterparty name. The rule built from it only checks the description. And a single amount bound becomes a strict `>` / `<`, while the filter's bounds are inclusive. Both make the rule narrower than the list the user was looking at.

## Current situation (as-is)

- [`matchesTransactionFilters`](../../../src/app/feature-transactions/transaction-filters.ts) (lines 103-107) matches `filters.text` against `` `${rawDescription} ${counterpartyName}` ``. [`filtersToRuleConditions`](../../../src/app/feature-transactions/transaction-filters.ts) (line 150) emits only `{ field: 'description', operator: 'contains' }`, and [`fieldValue`](../../../shared/rule-matching.ts) (line 13) maps `description` to `rawDescription` alone.
- Lines 162-166: a lone lower bound becomes `'>'`, a lone upper bound `'<'`. The filter's magnitude check (`matchesAmountMagnitude`, line 60) uses `>=` / `<=`. "Min 100" on expenses becomes `amount < -100` and drops exactly −100.00.
- [`openRuleFromFilter`](../../../src/app/feature-transactions/components/transactions-overview/transactions-overview.component.ts) (lines 296-312) always sets `conditionMatch: 'all'`.
- **Root causes:** the text axis is converted to one field where the filter searches two, and the open bound uses a strict operator where the filter is inclusive. `RuleCondition` has no `>=` / `<=`, and a rule has one flat `all`/`any` switch, no condition groups.

## Desired result (to-be)

- **Text only** (no account or amount axis): the rule gets `description contains X` **and** `counterpartyName contains X` with `conditionMatch: 'any'`.
- **Text plus other axes:** `any` can't be used (it would OR the account and amount too), and rules have no groups. Keep `description contains X` under `all`, and add "Text (counterparty name)" to the excluded-axis note, so the user is told the rule only checks the description.
- **Amount bounds are inclusive:** a lone bound matches the bound value itself, in both directions, for the open side as well as `between`.

## Acceptance criteria

- [ ] Filter text "albert", no other axis, where "albert" appears only in `counterpartyName`: the rule draft matches every row the filter shows.
- [ ] Filter text plus an account: the draft has `description contains` + `accountId equals` under `all`, and the rule-form note names the counterparty-name part as not included.
- [ ] "Min 100" on expenses matches an amount of −100.00. "Max 50" on income matches 50.00. `between` stays inclusive.
- [ ] The rule is saved through `RulesStore.createRuleFromConditions`, unchanged. No component calls the API.
- [ ] Unit tests in `transaction-filters.spec.ts` cover: text-only → two conditions + `any`; text + account → description only + note label; inclusive lone min/max for expense and income; the existing "'all' direction drops the amount axis" case still holds.
- [ ] Live browser check: filter by a counterparty name, make a rule, and confirm the rule form's preview (or a Run rules pass) hits the filtered rows.
- [ ] Verified via the fallow skill and coding-conventions skill.

## Notes

- The draft's `conditionMatch` has to come from `filtersToRuleConditions` (or a sibling that returns both), not stay hard-coded in `openRuleFromFilter`.
- **Inclusive bounds, options:** (a) add `>=` / `<=` to `RuleCondition['operator']`. That touches `shared/entities.ts`, `shared/rule-matching.ts`, `OPERATORS_BY_FIELD`, the rule form, server body validation and the MCP rule tools, so server lint/typecheck/test apply. (b) Emit `between` with the open side at a sentinel such as ±`Number.MAX_SAFE_INTEGER` (not `Infinity`, which JSON turns into `null`). (b) needs no shared change but shows the sentinel in the rule form. Prefer (a) if the rule form should read naturally.
- The filter's haystack joins the two fields with a space, so text spanning both ("shop albert") matches the filter but neither field. Leave it: nobody types that.
