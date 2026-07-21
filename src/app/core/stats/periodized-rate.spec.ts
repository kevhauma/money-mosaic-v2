import { computePeriodizedRate } from './periodized-rate';

describe('computePeriodizedRate', () => {
  it('returns day only for a 3-day range spanning a single week and month', () => {
    expect(computePeriodizedRate(180, '2026-07-13', '2026-07-15')).toEqual({
      avgPerDay: 60,
      avgPerWeek: null,
      avgPerMonth: null,
    });
  });

  it('returns day + week for a 10-day range spanning two weeks but one month', () => {
    expect(computePeriodizedRate(300, '2026-07-01', '2026-07-10')).toEqual({
      avgPerDay: 30,
      avgPerWeek: 150,
      avgPerMonth: null,
    });
  });

  it('returns day + week + month for a 2-month range', () => {
    expect(computePeriodizedRate(930, '2026-07-01', '2026-08-31')).toEqual({
      avgPerDay: 15,
      avgPerWeek: 93,
      avgPerMonth: 465,
    });
  });

  it('returns day only for a short all-time history that never reaches 2 week/month buckets', () => {
    expect(computePeriodizedRate(60, '2026-07-01', '2026-07-02')).toEqual({
      avgPerDay: 30,
      avgPerWeek: null,
      avgPerMonth: null,
    });
  });

  it('is generic over the figure — works identically for an income total, not just expense (TICKET-STAT-21)', () => {
    expect(computePeriodizedRate(930, '2026-07-01', '2026-08-31')).toEqual({
      avgPerDay: 15,
      avgPerWeek: 93,
      avgPerMonth: 465,
    });
  });

  it('week gating boundary: a range spanning exactly 2 week buckets reports avgPerWeek, 1 does not', () => {
    expect(computePeriodizedRate(60, '2026-07-13', '2026-07-15').avgPerWeek).toBeNull();
    expect(computePeriodizedRate(300, '2026-07-01', '2026-07-10').avgPerWeek).toBe(150);
  });
});
