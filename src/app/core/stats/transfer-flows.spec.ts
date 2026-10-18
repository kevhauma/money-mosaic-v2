import type { Transaction } from '@/core/data-access';
import { computeTransferFlows } from './transfer-flows';

const transaction = (overrides: Partial<Transaction> = {}): Transaction => ({
  id: 1,
  accountId: 1,
  bookingDate: '2026-07-15',
  amount: -50,
  currency: 'EUR',
  rawDescription: 'Transfer',
  fingerprint: 'fp',
  createdAt: '2026-07-15T00:00:00.000Z',
  ...overrides,
});

const SAVINGS_IBAN = 'BE68539007547034';

describe('computeTransferFlows', () => {
  it('sums linked transfer legs in both directions as positive totals', () => {
    const result = computeTransferFlows(
      [
        transaction({ id: 1, amount: -200, transferId: 10 }),
        transaction({ id: 2, amount: 75, transferId: 11 }),
        transaction({ id: 3, amount: -30, transferId: 12 }),
      ],
      '2026-07-01',
      '2026-07-31',
    );

    expect(result).toEqual({ in: 75, out: 230 });
  });

  it('counts an unlinked savings movement, which income/expense also exclude', () => {
    const result = computeTransferFlows(
      [
        transaction({ id: 1, amount: -100, counterpartyIban: SAVINGS_IBAN }),
        transaction({ id: 2, amount: 40, counterpartyIban: SAVINGS_IBAN }),
      ],
      '2026-07-01',
      '2026-07-31',
      new Set([SAVINGS_IBAN]),
    );

    expect(result).toEqual({ in: 40, out: 100 });
  });

  it('leaves ordinary income and expense out', () => {
    const result = computeTransferFlows(
      [transaction({ id: 1, amount: -60 }), transaction({ id: 2, amount: 2500 })],
      '2026-07-01',
      '2026-07-31',
    );

    expect(result).toEqual({ in: 0, out: 0 });
  });

  it('skips nullified legs and legs outside the range', () => {
    const result = computeTransferFlows(
      [
        transaction({ id: 1, amount: -200, transferId: 10, nullified: true }),
        transaction({ id: 2, amount: -300, transferId: 11, bookingDate: '2026-06-30' }),
        transaction({ id: 3, amount: 90, transferId: 12, bookingDate: '2026-08-01' }),
        transaction({ id: 4, amount: -20, transferId: 13, bookingDate: '2026-07-31' }),
      ],
      '2026-07-01',
      '2026-07-31',
    );

    expect(result).toEqual({ in: 0, out: 20 });
  });
});
