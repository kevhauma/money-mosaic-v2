import type { Category } from '@/core/data-access';

/**
 * One selectable income-category row on the Income settings page. Three consumers, and `checked`
 * means whatever that list selects: ticked in the "counts toward growth" list (FR-INC-3) and the
 * "annual lump sum" list (FR-INC-4), and — for the single-select main-category radios
 * (TICKET-INC-19) — "this is the one".
 */
export type SelectableIncomeCategoryVm = {
  id: number;
  name: string;
  /** Pre-assembled so the template only reads a field — the category colour is a stored hex, not a theme token, so it can only reach the swatch as an inline style. */
  swatchStyle: string;
  checked: boolean;
};

/**
 * Projects income categories into checklist rows against a set of ticked ids. Shared by the two
 * checklists in the Income settings popup, which differ only in which categories they list and
 * which id set decides the tick.
 */
export const toSelectableIncomeCategories = (
  categories: Category[],
  checkedIds: ReadonlySet<number>,
): SelectableIncomeCategoryVm[] =>
  categories.map((category) => ({
    id: category.id!,
    name: category.name,
    swatchStyle: `background-color: ${category.color}; border-color: ${category.color}`,
    checked: checkedIds.has(category.id!),
  }));
