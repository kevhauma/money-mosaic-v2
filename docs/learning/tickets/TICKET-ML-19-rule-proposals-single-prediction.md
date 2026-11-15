# TICKET-ML-19 — ML rule proposals only group rows predicted as the same category

- **Area:** Auto-categorisation
- **Released in:** _unreleased_
- **Type:** Bug fix
- **Traceability:** CR6-31 ([code review 6](../../releases/v3_code_review_2/code-review.md)); FR-ML-3 (rule-proposal mining, [TICKET-ML-03](./TICKET-ML-03-rule-proposal-mining.md)), FR-ML-9 (the inbox)

## User story

As someone reviewing the model's rule proposals, I want a proposal only when the model agrees with itself about a merchant, so accepting one never files rows the model thought were something else.

## Description

Proposals are mined per counterparty. Support and mean confidence are counted over every row of that counterparty, whatever category each row was predicted as, and the proposal takes the most frequent one. Accepting it creates a `counterpartyName equals` rule, which then files **all** of that merchant's non-manual rows, including the ones predicted as another category.

## Current situation (as-is)

- [`mineRuleProposals`](../../../src/app/core/ml/rule-proposal-mining.ts) groups predictions by trimmed `counterpartyName` (lines 47–57).
- `support` and `meanConfidence` are computed over **all** members (lines 62–64) and checked against `RULE_PROPOSAL_MIN_SUPPORT = 4` / `RULE_PROPOSAL_MIN_CONFIDENCE = 0.85` ([`model-config.ts`](../../../src/app/core/ml/model-config.ts)).
- `categoryId` is `modalCategoryId(members)` (line 75), and `transactionIds` lists every member (line 79).
- Example: four "Shell Express" rows, two predicted Groceries and two Fuel, all at 0.95. Support 4, mean 0.95, modal tie broken to the lower id: a Groceries proposal "for 4 rows". Accepting it files the two Fuel rows under Groceries.

## Desired result (to-be)

- A counterparty cluster becomes a proposal only when **every** member is predicted as the same category. Support and mean confidence are then over rows that agree, and `transactionIds` lists exactly the rows the rule is proposed for.
- A cluster with mixed predictions is not proposed. Its rows still get their individual suggestions, which the user can accept one by one.
- `modalCategoryId` and its tie-break are no longer needed and are removed.

## Acceptance criteria

- [ ] 2 Groceries + 2 Fuel predictions for "Shell Express", all at 0.95: no proposal.
- [ ] 4 Groceries predictions for "Albert Heijn" at 0.9: one Groceries proposal, support 4, mean 0.9, four transaction ids. This is unchanged.
- [ ] 5 Groceries + 1 Fuel for one counterparty: no proposal.
- [ ] Existing thresholds, coverage and sort behaviour are unchanged (the existing `rule-proposal-mining.spec.ts` cases still pass, except the modal tie-break case, which is replaced by the mixed-cluster cases above).
- [ ] Accepting a proposal still goes through `RulesStore.createRuleFromCounterparty`, and rows with `categoryManual: true` keep their category.
- [ ] `ng lint`, `ng test` and `ng build --configuration development` pass. Verified via the fallow skill and coding-conventions skill.
- [ ] Browser check: on the Learning page, a merchant whose rows the model splits across two categories shows no rule proposal, while its rows still show per-row suggestions.

## Notes

- **This departs from TICKET-ML-03's design**, which took the modal category on purpose. The modal reading can't be kept safely: the rule a proposal creates matches on counterparty alone, so it always catches the dissenting rows too.
- A looser rule (for example "at least 90% agree") would still mis-file the rest on accept. If proposals get too rare in practice, the better follow-up is a proposal that names its exceptions, not a tolerance.
- The review's suggested fix (count support and confidence over the modal rows only) would fix the numbers but still mis-file the dissenting rows on accept. That's why this ticket goes stricter.
