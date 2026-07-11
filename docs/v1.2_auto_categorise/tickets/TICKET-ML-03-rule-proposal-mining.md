# TICKET-ML-03 — Rule-proposal mining from prediction clusters

- **Area:** Auto-categorisation
- **Type:** Feature
- **Traceability:** adds FR-ML-3 (new); reuses FR-CAT-2's rule matching

## User story

As a user, I want the app to notice when the model confidently and consistently predicts the same category
for a counterparty, and offer to turn that into a real rule, so my rule set keeps growing over time even
though I can't read the neural net's weights directly.

## Description

A pure function that groups the model's per-transaction predictions by raw `counterpartyName`, and proposes
a rule for any cluster that is large enough and confident enough, and not already covered by an existing
enabled rule. This is the only mechanism by which the opaque model's "knowledge" becomes an inspectable,
editable rule.

## Current situation (as-is)

- [rule-matching.ts](../../../src/app/core/categorisation/rule-matching.ts) exports `matchesRule(transaction, rule)`, used today by `resolveCategoryForTransaction` to test whether a rule already covers a transaction — no equivalent grouping/clustering utility exists.
- [rules.store.ts](../../../src/app/feature-categories/rules.store.ts) `createRuleFromCounterparty` (line 87) already turns a sample transaction + category into a new rule — this ticket's output feeds that existing method (wired up in ML-07), it does not reimplement rule creation.
- No prediction data exists yet in the codebase — this ticket's input shape (`{ transactionId, categoryId, confidence }[]`) is defined here for the first time, produced later by ML-05/ML-07.

## Desired result (to-be)

- New `core/ml/rule-proposal-mining.ts`:
  ```ts
  export type Prediction = { transactionId: number; categoryId: number; confidence: number };

  export type RuleProposal = {
    counterpartyName: string;
    categoryId: number;
    support: number; // cluster size
    meanConfidence: number;
    sampleTransactionId: number; // representative transaction for createRuleFromCounterparty
  };

  export function mineRuleProposals(
    predictions: Prediction[],
    transactionsById: Map<number, Transaction>,
    enabledRules: Rule[],
    thresholds: { minSupport: number; minConfidence: number },
  ): RuleProposal[];
  ```
- Groups predictions by `transactionsById.get(p.transactionId).counterpartyName` (raw string, exact match —
  no fuzzy matching); for each group, takes the modal (most frequent) predicted `categoryId` and the mean
  confidence across the group.
- Keeps only groups where `support >= thresholds.minSupport && meanConfidence >= thresholds.minConfidence`
  **and** where no transaction in the group already `matchesRule` against any `enabledRules` entry (reusing
  [`matchesRule`](../../../src/app/core/categorisation/rule-matching.ts) — a group already covered by an
  existing enabled rule is not proposed again).
- Result sorted by `support` descending, then `meanConfidence` descending, so the strongest signal surfaces
  first.
- Skips predictions for transactions with no `counterpartyName` (empty group key) entirely — no proposal is
  ever made from an empty counterparty.

## Acceptance criteria

- [x] `mineRuleProposals` groups strictly by exact raw `counterpartyName` string (not normalized/lowercased) — matches how rule `equals`/`contains` conditions already compare it.
- [x] A cluster below `minSupport` or `minConfidence` is excluded.
- [x] A cluster where every member transaction already matches at least one enabled rule is excluded entirely, using the existing `matchesRule` helper — no reimplementation of rule-matching logic.
- [x] A cluster where only *some* members match an existing rule is still proposed (the cluster isn't fully covered yet) — document this boundary case explicitly in a test.
- [x] Transactions with an empty/missing `counterpartyName` never form or contribute to a proposal.
- [x] Output is sorted by support desc, then mean confidence desc.
- [x] Each `RuleProposal` includes a `sampleTransactionId` usable directly as the `sampleTxn` argument the existing `createRuleFromCounterparty` expects.
- [x] Unit tests (`rule-proposal-mining.spec.ts`) cover: a cluster meeting both thresholds is proposed; one below either threshold is excluded; a cluster fully covered by an enabled rule is excluded; a partially-covered cluster is still proposed; empty-counterparty predictions are ignored; sort order; modal-category tie-breaking is deterministic (e.g. lowest `categoryId` wins a tie).
- [x] No TestBed — pure function, co-located `rule-proposal-mining.spec.ts`; no import of `@tensorflow/*`.
- [x] Verified via the fallow skill and coding-conventions skill.

## Notes

- This is the ticket that makes the "suggest rules, don't just read weights" design decision concrete — see
  [auto-categorise.md](../auto-categorise.md)'s Context section for why reading tfjs weights directly was
  rejected.
- Independent of ML-02 (feature hashing) — mining operates on already-produced predictions and raw
  counterparty text, never on feature vectors — so it can be built in parallel with ML-02/ML-04/ML-05.
