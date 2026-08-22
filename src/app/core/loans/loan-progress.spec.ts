import type { Loan, Transaction } from '@/core/data-access';
import { computeAmortizationSchedule } from './amortization';
import {
  computeActualBalanceSeries,
  computeLoanProgress,
  computeScheduleComparison,
} from './loan-progress';

const loan = (overrides: Partial<Loan> = {}): Loan => ({
  id: 1,
  name: 'Home mortgage',
  loanType: 'mortgage',
  principal: 12000,
  interestRate: 6,
  termMonths: 12,
  startDate: '2024-01-01',
  categoryId: 1,
  archived: false,
  sortOrder: 0,
  ...overrides,
});

const payment = (id: number, bookingDate: string, amount: number): Transaction => ({
  id,
  accountId: 1,
  bookingDate,
  amount: -amount, // stored negative — an outflow, the `Transaction.amount` convention
  currency: 'EUR',
  rawDescription: 'Loan payment',
  categoryId: 1,
  fingerprint: `fp-${id}`,
  createdAt: `${bookingDate}T00:00:00.000Z`,
});

describe('computeLoanProgress (TICKET-LOAN-05)', () => {
  it('leaves the balance untouched with no payments yet', () => {
    const testLoan = loan();

    const progress = computeLoanProgress(testLoan, []);

    expect(progress.actualBalance).toBe(testLoan.principal);
    expect(progress.percentPaidOff).toBe(0);
    expect(progress.totalPrincipalPaid).toBe(0);
    expect(progress.totalInterestPaid).toBe(0);
    expect(progress.lastPaymentDate).toBeNull();
  });

  it('tracks a mortgage-type loan’s on-schedule payments within a small tolerance of the schedule', () => {
    const testLoan = loan({
      loanType: 'mortgage',
      principal: 12000,
      interestRate: 6,
      termMonths: 12,
    });
    const schedule = computeAmortizationSchedule(
      testLoan.principal,
      testLoan.interestRate,
      testLoan.termMonths,
      testLoan.startDate,
    );
    const payments = schedule.map((entry, index) => payment(index + 1, entry.date, entry.payment));

    for (const monthsPaid of [1, 3, 6]) {
      const progress = computeLoanProgress(testLoan, payments.slice(0, monthsPaid));
      const scheduledBalance = schedule[monthsPaid - 1].remainingBalance;

      // Interest here accrues over each payment's *actual* elapsed days (28-31, calendar months
      // vary), while the schedule assumes every period is exactly one uniform month — so the two
      // track closely but aren't bit-identical. $5 on a $12,000 loan is a tight bound relative to
      // the ~$1,000/month payment size, not a loose one.
      expect(Math.abs(progress.actualBalance - scheduledBalance)).toBeLessThan(5);
    }

    // Paid in full, on schedule, for the whole term: both land on exactly 0 — the final month
    // clamps to whatever principal is actually left, in both `computeAmortizationSchedule` and here.
    const fullyPaid = computeLoanProgress(testLoan, payments);
    expect(fullyPaid.actualBalance).toBe(0);
    expect(fullyPaid.percentPaidOff).toBe(1);
    expect(fullyPaid.lastPaymentDate).toBe(payments.at(-1)?.bookingDate);
  });

  it('tracks an auto-type loan’s on-schedule payments the same way, proving type-agnosticism', () => {
    const testLoan = loan({
      loanType: 'auto',
      name: 'Car loan',
      principal: 20000,
      interestRate: 5,
      termMonths: 60,
    });
    const schedule = computeAmortizationSchedule(
      testLoan.principal,
      testLoan.interestRate,
      testLoan.termMonths,
      testLoan.startDate,
    );
    const payments = schedule.map((entry, index) => payment(index + 1, entry.date, entry.payment));

    const progress = computeLoanProgress(testLoan, payments.slice(0, 6));
    expect(Math.abs(progress.actualBalance - schedule[5].remainingBalance)).toBeLessThan(10);

    const fullyPaid = computeLoanProgress(testLoan, payments);
    expect(fullyPaid.actualBalance).toBe(0);
  });

  it('an overpayment reduces actualBalance below the schedule’s value at the same date, for any loanType', () => {
    for (const loanType of ['mortgage', 'auto'] as const) {
      const testLoan = loan({ loanType, principal: 12000, interestRate: 6, termMonths: 12 });
      const schedule = computeAmortizationSchedule(
        testLoan.principal,
        testLoan.interestRate,
        testLoan.termMonths,
        testLoan.startDate,
      );

      const onSchedule = computeLoanProgress(testLoan, [
        payment(1, schedule[0].date, schedule[0].payment),
      ]);
      const overpaid = computeLoanProgress(testLoan, [
        payment(1, schedule[0].date, schedule[0].payment * 3),
      ]);

      expect(overpaid.actualBalance).toBeLessThan(onSchedule.actualBalance);
      expect(overpaid.actualBalance).toBeLessThan(schedule[0].remainingBalance);
    }
  });

  it('does not drive actualBalance negative when payments sum to more than the principal', () => {
    const testLoan = loan({ principal: 5000, interestRate: 4, termMonths: 12 });

    const progress = computeLoanProgress(testLoan, [
      payment(1, '2024-02-01', 3000),
      payment(2, '2024-03-01', 3000),
      payment(3, '2024-04-01', 3000),
    ]);

    expect(progress.actualBalance).toBe(0);
    expect(progress.percentPaidOff).toBe(1);
    expect(progress.totalPrincipalPaid).toBeLessThanOrEqual(testLoan.principal);
  });

  it('accrues more interest over a skipped/missed period than a normal one', () => {
    const testLoan = loan({ principal: 12000, interestRate: 6, termMonths: 12 });
    const schedule = computeAmortizationSchedule(
      testLoan.principal,
      testLoan.interestRate,
      testLoan.termMonths,
      testLoan.startDate,
    );
    const monthlyPayment = schedule[0].payment;

    // Normal cadence: a payment every month.
    const onTime = computeLoanProgress(testLoan, [
      payment(1, '2024-02-01', monthlyPayment),
      payment(2, '2024-03-01', monthlyPayment),
    ]);

    // A missed month: the same two payments, but the second lands three months after the first
    // instead of one — more interest accrues over the gap, so less of that payment goes to principal.
    const skipped = computeLoanProgress(testLoan, [
      payment(1, '2024-02-01', monthlyPayment),
      payment(2, '2024-05-01', monthlyPayment),
    ]);

    expect(skipped.totalInterestPaid).toBeGreaterThan(onTime.totalInterestPaid);
    expect(skipped.actualBalance).toBeGreaterThan(onTime.actualBalance);
  });

  it('sorts payments chronologically regardless of input order', () => {
    const testLoan = loan({ principal: 12000, interestRate: 6, termMonths: 12 });
    const schedule = computeAmortizationSchedule(
      testLoan.principal,
      testLoan.interestRate,
      testLoan.termMonths,
      testLoan.startDate,
    );
    const inOrder = [
      payment(1, schedule[0].date, schedule[0].payment),
      payment(2, schedule[1].date, schedule[1].payment),
    ];
    const reversed = [inOrder[1], inOrder[0]];

    const progressInOrder = computeLoanProgress(testLoan, inOrder);
    const progressReversed = computeLoanProgress(testLoan, reversed);

    expect(progressReversed.actualBalance).toBe(progressInOrder.actualBalance);
    expect(progressReversed.lastPaymentDate).toBe(progressInOrder.lastPaymentDate);
  });
});

