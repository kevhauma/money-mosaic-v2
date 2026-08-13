/** One row of the projection chart's `sr-only` figure table (TICKET-STAT-20). */
export type ProjectionAccessibleRow = {
  month: string;
  balance: string;
  /** `''` outside required-rate mode, where there is only one series to report. */
  comparison: string;
  bought: string;
};
