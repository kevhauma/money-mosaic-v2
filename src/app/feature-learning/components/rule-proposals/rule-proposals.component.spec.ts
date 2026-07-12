import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { vi } from 'vitest';
import type { Transaction } from '@/core/data-access';
import type { RuleProposal } from '@/core/ml';
import { CategoriesStore, CategoryModelStore } from '@/feature-categories';
import { TransactionsStore } from '@/feature-transactions';
import { RuleProposalsComponent } from './rule-proposals.component';

const makeProposal = (overrides: Partial<RuleProposal> = {}): RuleProposal => ({
  counterpartyName: 'Acme Corp',
  categoryId: 1,
  support: 5,
  meanConfidence: 0.876,
  sampleTransactionId: 100,
  transactionIds: [100],
  ...overrides,
});

const makeTransaction = (overrides: Partial<Transaction> = {}): Transaction => ({
  id: 100,
  accountId: 1,
  bookingDate: '2026-07-01',
  amount: -12.5,
  currency: 'EUR',
  rawDescription: 'Card payment',
  counterpartyName: 'Acme Corp',
  fingerprint: 'fp-100',
  createdAt: '2026-07-01T00:00:00.000Z',
  ...overrides,
});

const findButtonByText = (fixture: ComponentFixture<unknown>, text: string) =>
  fixture.debugElement
    .queryAll(By.css('mm-button'))
    .find((debugElement) =>
      (debugElement.nativeElement.textContent as string).trim().includes(text),
    )!;

describe('RuleProposalsComponent', () => {
  let fixture: ComponentFixture<RuleProposalsComponent>;

  const categoryModelStore = {
    ruleProposals: signal<RuleProposal[]>([]),
    acceptProposal: vi.fn().mockResolvedValue(undefined),
    dismissProposal: vi.fn(),
  };

  const categoriesStore = {
    categoriesById: signal(new Map([[1, { id: 1, name: 'Groceries' }]])),
  };

  const transactionsStore = {
    transactions: signal<Transaction[]>([]),
  };

  const setup = async (): Promise<void> => {
    vi.clearAllMocks();
    categoryModelStore.ruleProposals.set([]);
    transactionsStore.transactions.set([]);
    await TestBed.configureTestingModule({
      imports: [RuleProposalsComponent],
      providers: [
        { provide: CategoryModelStore, useValue: categoryModelStore },
        { provide: CategoriesStore, useValue: categoriesStore },
        { provide: TransactionsStore, useValue: transactionsStore },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RuleProposalsComponent);
    await fixture.whenStable();
  };

  it('renders one row per proposal with counterparty, category, support, and confidence', async () => {
    await setup();
    categoryModelStore.ruleProposals.set([
      makeProposal({
        counterpartyName: 'Acme Corp',
        categoryId: 1,
        support: 5,
        meanConfidence: 0.876,
      }),
      makeProposal({
        counterpartyName: 'Netflix',
        categoryId: 1,
        support: 3,
        meanConfidence: 0.921,
      }),
    ]);
    fixture.detectChanges();
    await fixture.whenStable();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Acme Corp');
    expect(text).toContain('5 matches · 88% confident');
    expect(text).toContain('Netflix');
    expect(text).toContain('3 matches · 92% confident');
    expect(text).toContain('Groceries');
  });

  it('Accept delegates to acceptProposal with the exact proposal object', async () => {
    await setup();
    const proposal = makeProposal();
    categoryModelStore.ruleProposals.set([proposal]);
    fixture.detectChanges();
    await fixture.whenStable();

    findButtonByText(fixture, 'Accept').triggerEventHandler('click');

    expect(categoryModelStore.acceptProposal).toHaveBeenCalledExactlyOnceWith(proposal);
    expect(categoryModelStore.dismissProposal).not.toHaveBeenCalled();
  });

  it('Dismiss delegates to dismissProposal without accepting', async () => {
    await setup();
    const proposal = makeProposal();
    categoryModelStore.ruleProposals.set([proposal]);
    fixture.detectChanges();
    await fixture.whenStable();

    findButtonByText(fixture, 'Dismiss').triggerEventHandler('click');

    expect(categoryModelStore.dismissProposal).toHaveBeenCalledExactlyOnceWith(proposal);
    expect(categoryModelStore.acceptProposal).not.toHaveBeenCalled();
  });

  it('renders no visible content when there are no proposals', async () => {
    await setup();
    categoryModelStore.ruleProposals.set([]);
    fixture.detectChanges();
    await fixture.whenStable();

    expect((fixture.nativeElement.textContent as string).trim()).toBe('');
    expect(fixture.debugElement.query(By.css('div'))).toBeNull();
  });

  it('hides the matched-transaction list until expanded, then shows exactly the cluster members', async () => {
    await setup();
    transactionsStore.transactions.set([
      makeTransaction({ id: 100, bookingDate: '2026-07-05', rawDescription: 'Card payment A' }),
      makeTransaction({ id: 101, bookingDate: '2026-07-01', rawDescription: 'Card payment B' }),
      makeTransaction({
        id: 999,
        bookingDate: '2026-07-01',
        rawDescription: 'Unrelated transaction',
      }),
    ]);
    categoryModelStore.ruleProposals.set([makeProposal({ transactionIds: [100, 101] })]);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent as string).not.toContain('Card payment');

    fixture.debugElement.query(By.css('mm-button[shape="square"]')).triggerEventHandler('click');
    fixture.detectChanges();
    await fixture.whenStable();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Card payment A');
    expect(text).toContain('Card payment B');
    expect(text).not.toContain('Unrelated transaction');
  });

  it('collapses again on a second toggle click', async () => {
    await setup();
    transactionsStore.transactions.set([makeTransaction({ id: 100 })]);
    categoryModelStore.ruleProposals.set([makeProposal({ transactionIds: [100] })]);
    fixture.detectChanges();
    await fixture.whenStable();

    const toggle = fixture.debugElement.query(By.css('mm-button[shape="square"]'));
    toggle.triggerEventHandler('click');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent as string).toContain('Card payment');

    toggle.triggerEventHandler('click');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent as string).not.toContain('Card payment');
  });
});