describe('computeActualBalanceSeries (TICKET-LOAN-07)', () => {
  it('returns a single point at the start balance when there are no payments yet, without crashing', () => {
    const testLoan = loan({ principal: 12000, startDate: '2024-01-01' });

    const series = computeActualBalanceSeries(testLoan, []);

    expect(series).toEqual([{ date: '2024-01-01', balance: 12000 }]);
  });

  it('returns one point per payment, chronologically ordered, ending at the current actual balance', () => {
    const testLoan = loan({ principal: 12000, interestRate: 6, termMonths: 12 });
    const schedule = computeAmortizationSchedule(
      testLoan.principal,
      testLoan.interestRate,
      testLoan.termMonths,
      testLoan.startDate,
    );
    const payments = [
      payment(2, schedule[1].date, schedule[1].payment),
      payment(1, schedule[0].date, schedule[0].payment),
      payment(3, schedule[2].date, schedule[2].payment),
    ];

    const series = computeActualBalanceSeries(testLoan, payments);

    expect(series.map((point) => point.date)).toEqual([
      schedule[0].date,
      schedule[1].date,
      schedule[2].date,
    ]);
    const progress = computeLoanProgress(testLoan, payments);
    expect(series.at(-1)?.balance).toBe(progress.actualBalance);
  });

  it('shares its accrual with computeLoanProgress — the last point always matches actualBalance exactly', () => {
    const testLoan = loan({ principal: 5000, interestRate: 4, termMonths: 12 });
    const payments = [
      payment(1, '2024-02-01', 3000),
      payment(2, '2024-03-01', 3000),
      payment(3, '2024-04-01', 3000),
    ];

    const series = computeActualBalanceSeries(testLoan, payments);
    const progress = computeLoanProgress(testLoan, payments);

    expect(series.at(-1)?.balance).toBe(progress.actualBalance);
    expect(series.at(-1)?.date).toBe(progress.lastPaymentDate);
  });
});

