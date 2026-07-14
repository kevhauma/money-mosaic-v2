import { isWithinTrainingWindow, trainingWindowCutoffDate } from './training-window';

const NOW = new Date('2026-07-14T12:00:00.000Z');

describe('trainingWindowCutoffDate', () => {
  it('subtracts N years from "now"', () => {
    expect(trainingWindowCutoffDate(2, NOW)).toBe('2024-07-14');
    expect(trainingWindowCutoffDate(1, NOW)).toBe('2025-07-14');
  });
});

describe('isWithinTrainingWindow', () => {
  it('is always true when trainingWindowYears is null (unrestricted, matches pre-ML-17 behaviour)', () => {
    expect(isWithinTrainingWindow('2010-01-01', null, NOW)).toBe(true);
  });

  it('is true for a date exactly on the cutoff (inclusive)', () => {
    expect(isWithinTrainingWindow('2024-07-14', 2, NOW)).toBe(true);
  });

  it('is true for a date after the cutoff', () => {
    expect(isWithinTrainingWindow('2025-01-01', 2, NOW)).toBe(true);
  });

  it('is false for a date before the cutoff', () => {
    expect(isWithinTrainingWindow('2024-07-13', 2, NOW)).toBe(false);
    expect(isWithinTrainingWindow('2010-01-01', 2, NOW)).toBe(false);
  });
});
