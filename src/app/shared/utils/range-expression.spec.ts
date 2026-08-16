import {
  describeRangeExpression,
  formatRangeExpression,
  parseRangeExpression,
  resolveRangeExpression,
} from './range-expression';
import type { RangeExpression } from './range-expression';

const ACCEPTED_FORMS = [
  'now',
  'now-30d',
  'now+1w',
  'now-6M',
  'now-2y',
  'now/M',
  'now-1M/M',
  'now/w',
  'now/y',
  '2026-01-15',
];

const REJECTED_FORMS = [
  'now-6h',
  'now-15m',
  'now-30s',
  '2025-07-10 15:00',
  'now/h',
  'now-',
  'now-xd',
  'tomorrow',
  '',
];

const expectParsed = (text: string): RangeExpression => {
  const result = parseRangeExpression(text);
  if (!result.ok) {
    throw new Error(`expected "${text}" to parse, got reason: ${result.reason}`);
  }
  return result.value;
};

describe('parseRangeExpression', () => {
  it.each(ACCEPTED_FORMS)('accepts "%s"', (text) => {
    expect(parseRangeExpression(text).ok).toBe(true);
  });

  it.each(REJECTED_FORMS)('rejects "%s" with a non-empty reason', (text) => {
    const result = parseRangeExpression(text);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason.length).toBeGreaterThan(0);
    }
  });

  it.each(['now-6h', 'now-15m', 'now-30s', 'now/h'])(
    'rejects "%s" with a reason naming whole-day granularity',
    (text) => {
      const result = parseRangeExpression(text);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toMatch(/whole days/);
      }
    },
  );

  it('parses "now" as a relative expression with no offset and no snap', () => {
    expect(expectParsed('now')).toEqual({ kind: 'relative', offset: null, snapUnit: null });
  });

  it('parses "now-30d" as a negative day offset with no snap', () => {
    expect(expectParsed('now-30d')).toEqual({
      kind: 'relative',
      offset: { sign: -1, amount: 30, unit: 'd' },
      snapUnit: null,
    });
  });

  it('parses "now-1M/M" as an offset plus a snap', () => {
    expect(expectParsed('now-1M/M')).toEqual({
      kind: 'relative',
      offset: { sign: -1, amount: 1, unit: 'M' },
      snapUnit: 'M',
    });
  });

  it('parses a bare YYYY-MM-DD as an absolute expression', () => {
    expect(expectParsed('2026-01-15')).toEqual({ kind: 'absolute', date: '2026-01-15' });
  });

  it('rejects "now-6m" (lowercase, minutes) rather than silently treating it as months', () => {
    const result = parseRangeExpression('now-6m');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toMatch(/whole days/);
    }
  });
});

