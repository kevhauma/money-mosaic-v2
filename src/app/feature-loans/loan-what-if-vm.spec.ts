import type { Loan } from '@/core/data-access';
import { projectLoanWhatIf, type LoanProgress, type WhatIfScenario } from '@/core/loans';
import { withCleanFormatSettings } from '@/shared/utils/format-settings.testing';
import { buildLoanWhatIfHeadline, describeMonthSpan } from './loan-what-if-vm';

const LOAN: Loan = {
  id: 1,
  name: 'Test loan',
  loanType: 'mortgage',
  principal: 200000,
  interestRate: 6,
  termMonths: 360,
  startDate: '2020-01-01',
  categoryId: 7,
  archived: false,
  sortOrder: 0,
};

const progressOf = (actualBalance: number): LoanProgress => ({
  actualBalance,
  totalPrincipalPaid: 200000 - actualBalance,
  totalInterestPaid: 0,
  percentPaidOff: (200000 - actualBalance) / 200000,
  lastPaymentDate: '2026-08-01',
});

const headlineFor = (actualBalance: number, scenario: Partial<WhatIfScenario> = {}) =>
  buildLoanWhatIfHeadline(
    projectLoanWhatIf(
      LOAN,
      progressOf(actualBalance),
      { extraMonthlyPayment: 0, lumpSums: [], ...scenario },
      '2026-08-22',
    ),
  );

describe('describeMonthSpan (TICKET-LOAN-13)', () => {
  it('says months alone under a year, and singularises correctly', () => {
    expect(describeMonthSpan(1)).toBe('1 month');
    expect(describeMonthSpan(7)).toBe('7 months');
  });

  it('says whole years without a trailing "0 months"', () => {
    expect(describeMonthSpan(12)).toBe('1 year');
    expect(describeMonthSpan(24)).toBe('2 years');
  });

  it('says years and months together for a mixed span', () => {
    expect(describeMonthSpan(28)).toBe('2 years 4 months');
    expect(describeMonthSpan(13)).toBe('1 year 1 month');
  });
});

describe('buildLoanWhatIfHeadline (TICKET-LOAN-13)', () => {
  withCleanFormatSettings();

  it('reads as unchanged, with a payoff date but no saving, for a zero scenario', () => {
    const headline = headlineFor(180000);

    expect(headline.kind).toBe('unchanged');
    expect(headline.deltaLabel).toBeNull();
    expect(headline.interestSavedLabel).toBeNull();
    expect(headline.payoffLabel).toMatch(/^\w+ \d{4}$/);
  });

  it('reads as improved, with a months-earlier delta and a ~-prefixed saving, for a positive scenario', () => {
    const headline = headlineFor(180000, { extraMonthlyPayment: 200 });

    expect(headline.kind).toBe('improved');
    expect(headline.deltaLabel).toMatch(/^\d+ years? (\d+ months? )?earlier$/);
    expect(headline.interestSavedLabel).toMatch(/^~€[\d,.]+$/);
  });

  it('reads as paid-off for a loan with nothing left, whatever scenario is posed', () => {
    const headline = headlineFor(0, { extraMonthlyPayment: 500 });

    expect(headline.kind).toBe('paid-off');
    expect(headline.deltaLabel).toBeNull();
    expect(headline.interestSavedLabel).toBeNull();
  });

  it('never mentions the loan type — a mortgage and a car loan with the same numbers read identically', () => {
    const scenario: WhatIfScenario = { extraMonthlyPayment: 200, lumpSums: [] };
    const asAuto = buildLoanWhatIfHeadline(
      projectLoanWhatIf({ ...LOAN, loanType: 'auto' }, progressOf(180000), scenario, '2026-08-22'),
    );

    expect(asAuto).toEqual(headlineFor(180000, scenario));
    expect(JSON.stringify(asAuto)).not.toMatch(/mortgage|auto/i);
  });
});
