import type { Account, Category, Transaction } from '@/core/data-access';
import { normalizeIban } from '@/shared/utils';
import { classifyForStats } from './classify-for-stats';

export type RecurringCadence = 'weekly' | 'monthly' | 'quarterly' | 'yearly';

export type RecurringOccurrence = {
  transactionId: number;
  date: string;
  /** The classified expense amount, always positive — refunds never become occurrences. */
  amount: number;
};

/** A sustained move to a new price level, in either direction (TICKET-REC-04). */
export type RecurringPriceChange = {
  from: number;
  to: number;
  /** The first occurrence at the new level. */
  atDate: string;
};

/**
 * What changed about a series (FR-REC-1 extended, TICKET-REC-04) — computed, never stored, so a
 * fresh import naturally updates or clears them. `overdue` and `stopped` are mutually exclusive by
 * construction: one is the early warning, the other the conclusion.
 */
export type RecurringFlags = {
  priceChange?: RecurringPriceChange;
  /** Past its expected date by more than the grace allowance, but not yet silent long enough to be stopped. */
  overdue?: { expectedDate: string };
  /** Silent for `STOPPED_INTERVALS` whole expected intervals. Carries the last date it did arrive. */
  stopped?: { since: string };
};

export type RecurringPaymentSeries = {
  /**
   * The cluster key plus the band's typical amount — stable across re-derivations of a *given*
   * history, so it is safe as a render key. It is **not** stable across a price change, which moves
   * the band median: nothing downstream should persist it or hang a user override off it.
   */
  key: string;
  label: string;
  /** Present only when the cluster was keyed on an IBAN — the strongest counterparty signal. */
  counterpartyIban?: string;
  /** The category most of the occurrences carry; `null` when the series is mostly uncategorised. */
  categoryId: number | null;
  cadence: RecurringCadence;
  /** Chronological, oldest first. */
  occurrences: RecurringOccurrence[];
  /** Median of the band's amounts — a median, not a mean, so one odd month can't drag it. */
  typicalAmount: number;
  lastDate: string;
  nextExpectedDate: string;
  monthlyEquivalent: number;
  /** The median gap between occurrences, in days — the rhythm's own step, which jitter makes shorter or longer than its nominal cadence. */
  intervalDays: number;
  flags: RecurringFlags;
};

export type RecurringPaymentsResult = { series: RecurringPaymentSeries[] };

/**
 * How far an occurrence's amount may sit from its band's median and still belong to it. Wide enough
 * for a utility bill that wobbles a few euros or a VAT/price tweak on a subscription, narrow enough
 * that a €9.99 subscription and a €40 grocery run at the same merchant can never land in one band.
 */
const AMOUNT_BAND_TOLERANCE = 0.15;

/**
 * Occurrences needed before a rhythm is a rhythm. Two dates define exactly one interval, which is
 * always "regular" — three is the smallest number that can disagree with itself.
 */
const MIN_OCCURRENCES = 3;

/**
 * Days past `nextExpectedDate` before a payment is *late* rather than merely jittery
 * (TICKET-REC-04). Generous on purpose: `CADENCE_BANDS` already tolerates several days of wobble on
 * the way in, a debit due on a Saturday often lands on the Monday, and a false "overdue" on a bill
 * that arrives tomorrow costs more trust than a flag a few days late costs information.
 */
const OVERDUE_GRACE_DAYS = 7;

/**
 * Whole expected intervals of silence after which a series has *stopped* rather than run late
 * (TICKET-REC-04). Two, not one: skipping a single payment is a failed direct debit or a holiday,
 * and the `income-gap-detection` lesson is that one quiet period means nothing. A stopped series
 * keeps its place in the result carrying this flag — a cancelled subscription vanishing from the
 * list is the opposite of announcing itself.
 */
const STOPPED_INTERVALS = 2;

/**
 * How many cadence intervals may separate one price level's last occurrence from the next level's
 * first and still read as the *same* commitment repricing (TICKET-REC-04), rather than two
 * unrelated runs at one merchant. Two, matching `STOPPED_INTERVALS`: a repricing that leaves a
 * longer hole than a stop would is a new commitment, not a new price.
 *
 * The *size* threshold that separates a real step from jitter is `AMOUNT_BAND_TOLERANCE` itself —
 * two amounts closer than it never form separate bands, so a within-tolerance outlier cannot
 * produce a price change however oddly it is placed. That is the whole reason this is detected by
 * merging bands rather than by scanning amounts for a jump.
 */
