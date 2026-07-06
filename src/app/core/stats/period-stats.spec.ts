import type { Transaction } from '@/core/data-access';
import { computePeriodStats } from './period-stats';

const transaction = (overrides: Partial<Transaction> = {}): Transaction => ({
  id: 1,
  accountId: 1,
  bookingDate: '2026-07-15',
  amount: -50,
  currency: 'EUR',
  rawDescription: 'Groceries',
  fingerprint: 'fp',
  createdAt: '2026-07-15T00:00:00.000Z',
  ...overrides,
});

const SAVINGS_IBAN = 'BE00SAVINGS';
const ownSavings = new Set([SAVINGS_IBAN]);

describe('computePeriodStats', () => {
  it('sums income and expense separately and computes net', () => {
    const transactions = [
      transaction({ id: 1, amount: 1000 }),
      transaction({ id: 2, amount: -300 }),
      transaction({ id: 3, amount: -200 }),
    ];

    expect(computePeriodStats(transactions, '2026-07-01', '2026-07-31')).toEqual({
      income: 1000,
      expense: 500,
      savings: 0,
      net: 500,
      savingsRate: 0,
    });
  });

  it('excludes transactions linked as transfers from both income and expense (FR-STAT-2)', () => {
    const transactions = [
      transaction({ id: 1, amount: 1000 }),
      transaction({ id: 2, amount: -1000, transferId: 7 }),
    ];

    expect(computePeriodStats(transactions, '2026-07-01', '2026-07-31')).toEqual({
      income: 1000,
      expense: 0,
      savings: 0,
      net: 1000,
      savingsRate: 0,
    });
  });

  it('reports a one-sided movement to a savings IBAN as savings, not expense (TICKET-TRF-02)', () => {
    const transactions = [
      transaction({ id: 1, amount: 1000 }),
      // Unlinked (transferId null) outbound movement whose counterparty is an own savings account.
      transaction({ id: 2, amount: -200, counterpartyIban: SAVINGS_IBAN }),
    ];

    expect(computePeriodStats(transactions, '2026-07-01', '2026-07-31', ownSavings)).toEqual({
      income: 1000,
      expense: 0,
      savings: 200,
      net: 1000,
      savingsRate: 0.2,
    });
  });

  it('reports a linked transfer to savings as savings without double-counting the savings-side leg (TICKET-TRF-02)', () => {
    const transactions = [
      transaction({ id: 1, amount: 1000 }),
      // Spending-side leg: counterparty is the savings account.
      transaction({ id: 2, amount: -200, transferId: 9, counterpartyIban: SAVINGS_IBAN }),
      // Savings-side leg: sits in the savings account, counterparty points back at checking.
      transaction({ id: 3, amount: 200, transferId: 9, counterpartyIban: 'BE00CHECKING' }),
    ];

    expect(computePeriodStats(transactions, '2026-07-01', '2026-07-31', ownSavings)).toEqual({
      income: 1000,
      expense: 0,
      savings: 200,
      net: 1000,
      savingsRate: 0.2,
    });
  });

  it('does not count a withdrawal from savings as income — the reverse leg nets savings down (TICKET-TRF-02)', () => {
    const transactions = [
      transaction({ id: 1, amount: 1000 }),
      // Inbound from the savings account (money withdrawn back to checking).
      transaction({ id: 2, amount: 200, counterpartyIban: SAVINGS_IBAN }),
    ];

    expect(computePeriodStats(transactions, '2026-07-01', '2026-07-31', ownSavings)).toEqual({
      income: 1000,
      expense: 0,
      savings: -200,
      net: 1000,
      savingsRate: -0.2,
    });
  });

  it('still counts an expense to a non-savings counterparty as expense (TICKET-TRF-02)', () => {
    const transactions = [transaction({ id: 1, amount: -50, counterpartyIban: 'BE00SHOP' })];

    expect(computePeriodStats(transactions, '2026-07-01', '2026-07-31', ownSavings)).toEqual({
      income: 0,
      expense: 50,
      savings: 0,
      net: -50,
      savingsRate: null,
    });
  });

  it('excludes transactions outside the date range', () => {
    const transactions = [
      transaction({ id: 1, amount: 1000, bookingDate: '2026-06-30' }),
      transaction({ id: 2, amount: -300, bookingDate: '2026-07-15' }),
      transaction({ id: 3, amount: -200, bookingDate: '2026-08-01' }),
    ];

    expect(computePeriodStats(transactions, '2026-07-01', '2026-07-31')).toEqual({
      income: 0,
      expense: 300,
      savings: 0,
      net: -300,
      savingsRate: null,
    });
  });

  it('includes transactions on the exact from/to boundary dates', () => {
    const transactions = [
      transaction({ id: 1, amount: 100, bookingDate: '2026-07-01' }),
      transaction({ id: 2, amount: 100, bookingDate: '2026-07-31' }),
    ];

    expect(computePeriodStats(transactions, '2026-07-01', '2026-07-31').income).toBe(200);
  });

  it('returns null savings rate when income is zero, rather than dividing by zero', () => {
    const transactions = [transaction({ id: 1, amount: -100 })];
    expect(computePeriodStats(transactions, '2026-07-01', '2026-07-31').savingsRate).toBeNull();
  });
});
