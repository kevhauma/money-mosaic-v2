import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { vi } from 'vitest';
import type { Account, Category, Transaction } from '@/core/data-access';
import { AccountsStore, CategoriesStore, TransactionsStore } from '@/core/state';
import { CategoryModelStore } from '@/feature-categories';
import { confidenceToColor } from '@/shared/utils';
import { SuggestionsTableComponent } from './suggestions-table.component';

const activeCategory = (id: number, name: string): Category => ({
  id,
  name,
  kind: 'expense',
  color: '#000000',
  icon: 'tablerTag',
  sortOrder: id,
  archived: false,
  isSystem: false,
});

const account = (id: number, name: string): Account => ({
  id,
  name,
  type: 'checking',
  currency: 'EUR',
  openingBalance: 0,
  openingBalanceDate: '2026-01-01',
  color: '#fff',
  icon: 'bank',
  archived: false,
});

const uncategorisedTransaction = (id: number, overrides: Partial<Transaction> = {}): Transaction =>
  ({
    id,
    accountId: 1,
    bookingDate: '2026-07-01',
    amount: -10,
    currency: 'EUR',
    rawDescription: `Row ${id}`,
    fingerprint: `fp-${id}`,
    createdAt: '2026-07-01T00:00:00.000Z',
    ...overrides,
  }) as Transaction;

const findButtonByText = (fixture: ComponentFixture<unknown>, text: string) =>
  fixture.debugElement
    .queryAll(By.css('mm-button'))
    .find((debugElement) =>
      (debugElement.nativeElement.textContent as string).trim().includes(text),
    )!;

