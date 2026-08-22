import { Directive, input } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts';
import type { Loan } from '@/core/data-access';
import { computeAmortizationSchedule } from '@/core/loans';
import { echarts } from '@/shared/echarts';
import { formatCurrency, formatDate } from '@/shared/utils';
import { withCleanFormatSettings } from '@/shared/utils/format-settings.testing';
import {
  buildLoanCompositionChartOption,
  LoanCompositionChartComponent,
  type LoanCompositionBasis,
} from './loan-composition-chart.component';

// jsdom has no ResizeObserver; the echarts directive needs one to observe its host element.
class ResizeObserverStub {
  observe = (): void => {};
  unobserve = (): void => {};
  disconnect = (): void => {};
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;

/**
 * Same selector and `options` input as the real directive, so the template binding is still type-
 * checked, but no canvas. Used by the tests that *switch basis*: a live chart re-rendering an
 * updated option drives zrender's ticker into a repaint against a context jsdom never provided
 * (the `loan-detail.component.spec.ts` precedent). The initial-render test below still mounts the
 * real directive, which is where "does this option actually load into echarts" gets proven.
 */
// The `app` prefix rule exists to keep our own directives distinguishable; this one deliberately
// impersonates a third-party selector, which is the only way a stub can stand in for it.
// eslint-disable-next-line @angular-eslint/directive-selector
@Directive({ selector: '[echarts]' })
class EchartsStubDirective {
  readonly options = input<unknown>();
}

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

type Series = { name: string; stack: string; data: number[] };

const seriesOf = (loanUnderTest: Loan, basis: LoanCompositionBasis): Series[] =>
  buildLoanCompositionChartOption(loanUnderTest, basis)['series'] as Series[];

const tooltipOf = (
  loanUnderTest: Loan,
  basis: LoanCompositionBasis,
): ((params: unknown) => string) =>
  (
    buildLoanCompositionChartOption(loanUnderTest, basis)['tooltip'] as {
      formatter: (params: unknown) => string;
    }
  ).formatter;

describe('buildLoanCompositionChartOption (loan feedback)', () => {
  withCleanFormatSettings();

  it('draws a Principal and an Interest band on one stack, for any loanType', () => {
    for (const loanType of ['mortgage', 'auto'] as const) {
      const series = seriesOf(loan({ loanType }), 'payment');

      expect(series.map((entry) => entry.name)).toEqual(['Principal', 'Interest']);
      expect(new Set(series.map((entry) => entry.stack)).size).toBe(1);
      // No mention of the loan type anywhere in the chart's own labels.
      expect(
        JSON.stringify(buildLoanCompositionChartOption(loan({ loanType }), 'payment')),
      ).not.toContain(loanType);
    }
  });

  it('fixes the axis at 0-100% in both bases, so the toggle changes the question, not the scale', () => {
    for (const basis of ['payment', 'balance'] as const) {
      const yAxis = buildLoanCompositionChartOption(loan(), basis)['yAxis'] as {
        min: number;
        max: number;
      };
      expect(yAxis.min).toBe(0);
      expect(yAxis.max).toBe(100);
    }
  });

  describe("basis 'payment' — the month's payment as the total", () => {
    it('splits every month into two shares summing to exactly 100', () => {
      const [principal, interest] = seriesOf(loan({ termMonths: 12 }), 'payment');

      expect(principal.data).toHaveLength(12);
      principal.data.forEach((value, index) => {
        expect(value + interest.data[index]).toBeCloseTo(100, 10);
      });
    });

    it("matches each month's scheduled principal/payment ratio", () => {
      const testLoan = loan();
      const schedule = computeAmortizationSchedule(
        testLoan.principal,
        testLoan.interestRate,
        testLoan.termMonths,
        testLoan.startDate,
      );
      const [principal] = seriesOf(testLoan, 'payment');

      expect(principal.data[0]).toBeCloseTo(
        (schedule[0].principalPortion / schedule[0].payment) * 100,
        10,
      );
    });

    it('shifts from interest-heavy to principal-heavy across the term', () => {
      const [principal] = seriesOf(loan({ termMonths: 120, interestRate: 6 }), 'payment');

      // Monotonic across the whole term, not just endpoints — that's the shape the chart exists
      // to show, and it holds for every rate/term, unlike "the first payment is mostly interest"
      // (which is only true once the term is long relative to the rate).
      principal.data.forEach((value, index) => {
        if (index > 0) expect(value).toBeGreaterThan(principal.data[index - 1]);
      });
      // The last payment is almost entirely principal — "almost" because a month's interest still
      // accrues on the sliver of balance left going into it.
      expect(principal.data.at(-1)!).toBeGreaterThan(99);
    });
  });

  describe("basis 'balance' — what is still owed, against the loan's whole cost", () => {
    it('falls to exactly zero on the final month, both bands emptied', () => {
      const [principal, interest] = seriesOf(loan({ termMonths: 12 }), 'balance');

      expect(principal.data.at(-1)).toBeCloseTo(0, 10);
      expect(interest.data.at(-1)).toBeCloseTo(0, 10);
    });

    it('starts just under 100% of everything the loan will cost (one payment already made)', () => {
      const [principal, interest] = seriesOf(loan({ termMonths: 12 }), 'balance');
      const firstMonthTotal = principal.data[0] + interest.data[0];

      expect(firstMonthTotal).toBeLessThan(100);
      expect(firstMonthTotal).toBeGreaterThan(85);
    });

    it('empties the interest band ahead of the principal band — interest is front-loaded', () => {
      const [principal, interest] = seriesOf(loan({ termMonths: 120, interestRate: 6 }), 'balance');
      const halfway = 59;

      // Half the term in, a far greater share of the interest is behind you than of the principal.
      expect(interest.data[halfway] / interest.data[0]).toBeLessThan(
        principal.data[halfway] / principal.data[0],
      );
    });

    it('never reports a negative share', () => {
      const [principal, interest] = seriesOf(loan({ termMonths: 12 }), 'balance');

      expect(Math.min(...principal.data, ...interest.data)).toBeGreaterThanOrEqual(0);
    });
  });

  describe('tooltip', () => {
    it('states whole currency amounts, not the percentages the bands draw', () => {
      const testLoan = loan();
      const schedule = computeAmortizationSchedule(
        testLoan.principal,
        testLoan.interestRate,
        testLoan.termMonths,
        testLoan.startDate,
      );

      const text = tooltipOf(
        testLoan,
        'payment',
      )([
        { dataIndex: 0, marker: '●', seriesName: 'Principal' },
        { dataIndex: 0, marker: '●', seriesName: 'Interest' },
      ]);

      expect(text).toBe(
        [
          formatDate(schedule[0].date),
          `●Principal: ${formatCurrency(schedule[0].principalPortion, { whole: true })}`,
          `●Interest: ${formatCurrency(schedule[0].interestPortion, { whole: true })}`,
        ].join('<br/>'),
      );
      expect(text).not.toContain('%');
    });

    it("reports the balance basis' remaining amounts, not the month's payment", () => {
      const testLoan = loan();
      const schedule = computeAmortizationSchedule(
        testLoan.principal,
        testLoan.interestRate,
        testLoan.termMonths,
        testLoan.startDate,
      );

      const text = tooltipOf(
        testLoan,
        'balance',
      )([{ dataIndex: 0, marker: '●', seriesName: 'Principal' }]);

      expect(text).toContain(formatCurrency(schedule[0].remainingBalance, { whole: true }));
    });
  });
});

describe('LoanCompositionChartComponent (loan feedback)', () => {
  withCleanFormatSettings();

  // Reset first — each fixture below configures its own module (real directive vs. stub), and the
  // second call would otherwise hit "cannot configure the test module when it has already been
  // instantiated" (the `loan-amortization-table.component.spec.ts` precedent).
  const createFixture = async (
    options: { liveChart: boolean } = { liveChart: false },
  ): Promise<ComponentFixture<LoanCompositionChartComponent>> => {
    TestBed.resetTestingModule();
    const configured = TestBed.configureTestingModule({
      imports: [LoanCompositionChartComponent],
      providers: [provideEchartsCore({ echarts })],
    });
    if (!options.liveChart) {
      configured.overrideComponent(LoanCompositionChartComponent, {
        remove: { imports: [NgxEchartsDirective] },
        add: { imports: [EchartsStubDirective] },
      });
    }
    await configured.compileComponents();

    const fixture = TestBed.createComponent(LoanCompositionChartComponent);
    fixture.componentRef.setInput('loan', loan());
    fixture.detectChanges();
    return fixture;
  };

  it('mounts the real echarts directive with the built option (no update transition)', async () => {
    const fixture = await createFixture({ liveChart: true });
    const host = fixture.nativeElement as HTMLElement;

    expect(host.querySelector('div[echarts]')).not.toBeNull();
  });

  it('opens on the monthly-payment basis and offers the remaining-balance one beside it', async () => {
    const fixture = await createFixture();
    const host = fixture.nativeElement as HTMLElement;

    expect(fixture.componentInstance['basis']()).toBe('payment');
    const tabs = [...host.querySelectorAll('[role="tab"]')].map((tab) => tab.textContent?.trim());
    expect(tabs).toEqual(['Monthly payment', 'Remaining balance']);
    expect(host.querySelector('.tab-active')?.textContent?.trim()).toBe('Monthly payment');
  });

  it('switches basis and caption together, so the axis is never unexplained', async () => {
    const fixture = await createFixture();
    const host = fixture.nativeElement as HTMLElement;
    const captionBefore = host.querySelector('mm-text')?.textContent?.trim();

    const balanceTab = [...host.querySelectorAll<HTMLButtonElement>('[role="tab"]')].find(
      (tab) => tab.textContent?.trim() === 'Remaining balance',
    );
    balanceTab?.click();
    fixture.detectChanges();

    expect(fixture.componentInstance['basis']()).toBe('balance');
    expect(host.querySelector('mm-text')?.textContent?.trim()).not.toBe(captionBefore);
    expect(host.querySelector('.tab-active')?.textContent?.trim()).toBe('Remaining balance');
  });

  it('ignores a tab value that is not a basis rather than rendering an undefined chart', async () => {
    const fixture = await createFixture();

    fixture.componentInstance['setBasis'](undefined);

    expect(fixture.componentInstance['basis']()).toBe('payment');
  });
});
