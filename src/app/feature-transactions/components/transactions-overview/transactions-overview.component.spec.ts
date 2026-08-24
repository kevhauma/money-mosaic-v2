import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import {
  AccountsRepository,
  AppSettingsRepository,
  CategoriesRepository,
  RulesRepository,
  TransactionsRepository,
  type Category,
  type Rule,
  type Transaction,
} from '@/core/data-access';
import { RulesEngineService } from '@/core/categorisation';
import { AccountsStore, CategoriesStore, TransactionsStore } from '@/core/state';
import { RulesStore, type RuleFormValue } from '@/feature-categories';
import type { SelectionModel } from '@/shared/utils';
import type { TransactionFilters } from '../../transaction-filters';
import type { TransactionRowVm } from '../../transaction-row-vm';
import type { CategorySelectOption } from '../../category-picker';
import { TransactionsOverviewComponent } from './transactions-overview.component';

/** Protected surface we reach into for selection/bulk/filter assertions. */
type Internals = {
  selection: SelectionModel<number>;
  canLinkSelection: () => boolean;
  allFilteredSelected: () => boolean;
  filteredTransactions: () => Transaction[];
  filters: { set: (value: TransactionFilters) => void };
  pagination: { pagedItems: () => Transaction[] };
  rows: () => TransactionRowVm[];
  categoryOptions: () => CategorySelectOption[];
  selectedDateSpan: () => { from: string; to: string } | null;
  selectAllFiltered: () => void;
  applyBulkCategory: (categoryId: number) => Promise<void>;
  showUncategorisedOnly: () => void;
  onCategoryChange: (transaction: Transaction, categoryId: number | undefined) => Promise<void>;
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
  amountDirection: 'all',
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

  // Deterministic, not the real repository — this component's `formatDate` reads the shared,
  // settings-driven locale (TICKET-NG-10), and the real AppSettingsStore hydrates from the shared
  // fake-indexeddb singleton (Vitest isolate:false), which can carry a non-default locale left
  // behind by whatever spec ran last. Row-label assertions below assume the default (en-BE) locale.
  const appSettingsRepository = { get: vi.fn().mockResolvedValue({ id: 1 }) };

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
        { provide: AppSettingsRepository, useValue: appSettingsRepository },
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

  it('opens with a bare "Transactions" header and no subtitle caption (TICKET-UI-22)', async () => {
    await setup({});
    fixture.detectChanges();
    const header: HTMLElement | null = fixture.nativeElement.querySelector('mm-page-header');

    expect(header?.querySelector('h1')?.textContent?.trim()).toBe('Transactions');
    expect(header?.querySelector('.mm-text-caption')).toBeNull();
  });

  it('renders no range switcher anywhere — its filter bar already owns dates (TICKET-UI-23)', async () => {
    await setup({});
    fixture.detectChanges();
    const page: HTMLElement = fixture.nativeElement;

    expect(page.querySelector('mm-range-picker')).toBeNull();
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

    await component.onCategoryChange(store.transactions()[0], 7);

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

    await component.onCategoryChange(store.transactions()[0], undefined);

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

    await component.onCategoryChange(store.transactions()[0], 7);

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
      'Select transaction 01/06/2026 Row 1',
      'Select transaction 01/06/2026 Row 2',
    ]);
    expect(labels[0]).not.toBe(labels[1]);
  });

  describe('row view-model (TICKET-TXN-09)', () => {
    const category = (id: number, name: string, archived = false): Category => ({
      id,
      name,
      kind: 'expense',
      color: '#7F77DD',
      icon: 'tag',
      archived,
      isSystem: false,
      sortOrder: id,
    });

    /** Seeds both repositories before `setup()` so the stores' on-injection hydrate picks them up. */
    const setupWith = async (
      transactions: Transaction[],
      categories: Category[] = [],
    ): Promise<Internals> => {
      transactionsRepository.getAll.mockResolvedValue(transactions);
      categoriesRepository.getAll.mockResolvedValue(categories);
      await setup();
      await TestBed.inject(TransactionsStore).hydrate();
      await TestBed.inject(CategoriesStore).hydrate();
      await fixture.whenStable();
      return internals();
    };

    it('assembles the checkbox aria-label from the formatted date and the counterparty', async () => {
      const component = await setupWith([
        { ...transaction(1), counterpartyName: 'Carrefour', rawDescription: 'CARD PAYMENT' },
      ]);

      expect(component.rows()[0].ariaLabel).toBe('Select transaction 01/06/2026 Carrefour');
    });

    it('falls back to the raw description when the row has no counterparty', async () => {
      const component = await setupWith([transaction(1)]);

      expect(component.rows()[0].ariaLabel).toBe('Select transaction 01/06/2026 Row 1');
    });

    it("derives categoryId as the option's string value for a known category", async () => {
      const component = await setupWith(
        [{ ...transaction(1), categoryId: 7 }],
        [category(7, 'Groceries')],
      );

      expect(component.rows()[0].categoryId).toBe('7');
    });

    it('derives an empty categoryId for an uncategorised row', async () => {
      const component = await setupWith([transaction(1)], [category(7, 'Groceries')]);

      expect(component.rows()[0].categoryId).toBe('');
    });

    it('collapses a category id the store does not know to Uncategorised', async () => {
      const component = await setupWith(
        [{ ...transaction(1), categoryId: 999 }],
        [category(7, 'Groceries')],
      );

      expect(component.rows()[0].categoryId).toBe('');
    });

    it('carries the linked transfer id and drops it for an unlinked row', async () => {
      const component = await setupWith([transaction(1)]);

      expect(component.rows()[0].transferId).toBeUndefined();
      expect(component.rows()[0].id).toBe(1);
    });

    it('stringifies the quick-set option list once, excluding archived categories', async () => {
      const component = await setupWith(
        [transaction(1)],
        [category(7, 'Groceries'), category(9, 'Rent', true)],
      );

      expect(component.categoryOptions()).toEqual([{ value: '7', label: 'Groceries' }]);
    });
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

  describe('applicability-aware quick-set options (TICKET-CAT-11)', () => {
    const category = (id: number, name: string, window: Partial<Category> = {}): Category => ({
      id,
      name,
      kind: 'expense',
      color: '#7F77DD',
      icon: 'tag',
      archived: false,
      isSystem: false,
      sortOrder: id,
      ...window,
    });

    /** Same seeding shape as the row view-model block — both stores hydrate on injection. */
    const setupWith = async (
      transactions: Transaction[],
      categories: Category[],
    ): Promise<Internals> => {
      transactionsRepository.getAll.mockResolvedValue(transactions);
      categoriesRepository.getAll.mockResolvedValue(categories);
      await setup();
      await TestBed.inject(TransactionsStore).hydrate();
      await TestBed.inject(CategoriesStore).hydrate();
      await fixture.whenStable();
      return internals();
    };

    it('leaves a windowless category offered to every row, exactly as before', async () => {
      // `transaction(1)` is booked 2026-06-01.
      const component = await setupWith([transaction(1)], [category(7, 'Groceries')]);

      expect(component.categoryOptions()).toEqual([{ value: '7', label: 'Groceries' }]);
    });

    it('drops a category whose window closed before every visible row', async () => {
      const component = await setupWith(
        [transaction(1)],
        [category(7, 'Groceries'), category(9, 'Rent', { activeUntil: '2024-12-31' })],
      );

      expect(component.categoryOptions()).toEqual([{ value: '7', label: 'Groceries' }]);
    });

    it('offers a category whose window overlaps any part of the visible span', async () => {
      const component = await setupWith(
        [
          { ...transaction(1), bookingDate: '2024-03-01' },
          { ...transaction(2), bookingDate: '2026-06-01' },
        ],
        [category(9, 'Rent', { activeUntil: '2024-12-31' })],
      );

      expect(component.categoryOptions()).toEqual([{ value: '9', label: 'Rent' }]);
    });

    it('keeps an out-of-window category a visible row is already assigned to, suffixed', async () => {
      const component = await setupWith(
        [{ ...transaction(1), categoryId: 9 }],
        [category(7, 'Groceries'), category(9, 'Rent', { activeUntil: '2024-12-31' })],
      );

      expect(component.categoryOptions()).toEqual([
        { value: '7', label: 'Groceries' },
        { value: '9', label: 'Rent (ended)' },
      ]);
    });

    it('hands every row the very same option array, not one per row (TICKET-TXN-09)', async () => {
      const component = await setupWith(
        [transaction(1), transaction(2), transaction(3)],
        [category(7, 'Groceries')],
      );

      expect(component.rows()).toHaveLength(3);
      // Identity, not equality: the memoised computed is what stops fifty rows stringifying
      // fifty copies of the same list.
      expect(component.categoryOptions()).toBe(component.categoryOptions());
    });

    it('spans the selection, not the page, for the bulk bar', async () => {
      const component = await setupWith(
        [
          { ...transaction(1), bookingDate: '2024-03-01' },
          { ...transaction(2), bookingDate: '2026-06-01' },
        ],
        [],
      );

      component.selection.selectAll([2]);

      expect(component.selectedDateSpan()).toEqual({ from: '2026-06-01', to: '2026-06-01' });
    });
  });

  /**
   * TICKET-TXN-12 — the page renders *one* of its two row presentations, chosen by viewport width.
   * What matters here is the swap and that nothing is dropped in it; whether each card is readable
   * is `transaction-card.component.spec.ts`'s business.
   */
  describe('compact layout below the table breakpoint (TICKET-TXN-12)', () => {
    const groceries: Category = {
      id: 7,
      name: 'Groceries',
      kind: 'expense',
      color: '#7F77DD',
      icon: 'tag',
      archived: false,
      isSystem: false,
      sortOrder: 7,
    };

    /** jsdom evaluates no media query, so the width the page thinks it has is stubbed. */
    const stubViewport = (compact: boolean): void => {
      vi.stubGlobal(
        'matchMedia',
        vi.fn(() => ({
          matches: compact,
          addEventListener: () => undefined,
          removeEventListener: () => undefined,
        })),
      );
    };

    afterEach(() => vi.unstubAllGlobals());

    it('renders the table, and no cards, at desktop width', async () => {
      stubViewport(false);
      await setup();
      TestBed.inject(TransactionsStore).addMany([transaction(1), transaction(2)]);
      fixture.detectChanges();
      const page: HTMLElement = fixture.nativeElement;

      expect(page.querySelectorAll('app-transaction-row')).toHaveLength(2);
      expect(page.querySelectorAll('app-transaction-card')).toHaveLength(0);
      expect(page.querySelector('mm-table')).not.toBeNull();
    });

    it('renders a card per row, and no table, on a phone', async () => {
      stubViewport(true);
      await setup();
      TestBed.inject(TransactionsStore).addMany([transaction(1), transaction(2)]);
      fixture.detectChanges();
      const page: HTMLElement = fixture.nativeElement;

      expect(page.querySelectorAll('app-transaction-card')).toHaveLength(2);
      expect(page.querySelectorAll('app-transaction-row')).toHaveLength(0);
      expect(page.querySelector('mm-table')).toBeNull();
    });

    it('keeps select-all reachable without the table header it used to hang off', async () => {
      stubViewport(true);
      await setup();
      TestBed.inject(TransactionsStore).addMany([transaction(1), transaction(2)]);
      fixture.detectChanges();
      const page: HTMLElement = fixture.nativeElement;

      const selectAll = page.querySelector(
        'input[aria-label="Select all filtered transactions"]',
      ) as HTMLInputElement;
      expect(selectAll).not.toBeNull();

      selectAll.click();

      expect(internals().selection.count()).toBe(2);
    });

    /**
     * The two branches carry the same six bindings on different elements, so the failure mode is an
     * output wired in one and forgotten in the other. This drives every one of them through the
     * card and asserts it lands where the table row's does — the card's own spec checks what is
     * *rendered*, which would not catch a dropped `(editRequested)`.
     */
    it('routes a card’s actions to the same handlers the table rows use', async () => {
      stubViewport(true);
      transactionsRepository.getAll.mockResolvedValue([transaction(1), transaction(2)]);
      categoriesRepository.getAll.mockResolvedValue([groceries]);
      await setup();
      await TestBed.inject(TransactionsStore).hydrate();
      await TestBed.inject(CategoriesStore).hydrate();
      await fixture.whenStable();
      fixture.detectChanges();
      const page: HTMLElement = fixture.nativeElement;
      const firstCard = page.querySelector('app-transaction-card') as HTMLElement;

      (firstCard.querySelector('input[type="checkbox"]') as HTMLInputElement).click();
      expect(internals().selection.count()).toBe(1);

      (firstCard.querySelector('[aria-label="Edit transaction"]') as HTMLElement).click();
      expect((fixture.componentInstance as unknown as { formOpen: () => boolean }).formOpen()).toBe(
        true,
      );

      const select = firstCard.querySelector('select') as HTMLSelectElement;
      select.value = '7';
      select.dispatchEvent(new Event('change'));
      await fixture.whenStable();
      expect(transactionsRepository.update).toHaveBeenCalledWith(
        expect.any(Number),
        expect.objectContaining({ categoryId: 7, categoryManual: true }),
      );
    });
  });
});
