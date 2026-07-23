import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import {
  AccountsRepository,
  CategoriesRepository,
  RulesRepository,
  TransactionsRepository,
  type Category,
  type Rule,
  type Transaction,
} from '@/core/data-access';
import { RulesEngineService } from '@/core/categorisation';
import { AccountsStore, TransactionsStore } from '@/core/state';
import { RulesStore, type RuleFormValue } from '@/feature-categories';
import type { SelectionModel } from '@/shared/utils';
import type { TransactionFilters } from '../../transaction-filters';
import { TransactionsOverviewComponent } from './transactions-overview.component';

/** Protected surface we reach into for selection/bulk/filter assertions. */
type Internals = {
  selection: SelectionModel<number>;
  canLinkSelection: () => boolean;
  allFilteredSelected: () => boolean;
  filteredTransactions: () => Transaction[];
  filters: { set: (value: TransactionFilters) => void };
  pagination: { pagedItems: () => Transaction[] };
  rows: () => {
    transaction: Transaction;
    category: Category | undefined;
  }[];
  selectAllFiltered: () => void;
  applyBulkCategory: (categoryId: number) => Promise<void>;
  showUncategorisedOnly: () => void;
  onCategoryChange: (transaction: Transaction, rawCategoryId: string) => Promise<void>;
  openRuleFromFilter: () => void;
  saveRuleFromFilter: (value: RuleFormValue) => Promise<void>;
  ruleFormOpen: () => boolean;
  ruleFormDraft: () => Rule | null;
  ruleFormExcludedNote: () => string | null;
};

const noFilters: TransactionFilters = {
  accountId: '',
  dateFrom: '',
  dateTo: '',
  categoryId: '',
  text: '',
  amountMin: '',
  amountMax: '',
  amountDirection: 'expense',
};

const transaction = (id: number): Transaction => ({
  id,
  accountId: 1,
  bookingDate: '2026-06-01',
  amount: -10,
  currency: 'EUR',
  rawDescription: `Row ${id}`,
  fingerprint: `fp-${id}`,
  createdAt: '2026-06-01T00:00:00.000Z',
});

