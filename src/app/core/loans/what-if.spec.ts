import type { Loan, LoanType } from '@/core/data-access';
import type { LoanProgress } from './loan-progress';
import { projectLoanWhatIf, type WhatIfScenario } from './what-if';

const loanOf = (overrides: Partial<Loan> = {}): Loan => ({
  id: 1,
  name: 'Test loan',
  loanType: 'mortgage' as LoanType,
  principal: 200000,
  interestRate: 6,
  termMonths: 360,
  startDate: '2020-01-01',
  categoryId: 7,
  archived: false,
  sortOrder: 0,
  ...overrides,
});

const progressOf = (actualBalance: number): LoanProgress => ({
  actualBalance,
  totalPrincipalPaid: 200000 - actualBalance,
  totalInterestPaid: 0,
  percentPaidOff: (200000 - actualBalance) / 200000,
  lastPaymentDate: '2026-08-01',
});

const scenarioOf = (overrides: Partial<WhatIfScenario> = {}): WhatIfScenario => ({
  extraMonthlyPayment: 0,
  lumpSums: [],
  ...overrides,
});

describe('projectLoanWhatIf (TICKET-LOAN-12)', () => {
  it('returns an identical scenario and baseline, saving nothing, for an empty scenario', () => {
    const projection = projectLoanWhatIf(loanOf(), progressOf(180000), scenarioOf(), '2026-08-22');

    expect(projection.monthsSaved).toBe(0);
    expect(projection.interestSaved).toBe(0);
    expect(projection.scenario).toEqual(projection.baseline);
  });

  it('starts the balance series at fromDate/actualBalance and ends at the payoff month with 0', () => {
    const projection = projectLoanWhatIf(loanOf(), progressOf(180000), scenarioOf(), '2026-08-22');
    const series = projection.scenario.balanceSeries;

    expect(series[0]).toEqual({ date: '2026-08-22', balance: 180000 });
    expect(series.at(-1)?.balance).toBe(0);
    expect(series.at(-1)?.date).toBe(projection.scenario.payoffDate);
    expect(series).toHaveLength(projection.scenario.monthsRemaining + 1);
  });

  it('shortens the payoff and lowers total interest for a recurring extra payment', () => {
    const projection = projectLoanWhatIf(
      loanOf(),
      progressOf(180000),
      scenarioOf({ extraMonthlyPayment: 200 }),
      '2026-08-22',
    );

    expect(projection.scenario.monthsRemaining).toBeLessThan(projection.baseline.monthsRemaining);
    expect(projection.scenario.totalInterest).toBeLessThan(projection.baseline.totalInterest);
    expect(projection.monthsSaved).toBeGreaterThan(0);
    expect(projection.interestSaved).toBeGreaterThan(0);
  });

  it('applies a lump sum in its own month only, and never drives the balance below 0', () => {
    const projection = projectLoanWhatIf(
      loanOf(),
      progressOf(180000),
      scenarioOf({ lumpSums: [{ date: '2028-06-15', amount: 20000 }] }),
      '2026-08-22',
    );
    const series = projection.scenario.balanceSeries;

    const lumpMonthIndex = series.findIndex((point) => point.date.startsWith('2028-06'));
    expect(lumpMonthIndex).toBeGreaterThan(0);
    const dropInLumpMonth = series[lumpMonthIndex - 1].balance - series[lumpMonthIndex].balance;
    const dropInNextMonth = series[lumpMonthIndex].balance - series[lumpMonthIndex + 1].balance;
    expect(dropInLumpMonth).toBeGreaterThan(20000);
    expect(dropInNextMonth).toBeLessThan(2000);

    expect(Math.min(...series.map((point) => point.balance))).toBe(0);
    expect(projection.monthsSaved).toBeGreaterThan(0);
  });

  it('ignores a lump sum dated after the projected payoff or before fromDate — no phantom saving', () => {
    const ignored = projectLoanWhatIf(
      loanOf(),
      progressOf(180000),
      scenarioOf({
        lumpSums: [
          { date: '2019-01-10', amount: 50000 },
          { date: '2099-01-10', amount: 50000 },
        ],
      }),
      '2026-08-22',
    );

    expect(ignored.monthsSaved).toBe(0);
    expect(ignored.interestSaved).toBe(0);
    expect(ignored.scenario).toEqual(ignored.baseline);
  });

  it('pays the loan off in one month when the extra payment exceeds the balance, clamped to what is left', () => {
    const projection = projectLoanWhatIf(
      loanOf(),
      progressOf(5000),
      scenarioOf({ extraMonthlyPayment: 999999 }),
      '2026-08-22',
    );

    expect(projection.scenario.monthsRemaining).toBe(1);
    expect(projection.scenario.balanceSeries.at(-1)?.balance).toBe(0);
    // One month of interest on the outstanding balance, and not a cent more.
    expect(projection.scenario.totalInterest).toBeCloseTo(5000 * (6 / 100 / 12), 6);
  });

  it('projects a 0% loan linearly and terminates — no divide-by-zero, no infinite loop', () => {
    const projection = projectLoanWhatIf(
      loanOf({ principal: 12000, interestRate: 0, termMonths: 120 }),
      { ...progressOf(0), actualBalance: 1000 },
      scenarioOf(),
      '2026-08-22',
    );

    expect(projection.scenario.totalInterest).toBe(0);
    // 1000 left at a 100/month scheduled payment.
    expect(projection.scenario.monthsRemaining).toBe(10);
    expect(projection.scenario.payoffDate).toBe('2027-06-22');
  });

  it('reports an already-paid-off loan as done today, with no saving for any scenario', () => {
    const projection = projectLoanWhatIf(
      loanOf(),
      progressOf(0),
      scenarioOf({ extraMonthlyPayment: 500, lumpSums: [{ date: '2028-06-15', amount: 20000 }] }),
      '2026-08-22',
    );

    expect(projection.scenario.monthsRemaining).toBe(0);
    expect(projection.scenario.payoffDate).toBe('2026-08-22');
    expect(projection.scenario.totalInterest).toBe(0);
    expect(projection.monthsSaved).toBe(0);
    expect(projection.interestSaved).toBe(0);
  });

  it('produces identical figures for two different loanTypes with the same numbers', () => {
    const scenario = scenarioOf({
      extraMonthlyPayment: 200,
      lumpSums: [{ date: '2028-06-15', amount: 10000 }],
    });
    const asMortgage = projectLoanWhatIf(
      loanOf({ loanType: 'mortgage' }),
      progressOf(180000),
      scenario,
      '2026-08-22',
    );
    const asAuto = projectLoanWhatIf(
      loanOf({ loanType: 'auto' }),
      progressOf(180000),
      scenario,
      '2026-08-22',
    );

    expect(asAuto).toEqual(asMortgage);
  });
});
