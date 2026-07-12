import { categoryKindContribution } from './category-kind-contribution';

describe('categoryKindContribution', () => {
  it('nets an expense-kind spend (negative amount) upward into expense', () => {
    expect(categoryKindContribution(-30, 'expense')).toEqual({ bucket: 'expense', amount: 30 });
  });

  it('nets an expense-kind refund/payback (positive amount) downward against expense', () => {
    expect(categoryKindContribution(10, 'expense')).toEqual({ bucket: 'expense', amount: -10 });
  });

  it('nets an income-kind receipt (positive amount) upward into income', () => {
    expect(categoryKindContribution(2000, 'income')).toEqual({ bucket: 'income', amount: 2000 });
  });

  it('nets an income-kind clawback (negative amount) downward against income', () => {
    expect(categoryKindContribution(-100, 'income')).toEqual({ bucket: 'income', amount: -100 });
  });

  it('excludes a neutral-kind category entirely', () => {
    expect(categoryKindContribution(500, 'neutral')).toBeNull();
    expect(categoryKindContribution(-500, 'neutral')).toBeNull();
  });

  it('falls back to raw amount sign when there is no resolvable category', () => {
    expect(categoryKindContribution(500, undefined)).toEqual({ bucket: 'income', amount: 500 });
    expect(categoryKindContribution(-30, undefined)).toEqual({ bucket: 'expense', amount: 30 });
  });

  it('returns null for a zero-amount, uncategorised transaction', () => {
    expect(categoryKindContribution(0, undefined)).toBeNull();
  });
});