describe('resolveRangeExpression', () => {
  it('resolves "now" to todayIso regardless of edge', () => {
    expect(resolveRangeExpression(expectParsed('now'), '2026-07-15', 'from')).toBe('2026-07-15');
    expect(resolveRangeExpression(expectParsed('now'), '2026-07-15', 'to')).toBe('2026-07-15');
  });

  it('resolves an absolute expression to itself regardless of edge or todayIso', () => {
    const expr = expectParsed('2026-01-15');
    expect(resolveRangeExpression(expr, '2026-07-15', 'from')).toBe('2026-01-15');
    expect(resolveRangeExpression(expr, '2026-07-15', 'to')).toBe('2026-01-15');
  });

  it('resolves "now-30d" as a plain day offset', () => {
    expect(resolveRangeExpression(expectParsed('now-30d'), '2026-07-15', 'from')).toBe(
      '2026-06-15',
    );
  });

  it('resolves "now+1w" as a plain week offset', () => {
    expect(resolveRangeExpression(expectParsed('now+1w'), '2026-07-15', 'to')).toBe('2026-07-22');
  });

  it('resolves "now-6M" with day-of-month clamped into the target month', () => {
    expect(resolveRangeExpression(expectParsed('now-6M'), '2026-07-15', 'from')).toBe('2026-01-15');
  });

  it('resolves "now-2y" as a plain year offset', () => {
    expect(resolveRangeExpression(expectParsed('now-2y'), '2026-07-15', 'from')).toBe('2024-07-15');
  });

  it('snaps "now/M" to the month start for edge "from" and the month end for edge "to"', () => {
    const expr = expectParsed('now/M');
    expect(resolveRangeExpression(expr, '2026-07-15', 'from')).toBe('2026-07-01');
    expect(resolveRangeExpression(expr, '2026-07-15', 'to')).toBe('2026-07-31');
  });

  it('resolves "now/M … now/M" as the whole current month', () => {
    const expr = expectParsed('now/M');
    const from = resolveRangeExpression(expr, '2026-02-10', 'from');
    const to = resolveRangeExpression(expr, '2026-02-10', 'to');
    expect(from).toBe('2026-02-01');
    expect(to).toBe('2026-02-28');
  });

  it('resolves "now-1M/M" to the previous month\'s true boundaries across a year boundary', () => {
    const expr = expectParsed('now-1M/M');
    expect(resolveRangeExpression(expr, '2026-01-15', 'from')).toBe('2025-12-01');
    expect(resolveRangeExpression(expr, '2026-01-15', 'to')).toBe('2025-12-31');
  });

  it('resolves "now-1M/M" into a 28-day February', () => {
    const expr = expectParsed('now-1M/M');
    expect(resolveRangeExpression(expr, '2026-03-15', 'from')).toBe('2026-02-01');
    expect(resolveRangeExpression(expr, '2026-03-15', 'to')).toBe('2026-02-28');
  });

  it('resolves "now-1M/M" into a 29-day (leap) February', () => {
    const expr = expectParsed('now-1M/M');
    expect(resolveRangeExpression(expr, '2028-03-15', 'from')).toBe('2028-02-01');
    expect(resolveRangeExpression(expr, '2028-03-15', 'to')).toBe('2028-02-29');
  });

  it('snaps "now/w" to Monday-start weeks, matching isoWeekStart', () => {
    // 2026-07-19 is a Sunday; its ISO week runs Monday 2026-07-13 .. Sunday 2026-07-19.
    const expr = expectParsed('now/w');
    expect(resolveRangeExpression(expr, '2026-07-19', 'from')).toBe('2026-07-13');
    expect(resolveRangeExpression(expr, '2026-07-19', 'to')).toBe('2026-07-19');
  });

  it('snaps "now/y" to the calendar year boundaries', () => {
    const expr = expectParsed('now/y');
    expect(resolveRangeExpression(expr, '2026-07-15', 'from')).toBe('2026-01-01');
    expect(resolveRangeExpression(expr, '2026-07-15', 'to')).toBe('2026-12-31');
  });

  it('never reads Date.now() — resolution depends only on the injected todayIso', () => {
    const expr = expectParsed('now-30d');
    expect(resolveRangeExpression(expr, '2020-01-31', 'from')).toBe('2020-01-01');
  });
});

describe('formatRangeExpression', () => {
  it.each(ACCEPTED_FORMS)('round-trips "%s" through parse and format', (text) => {
    const parsed = expectParsed(text);
    expect(formatRangeExpression(parsed)).toBe(text);
  });
});

describe('describeRangeExpression', () => {
  it.each(ACCEPTED_FORMS)('returns a non-empty label with no raw now- syntax for "%s"', (text) => {
    const label = describeRangeExpression(expectParsed(text));
    expect(label.length).toBeGreaterThan(0);
    expect(label).not.toMatch(/now[-+/]/);
  });

  it('describes "now" as "Today"', () => {
    expect(describeRangeExpression(expectParsed('now'))).toBe('Today');
  });

  it('describes "now-30d" as a "Last N days" label', () => {
    expect(describeRangeExpression(expectParsed('now-30d'))).toBe('Last 30 days');
  });

  it('describes "now/M" as "This month"', () => {
    expect(describeRangeExpression(expectParsed('now/M'))).toBe('This month');
  });

  it('describes "now-1M/M" as "Last month"', () => {
    expect(describeRangeExpression(expectParsed('now-1M/M'))).toBe('Last month');
  });
});
