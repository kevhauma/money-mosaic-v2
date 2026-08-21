import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { CategoriesRepository, type Category, type Loan } from '@/core/data-access';
import { CategoriesStore } from '@/core/state';
import { LoanFormComponent, type LoanFormValue } from './loan-form.component';

const category = (id: number, name: string): Category => ({
  id,
  name,
  kind: 'expense',
  color: '#7F77DD',
  icon: 'tag',
  archived: false,
  isSystem: false,
});

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

const categories = [
  category(1, 'Mortgage payment'),
  category(2, 'Car payment'),
  category(3, 'Groceries'),
];

const setup = async (existingLoans: Loan[] = []): Promise<ComponentFixture<LoanFormComponent>> => {
  await TestBed.configureTestingModule({
    imports: [LoanFormComponent],
    providers: [
      {
        provide: CategoriesRepository,
        useValue: { getAll: vi.fn().mockResolvedValue(categories) },
      },
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(LoanFormComponent);
  await TestBed.inject(CategoriesStore).hydrate();
  fixture.componentRef.setInput('existingLoans', existingLoans);
  fixture.componentRef.setInput('open', true);
  await fixture.whenStable();
  fixture.detectChanges();
  return fixture;
};

describe('LoanFormComponent: submission (TICKET-LOAN-03)', () => {
  const submitAndCapture = (
    fixture: ComponentFixture<LoanFormComponent>,
  ): { saved: LoanFormValue[]; component: LoanFormComponent } => {
    const saved: LoanFormValue[] = [];
    fixture.componentInstance.saved.subscribe((value) => saved.push(value));
    return { saved, component: fixture.componentInstance };
  };

  it('submits a valid mortgage-type loan', async () => {
    const fixture = await setup();
    const { saved, component } = submitAndCapture(fixture);

    component['form'].setValue({
      name: 'Home mortgage',
      loanType: 'mortgage',
      principal: '250000',
      interestRate: '3.5',
      termMonths: '240',
      startDate: '2024-01-01',
      categoryId: '1',
    });
    component['submit']();

    expect(saved).toEqual([
      {
        name: 'Home mortgage',
        loanType: 'mortgage',
        principal: 250000,
        interestRate: 3.5,
        termMonths: 240,
        startDate: '2024-01-01',
        categoryId: 1,
      },
    ]);
  });

  it('submits a valid auto-type loan on a different category', async () => {
    const fixture = await setup();
    const { saved, component } = submitAndCapture(fixture);

    component['form'].setValue({
      name: 'Car loan',
      loanType: 'auto',
      principal: '20000',
      interestRate: '4.5',
      termMonths: '60',
      startDate: '2024-06-01',
      categoryId: '2',
    });
    component['submit']();

    expect(saved).toEqual([
      {
        name: 'Car loan',
        loanType: 'auto',
        principal: 20000,
        interestRate: 4.5,
        termMonths: 60,
        startDate: '2024-06-01',
        categoryId: 2,
      },
    ]);
  });

  it('rejects submission when required fields are missing', async () => {
    const fixture = await setup();
    const { saved, component } = submitAndCapture(fixture);

    component['submit']();

    expect(saved).toEqual([]);
    expect(component['form'].invalid).toBe(true);
    expect(component['form'].controls.name.hasError('required')).toBe(true);
    expect(component['form'].controls.loanType.hasError('required')).toBe(true);
    expect(component['form'].controls.principal.hasError('required')).toBe(true);
    expect(component['form'].controls.interestRate.hasError('required')).toBe(true);
    expect(component['form'].controls.termMonths.hasError('required')).toBe(true);
    expect(component['form'].controls.categoryId.hasError('required')).toBe(true);
  });
});

describe('LoanFormComponent: duplicate-category validation (TICKET-LOAN-03)', () => {
  it('rejects a categoryId already linked to another active loan, naming it, regardless of loanType', async () => {
    const existing = loan({ id: 1, name: 'Home mortgage', loanType: 'mortgage', categoryId: 1 });
    const fixture = await setup([existing]);
    const component = fixture.componentInstance;

    // A different loanType (auto) reusing the mortgage's category.
    component['form'].patchValue({ loanType: 'auto', categoryId: '1' });

    expect(component['form'].hasError('duplicateCategory')).toBe(true);
    expect(component['duplicateCategoryError']).toBe(
      'This category is already linked to Home mortgage.',
    );
  });

  it('excludes the loan being edited from the duplicate check', async () => {
    const editing = loan({ id: 1, name: 'Home mortgage', loanType: 'mortgage', categoryId: 1 });
    const fixture = await setup([editing]);
    fixture.componentRef.setInput('loan', editing);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    // Re-saving the same loan against its own category must not trip the duplicate check.
    component['form'].patchValue({ categoryId: '1' });

    expect(component['form'].hasError('duplicateCategory')).toBe(false);
  });

  it('still flags a genuine conflict while editing a different loan', async () => {
    const other = loan({ id: 2, name: 'Car loan', loanType: 'auto', categoryId: 2 });
    const editing = loan({ id: 1, name: 'Home mortgage', loanType: 'mortgage', categoryId: 1 });
    const fixture = await setup([other, editing]);
    fixture.componentRef.setInput('loan', editing);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    // Editing loan 1 but pointing it at loan 2's category is still a real conflict.
    component['form'].patchValue({ categoryId: '2' });

    expect(component['form'].hasError('duplicateCategory')).toBe(true);
    expect(component['duplicateCategoryError']).toBe(
      'This category is already linked to Car loan.',
    );
  });
});