describe('computeScheduleComparison (TICKET-LOAN-10)', () => {
  it('reads as exactly on schedule with nothing saved when there are no payments yet', () => {
    const testLoan = loan();
    const schedule = computeAmortizationSchedule(
      testLoan.principal,
      testLoan.interestRate,
      testLoan.termMonths,
      testLoan.startDate,
    );
    const progress = computeLoanProgress(testLoan, []);

    const comparison = computeScheduleComparison(testLoan, schedule, progress);

    expect(comparison.monthsAheadOfSchedule).toBe(0);
    expect(comparison.interestSavedEstimate).toBe(0);
    expect(comparison.projectedPayoffDate).toBe(schedule.at(-1)?.date);
  });

  for (const loanType of ['mortgage', 'auto'] as const) {
    it(`on-schedule payments produce monthsAheadOfSchedule 0 and interestSavedEstimate near 0, for a ${loanType}-type loan`, () => {
      const testLoan = loan({ loanType, principal: 12000, interestRate: 6, termMonths: 12 });
      const schedule = computeAmortizationSchedule(
        testLoan.principal,
        testLoan.interestRate,
        testLoan.termMonths,
        testLoan.startDate,
      );
      const payments = schedule
        .slice(0, 6)
        .map((entry, index) => payment(index + 1, entry.date, entry.payment));
      const progress = computeLoanProgress(testLoan, payments);

      const comparison = computeScheduleComparison(testLoan, schedule, progress);

      // Not exactly 0 in every case: `monthsAheadOfSchedule` is quantized to whole scheduled
      // months by construction (this ticket's own algorithm), and the day-based accrual
      // (TICKET-LOAN-05) tracks the schedule closely but not bit-for-bit — real calendar months
      // vary 28-31 days against the schedule's flat monthly-rate assumption, so a real month
      // containing e.g. a 29-day February can land a hair on either side of an adjacent scheduled
      // month's balance and flip the whole-month match by one. ±1 is "on schedule" in practice;
      // a multi-month drift would be the real bug this test guards against.
      expect(Math.abs(comparison.monthsAheadOfSchedule)).toBeLessThanOrEqual(1);
      // Small relative to the ~€65 total interest this loan accrues in 6 months.
      expect(Math.abs(comparison.interestSavedEstimate)).toBeLessThan(5);
    });

    it(`consistent overpayments produce a positive monthsAheadOfSchedule and interestSavedEstimate, for a ${loanType}-type loan`, () => {
      const testLoan = loan({ loanType, principal: 12000, interestRate: 6, termMonths: 12 });
      const schedule = computeAmortizationSchedule(
        testLoan.principal,
        testLoan.interestRate,
        testLoan.termMonths,
        testLoan.startDate,
      );
      // Double payment for the first three scheduled months.
      const payments = schedule
        .slice(0, 3)
        .map((entry, index) => payment(index + 1, entry.date, entry.payment * 2));
      const progress = computeLoanProgress(testLoan, payments);

      const comparison = computeScheduleComparison(testLoan, schedule, progress);

      expect(comparison.monthsAheadOfSchedule).toBeGreaterThan(0);
      expect(comparison.interestSavedEstimate).toBeGreaterThan(0);
      // Payoff pulled earlier by exactly the months-ahead figure.
      const expectedPayoff = new Date(schedule.at(-1)!.date);
      expectedPayoff.setUTCMonth(expectedPayoff.getUTCMonth() - comparison.monthsAheadOfSchedule);
      expect(comparison.projectedPayoffDate).toBe(expectedPayoff.toISOString().slice(0, 10));
    });

    it(`missed/underpaid periods produce a negative monthsAheadOfSchedule and a later payoff, for a ${loanType}-type loan`, () => {
      const testLoan = loan({ loanType, principal: 12000, interestRate: 6, termMonths: 12 });
      const schedule = computeAmortizationSchedule(
        testLoan.principal,
        testLoan.interestRate,
        testLoan.termMonths,
        testLoan.startDate,
      );
      // A fraction of the scheduled payment for the first six months.
      const payments = schedule
        .slice(0, 6)
        .map((entry, index) => payment(index + 1, entry.date, entry.payment * 0.3));
      const progress = computeLoanProgress(testLoan, payments);

      const comparison = computeScheduleComparison(testLoan, schedule, progress);

      expect(comparison.monthsAheadOfSchedule).toBeLessThan(0);
      expect(comparison.interestSavedEstimate).toBeLessThan(0);
      const scheduledFinal = new Date(schedule.at(-1)!.date);
      expect(new Date(comparison.projectedPayoffDate).getTime()).toBeGreaterThan(
        scheduledFinal.getTime(),
      );
    });
  }

  it('produces identical figures for two loanTypes given the same underlying numbers — no type-specific branch', () => {
    const mortgage = loan({
      loanType: 'mortgage',
      principal: 12000,
      interestRate: 6,
      termMonths: 12,
    });
    const auto = loan({ loanType: 'auto', principal: 12000, interestRate: 6, termMonths: 12 });
    const schedule = computeAmortizationSchedule(12000, 6, 12, '2024-01-01');
    const payments = schedule
      .slice(0, 3)
      .map((entry, index) => payment(index + 1, entry.date, entry.payment * 2));

    const mortgageComparison = computeScheduleComparison(
      mortgage,
      schedule,
      computeLoanProgress(mortgage, payments),
    );
    const autoComparison = computeScheduleComparison(
      auto,
      schedule,
      computeLoanProgress(auto, payments),
    );

    expect(autoComparison).toEqual(mortgageComparison);
  });
});
