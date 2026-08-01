import type { Category } from '@/core/data-access';
import type { IncomeEvent, IncomeEventYear } from '@/core/stats';
import type { TextColor } from '@/shared/ui';
import {
  bucketDateBoundaries,
  formatCurrency,
  formatMonthShort,
  formatPercent,
} from '@/shared/utils';
import { INCOME_GRANULARITY } from './income-granularity';

/**
 * A wage change's own row shape (month | what moved | delta chip), instead of the sentence the
 * other kinds get. These are the only events with two comparable figures and a percentage, so they
 * read far better as columns you can scan down than as prose — and the chip is deliberately the
 * dashboard's period-comparison indicator, down to the triangle and the unsigned percentage whose
 * direction the icon carries.
 */
export type WageChangeRowVm = {
  /** `Net` or `Gross`. */
  label: string;
  /**
   * The move itself, signed — `+€400.00`. The row leads with what *changed* rather than with the
   * old figure: the previous month's level is already the row above's `to` when there was one, and
   * the size of the step is the thing being scanned for.
   */
  delta: string;
  /** Where it landed. */
  to: string;
  /** Unsigned — `deltaIcon` says which way, exactly as `CategoryComparisonVm.deltaLabel` does. */
  deltaLabel: string;
  deltaIcon: 'tablerTriangleFill' | 'tablerTriangleInvertedFill';
  /**
   * A typed `mm-text` token rather than a raw Tailwind class — the same field, the same name and
   * the same two values as `CategoryComparisonVm.deltaColor`, so the two indicators can't drift.
   */
  deltaColor: TextColor;
};

export type IncomeEventVm = {
  /** Stable across re-derivations — the `@for` track key. */
  key: string;
  /**
   * The month the event happened, abbreviated — the rail groups by year already, so the year is in
   * the section heading above and repeating it on every row is noise.
   */
  when: string;
  /** The sentence every kind *but* a wage change renders; empty for those. */
  message: string;
  /** Set only for a wage change, which renders as columns rather than a sentence. */
  wageChange?: WageChangeRowVm;
};

export type IncomeEventYearVm = {
  year: string;
  events: IncomeEventVm[];
};

const VERB_BY_KIND: Record<'raise' | 'pay-cut', string> = {
  raise: 'increased',
  'pay-cut': 'dropped',
};

const categoryName = (
  categoriesById: ReadonlyMap<number, Category>,
  categoryId: number,
  fallback: string,
): string => categoriesById.get(categoryId)?.name ?? fallback;

/**
 * One event's copy. Carried over from `buildStepChangeCallout`/`buildGapWarning` (TICKET-INC-08/09)
 * rather than rewritten, minus the banner chrome those had: every amount still goes through
 * `formatCurrency()` and every date through `formatDate()`, because the symbol, its position and the
 * number/date locale are all user settings since TICKET-SET-03/04 — a hardcoded `€` or an
 * `en-US`-shaped "April 2026" would be wrong for anyone who changed them.
 */
const wageChangeRow = (event: Extract<IncomeEvent, { kind: 'wage-change' }>): WageChangeRowVm => ({
  label: event.series === 'net' ? 'Net' : 'Gross',
  delta: formatCurrency(event.delta, { signed: true }),
  to: formatCurrency(event.to),
  // `sign-by-icon`, like the dashboard's card: the triangle carries the direction, so a minus sign
  // in front of a downward triangle would be saying it twice.
  deltaLabel: formatPercent(event.pct, 'sign-by-icon'),
  deltaIcon: event.pct > 0 ? 'tablerTriangleFill' : 'tablerTriangleInvertedFill',
  // Green up, amber down — never `error`; a pay cut is something to notice, not a failure.
  deltaColor: event.pct > 0 ? 'success' : 'warning',
});

const streamStoppedMessage = (
  event: Extract<IncomeEvent, { kind: 'stream-stopped' }>,
  categoriesById: ReadonlyMap<number, Category>,
): string => {
  const name = categoryName(categoriesById, event.categoryId, 'An income category');
  const months = event.monthsMissing === 1 ? 'month' : 'months';
  return `${name} hasn’t shown up since — ${event.monthsMissing} ${months} with nothing, where it used to arrive most months.`;
};

const stepChangeMessage = (
  event: Extract<IncomeEvent, { kind: 'raise' | 'pay-cut' }>,
  categoriesById: ReadonlyMap<number, Category>,
): string => {
  const name = categoryName(categoriesById, event.categoryId, 'Income');
  return (
    `${name} ${VERB_BY_KIND[event.kind]} ${formatPercent(Math.abs(event.pctChange))} — ` +
    `from about ${formatCurrency(event.fromAvg)} to ${formatCurrency(event.toAvg)} a month.`
  );
};

const messageOf = (event: IncomeEvent, categoriesById: ReadonlyMap<number, Category>): string => {
  // A wage change carries `wageChange` instead — columns, not a sentence.
  if (event.kind === 'wage-change') return '';
  if (event.kind === 'stream-stopped') return streamStoppedMessage(event, categoriesById);
  if (event.kind === 'bonus') {
    return `Bonus of ${formatCurrency(event.amount)} recorded on your salary details.`;
  }
  return stepChangeMessage(event, categoriesById);
};

/** The `@for` key: unique per event even when two of the same kind land in one month. */
const keyOf = (event: IncomeEvent): string => {
  if (event.kind === 'bonus') return `bonus:${event.bucketKey}`;
  // Net and gross can both move in the same month, so the series is part of the identity.
  if (event.kind === 'wage-change') return `wage-change:${event.series}:${event.bucketKey}`;
  return `${event.kind}:${event.categoryId}:${event.bucketKey}`;
};

export const buildIncomeEventVm = (
  event: IncomeEvent,
  categoriesById: ReadonlyMap<number, Category>,
): IncomeEventVm => ({
  key: keyOf(event),
  when: formatMonthShort(bucketDateBoundaries(event.bucketKey, INCOME_GRANULARITY).start),
  message: messageOf(event, categoriesById),
  ...(event.kind === 'wage-change' ? { wageChange: wageChangeRow(event) } : {}),
});

export const buildIncomeEventYearVms = (
  years: IncomeEventYear[],
  categoriesById: ReadonlyMap<number, Category>,
): IncomeEventYearVm[] =>
  years.map(({ year, events }) => ({
    year,
    events: events.map((event) => buildIncomeEventVm(event, categoriesById)),
  }));
