# TICKET-INC-03 — Income category selection control

- **Area:** Income
- **Type:** Feature
- **Traceability:** adds FR-INC-3 (new)

## User story

As a user, I want to choose which income categories count toward 'my income growth' (default: all `kind: 'income'` categories), so a one-off gift or refund I don't consider real income doesn't distort my growth trend or my gross/net ratio.

## Description

Lets the user choose which income categories feed the growth view, so a noisy one-off category doesn't distort the trend without the user's say-so.

## Current situation (as-is)

- No selection concept exists for income categories; [category-breakdown.ts](../../../src/app/core/stats/category-breakdown.ts) always includes every `kind: 'income'` category.
- `shared/ui/select` and `shared/ui/badge` exist as daisyUI-wrapped primitives; no multi-select checkbox-group primitive exists yet (existing category pickers use a single `mm-select` for one-value fields like `kind`).

## Desired result (to-be)

- `IncomeStore` gains `selectedIncomeCategoryIds` state (`Set<number>`, ephemeral — not Dexie-backed, same pattern as `RangeStore`), initialised to every `incomeCategories()` id and kept in sync whenever a new income category appears (so a newly created one is included by default).
- `toggleIncomeCategory(id: number)` method flips membership.
- New component `components/income-category-filter/income-category-filter.component.{ts,html}` — a checkbox per income category (name + colour swatch, reusing `mm-badge` for the swatch), mounted above the trend chart (FR-INC-2).
- Every later FR-INC aggregate call (FR-INC-2, 04, 05, 08, 09, 11) is passed `incomeStore.selectedIncomeCategoryIds()` rather than "all income categories."

## Acceptance criteria

- [ ] Deselecting a category immediately removes it from the trend chart (FR-INC-2) and any growth/ratio figures already wired up.
- [ ] A newly added `kind: 'income'` category defaults to selected (visible without extra action).
- [ ] Archiving a category removes it from the filter list (reuses `activeCategories`, consistent with the rest of the app never showing archived categories in pickers).
- [ ] No raw daisyUI classes in the new component — uses `mm-badge`/existing primitives per the coding-conventions skill.
- [ ] Verified live in the browser: unchecking "Other Income" removes its line from the chart and its contribution from any visible total.

## Notes

- Selection is intentionally ephemeral (resets on reload), matching `RangeStore`'s precedent. Persisting the choice (e.g. to a settings table) is a reasonable v1.5 follow-up, not blocking this ticket.
