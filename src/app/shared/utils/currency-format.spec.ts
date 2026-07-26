import {
  DEFAULT_CURRENCY_SYMBOL,
  DEFAULT_CURRENCY_SYMBOL_POSITION,
  formatCurrency,
  setCurrencySymbol,
  setCurrencySymbolPosition,
} from './currency-format';

describe('formatCurrency', () => {
  // Vitest runs this suite with isolate:false, so the module-level symbol/position signals
  // persist across spec files unless reset here (TICKET-SET-03).
  beforeEach(() => {
    setCurrencySymbol(DEFAULT_CURRENCY_SYMBOL);
    setCurrencySymbolPosition(DEFAULT_CURRENCY_SYMBOL_POSITION);
  });

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
    setCurrencySymbol('$');
    expect(formatCurrency(1234.56)).toBe('$1,234.56');
  });

  it('reflects a changed symbol position', () => {
    setCurrencySymbol('$');
    setCurrencySymbolPosition('after');
    expect(formatCurrency(1234.56)).toBe('1,234.56$');
  });

  it('the signed variant places the sign before the number even with a custom symbol/position', () => {
    setCurrencySymbol('kr');
    setCurrencySymbolPosition('after');
    expect(formatCurrency(-500, { signed: true })).toBe('-500.00kr');
  });

  it('the default-unset case still formats with the euro sign in front (regression)', () => {
    expect(formatCurrency(1234.56)).toBe('€1,234.56');
  });
});
