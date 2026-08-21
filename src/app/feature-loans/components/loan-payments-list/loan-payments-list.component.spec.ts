import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { TransactionsRepository, type Loan, type Transaction } from '@/core/data-access';
import { TransactionsStore } from '@/core/state';
import { withCleanFormatSettings } from '@/shared/utils/format-settings.testing';
import { LoanPaymentsListComponent } from './loan-payments-list.component';

const loan = (overrides: Partial<Loan> = {}): Loan => ({
  id: 1,
  name: 'Home mortgage',
  loanType: 'mortgage',
  principal: 200000,
  interestRate: 6,
  termMonths: 360,
  startDate: '2024-01-01',
  categoryId: 1,
  archived: false,
  sortOrder: 0,
  ...overrides,
});

const payment = (id: number, bookingDate: string, categoryId: number): Transaction => ({
  id,
  accountId: 1,
  categoryId,
  bookingDate,
  amount: -100,
  currency: 'EUR',
  rawDescription: 'Loan payment',
  counterpartyName: 'Vesta Rentals',
  fingerprint: `fp-${id}`,
  createdAt: `${bookingDate}T00:00:00.000Z`,
});

const transactionsRepository = {
  getAll: vi.fn().mockResolvedValue([]),
  update: vi.fn().mockResolvedValue(1),
};

const createFixture = async (
  testLoan: Loan,
  transactions: Transaction[],
): Promise<ComponentFixture<LoanPaymentsListComponent>> => {
  TestBed.resetTestingModule();
  transactionsRepository.getAll.mockResolvedValue(transactions);
  await TestBed.configureTestingModule({
    imports: [LoanPaymentsListComponent],
    providers: [
      provideRouter([]),
      { provide: TransactionsRepository, useValue: transactionsRepository },
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(LoanPaymentsListComponent);
  fixture.componentRef.setInput('loan', testLoan);
  await TestBed.inject(TransactionsStore).hydrate({ force: true });
  fixture.detectChanges();
  return fixture;
};

describe('LoanPaymentsListComponent (TICKET-LOAN-09)', () => {
  withCleanFormatSettings();

  it('shows an empty state with zero payments', async () => {
    const fixture = await createFixture(loan(), []);
    const host = fixture.nativeElement as HTMLElement;

    expect(fixture.componentInstance['rows']()).toEqual([]);
    expect(host.textContent).toContain('No transactions in this loan');
  });

  it('lists a single payment', async () => {
    const fixture = await createFixture(loan(), [payment(1, '2024-02-01', 1)]);

    expect(fixture.componentInstance['rows']()).toHaveLength(1);
    expect(fixture.componentInstance['rows']()[0].id).toBe(1);
  });

  for (const loanType of ['mortgage', 'auto'] as const) {
    it(`sorts many payments most-recent-first, excluding other categories' transactions, for a ${loanType}-type loan`, async () => {
      const fixture = await createFixture(loan({ loanType, categoryId: 1 }), [
        payment(1, '2024-02-01', 1),
        payment(2, '2024-04-01', 1),
        payment(3, '2024-03-01', 2), // a different category — must not appear
        payment(4, '2024-03-01', 1),
      ]);

      const rows = fixture.componentInstance['rows']();
      expect(rows.map((row) => row.id)).toEqual([2, 4, 1]);
    });
  }

  it('builds a drilldown link scoped to each payment’s own date, account, and the loan’s category', async () => {
    const fixture = await createFixture(loan({ categoryId: 7 }), [
      { ...payment(1, '2024-02-01', 7), accountId: 3 },
    ]);

    const row = fixture.componentInstance['rows']()[0];
    expect(row.queryParams).toEqual({
      from: '2024-02-01',
      to: '2024-02-01',
      accountId: '3',
      categoryId: '7',
    });
  });

  it('updates reactively when a transaction is categorized into the linked category, with no manual refresh', async () => {
    const fixture = await createFixture(loan({ categoryId: 1 }), [
      payment(1, '2024-02-01', 2), // starts in a different category
    ]);
    expect(fixture.componentInstance['rows']()).toEqual([]);

    await TestBed.inject(TransactionsStore).updateTransaction(1, { categoryId: 1 });
    fixture.detectChanges();

    expect(fixture.componentInstance['rows']()).toHaveLength(1);
  });
});
