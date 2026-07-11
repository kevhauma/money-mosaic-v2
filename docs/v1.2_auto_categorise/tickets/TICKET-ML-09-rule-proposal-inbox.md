# TICKET-ML-09 — Rule-proposal inbox on the rules page

- **Area:** Auto-categorisation
- **Type:** Feature
- **Traceability:** adds FR-ML-9 (new)

## User story

As a user, I want the app to show me when it's spotted a pattern confident enough to become a real rule,
so my rule set can grow on its own suggestion instead of me having to notice the pattern myself.

## Description

A dismissible list, embedded at the top of the rules page, of the model's mined rule proposals — each
showing the counterparty, the proposed category, its support/confidence, and Accept/Dismiss actions.

## Current situation (as-is)

- [rules-overview.component.html](../../../src/app/feature-categories/components/rules-overview/rules-overview.component.html) /
  [.ts](../../../src/app/feature-categories/components/rules-overview/rules-overview.component.ts) render the existing rule list with no
  proposal/inbox concept.
- [components/index.ts](../../../src/app/feature-categories/components/index.ts) barrels every
  `feature-categories` component — a new component here follows that pattern.
- `RulesStore.createRuleFromCounterparty` ([rules.store.ts:87](../../../src/app/feature-categories/rules.store.ts#L87)) already exists; this ticket's Accept button
  triggers it indirectly via `CategoryModelStore.acceptProposal` (ML-07), not directly.

## Desired result (to-be)

- New `feature-categories/components/rule-proposals/rule-proposals.component.{ts,html}`:
  - Injects `CategoryModelStore` (ML-07).
  - Renders `categoryModelStore.ruleProposals()` as a list: counterparty name, category badge (`mm-badge`),
    `{support} matches · {confidence}% confident`, and Accept/Dismiss (`mm-button`) per row.
  - Accept calls `categoryModelStore.acceptProposal(proposal)`; Dismiss calls
    `categoryModelStore.dismissProposal(proposal)`.
  - Renders nothing (no empty-state clutter) when `ruleProposals()` is empty.
- Embedded at the top of
  [rules-overview.component.html](../../../src/app/feature-categories/components/rules-overview/rules-overview.component.html), added to that component's `imports` and to
  [components/index.ts](../../../src/app/feature-categories/components/index.ts).

## Acceptance criteria

- [ ] The component renders one row per entry in `CategoryModelStore.ruleProposals()`, showing counterparty, category name/badge, support count, and confidence as a whole percent.
- [ ] Accept calls `acceptProposal` with the exact proposal object and, once the store settles, that proposal is removed from the list (a real rule now exists, per ML-07's flow).
- [ ] Dismiss calls `dismissProposal` and removes the entry from the visible list without creating a rule.
- [ ] When there are no proposals, the component renders no visible content (no empty-state card) so the rules page looks unchanged for a user who hasn't trained a model yet.
- [ ] Only `BadgeComponent`/`ButtonComponent` (or other existing shared UI primitives) are used — no raw daisyUI/Tailwind duplicating existing components.
- [ ] Mounted at the top of `rules-overview.component.html`, added to its `imports` array and to `components/index.ts`.
- [ ] Unit tests cover: rendering N proposals with correct fields, Accept delegates to the store with the right argument, Dismiss removes without accepting, empty-list renders nothing extra.
- [ ] Verified live in the browser: after training on categorised data with a strong counterparty pattern, a proposal appears on the rules page; Accept creates a real, visible rule in the list below; Dismiss removes it without creating anything.
- [ ] Verified via the fallow skill and coding-conventions skill.

## Notes

- Independent of ML-08/ML-10 — all three are thin UI consumers of the already-built `CategoryModelStore`
  (ML-07), so they can be built in parallel.
- No new rule-creation logic here — this ticket only calls the store, which itself only calls the existing,
  already-tested `createRuleFromCounterparty`.
