import type { BadgeColor, BadgeVariant } from '@/shared/ui';

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
  /**
   * A stopped series is listed under its own heading rather than among live commitments — all this
   * row still carries of TICKET-REC-04's flags, now that the Status column and its badges have been
   * removed (2026-08-09). `overdue` still reaches the user through the bills calendar;
   * `priceChange` is shown nowhere.
   */
  stopped: boolean;
  /**
   * How far to trust this detection (TICKET-REC-11), as the row renders it. Shown on **every** row,
   * not only the weak ones: a marker that appears solely when something is wrong teaches the reader
   * that its absence means nothing, and the review's complaint was precisely that a weak match was
   * presented exactly like a strong one.
   */
  confidenceLabel: string;
  confidenceColor: BadgeColor | undefined;
  confidenceVariant: BadgeVariant;
  /** The hover/accessible sentence naming what weakened it; the label alone on a strong match. */
  confidenceTitle: string;
  /** Names the row, so the dismiss control is unambiguous with fifty of them on the page. */
  dismissAriaLabel: string;
  /**
   * The override to remove to undo a user merge on this row, or `null` when the row was not merged.
   * A merge is as reversible as a dismissal, or the page has only moved the trap (TICKET-REC-11).
   */
  mergeOverrideId: number | null;
  unmergeAriaLabel: string;
};
