import { formatDate, formatMonthShort } from './date-format';
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
