import { computeAmortizationSchedule } from './amortization';

describe('computeAmortizationSchedule (TICKET-LOAN-04)', () => {
  it('computes a known textbook mortgage schedule (200000 principal, 6% annual, 360 months)', () => {
    const schedule = computeAmortizationSchedule(200000, 6, 360, '2024-01-01');

    expect(schedule).toHaveLength(360);
    expect(schedule[0].payment).toBeCloseTo(1199.1, 1);
    expect(schedule[0].interestPortion).toBeCloseTo(1000, 5);
    expect(schedule[0].principalPortion).toBeCloseTo(199.1, 1);
    expect(schedule.at(-1)?.remainingBalance).toBe(0);
  });

  it('computes a known textbook auto-loan schedule (20000 principal, 5% annual, 60 months) — same function proving type-agnosticism', () => {
    const schedule = computeAmortizationSchedule(20000, 5, 60, '2024-01-01');

    expect(schedule).toHaveLength(60);
    expect(schedule[0].payment).toBeCloseTo(377.42, 2);
    expect(schedule.at(-1)?.remainingBalance).toBe(0);
  });

  it('handles a 0% interest rate without dividing by zero (pure linear amortization)', () => {
    const schedule = computeAmortizationSchedule(1200, 0, 12, '2024-01-01');

    expect(schedule).toHaveLength(12);
    for (const entry of schedule) {
      expect(entry.interestPortion).toBe(0);
      expect(entry.payment).toBeCloseTo(100, 6);
    }
    expect(schedule.at(-1)?.remainingBalance).toBe(0);
  });

  it('handles a 1-month term as a single payment of principal plus one month of interest', () => {
    const schedule = computeAmortizationSchedule(1000, 6, 1, '2024-01-01');

    expect(schedule).toHaveLength(1);
    expect(schedule[0].month).toBe(1);
    expect(schedule[0].interestPortion).toBeCloseTo(5, 6); // 1000 * (6%/12)
    expect(schedule[0].principalPortion).toBeCloseTo(1000, 6);
    expect(schedule[0].remainingBalance).toBe(0);
  });

  it('sums principalPortion to exactly the original principal, within floating-point tolerance', () => {
    const schedule = computeAmortizationSchedule(200000, 6, 360, '2024-01-01');

    const totalPrincipal = schedule.reduce((sum, entry) => sum + entry.principalPortion, 0);
    expect(totalPrincipal).toBeCloseTo(200000, 6);
  });

  it('advances each entry date from startDate by that many calendar months', () => {
    const schedule = computeAmortizationSchedule(1000, 6, 3, '2024-01-15');

    expect(schedule.map((entry) => entry.date)).toEqual(['2024-02-15', '2024-03-15', '2024-04-15']);
  });

  it('takes no loanType or mortgage-specific parameter — same call shape for every loan type', () => {
    // Type-level assertion: the function has exactly four parameters, none of them loanType.
    expect(computeAmortizationSchedule.length).toBe(4);
  });
});
