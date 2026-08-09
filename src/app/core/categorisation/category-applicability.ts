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
 * chances to disagree by a day.
 */
export const categoryHasEnded = (category: Category, isoDate: string): boolean =>
  category.activeUntil !== undefined && category.activeUntil < isoDate;

/**
 * Whether a category's window (FR-CAT-9) *covers* `isoDate` — the question every picker asks
 * (TICKET-CAT-11): may this category be offered to a transaction booked on this day?
 *
 * Both bounds are inclusive and both are optional, so a category with neither applies to every date
 * there has ever been. That is the case that keeps this feature invisible for anyone who never
 * opens the range fields, and it is why the absent-bound branches read as `undefined` checks rather
 * than as sentinel dates.
 */
export const categoryAppliesOn = (category: Category, isoDate: string): boolean =>
  (category.activeFrom === undefined || category.activeFrom <= isoDate) &&
  (category.activeUntil === undefined || category.activeUntil >= isoDate);

/**
 * Whether a category's window overlaps `[fromIso, toIso]` at any point — the range counterpart of
 * `categoryAppliesOn`, for the sites picking on behalf of *several* dates at once: the visible
 * rows' span, the selected rows' span, the active date filter (TICKET-CAT-11).
 *
 * Touching at a single day counts as overlapping, matching `categoryAppliesOn`'s inclusive bounds:
 * a category ending exactly on the span's first day still applies on that day, so hiding it would
 * contradict the single-date rule for a span of one.
 */
export const categoryOverlapsRange = (
  category: Category,
  fromIso: string,
  toIso: string,
): boolean =>
  (category.activeFrom === undefined || category.activeFrom <= toIso) &&
  (category.activeUntil === undefined || category.activeUntil >= fromIso);

/** The suffix an out-of-window category carries when a picker keeps offering it (TICKET-CAT-11). */
const ENDED_SUFFIX = ' (ended)';

/**
 * A picker option's label, marked when the category it names has already ended (TICKET-CAT-11).
 *
 * Two callers need it for different reasons and must agree on the wording: a picker keeping an
 * *already-assigned* out-of-window category offerable (a `<select>` whose value is not among its
 * options is a broken control), and the rule form, which is deliberately never filtered — a rule
 * runs over whatever dates the next import contains — but should still say when its target is a
 * category the user has dated the end of.
 */
export const withEndedSuffix = (label: string, category: Category, todayIso: string): string =>
  categoryHasEnded(category, todayIso) ? `${label}${ENDED_SUFFIX}` : label;
