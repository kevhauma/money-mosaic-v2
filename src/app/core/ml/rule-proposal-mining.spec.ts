import type { Rule, Transaction } from '@/core/data-access';
import { mineRuleProposals, type Prediction } from './rule-proposal-mining';

const transaction = (overrides: Partial<Transaction> = {}): Transaction => ({
  id: 1,
  accountId: 10,
  bookingDate: '2026-07-01',
  amount: -42.5,
  currency: 'EUR',
  rawDescription: 'CARREFOUR MARKET BRUSSELS',
  counterpartyName: 'Carrefour',
  fingerprint: 'fp',
  createdAt: '2026-07-01T00:00:00.000Z',
  ...overrides,
});

const rule = (overrides: Partial<Rule> = {}): Rule => ({
  name: 'Test rule',
  priority: 10,
  enabled: true,
  continueOnMatch: false,
  conditions: [{ field: 'counterpartyName', operator: 'equals', value: 'Carrefour' }],
  action: { setCategoryId: 1 },
  ...overrides,
});

const thresholds = { minSupport: 3, minConfidence: 0.8 };

describe('mineRuleProposals', () => {
  it('proposes a cluster that meets both thresholds', () => {
    const transactions = [transaction({ id: 1 }), transaction({ id: 2 }), transaction({ id: 3 })];
    const transactionsById = new Map(transactions.map((t) => [t.id!, t]));
    const predictions: Prediction[] = [
      { transactionId: 1, categoryId: 5, confidence: 0.9 },
      { transactionId: 2, categoryId: 5, confidence: 0.95 },
      { transactionId: 3, categoryId: 5, confidence: 0.85 },
    ];

    const proposals = mineRuleProposals(predictions, transactionsById, [], thresholds);

    expect(proposals).toHaveLength(1);
    expect(proposals[0]).toMatchObject({
      counterpartyName: 'Carrefour',
      categoryId: 5,
      support: 3,
    });
    expect(proposals[0].meanConfidence).toBeCloseTo(0.9, 5);
    expect([1, 2, 3]).toContain(proposals[0].sampleTransactionId);
    expect(proposals[0].transactionIds).toEqual([1, 2, 3]);
  });

  it('excludes a cluster below minSupport', () => {
    const transactions = [transaction({ id: 1 }), transaction({ id: 2 })];
    const transactionsById = new Map(transactions.map((t) => [t.id!, t]));
    const predictions: Prediction[] = [
      { transactionId: 1, categoryId: 5, confidence: 0.95 },
      { transactionId: 2, categoryId: 5, confidence: 0.95 },
    ];

    expect(mineRuleProposals(predictions, transactionsById, [], thresholds)).toEqual([]);
  });

  it('excludes a cluster below minConfidence', () => {
    const transactions = [transaction({ id: 1 }), transaction({ id: 2 }), transaction({ id: 3 })];
    const transactionsById = new Map(transactions.map((t) => [t.id!, t]));
    const predictions: Prediction[] = [
      { transactionId: 1, categoryId: 5, confidence: 0.5 },
      { transactionId: 2, categoryId: 5, confidence: 0.6 },
      { transactionId: 3, categoryId: 5, confidence: 0.4 },
    ];

    expect(mineRuleProposals(predictions, transactionsById, [], thresholds)).toEqual([]);
  });

  it('excludes a cluster fully covered by an existing enabled rule', () => {
    const transactions = [transaction({ id: 1 }), transaction({ id: 2 }), transaction({ id: 3 })];
    const transactionsById = new Map(transactions.map((t) => [t.id!, t]));
    const predictions: Prediction[] = [
      { transactionId: 1, categoryId: 5, confidence: 0.9 },
      { transactionId: 2, categoryId: 5, confidence: 0.9 },
      { transactionId: 3, categoryId: 5, confidence: 0.9 },
    ];
    const enabledRules = [rule()];

    expect(mineRuleProposals(predictions, transactionsById, enabledRules, thresholds)).toEqual([]);
  });

  it('still proposes a cluster only partially covered by an existing enabled rule', () => {
    // All three transactions share the "Carrefour" counterparty (so they cluster together), but
    // the rule only matches amount -10 — one member is covered, two are not.
    const transactions = [
      transaction({ id: 1, counterpartyName: 'Carrefour', amount: -10 }),
      transaction({ id: 2, counterpartyName: 'Carrefour', amount: -20 }),
      transaction({ id: 3, counterpartyName: 'Carrefour', amount: -30 }),
    ];
    const transactionsById = new Map(transactions.map((t) => [t.id!, t]));
    const predictions: Prediction[] = [
      { transactionId: 1, categoryId: 5, confidence: 0.9 },
      { transactionId: 2, categoryId: 5, confidence: 0.9 },
      { transactionId: 3, categoryId: 5, confidence: 0.9 },
    ];
    const partialRule = rule({
      conditions: [{ field: 'amount', operator: 'equals', value: -10 }],
    });

    const proposals = mineRuleProposals(predictions, transactionsById, [partialRule], thresholds);

    expect(proposals).toHaveLength(1);
    expect(proposals[0].counterpartyName).toBe('Carrefour');
    // The already-covered member (id 1) still appears — only a FULLY covered cluster is excluded.
    expect(proposals[0].transactionIds).toEqual([1, 2, 3]);
  });

  it('ignores predictions for transactions with an empty or missing counterpartyName', () => {
    const transactions = [
      transaction({ id: 1, counterpartyName: undefined }),
      transaction({ id: 2, counterpartyName: '   ' }),
      transaction({ id: 3, counterpartyName: 'Carrefour' }),
    ];
    const transactionsById = new Map(transactions.map((t) => [t.id!, t]));
    const predictions: Prediction[] = [
      { transactionId: 1, categoryId: 5, confidence: 0.99 },
      { transactionId: 2, categoryId: 5, confidence: 0.99 },
      { transactionId: 3, categoryId: 5, confidence: 0.99 },
    ];

    // Only one transaction has a usable counterpartyName, so support never reaches minSupport.
    expect(mineRuleProposals(predictions, transactionsById, [], thresholds)).toEqual([]);
  });

  it('sorts by support desc, then mean confidence desc', () => {
    const transactions = [
      transaction({ id: 1, counterpartyName: 'A' }),
      transaction({ id: 2, counterpartyName: 'A' }),
      transaction({ id: 3, counterpartyName: 'A' }),
      transaction({ id: 4, counterpartyName: 'B' }),
      transaction({ id: 5, counterpartyName: 'B' }),
      transaction({ id: 6, counterpartyName: 'B' }),
      transaction({ id: 7, counterpartyName: 'B' }),
    ];
    const transactionsById = new Map(transactions.map((t) => [t.id!, t]));
    const predictions: Prediction[] = [
      { transactionId: 1, categoryId: 5, confidence: 0.9 },
      { transactionId: 2, categoryId: 5, confidence: 0.9 },
      { transactionId: 3, categoryId: 5, confidence: 0.9 },
      { transactionId: 4, categoryId: 6, confidence: 0.85 },
      { transactionId: 5, categoryId: 6, confidence: 0.85 },
      { transactionId: 6, categoryId: 6, confidence: 0.85 },
      { transactionId: 7, categoryId: 6, confidence: 0.85 },
    ];

    const proposals = mineRuleProposals(predictions, transactionsById, [], thresholds);

    expect(proposals.map((p) => p.counterpartyName)).toEqual(['B', 'A']);
  });

  it('breaks a modal-category tie deterministically by the lowest categoryId', () => {
    const transactions = [
      transaction({ id: 1, counterpartyName: 'A' }),
      transaction({ id: 2, counterpartyName: 'A' }),
      transaction({ id: 3, counterpartyName: 'A' }),
      transaction({ id: 4, counterpartyName: 'A' }),
    ];
    const transactionsById = new Map(transactions.map((t) => [t.id!, t]));
    const predictions: Prediction[] = [
      { transactionId: 1, categoryId: 9, confidence: 0.9 },
      { transactionId: 2, categoryId: 9, confidence: 0.9 },
      { transactionId: 3, categoryId: 3, confidence: 0.9 },
      { transactionId: 4, categoryId: 3, confidence: 0.9 },
    ];

    const proposals = mineRuleProposals(predictions, transactionsById, [], thresholds);

    expect(proposals[0].categoryId).toBe(3);
  });
});
