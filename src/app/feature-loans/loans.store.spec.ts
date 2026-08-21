import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { LoansRepository, type Loan } from '@/core/data-access';
import { LoansStore } from './loans.store';

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

describe('LoansStore: display order, CRUD, and archiving (TICKET-LOAN-02)', () => {
  const loansRepository = {
    getAll: vi.fn().mockResolvedValue([]),
    add: vi.fn().mockResolvedValue(9),
    update: vi.fn().mockResolvedValue(1),
    remove: vi.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // `clearAllMocks` clears calls but keeps implementations, so the previous test's row set would
    // otherwise still be what `hydrate()` reads.
    loansRepository.getAll.mockResolvedValue([]);
    TestBed.configureTestingModule({
      providers: [{ provide: LoansRepository, useValue: loansRepository }],
    });
  });

  it('orders loans by sortOrder regardless of insertion order', async () => {
    loansRepository.getAll.mockResolvedValue([
      loan({ id: 1, name: 'Camera', sortOrder: 2 }),
      loan({ id: 2, name: 'Car', sortOrder: 0 }),
      loan({ id: 3, name: 'Mortgage', sortOrder: 1 }),
    ]);
    const store = TestBed.inject(LoansStore);
    await store.hydrate();

    expect(store.loans().map((entry) => entry.name)).toEqual(['Car', 'Mortgage', 'Camera']);
  });

  it('gives a newly added loan the next sortOrder, so it lands last', async () => {
    loansRepository.getAll.mockResolvedValue([
      loan({ id: 1, sortOrder: 0 }),
      loan({ id: 2, sortOrder: 3 }),
    ]);
    const store = TestBed.inject(LoansStore);
    await store.hydrate();

    const added = await store.addLoan(loan({ id: undefined, name: 'Student loan' }));

    expect(loansRepository.add).toHaveBeenCalledWith(expect.objectContaining({ sortOrder: 4 }));
    expect(added.sortOrder).toBe(4);
    expect(store.loans().at(-1)?.name).toBe('Student loan');
  });

  it('persists an edit through the repository', async () => {
    loansRepository.getAll.mockResolvedValue([loan({ id: 1, principal: 20000 })]);
    const store = TestBed.inject(LoansStore);
    await store.hydrate();

    await store.updateLoan(1, { principal: 18000 });

    expect(loansRepository.update).toHaveBeenCalledWith(1, { principal: 18000 });
    expect(store.loans()[0].principal).toBe(18000);
  });

  it('persists a delete through the repository', async () => {
    loansRepository.getAll.mockResolvedValue([loan({ id: 1 })]);
    const store = TestBed.inject(LoansStore);
    await store.hydrate();

    await store.removeLoan(1);

    expect(loansRepository.remove).toHaveBeenCalledWith(1);
    expect(store.loans()).toEqual([]);
  });

  it('splits active from archived loans', async () => {
    loansRepository.getAll.mockResolvedValue([
      loan({ id: 1, name: 'Car', archived: false, sortOrder: 0 }),
      loan({ id: 2, name: 'Paid off house', archived: true, sortOrder: 1 }),
    ]);
    const store = TestBed.inject(LoansStore);
    await store.hydrate();

    expect(store.activeLoans().map((entry) => entry.name)).toEqual(['Car']);
    expect(store.archivedLoans().map((entry) => entry.name)).toEqual(['Paid off house']);

    await store.archiveLoan(1);

    expect(loansRepository.update).toHaveBeenCalledWith(1, { archived: true });
    expect(store.activeLoans()).toEqual([]);
  });

  it('unarchives a loan back into the active list', async () => {
    loansRepository.getAll.mockResolvedValue([loan({ id: 1, archived: true })]);
    const store = TestBed.inject(LoansStore);
    await store.hydrate();

    await store.unarchiveLoan(1);

    expect(loansRepository.update).toHaveBeenCalledWith(1, { archived: false });
    expect(store.activeLoans().map((entry) => entry.id)).toEqual([1]);
  });
});