describe('TransactionsOverviewComponent', () => {
  let fixture: ComponentFixture<TransactionsOverviewComponent>;

  const transactionsRepository = {
    getAll: vi.fn().mockResolvedValue([]),
    update: vi.fn().mockResolvedValue(1),
    bulkUpdate: vi.fn().mockResolvedValue(0),
  };

  const accountsRepository = {
    getAll: vi.fn().mockResolvedValue([]),
  };

  const categoriesRepository = {
    getAll: vi.fn().mockResolvedValue([]),
  };

  const rulesRepository = {
    getAll: vi.fn().mockResolvedValue([]),
    add: vi.fn().mockResolvedValue(55),
  };

  const rulesEngineService = { runAndPersist: vi.fn().mockResolvedValue([]) };

  const setup = async (queryParams: Record<string, string> = {}): Promise<void> => {
    vi.clearAllMocks();
    await TestBed.configureTestingModule({
      imports: [TransactionsOverviewComponent],
      providers: [
        provideRouter([]),
        { provide: TransactionsRepository, useValue: transactionsRepository },
        { provide: AccountsRepository, useValue: accountsRepository },
        { provide: CategoriesRepository, useValue: categoriesRepository },
        { provide: RulesRepository, useValue: rulesRepository },
        { provide: RulesEngineService, useValue: rulesEngineService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TransactionsOverviewComponent);
    fixture.componentRef.setInput('accountId', queryParams['accountId']);
    fixture.componentRef.setInput('from', queryParams['from']);
    fixture.componentRef.setInput('to', queryParams['to']);
    fixture.componentRef.setInput('categoryId', queryParams['categoryId']);
    await fixture.whenStable();
  };

  const internals = (): Internals => fixture.componentInstance as unknown as Internals;

  it('should create with no query params', async () => {
    await setup({});
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('applies the filters emitted by the filter bar to filteredTransactions', async () => {
    await setup();
    TestBed.inject(TransactionsStore).addMany([
      { ...transaction(1), accountId: 1 },
      { ...transaction(2), accountId: 2 },
    ]);
    const component = internals();

    component.filters.set({ ...noFilters, accountId: '2' });

    expect(component.filteredTransactions().map((row) => row.id)).toEqual([2]);
  });

  it('delegates "show uncategorised only" to the filter bar and re-filters (the alert banner action)', async () => {
    await setup();
    TestBed.inject(TransactionsStore).addMany([
      { ...transaction(1), categoryId: 3 },
      transaction(2),
    ]);
    const component = internals();

    component.showUncategorisedOnly();
    await fixture.whenStable();

    expect(component.filteredTransactions().map((row) => row.id)).toEqual([2]);
  });

  it('hides movements to a savings account when the uncategorised filter is applied (TICKET-TRF-02)', async () => {
    // Mocked before setup() so AccountsStore's on-injection hydrate (TICKET-PERF-07) picks this
    // up — hydrate() is idempotent/cached, so reconfiguring the mock after the component is
    // created (and has already hydrated once) would be a no-op re-fetch.
    accountsRepository.getAll.mockResolvedValue([
      {
        id: 2,
        name: 'Savings',
        type: 'savings',
        currency: 'EUR',
        openingBalance: 0,
        openingBalanceDate: '2026-01-01',
        color: '#fff',
        icon: 'pig',
        archived: false,
        iban: 'BE00SAVINGS',
      },
    ]);
    await setup();
    const accountsStore = TestBed.inject(AccountsStore);
    await accountsStore.hydrate();

    TestBed.inject(TransactionsStore).addMany([
      { ...transaction(1), amount: -200, counterpartyIban: 'BE00SAVINGS' },
      { ...transaction(2), amount: -30, counterpartyIban: 'BE00SHOP' },
    ]);
    const component = internals();

    component.filters.set({ ...noFilters, categoryId: 'uncategorised' });

    // The savings movement (id 1) is dropped; the genuine uncategorised spend (id 2) stays.
    expect(component.filteredTransactions().map((row) => row.id)).toEqual([2]);
  });

  it('selects beyond two rows and reports the count for the bulk-action bar (TICKET-TXN-01)', async () => {
    await setup();
    TestBed.inject(TransactionsStore).addMany([transaction(1), transaction(2), transaction(3)]);
    const component = internals();

    component.selection.toggle(1);
    component.selection.toggle(2);
    component.selection.toggle(3);

    expect(component.selection.count()).toBe(3);
    // Transfer linking stays distinct: only ever active at exactly two rows.
    expect(component.canLinkSelection()).toBe(false);
  });

  it('keeps transfer linking active only at exactly two selected rows (TICKET-TXN-01)', async () => {
    await setup();
    TestBed.inject(TransactionsStore).addMany([transaction(1), transaction(2), transaction(3)]);
    const component = internals();

    component.selection.toggle(1);
    component.selection.toggle(2);
    expect(component.canLinkSelection()).toBe(true);

    component.selection.toggle(3);
    expect(component.canLinkSelection()).toBe(false);
  });

  it('select-all covers the whole filtered set, not just the visible page (TICKET-TXN-01)', async () => {
    await setup();
    const many = Array.from({ length: 60 }, (_, index) => transaction(index + 1));
    TestBed.inject(TransactionsStore).addMany(many);
    const component = internals();

    component.selectAllFiltered();

    expect(component.filteredTransactions().length).toBe(60);
    expect(component.pagination.pagedItems().length).toBe(50); // one page (PAGE_SIZE)
    expect(component.selection.count()).toBe(60);
    expect(component.allFilteredSelected()).toBe(true);
  });

  it('clears the selection after a successful bulk apply (TICKET-TXN-01)', async () => {
    await setup();
    TestBed.inject(TransactionsStore).addMany([transaction(1), transaction(2)]);
    const component = internals();
    component.selection.toggle(1);
    component.selection.toggle(2);

    await component.applyBulkCategory(7);

    expect(transactionsRepository.bulkUpdate).toHaveBeenCalledTimes(1);
    expect(component.selection.count()).toBe(0);
  });

  it('writes an inline category change immediately, marking it manual (TICKET-TXN-05)', async () => {
    await setup();
    const store = TestBed.inject(TransactionsStore);
    store.addMany([transaction(1)]);
    const component = internals();

    await component.onCategoryChange(store.transactions()[0], '7');

    expect(transactionsRepository.update).toHaveBeenCalledWith(1, {
      categoryId: 7,
      categoryManual: true,
    });
    expect(store.transactions()[0].categoryId).toBe(7);
    expect(store.transactions()[0].categoryManual).toBe(true);
  });

  it('sets categoryId to undefined when the inline select is set back to "Uncategorised" (TICKET-TXN-05)', async () => {
    await setup();
    const store = TestBed.inject(TransactionsStore);
    store.addMany([{ ...transaction(1), categoryId: 7 }]);
    const component = internals();

    await component.onCategoryChange(store.transactions()[0], '');

    expect(transactionsRepository.update).toHaveBeenCalledWith(1, {
      categoryId: undefined,
      categoryManual: true,
    });
    expect(store.transactions()[0].categoryId).toBeUndefined();
  });

  it('no-ops when the inline select is set to the category the row already has (TICKET-TXN-05)', async () => {
    await setup();
    const store = TestBed.inject(TransactionsStore);
    store.addMany([{ ...transaction(1), categoryId: 7 }]);
    const component = internals();

    await component.onCategoryChange(store.transactions()[0], '7');

    expect(transactionsRepository.update).not.toHaveBeenCalled();
  });

  it('gives each row checkbox a distinguishing accessible name (TICKET-TXN-07)', async () => {
    // Mocked before setup() so the store's on-injection hydrate (TICKET-PERF-07) picks this up —
    // hydrate() is idempotent/cached, so reconfiguring the mock after the component is created
    // (and has already hydrated once) would be a no-op re-fetch.
    transactionsRepository.getAll.mockResolvedValue([transaction(1), transaction(2)]);
    await setup();
    // Renders the table (not the loading skeleton) only once `hydrated()` is true (TICKET-PERF-05).
    await TestBed.inject(TransactionsStore).hydrate();
    fixture.detectChanges();
    await fixture.whenStable();

    const checkboxes = (fixture.nativeElement as HTMLElement).querySelectorAll(
      'tbody input[type="checkbox"]',
    );
    const labels = Array.from(checkboxes).map((checkbox) => checkbox.getAttribute('aria-label'));

    expect(labels).toEqual([
      'Select transaction 2026-06-01 Row 1',
      'Select transaction 2026-06-01 Row 2',
    ]);
    expect(labels[0]).not.toBe(labels[1]);
  });

  describe('"Make rule from filter" (TICKET-CAT-07)', () => {
    it('does nothing when the active filter has no convertible axis', async () => {
      await setup();
      const component = internals();
      component.filters.set({ ...noFilters, dateFrom: '2026-06-01' });

      component.openRuleFromFilter();

      expect(component.ruleFormOpen()).toBe(false);
      expect(component.ruleFormDraft()).toBeNull();
    });

    it('opens the rule-form modal pre-filled with conditions converted from the active filter', async () => {
      await setup();
      const component = internals();
      component.filters.set({ ...noFilters, text: 'netflix', accountId: '2' });

      component.openRuleFromFilter();

      expect(component.ruleFormOpen()).toBe(true);
      const draft = component.ruleFormDraft();
      expect(draft).toMatchObject({
        enabled: true,
        continueOnMatch: false,
        conditionMatch: 'all',
        conditions: [
          { field: 'description', operator: 'contains', value: 'netflix' },
          { field: 'accountId', operator: 'equals', value: 2 },
        ],
        action: { setCategoryId: 0 },
      });
      expect(draft?.id).toBeUndefined();
      expect(draft?.name).toContain('Rule from filter');
    });

    it('sets an excluded-axis note when the date/category filter axes are active alongside a convertible one', async () => {
      await setup();
      const component = internals();
      component.filters.set({
        ...noFilters,
        text: 'netflix',
        dateFrom: '2026-06-01',
        categoryId: '3',
      });

      component.openRuleFromFilter();

      const note = component.ruleFormExcludedNote();
      expect(note).toContain('Date range');
      expect(note).toContain('Category');
    });

    it('leaves the note empty when every active axis converted cleanly', async () => {
      await setup();
      const component = internals();
      component.filters.set({ ...noFilters, text: 'netflix' });

      component.openRuleFromFilter();

      expect(component.ruleFormExcludedNote()).toBeNull();
    });

    it('saveRuleFromFilter persists the rule through RulesStore (same path as createRuleFromCounterparty)', async () => {
      await setup();
      const component = internals();
      component.filters.set({ ...noFilters, text: 'netflix' });
      component.openRuleFromFilter();
      const draft = component.ruleFormDraft()!;

      await component.saveRuleFromFilter({
        name: draft.name,
        priority: draft.priority,
        enabled: draft.enabled,
        continueOnMatch: draft.continueOnMatch,
        conditionMatch: draft.conditionMatch,
        conditions: draft.conditions,
        action: { setCategoryId: 4 },
      });

      expect(rulesRepository.add).toHaveBeenCalledWith(
        expect.objectContaining({ action: { setCategoryId: 4 } }),
      );
      expect(rulesEngineService.runAndPersist).toHaveBeenCalled();
      expect(
        TestBed.inject(RulesStore)
          .rules()
          .some((r) => r.id === 55),
      ).toBe(true);
    });
  });
});
