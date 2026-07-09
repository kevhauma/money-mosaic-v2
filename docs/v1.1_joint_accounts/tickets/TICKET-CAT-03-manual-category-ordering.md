# TICKET-CAT-03 — Manual category ordering

- **Area:** Categorisation
- **Type:** Feature
- **Traceability:** extends FR-CAT-1
- **Source story:** user-stories.md §4 — *"As a user, I want to reorder my categories, so the ones I use most often sit at the top of every category picker instead of wherever import or alphabetical order put them."*

## Description

Let the user choose the display order of their categories. Because every category picker in the app reads `CategoriesStore.activeCategories()` directly with no local re-sort, a single ordering change on the categories page should propagate everywhere without touching those other components.

## Current situation (as-is)

- `CategoriesStore` ([categories.store.ts](../../../src/app/feature-categories/categories.store.ts)) populates `categories`/`activeCategories` via `setAllEntities(await categoriesRepository.getAll(), ...)` with no sort; `categories-overview.component.ts` doesn't sort either. Order is Dexie insertion order — seeded `DEFAULT_CATEGORIES` ([app-db.ts](../../../src/app/core/data-access/app-db.ts) lines 241-333) come first, then whatever the user has added since.
- `Category` (`app-db.ts` lines 81-96) has no `sortOrder`/`position` field; schema is `categories: '++id, name, kind, archived'`.
- `categoriesStore.activeCategories()` (today's unsorted order) is read directly, with no local re-sort, by four other pickers: `transaction-edit-form.component.html` (single-transaction category select), `transaction-bulk-bar.component.html` (bulk category assign), `transaction-filters.component.html` (filter dropdown), `rule-form.component.html` (rule action category) — so whatever order the store produces already reaches all four today.

## Desired result (to-be)

- `Category` gains an optional, non-indexed `sortOrder?: number` field — additive, no Dexie version bump.
- `CategoriesStore`'s `categories`/`activeCategories` sort by `sortOrder` ascending, with the same fallback rule as [TICKET-ACC-04](./TICKET-ACC-04-manual-account-ordering.md) (no `sortOrder` yet → stable `id` order, so existing data is unaffected until reordered).
- `categories-overview.component` gets move-up/move-down controls per row/card, persisting via `CategoriesRepository`.
- No changes needed in the four downstream pickers — they already read `activeCategories()` directly and inherit the new order for free.

## Acceptance criteria

- [ ] `Category` gains an optional `sortOrder?: number` field (no Dexie schema version bump).
- [ ] `CategoriesStore` exposes `categories`/`activeCategories` sorted by `sortOrder` ascending, same fallback rule as accounts.
- [ ] `categories-overview.component.html` offers move-up/move-down reordering; persisted through `CategoriesRepository`.
- [ ] The new order is reflected, with no extra per-component work, in: the transaction edit form's category select, the bulk-assign category select, the transaction filters' category dropdown, and the rule form's action category select.
- [ ] Reordering has no effect on rule matching, category `kind`, or any FR-CAT/FR-STAT behaviour — display order only.
- [ ] Unit tests cover the sort computed, mirroring TICKET-ACC-04's approach.
- [ ] `angular.json` bundle budgets are not raised.
- [ ] Verified live in the browser: reordering categories on `/categories` persists on reload and the new order shows up immediately in the transaction edit form's category dropdown.

## Notes

- Keep the reorder interaction (buttons vs. drag) consistent with whatever TICKET-ACC-04 lands on — the app shouldn't have two different reorder patterns for two structurally identical lists.
- Share the sort comparator with TICKET-ACC-04 rather than duplicating it, if a natural shared spot exists.
