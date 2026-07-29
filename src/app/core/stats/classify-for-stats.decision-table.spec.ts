import type { Account, Category, Transaction } from '@/core/data-access';
import { classifyForStats, type StatsClassification } from './classify-for-stats';

/**
 * The systematic companion to `classify-for-stats.spec.ts` (TICKET-STAT-24, CR4-3 Option C).
 * That file documents landmark cases in prose; this one walks the combination space —
 * `(override mode | none) × (account joint/own/unknown) × (category kind) × (amount sign) ×
 * (nullified / transfer-linked / savings flags)` — so a future edit to the classifier changes one
 * table row instead of requiring the interaction to be re-reasoned from scratch.
 *
 * The exclusion *ordering* is the fragile part (TICKET-STAT-18 was an ordering bug), so each
 * adjacent pair of checks gets a row that only passes in the shipped order — see the
 * "exclusion ordering" table.
 */

const FROM = '2026-07-01';
const TO = '2026-07-31';
const IN_RANGE = '2026-07-15';

const SAVINGS_IBAN = 'BE00SAVINGS';
const CO_OWNER_IBAN = 'BE71096123456769';
const OWN_SAVINGS = new Set([SAVINGS_IBAN]);

const OWN_ACCOUNT_ID = 1;
/** Joint, `ownershipShare` 0.5, with one registered co-owner IBAN. */
const JOINT_ACCOUNT_ID = 2;
const ZERO_SHARE_JOINT_ACCOUNT_ID = 3;
/** Joint with no `ownershipShare` at all — exercises the `?? 1` fallbacks. */
const UNSET_SHARE_JOINT_ACCOUNT_ID = 4;

const EXPENSE_CATEGORY_ID = 10;
const INCOME_CATEGORY_ID = 11;
const NEUTRAL_CATEGORY_ID = 12;

const transaction = (overrides: Partial<Transaction> = {}): Transaction => ({
  id: 1,
  accountId: OWN_ACCOUNT_ID,
  bookingDate: IN_RANGE,
  amount: -50,
  currency: 'EUR',
  rawDescription: 'Groceries',
  fingerprint: 'fp',
  createdAt: '2026-07-15T00:00:00.000Z',
  ...overrides,
});

const category = (id: number, kind: Category['kind']): Category => ({
  id,
  name: `Category ${id}`,
  kind,
  color: '#000000',
  icon: 'tag',
  archived: false,
  isSystem: false,
});

const CATEGORIES: ReadonlyMap<number, Category> = new Map([
  [EXPENSE_CATEGORY_ID, category(EXPENSE_CATEGORY_ID, 'expense')],
  [INCOME_CATEGORY_ID, category(INCOME_CATEGORY_ID, 'income')],
  [NEUTRAL_CATEGORY_ID, category(NEUTRAL_CATEGORY_ID, 'neutral')],
]);

const account = (id: number, overrides: Partial<Account> = {}): Account => ({
  id,
  name: `Account ${id}`,
  type: 'checking',
  currency: 'EUR',
  openingBalance: 0,
  openingBalanceDate: '2026-01-01',
  color: '#000000',
  icon: 'wallet',
  archived: false,
  ...overrides,
});

const ACCOUNTS: ReadonlyMap<number, Account> = new Map([
  [OWN_ACCOUNT_ID, account(OWN_ACCOUNT_ID)],
  [
    JOINT_ACCOUNT_ID,
    account(JOINT_ACCOUNT_ID, {
      type: 'joint',
      ownershipShare: 0.5,
      coOwners: [{ name: 'Partner', ibans: [CO_OWNER_IBAN] }],
    }),
  ],
  [
    ZERO_SHARE_JOINT_ACCOUNT_ID,
    account(ZERO_SHARE_JOINT_ACCOUNT_ID, { type: 'joint', ownershipShare: 0 }),
  ],
  [UNSET_SHARE_JOINT_ACCOUNT_ID, account(UNSET_SHARE_JOINT_ACCOUNT_ID, { type: 'joint' })],
]);

