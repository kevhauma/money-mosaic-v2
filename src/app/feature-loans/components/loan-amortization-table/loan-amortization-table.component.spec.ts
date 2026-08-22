import { Component, input } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { Loan } from '@/core/data-access';
import { computeAmortizationSchedule } from '@/core/loans';
import { formatCurrency, formatDate } from '@/shared/utils';
import { withCleanFormatSettings } from '@/shared/utils/format-settings.testing';
import { LoanCompositionChartComponent } from '../loan-composition-chart/loan-composition-chart.component';
import { LoanAmortizationTableComponent } from './loan-amortization-table.component';

/**
 * Stands in for the real `<app-loan-composition-chart>` — every test here is about the table, and a
 * real `NgxEchartsDirective` needs a canvas 2D context jsdom doesn't provide (the
 * `loan-detail.component.spec.ts` precedent, TICKET-LOAN-07). The "loan input changes" test below is
 * exactly the update transition that crashes zrender's ticker against a null context.
 */
@Component({ selector: 'app-loan-composition-chart', template: '' })
class LoanCompositionChartStub {
  readonly loan = input.required<Loan>();
}

const loan = (overrides: Partial<Loan> = {}): Loan => ({
  id: 1,
  name: 'Home mortgage',
  loanType: 'mortgage',
  principal: 12000,
  interestRate: 6,
  termMonths: 30,
  startDate: '2024-01-01',
  categoryId: 1,
  archived: false,
  sortOrder: 0,
  ...overrides,
});

const createFixture = async (
  testLoan: Loan,
): Promise<ComponentFixture<LoanAmortizationTableComponent>> => {
  // Reset first — a test that builds two fixtures in one `it` (the mortgage/auto comparison
  // below) would otherwise hit "cannot configure the test module when it has already been
  // instantiated" on the second call.
  TestBed.resetTestingModule();
  await TestBed.configureTestingModule({
    imports: [LoanAmortizationTableComponent],
  })
    .overrideComponent(LoanAmortizationTableComponent, {
      remove: { imports: [LoanCompositionChartComponent] },
      add: { imports: [LoanCompositionChartStub] },
    })
    .compileComponents();

  const fixture = TestBed.createComponent(LoanAmortizationTableComponent);
  fixture.componentRef.setInput('loan', testLoan);
  fixture.detectChanges();
  return fixture;
};

describe('LoanAmortizationTableComponent (TICKET-LOAN-08)', () => {
  withCleanFormatSettings();

  it('opens expanded — the schedule is the panel you land on, not one you have to find (loan feedback)', async () => {
    const fixture = await createFixture(loan());

    expect(fixture.componentInstance['open']()).toBe(true);
    expect((fixture.nativeElement as HTMLElement).querySelector('.collapse')?.classList).toContain(
      'collapse-open',
    );
  });

  it('renders the principal-vs-interest composition chart above the table (loan feedback)', async () => {
    const fixture = await createFixture(loan());
    const host = fixture.nativeElement as HTMLElement;

    const chart = host.querySelector('app-loan-composition-chart');
    expect(chart).not.toBeNull();
    // Above, not below: the shape of the whole term reads first, the month rows are the detail.
    expect(chart!.compareDocumentPosition(host.querySelector('mm-table')!)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });

  it('paginates the schedule at 12 rows per page rather than dumping all termMonths at once', async () => {
    const testLoan = loan({ termMonths: 30 });
    const fixture = await createFixture(testLoan);

    expect(fixture.componentInstance['rows']()).toHaveLength(30);
    expect(fixture.componentInstance['pagination'].pagedItems()).toHaveLength(12);
    expect(fixture.componentInstance['pagination'].totalPages()).toBe(3);
  });

  it('shows the last page containing the final row, with remaining balance formatted as 0', async () => {
    const testLoan = loan({ termMonths: 30 });
    const fixture = await createFixture(testLoan);

    fixture.componentInstance['pagination'].setPage(3);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;

    const rows = [...host.querySelectorAll('tbody tr')];
    expect(rows).toHaveLength(6); // 30 rows, 12/page → last page has 6
    const lastRowCells = [...rows.at(-1)!.querySelectorAll('td')].map((cell) =>
      cell.textContent?.trim(),
    );
    expect(lastRowCells?.at(0)).toBe('30');
    expect(lastRowCells?.at(-1)).toContain('0.00');
  });

  it('recomputes the schedule (and clamps the page) when the loan input changes, never a stale table', async () => {
    const fixture = await createFixture(loan({ termMonths: 30 }));
    fixture.componentInstance['pagination'].setPage(3);
    fixture.detectChanges();
    expect(fixture.componentInstance['pagination'].currentPage()).toBe(3);

    // Edited down to a much shorter term (LOAN-03's edit path) — page 3 no longer exists.
    fixture.componentRef.setInput('loan', loan({ termMonths: 6 }));
    fixture.detectChanges();

    expect(fixture.componentInstance['rows']()).toHaveLength(6);
    expect(fixture.componentInstance['pagination'].totalPages()).toBe(1);
    expect(fixture.componentInstance['pagination'].currentPage()).toBe(1);
  });

  it('renders identical columns/behaviour for a mortgage and a non-mortgage loanType', async () => {
    const mortgage = await createFixture(loan({ loanType: 'mortgage' }));
    const auto = await createFixture(loan({ loanType: 'auto' }));

    const headerTextOf = (fixture: ComponentFixture<LoanAmortizationTableComponent>): string =>
      (fixture.nativeElement as HTMLElement).querySelector('thead')?.textContent ?? '';

    expect(headerTextOf(mortgage)).toBe(headerTextOf(auto));
  });

  it('formats every figure as currency and every date via formatDate, matching computeAmortizationSchedule', async () => {
    const testLoan = loan({ termMonths: 30 });
    const fixture = await createFixture(testLoan);
    const host = fixture.nativeElement as HTMLElement;

    const schedule = computeAmortizationSchedule(
      testLoan.principal,
      testLoan.interestRate,
      testLoan.termMonths,
      testLoan.startDate,
    );
    const firstRowCells = [...host.querySelectorAll('tbody tr')[0].querySelectorAll('td')].map(
      (cell) => cell.textContent?.trim(),
    );

    expect(firstRowCells[0]).toBe('1');
    expect(firstRowCells[1]).toBe(formatDate(schedule[0].date));
    expect(firstRowCells[2]).toBe(formatCurrency(schedule[0].payment));
    expect(firstRowCells[3]).toBe(formatCurrency(schedule[0].principalPortion));
    expect(firstRowCells[4]).toBe(formatCurrency(schedule[0].interestPortion));
    expect(firstRowCells[5]).toBe(formatCurrency(schedule[0].remainingBalance));
  });
});