const PRICE_CHANGE_MAX_GAP_INTERVALS = 2;

/**
 * The largest ratio between two levels that still reads as *the same* commitment repricing rather
 * than two different ones at one merchant (TICKET-REC-04). `AMOUNT_BAND_TOLERANCE` guarantees the
 * levels are at least 15% apart but says nothing about how far apart they can be, so without this
 * a €10 subscription ending as a €40 one began would be reported as a 4× price rise. Tripling is
 * already an extraordinary repricing; beyond it, "two commitments" is the better explanation.
 */
const MAX_PRICE_CHANGE_RATIO = 3;

/**
 * The recognised rhythms, as inclusive day-gap windows around each nominal period. The windows are
 * the jitter tolerance: a monthly debit shifted off a weekend, or moved between the 11th and the
 * 13th, still lands inside `monthly`, while month-length differences (28..31) never push it out.
 * The deliberate gaps between windows (11..23, 39..74, 106..329 days) reject everything that is not
 * one of the four cadences the model has — a fortnightly or four-monthly rhythm is *not* silently
 * rounded into a neighbour, it produces no series at all.
 *
 * `perMonth` converts the cadence to a per-month cost from its **nominal** period rather than the
 * observed gaps, so two identical yearly subscriptions can't report different monthly equivalents
 * because one happened to be paid a day late.
 */
const CADENCE_BANDS: readonly {
  cadence: RecurringCadence;
  minGapDays: number;
  maxGapDays: number;
  perMonth: number;
}[] = [
  { cadence: 'weekly', minGapDays: 5, maxGapDays: 10, perMonth: 365.25 / 7 / 12 },
  { cadence: 'monthly', minGapDays: 24, maxGapDays: 38, perMonth: 1 },
  { cadence: 'quarterly', minGapDays: 75, maxGapDays: 105, perMonth: 1 / 3 },
  { cadence: 'yearly', minGapDays: 330, maxGapDays: 400, perMonth: 1 / 12 },
];

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const parseIsoDate = (isoDate: string): number => Date.parse(`${isoDate}T00:00:00Z`);

const formatIsoDate = (epochMs: number): string => new Date(epochMs).toISOString().slice(0, 10);

const daysBetween = (fromIso: string, toIso: string): number =>
  Math.round((parseIsoDate(toIso) - parseIsoDate(fromIso)) / MS_PER_DAY);

/** `median` for a **non-empty** input already in ascending order — the hot path inside `bandByAmount`. */
const medianOfSorted = (sorted: readonly number[]): number =>
  sorted[Math.floor((sorted.length - 1) / 2)];

/** Lower median of a **non-empty** input, so the value is always one the data actually contains. */
const median = (values: readonly number[]): number =>
  medianOfSorted([...values].sort((a, b) => a - b));

