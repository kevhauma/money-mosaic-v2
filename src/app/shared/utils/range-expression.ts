import {
  MS_PER_DAY,
  bucketDateBoundaries,
  bucketKeyForDate,
  formatIsoDate,
  parseIsoDate,
} from './date-buckets';
import type { Granularity } from './date-buckets';

export type RangeExpressionUnit = 'd' | 'w' | 'M' | 'y';

type RangeExpressionOffset = { sign: 1 | -1; amount: number; unit: RangeExpressionUnit };

export type RangeExpression =
  | { kind: 'relative'; offset: RangeExpressionOffset | null; snapUnit: RangeExpressionUnit | null }
  | { kind: 'absolute'; date: string };

export type ParseRangeExpressionResult =
  { ok: true; value: RangeExpression } | { ok: false; reason: string };

const RANGE_EXPRESSION_UNITS = ['d', 'w', 'M', 'y'] as const;

const isRangeExpressionUnit = (value: string): value is RangeExpressionUnit =>
  (RANGE_EXPRESSION_UNITS as readonly string[]).includes(value);

const TIME_UNITS = new Set(['h', 'm', 's']);

const TIME_UNIT_REASON = 'This app works in whole days, not hours, minutes, or seconds.';

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const ISO_DATETIME_PREFIX_RE = /^\d{4}-\d{2}-\d{2}[ T]/;

/** `sign` `amount` `unit` for the `now±<n><unit>` offset, then an optional `/<unit>` snap suffix. */
const RELATIVE_EXPRESSION_RE = /^now(?:([+-])(\d+)([A-Za-z]))?(?:\/([A-Za-z]))?$/;

const isValidIsoDate = (text: string): boolean => {
  if (!ISO_DATE_RE.test(text)) {
    return false;
  }
  const date = parseIsoDate(text);
  return !Number.isNaN(date.getTime()) && formatIsoDate(date) === text;
};

type UnitCheckResult = { ok: true; unit: RangeExpressionUnit } | { ok: false; reason: string };

/** Shared validation for both the offset unit and the snap unit — one place to name the whole-day reason. */
const checkUnit = (unitText: string): UnitCheckResult => {
  if (TIME_UNITS.has(unitText)) {
    return { ok: false, reason: TIME_UNIT_REASON };
  }
  if (!isRangeExpressionUnit(unitText)) {
    return { ok: false, reason: `Unknown unit "${unitText}" — use d, w, M, or y.` };
  }
  return { ok: true, unit: unitText };
};

/**
 * Parses the relative range grammar (`now`, `now-30d`, `now/M`, `now-1M/M`, ...) plus the bare
 * `YYYY-MM-DD` absolute form. Rejects with a reason rather than silently coercing — time units
 * (`h`/`m`/`s`) and the datetime form get a reason naming this app's whole-day granularity
 * specifically, since `m` (minutes) is one keystroke away from the intended `M` (month).
 */
export const parseRangeExpression = (text: string): ParseRangeExpressionResult => {
  if (text === '') {
    return { ok: false, reason: 'Enter a date or a relative expression like now-30d.' };
  }

  if (isValidIsoDate(text)) {
    return { ok: true, value: { kind: 'absolute', date: text } };
  }

  if (ISO_DATETIME_PREFIX_RE.test(text)) {
    return { ok: false, reason: TIME_UNIT_REASON };
  }

  const match = RELATIVE_EXPRESSION_RE.exec(text);
  if (!match) {
    return { ok: false, reason: `"${text}" isn't a recognised date or expression.` };
  }

  const [, sign, amountText, offsetUnitText, snapUnitText] = match;

  let offset: RangeExpressionOffset | null = null;
  if (sign) {
    const checked = checkUnit(offsetUnitText);
    if (!checked.ok) {
      return checked;
    }
    offset = { sign: sign === '-' ? -1 : 1, amount: Number(amountText), unit: checked.unit };
  }

  let snapUnit: RangeExpressionUnit | null = null;
  if (snapUnitText) {
    const checked = checkUnit(snapUnitText);
    if (!checked.ok) {
      return checked;
    }
    snapUnit = checked.unit;
  }

  return { ok: true, value: { kind: 'relative', offset, snapUnit } };
};

/**
 * Adds a calendar-aware offset to `date`. `d`/`w` are plain day arithmetic; `M`/`y` recompute the
 * target month/year's real length and clamp the day-of-month into it (so July 31 minus one month
 * lands on June 30, not an overflowed July 1) rather than letting `Date` roll the excess forward.
 */
