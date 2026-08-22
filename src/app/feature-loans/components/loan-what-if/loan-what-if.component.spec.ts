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

    expect(text()).toContain('What if I paid more?');
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

describe('LoanWhatIfComponent lump sums and fees (TICKET-LOAN-14)', () => {
  withCleanFormatSettings();

  let fixture: ComponentFixture<LoanWhatIfComponent>;

  const setUp = async (): Promise<void> => {
    await TestBed.configureTestingModule({ imports: [LoanWhatIfComponent] })
      .overrideComponent(LoanWhatIfComponent, {
        remove: { imports: [NgxEchartsDirective] },
        add: { imports: [EchartsStubDirective] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(LoanWhatIfComponent);
    fixture.componentRef.setInput('loan', LOAN);
    fixture.componentRef.setInput('payments', []);
    await fixture.whenStable();
  };

  const host = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const text = (): string => host().textContent as string;

  const buttonLabelled = (label: string): HTMLElement =>
    [...host().querySelectorAll('mm-button')].find(
      (element) => (element.textContent ?? '').trim() === label,
    ) as HTMLElement;

  const setValue = async (element: Element, value: string): Promise<void> => {
    const field = element as HTMLInputElement | HTMLSelectElement;
    field.value = value;
    field.dispatchEvent(new Event(field.tagName === 'SELECT' ? 'change' : 'input'));
    await fixture.whenStable();
  };

  /** Fills row `index` with an amount and a month, the way a user would. */
  const fillLumpSum = async (index: number, amount: string, month: string): Promise<void> => {
    const rows = [...host().querySelectorAll('mm-fieldset')].find((set) =>
      (set.textContent ?? '').includes('One-off lump sums'),
    ) as HTMLElement;
    const amounts = rows.querySelectorAll('input[type="number"]');
    const months = rows.querySelectorAll('input[type="month"]');
    await setValue(amounts[index], amount);
    await setValue(months[index], month);
  };

  const addRow = async (): Promise<void> => {
    buttonLabelled('Add a lump sum').click();
    await fixture.whenStable();
  };

  it('starts with no lump-sum rows at all', async () => {
    await setUp();

    expect(host().querySelectorAll('input[type="month"]')).toHaveLength(0);
    expect(text()).toContain('No change');
  });

  it('reports gross, fee, and net as three figures for a lump sum in a future year', async () => {
    await setUp();
    await addRow();
    await fillLumpSum(0, '20000', '2028-06');

    expect(text()).toContain('saved in interest');
    expect(text()).toContain('early-repayment fee');
    expect(text()).toContain('Net:');
  });

  it('ignores a row until it has both an amount and a month', async () => {
    await setUp();
    await addRow();
    await fillLumpSum(0, '20000', '');

    expect(text()).toContain('No change');
    expect(text()).not.toContain('early-repayment fee');
  });

  it('supports several rows at once', async () => {
    await setUp();
    await addRow();
    await addRow();
    await fillLumpSum(0, '10000', '2027-03');
    await fillLumpSum(1, '20000', '2028-06');

    expect(host().querySelectorAll('input[type="month"]')).toHaveLength(2);
    expect(text()).toContain('early-repayment fee');
  });

  it('re-derives immediately on removing a row, returning to recurring-only behaviour', async () => {
    await setUp();
    await addRow();
    await fillLumpSum(0, '20000', '2028-06');
    expect(text()).toContain('early-repayment fee');

    buttonLabelled('Remove').click();
    await fixture.whenStable();

    expect(host().querySelectorAll('input[type="month"]')).toHaveLength(0);
    expect(text()).not.toContain('early-repayment fee');
  });

  it('combines a lump sum with a recurring extra in one projection', async () => {
    await setUp();
    const extra = host().querySelector('input[type="number"]') as HTMLInputElement;
    await setValue(extra, '200');
    await addRow();
    await fillLumpSum(0, '20000', '2028-06');

    expect(text()).toContain('earlier');
    expect(text()).toContain('early-repayment fee');
  });

  it('drops the fee entirely on the "No fee" model, leaving only the gross saving', async () => {
    await setUp();
    await addRow();
    await fillLumpSum(0, '20000', '2028-06');
    await setValue(host().querySelector('select') as HTMLSelectElement, 'none');

    expect(text()).toContain('saved in interest');
    expect(text()).not.toContain('early-repayment fee');
  });

  it("re-seeds the fee's number when the model changes, so 3 months doesn't become 3%", async () => {
    await setUp();
    const feeField = (): HTMLInputElement =>
      [...host().querySelectorAll('input[type="number"]')].at(-1) as HTMLInputElement;

    expect(feeField().value).toBe('3');
    await setValue(host().querySelector('select') as HTMLSelectElement, 'percentOfAmount');

    expect(feeField().value).toBe('1');
    expect(text()).toContain('Percent of the amount');
  });
});
