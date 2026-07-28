import { formatDate } from './date-format';
import { DEFAULT_LOCALE, syncFormatSettings } from './format-settings';

describe('formatDate', () => {
  // Vitest runs this suite with isolate:false, so the module-level locale signal persists across
  // spec files unless reset here (TICKET-SET-04/TICKET-NG-10).
  beforeEach(() => {
    syncFormatSettings({ locale: DEFAULT_LOCALE });
  });

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
