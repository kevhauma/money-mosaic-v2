import type { Account, Transaction } from '@/core/data-access';
import { buildDayTransactionIndex } from '@/core/stats';
import { formatDate } from '@/shared/utils';
import { withCleanFormatSettings } from '@/shared/utils/format-settings.testing';
import { buildBalanceDayTooltip } from './balance-day-tooltip';

const account = (overrides: Partial<Account> = {}): Account => ({
  id: 1,
  name: 'Checking',
  type: 'checking',
  currency: 'EUR',
  openingBalance: 0,
  openingBalanceDate: '2026-01-01',
  color: '#3366ff',
  icon: 'wallet',
  archived: false,
  ...overrides,
});

const transaction = (overrides: Partial<Transaction> = {}): Transaction => ({
  id: 1,
  accountId: 1,
  bookingDate: '2026-03-10',
  amount: -20,
  currency: 'EUR',
  rawDescription: 'CARD PAYMENT',
  fingerprint: 'fp',
  createdAt: '2026-03-10T00:00:00.000Z',
  ...overrides,
});

const checking = account({ id: 1, name: 'Checking' });
const savings = account({ id: 2, name: 'Savings' });

/** What echarts hands an axis-trigger formatter: one param per series, each carrying its band's marker. */
const hover = (day: string, series: { name: string; marker?: string }[] = []) =>
  series.length > 0
    ? series.map(({ name, marker }) => ({ axisValue: day, seriesName: name, marker }))
    : [{ axisValue: day }];

