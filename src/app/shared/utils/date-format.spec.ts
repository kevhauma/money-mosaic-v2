import { DEFAULT_LOCALE } from './currency-format';
import { formatDate, setDateLocale } from './date-format';

describe('formatDate', () => {
  // Vitest runs this suite with isolate:false, so the module-level locale signal persists across
  // spec files unless reset here (TICKET-SET-04).
  beforeEach(() => {
    setDateLocale(DEFAULT_LOCALE);
  });

  it('formats an ISO date under the default (en-US) locale as MM/DD/YYYY', () => {
    expect(formatDate('2026-07-26')).toBe('07/26/2026');
  });

  it('reformats the same date under a different locale (en-BE) as DD/MM/YYYY', () => {
    setDateLocale('en-BE');
    expect(formatDate('2026-07-26')).toBe('26/07/2026');
  });

  it('falls back to the default locale when set to an empty string', () => {
    setDateLocale('en-BE');
    setDateLocale('');
    expect(formatDate('2026-07-26')).toBe('07/26/2026');
  });
});