const classify = (
  overrides: Partial<Transaction>,
  ownSavingsIbans: ReadonlySet<string> = new Set(),
): StatsClassification =>
  classifyForStats(transaction(overrides), FROM, TO, ownSavingsIbans, CATEGORIES, ACCOUNTS);

type Row = [name: string, input: Partial<Transaction>, expected: StatsClassification];

const runRows = (rows: Row[], ownSavingsIbans?: ReadonlySet<string>): void => {
  it.each(rows)('%s', (_name, input, expected) => {
    expect(classify(input, ownSavingsIbans)).toEqual(expected);
  });
};

describe('classifyForStats decision table: exclusion ordering', () => {
  // Each row pins one adjacent pair of the range -> nullified -> zero -> savings -> transfer
  // ladder: the transaction satisfies the later check too, so it only lands on `expected` while
  // the earlier check still runs first. Flipping any pair flips one of these rows.
  runRows(
    [
      [
        'out of range wins over the savings check',
        { bookingDate: '2026-08-01', amount: -200, counterpartyIban: SAVINGS_IBAN },
        { kind: 'skip' },
      ],
      [
        'nullified wins over the savings check (TICKET-STAT-18)',
        { nullified: true, amount: -200, counterpartyIban: SAVINGS_IBAN },
        { kind: 'skip' },
      ],
      [
        'zero amount wins over the savings check',
        { amount: 0, counterpartyIban: SAVINGS_IBAN },
        { kind: 'skip' },
      ],
      [
        'the savings check wins over the transfer-link check',
        { amount: -200, counterpartyIban: SAVINGS_IBAN, transferId: 9 },
        { kind: 'savings', amount: 200 },
      ],
      [
        'a savings withdrawal is negative savings, not income',
        { amount: 200, counterpartyIban: SAVINGS_IBAN },
        { kind: 'savings', amount: -200 },
      ],
      [
        'nullified wins over a joint-account leg',
        { accountId: JOINT_ACCOUNT_ID, amount: -400, nullified: true },
        { kind: 'skip' },
      ],
      [
        'nullified wins over an attributionOverride',
        { amount: -100, nullified: true, attributionOverride: { mode: 'personal' } },
        { kind: 'skip' },
      ],
      [
        'a transfer-linked leg with no savings IBAN is skipped',
        { amount: -200, transferId: 9 },
        { kind: 'skip' },
      ],
      [
        'the range check is inclusive of its first day',
        { bookingDate: FROM, amount: -30 },
        { kind: 'expense', amount: 30, categoryId: null },
      ],
      [
        'the range check is inclusive of its last day',
        { bookingDate: TO, amount: -30 },
        { kind: 'expense', amount: 30, categoryId: null },
      ],
      [
        'a booking one day before the range is skipped',
        { bookingDate: '2026-06-30', amount: -30 },
        { kind: 'skip' },
      ],
    ],
    OWN_SAVINGS,
  );
});

