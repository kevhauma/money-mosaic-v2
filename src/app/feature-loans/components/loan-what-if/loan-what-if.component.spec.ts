import { Directive, input } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NgxEchartsDirective } from 'ngx-echarts';
import type { Loan, Transaction } from '@/core/data-access';
import { projectLoanWhatIf, type LoanProgress, type WhatIfScenario } from '@/core/loans';
import { withCleanFormatSettings } from '@/shared/utils/format-settings.testing';
import { buildLoanWhatIfChartOption, LoanWhatIfComponent } from './loan-what-if.component';

/**
 * Same selector and `options` input as the real echarts directive, so the template binding stays
 * type-checked without a canvas. This spec types into a control, which updates the option on a
 * live chart — exactly the post-mount update that crashes zrender's ticker in jsdom (the
 * `loan-detail.component.spec.ts` precedent), so the stub is used throughout.
 */
// The `app` prefix rule exists to keep our own directives distinguishable; this one deliberately
// impersonates a third-party selector, which is the only way a stub can stand in for it.
// eslint-disable-next-line @angular-eslint/directive-selector
@Directive({ selector: '[echarts]' })
class EchartsStubDirective {
  readonly options = input<unknown>();
}

const LOAN: Loan = {
  id: 1,
  name: 'Home loan',
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

type Series = { name: string; type: string; data: number[] };

const optionFor = (actualBalance: number, scenario: Partial<WhatIfScenario> = {}) =>
  buildLoanWhatIfChartOption(
    projectLoanWhatIf(
      LOAN,
      progressOf(actualBalance),
      { extraMonthlyPayment: 0, lumpSums: [], ...scenario },
      '2026-08-22',
    ),
  );

describe('buildLoanWhatIfChartOption (TICKET-LOAN-13)', () => {
  it('draws a baseline and a scenario series, both named in the legend', () => {
    const option = optionFor(180000, { extraMonthlyPayment: 200 });
    const series = option['series'] as Series[];
    const legend = option['legend'] as { data?: string[] };

    expect(series).toHaveLength(2);
    expect(series.map((entry) => entry.name)).toEqual(['Current plan', 'With extra payments']);
    expect(legend.data).toEqual(['Current plan', 'With extra payments']);
  });

  it('coincides exactly when the scenario is empty', () => {
    const series = optionFor(180000)['series'] as Series[];

    expect(series[1].data).toEqual(series[0].data);
  });

  it('pads the shorter scenario series to the baseline axis with 0 rather than gaps', () => {
    const option = optionFor(180000, { extraMonthlyPayment: 200 });
    const series = option['series'] as Series[];
    const dates = (option['xAxis'] as { data: string[] }).data;

    expect(series[0].data).toHaveLength(dates.length);
    expect(series[1].data).toHaveLength(dates.length);
    expect(series[1].data.at(-1)).toBe(0);
    expect(series[1].data.every((value) => Number.isFinite(value))).toBe(true);
  });

  it('never mentions the loan type — the builder takes the projection, not the loan', () => {
    const serialized = JSON.stringify(optionFor(180000, { extraMonthlyPayment: 200 }));

    expect(serialized).not.toMatch(/mortgage|auto|personal|student/i);
    expect(buildLoanWhatIfChartOption.length).toBe(1);
  });
});

describe('LoanWhatIfComponent (TICKET-LOAN-13)', () => {
  withCleanFormatSettings();

  let fixture: ComponentFixture<LoanWhatIfComponent>;

  const setUp = async (loan: Loan, payments: Transaction[] = []): Promise<void> => {
    await TestBed.configureTestingModule({ imports: [LoanWhatIfComponent] })
      .overrideComponent(LoanWhatIfComponent, {
        remove: { imports: [NgxEchartsDirective] },
        add: { imports: [EchartsStubDirective] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(LoanWhatIfComponent);
    fixture.componentRef.setInput('loan', loan);
    fixture.componentRef.setInput('payments', payments);
    await fixture.whenStable();
  };

  const text = (): string => fixture.nativeElement.textContent as string;

  const typeExtra = async (value: string): Promise<void> => {
    const input = fixture.nativeElement.querySelector('input[type="number"]') as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
  };

  it('opens on the unchanged-schedule message, not an empty state', async () => {
    await setUp(LOAN);

    expect(text()).toContain('No change');
  });

  it('reports an earlier payoff and an interest saving once an extra amount is entered', async () => {
    await setUp(LOAN);
    await typeExtra('200');

    expect(text()).toContain('Paid off in');
    expect(text()).toContain('earlier');
    expect(text()).toContain('saved in interest');
  });

  it('falls back to the unchanged message for a negative entry, which never reaches the engine', async () => {
    await setUp(LOAN);
    await typeExtra('-500');

    expect(text()).toContain('No change');
    expect(text()).not.toContain('Infinity');
    expect(text()).not.toContain('NaN');
  });

  it('renders a loan with no payments yet without error', async () => {
    await setUp(LOAN, []);

    expect(text()).toContain('What if I paid more each month?');
  });

  it('renders an already-paid-off loan as nothing left to simulate', async () => {
    // A single payment of the whole principal leaves nothing outstanding.
    const payoff = {
      id: 1,
      accountId: 1,
      bookingDate: '2020-02-01',
      amount: -400000,
      rawDescription: 'Full early repayment',
      categoryId: 7,
    } as unknown as Transaction;
    await setUp(LOAN, [payoff]);

    expect(text()).toContain('already paid off');
  });
});
