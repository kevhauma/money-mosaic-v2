import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideEchartsCore } from 'ngx-echarts';
import type { Loan, Transaction } from '@/core/data-access';
import { computeAmortizationSchedule } from '@/core/loans';
import { echarts } from '@/shared/echarts';
import {
  buildLoanBalanceChartOption,
  LoanBalanceChartComponent,
} from './loan-balance-chart.component';

// jsdom has no ResizeObserver; the echarts directive needs one to observe its host element.
class ResizeObserverStub {
  observe = (): void => {};
  unobserve = (): void => {};
  disconnect = (): void => {};
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;

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
  amount: -amount,
  currency: 'EUR',
  rawDescription: 'Loan payment',
  categoryId: 1,
  fingerprint: `fp-${id}`,
  createdAt: `${bookingDate}T00:00:00.000Z`,
});

describe('buildLoanBalanceChartOption (TICKET-LOAN-07)', () => {
  it('draws both a Scheduled and an Actual series, distinguished by name, for any loanType', () => {
    for (const loanType of ['mortgage', 'auto'] as const) {
      const testLoan = loan({ loanType });
      const option = buildLoanBalanceChartOption(testLoan, []);

      const series = option['series'] as { name: string }[];
      expect(series.map((entry) => entry.name)).toEqual(['Scheduled', 'Actual']);
      // No mention of the loan type anywhere in the chart's own labels.
      expect(JSON.stringify(option).toLowerCase()).not.toContain(loanType);
    }
  });

  it('anchors both series at the loan principal on the start date, with no payments yet', () => {
    const testLoan = loan();
    const option = buildLoanBalanceChartOption(testLoan, []);

    const dates = option['xAxis'] as { data: string[] };
    expect(dates.data[0]).toBe('2024-01-01');
    const series = option['series'] as { data: (number | null)[] }[];
    expect(series[0].data[0]).toBe(12000);
    expect(series[1].data[0]).toBe(12000);
  });

  it('diverges the two series once a payment differs from the scheduled amount', () => {
    const testLoan = loan();
    const schedule = computeAmortizationSchedule(
      testLoan.principal,
      testLoan.interestRate,
      testLoan.termMonths,
      testLoan.startDate,
    );
    // An overpayment on the first scheduled date.
    const option = buildLoanBalanceChartOption(testLoan, [
      payment(1, schedule[0].date, schedule[0].payment * 3),
    ]);

    const dates = option['xAxis'] as { data: string[] };
    const series = option['series'] as { data: (number | null)[] }[];
    const dateIndex = dates.data.indexOf(schedule[0].date);

    expect(series[0].data[dateIndex]).toBeCloseTo(schedule[0].remainingBalance, 2);
    expect(series[1].data[dateIndex]).toBeLessThan(schedule[0].remainingBalance);
  });

  it('places a legend distinguishing the two series', () => {
    const option = buildLoanBalanceChartOption(loan(), []);

    const legend = option['legend'] as { data: string[] };
    expect(legend.data).toEqual(['Scheduled', 'Actual']);
  });
});

describe('LoanBalanceChartComponent', () => {
  let fixture: ComponentFixture<LoanBalanceChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoanBalanceChartComponent],
      providers: [provideEchartsCore({ echarts })],
    }).compileComponents();

    fixture = TestBed.createComponent(LoanBalanceChartComponent);
    fixture.componentRef.setInput('loan', loan());
    fixture.detectChanges();
  });

  it('renders the panel title', () => {
    const host = fixture.nativeElement as HTMLElement;
    expect(host.textContent).toContain('Balance over time');
  });

  it('renders an echarts host element', () => {
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('[echarts]')).not.toBeNull();
  });
});
