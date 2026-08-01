import { formatCurrency } from './currency-format';
import { syncFormatSettings } from './format-settings';
import { withCleanFormatSettings } from './format-settings.testing';

describe('formatCurrency', () => {
  // Both directions matter here: this suite's last test leaves `en-BE`/`$` set, and those signals
  // are process-global under isolate:false (TICKET-SET-03/TICKET-SET-04/TICKET-NG-10).
  withCleanFormatSettings();

  it('rounds to exactly 2 decimals for values with more precision', () => {
    expect(formatCurrency(1234.5600000000002)).toBe('€1,234.56');
  });

  it('formats negative values correctly', () => {
    expect(formatCurrency(-1234.56)).toBe('-€1,234.56');
  });

  it('the signed variant always shows a sign', () => {
    expect(formatCurrency(500, { signed: true })).toBe('+€500.00');
    expect(formatCurrency(-500, { signed: true })).toBe('-€500.00');
    expect(formatCurrency(0, { signed: true })).toBe('+€0.00');
  });

  it('reflects a changed currency symbol', () => {
    syncFormatSettings({ currencySymbol: '$' });
    expect(formatCurrency(1234.56)).toBe('$1,234.56');
  });

  it('reflects a changed symbol position', () => {
    syncFormatSettings({ currencySymbol: '$', currencySymbolPosition: 'after' });
    expect(formatCurrency(1234.56)).toBe('1,234.56$');
  });

  it('the signed variant places the sign before the number even with a custom symbol/position', () => {
    syncFormatSettings({ currencySymbol: 'kr', currencySymbolPosition: 'after' });
    expect(formatCurrency(-500, { signed: true })).toBe('-500.00kr');
  });

  it('the default-unset case still formats with the euro sign in front (regression)', () => {
    expect(formatCurrency(1234.56)).toBe('€1,234.56');
  });

  it('the default-unset locale groups en-US style (regression)', () => {
    expect(formatCurrency(1234.56)).toBe('€1,234.56');
  });

  it('reflects a changed locale — en-BE grouping (period thousands, comma decimal)', () => {
    syncFormatSettings({ locale: 'en-BE' });
    expect(formatCurrency(1234.56)).toBe('€1.234,56');
  });

  it('combines a changed locale and currency symbol together', () => {
    syncFormatSettings({ locale: 'en-BE', currencySymbol: '$' });
    expect(formatCurrency(1234.56)).toBe('$1.234,56');
  });
});
