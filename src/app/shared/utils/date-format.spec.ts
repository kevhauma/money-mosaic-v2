import { formatDate, formatMonthName, formatMonthShort, formatWeekdayShort } from './date-format';
import { syncFormatSettings } from './format-settings';
import { withCleanFormatSettings } from './format-settings.testing';

describe('formatDate', () => {
  withCleanFormatSettings();

  it('formats an ISO date under the default (en-US) locale as MM/DD/YYYY', () => {
    expect(formatDate('2026-07-26')).toBe('07/26/2026');
  });

  it('reformats the same date under a different locale (en-BE) as DD/MM/YYYY', () => {
    syncFormatSettings({ locale: 'en-BE' });
    expect(formatDate('2026-07-26')).toBe('26/07/2026');
  });

  it('falls back to the default locale when set to an empty string', () => {
    syncFormatSettings({ locale: '' });
    expect(formatDate('2026-07-26')).toBe('07/26/2026');
  });
});

describe('formatMonthShort', () => {
  withCleanFormatSettings();

  it('gives the abbreviated month alone, with no day and no year', () => {
    expect(formatMonthShort('2026-07-26')).toBe('Jul');
    expect(formatMonthShort('2026-03-01')).toBe('Mar');
  });

  it('takes the month from the ISO string in UTC, not the runner’s timezone', () => {
    // A date parsed as local time would roll back to December in any timezone behind UTC.
    expect(formatMonthShort('2026-01-01')).toBe('Jan');
  });

  it('abbreviates in the chosen locale rather than always in English', () => {
    syncFormatSettings({ locale: 'nl-BE' });

    expect(formatMonthShort('2026-03-01').toLowerCase()).toContain('mrt');
  });

  it('falls back to the default locale when set to an empty string', () => {
    syncFormatSettings({ locale: '' });
    expect(formatMonthShort('2026-07-26')).toBe('Jul');
  });
});

describe('formatMonthName', () => {
  withCleanFormatSettings();

  it('gives the full month name from a 1-12 number, with no day and no year', () => {
    expect(formatMonthName(4)).toBe('April');
    expect(formatMonthName(12)).toBe('December');
  });

  it('names January from month number 1, not December from an off-by-one', () => {
    expect(formatMonthName(1)).toBe('January');
  });

  it('names the month in the chosen locale rather than always in English', () => {
    syncFormatSettings({ locale: 'nl-BE' });

    expect(formatMonthName(3).toLowerCase()).toContain('maart');
  });

  it('falls back to the default locale when set to an empty string', () => {
    syncFormatSettings({ locale: '' });
    expect(formatMonthName(7)).toBe('July');
  });
});

describe('formatWeekdayShort', () => {
  withCleanFormatSettings();

  it('gives the abbreviated weekday alone, with no date', () => {
    // 2026-07-26 is a Sunday, 2026-07-27 a Monday.
    expect(formatWeekdayShort('2026-07-26')).toBe('Sun');
    expect(formatWeekdayShort('2026-07-27')).toBe('Mon');
  });

  it('takes the weekday from the ISO string in UTC, not the runner’s timezone', () => {
    // Parsed as local time in any timezone behind UTC, this would roll back to Sunday.
    expect(formatWeekdayShort('2026-01-05')).toBe('Mon');
  });

  it('abbreviates in the chosen locale rather than always in English', () => {
    syncFormatSettings({ locale: 'nl-BE' });

    expect(formatWeekdayShort('2026-07-27').toLowerCase()).toContain('ma');
  });

  it('falls back to the default locale when set to an empty string', () => {
    syncFormatSettings({ locale: '' });
    expect(formatWeekdayShort('2026-07-27')).toBe('Mon');
  });
});
