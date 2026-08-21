import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import {
  CategoriesRepository,
  LoansRepository,
  TransactionsRepository,
  type Loan,
  type Transaction,
} from '@/core/data-access';
import { LoansStore } from '../../loans.store';
import { LoansOverviewComponent } from './loans-overview.component';

const loansRepository = {
  getAll: vi.fn().mockResolvedValue([]),
  add: vi.fn().mockResolvedValue(9),
  update: vi.fn().mockResolvedValue(1),
  remove: vi.fn().mockResolvedValue(undefined),
};
const transactionsRepository = { getAll: vi.fn().mockResolvedValue([]) };

const createFixture = async (
  initialLoans: Loan[] = [],
  transactions: Transaction[] = [],
): Promise<ComponentFixture<LoansOverviewComponent>> => {
  vi.clearAllMocks();
  loansRepository.getAll.mockResolvedValue(initialLoans);
  transactionsRepository.getAll.mockResolvedValue(transactions);
  await TestBed.configureTestingModule({
    imports: [LoansOverviewComponent],
    providers: [
      provideRouter([]),
      { provide: LoansRepository, useValue: loansRepository },
      { provide: TransactionsRepository, useValue: transactionsRepository },
      { provide: CategoriesRepository, useValue: { getAll: vi.fn().mockResolvedValue([]) } },
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(LoansOverviewComponent);
  await TestBed.inject(LoansStore).hydrate();
  fixture.detectChanges();
  return fixture;
};

const loan = (overrides: Partial<Loan> = {}): Loan => ({
  id: 1,
  name: 'Car loan',
  loanType: 'auto',
  principal: 20000,
  interestRate: 4.5,
  termMonths: 60,
  startDate: '2024-01-01',
  categoryId: 1,
  archived: false,
  sortOrder: 0,
  ...overrides,
});

describe('LoansOverviewComponent (TICKET-LOAN-02)', () => {
  it('renders a page header titled "Loans"', async () => {
    const fixture = await createFixture();
    const host = fixture.nativeElement as HTMLElement;

    expect(host.querySelector('mm-page-header')?.textContent).toContain('Loans');
  });

  it('renders a placeholder empty state when there are no loans yet', async () => {
    const fixture = await createFixture();
    const host = fixture.nativeElement as HTMLElement;

    expect(host.querySelector('mm-empty-state')).not.toBeNull();
    expect(host.textContent).toContain('Loan tracking is on its way');
  });
});

describe('LoansOverviewComponent: add-loan wiring (TICKET-LOAN-03)', () => {
  it('opens the loan form in create mode from the "Add loan" button', async () => {
    const fixture = await createFixture();
    const host = fixture.nativeElement as HTMLElement;
    const button = [...host.querySelectorAll('button')].find((element) =>
      element.textContent?.includes('Add loan'),
    );

    button?.click();
    fixture.detectChanges();

    expect(fixture.componentInstance['editingLoan']()).toBeNull();
    expect(fixture.componentInstance['formOpen']()).toBe(true);
  });

  it('delegates a new loan to LoansStore.addLoan, never appDb directly', async () => {
    const fixture = await createFixture();

    await fixture.componentInstance['saveLoan']({
      name: 'Car loan',
      loanType: 'auto',
      principal: 20000,
      interestRate: 4.5,
      termMonths: 60,
      startDate: '2024-01-01',
      categoryId: 1,
    });

    expect(loansRepository.add).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Car loan', archived: false }),
    );
  });
});

describe('LoansOverviewComponent: overview cards (TICKET-LOAN-06)', () => {
  it('renders one card per active loan, excluding archived ones', async () => {
    const fixture = await createFixture([
      loan({ id: 1, name: 'Car loan', archived: false }),
      loan({ id: 2, name: 'Paid-off loan', archived: true }),
    ]);
    const host = fixture.nativeElement as HTMLElement;

    const cards = host.querySelectorAll('app-loan-card');
    expect(cards.length).toBe(1);
    expect(host.textContent).toContain('Car loan');
    expect(host.textContent).not.toContain('Paid-off loan');
  });

  it('renders a mortgage-type and an auto-type loan with the same card component, badges only differing by text', async () => {
    const fixture = await createFixture([
      loan({ id: 1, name: 'Home mortgage', loanType: 'mortgage', categoryId: 1 }),
      loan({ id: 2, name: 'Car loan', loanType: 'auto', categoryId: 2 }),
    ]);
    const host = fixture.nativeElement as HTMLElement;

    expect(host.querySelectorAll('app-loan-card').length).toBe(2);
    expect(host.textContent).toContain('Mortgage');
    expect(host.textContent).toContain('Auto');
  });

  it('a loan with categorised payments shows progress while an untouched one stays at 0%', async () => {
    const fixture = await createFixture(
      [
        loan({ id: 1, name: 'Home mortgage', categoryId: 1, principal: 1000, interestRate: 0 }),
        loan({ id: 2, name: 'Car loan', categoryId: 2, principal: 1000, interestRate: 0 }),
      ],
      [
        {
          id: 1,
          accountId: 1,
          categoryId: 1,
          bookingDate: '2024-02-01',
          amount: -100,
          currency: 'EUR',
          rawDescription: 'Mortgage payment',
          fingerprint: 'fp-1',
          createdAt: '2024-02-01T00:00:00.000Z',
        },
      ],
    );

    const paidCard = fixture.componentInstance['loanCards']().find((vm) => vm.loan.id === 1);
    const untouchedCard = fixture.componentInstance['loanCards']().find((vm) => vm.loan.id === 2);

    expect(paidCard?.percentPaidOff).toBeGreaterThan(0);
    expect(untouchedCard?.percentPaidOff).toBe(0);
  });
});
