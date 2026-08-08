import type { Category } from '@/core/data-access';

/**
 * Whether a category's applicability window (FR-CAT-9, TICKET-CAT-10) has *closed* by `isoDate`.
 *
 * The bound is **inclusive**, matching the category form's own `from <= until` validation: a
 * category whose `activeUntil` is today still applies today, so it has not ended yet. A category
 * with no `activeUntil` never ends, however old it is.
 *
 * Pure and clock-free — the caller supplies the date. It lives here rather than inside the
 * categories page because TICKET-CAT-11's pickers and TICKET-REC-05's recurring list have to agree
 * with that page about where the boundary falls, and three copies of a date comparison is three
 * chances to disagree by a day. CAT-11 adds the `categoryAppliesOn` counterpart (does the window
 * *cover* a date) alongside this one, when something actually asks the question.
 */
export const categoryHasEnded = (category: Category, isoDate: string): boolean =>
  category.activeUntil !== undefined && category.activeUntil < isoDate;
