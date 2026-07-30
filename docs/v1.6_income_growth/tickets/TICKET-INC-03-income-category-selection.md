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
- **A direct precedent now exists** that didn't when this ticket was written: TICKET-STAT-04's category-exclusion control on the dashboard — [category-comparison-panel.component.html](../../../src/app/feature-dashboard/components/category-comparison-panel/category-comparison-panel.component.html) renders an `mm-dropdown` of `mm-label` + native `<input type="checkbox" class="checkbox checkbox-sm">` rows, backed by [category-comparison-settings.store.ts](../../../src/app/feature-dashboard/category-comparison-settings.store.ts) → `categoryComparisonSettings` (a Dexie-persisted `excludedCategoryIds: number[]`). Reuse that markup shape rather than inventing a second one.
- Still no `mm-checkbox` primitive — the checkbox above is raw daisyUI inside a feature template, which the coding-conventions skill permits (the "no raw daisyUI classes" rule applies to what `shared/ui/` primitives expose to *callers*, not to feature templates). This filter would be the second copy of that markup; a third would justify extracting `mm-checkbox`.

## Desired result (to-be)

- `IncomeStore` gains `selectedIncomeCategoryIds` state (`Set<number>`, ephemeral — not Dexie-backed, same pattern as `RangeStore`), initialised to every `incomeCategories()` id and kept in sync whenever a new income category appears (so a newly created one is included by default). See Notes — persisting it is now a cheap, precedented alternative and worth a decision before this ticket is built.
- `toggleIncomeCategory(id: number)` method flips membership.
- New component `components/income-category-filter/income-category-filter.component.{ts,html}` — a checkbox per income category (name + colour swatch, reusing `mm-badge` for the swatch, and `mm-label`/`mm-dropdown` as in the comparison panel), mounted above the trend chart (FR-INC-2).
- Every later FR-INC aggregate call (FR-INC-2, 04, 05, 08, 09, 11) is passed `incomeStore.selectedIncomeCategoryIds()` rather than "all income categories."

## Acceptance criteria

- [ ] Deselecting a category immediately removes it from the trend chart (FR-INC-2) and any growth/ratio figures already wired up.
- [ ] A newly added `kind: 'income'` category defaults to selected (visible without extra action).
- [ ] Archiving a category removes it from the filter list (reuses `activeCategories`, consistent with the rest of the app never showing archived categories in pickers).
- [ ] Reuses `mm-badge`/`mm-label`/`mm-dropdown` and the `category-comparison-panel` checkbox markup rather than re-authoring a new picker pattern; no daisyUI classes are exposed as `input()`s on any component this ticket adds.
- [ ] Verified live in the browser: unchecking "Other Income" removes its line from the chart and its contribution from any visible total.

## Notes

- **Open decision (was settled when this ticket was written, reopened by what shipped since):** the original call was ephemeral selection (resets on reload), matching `RangeStore`. Since then `categoryComparisonSettings` (dashboard exclusions) and the `appSettings` singleton table (schema v12) both shipped, so persisting is now a small, precedented change rather than a new pattern — and an exclusion the user re-picks on every reload is more annoying here than on the dashboard, since the whole page is parameterised by it. Decide before building; if persisted, it needs its own settings row/repository like `categoryComparisonSettings`, which adds a schema version alongside FR-INC-10's.
