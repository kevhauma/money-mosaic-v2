import type { Account, Category, Transaction } from '@/core/data-access';
import { categoryHasEnded } from '@/core/categorisation';
import { normalizeIban } from '@/shared/utils';
import { classifyForStats } from './classify-for-stats';

export type RecurringCadence = 'weekly' | 'fortnightly' | 'monthly' | 'quarterly' | 'yearly';

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

/**
 * How strongly the evidence supports calling this a recurring payment (TICKET-REC-11) — derived
 * from the signals detection already computes, never stored. The review's complaint was that a
 * weak match was presented exactly like a strong one, so this is the thing that has to differ on
 * screen.
 */
export type RecurringConfidence = {
  level: 'high' | 'medium' | 'low';
  /** One clause naming what weakened it, for the row's tooltip; empty on a `high` match. */
  reason: string;
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
  /**
   * The last date this series may be projected to, when its category's applicability window closes
   * in the future (FR-CAT-9, TICKET-REC-05); absent when nothing bounds it.
   *
   * Carried on the series rather than looked up downstream so `projectRecurringOccurrences` stays
   * category-unaware: the calendar has no business knowing what a category window is, only that
   * this rhythm is not expected past a date.
   */
  projectUntil?: string;
  flags: RecurringFlags;
  /** How much to trust this detection (TICKET-REC-11) — derived, like `flags`, never stored. */
  confidence: RecurringConfidence;
};

export type RecurringPaymentsResult = {
  series: RecurringPaymentSeries[];
  /**
   * Series dropped because their category's window had already closed (TICKET-REC-05) — reported
   * rather than silently swallowed, the `nettedOutLinkCount` precedent from the money-flow
   * aggregate, so the panel can explain the absence instead of leaving it spooky.
   */
  concludedSeriesCount: number;
};

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
 * How many beats of its own rhythm a series may miss in one go and still be the same series
 * (TICKET-REC-07). A weekly delivery paused for a holiday, or a direct debit that failed once, leaves
 * a gap that is a whole multiple of the cadence — visibly a *missed beat*, not a different rhythm —
 * and un-detecting the entire series over it is what made the panel read as "monthly and quarterly
 * only": ordinary monthly jitter fits inside 24..38 days, but a skipped week does not fit inside
 * 5..10.
 *
 * Two, so at most three nominal periods may separate two occurrences. It is the *per-gap* bound; the
 * series-wide guard is the median, which still has to land in the band — a set of dates that is
 * mostly holes has a median gap of several periods and matches no band at all.
 */
const MAX_SKIPPED_INTERVALS = 2;

/**
 * The recognised rhythms, as inclusive day-gap windows around each nominal period. The windows are
 * the jitter tolerance: a monthly debit shifted off a weekend, or moved between the 11th and the
 * 13th, still lands inside `monthly`, while month-length differences (28..31) never push it out.
 * The deliberate gaps between windows (11, 18..23, 39..74, 106..329 days) are where a *median* gap
 * finds no cadence at all — a four-monthly rhythm is not silently rounded into a neighbour, it
 * produces no series. (An individual gap inside an already-chosen band is judged by `fitsBand`,
 * which also accepts whole multiples of the band's period; the median is what picks the band.)
 *
 * `fortnightly` (TICKET-REC-07) carries weekly's own jitter shape (−2/+3 days) around its nominal 14,
 * which is what keeps a rejection gap on *both* sides of it rather than letting the bands run
 * together into "anything between a week and a month".
 *
 * The per-month cost is derived from the **nominal** period rather than the observed gaps, so two
 * identical yearly subscriptions can't report different monthly equivalents because one happened to
 * be paid a day late.
 */
const CADENCE_BANDS: readonly {
  cadence: RecurringCadence;
  nominalDays: number;
  minGapDays: number;
  maxGapDays: number;
}[] = [
  { cadence: 'weekly', nominalDays: 7, minGapDays: 5, maxGapDays: 10 },
  { cadence: 'fortnightly', nominalDays: 14, minGapDays: 12, maxGapDays: 17 },
  { cadence: 'monthly', nominalDays: 365.25 / 12, minGapDays: 24, maxGapDays: 38 },
  { cadence: 'quarterly', nominalDays: 365.25 / 4, minGapDays: 75, maxGapDays: 105 },
  { cadence: 'yearly', nominalDays: 365.25, minGapDays: 330, maxGapDays: 400 },
];