const addOffset = (date: Date, offset: RangeExpressionOffset): Date => {
  const amount = offset.sign * offset.amount;

  switch (offset.unit) {
    case 'd':
      return new Date(date.getTime() + amount * MS_PER_DAY);
    case 'w':
      return new Date(date.getTime() + amount * 7 * MS_PER_DAY);
    case 'M': {
      const day = date.getUTCDate();
      const targetFirst = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + amount, 1));
      const daysInTarget = new Date(
        Date.UTC(targetFirst.getUTCFullYear(), targetFirst.getUTCMonth() + 1, 0),
      ).getUTCDate();
      return new Date(
        Date.UTC(
          targetFirst.getUTCFullYear(),
          targetFirst.getUTCMonth(),
          Math.min(day, daysInTarget),
        ),
      );
    }
    case 'y': {
      const day = date.getUTCDate();
      const month = date.getUTCMonth();
      const targetYear = date.getUTCFullYear() + amount;
      const daysInTarget = new Date(Date.UTC(targetYear, month + 1, 0)).getUTCDate();
      return new Date(Date.UTC(targetYear, month, Math.min(day, daysInTarget)));
    }
  }
};

const UNIT_TO_GRANULARITY: Record<RangeExpressionUnit, Granularity> = {
  d: 'day',
  w: 'week',
  M: 'month',
  y: 'year',
};

/** Snaps `date` to its `unit`'s start (`edge: 'from'`) or end (`edge: 'to'`), reusing the same
 * bucket boundaries chart bucketing uses so "a week" means the same Monday-start span everywhere. */
const snapDate = (date: Date, unit: RangeExpressionUnit, edge: 'from' | 'to'): Date => {
  const granularity = UNIT_TO_GRANULARITY[unit];
  const key = bucketKeyForDate(formatIsoDate(date), granularity);
  const boundaries = bucketDateBoundaries(key, granularity);
  return parseIsoDate(edge === 'from' ? boundaries.start : boundaries.end);
};

/**
 * Resolves a parsed expression to a concrete `YYYY-MM-DD`, relative to an injected `todayIso`
 * (never `Date.now()`, same rule every date-resolving function in `shared/utils` follows). `edge`
 * only affects expressions carrying a
 * snap suffix — it decides whether `now/M` means the first or last day of the current month, which
 * is what makes `now/M … now/M` mean "the whole current month" as a pair of independent calls.
 */
export const resolveRangeExpression = (
  expression: RangeExpression,
  todayIso: string,
  edge: 'from' | 'to',
): string => {
  if (expression.kind === 'absolute') {
    return expression.date;
  }

  let date = parseIsoDate(todayIso);
  if (expression.offset) {
    date = addOffset(date, expression.offset);
  }
  if (expression.snapUnit) {
    date = snapDate(date, expression.snapUnit, edge);
  }
  return formatIsoDate(date);
};

/** Re-serialises a parsed expression to canonical text, so `formatRangeExpression(parsed)` round-trips. */
export const formatRangeExpression = (expression: RangeExpression): string => {
  if (expression.kind === 'absolute') {
    return expression.date;
  }

  let text = 'now';
  if (expression.offset) {
    text += `${expression.offset.sign === -1 ? '-' : '+'}${expression.offset.amount}${expression.offset.unit}`;
  }
  if (expression.snapUnit) {
    text += `/${expression.snapUnit}`;
  }
  return text;
};

const UNIT_LABEL: Record<RangeExpressionUnit, { singular: string; plural: string }> = {
  d: { singular: 'day', plural: 'days' },
  w: { singular: 'week', plural: 'weeks' },
  M: { singular: 'month', plural: 'months' },
  y: { singular: 'year', plural: 'years' },
};

const pluralize = (amount: number, unit: RangeExpressionUnit): string =>
  `${amount} ${amount === 1 ? UNIT_LABEL[unit].singular : UNIT_LABEL[unit].plural}`;

const describeOffsetOnly = (offset: RangeExpressionOffset): string =>
  offset.sign === -1
    ? `Last ${pluralize(offset.amount, offset.unit)}`
    : `Next ${pluralize(offset.amount, offset.unit)}`;

const describeSnapOnly = (snapUnit: RangeExpressionUnit): string =>
  `This ${UNIT_LABEL[snapUnit].singular}`;

const describeOffsetWithSnap = (
  offset: RangeExpressionOffset,
  snapUnit: RangeExpressionUnit,
): string => {
  if (offset.amount === 1 && offset.unit === snapUnit) {
    return offset.sign === -1
      ? `Last ${UNIT_LABEL[snapUnit].singular}`
      : `Next ${UNIT_LABEL[snapUnit].singular}`;
  }

  const direction = offset.sign === -1 ? 'ago' : 'from now';
  return `Start of the ${UNIT_LABEL[snapUnit].singular} ${pluralize(offset.amount, offset.unit)} ${direction}`;
};

/** Plain-language label for a parsed expression, for the picker trigger and recents list — never raw `now-` syntax. */
export const describeRangeExpression = (expression: RangeExpression): string => {
  if (expression.kind === 'absolute') {
    return expression.date;
  }

  const { offset, snapUnit } = expression;

  if (offset && snapUnit) {
    return describeOffsetWithSnap(offset, snapUnit);
  }
  if (offset) {
    return describeOffsetOnly(offset);
  }
  if (snapUnit) {
    return describeSnapOnly(snapUnit);
  }
  return 'Today';
};
