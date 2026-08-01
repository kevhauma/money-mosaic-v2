import type { Category } from '@/core/data-access';
import type { IncomeEvent, IncomeEventKind, IncomeEventYear } from '@/core/stats';
import { bucketDateBoundaries, formatCurrency, formatDate, formatPercent } from '@/shared/utils';
import { INCOME_GRANULARITY } from './income-granularity';

export type IncomeEventVm = {
  /** Stable across re-derivations — the `@for` track key. */
  key: string;
  icon: string;
  /** Tailwind text colour for the icon; the copy itself stays base ink so the rail reads as one list. */
  toneClass: string;
  /** The month the event happened, formatted for display. */
  when: string;
  message: string;
};

export type IncomeEventYearVm = {
  year: string;
  events: IncomeEventVm[];
};

/** A raise is good news, a pay cut and a silence are things to notice — none of them is an error. */
const ICON_BY_KIND: Record<IncomeEventKind, string> = {
  raise: 'tablerTrendingUp',
  'pay-cut': 'tablerTrendingDown',
  bonus: 'tablerGift',
  'stream-stopped': 'tablerAlertTriangle',
  // Overridden per direction below — a wage change is the one kind that can go either way.
  'wage-change': 'tablerTrendingUp',
};

const TONE_BY_KIND: Record<IncomeEventKind, string> = {
  raise: 'text-success',
  'pay-cut': 'text-warning',
  bonus: 'text-info',
  'stream-stopped': 'text-warning',
  'wage-change': 'text-success',
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
/** "Net went up by 4.2% (€120.00) — €2,850.00 to €2,970.00." */
const wageChangeMessage = (event: Extract<IncomeEvent, { kind: 'wage-change' }>): string => {
  const label = event.series === 'net' ? 'Net' : 'Gross';
  const direction = event.pct > 0 ? 'up' : 'down';
  return (
    `${label} went ${direction} by ${formatPercent(Math.abs(event.pct))} ` +
    `(${formatCurrency(Math.abs(event.delta))}) — ` +
    `${formatCurrency(event.from)} to ${formatCurrency(event.to)}.`
  );
};

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
  if (event.kind === 'wage-change') return wageChangeMessage(event);
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

/** A wage change is the one kind that can go either way, so its icon and tone follow the sign. */
const iconOf = (event: IncomeEvent): string =>
  event.kind === 'wage-change' && event.pct < 0 ? 'tablerTrendingDown' : ICON_BY_KIND[event.kind];

const toneOf = (event: IncomeEvent): string =>
  event.kind === 'wage-change' && event.pct < 0 ? 'text-warning' : TONE_BY_KIND[event.kind];

export const buildIncomeEventVm = (
  event: IncomeEvent,
  categoriesById: ReadonlyMap<number, Category>,
): IncomeEventVm => ({
  key: keyOf(event),
  icon: iconOf(event),
  toneClass: toneOf(event),
  when: formatDate(bucketDateBoundaries(event.bucketKey, INCOME_GRANULARITY).start),
  message: messageOf(event, categoriesById),
});

export const buildIncomeEventYearVms = (
  years: IncomeEventYear[],
  categoriesById: ReadonlyMap<number, Category>,
): IncomeEventYearVm[] =>
  years.map(({ year, events }) => ({
    year,
    events: events.map((event) => buildIncomeEventVm(event, categoriesById)),
  }));