type CadenceBand = (typeof CADENCE_BANDS)[number];

/** The nominal period as a per-month multiplier — exactly 1 for monthly, 1/3 for quarterly. */
const perMonthOf = ({ nominalDays }: CadenceBand): number => 365.25 / nominalDays / 12;

/**
 * Whether one gap belongs to a rhythm: either the nominal step, or a whole number of them with up to
 * `MAX_SKIPPED_INTERVALS` beats missed in between (TICKET-REC-07). The band's jitter allowance is
 * applied *unscaled* around each multiple — a payment that resumes after a skipped week is still
 * expected within a day or two of its usual weekday, so the tolerance has no reason to widen with the
 * hole. At one interval this is precisely the band's own window.
 */
const fitsBand = (gapDays: number, band: CadenceBand): boolean => {
  const lowerJitter = band.nominalDays - band.minGapDays;
  const upperJitter = band.maxGapDays - band.nominalDays;

  for (let intervals = 1; intervals <= 1 + MAX_SKIPPED_INTERVALS; intervals++) {
    const nominal = band.nominalDays * intervals;
    if (gapDays >= nominal - lowerJitter && gapDays <= nominal + upperJitter) return true;
  }
  return false;
};

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

/**
 * How alike two descriptions must be to belong to one cluster (TICKET-REC-08) — the Sørensen–Dice
 * coefficient over their token sets, at or above which they merge.
 *
 * **A starting point, not a finding.** It was chosen before seeing a real bank export and is
 * expected to be tuned against one. When tuning, err *high*: a missed merge only leaves the status
 * quo — a payment that is simply not detected — while a false merge invents a commitment the user
 * does not have, and `bandByAmount`/`recogniseCadence` will happily find a plausible rhythm inside a
 * cluster of two unrelated payees.
 */
const DESCRIPTION_MATCH_THRESHOLD = 0.8;

/**
 * A description's distinguishing words (TICKET-REC-08). Split on anything that is neither a letter
 * nor a digit, then **every pure-numeric token is dropped**: terminal IDs, sequence numbers, card
 * suffixes and booking dates are precisely the parts a bank varies between two payments at the same
 * place, so keeping them would score every card payment as its own merchant. Dates need no rule of
 * their own — `12/07` and `2026-08-09` split into numeric pieces and fall out under the same one.
 *
 * A *set*, because Dice compares sets: a description repeating a word is not a better match for one
 * that says it once.
 */
const descriptionTokens = (normalizedDescription: string): ReadonlySet<string> => {
  const tokens = new Set<string>();
  for (const token of normalizedDescription.split(/[^\p{L}\p{N}]+/u)) {
    if (token && !/^\p{N}+$/u.test(token)) tokens.add(token);
  }
  return tokens;
};

/**
 * Sørensen–Dice over two **non-empty** token sets: `2 × |A ∩ B| / (|A| + |B|)` — 1 for identical
 * sets, 0 for disjoint ones. Chosen over a whole-string edit-distance ratio because bank boilerplate
 * (`SEPA DIRECT DEBIT REF …`) makes two *different* payees look character-identical while the one
 * token that distinguishes them is a few letters long.
 */
const diceCoefficient = (a: ReadonlySet<string>, b: ReadonlySet<string>): number => {
  const [smaller, larger] = a.size <= b.size ? [a, b] : [b, a];
  let shared = 0;
  for (const token of smaller) {
    if (larger.has(token)) shared++;
  }
  return (2 * shared) / (a.size + b.size);
};

type DescriptionCluster = {
  /** `desc:<the normalized description of the first transaction to open the cluster>`. */
  key: string;
  tokens: ReadonlySet<string>;
  /** Creation order, so "the first matching cluster" is well defined without re-scanning them all. */
  ordinal: number;
};

