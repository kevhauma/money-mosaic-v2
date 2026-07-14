/**
 * Inclusive cutoff date (`YYYY-MM-DD`) for a "last N years" training window, computed relative to
 * `now` rather than stored as a fixed date (TICKET-ML-17) — so the window always means "the last N
 * years from today", not a date that goes stale as time passes.
 */
export function trainingWindowCutoffDate(years: number, now: Date = new Date()): string {
  const cutoff = new Date(now);
  cutoff.setFullYear(cutoff.getFullYear() - years);
  // Built from local date parts rather than `toISOString()` (UTC) — near local midnight in a
  // timezone behind UTC, a UTC conversion could shift the cutoff by a day either side.
  const year = cutoff.getFullYear();
  const month = String(cutoff.getMonth() + 1).padStart(2, '0');
  const day = String(cutoff.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * True when `bookingDate` falls within the training window, or when `trainingWindowYears` is
 * `null` (unrestricted — matches the pre-ML-17 all-history behaviour exactly).
 */
export function isWithinTrainingWindow(
  bookingDate: string,
  trainingWindowYears: number | null,
  now: Date = new Date(),
): boolean {
  if (trainingWindowYears == null) return true;
  return bookingDate >= trainingWindowCutoffDate(trainingWindowYears, now);
}
