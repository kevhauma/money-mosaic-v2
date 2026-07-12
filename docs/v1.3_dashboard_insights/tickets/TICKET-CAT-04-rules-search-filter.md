# TICKET-CAT-04 — Search and filter on the Rules screen

- **Area:** Categorisation
- **Type:** Feature
- **Traceability:** extends FR-CAT-2

## User story

As a user with many categorisation rules, I want to search and filter the Rules list, so I can find a specific rule without scrolling through the whole priority-ordered table.

## Description

The Rules screen ([rules-overview.component.html](../../../src/app/feature-categories/components/rules-overview/rules-overview.component.html)) renders every rule in one flat, unfiltered table. Once the list grows past a screen's worth, finding a rule by name, matched category, or enabled state means scanning the whole thing manually. This ticket adds a simple text search plus category/enabled filters, mirroring the pattern already used on the Transactions screen.

## Current situation (as-is)

- [rules-overview.component.html:44-127](../../../src/app/feature-categories/components/rules-overview/rules-overview.component.html) renders `rulesStore.rulesByPriority()` directly into the table with no search box and no filter controls.
- [rules-overview.component.ts](../../../src/app/feature-categories/components/rules-overview/rules-overview.component.ts) has no filter state at all — every row from the store is shown.
- The Transactions screen already has the shape to copy: a pure predicate function ([transaction-filters.ts](../../../src/app/feature-transactions/transaction-filters.ts) `matchesTransactionFilters`) kept separate from the component/store so it's unit-testable on its own, plus a filter bar component ([transaction-filters.component.html](../../../src/app/feature-transactions/components/transaction-filters/transaction-filters.component.html)) with a text search field and dropdowns.
- `describeRule()` ([rule-summary.ts](../../../src/app/feature-categories/rule-summary.ts)) already produces the human-readable condition summary shown per row — reusable as part of the search haystack.

## Desired result (to-be)

- A small filter bar above the rules table with:
  - A text search box matching against the rule's `name` and its condition summary (via `describeRule`), case-insensitive substring match.
  - A category dropdown (reusing `CategoriesStore`) filtering to rules whose `action.setCategoryId` matches.
  - An enabled/disabled toggle or dropdown (`all` / `enabled only` / `disabled only`).
- Filtering happens client-side over `rulesStore.rulesByPriority()` (rule counts are small; no need for a store-level query) via a new pure predicate function, mirroring `matchesTransactionFilters`.
- Filtered-out rules are hidden from the table; priority-based reordering (`moveRule`) still operates on the full, unfiltered list underneath — filtering must not corrupt priority ordering or make "move up/down" jump across hidden rows in a confusing way (either disable reordering while a filter is active, or keep it scoped to the filtered view — pick one and state it explicitly in the component).
- Clearing all filters returns to today's full, unfiltered view.
- Empty-state message when a filter matches zero rules, distinct from the existing "no rules yet" empty state.

## Acceptance criteria

- [ ] A new pure predicate (e.g. `matchesRuleFilters`) lives alongside `rule-summary.ts` in `feature-categories/`, is unit-tested independently of the component/store, and takes the same shape of inputs as `matchesTransactionFilters` (rule + filter state).
- [ ] Filter bar UI added above the rules table: text search, category dropdown, enabled/disabled filter — styled consistently with the existing `transaction-filters` component (daisyUI form controls, same spacing conventions).
- [ ] Search matches on rule `name` and the `describeRule()` condition summary, case-insensitive.
- [ ] Category filter matches `action.setCategoryId`; enabled filter matches `rule.enabled`.
- [ ] `moveRule` (up/down reordering) behaviour while a filter is active is explicitly decided and documented in the component (either disabled during filtering, or correctly scoped) — not left as an accidental side effect.
- [ ] A distinct empty state renders when filters produce zero matches (e.g. "No rules match your search"), separate from the existing zero-rules empty state.
- [ ] No new Dexie table or repository method — this is a client-side, in-memory filter over already-hydrated rules.
- [ ] Unit tests cover: text search matches name; text search matches condition summary; category filter isolates rules for one category; enabled filter isolates enabled-only and disabled-only; combined filters (text + category + enabled) all apply together (AND, not OR); empty-result state.
- [ ] `angular.json` bundle budgets are not raised.
- [ ] Verified via the fallow skill and coding-conventions skill.
- [ ] Verified live in the browser: typing a search term narrows the rules table live, selecting a category/enabled filter narrows it further, clearing filters restores the full list, and reordering behaves as documented while filtered.

## Notes

- Keep this "simple" per the ask — no saved filter presets, no server-side/store-level query, no URL query-param sync (unlike Transactions' filters, which are heavier because that list can be large and paginated). If usage later shows a need for those, ticket separately rather than scope-creeping this one.
