import type { Transaction } from '@/core/data-access';
import { matchesTransactionFilters, type TransactionFilters } from './transaction-filters';

const noFilters: TransactionFilters = {
  accountId: '',
  dateFrom: '',
  dateTo: '',
  categoryId: '',
  text: '',
  amountMin: '',
  amountMax: '',
};

const transaction = (overrides: Partial<Transaction> = {}): Transaction => ({
  id: 1,
  accountId: 1,
  bookingDate: '2026-06-15',
  amount: -42,
  currency: 'EUR',
  rawDescription: 'Grocery run',
  counterpartyName: 'Super Market',
  fingerprint: 'fp-1',
  createdAt: '2026-06-15T00:00:00.000Z',
  ...overrides,
});

describe('matchesTransactionFilters', () => {
  it('matches everything when no filter is active', () => {
    expect(matchesTransactionFilters(transaction(), noFilters, new Set())).toBe(true);
  });

  describe('account axis', () => {
    it('matches the transaction on the selected account', () => {
      const filters = { ...noFilters, accountId: '1' };
      expect(matchesTransactionFilters(transaction({ accountId: 1 }), filters, new Set())).toBe(
        true,
      );
    });

    it('rejects a transaction on a different account', () => {
      const filters = { ...noFilters, accountId: '2' };
      expect(matchesTransactionFilters(transaction({ accountId: 1 }), filters, new Set())).toBe(
        false,
      );
    });
  });

  describe('date range axis', () => {
    it('rejects a transaction booked before dateFrom', () => {
      const filters = { ...noFilters, dateFrom: '2026-06-16' };
      expect(
        matchesTransactionFilters(transaction({ bookingDate: '2026-06-15' }), filters, new Set()),
      ).toBe(false);
    });

    it('rejects a transaction booked after dateTo', () => {
      const filters = { ...noFilters, dateTo: '2026-06-14' };
      expect(
        matchesTransactionFilters(transaction({ bookingDate: '2026-06-15' }), filters, new Set()),
      ).toBe(false);
    });

    it('matches a transaction inside the range', () => {
      const filters = { ...noFilters, dateFrom: '2026-06-01', dateTo: '2026-06-30' };
      expect(
        matchesTransactionFilters(transaction({ bookingDate: '2026-06-15' }), filters, new Set()),
      ).toBe(true);
    });
  });

  describe('category axis', () => {
    it('matches a transaction with the selected category', () => {
      const filters = { ...noFilters, categoryId: '3' };
      expect(matchesTransactionFilters(transaction({ categoryId: 3 }), filters, new Set())).toBe(
        true,
      );
    });

    it('rejects a transaction with a different category', () => {
      const filters = { ...noFilters, categoryId: '3' };
      expect(matchesTransactionFilters(transaction({ categoryId: 4 }), filters, new Set())).toBe(
        false,
      );
    });

    it('uncategorised sentinel matches a transaction with no category', () => {
      const filters = { ...noFilters, categoryId: 'uncategorised' };
      expect(
        matchesTransactionFilters(transaction({ categoryId: undefined }), filters, new Set()),
      ).toBe(true);
    });

    it('uncategorised sentinel rejects a transaction that already has a category', () => {
      const filters = { ...noFilters, categoryId: 'uncategorised' };
      expect(matchesTransactionFilters(transaction({ categoryId: 3 }), filters, new Set())).toBe(
        false,
      );
    });

    it('uncategorised sentinel rejects a movement to an own savings account (TICKET-TRF-02)', () => {
      const filters = { ...noFilters, categoryId: 'uncategorised' };
      const ownSavingsIbans = new Set(['BE00SAVINGS']);
      expect(
        matchesTransactionFilters(
          transaction({ categoryId: undefined, counterpartyIban: 'BE00SAVINGS' }),
          filters,
          ownSavingsIbans,
        ),
      ).toBe(false);
    });
  });

  describe('text axis', () => {
    it('matches on rawDescription, case-insensitively', () => {
      const filters = { ...noFilters, text: 'grocery' };
      expect(
        matchesTransactionFilters(
          transaction({ rawDescription: 'Grocery Run' }),
          filters,
          new Set(),
        ),
      ).toBe(true);
    });

    it('matches on counterpartyName', () => {
      const filters = { ...noFilters, text: 'super market' };
      expect(
        matchesTransactionFilters(
          transaction({ rawDescription: 'x', counterpartyName: 'Super Market' }),
          filters,
          new Set(),
        ),
      ).toBe(true);
    });

    it('rejects when the needle appears nowhere', () => {
      const filters = { ...noFilters, text: 'zzz' };
      expect(matchesTransactionFilters(transaction(), filters, new Set())).toBe(false);
    });
  });

  describe('amount axis', () => {
    it('rejects a transaction below amountMin', () => {
      const filters = { ...noFilters, amountMin: '0' };
      expect(matchesTransactionFilters(transaction({ amount: -42 }), filters, new Set())).toBe(
        false,
      );
    });

    it('rejects a transaction above amountMax', () => {
      const filters = { ...noFilters, amountMax: '-50' };
      expect(matchesTransactionFilters(transaction({ amount: -42 }), filters, new Set())).toBe(
        false,
      );
    });

    it('matches a transaction inside the amount range', () => {
      const filters = { ...noFilters, amountMin: '-100', amountMax: '0' };
      expect(matchesTransactionFilters(transaction({ amount: -42 }), filters, new Set())).toBe(
        true,
      );
    });
  });

  it('combines axes with AND semantics', () => {
    const filters: TransactionFilters = {
      accountId: '1',
      dateFrom: '2026-06-01',
      dateTo: '2026-06-30',
      categoryId: '',
      text: 'grocery',
      amountMin: '-100',
      amountMax: '0',
    };
    expect(
      matchesTransactionFilters(
        transaction({ accountId: 1, bookingDate: '2026-06-15', amount: -42 }),
        filters,
        new Set(),
      ),
    ).toBe(true);

    // Same transaction, but the account axis alone now disqualifies it.
    expect(
      matchesTransactionFilters(
        transaction({ accountId: 2, bookingDate: '2026-06-15', amount: -42 }),
        filters,
        new Set(),
      ),
    ).toBe(false);
  });
});
