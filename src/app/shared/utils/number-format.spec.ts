import { formatPercent, formatRatio, PERCENT_FORMATTER } from './number-format';
import { syncFormatSettings } from './format-settings';
import { withCleanFormatSettings } from './format-settings.testing';

describe('formatPercent', () => {
  withCleanFormatSettings();

  describe('default variant', () => {
    it('formats with 1 fraction digit and a sign under the default locale', () => {
      expect(formatPercent(0.4321)).toBe('43,2%');
      expect(formatPercent(-0.05)).toBe('-5%');
    });

    it('reflects a changed locale (en-BE grouping)', () => {
      syncFormatSettings({ locale: 'en-BE' });
      expect(formatPercent(1234.5)).toBe('123.450%');
    });
  });

  describe('sign-by-icon variant', () => {
    it('rounds to a whole percent and never shows a sign', () => {
      expect(formatPercent(0.4321, 'sign-by-icon')).toBe('43%');
      expect(formatPercent(-0.05, 'sign-by-icon')).toBe('5%');
    });

    it('reflects a changed locale the same way as the default variant', () => {
      syncFormatSettings({ locale: 'en-BE' });
      expect(formatPercent(-0.05, 'sign-by-icon')).toBe('5%');
    });
  });

  describe('signed variant', () => {
    it('shows an explicit + on a rise, a - on a drop, and neither on no change', () => {
      expect(formatPercent(0.082, 'signed')).toBe('+8,2%');
      expect(formatPercent(-0.25, 'signed')).toBe('-25%');
      expect(formatPercent(0, 'signed')).toBe('0%');
    });

    it('reflects a changed locale the same way as the default variant', () => {
      syncFormatSettings({ locale: 'en-BE' });
      expect(formatPercent(1234.5, 'signed')).toBe('+123.450%');
    });
  });

  it('reuses the same Intl.NumberFormat instance until the locale changes, then rebuilds it', () => {
    // `PERCENT_FORMATTER` is exported (over `currency-format.ts`'s private-formatter precedent)
    // specifically so this can assert on instance identity — `Intl.NumberFormat` can't be reliably
    // `vi.spyOn`-ed as a constructor to count rebuilds instead.
    const first = PERCENT_FORMATTER();
    const second = PERCENT_FORMATTER();
    expect(second).toBe(first); // same locale — memoized, not rebuilt

    syncFormatSettings({ locale: 'fr-FR' });
    const third = PERCENT_FORMATTER();
    expect(third).not.toBe(first); // locale changed — rebuilt

    const fourth = PERCENT_FORMATTER();
    expect(fourth).toBe(third); // new locale, read again — memoized again
  });
});

describe('formatRatio', () => {
  withCleanFormatSettings();

  it('rounds to 1 fraction digit under the default locale', () => {
    expect(formatRatio(1.048)).toBe('1');
    expect(formatRatio(2.34)).toBe('2,3');
  });

  it('reflects a changed locale (en-BE grouping)', () => {
    syncFormatSettings({ locale: 'en-BE' });
    expect(formatRatio(1234.5)).toBe('1.234,5');
  });
});