describe('classifyForStats decision table: own account, no override', () => {
  // Category kind decides the bucket, not the amount sign (TICKET-STAT-11): both signs of each
  // kind, plus the uncategorised fallback and the neutral exclusion.
  runRows([
    [
      'expense category, spend -> expense up',
      { amount: -50, categoryId: EXPENSE_CATEGORY_ID },
      { kind: 'expense', amount: 50, categoryId: EXPENSE_CATEGORY_ID },
    ],
    [
      'expense category, refund -> expense down',
      { amount: 20, categoryId: EXPENSE_CATEGORY_ID },
      { kind: 'expense', amount: -20, categoryId: EXPENSE_CATEGORY_ID },
    ],
    [
      'income category, inflow -> income up',
      { amount: 1200, categoryId: INCOME_CATEGORY_ID },
      { kind: 'income', amount: 1200, categoryId: INCOME_CATEGORY_ID },
    ],
    [
      'income category, payback -> income down',
      { amount: -300, categoryId: INCOME_CATEGORY_ID },
      { kind: 'income', amount: -300, categoryId: INCOME_CATEGORY_ID },
    ],
    [
      'neutral category is excluded whatever the sign (negative)',
      { amount: -500, categoryId: NEUTRAL_CATEGORY_ID },
      { kind: 'skip' },
    ],
    [
      'neutral category is excluded whatever the sign (positive)',
      { amount: 500, categoryId: NEUTRAL_CATEGORY_ID },
      { kind: 'skip' },
    ],
    [
      'uncategorised falls back to amount sign (negative)',
      { amount: -30 },
      { kind: 'expense', amount: 30, categoryId: null },
    ],
    [
      'uncategorised falls back to amount sign (positive)',
      { amount: 500 },
      { kind: 'income', amount: 500, categoryId: null },
    ],
    [
      'a categoryId the map cannot resolve behaves as uncategorised',
      { amount: 500, categoryId: 999 },
      { kind: 'income', amount: 500, categoryId: null },
    ],
    [
      'an accountId the map cannot resolve takes the plain own-account path',
      { accountId: 404, amount: -50, categoryId: EXPENSE_CATEGORY_ID },
      { kind: 'expense', amount: 50, categoryId: EXPENSE_CATEGORY_ID },
    ],
  ]);
});

describe('classifyForStats decision table: joint account, no override', () => {
  runRows([
    [
      'jointSpend: shared spending counts only my share',
      { accountId: JOINT_ACCOUNT_ID, amount: -400 },
      { kind: 'expense', amount: 200, categoryId: null },
    ],
    [
      'mineIn: an untagged inflow counts at 100%',
      { accountId: JOINT_ACCOUNT_ID, amount: 1200 },
      { kind: 'income', amount: 1200, categoryId: null },
    ],
    [
      'coOwnerIn: an inflow from a registered co-owner IBAN is excluded',
      { accountId: JOINT_ACCOUNT_ID, amount: 800, counterpartyIban: CO_OWNER_IBAN },
      { kind: 'skip' },
    ],
    [
      'coOwnerIn: a neutral-category inflow is excluded even from an unknown IBAN',
      { accountId: JOINT_ACCOUNT_ID, amount: 800, categoryId: NEUTRAL_CATEGORY_ID },
      { kind: 'skip' },
    ],
    [
      // Not symmetric with the positive case: `neutral` only excludes through `coOwnerIn`
      // (positive amounts) or `categoryKindContribution` (the own-account path), and a joint
      // outflow reaches neither.
      'a neutral-category joint outflow is still jointSpend, not excluded',
      { accountId: JOINT_ACCOUNT_ID, amount: -400, categoryId: NEUTRAL_CATEGORY_ID },
      { kind: 'expense', amount: 200, categoryId: NEUTRAL_CATEGORY_ID },
    ],
    [
      'the untagged expense-category refund rule: only my share nets down against expense',
      { accountId: JOINT_ACCOUNT_ID, amount: 40, categoryId: EXPENSE_CATEGORY_ID },
      { kind: 'expense', amount: -20, categoryId: EXPENSE_CATEGORY_ID },
    ],
    [
      // The refund rule is expense-kind only; an income-category inflow stays mineIn income.
      'an income-category joint inflow is income at 100%, not a netted refund',
      { accountId: JOINT_ACCOUNT_ID, amount: 40, categoryId: INCOME_CATEGORY_ID },
      { kind: 'income', amount: 40, categoryId: INCOME_CATEGORY_ID },
    ],
    [
      // Pins the `ownershipShare ?? 1` fallback inside the refund rule: a joint account with no
      // share configured nets the whole refund down, not a fraction of it.
      'the refund rule falls back to a full share when the joint account has none configured',
      { accountId: UNSET_SHARE_JOINT_ACCOUNT_ID, amount: 40, categoryId: EXPENSE_CATEGORY_ID },
      { kind: 'expense', amount: -40, categoryId: EXPENSE_CATEGORY_ID },
    ],
    [
      'an unset-share joint outflow is jointSpend at a full share',
      { accountId: UNSET_SHARE_JOINT_ACCOUNT_ID, amount: -400 },
      { kind: 'expense', amount: 400, categoryId: null },
    ],
    [
      'a zero-share joint account spends at weight 0 and is skipped',
      { accountId: ZERO_SHARE_JOINT_ACCOUNT_ID, amount: -400 },
      { kind: 'skip' },
    ],
    [
      'a zero-share joint inflow is mineIn, which ignores the share entirely',
      { accountId: ZERO_SHARE_JOINT_ACCOUNT_ID, amount: 400 },
      { kind: 'income', amount: 400, categoryId: null },
    ],
  ]);
});

