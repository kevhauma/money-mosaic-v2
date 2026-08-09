import type { Transaction } from '@/core/data-access';

/**
 * A category rendered as one `<option>` — value and label pre-stringified by whoever owns the list,
 * not derived per option per render (TICKET-TXN-09's "templates branch on state" rule).
 *
 * Lives in the feature root rather than on `app-category-select-cell` because five components now
 * speak it (the cell, the row that hosts it, the page that builds the list, the edit form and the
 * bulk bar), and a sibling importing a type through another component's file is how a feature grows
 * an accidental import graph.
 */
export type CategorySelectOption = {
  value: string;
  label: string;
};

/** An inclusive `[from, to]` pair of ISO dates. `null` stands for "no rows, so no span at all". */
export type BookingDateSpan = { from: string; to: string };

/**
 * The booking-date span a set of rows covers (TICKET-CAT-11) — what the category pickers that serve
 * *several* transactions at once (the inline quick-set over the visible page, the bulk bar over the
 * selection) compare a category's applicability window against.
 *
 * Scans rather than trusting the table's sort: the same span is asked of the selection, which is
 * built from click order and is not sorted by anything. One pass over at most a page of rows.
 */
export const bookingDateSpan = (transactions: readonly Transaction[]): BookingDateSpan | null => {
  if (transactions.length === 0) return null;

  let from = transactions[0].bookingDate;
  let to = transactions[0].bookingDate;
  for (const transaction of transactions) {
    if (transaction.bookingDate < from) from = transaction.bookingDate;
    if (transaction.bookingDate > to) to = transaction.bookingDate;
  }

  return { from, to };
};
