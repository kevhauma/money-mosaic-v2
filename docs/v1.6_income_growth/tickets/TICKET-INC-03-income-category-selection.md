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

> **Implementation notes (2026-07-30), superseding two details of the to-be above:**
> 1. **The selection is persisted, not ephemeral.** The open decision in Notes was settled in favour
>    of persisting: it lives as a new optional `excludedIncomeCategoryIds` field on the existing
>    `appSettings` singleton (schema **v12**, already shipped), so it needed **no new table and no
>    Dexie version bump** — `.stores()` declares indexes, not fields, the same reason
>    `Category.sortOrder` needed none.
> 2. **What's stored is the *exclusion* list, not the selection.** `IncomeStore`'s public API is
>    still `selectedIncomeCategoryIds()` / `toggleIncomeCategory(id)` exactly as the to-be
>    specifies, but it derives that set subtractively (`incomeCategories()` minus the persisted
>    exclusions). That's what makes criterion 2 below true with no sync effect keeping a stored
>    selection in step with the category list, and it mirrors
>    `CategoryComparisonSettings.excludedCategoryIds`.

- [x] Deselecting a category immediately removes it from the trend chart (FR-INC-2) and any growth/ratio figures already wired up. (`income.store.spec.ts` → "toggleIncomeCategory deselects a selected category, persisting the exclusion"; `income-category-filter.component.spec.ts` → "unchecking a row persists the exclusion through the store"; observed live, see the last criterion.)
- [x] A newly added `kind: 'income'` category defaults to selected (visible without extra action). (`income.store.spec.ts` → "defaults a newly added income category to selected without any extra action" — adds a category through `CategoriesStore.addCategory` and asserts it lands in the selection. Free consequence of storing exclusions rather than the selection.)
- [x] Archiving a category removes it from the filter list (reuses `activeCategories`, consistent with the rest of the app never showing archived categories in pickers). (`income.store.spec.ts` → "drops an archived category from the selection, since it derives from incomeCategories"; `income-category-filter.component.spec.ts` → "omits archived income categories". A companion case, "keeps an archived category's exclusion", covers the flip side: un-archiving does not silently re-select.)
- [x] Reuses `mm-badge`/`mm-label`/`mm-dropdown` and the `category-comparison-panel` checkbox markup rather than re-authoring a new picker pattern; no daisyUI classes are exposed as `input()`s on any component this ticket adds. ([income-category-filter.component.html](../../../src/app/feature-income/components/income-category-filter/income-category-filter.component.html) — same `mm-dropdown` > `<li>` > `mm-label as="label"` > `input.checkbox.checkbox-sm` shape as [category-comparison-panel.component.html](../../../src/app/feature-dashboard/components/category-comparison-panel/category-comparison-panel.component.html), plus `mm-badge` for the colour swatch. The component's only inputs are none — it reads `IncomeStore` directly; the swatch colour goes through `mm-badge`'s existing `style` passthrough, pre-assembled on the row VM so the template does no string building. This is now the **second** copy of that checkbox markup, so per the as-is note an `mm-checkbox` primitive is still not warranted — a third copy would justify it.)
- [x] Verified live in the browser: unchecking "Other Income" removes its line from the chart and its contribution from any visible total. (Dev server on :4210, `/income`, seeded data. Before: trigger read "Income categories (2/2)", chart `getOption()` reported `series: [Salary #34D399, Other Income #2DD4BF]`. After clicking the "Other Income" checkbox: trigger read "(1/2)", `series: [Salary]` and `legend.data: ["Salary"]` — Salary's own 4 non-zero buckets unchanged. Survived a full page reload as "(1/2)" with `checkboxes: [true, false]`, confirming the persistence decision above; re-checking restored 2/2.)

## Notes

- **2026-08-01:** `IncomeCategoryFilterComponent`'s *mounting location* moves under TICKET-INC-04 —
  from its own `mm-dropdown` beside the trend chart into a shared "Income settings" popup that also
  hosts the career start date control (TICKET-INC-12) and a new bonus-category smoothing checklist.
  Nothing in this ticket's state, store methods, or the component's internal template changes; only
  where it's mounted on the page. This ticket's acceptance criteria and the browser verification
  above still describe the underlying behaviour accurately.
- ~~**Open decision (was settled when this ticket was written, reopened by what shipped since):**~~ **Resolved 2026-07-30 — persist.** The original call was ephemeral selection (resets on reload), matching `RangeStore`. Since then `categoryComparisonSettings` (dashboard exclusions) and the `appSettings` singleton table (schema v12) both shipped, so persisting is now a small, precedented change rather than a new pattern — and an exclusion the user re-picks on every reload is more annoying here than on the dashboard, since the whole page is parameterised by it. The one part of this note that turned out not to hold: it did **not** need its own settings row/repository or a schema version. An additive optional field on the already-shipped `appSettings` row was enough, because Dexie's `.stores()` only declares indexes — so FR-INC-10's `salaryMetadata` table remains the only schema bump v1.6 needs.
