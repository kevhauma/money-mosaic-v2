import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { LoansRepository, type Loan } from '@/core/data-access';
import { LoanDetailComponent } from './loan-detail.component';

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

const createFixture = async (
  loans: Loan[],
  id: string,
): Promise<ComponentFixture<LoanDetailComponent>> => {
  await TestBed.configureTestingModule({
    imports: [LoanDetailComponent],
    providers: [
      { provide: LoansRepository, useValue: { getAll: vi.fn().mockResolvedValue(loans) } },
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(LoanDetailComponent);
  fixture.componentRef.setInput('id', id);
  await fixture.whenStable();
  fixture.detectChanges();
  return fixture;
};

describe('LoanDetailComponent (TICKET-LOAN-06)', () => {
  it('resolves the loan by id and shows its name in the header', async () => {
    const fixture = await createFixture([loan({ id: 1, name: 'Home mortgage' })], '1');
    const host = fixture.nativeElement as HTMLElement;

    expect(host.querySelector('mm-page-header')?.textContent).toContain('Home mortgage');
  });

  it('falls back to a generic title when the id matches no loan', async () => {
    const fixture = await createFixture([loan({ id: 1, name: 'Home mortgage' })], '999');
    const host = fixture.nativeElement as HTMLElement;

    expect(host.querySelector('mm-page-header')?.textContent).toContain('Loan');
    expect(host.querySelector('mm-page-header')?.textContent).not.toContain('Home mortgage');
  });

  it('renders a placeholder empty state — LOAN-07 through LOAN-10 fill this page in', async () => {
    const fixture = await createFixture([loan({ id: 1 })], '1');
    const host = fixture.nativeElement as HTMLElement;

    expect(host.querySelector('mm-empty-state')).not.toBeNull();
    expect(host.textContent).toContain('More detail is on its way');
  });
});
