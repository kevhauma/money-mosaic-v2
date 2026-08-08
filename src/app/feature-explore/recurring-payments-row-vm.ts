import type { BadgeColor } from '@/shared/ui';

/**
 * One change flag as a row renders it (TICKET-REC-04). `text` carries the whole meaning — colour is
 * never the only signal — and the amounts inside it are already formatted.
 */
export type RecurringFlagBadge = {
  kind: 'priceChange' | 'overdue' | 'stopped';
  text: string;
  color: BadgeColor;
};

/** One occurrence as a series' expansion renders it — the evidence behind the detection. */
export type RecurringOccurrenceRow = {
  transactionId: number;
  date: string;
  amount: string;
};

/**
 * A detected recurring series with every display fact already resolved — colours, labels, icons,
 * accessible names and formatted figures are plain fields, so the template branches on state
 * instead of deriving it (the `transaction-row-vm.ts` precedent).
 */
export type RecurringSeriesRow = {
  key: string;
  label: string;
  categoryName: string;
  categoryColor: string;
  cadence: string;
  typicalAmount: string;
  lastDate: string;
  nextExpectedDate: string;
  monthlyEquivalent: string;
  occurrenceCount: number;
  occurrences: RecurringOccurrenceRow[];
  expanded: boolean;
  /** The disclosure triangle's glyph for the current state. */
  expandIcon: string;
  /** What a screen reader hears on the disclosure button — it has to name the row, not just "expand". */
  toggleAriaLabel: string;
  /** Empty for a series with nothing to report (TICKET-REC-04). */
  badges: RecurringFlagBadge[];
  /** A stopped series is listed under its own heading rather than among live commitments. */
  stopped: boolean;
};