describe('buildBalanceDayTooltip (TICKET-ACC-11)', () => {
  // Reads formatted currency and dates, and format-settings.ts's signals are process-global under
  // isolate:false — pin them so another spec file's locale/symbol can't reach in here.
  withCleanFormatSettings();

  it('renders the day through localeDate and every amount through formatCurrency', () => {
    const index = buildDayTransactionIndex(
      [transaction({ id: 1, amount: 2800, counterpartyName: 'Acme Payroll' })],
      [checking],
    );

    const html = buildBalanceDayTooltip(index, { showAccountNames: true })(
      hover('2026-03-10', [{ name: 'Checking', marker: '●' }]),
    );

    // Not the raw `2026-03-10` bucket key (TICKET-SET-04), and not a raw float.
    expect(html).toContain(formatDate('2026-03-10'));
    expect(html).not.toContain('2026-03-10<');
    expect(html).toContain('Acme Payroll: €2,800.00');
    expect(html).toContain('Net €2,800.00');
  });

  it('names each account with its own band marker, above that account’s transactions', () => {
    const index = buildDayTransactionIndex(
      [
        transaction({ id: 1, accountId: 1, amount: -58.4, counterpartyName: 'FreshMarket' }),
        transaction({ id: 2, accountId: 2, amount: 500, counterpartyName: 'Standing order' }),
      ],
      [checking, savings],
    );

    const html = buildBalanceDayTooltip(index, { showAccountNames: true })(
      hover('2026-03-10', [
        { name: 'Checking', marker: '<i data-account="checking"></i>' },
        { name: 'Savings', marker: '<i data-account="savings"></i>' },
      ]),
    );

    expect(html).toContain('<i data-account="checking"></i>Checking');
    expect(html).toContain('<i data-account="savings"></i>Savings');
    expect(html).toContain('FreshMarket: -€58.40');
    expect(html).toContain('Standing order: €500.00');
  });

  it('omits accounts with no movement that day', () => {
    const index = buildDayTransactionIndex(
      [transaction({ id: 1, accountId: 1, amount: -20 })],
      [checking, savings],
    );

    const html = buildBalanceDayTooltip(index, { showAccountNames: true })(
      hover('2026-03-10', [{ name: 'Checking' }, { name: 'Savings' }]),
    );

    expect(html).toContain('Checking');
    expect(html).not.toContain('Savings');
  });

  it('falls back to a "No transactions" line on a quiet day rather than rendering empty', () => {
    const index = buildDayTransactionIndex(
      [transaction({ bookingDate: '2026-03-10' })],
      [checking],
    );

    for (const showAccountNames of [true, false]) {
      const html = buildBalanceDayTooltip(index, { showAccountNames })(
        hover('2026-03-11', [{ name: 'Checking' }]),
      );

      expect(html).toContain(formatDate('2026-03-11'));
      expect(html).toContain('No transactions');
    }
  });

  it('drops the account-name row on account detail, keeping the lines and the net', () => {
    const index = buildDayTransactionIndex(
      [
        transaction({ id: 1, amount: 2800, counterpartyName: 'Acme Payroll' }),
        transaction({ id: 2, amount: -58.4, counterpartyName: 'FreshMarket' }),
      ],
      [checking],
    );

    const html = buildBalanceDayTooltip(index, { showAccountNames: false })(hover('2026-03-10'));

    // The page is already this account — naming it above its own transactions labels nothing.
    expect(html).not.toContain('Checking');
    expect(html).toContain(formatDate('2026-03-10'));
    expect(html).toContain('Acme Payroll: €2,800.00');
    expect(html).toContain('FreshMarket: -€58.40');
    expect(html).toContain('Net €2,741.60');
  });

  const paydayOf = (count: number, accountId = 1): Transaction[] =>
    Array.from({ length: count }, (_, i) =>
      transaction({ id: i + 1, accountId, amount: -10, counterpartyName: `Shop ${i + 1}` }),
    );

  it('shows exactly the per-account cap with no "+N more" line at the boundary', () => {
    const index = buildDayTransactionIndex(paydayOf(5), [checking]);

    const html = buildBalanceDayTooltip(index, { showAccountNames: true })(
      hover('2026-03-10', [{ name: 'Checking' }]),
    );

    expect(html).toContain('Shop 5: -€10.00');
    expect(html).not.toContain('more');
  });

  it('collapses the overflow into one "+N more" line at cap + 1', () => {
    const index = buildDayTransactionIndex(paydayOf(6), [checking]);

    const html = buildBalanceDayTooltip(index, { showAccountNames: true })(
      hover('2026-03-10', [{ name: 'Checking' }]),
    );

    expect(html).toContain('Shop 5: -€10.00');
    expect(html).not.toContain('Shop 6');
    expect(html).toContain('+1 more');
    // The net is still the whole day's, not just the shown lines'.
    expect(html).toContain('Net -€60.00');
  });

  it('truncates on account detail too — a busy single account is capped the same way', () => {
    const index = buildDayTransactionIndex(paydayOf(30), [checking]);

    const html = buildBalanceDayTooltip(index, { showAccountNames: false })(hover('2026-03-10'));

    expect(html).toContain('+25 more');
    expect(html).toContain('Net -€300.00');
  });

  it('spends the shared line budget across accounts, still naming each one with its own net', () => {
    const third = account({ id: 3, name: 'Credit line' });
    const index = buildDayTransactionIndex(
      [...paydayOf(5, 1), ...paydayOf(5, 2), ...paydayOf(5, 3)],
      [checking, savings, third],
    );

    const html = buildBalanceDayTooltip(index, { showAccountNames: true })(
      hover('2026-03-10', [{ name: 'Checking' }, { name: 'Savings' }, { name: 'Credit line' }]),
    );

    // 5 + 5 exhausts the 10-line budget, so the third account folds all five of its lines away —
    // but it is still named, and still shows its own net.
    expect(html).toContain('Checking');
    expect(html).toContain('Savings');
    expect(html).toContain('Credit line');
    expect(html).toContain('+5 more');
    expect(html.match(/Net /g)).toHaveLength(3);
  });

  it('caps the accounts too, so a day that moved everything cannot outgrow the viewport', () => {
    const accounts = Array.from({ length: 7 }, (_, i) =>
      account({ id: i + 1, name: `Account ${i + 1}` }),
    );
    const index = buildDayTransactionIndex(
      accounts.flatMap((_, i) => paydayOf(3, i + 1)),
      accounts,
    );

    const html = buildBalanceDayTooltip(index, { showAccountNames: true })(
      hover(
        '2026-03-10',
        accounts.map((a) => ({ name: a.name })),
      ),
    );
    const rows = html.split('<br/>');

    // Four accounts shown, three folded away — capping only the transaction lines would still have
    // cost a name row, a net row and a "+N more" per account, i.e. ~30 rows for seven accounts.
    expect(html).toContain('Account 4');
    expect(html).not.toContain('Account 5');
    expect(html).toContain('+3 more accounts');
    expect(rows.length).toBeLessThanOrEqual(24);
  });
});
