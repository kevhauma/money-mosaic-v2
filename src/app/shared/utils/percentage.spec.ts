import { fractionToPercentage, percentageToFraction } from './percentage';

describe('percentage conversion', () => {
  it('converts a percentage to its fraction', () => {
    expect(percentageToFraction(50)).toBe(0.5);
    expect(percentageToFraction(33)).toBe(0.33);
    expect(percentageToFraction(100)).toBe(1);
  });

  it('converts a fraction to its rounded percentage', () => {
    expect(fractionToPercentage(0.5)).toBe(50);
    expect(fractionToPercentage(1 / 3)).toBe(33);
    expect(fractionToPercentage(1)).toBe(100);
  });
});