/**
 * The fuzzy last-resort cluster tier (TICKET-REC-08) — a stateful assigner, created once per
 * detection run, that answers "which description cluster does this belong to".
 *
 * Assignment is **greedy in input order**: a description joins the first (lowest-ordinal) existing
 * cluster it scores `DESCRIPTION_MATCH_THRESHOLD` or better against, and otherwise opens a new one
 * that it names. Greedy and order-bound is what makes `series[].key` reproducible across repeated
 * detection over the same transactions, which is what lets the panel use it as a render key.
 *
 * Candidates come from an inverted token → cluster index, never an all-pairs sweep: two descriptions
 * sharing no token score 0, so only clusters sharing at least one are worth measuring. This
 * aggregate is uncached and re-runs on every read (the `bandByAmount` note records the same
 * constraint), so the hundreds of card payments at one supermarket must cost one comparison each,
 * not one per payment seen so far.
 *
 * A description that tokenises to **nothing** — a reference number and no words — falls back to
 * exact equality. An empty token set scores 0 against everything, so it would otherwise open a fresh
 * cluster per transaction; keying it exactly instead keeps identical references together without
 * letting the empty set become a bucket that swallows unrelated payments.
 */
const createDescriptionClusters = (): ((description: string) => string) => {
  const byToken = new Map<string, DescriptionCluster[]>();
  const byExactKey = new Map<string, DescriptionCluster>();
  let created = 0;

  const open = (normalized: string, tokens: ReadonlySet<string>): DescriptionCluster => {
    const cluster: DescriptionCluster = { key: `desc:${normalized}`, tokens, ordinal: created++ };
    for (const token of tokens) {
      const bucket = byToken.get(token);
      if (bucket) bucket.push(cluster);
      else byToken.set(token, [cluster]);
    }
    return cluster;
  };

  /** The exact-equality half, for a description with no comparable token of its own. */
  const exactCluster = (normalized: string): DescriptionCluster => {
    const existing = byExactKey.get(normalized);
    if (existing) return existing;

    const cluster = open(normalized, new Set());
    byExactKey.set(normalized, cluster);
    return cluster;
  };

  /**
   * The only clusters worth measuring — those sharing at least one token, deduplicated and back in
   * creation order. Everything else scores 0 by definition, which is what the token index buys.
   */
  const candidatesFor = (tokens: ReadonlySet<string>): DescriptionCluster[] => {
    const candidates = new Set<DescriptionCluster>();
    for (const token of tokens) {
      for (const cluster of byToken.get(token) ?? []) candidates.add(cluster);
    }
    return [...candidates].sort((a, b) => a.ordinal - b.ordinal);
  };

  /** The first cluster, in creation order, this token set matches — `undefined` if none does. */
  const firstMatch = (tokens: ReadonlySet<string>): DescriptionCluster | undefined =>
    candidatesFor(tokens).find(
      (cluster) => diceCoefficient(tokens, cluster.tokens) >= DESCRIPTION_MATCH_THRESHOLD,
    );

  return (description: string): string => {
    const normalized = normalizeText(description);
    const tokens = descriptionTokens(normalized);

    if (tokens.size === 0) return exactCluster(normalized).key;
    return (firstMatch(tokens) ?? open(normalized, tokens)).key;
  };
};

type ClusterIdentity = { clusterKey: string; counterpartyIban?: string };

type Candidate = RecurringOccurrence &
  ClusterIdentity & {
    label: string;
    categoryId: number | null;
  };

/**
 * The **exact-match** counterparty tiers, strongest signal first: a normalized IBAN identifies a
 * payee even when the name is spelled three ways; a name survives banks that don't export IBANs.
 * Both stay exact equality — an IBAN is an identifier, and a name is a strong enough signal that a
 * false merge there would be more surprising than the missed merge it prevents, so TICKET-REC-08
 * narrows similarity matching to descriptions only.
 *
 * `undefined` when the transaction carries neither, which is the card payment the fuzzy `desc:` tier
 * exists for.
 */
