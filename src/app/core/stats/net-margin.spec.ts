import { computeNetMargin } from './net-margin';

describe('computeNetMargin', () => {
  it('returns a positive margin when net is positive', () => {
    expect(computeNetMargin(300, 1000)).toBe(0.3);
  });

  it('returns a negative margin when net is negative (overspent)', () => {
    expect(computeNetMargin(-120, 1000)).toBe(-0.12);
  });

  it('returns zero (not negative) when net is exactly zero', () => {
    expect(computeNetMargin(0, 1000)).toBe(0);
  });

  it('returns null when income is zero, rather than dividing by zero', () => {
    expect(computeNetMargin(-50, 0)).toBeNull();
  });
});
