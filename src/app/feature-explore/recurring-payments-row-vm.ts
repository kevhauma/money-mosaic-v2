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
};
