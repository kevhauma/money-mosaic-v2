import type { TextColor, TextWeight } from '@/shared/ui';

/** One expected payment as either view renders it — the label and a pre-formatted amount. */
export type BillEntry = {
  seriesKey: string;
  label: string;
  amount: string;
};

/**
 * One cell of the month grid. Cells outside the visible month are still real days (the grid is
 * always whole weeks), just dimmed — `inMonth` is what the template branches on.
 */
export type CalendarDayCell = {
  date: string;
  /** Day of the month as text, since that is all the cell shows. */
  dayLabel: string;
  inMonth: boolean;
  isToday: boolean;
  /** The entries this cell actually renders — at most `MAX_VISIBLE_PER_DAY` of them. */
  entries: BillEntry[];
  /** `''` when nothing is hidden; the template branches on emptiness rather than on a count. */
  moreLabel: string;
  /**
   * Every entry on the day as one string, for the cell's `title` — so a collapsed day is still
   * readable. **Amount-free under privacy mode**: a native tooltip is painted by the browser
   * outside the `mm-privacy-blur` box, so a figure left in here would survive the blur (TICKET-PRIV-01).
   */
  fullDayTitle: string;
};

/** One day of the list view: a heading plus the payments expected under it. Empty days never appear. */
export type BillListDay = {
  date: string;
  dateLabel: string;
  /** Today's heading stands out — resolved as `mm-text` inputs rather than a ternary in the binding. */
  headingWeight: TextWeight;
  headingColor: TextColor;
  entries: BillEntry[];
};

/** One row of the calendar view's visually-hidden table (TICKET-STAT-20) — a grid is not a data table. */
export type BillAccessibleRow = {
  dateLabel: string;
  label: string;
  /** Already `HIDDEN_AMOUNT` under privacy mode: an `sr-only` table is read aloud, so a figure has to be withheld rather than blurred. */
  amount: string;
};
