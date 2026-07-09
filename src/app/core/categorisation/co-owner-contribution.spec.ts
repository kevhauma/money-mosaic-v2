import type { Account, Transaction } from '@/core/data-access';
import { resolveCoOwnerContributionUpdates } from './co-owner-contribution';

const PARTNER_CATEGORY_ID = 42;

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

describe('resolveCoOwnerContributionUpdates', () => {
  it('tags a joint-account inflow whose counterparty IBAN matches a registered co-owner', () => {
    const accountsById = new Map([[1, jointAccount()]]);

    const updates = resolveCoOwnerContributionUpdates(
      [transaction({ id: 1 })],
      accountsById,
      PARTNER_CATEGORY_ID,
    );

    expect(updates).toEqual([{ id: 1, categoryId: PARTNER_CATEGORY_ID }]);
  });

  it('never touches a manually-categorised transaction (FR-CAT-3)', () => {
    const accountsById = new Map([[1, jointAccount()]]);

    const updates = resolveCoOwnerContributionUpdates(
      [transaction({ id: 1, categoryManual: true })],
      accountsById,
      PARTNER_CATEGORY_ID,
    );

    expect(updates).toEqual([]);
  });

  it('never re-tags a transaction linked as a transfer', () => {
    const accountsById = new Map([[1, jointAccount()]]);

    const updates = resolveCoOwnerContributionUpdates(
      [transaction({ id: 1, transferId: 9 })],
      accountsById,
      PARTNER_CATEGORY_ID,
    );

    expect(updates).toEqual([]);
  });

  it('ignores an outflow (negative amount) even from a registered co-owner IBAN', () => {
    const accountsById = new Map([[1, jointAccount()]]);

    const updates = resolveCoOwnerContributionUpdates(
      [transaction({ id: 1, amount: -500 })],
      accountsById,
      PARTNER_CATEGORY_ID,
    );

    expect(updates).toEqual([]);
  });

  it('ignores a non-joint account even if the counterparty IBAN happens to match', () => {
    const accountsById = new Map([[1, jointAccount({ type: 'checking' })]]);

    const updates = resolveCoOwnerContributionUpdates(
      [transaction({ id: 1 })],
      accountsById,
      PARTNER_CATEGORY_ID,
    );

    expect(updates).toEqual([]);
  });

  it('ignores an inflow whose counterparty IBAN is not a registered co-owner', () => {
    const accountsById = new Map([[1, jointAccount()]]);

    const updates = resolveCoOwnerContributionUpdates(
      [transaction({ id: 1, counterpartyIban: 'BE00UNKNOWN' })],
      accountsById,
      PARTNER_CATEGORY_ID,
    );

    expect(updates).toEqual([]);
  });

  it('skips a transaction already tagged with the partner contribution category', () => {
    const accountsById = new Map([[1, jointAccount()]]);

    const updates = resolveCoOwnerContributionUpdates(
      [transaction({ id: 1, categoryId: PARTNER_CATEGORY_ID })],
      accountsById,
      PARTNER_CATEGORY_ID,
    );

    expect(updates).toEqual([]);
  });
});
