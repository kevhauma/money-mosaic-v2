import { appDb, LoansRepository, type Loan } from './index';

const carLoan = (overrides: Partial<Loan> = {}): Loan => ({
  name: 'Car loan (LOAN-01 spec)',
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

describe('LoansRepository: CRUD (TICKET-LOAN-01)', () => {
  const repository = new LoansRepository();
  // Only ever removes what it added — Vitest runs `isolate: false`, so `appDb` is shared across
  // every spec file in the worker.
  const created: number[] = [];

  const add = async (loan: Loan): Promise<number> => {
    const id = await repository.add(loan);
    created.push(id);
    return id;
  };

  afterEach(async () => {
    await appDb.loans.bulkDelete(created.splice(0));
  });

  it('adds a loan and reads it back via getAll', async () => {
    const id = await add(carLoan());

    const all = await repository.getAll();
    expect(all.find((loan) => loan.id === id)).toMatchObject({
      name: 'Car loan (LOAN-01 spec)',
      loanType: 'auto',
      principal: 20000,
    });
  });

  it('persists a non-mortgage loanType (student)', async () => {
    const id = await add(carLoan({ name: 'Student loan (LOAN-01 spec)', loanType: 'student' }));

    expect(await appDb.loans.get(id)).toMatchObject({ loanType: 'student' });
  });

  it('updates a loan', async () => {
    const id = await add(carLoan());

    await repository.update(id, { archived: true });

    expect((await appDb.loans.get(id))?.archived).toBe(true);
  });

  it('removes a loan', async () => {
    const id = await add(carLoan());

    await repository.remove(id);

    expect(await appDb.loans.get(id)).toBeUndefined();
  });
});
