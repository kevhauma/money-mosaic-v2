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

/** What echarts hands an axis-trigger formatter: one param per series, each carrying its band's marker and that day's value. */
const hover = (day: string, series: { name: string; marker?: string; value?: number }[] = []) =>
  series.length > 0
    ? series.map(({ name, marker, value }) => ({
        axisValue: day,
        seriesName: name,
        marker,
        value,
      }))
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
      hover('2026-03-10', [{ name: 'Checking', marker: '●', value: 3000 }]),
    );

    // Not the raw `2026-03-10` bucket key (TICKET-SET-04), and not a raw float.
    expect(html).toContain(formatDate('2026-03-10'));
    expect(html).not.toContain('2026-03-10<');
    expect(html).toContain('●Checking: €3,000.00');
    expect(html).toContain('Acme Payroll: €2,800.00');
  });

  it('never restates the day’s net — the lines and the balance already say it', () => {
    const index = buildDayTransactionIndex(
      [
        transaction({ id: 1, amount: 2800, counterpartyName: 'Acme Payroll' }),
        transaction({ id: 2, amount: -58.4, counterpartyName: 'FreshMarket' }),
      ],
      [checking],
    );

    const html = buildBalanceDayTooltip(index, { showAccountNames: true })(
      hover('2026-03-10', [{ name: 'Checking', value: 3000 }]),
    );

    expect(html).not.toContain('Net');
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

  it('puts each account’s balance for that day next to its name', () => {
    const index = buildDayTransactionIndex(
      [
        transaction({ id: 1, accountId: 1, amount: -58.4, counterpartyName: 'FreshMarket' }),
        transaction({ id: 2, accountId: 2, amount: 500, counterpartyName: 'Standing order' }),
      ],
      [checking, savings],
    );

    const html = buildBalanceDayTooltip(index, { showAccountNames: true })(
      hover('2026-03-10', [
        { name: 'Checking', value: 1241.6 },
        { name: 'Savings', value: 8000 },
      ]),
    );

    // The band's own plotted point, not a re-derivation — so the row cannot disagree with the chart.
    expect(html).toContain('Checking: €1,241.60');
    expect(html).toContain('Savings: €8,000.00');
  });

  it('names a band echarts sent no value for, rather than printing a bogus balance', () => {
    const index = buildDayTransactionIndex(
      [transaction({ id: 1, counterpartyName: 'FreshMarket' })],
      [checking],
    );

    const html = buildBalanceDayTooltip(index, { showAccountNames: true })(
      hover('2026-03-10', [{ name: 'Checking' }]),
    );

    expect(html).toContain('Checking');
    expect(html).not.toContain('Checking:');
  });

  it('clips a bank’s wall-of-reference description down to a label', () => {
    const rawDescription =
      'SEPA DIRECT DEBIT MANDATE 0293841 TERMINAL 55123 ACME UTILITIES AMSTERDAM NL REF 8891';
    const index = buildDayTransactionIndex([transaction({ id: 1, rawDescription })], [checking]);

    const html = buildBalanceDayTooltip(index, { showAccountNames: false })(hover('2026-03-10'));

    expect(html).toContain('SEPA DIRECT DEBIT MANDATE 0293841 TERMIN…: -€20.00');
    expect(html).not.toContain(rawDescription);
  });

  it('leaves a description that already fits exactly alone, with no ellipsis', () => {
    const rawDescription = 'A'.repeat(40);
    const index = buildDayTransactionIndex([transaction({ id: 1, rawDescription })], [checking]);

    const html = buildBalanceDayTooltip(index, { showAccountNames: false })(hover('2026-03-10'));

    expect(html).toContain(`${rawDescription}: -€20.00`);
    expect(html).not.toContain('…');
  });

  it('still shows the balance of an account that did not move that day', () => {
    const index = buildDayTransactionIndex(
      [transaction({ id: 1, accountId: 1, amount: -20 })],
      [checking, savings],
    );

    const html = buildBalanceDayTooltip(index, { showAccountNames: true })(
      hover('2026-03-10', [
        { name: 'Checking', value: 1200 },
        { name: 'Savings', value: 8000 },
      ]),
    );

    // Driven by the bands, not by the day's movements: a tooltip listing fewer accounts than the
    // stack it sits on would read as if the missing ones were worth nothing.
    expect(html).toContain('Checking: €1,200.00');
    expect(html).toContain('Savings: €8,000.00');
  });

  it('says "No transactions" outright on a quiet day, under the balances that still hold', () => {
    const index = buildDayTransactionIndex(
      [transaction({ bookingDate: '2026-03-10' })],
      [checking],
    );

    const html = buildBalanceDayTooltip(index, { showAccountNames: true })(
      hover('2026-03-11', [{ name: 'Checking', value: 1200 }]),
    );

    expect(html).toContain(formatDate('2026-03-11'));
    expect(html).toContain('Checking: €1,200.00');
    expect(html).toContain('No transactions');
  });

  it('renders a quiet day on account detail rather than coming back empty', () => {
    const index = buildDayTransactionIndex(
      [transaction({ bookingDate: '2026-03-10' })],
      [checking],
    );

    const html = buildBalanceDayTooltip(index, { showAccountNames: false })(hover('2026-03-11'));

    expect(html).toContain(formatDate('2026-03-11'));
    expect(html).toContain('No transactions');
  });

  it('labels the balance without an account name on account detail, then lists the lines', () => {
    const index = buildDayTransactionIndex(
      [
        transaction({ id: 1, amount: 2800, counterpartyName: 'Acme Payroll' }),
        transaction({ id: 2, amount: -58.4, counterpartyName: 'FreshMarket' }),
      ],
      [checking],
    );

    const html = buildBalanceDayTooltip(index, { showAccountNames: false })(
      hover('2026-03-10', [{ name: '', value: 2741.6 }]),
    );

    // The page is already this account — naming it above its own transactions labels nothing.
    expect(html).not.toContain('Checking');
    expect(html).toContain(formatDate('2026-03-10'));
    expect(html).toContain('Balance: €2,741.60');
    expect(html).toContain('Acme Payroll: €2,800.00');
    expect(html).toContain('FreshMarket: -€58.40');
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
  });

  it('truncates on account detail too — a busy single account is capped the same way', () => {
    const index = buildDayTransactionIndex(paydayOf(30), [checking]);

    const html = buildBalanceDayTooltip(index, { showAccountNames: false })(
      hover('2026-03-10', [{ name: '', value: -300 }]),
    );

    expect(html).toContain('Balance: -€300.00');
    expect(html).toContain('+25 more');
  });

  it('spends the shared line budget across accounts, still showing every balance', () => {
    const third = account({ id: 3, name: 'Credit line' });
    const index = buildDayTransactionIndex(
      [...paydayOf(5, 1), ...paydayOf(5, 2), ...paydayOf(5, 3)],
      [checking, savings, third],
    );

    const html = buildBalanceDayTooltip(index, { showAccountNames: true })(
      hover('2026-03-10', [
        { name: 'Checking', value: 100 },
        { name: 'Savings', value: 200 },
        { name: 'Credit line', value: 300 },
      ]),
    );

    // 5 + 5 exhausts the 10-line budget, so the third account folds all five of its lines away —
    // but its balance is still there, which is the part the budget must never eat.
    expect(html).toContain('Checking: €100.00');
    expect(html).toContain('Savings: €200.00');
    expect(html).toContain('Credit line: €300.00');
    expect(html).toContain('+5 more');
  });

  it('keeps a day that moved everything within the viewport, balances included', () => {
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
        accounts.map((a, i) => ({ name: a.name, value: (i + 1) * 100 })),
      ),
    );
    const rows = html.split('<br/>');

    // Every account keeps its balance row; only the transaction lines are budgeted, so seven moving
    // accounts still fit — the last ones show a "+N more" instead of their lines.
    expect(html).toContain('Account 1: €100.00');
    expect(html).toContain('Account 7: €700.00');
    expect(rows.length).toBeLessThanOrEqual(24);
  });
});
