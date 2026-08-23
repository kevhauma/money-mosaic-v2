import { moneyColor, negativeMoneyColor } from './money-color';

describe('moneyColor (TICKET-UI-27)', () => {
  it('resolves a positive amount to the positive token and a negative one to the negative token', () => {
    expect(moneyColor(16898.26)).toBe('money-positive');
    expect(moneyColor(-42.5)).toBe('money-negative');
  });

  it('treats zero as positive — a €0.00 balance is not a loss', () => {
    expect(moneyColor(0)).toBe('money-positive');
    expect(moneyColor(-0)).toBe('money-positive');
  });

  it('never returns a daisyUI palette name, which is the whole point', () => {
    // `primary` on the Net worth tile is what painted a positive figure in the loss red; `error` was
    // five hue degrees away from it in both default themes.
    expect([moneyColor(1), moneyColor(-1)]).not.toContain('primary');
    expect([moneyColor(1), moneyColor(-1)]).not.toContain('error');
  });
});

describe('negativeMoneyColor (TICKET-UI-27)', () => {
  it('marks only losses, leaving a positive amount in the body ink', () => {
    expect(negativeMoneyColor(-0.01)).toBe('money-negative');
    expect(negativeMoneyColor(0)).toBeUndefined();
    expect(negativeMoneyColor(1234.5)).toBeUndefined();
  });
});