/** Lowercased, whitespace-collapsed — "SPOTIFY  AB" and "Spotify AB" are the same counterparty. */
const normalizeText = (value: string | undefined): string =>
  (value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');

type Candidate = RecurringOccurrence & {
  clusterKey: string;
  counterpartyIban?: string;
  label: string;
  categoryId: number | null;
};

/**
 * Strongest counterparty signal first: a normalized IBAN identifies a payee even when the name is
 * spelled three ways; a name survives banks that don't export IBANs; the raw description is the last
 * resort for a card payment carrying neither.
 */
const clusterIdentity = (
  transaction: Transaction,
): { clusterKey: string; counterpartyIban?: string } => {
  const iban = normalizeIban(transaction.counterpartyIban);
  if (iban) return { clusterKey: `iban:${iban}`, counterpartyIban: iban };

  const name = normalizeText(transaction.counterpartyName);
  if (name) return { clusterKey: `name:${name}` };

  return { clusterKey: `desc:${normalizeText(transaction.rawDescription)}` };
};

const toCandidate = (
  transaction: Transaction,
  amount: number,
  categoryId: number | null,
): Candidate | null => {
  if (transaction.id == null) return null;
  return {
    transactionId: transaction.id,
    date: transaction.bookingDate,
    amount,
    categoryId,
    label: transaction.counterpartyName?.trim() || transaction.rawDescription,
    ...clusterIdentity(transaction),
  };
};

/**
 * Splits one counterparty's occurrences into similar-amount bands, so a merchant hosting both a
 * fixed subscription and variable card spending yields the subscription instead of an average of
 * the two. Greedy over amount order: an occurrence joins the open band while it stays within
 * `AMOUNT_BAND_TOLERANCE` of that band's running median, and otherwise opens the next one. Walking
 * in amount order means the open band is *always* sorted, so its median is an index lookup rather
 * than a re-sort per candidate — which matters for a supermarket carrying hundreds of card payments,
 * since nothing here is cached and the whole detection re-runs on every read.
 */
const bandByAmount = (candidates: readonly Candidate[]): Candidate[][] => {
  const byAmount = [...candidates].sort((a, b) => a.amount - b.amount);
  const bands: Candidate[][] = [];
  let current: Candidate[] = [];

  for (const candidate of byAmount) {
    if (current.length === 0) {
      current = [candidate];
      continue;
    }
    const bandMedian = medianOfSorted(current.map((entry) => entry.amount));
    if (Math.abs(candidate.amount - bandMedian) <= bandMedian * AMOUNT_BAND_TOLERANCE) {
      current.push(candidate);
    } else {
      bands.push(current);
      current = [candidate];
    }
  }
  if (current.length > 0) bands.push(current);

  return bands;
};

/**
 * The rhythm a band's dates keep, or `null` if they keep none. The median gap chooses the band —
 * one holiday-delayed payment can't reclassify a series — but *every* gap must also fit that same
 * window, so "three payments in one week and one a year later" is rejected rather than averaged
 * into a plausible-looking monthly.
 */
const recogniseCadence = (
  dates: readonly string[],
): { cadence: RecurringCadence; medianGapDays: number; perMonth: number } | null => {
  const gaps: number[] = [];
  for (let index = 1; index < dates.length; index++) {
    gaps.push(daysBetween(dates[index - 1], dates[index]));
  }
  if (gaps.length < MIN_OCCURRENCES - 1) return null;

  const medianGapDays = median(gaps);
  const band = CADENCE_BANDS.find(
    ({ minGapDays, maxGapDays }) => medianGapDays >= minGapDays && medianGapDays <= maxGapDays,
  );
  if (!band) return null;
  if (gaps.some((gap) => gap < band.minGapDays || gap > band.maxGapDays)) return null;

  return { cadence: band.cadence, medianGapDays, perMonth: band.perMonth };
};

/** The category most of the band's occurrences carry, ties going to the earliest occurrence. */
const dominantCategoryId = (occurrences: readonly Candidate[]): number | null => {
  const counts = new Map<number | null, number>();
  for (const occurrence of occurrences) {
    counts.set(occurrence.categoryId, (counts.get(occurrence.categoryId) ?? 0) + 1);
  }

  let best = occurrences[0].categoryId;
  let bestCount = 0;
  for (const [categoryId, count] of counts) {
    if (count > bestCount) {
      best = categoryId;
      bestCount = count;
    }
  }
  return best;
};

const toSeries = (band: readonly Candidate[]): RecurringPaymentSeries | null => {
  if (band.length < MIN_OCCURRENCES) return null;

  const occurrences = [...band].sort((a, b) => a.date.localeCompare(b.date));
  const rhythm = recogniseCadence(occurrences.map((occurrence) => occurrence.date));
  if (!rhythm) return null;

  const typicalAmount = median(occurrences.map((occurrence) => occurrence.amount));
  const lastDate = occurrences[occurrences.length - 1].date;
  const { clusterKey, counterpartyIban, label } = occurrences[0];

  return {
    key: `${clusterKey}|${typicalAmount.toFixed(2)}`,
    label,
    ...(counterpartyIban ? { counterpartyIban } : {}),
    categoryId: dominantCategoryId(occurrences),
    cadence: rhythm.cadence,
    occurrences: occurrences.map(({ transactionId, date, amount }) => ({
      transactionId,
      date,
      amount,
    })),
    typicalAmount,
    lastDate,
    nextExpectedDate: formatIsoDate(parseIsoDate(lastDate) + rhythm.medianGapDays * MS_PER_DAY),
    monthlyEquivalent: typicalAmount * rhythm.perMonth,
    intervalDays: rhythm.medianGapDays,
    // Filled by the passes below, once the series is whole and the clock is known.
    flags: {},
  };
};

/**
 * Folds a repriced commitment back into one series (TICKET-REC-04). A €9.99 → €12.99 step is more
 * than `AMOUNT_BAND_TOLERANCE` apart, so `bandByAmount` necessarily put the two levels in separate
 * bands — which is exactly the signal: a *sustained* new level is one that gathered enough
 * occurrences to be a rhythm in its own right. Two same-counterparty, same-cadence series that run
 * back to back, with no more than `PRICE_CHANGE_MAX_GAP_INTERVALS` between the old level's end and
 * the new level's start, are therefore one commitment that changed price.
 *
 * Merging (rather than reporting two series) is what stops the old price showing up as a separate
 * "Stopped" commitment beside the new one, and what lets the panel say what a subscription *was*.
 * The trade-off is stated plainly: a price change only becomes visible once the new level has
 * `MIN_OCCURRENCES` payments behind it — before that the new band is not yet a rhythm, and the
 * series simply reads as overdue, then stopped.
 */
const isRepricingOf = (earlier: RecurringPaymentSeries, later: RecurringPaymentSeries): boolean => {
  const gapDays = daysBetween(earlier.lastDate, later.occurrences[0].date);
  if (gapDays <= 0 || gapDays > earlier.intervalDays * PRICE_CHANGE_MAX_GAP_INTERVALS) return false;

  const ratio = later.typicalAmount / earlier.typicalAmount;
  return Math.max(ratio, 1 / ratio) <= MAX_PRICE_CHANGE_RATIO;
};

/** The two levels folded into one series, the newer owning every forward-looking figure. */
const repriced = (
  earlier: RecurringPaymentSeries,
  later: RecurringPaymentSeries,
): RecurringPaymentSeries => ({
  ...later,
  occurrences: [...earlier.occurrences, ...later.occurrences],
  flags: {
    priceChange: {
      from: earlier.typicalAmount,
      to: later.typicalAmount,
      atDate: later.occurrences[0].date,
    },
  },
});

/** Same counterparty, same cadence — the two things a repricing keeps and the amount does not. */
const byClusterAndCadence = (
  series: readonly RecurringPaymentSeries[],
): Map<string, RecurringPaymentSeries[]> => {
  const groups = new Map<string, RecurringPaymentSeries[]>();
  for (const entry of series) {
    // `key` is `<clusterKey>|<amount>`, and the amount is precisely what is changing here, so it is
    // cut back to the cluster before grouping.
    const clusterKey = entry.key.slice(0, entry.key.lastIndexOf('|'));
    const groupKey = `${clusterKey}|${entry.cadence}`;
    const group = groups.get(groupKey);
    if (group) group.push(entry);
    else groups.set(groupKey, [entry]);
  }
  return groups;
};

const mergePriceChanges = (series: RecurringPaymentSeries[]): RecurringPaymentSeries[] => {
  const merged: RecurringPaymentSeries[] = [];

  for (const group of byClusterAndCadence(series).values()) {
    const chronological = [...group].sort((a, b) =>
      a.occurrences[0].date.localeCompare(b.occurrences[0].date),
    );

    let current = chronological[0];
    for (const next of chronological.slice(1)) {
      if (isRepricingOf(current, next)) {
        current = repriced(current, next);
      } else {
        merged.push(current);
        current = next;
      }
    }
    merged.push(current);
  }

  return merged;
};

/**
 * Whether a series is late, or has stopped altogether (TICKET-REC-04). Measured from `lastDate` and
 * the rhythm's own interval, so a weekly series is called overdue and stopped far sooner than a
 * yearly one — which is the point of measuring in intervals rather than in days.
 */
const timingFlags = (series: RecurringPaymentSeries, todayIso: string): RecurringFlags => {
  const silentDays = daysBetween(series.lastDate, todayIso);

  if (silentDays > series.intervalDays * STOPPED_INTERVALS) {
    return { stopped: { since: series.lastDate } };
  }
  if (daysBetween(series.nextExpectedDate, todayIso) > OVERDUE_GRACE_DAYS) {
    return { overdue: { expectedDate: series.nextExpectedDate } };
  }
  return {};
};

/** The start of the history actually held, so `classifyForStats`' range bound excludes nothing real. */
const earliestBookingDate = (transactions: readonly Transaction[]): string => {
  let earliest = transactions[0].bookingDate;
  for (const transaction of transactions) {
    if (transaction.bookingDate < earliest) earliest = transaction.bookingDate;
  }
  return earliest;
};

/** Every occurrence-worthy expense, grouped under its counterparty's strongest available key. */
const candidatesByCounterparty = (
  transactions: readonly Transaction[],
  categoriesById: ReadonlyMap<number, Category>,
  accountsById: ReadonlyMap<number, Account>,
  from: string,
  to: string,
  ownSavingsIbans: ReadonlySet<string>,
): Map<string, Candidate[]> => {
  const byCluster = new Map<string, Candidate[]>();

  for (const transaction of transactions) {
    const result = classifyForStats(
      transaction,
      from,
      to,
      ownSavingsIbans,
      categoriesById,
      accountsById,
    );
    if (result.kind !== 'expense' || result.amount <= 0) continue;

    const candidate = toCandidate(transaction, result.amount, result.categoryId);
    if (!candidate) continue;

    const cluster = byCluster.get(candidate.clusterKey);
    if (cluster) cluster.push(candidate);
    else byCluster.set(candidate.clusterKey, [candidate]);
  }

  return byCluster;
};

/**
 * The payments that repeat — same counterparty, similar amount, regular rhythm (FR-REC-1,
 * TICKET-REC-01). Pure inference over existing transactions: nothing is persisted, nothing is
 * cached, and the answer is re-derived on every read.
 *
 * **Runs over the whole history it is handed, never a display range.** A one-month range cannot
 * contain three monthly occurrences, so cadence is simply invisible inside one; scoping what the
 * user *sees* to a range is the panel's business (TICKET-REC-02/03), never the detector's.
 * `todayIso` bounds the history's upper end — a transaction booked in the future is not yet
 * evidence of a rhythm — and is a parameter rather than a `Date.now()` call, the
 * `income-gap-detection`/`computeFullHistoryRange` precedent.
 *
 * Every per-transaction decision is delegated to `classifyForStats` (CR3-2.1): only `expense`
 * results with a **positive** amount become occurrences, so linked transfers, savings movements,
 * `nullified` rows, `neutral` categories and co-owner/`notMine` joint legs never reach this logic,
 * and a refund — a negative expense delta — is silently not an occurrence rather than a gap that
 * breaks the series' rhythm. Income cadence is deliberately out of scope: it is FR-INC territory
 * (`detectIncomeGaps` and friends own it at category level).
 *
 * Series come back most-expensive-first by `monthlyEquivalent`, which is the order a "what do my
 * commitments cost me" panel wants and the only order this aggregate has an opinion about.
 *
 * Each carries `flags` (TICKET-REC-04) describing what *changed*: a sustained price step, a payment
 * that is late, or a rhythm that has stopped. A stopped series keeps its place in the result rather
 * than un-detecting itself — a cancelled subscription quietly vanishing is the opposite of the
 * announcement this exists to make.
 */
export const detectRecurringPayments = (
  transactions: Transaction[],
  categoriesById: ReadonlyMap<number, Category>,
  accountsById: ReadonlyMap<number, Account>,
  todayIso: string,
  ownSavingsIbans: ReadonlySet<string> = new Set(),
): RecurringPaymentsResult => {
  if (transactions.length === 0) return { series: [] };

  const byCluster = candidatesByCounterparty(
    transactions,
    categoriesById,
    accountsById,
    earliestBookingDate(transactions),
    todayIso,
    ownSavingsIbans,
  );

  const detected: RecurringPaymentSeries[] = [];
  for (const cluster of byCluster.values()) {
    for (const band of bandByAmount(cluster)) {
      const series = toSeries(band);
      if (series) detected.push(series);
    }
  }

  const series = mergePriceChanges(detected).map((entry) => ({
    ...entry,
    flags: { ...entry.flags, ...timingFlags(entry, todayIso) },
  }));

  return { series: series.sort((a, b) => b.monthlyEquivalent - a.monthlyEquivalent) };
};
