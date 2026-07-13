import { formatCurrency } from './currency-format';

describe('formatCurrency', () => {
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
});
