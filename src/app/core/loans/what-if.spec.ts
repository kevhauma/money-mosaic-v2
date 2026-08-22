import type { Loan, LoanType } from '@/core/data-access';
import type { LoanProgress } from './loan-progress';
import {
  estimateEarlyRepaymentFee,
  projectLoanWhatIf,
  type EarlyRepaymentFeeModel,
  type WhatIfScenario,
} from './what-if';

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

describe('estimateEarlyRepaymentFee (TICKET-LOAN-14)', () => {
  it("charges N months of the loan's own monthly interest on the repaid amount", () => {
    // 6% annual -> 0.5%/month; three months on 20000 = 300.
    expect(
      estimateEarlyRepaymentFee(loanOf(), 20000, { kind: 'monthsOfInterest', months: 3 }),
    ).toBeCloseTo(300, 6);
  });

  it('charges a flat percentage of the repaid amount', () => {
    expect(
      estimateEarlyRepaymentFee(loanOf(), 20000, { kind: 'percentOfAmount', percent: 1 }),
    ).toBeCloseTo(200, 6);
  });

  it('charges nothing at all for the none model', () => {
    expect(estimateEarlyRepaymentFee(loanOf(), 20000, { kind: 'none' })).toBe(0);
  });

  it('reads the rate off the loan, not the fee model — a 0% loan owes no months-of-interest fee', () => {
    expect(
      estimateEarlyRepaymentFee(loanOf({ interestRate: 0 }), 20000, {
        kind: 'monthsOfInterest',
        months: 3,
      }),
    ).toBe(0);
  });
});

describe('projectLoanWhatIf fees (TICKET-LOAN-14)', () => {
  const THREE_MONTHS: EarlyRepaymentFeeModel = { kind: 'monthsOfInterest', months: 3 };

  it('reports gross saving, fee, and net as three distinct figures for a lump sum', () => {
    const projection = projectLoanWhatIf(
      loanOf(),
      progressOf(180000),
      scenarioOf({ lumpSums: [{ date: '2028-06-15', amount: 20000 }] }),
      '2026-08-22',
      THREE_MONTHS,
    );

    expect(projection.interestSaved).toBeGreaterThan(0);
    expect(projection.feesTotal).toBeCloseTo(300, 6);
    expect(projection.netInterestSaved).toBeCloseTo(projection.interestSaved - 300, 6);
    expect(projection.netInterestSaved).toBeLessThan(projection.interestSaved);
  });

  it('charges no fee for a lump sum the walk ignored', () => {
    const projection = projectLoanWhatIf(
      loanOf(),
      progressOf(180000),
      scenarioOf({
        lumpSums: [
          { date: '2019-01-10', amount: 50000 },
          { date: '2099-01-10', amount: 50000 },
        ],
      }),
      '2026-08-22',
      THREE_MONTHS,
    );

    expect(projection.feesTotal).toBe(0);
    expect(projection.netInterestSaved).toBe(0);
  });

  it('charges each of several lump sums its own fee, summing them into feesTotal', () => {
    const projection = projectLoanWhatIf(
      loanOf(),
      progressOf(180000),
      scenarioOf({
        lumpSums: [
          { date: '2027-03-10', amount: 10000 },
          { date: '2028-06-15', amount: 20000 },
        ],
      }),
      '2026-08-22',
      THREE_MONTHS,
    );

    // 3 months at 0.5%/month on 10000 + 20000.
    expect(projection.feesTotal).toBeCloseTo(150 + 300, 6);
  });

  it('never charges a fee on more than the balance a lump sum could actually repay', () => {
    const projection = projectLoanWhatIf(
      loanOf(),
      progressOf(5000),
      scenarioOf({ lumpSums: [{ date: '2026-09-15', amount: 500000 }] }),
      '2026-08-22',
      { kind: 'percentOfAmount', percent: 1 },
    );

    // 1% of the ~5000 actually outstanding, not 1% of the 500000 offered.
    expect(projection.feesTotal).toBeLessThan(55);
    expect(projection.feesTotal).toBeGreaterThan(45);
  });

  it('reports a negative net when the fee outweighs the saving — never clamped to zero', () => {
    // A 0% loan: repaying early saves no interest at all, so any fee is pure cost. Exactly the
    // case a gross-only figure would misreport as a win.
    const projection = projectLoanWhatIf(
      loanOf({ principal: 120000, interestRate: 0, termMonths: 120 }),
      { ...progressOf(180000), actualBalance: 100000 },
      scenarioOf({ lumpSums: [{ date: '2027-03-15', amount: 10000 }] }),
      '2026-08-22',
      { kind: 'percentOfAmount', percent: 1 },
    );

    expect(projection.interestSaved).toBe(0);
    expect(projection.feesTotal).toBeCloseTo(100, 6);
    expect(projection.netInterestSaved).toBeCloseTo(-100, 6);
  });

  it('applies a lump sum and a recurring extra together, in one projection', () => {
    const both = projectLoanWhatIf(
      loanOf(),
      progressOf(180000),
      scenarioOf({
        extraMonthlyPayment: 200,
        lumpSums: [{ date: '2028-06-15', amount: 20000 }],
      }),
      '2026-08-22',
      THREE_MONTHS,
    );
    const recurringOnly = projectLoanWhatIf(
      loanOf(),
      progressOf(180000),
      scenarioOf({ extraMonthlyPayment: 200 }),
      '2026-08-22',
      THREE_MONTHS,
    );

    expect(both.scenario.monthsRemaining).toBeLessThan(recurringOnly.scenario.monthsRemaining);
    expect(both.interestSaved).toBeGreaterThan(recurringOnly.interestSaved);
    // Only the lump sum is charged; the recurring extra is free (this ticket's Notes).
    expect(recurringOnly.feesTotal).toBe(0);
    expect(both.feesTotal).toBeCloseTo(300, 6);
  });

  it('defaults to no fee when no model is passed, leaving net equal to gross', () => {
    const projection = projectLoanWhatIf(
      loanOf(),
      progressOf(180000),
      scenarioOf({ lumpSums: [{ date: '2028-06-15', amount: 20000 }] }),
      '2026-08-22',
    );

    expect(projection.feesTotal).toBe(0);
    expect(projection.netInterestSaved).toBe(projection.interestSaved);
  });

  it('produces identical fee figures for two loanTypes — the model is chosen, never inferred', () => {
    const scenario = scenarioOf({ lumpSums: [{ date: '2028-06-15', amount: 20000 }] });
    const asMortgage = projectLoanWhatIf(
      loanOf({ loanType: 'mortgage' }),
      progressOf(180000),
      scenario,
      '2026-08-22',
      THREE_MONTHS,
    );
    const asAuto = projectLoanWhatIf(
      loanOf({ loanType: 'auto' }),
      progressOf(180000),
      scenario,
      '2026-08-22',
      THREE_MONTHS,
    );

    expect(asAuto).toEqual(asMortgage);
  });
});
