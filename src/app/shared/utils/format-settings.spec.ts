import { formatCurrency } from './currency-format';
import { formatDate } from './date-format';
import { DEFAULT_LOCALE, locale, syncFormatSettings } from './format-settings';
import { withCleanFormatSettings } from './format-settings.testing';

/**
 * The *default* formatting locale, asserted in one place (TICKET-SET-10) rather than incidentally
 * across the component suite — which is how `en-US` came to be pinned by ~40 spec files that were
 * never about locale at all.
 */
describe('format settings defaults (TICKET-SET-10)', () => {
  withCleanFormatSettings();

  it('resolves empty settings to the Belgian default, not a US one', () => {
    syncFormatSettings({});

    expect(DEFAULT_LOCALE).toBe('en-BE');
    expect(locale()).toBe('en-BE');
  });

  it('renders a fresh install day-first, with EUR-style number grouping', () => {
    syncFormatSettings({});

    expect(formatDate('2026-07-26')).toBe('26/07/2026');
    expect(formatCurrency(1234.56)).toBe('€1.234,56');
  });

  it('lets a stored locale setting win over the default', () => {
    syncFormatSettings({ locale: 'en-US' });

    expect(locale()).toBe('en-US');
    expect(formatDate('2026-07-26')).toBe('07/26/2026');
  });

  it.each([undefined, ''])(
    'falls back to the Belgian default rather than throwing for a %p locale',
    (stored) => {
      expect(() => syncFormatSettings({ locale: stored })).not.toThrow();
      expect(locale()).toBe(DEFAULT_LOCALE);
    },
  );

  it('ignores navigator.language, so a browser reporting en-US changes nothing', () => {
    // The half of TICKET-SET-10's "to-be" that was deliberately not built: the browser language of
    // a Belgian user is routinely `en-US`, and `en-US` is a supported preset, so detection would
    // hand that user back the exact month-first ordering the ticket exists to remove.
    vi.spyOn(navigator, 'language', 'get').mockReturnValue('en-US');

    syncFormatSettings({});

    expect(locale()).toBe('en-BE');
  });
});
