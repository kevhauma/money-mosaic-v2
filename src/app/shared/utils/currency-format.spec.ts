import { formatCurrency } from './currency-format';
import { syncFormatSettings } from './format-settings';
import { withCleanFormatSettings } from './format-settings.testing';

describe('formatCurrency', () => {
  // Both directions matter here: this suite's last test leaves `en-BE`/`$` set, and those signals
  // are process-global under isolate:false (TICKET-SET-03/TICKET-SET-04/TICKET-NG-10).
  withCleanFormatSettings();

  it('rounds to exactly 2 decimals for values with more precision', () => {
    expect(formatCurrency(1234.5600000000002)).toBe('€1.234,56');
  });

  it('formats negative values correctly', () => {
    expect(formatCurrency(-1234.56)).toBe('-€1.234,56');
  });

  it('the signed variant always shows a sign', () => {
    expect(formatCurrency(500, { signed: true })).toBe('+€500,00');
    expect(formatCurrency(-500, { signed: true })).toBe('-€500,00');
    expect(formatCurrency(0, { signed: true })).toBe('+€0,00');
  });

  it('the whole variant drops the cents rather than showing .00', () => {
    expect(formatCurrency(1234.56, { whole: true })).toBe('€1.235');
    expect(formatCurrency(1234.4, { whole: true })).toBe('€1.234');
    expect(formatCurrency(-1234.56, { whole: true })).toBe('-€1.235');
  });

  it('the whole variant wins over signed — there is no signed-whole formatter to fall back to', () => {
    expect(formatCurrency(500, { whole: true, signed: true })).toBe('€500');
  });

  it('the whole variant honours a changed symbol/position/locale like every other variant', () => {
    syncFormatSettings({ locale: 'en-BE', currencySymbol: 'kr', currencySymbolPosition: 'after' });
    expect(formatCurrency(1234.56, { whole: true })).toBe('1.235kr');
  });

  it('reflects a changed currency symbol', () => {
    syncFormatSettings({ currencySymbol: '$' });
    expect(formatCurrency(1234.56)).toBe('$1.234,56');
  });

  it('reflects a changed symbol position', () => {
    syncFormatSettings({ currencySymbol: '$', currencySymbolPosition: 'after' });
    expect(formatCurrency(1234.56)).toBe('1.234,56$');
  });

  it('the signed variant places the sign before the number even with a custom symbol/position', () => {
    syncFormatSettings({ currencySymbol: 'kr', currencySymbolPosition: 'after' });
    expect(formatCurrency(-500, { signed: true })).toBe('-500,00kr');
  });

  it('the default-unset case still formats with the euro sign in front (regression)', () => {
    expect(formatCurrency(1234.56)).toBe('€1.234,56');
  });

  it('the default-unset locale groups en-BE style (TICKET-SET-10 regression)', () => {
    // Period thousands, comma decimal — how the app's Belgian user reads a number. This was
    // `€1,234.56` while `DEFAULT_LOCALE` was `en-US` (TICKET-SET-04).
    expect(formatCurrency(1234.56)).toBe('€1.234,56');
  });

  it('reflects a changed locale — en-US grouping (comma thousands, period decimal)', () => {
    syncFormatSettings({ locale: 'en-US' });
    expect(formatCurrency(1234.56)).toBe('€1,234.56');
  });

  it('combines a changed locale and currency symbol together', () => {
    syncFormatSettings({ locale: 'en-US', currencySymbol: '$' });
    expect(formatCurrency(1234.56)).toBe('$1,234.56');
  });
});
