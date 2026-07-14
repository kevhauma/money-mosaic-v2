import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import {
  RulesRepository,
  TransactionsRepository,
  type Rule,
  type Transaction,
} from '@/core/data-access';
import { RulesEngineService } from './rules-engine.service';

const transaction = (overrides: Partial<Transaction> = {}): Transaction => ({
  id: 1,
  accountId: 10,
  bookingDate: '2026-07-01',
  amount: -42.5,
  currency: 'EUR',
  rawDescription: 'CARREFOUR MARKET BRUSSELS',
  fingerprint: 'fp',
  createdAt: '2026-07-01T00:00:00.000Z',
  ...overrides,
});

const rule = (overrides: Partial<Rule> = {}): Rule => ({
  name: 'Groceries',
  priority: 10,
  enabled: true,
  continueOnMatch: false,
  conditions: [{ field: 'description', operator: 'contains', value: 'carrefour' }],
  action: { setCategoryId: 1 },
  ...overrides,
});

const setup = () => {
  const rulesRepository = { getAll: vi.fn().mockResolvedValue([rule()]) };
  const transactionsRepository = { update: vi.fn().mockResolvedValue(1) };

  TestBed.configureTestingModule({
    providers: [
      RulesEngineService,
      { provide: RulesRepository, useValue: rulesRepository },
      { provide: TransactionsRepository, useValue: transactionsRepository },
    ],
  });

  return {
    service: TestBed.inject(RulesEngineService),
    rulesRepository,
    transactionsRepository,
  };
};

describe('RulesEngineService: applyToTransactions', () => {
  it('assigns a category to a matching, unlinked, non-manual transaction', () => {
    const { service } = setup();

    const updates = service.applyToTransactions([transaction({ id: 1 })], [rule()]);

    expect(updates).toEqual([{ id: 1, categoryId: 1 }]);
  });

  it('prepares rules (regex compile included) once for the whole pass, not once per transaction (TICKET-PERF-02)', () => {
    const { service } = setup();
    // `new RegExp(String(value), ...)` stringifies its pattern — count `toString()` calls as a
    // proxy for compilation, since a real `RegExp` spy can't be swapped in without losing `.test`.
    let toStringCalls = 0;
    const trackedPattern = {
      toString: (): string => {
        toStringCalls++;
        return '^CARREFOUR';
      },
    };
    const regexRule = rule({
      conditions: [
        { field: 'description', operator: 'regex', value: trackedPattern as unknown as string },
      ],
    });

    service.applyToTransactions(
      [transaction({ id: 1 }), transaction({ id: 2 }), transaction({ id: 3 })],
      [regexRule],
    );

    expect(toStringCalls).toBe(1);
  });

  it('never touches a transaction whose category was manually set (FR-TXN-2, FR-CAT-3)', () => {
    const { service } = setup();

    const updates = service.applyToTransactions(
      [transaction({ id: 1, categoryManual: true })],
      [rule()],
    );

    expect(updates).toEqual([]);
  });

  it('never re-assigns a category to a transaction linked as a transfer, even with a cleared category (TICKET-TRF-01)', () => {
    const { service } = setup();

    const updates = service.applyToTransactions(
      [transaction({ id: 1, transferId: 99, categoryId: undefined })],
      [rule()],
    );

    expect(updates).toEqual([]);
  });

  it('skips a linked transaction regardless of any stale categoryId still present', () => {
    const { service } = setup();

    const updates = service.applyToTransactions([transaction({ id: 1, transferId: 99 })], [rule()]);

    expect(updates).toEqual([]);
  });
});

describe('RulesEngineService: runAndPersist', () => {
  it('persists only the computed updates, skipping manual and linked transactions', async () => {
    const ctx = setup();
    ctx.rulesRepository.getAll.mockResolvedValue([rule()]);

    const updates = await ctx.service.runAndPersist([
      transaction({ id: 1 }),
      transaction({ id: 2, categoryManual: true }),
      transaction({ id: 3, transferId: 5 }),
    ]);

    expect(updates).toEqual([{ id: 1, categoryId: 1 }]);
    expect(ctx.transactionsRepository.update).toHaveBeenCalledWith(1, { categoryId: 1 });
    expect(ctx.transactionsRepository.update).toHaveBeenCalledTimes(1);
  });
});
