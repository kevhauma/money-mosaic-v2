# TICKET-CAT-15 — "Run rules" keeps the Partner-contribution tag

- **Area:** Categories
- **Released in:** _unreleased_
- **Type:** Bug fix
- **Traceability:** CR6-33 ([code review 6](../../releases/v3_code_review_2/code-review.md)); FR-CAT-3 (re-run rules on demand), TICKET-CAT-02 (co-owner "Partner contribution" tag)

## User story

As a joint-account holder, I want my partner's deposits to stay tagged "Partner contribution" when I press "Run rules", so a broad rule never relabels them.

## Description

On import, the co-owner tagger runs after the rules and wins over them, because a registered co-owner IBAN is the more specific signal. "Run rules" runs only the rules, so a rule that also matches the partner's deposit takes the row over. Totals stay right, because the joint-leg logic excludes these rows by IBAN, but the label and the agreed precedence are lost.

## Current situation (as-is)

- [`ImportBatchesStore.commitImport`](../../../src/app/core/state/import-batches.store.ts) (lines 132–145) runs `rulesEngineService.runAndPersist` and then `coOwnerContributionService.runAndPersist` over the result, so the tag wins.
- [`RulesStore.runRules`](../../../src/app/feature-categories/rules.store.ts) (lines 95–103) runs only `rulesEngineService.runAndPersist`. "Always categorise" and "Make rule from filter" call the same method.
- [`applyRules`](../../../shared/rule-matching.ts) (line 160) skips only manual rows and transfer legs. It knows nothing about co-owners, so a rule "counterparty contains Jansen → Gifts" rewrites a "Partner contribution" deposit from co-owner Jansen into the joint account as Gifts.

## Desired result (to-be)

- "Run rules" applies the same precedence as import: rules first, then the co-owner tagger over the result, and the tag wins.
- Both are computed in memory before anything is saved. Only the **net** change per row is written, in one `bulkUpdate`, so a tagged row is never written to Gifts and back again, and `lastRunCount` counts only rows whose category really changed.
- One shared step does "rules, then the co-owner tag" for both import and "Run rules", so the two paths can't drift apart again.

## Acceptance criteria

- [ ] A +€500 deposit into a joint account from a registered co-owner IBAN, tagged "Partner contribution", stays tagged after "Run rules" when the rule "counterparty contains Jansen → Gifts" matches it.
- [ ] The same deposit, if it was uncategorised, ends up "Partner contribution" after "Run rules", not Gifts.
- [ ] That row isn't sent in the run's `bulkUpdate` when its category doesn't change, and `lastRunCount` doesn't count it.
- [ ] A deposit from a non-co-owner IBAN into the same joint account still gets the rule's category.
- [ ] Rows with `categoryManual: true` and transfer legs are untouched by both steps. Rules never overwrite a manual category.
- [ ] Writes go through `TransactionsRepository.bulkUpdate` from the service/store, never a direct API call from a component.
- [ ] Unit tests cover: rule versus co-owner tag on a tagged row; on an uncategorised row; a non-co-owner deposit; a manual row; one `bulkUpdate` with net changes only. Import keeps its current behaviour (existing `import-batches.store` specs pass).
- [ ] `ng lint`, `ng test` and `ng build --configuration development` pass. Verified via the fallow skill and coding-conventions skill.
- [ ] Browser check: with a co-owner registered and a matching broad rule, pressing "Run rules" leaves the partner's deposits on "Partner contribution".

## Notes

- **Out of scope: the MCP `run_rules` tool** ([`server/src/mcp/run-rules.ts`](../../../server/src/mcp/run-rules.ts)) has the same gap. Fixing it means moving the co-owner lookup (`resolveCoOwnerByIban`, `src/app/core/accounts`) into root `shared/` too. Worth a follow-up ticket if agents run rules on joint accounts.
