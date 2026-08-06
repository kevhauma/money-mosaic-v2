import { cycleColumnIndex, cycleColumnKeys, cycleColumnLabels } from './calendar-cycles';
import { syncFormatSettings } from './format-settings';
import { withCleanFormatSettings } from './format-settings.testing';

describe('cycleColumnKeys', () => {
  it('gives all seven weekdays, Monday first', () => {
    expect(cycleColumnKeys('day-of-week')).toEqual([
      'mon',
      'tue',
      'wed',
      'thu',
      'fri',
      'sat',
      'sun',
    ]);
  });

  it('gives all 31 days of the month, in order', () => {
    const keys = cycleColumnKeys('day-of-month');

    expect(keys).toHaveLength(31);
    expect(keys[0]).toBe('1');
    expect(keys[30]).toBe('31');
  });

  it('gives all twelve months, January first', () => {
    const keys = cycleColumnKeys('month-of-year');

    expect(keys).toHaveLength(12);
    expect(keys[0]).toBe('jan');
    expect(keys[11]).toBe('dec');
  });

  it('gives four quarters, Q1 first', () => {
    expect(cycleColumnKeys('quarter-of-year')).toEqual(['q1', 'q2', 'q3', 'q4']);
  });

  it('returns a fresh array each call, safe for a caller to mutate', () => {
    expect(cycleColumnKeys('day-of-week')).not.toBe(cycleColumnKeys('day-of-week'));
  });
});

describe('cycleColumnLabels', () => {
  withCleanFormatSettings();

  it('labels weekdays and months in words, days and quarters as numerals', () => {
    expect(cycleColumnLabels('day-of-week')[0]).toBe('Mon');
    expect(cycleColumnLabels('day-of-week')[6]).toBe('Sun');
    expect(cycleColumnLabels('month-of-year')[0]).toBe('Jan');
    expect(cycleColumnLabels('month-of-year')[11]).toBe('Dec');
    expect(cycleColumnLabels('day-of-month')[0]).toBe('1');
    expect(cycleColumnLabels('quarter-of-year')).toEqual(['Q1', 'Q2', 'Q3', 'Q4']);
  });

  it('gives one label per column, for every cycle', () => {
    for (const cycle of [
      'day-of-week',
      'day-of-month',
      'month-of-year',
      'quarter-of-year',
    ] as const) {
      expect(cycleColumnLabels(cycle), cycle).toHaveLength(cycleColumnKeys(cycle).length);
    }
  });

  it('labels in the chosen locale rather than always in English', () => {
    syncFormatSettings({ locale: 'nl-BE' });

    expect(cycleColumnLabels('month-of-year')[2].toLowerCase()).toContain('mrt');
    expect(cycleColumnLabels('day-of-week')[0].toLowerCase()).toContain('ma');
  });
});

describe('cycleColumnIndex', () => {
  it('puts a date in its Monday-first weekday column, on the UTC calendar date', () => {
    expect(cycleColumnIndex('2026-07-06', 'day-of-week')).toBe(0); // Monday
    expect(cycleColumnIndex('2026-07-12', 'day-of-week')).toBe(6); // Sunday
  });

  it('puts a date in its day-of-month column, February 29th included', () => {
    expect(cycleColumnIndex('2026-07-06', 'day-of-month')).toBe(5);
    expect(cycleColumnIndex('2028-02-29', 'day-of-month')).toBe(28);
    expect(cycleColumnIndex('2026-07-31', 'day-of-month')).toBe(30);
  });

  it('folds the same month or quarter of different years into one column', () => {
    expect(cycleColumnIndex('2025-01-15', 'month-of-year')).toBe(0);
    expect(cycleColumnIndex('2026-01-15', 'month-of-year')).toBe(0);
    expect(cycleColumnIndex('2026-12-31', 'month-of-year')).toBe(11);

    expect(cycleColumnIndex('2026-03-31', 'quarter-of-year')).toBe(0);
    expect(cycleColumnIndex('2026-04-01', 'quarter-of-year')).toBe(1);
    expect(cycleColumnIndex('2026-11-01', 'quarter-of-year')).toBe(3);
  });
});
