import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { CategoriesRepository, LoansRepository, type Loan } from '@/core/data-access';
import { LoansStore } from '../../loans.store';
import { LoansOverviewComponent } from './loans-overview.component';

const loansRepository = {
  getAll: vi.fn().mockResolvedValue([]),
  add: vi.fn().mockResolvedValue(9),
  update: vi.fn().mockResolvedValue(1),
  remove: vi.fn().mockResolvedValue(undefined),
};

const createFixture = async (
  initialLoans: Loan[] = [],
): Promise<ComponentFixture<LoansOverviewComponent>> => {
  vi.clearAllMocks();
  loansRepository.getAll.mockResolvedValue(initialLoans);
  await TestBed.configureTestingModule({
    imports: [LoansOverviewComponent],
    providers: [
      { provide: LoansRepository, useValue: loansRepository },
      { provide: CategoriesRepository, useValue: { getAll: vi.fn().mockResolvedValue([]) } },
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(LoansOverviewComponent);
  await TestBed.inject(LoansStore).hydrate();
  fixture.detectChanges();
  return fixture;
};

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

  it('shows a different placeholder once a loan exists, until LOAN-06 adds real cards', async () => {
    const fixture = await createFixture([loan()]);
    const host = fixture.nativeElement as HTMLElement;

    expect(host.textContent).toContain('Loan cards are coming soon');
    expect(host.textContent).not.toContain('Loan tracking is on its way');
  });
});