const exactClusterIdentity = (transaction: Transaction): ClusterIdentity | undefined => {
  const iban = normalizeIban(transaction.counterpartyIban);
  if (iban) return { clusterKey: `iban:${iban}`, counterpartyIban: iban };

  const name = normalizeText(transaction.counterpartyName);
  if (name) return { clusterKey: `name:${name}` };

  return undefined;
};

const toCandidate = (
  transaction: Transaction,
  amount: number,
  categoryId: number | null,
  identity: ClusterIdentity,
): Candidate | null => {
  if (transaction.id == null) return null;
  return {
    transactionId: transaction.id,
    date: transaction.bookingDate,
    amount,
    categoryId,
    label: transaction.counterpartyName?.trim() || transaction.rawDescription,
    ...identity,
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
 * The rhythm a band's dates keep, or `null` if they keep none. The median gap chooses the band — one
 * holiday-delayed payment can't reclassify a series, and a skip can only ever be *forgiven* inside a
 * band, never promote the series into a slower one — but every gap must also fit that same band,
 * whole beats included, so "three payments in one week and one a year later" is rejected rather than
 * averaged into a plausible-looking monthly.
 */
const recogniseCadence = (
  dates: readonly string[],
): {
  cadence: RecurringCadence;
  medianGapDays: number;
  perMonth: number;
  gaps: number[];
} | null => {
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
  if (gaps.some((gap) => !fitsBand(gap, band))) return null;

  return { cadence: band.cadence, medianGapDays, perMonth: perMonthOf(band), gaps };
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

/**
 * Occurrences beyond which count alone stops being the weak signal. `MIN_OCCURRENCES` (3) is the
 * floor a rhythm needs to exist at all; at six a pattern has repeated through half a year of
 * monthly billing, which is where "it happened three times" stops being the interesting doubt.
 */
const CONFIDENT_OCCURRENCES = 6;

/**
 * How far the gaps may wander from their own median before the rhythm reads as irregular. A tenth
 * of the interval is about three days on a monthly bill — inside the wobble a weekend or a bank
 * holiday causes, and well inside what `CADENCE_BANDS` already tolerated on the way in.
 */
const STEADY_JITTER_RATIO = 0.1;

/**
 * How far the amounts may sit from the band's median before the price reads as unsteady.
 *
 * A *third* of `AMOUNT_BAND_TOLERANCE`, calibrated against what banding already permits rather than
 * chosen: `bandByAmount` admits an occurrence within 15% of a *running* median, so a band's amounts
 * are tighter than 15% apart in practice and a threshold at half the tolerance was effectively
 * unreachable — the signal would have been decorative. At a third, a series with a couple of
 * occurrences out near the edge of its band trips it, which is the case worth flagging.
 */
const STEADY_AMOUNT_RATIO = AMOUNT_BAND_TOLERANCE / 3;

/** Mean absolute deviation from a value — the spread measure, robust enough and cheap. */
const meanDeviation = (values: readonly number[], centre: number): number =>
  values.reduce((sum, value) => sum + Math.abs(value - centre), 0) / values.length;

/**
 * Scores a series against three of detection's own signals (TICKET-REC-11): how many times it has
 * repeated, how steady its interval is, and how steady its amount is. Each doubt costs one level,
 * and the first one found is the one named — a row says the most important thing that is wrong with
 * it, not a list.
 *
 * Deliberately *not* a percentage: the inputs are heuristics with no calibration behind them, and a
 * "71% confident" would claim a precision this does not have. Three levels is what the evidence
 * supports.
 */
const scoreConfidence = (
  occurrences: readonly RecurringOccurrence[],
  gaps: readonly number[],
  intervalDays: number,
  typicalAmount: number,
): RecurringConfidence => {
  const doubts: string[] = [];

  if (occurrences.length < CONFIDENT_OCCURRENCES) {
    doubts.push(`seen ${occurrences.length} times so far`);
  }
  if (meanDeviation(gaps, intervalDays) > intervalDays * STEADY_JITTER_RATIO) {
    doubts.push('the dates drift from one to the next');
  }
  if (
    typicalAmount > 0 &&
    meanDeviation(
      occurrences.map((occurrence) => occurrence.amount),
      typicalAmount,
    ) >
      typicalAmount * STEADY_AMOUNT_RATIO
  ) {
    doubts.push('the amount varies between payments');
  }

  const level = doubts.length === 0 ? 'high' : doubts.length === 1 ? 'medium' : 'low';
  return { level, reason: doubts[0] ?? '' };
};

/** The day-gaps between consecutive occurrences, oldest first — what `scoreConfidence` reads. */
const gapsOf = (occurrences: readonly RecurringOccurrence[]): number[] => {
  const gaps: number[] = [];
  for (let index = 1; index < occurrences.length; index++) {
    gaps.push(daysBetween(occurrences[index - 1].date, occurrences[index].date));
  }
  return gaps;
};

/** Re-scores a series whose occurrences changed — a repricing folded two levels together, or the
 * user merged two rows (TICKET-REC-11). Without this, a merged series would carry the confidence of
 * whichever half happened to win the spread. */
const confidenceOf = (series: RecurringPaymentSeries): RecurringConfidence =>
  scoreConfidence(
    series.occurrences,
    gapsOf(series.occurrences),
    series.intervalDays,
    series.typicalAmount,
  );

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
    confidence: scoreConfidence(occurrences, rhythm.gaps, rhythm.medianGapDays, typicalAmount),
  };
};

/** Days in an average month — the divisor that turns an observed span into months. */
const DAYS_PER_MONTH = 365.25 / 12;

/**
 * What a set of occurrences actually costs per month: everything they came to, over the span they
 * cover, with one interval added so the last payment owns its period like every other one.
 *
 * Used for a **merged** series (TICKET-REC-11) instead of `typicalAmount × cadence rate`. A merged
 * series is heterogeneous by construction — the user said two different-priced rows are one payment
 * — and a median amount multiplied by a rate then overstates it badly: two ~monthly grocery bills
 * of €58 and €73 merge into a series whose payments arrive fortnightly, and €58 × the fortnightly
 * rate claims €254/month for something that has never cost more than about €130. Measuring what was
 * actually spent cannot do that.
 *
 * On an unmerged, steady series the two agree to within a few percent — n payments spanning
 * `n × interval` days give mean × the interval's own monthly rate — so they are not different
 * ideas. They differ only in that the detector's version uses the *nominal* cadence rate (a month
 * is 30.44 days) where this one uses the interval the payments actually kept (three payments across
 * February keep a shorter one).
 */
const observedMonthlyEquivalent = (
  occurrences: readonly RecurringOccurrence[],
  intervalDays: number,
): number => {
  const total = occurrences.reduce((sum, occurrence) => sum + occurrence.amount, 0);
  const spanDays =
    daysBetween(occurrences[0].date, occurrences[occurrences.length - 1].date) + intervalDays;
  return spanDays > 0 ? (total / spanDays) * DAYS_PER_MONTH : total;
};

/**
 * Folds one detected series into another because the **user** said they are the same real payment
 * (TICKET-REC-11) — the counterpart to `repriced`, which folds two levels the detector itself
 * recognised as one commitment.
 *
 * Every figure is recomputed from the combined occurrences rather than inherited, so the merged row
 * states a rhythm that is actually true of it: a merge is a claim about the world, and a monthly
 * total carried over from one half would be a number nobody computed.
 *
 * The cadence is re-recognised, and falls back to the primary's when the combination fits no band —
 * which is a real outcome, not a failure: two monthly rows merged into one series whose payments
 * alternate every fortnight may genuinely be a fortnightly rhythm, and may equally be two payments
 * a fortnight apart that the user knows are one bill. Keeping the primary's cadence in that case
 * says the least, and `confidence` is re-scored either way, so a merge that made the rhythm ragged
 * says so on the row.
 *
 * Occurrences are de-duplicated by transaction id: merging a series with one it overlaps (a price
 * change already folded both levels in, say) must not count a payment twice into the total.
 */
export const mergeRecurringSeries = (
  primary: RecurringPaymentSeries,
  absorbed: RecurringPaymentSeries,
): RecurringPaymentSeries => {
  const byTransactionId = new Map<number, RecurringOccurrence>();
  for (const occurrence of [...primary.occurrences, ...absorbed.occurrences]) {
    byTransactionId.set(occurrence.transactionId, occurrence);
  }
  const occurrences = [...byTransactionId.values()].sort((a, b) => a.date.localeCompare(b.date));

  const typicalAmount = median(occurrences.map((occurrence) => occurrence.amount));
  const rhythm = recogniseCadence(occurrences.map((occurrence) => occurrence.date));
  const cadence = rhythm?.cadence ?? primary.cadence;
  const intervalDays = rhythm?.medianGapDays ?? primary.intervalDays;
  const lastDate = occurrences[occurrences.length - 1].date;

  const merged: RecurringPaymentSeries = {
    ...primary,
    occurrences,
    typicalAmount,
    cadence,
    intervalDays,
    lastDate,
    nextExpectedDate: formatIsoDate(parseIsoDate(lastDate) + intervalDays * MS_PER_DAY),
    monthlyEquivalent: observedMonthlyEquivalent(occurrences, intervalDays),
    // The detector's own flags described the halves; recomputing them needs the clock, which this
    // function deliberately does not have. Timing flags are re-derived downstream from `lastDate`
    // and `intervalDays`, both of which are correct above; a `priceChange` the detector found on
    // either half survives on the primary and stays true of it.
    flags: primary.flags,
  };

  return { ...merged, confidence: confidenceOf(merged) };
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
): RecurringPaymentSeries => {
  const folded: RecurringPaymentSeries = {
    ...later,
    occurrences: [...earlier.occurrences, ...later.occurrences],
    flags: {
      priceChange: {
        from: earlier.typicalAmount,
        to: later.typicalAmount,
        atDate: later.occurrences[0].date,
      },
    },
  };
  // Re-scored over both levels (TICKET-REC-11): the folded series has been seen more times than
  // either half, and taking `later`'s score through the spread would understate that.
  return { ...folded, confidence: confidenceOf(folded) };
};

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

/**
 * The applicability window of a series' category, or `undefined` when it has none (TICKET-REC-05).
 * An uncategorised series (`categoryId: null`) has no window by construction and is unaffected.
 */
const categoryOf = (
  series: RecurringPaymentSeries,
  categoriesById: ReadonlyMap<number, Category>,
): Category | undefined =>
  series.categoryId != null ? categoriesById.get(series.categoryId) : undefined;

/**
 * A series bounded by its category's window (TICKET-REC-05), or `null` when the window has already
 * closed and the series is *concluded by declaration* — the user dated the end of this commitment,
 * so it leaves the results entirely rather than reappearing as REC-04's "Stopped".
 *
 * A window closing in the **future** keeps the series live but clips it: `nextExpectedDate` never
 * runs past `activeUntil`, and `projectUntil` carries the same bound to the calendar. A gym
 * membership cancelled per end-of-year drops off the calendar exactly at year end instead of
 * billing you into January.
 *
 * `categoryHasEnded` is CAT-10/CAT-11's shared predicate, so this aggregate and the pickers cannot
 * disagree by a day about where the boundary falls.
 */
const boundedByCategoryWindow = (
  series: RecurringPaymentSeries,
  categoriesById: ReadonlyMap<number, Category>,
  todayIso: string,
): RecurringPaymentSeries | null => {
  const category = categoryOf(series, categoriesById);
  if (!category?.activeUntil) return series;
  if (categoryHasEnded(category, todayIso)) return null;

  const { activeUntil } = category;
  return {
    ...series,
    nextExpectedDate: series.nextExpectedDate > activeUntil ? activeUntil : series.nextExpectedDate,
    projectUntil: activeUntil,
  };
};

/** The start of the history actually held, so `classifyForStats`' range bound excludes nothing real. */
const earliestBookingDate = (transactions: readonly Transaction[]): string => {
  let earliest = transactions[0].bookingDate;
  for (const transaction of transactions) {
    if (transaction.bookingDate < earliest) earliest = transaction.bookingDate;
  }
  return earliest;
};

/**
 * Every occurrence-worthy expense, grouped under its counterparty's strongest available key —
 * exact on an IBAN or a name, and by description *similarity* when the transaction carries neither
 * (TICKET-REC-08). The clusterer is created here rather than shared, so its greedy assignment
 * depends on nothing but this run's own input order.
 */
const candidatesByCounterparty = (
  transactions: readonly Transaction[],
  categoriesById: ReadonlyMap<number, Category>,
  accountsById: ReadonlyMap<number, Account>,
  from: string,
  to: string,
  ownSavingsIbans: ReadonlySet<string>,
): Map<string, Candidate[]> => {
  const byCluster = new Map<string, Candidate[]>();
  const descriptionClusterKey = createDescriptionClusters();

  for (const transaction of transactions) {
    const result = classifyForStats(
      transaction,
      from,
      to,
      ownSavingsIbans,
      categoriesById,
      accountsById,
      // Attribution disregarded (TICKET-REC-09): what repeats is not a question about whose money
      // it was. Everything else `classifyForStats` excludes still excludes.
      'raw',
    );
    if (result.kind !== 'expense' || result.amount <= 0) continue;

    const identity = exactClusterIdentity(transaction) ?? {
      clusterKey: descriptionClusterKey(transaction.rawDescription),
    };
    const candidate = toCandidate(transaction, result.amount, result.categoryId, identity);
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
 * `nullified` rows and `neutral` categories never reach this logic, and a refund — a negative
 * expense delta — is silently not an occurrence rather than a gap that breaks the series' rhythm.
 * Income cadence is deliberately out of scope: it is FR-INC territory (`detectIncomeGaps` and
 * friends own it at category level).
 *
 * It asks for that classification in `'raw'` joint mode (TICKET-REC-09), the **one** caller that
 * does: a €90 household bill on a half-owned joint account is one €90 rhythm, not a €45 one, and a
 * leg attributed to a co-owner is still a payment that happens every month. The consequence is
 * deliberate and stated in the panel's caption — these amounts are the whole bill, so they do not
 * reconcile with the Dashboard's ownership-weighted figures. Scaling also used to *split* a rhythm:
 * `AMOUNT_BAND_TOLERANCE` banded on the scaled figure, so a share that changed over the history put
 * one commitment in two bands.
 *
 * Series come back most-expensive-first by `monthlyEquivalent`, which is the order a "what do my
 * commitments cost me" panel wants and the only order this aggregate has an opinion about.
 *
 * Each carries `flags` (TICKET-REC-04) describing what *changed*: a sustained price step, a payment
 * that is late, or a rhythm that has stopped. A stopped series keeps its place in the result rather
 * than un-detecting itself — a cancelled subscription quietly vanishing is the opposite of the
 * announcement this exists to make.
 *
 * The one exception is a **declared** conclusion (TICKET-REC-05): a series whose category's
 * applicability window has already closed did not stop unexpectedly, the user dated its end, so it
 * leaves the results and is counted in `concludedSeriesCount` instead. Declaration beats inference —
 * the `stopped` flag keeps answering the *other* question, "did something quietly fail".
 */
export const detectRecurringPayments = (
  transactions: Transaction[],
  categoriesById: ReadonlyMap<number, Category>,
  accountsById: ReadonlyMap<number, Account>,
  todayIso: string,
  ownSavingsIbans: ReadonlySet<string> = new Set(),
): RecurringPaymentsResult => {
  if (transactions.length === 0) return { series: [], concludedSeriesCount: 0 };

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

  const merged = mergePriceChanges(detected);

  // The window pass runs before the flags, so a concluded series never gets an `overdue`/`stopped`
  // verdict computed for it at all — it is simply absent, which is the stronger statement
  // (TICKET-REC-05).
  const bounded = merged
    .map((entry) => boundedByCategoryWindow(entry, categoriesById, todayIso))
    .filter((entry): entry is RecurringPaymentSeries => entry !== null);

  const series = bounded.map((entry) => ({
    ...entry,
    flags: { ...entry.flags, ...timingFlags(entry, todayIso) },
  }));

  return {
    series: series.sort((a, b) => b.monthlyEquivalent - a.monthlyEquivalent),
    concludedSeriesCount: merged.length - bounded.length,
  };
};
