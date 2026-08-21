import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import {
  LoansRepository,
  TransactionsRepository,
  type Loan,
  type Transaction,
} from '@/core/data-access';
import { TransactionsStore } from '@/core/state';
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

describe('LoansStore: progressById (TICKET-LOAN-06)', () => {
  const loansRepository = {
    getAll: vi.fn().mockResolvedValue([]),
    add: vi.fn().mockResolvedValue(9),
    update: vi.fn().mockResolvedValue(1),
    remove: vi.fn().mockResolvedValue(undefined),
  };
  const transactionsRepository = { getAll: vi.fn().mockResolvedValue([]) };

  const transaction = (overrides: Partial<Transaction> = {}): Transaction => ({
    id: 1,
    accountId: 1,
    bookingDate: '2024-02-01',
    amount: -100,
    currency: 'EUR',
    rawDescription: 'Loan payment',
    fingerprint: 'fp-1',
    createdAt: '2024-02-01T00:00:00.000Z',
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    loansRepository.getAll.mockResolvedValue([]);
    transactionsRepository.getAll.mockResolvedValue([]);
    TestBed.configureTestingModule({
      providers: [
        { provide: LoansRepository, useValue: loansRepository },
        { provide: TransactionsRepository, useValue: transactionsRepository },
      ],
    });
  });

  it('is an empty map with zero loans', async () => {
    const store = TestBed.inject(LoansStore);
    await store.hydrate();
    await TestBed.inject(TransactionsStore).hydrate({ force: true });

    expect(store.progressById().size).toBe(0);
  });

  it('computes progress for a single loan from its own category’s transactions', async () => {
    loansRepository.getAll.mockResolvedValue([
      loan({ id: 1, categoryId: 1, principal: 1000, interestRate: 0, termMonths: 10 }),
    ]);
    transactionsRepository.getAll.mockResolvedValue([
      transaction({ id: 1, categoryId: 1, bookingDate: '2024-02-01', amount: -100 }),
    ]);
    const store = TestBed.inject(LoansStore);
    await store.hydrate();
    await TestBed.inject(TransactionsStore).hydrate({ force: true });

    const progress = store.progressById().get(1);
    expect(progress?.totalPrincipalPaid).toBeCloseTo(100, 6);
    expect(progress?.actualBalance).toBeCloseTo(900, 6);
  });

  it('keeps two loans’ progress independent, matching each to its own categoryId, mixed loanTypes', async () => {
    loansRepository.getAll.mockResolvedValue([
      loan({
        id: 1,
        loanType: 'mortgage',
        categoryId: 1,
        principal: 1000,
        interestRate: 0,
        termMonths: 10,
      }),
      loan({
        id: 2,
        loanType: 'auto',
        categoryId: 2,
        principal: 2000,
        interestRate: 0,
        termMonths: 20,
      }),
    ]);
    transactionsRepository.getAll.mockResolvedValue([
      // Loan 1's category.
      transaction({ id: 1, categoryId: 1, bookingDate: '2024-02-01', amount: -100 }),
      // Loan 2's category — a different amount, and a transaction in an unrelated category too.
      transaction({ id: 2, categoryId: 2, bookingDate: '2024-02-01', amount: -200 }),
      transaction({ id: 3, categoryId: 3, bookingDate: '2024-02-01', amount: -50 }),
    ]);
    const store = TestBed.inject(LoansStore);
    await store.hydrate();
    await TestBed.inject(TransactionsStore).hydrate({ force: true });

    const progressById = store.progressById();
    expect(progressById.get(1)?.totalPrincipalPaid).toBeCloseTo(100, 6);
    expect(progressById.get(2)?.totalPrincipalPaid).toBeCloseTo(200, 6);
  });

  it('recomputes when a new loan is added, with no manual subscription wiring', async () => {
    const store = TestBed.inject(LoansStore);
    await store.hydrate();
    await TestBed.inject(TransactionsStore).hydrate({ force: true });
    expect(store.progressById().size).toBe(0);

    await store.addLoan({
      name: 'New loan',
      loanType: 'personal',
      principal: 500,
      interestRate: 0,
      termMonths: 5,
      startDate: '2024-01-01',
      categoryId: 9,
      archived: false,
    });

    expect(store.progressById().size).toBe(1);
  });
});
