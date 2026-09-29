import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import {
  AccountsRepository,
  CategoriesRepository,
  TransactionsRepository,
  PARTNER_CONTRIBUTION_CATEGORY_NAME,
  type Account,
  type Category,
  type Transaction,
} from '@/core/data-access';
import { CoOwnerContributionService } from './co-owner-contribution.service';

const jointAccount = (overrides: Partial<Account> = {}): Account => ({
  id: 1,
  name: 'Joint',
  type: 'joint',
  currency: 'EUR',
  openingBalance: 0,
  openingBalanceDate: '2026-01-01',
  color: '#fff',
  icon: 'users',
  archived: false,
  coOwners: [{ name: 'Partner', ibans: ['BE68539007547034'] }],
  ...overrides,
});

const partnerCategory = (overrides: Partial<Category> = {}): Category => ({
  id: 99,
  name: PARTNER_CONTRIBUTION_CATEGORY_NAME,
  kind: 'neutral',
  color: '#94A3B8',
  icon: 'users',
  archived: false,
  isSystem: true,
  ...overrides,
});

const transaction = (overrides: Partial<Transaction> = {}): Transaction => ({
  id: 1,
  accountId: 1,
  bookingDate: '2026-07-15',
  amount: 500,
  currency: 'EUR',
  rawDescription: "Partner's top-up",
  counterpartyIban: 'BE68539007547034',
  fingerprint: 'fp',
  createdAt: '2026-07-15T00:00:00.000Z',
  ...overrides,
});

const setup = () => {
  const accountsRepository = { getAll: vi.fn().mockResolvedValue([jointAccount()]) };
  const categoriesRepository = { getAll: vi.fn().mockResolvedValue([partnerCategory()]) };
  const transactionsRepository = { bulkUpdate: vi.fn().mockResolvedValue(1) };

  TestBed.configureTestingModule({
    providers: [
      CoOwnerContributionService,
      { provide: AccountsRepository, useValue: accountsRepository },
      { provide: CategoriesRepository, useValue: categoriesRepository },
      { provide: TransactionsRepository, useValue: transactionsRepository },
    ],
  });

  return {
    service: TestBed.inject(CoOwnerContributionService),
    accountsRepository,
    categoriesRepository,
    transactionsRepository,
  };
};

describe('CoOwnerContributionService', () => {
  it('resolves the seeded category by name and tags a matching joint-account inflow', () => {
    const { service } = setup();

    const updates = service.applyToTransactions(
      [transaction({ id: 1 })],
      [jointAccount()],
      [partnerCategory()],
    );

    expect(updates).toEqual([{ id: 1, categoryId: 99 }]);
  });

  it('returns no updates when the seeded category is missing (not yet migrated/seeded)', () => {
    const { service } = setup();

    const updates = service.applyToTransactions([transaction({ id: 1 })], [jointAccount()], []);

    expect(updates).toEqual([]);
  });

  it('persists resolved updates in one transactional call, not one request each', async () => {
    const ctx = setup();

    const updates = await ctx.service.runAndPersist([
      transaction({ id: 1 }),
      transaction({ id: 2 }),
    ]);

    expect(updates).toEqual([
      { id: 1, categoryId: 99 },
      { id: 2, categoryId: 99 },
    ]);
    // One endpoint, one SQLite transaction (TICKET-SRV-05): as N separate PATCHes, a failure partway
    // through would leave the import half-categorised with nothing saying which half.
    expect(ctx.transactionsRepository.bulkUpdate).toHaveBeenCalledExactlyOnceWith([
      { id: 1, changes: { categoryId: 99 } },
      { id: 2, changes: { categoryId: 99 } },
    ]);
  });
});
