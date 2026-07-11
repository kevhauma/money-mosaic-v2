import type { Transaction } from '@/core/data-access';
import { validateNullified } from './nullify-transaction';

const transaction = (overrides: Partial<Transaction> = {}): Transaction => ({
  id: 1,
  accountId: 1,
  bookingDate: '2026-07-01',
  amount: -50,
  currency: 'EUR',
  rawDescription: 'Groceries',
  fingerprint: 'fp',
  createdAt: '2026-07-01T00:00:00.000Z',
  ...overrides,
});

describe('validateNullified', () => {
  it('rejects nullifying a transaction linked as a transfer', () => {
    expect(() => validateNullified(transaction({ transferId: 7 }), true)).toThrow(
      'A linked transfer leg cannot be nullified.',
    );
  });

  it('allows nullifying a plain, unlinked transaction', () => {
    expect(() => validateNullified(transaction(), true)).not.toThrow();
  });

  it('allows un-nullifying a transfer leg (setting nullified back to false)', () => {
    expect(() => validateNullified(transaction({ transferId: 7 }), false)).not.toThrow();
  });
});
