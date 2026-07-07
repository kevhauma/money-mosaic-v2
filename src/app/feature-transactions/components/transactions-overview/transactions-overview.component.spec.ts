import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { AccountsRepository, TransactionsRepository, type Transaction } from '@/core/data-access';
import { AccountsStore } from '@/feature-accounts';
import type { SelectionModel } from '@/shared/utils';
import type { TransactionFilters } from '../../transaction-filters';
import { TransactionsStore } from '../../transactions.store';
import { TransactionsOverviewComponent } from './transactions-overview.component';

/** Protected surface we reach into for selection/bulk/filter assertions. */
type Internals = {
  selection: SelectionModel<number>;
  canLinkSelection: () => boolean;
  allFilteredSelected: () => boolean;
  filteredTransactions: () => Transaction[];
  filters: { set: (value: TransactionFilters) => void };
  pagination: { pagedItems: () => Transaction[] };
  selectAllFiltered: () => void;
  applyBulkCategory: (categoryId: number) => Promise<void>;
  showUncategorisedOnly: () => void;
};

const noFilters: TransactionFilters = {
  accountId: '',
  dateFrom: '',
  dateTo: '',
  categoryId: '',
  text: '',
  amountMin: '',
  amountMax: '',
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

  const setup = async (queryParams: Record<string, string> = {}): Promise<void> => {
    vi.clearAllMocks();
    await TestBed.configureTestingModule({
      imports: [TransactionsOverviewComponent],
      providers: [
        provideRouter([]),
        { provide: TransactionsRepository, useValue: transactionsRepository },
        { provide: AccountsRepository, useValue: accountsRepository },
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
    await setup();
    const accountsStore = TestBed.inject(AccountsStore);
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
});
