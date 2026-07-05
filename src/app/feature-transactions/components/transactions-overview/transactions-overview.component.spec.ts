import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { TransactionsRepository, type Transaction } from '@/core/data-access';
import { TransactionsStore } from '../../transactions.store';
import { TransactionsOverviewComponent } from './transactions-overview.component';

/** Protected surface we reach into for selection/bulk assertions. */
type Internals = {
  selectionCount: () => number;
  canLinkSelection: () => boolean;
  allFilteredSelected: () => boolean;
  filteredTransactions: () => Transaction[];
  pagination: { pagedItems: () => Transaction[] };
  bulkCategoryControl: { setValue: (value: string) => void };
  toggleSelected: (id: number) => void;
  selectAllFiltered: () => void;
  clearSelection: () => void;
  applyBulkCategory: () => Promise<void>;
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

  const setup = async (queryParams: Record<string, string> = {}): Promise<void> => {
    vi.clearAllMocks();
    await TestBed.configureTestingModule({
      imports: [TransactionsOverviewComponent],
      providers: [
        provideRouter([]),
        { provide: TransactionsRepository, useValue: transactionsRepository },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap(queryParams) } },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TransactionsOverviewComponent);
    await fixture.whenStable();
  };

  const internals = (): Internals => fixture.componentInstance as unknown as Internals;

  it('should create with no query params', async () => {
    await setup({});
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('pre-fills the filter form from drill-down query params (FR-STAT-6)', async () => {
    await setup({ from: '2026-07-01', to: '2026-07-31', categoryId: '3', accountId: '2' });

    const filterForm = (fixture.componentInstance as unknown as { filterForm: { value: unknown } })
      .filterForm;
    expect(filterForm.value).toEqual({
      accountId: '2',
      dateFrom: '2026-07-01',
      dateTo: '2026-07-31',
      categoryId: '3',
      text: '',
      amountMin: '',
      amountMax: '',
    });
  });

  it('accepts the uncategorised sentinel from a query param', async () => {
    await setup({ categoryId: 'uncategorised' });

    const filterForm = (
      fixture.componentInstance as unknown as { filterForm: { value: { categoryId: string } } }
    ).filterForm;
    expect(filterForm.value.categoryId).toBe('uncategorised');
  });

  it('selects beyond two rows and reports the count for the bulk-action bar (TICKET-TXN-01)', async () => {
    await setup();
    TestBed.inject(TransactionsStore).addMany([transaction(1), transaction(2), transaction(3)]);
    const component = internals();

    component.toggleSelected(1);
    component.toggleSelected(2);
    component.toggleSelected(3);

    expect(component.selectionCount()).toBe(3);
    // Transfer linking stays distinct: only ever active at exactly two rows.
    expect(component.canLinkSelection()).toBe(false);
  });

  it('keeps transfer linking active only at exactly two selected rows (TICKET-TXN-01)', async () => {
    await setup();
    TestBed.inject(TransactionsStore).addMany([transaction(1), transaction(2), transaction(3)]);
    const component = internals();

    component.toggleSelected(1);
    component.toggleSelected(2);
    expect(component.canLinkSelection()).toBe(true);

    component.toggleSelected(3);
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
    expect(component.selectionCount()).toBe(60);
    expect(component.allFilteredSelected()).toBe(true);
  });

  it('clears the selection after a successful bulk apply (TICKET-TXN-01)', async () => {
    await setup();
    TestBed.inject(TransactionsStore).addMany([transaction(1), transaction(2)]);
    const component = internals();
    component.toggleSelected(1);
    component.toggleSelected(2);
    component.bulkCategoryControl.setValue('7');

    await component.applyBulkCategory();

    expect(transactionsRepository.bulkUpdate).toHaveBeenCalledTimes(1);
    expect(component.selectionCount()).toBe(0);
  });
});
