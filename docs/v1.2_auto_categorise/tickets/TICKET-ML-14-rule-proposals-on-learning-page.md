# TICKET-ML-14 — Rule-proposal inbox moved to the Learning page

- **Area:** Auto-categorisation
- **Type:** Refactor
- **Traceability:** relocates FR-ML-9

## User story

As a user, I want the model's rule proposals in the same place as its other suggestions, so I review
everything the auto-categoriser has learned in one page instead of hopping to the rules page for one piece
of it.

## Description

Relocates `RuleProposalsComponent` from the rules page to the Learning page (ML-11), in its own section, per
the feedback that "the rule suggestion usage is fine, but will need to be moved."

## Current situation (as-is)

- [rule-proposals.component.ts](../../../src/app/feature-categories/components/rule-proposals/rule-proposals.component.ts)
  (`RuleProposalsComponent`, selector `app-rule-proposals`) is mounted at
  [rules-overview.component.html:19](../../../src/app/feature-categories/components/rules-overview/rules-overview.component.html#L19),
  above the tab strip and rule table. It injects `CategoryModelStore`, `CategoriesStore` (relative sibling
  imports, `../../categories.store` / `../../category-model.store`), and `TransactionsStore` (via the
  `@/feature-transactions` barrel), and renders `ruleProposals()` as an expandable list with Accept/Dismiss
  per proposal.
- `rules-overview.component.ts`'s `imports` array includes `RuleProposalsComponent`;
  `feature-categories/components/index.ts` re-exports it alongside the page's other components.
- No behavioural issues were raised with the component itself — the feedback file explicitly says "the rule
  suggestion usage is fine" — only its current page placement.

## Desired result (to-be)

- `RuleProposalsComponent` (and its spec) physically relocate from
  `feature-categories/components/rule-proposals/` to `feature-learning/components/rule-proposals/`,
  importing `CategoryModelStore`/`CategoriesStore` from the `@/feature-categories` barrel and
  `TransactionsStore` from `@/feature-transactions` (both already barrel imports or trivially converted from
  the relative ones) instead of relative sibling paths.
- `<app-rule-proposals />` is removed from `rules-overview.component.html` and that component's `imports`
  array and from `feature-categories/components/index.ts`; it's added to `learning-overview.component.html`
  (ML-11), that component's `imports`, and `feature-learning/components/index.ts`.
- Placed in its own labelled section on the Learning page (e.g. under a "Rule proposals" heading), separate
  from ML-12's status panel and ML-13's suggestions table — per the feedback's "different section or tab"
  note, a simple stacked section is sufficient; a tabbed layout is not required unless the page feels
  crowded once ML-12/13/14 are all mounted.
- No change to the component's internal behaviour, template, or logic — this is a pure relocation.

## Acceptance criteria

- [x] `RuleProposalsComponent` no longer renders on `/categories/rules`; it renders on `/learning` instead,
      in its own section.
- [x] All of ML-09's original acceptance criteria still hold unmodified at the new location: one row per
      `ruleProposals()` entry with counterparty/category/support/confidence; Accept calls `acceptProposal`
      and removes the entry once a real rule exists; Dismiss calls `dismissProposal` and removes the entry
      without creating a rule; empty list renders no visible content.
- [x] `CategoryModelStore`/`CategoriesStore` are injected via the `@/feature-categories` barrel from the
      component's new location, not a relative path reaching back into `feature-categories`.
- [x] `rules-overview.component.html`/`.ts` no longer reference `RuleProposalsComponent` anywhere —
      `grep -n "RuleProposals\|app-rule-proposals" src/app/feature-categories/components/rules-overview`
      returns no matches.
- [x] `feature-categories/components/index.ts` no longer exports `rule-proposals`; `feature-learning/components/index.ts` does.
- [x] Unit tests (moved unmodified, only import paths updated) still pass at the new location.
- [x] Verified live in the browser: `/categories/rules` no longer shows the proposal inbox; `/learning`
      shows it in its own section; after training on data with a strong counterparty pattern, a proposal
      appears there; Accept creates a real rule visible on `/categories/rules`; Dismiss removes it without
      creating anything.
- [x] Verified via the fallow skill and coding-conventions skill.

## Notes

- Needs ML-11 (the `/learning` shell to mount into). Independent of ML-12/ML-13 — all relocate/build
  distinct pieces of `/learning`'s content and can ship in parallel once ML-11 lands.
- Pure relocation, unlike ML-12 (which also expands the component) and ML-13 (which is new UI) — lowest-risk
  of the three, since no acceptance-criteria behaviour changes, only where it's mounted and how its
  dependencies are imported.