describe('classifyForStats decision table: attributionOverride', () => {
  runRows([
    [
      'notMine on an own account is excluded',
      { amount: -100, attributionOverride: { mode: 'notMine' } },
      { kind: 'skip' },
    ],
    [
      'notMine on a joint account is excluded',
      { accountId: JOINT_ACCOUNT_ID, amount: -100, attributionOverride: { mode: 'notMine' } },
      { kind: 'skip' },
    ],
    [
      'personal on a joint account counts 100%, netted by category kind (spend)',
      {
        accountId: JOINT_ACCOUNT_ID,
        amount: -100,
        categoryId: EXPENSE_CATEGORY_ID,
        attributionOverride: { mode: 'personal' },
      },
      { kind: 'expense', amount: 100, categoryId: EXPENSE_CATEGORY_ID },
    ],
    [
      'personal on a joint account nets a payback down instead of counting it as income',
      {
        accountId: JOINT_ACCOUNT_ID,
        amount: 30,
        categoryId: EXPENSE_CATEGORY_ID,
        attributionOverride: { mode: 'personal' },
      },
      { kind: 'expense', amount: -30, categoryId: EXPENSE_CATEGORY_ID },
    ],
    [
      'personal with a neutral category is excluded',
      {
        accountId: JOINT_ACCOUNT_ID,
        amount: -100,
        categoryId: NEUTRAL_CATEGORY_ID,
        attributionOverride: { mode: 'personal' },
      },
      { kind: 'skip' },
    ],
    [
      'personal, uncategorised, falls back to amount sign',
      { amount: 100, attributionOverride: { mode: 'personal' } },
      { kind: 'income', amount: 100, categoryId: null },
    ],
    [
      'shared on an own account weights by the referenced joint account share',
      {
        amount: -100,
        attributionOverride: { mode: 'shared', jointAccountId: JOINT_ACCOUNT_ID },
      },
      { kind: 'expense', amount: 50, categoryId: null },
    ],
    [
      'shared with no jointAccountId falls back to weight 1',
      { amount: -100, attributionOverride: { mode: 'shared' } },
      { kind: 'expense', amount: 100, categoryId: null },
    ],
    [
      'shared referencing an unresolvable account falls back to weight 1',
      { amount: -100, attributionOverride: { mode: 'shared', jointAccountId: 404 } },
      { kind: 'expense', amount: 100, categoryId: null },
    ],
    [
      // Unlike `personal`, a `shared` leg buckets by raw weight sign — the expense-kind refund
      // rule above is guarded on there being no override at all.
      'shared inflow buckets by weight sign even under an expense category',
      {
        amount: 100,
        categoryId: EXPENSE_CATEGORY_ID,
        attributionOverride: { mode: 'shared', jointAccountId: JOINT_ACCOUNT_ID },
      },
      { kind: 'income', amount: 50, categoryId: EXPENSE_CATEGORY_ID },
    ],
    [
      'shared weighted to exactly zero is skipped rather than counted at zero',
      {
        amount: -100,
        attributionOverride: { mode: 'shared', jointAccountId: ZERO_SHARE_JOINT_ACCOUNT_ID },
      },
      { kind: 'skip' },
    ],
    [
      // The override routes an own-account transaction through the joint path even though the
      // account itself is a plain checking account.
      'an override on an unresolvable account falls through to the plain path',
      { accountId: 404, amount: -100, attributionOverride: { mode: 'notMine' } },
      { kind: 'expense', amount: 100, categoryId: null },
    ],
  ]);
});