describe('SuggestionsTableComponent', () => {
  let fixture: ComponentFixture<SuggestionsTableComponent>;

  const categoryModelStore = {
    suggestions: signal(new Map<number, { categoryId: number; confidence: number }>()),
    acceptSuggestion: vi.fn().mockResolvedValue(undefined),
    dismissSuggestion: vi.fn(),
  };

  const categoriesStore = {
    activeCategories: signal<Category[]>([]),
    categoriesById: signal(new Map<number, Category>()),
  };

  const transactionsStore = {
    uncategorisedTransactions: signal<Transaction[]>([]),
    updateTransaction: vi.fn().mockResolvedValue(undefined),
  };

  const accountsStore = {
    accountsById: signal(new Map<number, Account>()),
  };

  const setup = async (): Promise<void> => {
    vi.clearAllMocks();
    categoryModelStore.suggestions.set(new Map());
    categoriesStore.activeCategories.set([]);
    categoriesStore.categoriesById.set(new Map());
    transactionsStore.uncategorisedTransactions.set([]);
    accountsStore.accountsById.set(new Map());
    await TestBed.configureTestingModule({
      imports: [SuggestionsTableComponent],
      providers: [
        { provide: CategoryModelStore, useValue: categoryModelStore },
        { provide: CategoriesStore, useValue: categoriesStore },
        { provide: TransactionsStore, useValue: transactionsStore },
        { provide: AccountsStore, useValue: accountsStore },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SuggestionsTableComponent);
    await fixture.whenStable();
  };

  const seedGroceries = (): void => {
    categoriesStore.categoriesById.set(new Map([[7, activeCategory(7, 'Groceries')]]));
    categoriesStore.activeCategories.set([activeCategory(7, 'Groceries')]);
    accountsStore.accountsById.set(new Map([[1, account(1, 'Checking')]]));
  };

  it('renders no rows and an empty state when there are no live suggestions', async () => {
    await setup();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.debugElement.query(By.css('table'))).toBeNull();
    expect(fixture.debugElement.query(By.css('mm-empty-state'))).not.toBeNull();
  });

  it('derives one row per uncategorised transaction with a matching suggestion, skipping ones without', async () => {
    await setup();
    seedGroceries();
    transactionsStore.uncategorisedTransactions.set([
      uncategorisedTransaction(1),
      uncategorisedTransaction(2),
    ]);
    categoryModelStore.suggestions.set(new Map([[1, { categoryId: 7, confidence: 0.842 }]]));
    const component = fixture.componentInstance as unknown as {
      rows: () => { transaction: Transaction; suggestedCategoryName: string; confidence: number }[];
    };

    const rows = component.rows();

    expect(rows).toHaveLength(1);
    expect(rows[0].transaction.id).toBe(1);
    expect(rows[0].suggestedCategoryName).toBe('Groceries');
    expect(rows[0].confidence).toBe(0.842);
  });

  it('renders the suggestion badge with confidence in its own column, separate from the category select', async () => {
    await setup();
    seedGroceries();
    transactionsStore.uncategorisedTransactions.set([uncategorisedTransaction(1)]);
    categoryModelStore.suggestions.set(new Map([[1, { categoryId: 7, confidence: 0.842 }]]));
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.debugElement.query(By.css('mm-empty-state'))).toBeNull();
    const badgeText = (fixture.debugElement.query(By.css('mm-badge')).nativeElement as HTMLElement)
      .textContent;
    expect(badgeText).toContain('Groceries');
    expect(badgeText).toContain('84%');
  });

  it('colours the suggestion badge on a red-to-green gradient by confidence (FR-ML-16)', async () => {
    await setup();
    seedGroceries();
    transactionsStore.uncategorisedTransactions.set([
      uncategorisedTransaction(1),
      uncategorisedTransaction(2),
    ]);
    categoryModelStore.suggestions.set(
      new Map([
        [1, { categoryId: 7, confidence: 0.5 }],
        [2, { categoryId: 7, confidence: 1 }],
      ]),
    );
    fixture.detectChanges();
    await fixture.whenStable();

    const badgeSpans = fixture.debugElement.queryAll(By.css('mm-badge span'));
    const lowConfidenceBg = (badgeSpans[0].nativeElement as HTMLElement).style.backgroundColor;
    const highConfidenceBg = (badgeSpans[1].nativeElement as HTMLElement).style.backgroundColor;

    // Compare against the same colour run through the browser's own CSSOM normalisation, rather
    // than a hand-computed hsl()→rgb() literal, so the assertion isn't coupled to jsdom's specific
    // colour-serialisation format.
    const reference = document.createElement('span');
    reference.style.backgroundColor = confidenceToColor(0.5);
    expect(lowConfidenceBg).toBe(reference.style.backgroundColor);
    reference.style.backgroundColor = confidenceToColor(1);
    expect(highConfidenceBg).toBe(reference.style.backgroundColor);
    expect(lowConfidenceBg).not.toBe(highConfidenceBg);
  });

  it('the category select always starts at "Uncategorised", never pre-filled with the suggestion (FR-ML-13 feedback)', async () => {
    await setup();
    seedGroceries();
    transactionsStore.uncategorisedTransactions.set([uncategorisedTransaction(1)]);
    categoryModelStore.suggestions.set(new Map([[1, { categoryId: 7, confidence: 0.842 }]]));
    fixture.detectChanges();
    await fixture.whenStable();

    const select = fixture.debugElement.query(By.css('select')).nativeElement as HTMLSelectElement;
    expect(select.value).toBe('');
  });

  it('overriding the category select calls updateTransaction with categoryManual: true', async () => {
    await setup();
    seedGroceries();
    transactionsStore.uncategorisedTransactions.set([uncategorisedTransaction(1)]);
    categoryModelStore.suggestions.set(new Map([[1, { categoryId: 7, confidence: 0.842 }]]));
    const component = fixture.componentInstance as unknown as {
      onCategoryChange: (transaction: Transaction, rawCategoryId: string) => Promise<void>;
    };

    await component.onCategoryChange(uncategorisedTransaction(1), '9');

    expect(transactionsStore.updateTransaction).toHaveBeenCalledExactlyOnceWith(1, {
      categoryId: 9,
      categoryManual: true,
    });
  });

  it('Accept calls CategoryModelStore.acceptSuggestion with the transaction id, exactly once', async () => {
    await setup();
    seedGroceries();
    transactionsStore.uncategorisedTransactions.set([uncategorisedTransaction(1)]);
    categoryModelStore.suggestions.set(new Map([[1, { categoryId: 7, confidence: 0.842 }]]));
    fixture.detectChanges();
    await fixture.whenStable();

    findButtonByText(fixture, 'Accept').triggerEventHandler('click');

    expect(categoryModelStore.acceptSuggestion).toHaveBeenCalledExactlyOnceWith(1);
    expect(categoryModelStore.dismissSuggestion).not.toHaveBeenCalled();
  });

  it('Dismiss calls CategoryModelStore.dismissSuggestion with the transaction id, without accepting', async () => {
    await setup();
    seedGroceries();
    transactionsStore.uncategorisedTransactions.set([uncategorisedTransaction(1)]);
    categoryModelStore.suggestions.set(new Map([[1, { categoryId: 7, confidence: 0.842 }]]));
    fixture.detectChanges();
    await fixture.whenStable();

    findButtonByText(fixture, 'Dismiss').triggerEventHandler('click');

    expect(categoryModelStore.dismissSuggestion).toHaveBeenCalledExactlyOnceWith(1);
    expect(categoryModelStore.acceptSuggestion).not.toHaveBeenCalled();
  });

  it('paginates: shows only the first page of rows and reports the correct page count', async () => {
    await setup();
    seedGroceries();
    const many = Array.from({ length: 60 }, (_, index) => uncategorisedTransaction(index + 1));
    transactionsStore.uncategorisedTransactions.set(many);
    categoryModelStore.suggestions.set(
      new Map(many.map((transaction) => [transaction.id!, { categoryId: 7, confidence: 0.9 }])),
    );
    fixture.detectChanges();
    await fixture.whenStable();

    const component = fixture.componentInstance as unknown as {
      rows: () => unknown[];
      pagination: { pagedItems: () => unknown[]; totalPages: () => number };
    };

    expect(component.rows()).toHaveLength(60);
    expect(component.pagination.pagedItems()).toHaveLength(50); // one page (PAGE_SIZE)
    expect(component.pagination.totalPages()).toBe(2);
    expect(fixture.debugElement.queryAll(By.css('tbody tr'))).toHaveLength(50);
    expect(fixture.debugElement.query(By.css('mm-paginator'))).not.toBeNull();
  });
});
