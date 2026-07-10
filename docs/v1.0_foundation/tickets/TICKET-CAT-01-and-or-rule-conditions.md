# TICKET-CAT-01 — AND/OR combinators for rule conditions

- **Area:** Categorisation
- **Traceability:** extends FR-CAT-2

## User story

As a user, I want to combine a rule's conditions with AND/OR instead of an implicit AND across all of them, so one rule can express 'description contains X OR description contains Y' without duplicating rules.

## Description

Allow a rule's conditions to be combined with OR (not only the current implicit AND), so a single rule can match on alternatives without splitting into multiple near-duplicate rules.

## Current situation (as-is)

- [rule-matching.ts](../../../src/app/core/categorisation/rule-matching.ts) — `matchesRule()` is a hard AND: `rule.conditions.length > 0 && rule.conditions.every(condition => conditionMatches(...))`. Every condition must match.
- To express "X OR Y" today the user must create two separate rules, duplicating the action/priority.
- `resolveCategoryForTransaction()` already orders by priority with first-match-wins / `continueOnMatch`; that logic is independent of how a single rule's conditions combine.

## Desired result (to-be)

- A rule declares how its conditions combine — at minimum `all` (AND, current behaviour) vs `any` (OR).
- Existing rules keep behaving as AND (backward compatible default).
- The rule form lets the user pick the combinator; the rule summary reflects it.

## Acceptance criteria

- [x] The `Rule` model gains a combinator field (e.g. `conditionMatch: 'all' | 'any'`) with a **default of `'all'`** so existing rules are unchanged.
- [x] `matchesRule()` honours the combinator: `'all'` → `.every(...)`, `'any'` → `.some(...)`; an empty condition list never matches (preserved).
- [x] Any persistence/schema change for the new field is an **additive** Dexie version bump with an `.upgrade()` backfilling `'all'` onto existing rules (no shipped version block edited).
- [x] The rule form ([rule-form.component](../../../src/app/feature-categories/components/rule-form/rule-form.component.ts)) exposes an AND/OR (all/any) selector; saving persists it.
- [x] The rule summary ([rule-summary.ts](../../../src/app/feature-categories/rule-summary.ts)) renders the chosen combinator (e.g. "matches ANY of…" vs "matches ALL of…").
- [x] Rules run correctly with the combinator on import and on demand re-runs (FR-CAT-3), still never overwriting a manual category (Hard rules).
- [x] Priority ordering and `continueOnMatch` behaviour in `resolveCategoryForTransaction()` are unchanged by this feature.
- [x] Unit tests cover: `any` matches when one of several conditions matches, `all` still requires every condition, empty conditions never match, and existing rules (no field) behave as `all`.

## Notes

- Scope is a single flat combinator across the rule's conditions (AND **or** OR), not nested/mixed boolean groups — that stays out of v1.
