/**
 * The career start date (FR-INC-12, TICKET-INC-12): where the user's *working life* began, as
 * opposed to where their imported bank history happens to begin. Pure helpers shared by
 * `IncomeStore` (which clamps the page's span with them) and the control that sets the date
 * (which validates with them) — feature-root rather than inside either, so neither has to import
 * through the other.
 */
import type { DateRange } from '@/core/stats';

/**
 * Narrows a span's start to the career start date. Deliberately one-directional: a career start
 * *before* the data begins leaves the range alone, because the setting anchors the growth story to
 * a date the user has lived — it can't invent history the data doesn't have. `to` is never touched.
 *
 * ISO `YYYY-MM-DD` compares correctly as a string, which is why the whole app dates this way.
 */
export const clampRangeToCareerStart = (range: DateRange, careerStartDate?: string): DateRange =>
  careerStartDate && careerStartDate > range.from ? { ...range, from: careerStartDate } : range;

/** Why a candidate career start date can't be accepted, or `null` when it can. */
export type CareerStartDateRejection = string | null;

/**
 * Rejects a candidate career start date the Income page couldn't render anything for. Two ways to
 * get that wrong, and they deserve different wording: a date that hasn't happened yet, and one
 * that has but sits past the last transaction (a real date, but every income bucket after it is
 * empty). An empty value is *not* a rejection — that's how the user clears the setting.
 *
 * `latestTransactionDate` is `undefined` for a user with no transactions at all; today is then the
 * only bound left to check against.
 */
export const validateCareerStartDate = (
  value: string,
  todayIso: string,
  latestTransactionDate?: string,
): CareerStartDateRejection => {
  if (!value) return null;

  // Two upper bounds, narrowest last; the first one the date is past supplies the message.
  const bounds = [
    {
      latest: todayIso,
      reason: "That date hasn't happened yet — a career start date has to be one you've lived.",
    },
    {
      latest: latestTransactionDate,
      reason: "That's after your most recent transaction, so there'd be no income left to show.",
    },
  ];

  return bounds.find((bound) => bound.latest && value > bound.latest)?.reason ?? null;
};
