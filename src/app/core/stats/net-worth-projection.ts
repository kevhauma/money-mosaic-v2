import { formatIsoDate, parseIsoDate } from '@/shared/utils';

/** One month of the projected balance, and what (if anything) is bought that month. */
export type NetWorthProjectionPoint = {
  /** `YYYY-MM` — the same month-bucket format every other chart in the app uses. */
  bucketKey: string;
  /** Month-end date this point represents. Month 0 is `today` itself, not a month-end. */
  date: string;
  /** Balance after that month's saving and after any purchase made in it. */
  balance: number;
  /** Goals bought in this month, in funding order. Usually empty, occasionally more than one. */
  purchases: { goalId: number; name: string; amount: number }[];
};

/** A purchase the projection should knock out of the balance, on a date the caller decides. */
export type ProjectedPurchase = {
  goalId: number;
  name: string;
  amount: number;
  /** Month-end (or any date): the purchase lands in whichever month contains it. */
  on: string;
};

/** Purchases keyed by the `YYYY-MM` they land in, so two in one month step the line down once. */
const groupByMonth = (purchases: ProjectedPurchase[]): Map<string, ProjectedPurchase[]> => {
  const byMonth = new Map<string, ProjectedPurchase[]>();
  for (const purchase of purchases) {
    const key = purchase.on.slice(0, 7);
    byMonth.set(key, [...(byMonth.get(key) ?? []), purchase]);
  }
  return byMonth;
};

/**
 * Month 0 is `today` exactly — so this series and the Dashboard's stat card agree on day zero by
 * construction rather than by coincidence. Every later point is that month's real end.
 */
const pointDate = (today: string, month: number): string => {
  if (month === 0) return today;
  const start = parseIsoDate(today);
  return formatIsoDate(
    new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + month + 1, 0)),
  );
};

const totalOf = (purchases: ProjectedPurchase[]): number =>
  purchases.reduce((sum, purchase) => sum + purchase.amount, 0);

/** Month 0 is the balance as it stands today; every later month has earned the rate first. */
const gainAt = (month: number, perMonth: number): number => (month === 0 ? 0 : perMonth);

/**
 * The projected-net-worth series (FR-FUT-5, TICKET-FUT-07) — today's balance walked forward a month
 * at a time and stepped **down** each time a goal is actually bought.
 *
 * The step-downs are the point. "When can I afford it" and "what am I left with afterwards" are the
 * two halves of one question, and a line that only ever rose would answer the first while quietly
 * flattering the second.
 *
 * **Deliberately parameterised on rate and purchase dates** rather than reading FUT-05's own
 * `perMonth`/`affordableOn` (TICKET-FUT-07's Notes): TICKET-FUT-09 draws the same shape at the
 * *required* rate stepping down on each goal's *wanted-by* date, so it is a second caller here
 * rather than a second projection.
 *
 * Straight-line by construction: no compounding, no inflation, no interest, no known upcoming
 * bills. Clock-free — `today` is a parameter.
 */
export const computeNetWorthProjection = (options: {
  today: string;
  startingBalance: number;
  perMonth: number;
  purchases: ProjectedPurchase[];
  /** Months to draw, not counting month 0. */
  horizonMonths: number;
}): NetWorthProjectionPoint[] => {
  const { today, startingBalance, perMonth, purchases, horizonMonths } = options;
  const purchasesByMonth = groupByMonth(purchases);

  const points: NetWorthProjectionPoint[] = [];
  let balance = startingBalance;

  for (let month = 0; month <= horizonMonths; month++) {
    const date = pointDate(today, month);
    const bucketKey = date.slice(0, 7);
    const monthPurchases = purchasesByMonth.get(bucketKey) ?? [];

    balance += gainAt(month, perMonth) - totalOf(monthPurchases);

    points.push({
      bucketKey,
      date,
      balance,
      purchases: monthPurchases.map(({ goalId, name, amount }) => ({ goalId, name, amount })),
    });
  }

  return points;
};
