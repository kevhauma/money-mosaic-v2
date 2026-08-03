import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideEchartsCore } from 'ngx-echarts';
import { vi } from 'vitest';
import {
  AccountsRepository,
  CategoriesRepository,
  TransactionsRepository,
  type Account,
  type Category,
  type Transaction,
} from '@/core/data-access';
import {
  buildDayTransactionIndex,
  computeAccountBalanceTrends,
  pickGranularityForSpan,
} from '@/core/stats';
import { echarts } from '@/shared/echarts';
import { stubEchartsBrowserApis } from '@/shared/echarts/echarts-jsdom.testing';
import { AccountsStore, CategoriesStore, RangeStore, TransactionsStore } from '@/core/state';
import {
  buildAccountBalanceHistoryChartOption,
  AccountBalanceHistoryChartComponent,
} from './account-balance-history-chart.component';
import { withCleanFormatSettings } from '@/shared/utils/format-settings.testing';

stubEchartsBrowserApis();

const account = (overrides: Partial<Account> = {}): Account => ({
  id: 1,
  name: 'Checking',
  type: 'checking',
  currency: 'EUR',
  openingBalance: 1000,
  openingBalanceDate: '2026-01-01',
  color: '#3366ff',
  icon: 'wallet',
  archived: false,
  ...overrides,
});

describe('AccountBalanceHistoryChartComponent', () => {
  let fixture: ComponentFixture<AccountBalanceHistoryChartComponent>;

  beforeEach(async () => {
    const accountsRepository = {
      getAll: vi.fn().mockResolvedValue([account({ id: 1 }), account({ id: 2, archived: true })]),
      update: vi.fn().mockResolvedValue(1),
    };
    const transactionsRepository = { getAll: vi.fn().mockResolvedValue([]) };

    await TestBed.configureTestingModule({
      imports: [AccountBalanceHistoryChartComponent],
      providers: [
        provideRouter([]),
        provideEchartsCore({ echarts }),
        { provide: AccountsRepository, useValue: accountsRepository },
        { provide: TransactionsRepository, useValue: transactionsRepository },
      ],
    }).compileComponents();

    await TestBed.inject(AccountsStore).hydrate();

    fixture = TestBed.createComponent(AccountBalanceHistoryChartComponent);
    await fixture.whenStable();
  });

  it('should create, wired to only the active (non-archived) accounts', () => {
    expect(fixture.componentInstance).toBeTruthy();
    expect(TestBed.inject(AccountsStore).activeAccounts()).toHaveLength(1);
  });

  it('renders no bucket picker — a balance is a level, not a period sum (TICKET-ACC-10)', () => {
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('mm-granularity-picker') as HTMLElement | null,
    ).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Balance history');
  });

  it('plots a daily series whatever the page range is set to (TICKET-ACC-10)', () => {
    const rangeStore = TestBed.inject(RangeStore);
    // A year-wide range used to seed the picker to Month via `pickGranularityForSpan`, which is why
    // the chart opened coarse and had to be set back to Day every visit.
    rangeStore.setCustomRange('accounts', '2026-01-01', '2026-12-31');
    expect(pickGranularityForSpan('2026-01-01', '2026-12-31')).not.toBe('day');

    const bucketKeys =
      fixture.componentInstance['series']()[0]?.points.map((point) => point.bucketKey) ?? [];

    expect(bucketKeys.length).toBeGreaterThan(0);
    expect(bucketKeys.every((key) => /^\d{4}-\d{2}-\d{2}$/.test(key))).toBe(true);
  });

  it("the Accounts page's range re-scrubs the chart's zoom window, and the Dashboard's does not (TICKET-ACC-08)", () => {
    const rangeStore = TestBed.inject(RangeStore);
    const zoomOf = (): { startValue: number; endValue: number } =>
      (fixture.componentInstance['chartOption']() as Record<string, unknown>)[
        'dataZoom'
      ] as unknown as { startValue: number; endValue: number };

    rangeStore.setCustomRange('accounts', '2026-01-01', '2026-03-31');
    const early = JSON.stringify(zoomOf());

    // A move on the *other* page must not touch this chart at all.
    rangeStore.setCustomRange('dashboard', '2020-01-01', '2020-01-31');
    expect(JSON.stringify(zoomOf())).toBe(early);

    rangeStore.setCustomRange('accounts', '2026-06-01', '2026-08-31');
    expect(JSON.stringify(zoomOf())).not.toBe(early);
  });

  /** What the rebuilt option says about the legend — the state `setOption(option, true)` used to discard. */
  const selectedOf = (component: AccountBalanceHistoryChartComponent): Record<string, boolean> =>
    (
      (component['chartOption']() as Record<string, unknown>)['legend'] as {
        selected: Record<string, boolean>;
      }
    ).selected;

  it('keeps an account hidden across a date-range change (TICKET-STAT-27)', () => {
    fixture.componentInstance['onLegendSelectChanged']({ selected: { Checking: false } });
    expect(selectedOf(fixture.componentInstance)['Checking']).toBe(false);

    // The rebuild is what used to lose it: `chartOption` is a `computed()`, and ngx-echarts
    // replaces the whole option with `setOption(option, true)`. TICKET-STAT-27 also asserted this
    // against a bucket change here; TICKET-ACC-10 fixed this chart to daily, so that half of the
    // case now lives on the dashboard trend panel, which still has a picker.
    TestBed.inject(RangeStore).setCustomRange('accounts', '2026-02-01', '2026-02-28');

    expect(selectedOf(fixture.componentInstance)['Checking']).toBe(false);
  });

  it('restores the hidden accounts on a remount (TICKET-STAT-27)', async () => {
    fixture.componentInstance['onLegendSelectChanged']({ selected: { Checking: false } });
    TestBed.tick();

    // Navigating away from /accounts and back is a fresh component against the same root stores.
    fixture.destroy();
    const remounted = TestBed.createComponent(AccountBalanceHistoryChartComponent);
    await remounted.whenStable();

    expect(selectedOf(remounted.componentInstance)['Checking']).toBe(false);
  });
});

describe('AccountBalanceHistoryChartComponent: a joint account bands at its real balance (TICKET-ACC-07)', () => {
  const jointAccount = account({
    id: 1,
    name: 'Joint',
    type: 'joint',
    openingBalance: 1000,
    ownershipShare: 0.5,
  });
  const partnerContribution: Category = {
    id: 9,
    name: 'Partner contribution',
    kind: 'neutral',
    color: '#888888',
    icon: 'users',
    archived: false,
    isSystem: true,
  };
  const transactions: Transaction[] = [
    {
      id: 1,
      accountId: 1,
      bookingDate: '2026-01-05',
      amount: 400,
      currency: 'EUR',
      rawDescription: 'Partner deposit',
      fingerprint: 'fp-1',
      createdAt: '2026-01-05T00:00:00.000Z',
      categoryId: 9,
    },
    {
      id: 2,
      accountId: 1,
      bookingDate: '2026-01-10',
      amount: -200,
      currency: 'EUR',
      rawDescription: 'Groceries',
      fingerprint: 'fp-2',
      createdAt: '2026-01-10T00:00:00.000Z',
    },
  ];

  let fixture: ComponentFixture<AccountBalanceHistoryChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AccountBalanceHistoryChartComponent],
      providers: [
        provideRouter([]),
        provideEchartsCore({ echarts }),
        {
          provide: AccountsRepository,
          useValue: {
            getAll: vi.fn().mockResolvedValue([jointAccount]),
            update: vi.fn().mockResolvedValue(1),
          },
        },
        {
          provide: TransactionsRepository,
          useValue: { getAll: vi.fn().mockResolvedValue(transactions) },
        },
        {
          provide: CategoriesRepository,
          useValue: { getAll: vi.fn().mockResolvedValue([partnerContribution]) },
        },
      ],
    }).compileComponents();

    await TestBed.inject(AccountsStore).hydrate();
    await TestBed.inject(TransactionsStore).hydrate();
    await TestBed.inject(CategoriesStore).hydrate();

    fixture = TestBed.createComponent(AccountBalanceHistoryChartComponent);
    await fixture.whenStable();
  });

  it("plots the account's balancesById figure, not its jointAccountStakeById figure", () => {
    const accountsStore = TestBed.inject(AccountsStore);
    const option = fixture.componentInstance['chartOption']() as { series: { data: number[] }[] };
    const plotted = option.series[0].data.at(-1);

    // 1000 opening + 400 partner deposit - 200 joint spend, all at 100%.
    expect(plotted).toBe(1200);
    expect(plotted).toBe(accountsStore.balancesById().get(1));
    // The stake is materially different — that divergence is the bug this ticket fixes.
    expect(accountsStore.jointAccountStakeById().get(1)).toBe(400);
  });
});

describe('buildAccountBalanceHistoryChartOption', () => {
  // The tooltip assertion below reads formatted currency, and format-settings.ts's signals are
  // process-global under isolate:false — pin them so another spec file can't reach in here.
  withCleanFormatSettings();

  const accounts = [
    account({ id: 1, name: 'Checking', color: '#3366ff', openingBalance: 1000 }),
    account({ id: 2, name: 'Credit line', color: '#ff3366', openingBalance: -200 }),
  ];

  const transaction = (overrides: Partial<Transaction> = {}): Transaction => ({
    id: 1,
    accountId: 1,
    bookingDate: '2026-01-15',
    amount: 100,
    currency: 'EUR',
    rawDescription: 'Deposit',
    fingerprint: 'fp',
    createdAt: '2026-01-15T00:00:00.000Z',
    ...overrides,
  });

  it('names and colours each band after its account, including a negative-balance account', () => {
    const series = [
      { accountId: 1, points: [{ bucketKey: '2026-01', bucketEnd: '2026-01-31', balance: 1100 }] },
      { accountId: 2, points: [{ bucketKey: '2026-01', bucketEnd: '2026-01-31', balance: -200 }] },
    ];

    const option = buildAccountBalanceHistoryChartOption(accounts, series, {
      startValue: 0,
      endValue: 0,
    });

    expect(option['series']).toEqual([
      {
        name: 'Checking',
        type: 'line',
        stack: 'account-balance',
        areaStyle: {},
        color: '#3366ff',
        data: [1100],
      },
      {
        name: 'Credit line',
        type: 'line',
        stack: 'account-balance',
        areaStyle: {},
        color: '#ff3366',
        data: [-200],
      },
    ]);
    expect(option['legend']).toEqual({
      type: 'scroll',
      top: 8,
      data: ['Checking', 'Credit line'],
      // Stated rather than left to echarts, so the notMerge rebuild restores it (TICKET-STAT-27).
      selected: { Checking: true, 'Credit line': true },
    });
  });

  it('draws the legend in a top strip with the grid grown to clear it (TICKET-STAT-26)', () => {
    const series = [
      { accountId: 1, points: [{ bucketKey: '2026-01', bucketEnd: '2026-01-31', balance: 1100 }] },
    ];

    const option = buildAccountBalanceHistoryChartOption([accounts[0]], series, {
      startValue: 0,
      endValue: 0,
    });
    const legend = option['legend'] as { type: string; top: number };
    const grid = option['grid'] as { top: number };

    // Was `legend: { data }` with no placement against `bucketedZoomAxisOption`'s hard-coded
    // `grid.top: 48` — echarts then drew the strip inside the plot, over the stacked bands and
    // over the only control that hides an account.
    expect(legend.type).toBe('scroll');
    expect(grid.top).toBeGreaterThan(48);
    expect(grid.top).toBeGreaterThan(legend.top);
  });

  it('leaves the legend clickable — hiding an account is native echarts legend behaviour', () => {
    const series = [
      { accountId: 1, points: [{ bucketKey: '2026-01', bucketEnd: '2026-01-31', balance: 1100 }] },
      { accountId: 2, points: [{ bucketKey: '2026-01', bucketEnd: '2026-01-31', balance: -200 }] },
    ];

    const option = buildAccountBalanceHistoryChartOption(accounts, series, {
      startValue: 0,
      endValue: 0,
    });
    const legend = option['legend'] as { data: string[]; selectedMode?: unknown };

    // Every band has an entry to click, and nothing turned the toggle off.
    expect(legend.data).toEqual(['Checking', 'Credit line']);
    expect(legend.selectedMode).toBeUndefined();
  });

  it('marks a hidden account off in legend.selected, leaving its band in the series (TICKET-STAT-27)', () => {
    const series = [
      { accountId: 1, points: [{ bucketKey: '2026-01', bucketEnd: '2026-01-31', balance: 1100 }] },
      { accountId: 2, points: [{ bucketKey: '2026-01', bucketEnd: '2026-01-31', balance: -200 }] },
    ];

    const option = buildAccountBalanceHistoryChartOption(
      accounts,
      series,
      { startValue: 0, endValue: 0 },
      ['Credit line'],
    );

    expect((option['legend'] as { selected: Record<string, boolean> }).selected).toEqual({
      Checking: true,
      'Credit line': false,
    });
    // Hiding is a legend concern — the data stays, so unhiding needs no rebuild.
    expect(option['series']).toHaveLength(2);
  });

  it("the stacked bands' per-bucket sum is total real balance — no longer combined net worth (TICKET-ACC-07)", () => {
    const jointAccounts = [
      account({ id: 1, name: 'Joint', type: 'joint', openingBalance: 1000, ownershipShare: 0.5 }),
      accounts[1],
    ];
    const transactions = [
      transaction({ id: 1, accountId: 1, amount: -200, bookingDate: '2026-01-10' }),
      transaction({ id: 2, accountId: 2, amount: -50, bookingDate: '2026-01-20' }),
    ];

    const series = computeAccountBalanceTrends(
      transactions,
      jointAccounts,
      '2026-01-01',
      '2026-01-31',
      'month',
    );
    const option = buildAccountBalanceHistoryChartOption(jointAccounts, series, {
      startValue: 0,
      endValue: 0,
    });
    const bandData = (option['series'] as { data: number[] }[]).map((s) => s.data);
    const stackedTotal = bandData.reduce((sum, data) => sum + data[0], 0);

    // Each band is that account's real balance: joint 1000 - 200 = 800, credit line -200 - 50 = -250.
    expect(bandData.map((data) => data[0])).toEqual([800, -250]);
    expect(stackedTotal).toBe(550);
    // Combined net worth halved the joint spend and the joint opening balance, so it differed by
    // design (it came to €150). `computeNetWorthTrend`, which produced that figure, was retired
    // from production by TICKET-ACC-07 and deleted; the bands' own sum is what this chart draws.
  });

  it('applies the given zoom window to both dataZoom entries', () => {
    const series = [
      {
        accountId: 1,
        points: [
          { bucketKey: '2026-01', bucketEnd: '2026-01-31', balance: 1000 },
          { bucketKey: '2026-02', bucketEnd: '2026-02-28', balance: 1100 },
        ],
      },
    ];

    const option = buildAccountBalanceHistoryChartOption([accounts[0]], series, {
      startValue: 1,
      endValue: 1,
    });

    const dataZoom = option['dataZoom'] as { startValue: number; endValue: number }[];
    expect(dataZoom.every((zoom) => zoom.startValue === 1 && zoom.endValue === 1)).toBe(true);
  });

  it("hovering a day lists that day's transactions per account, not the balances already drawn (TICKET-ACC-11)", () => {
    const series = [
      {
        accountId: 1,
        points: [{ bucketKey: '2026-01-15', bucketEnd: '2026-01-15', balance: 1100 }],
      },
      {
        accountId: 2,
        points: [{ bucketKey: '2026-01-15', bucketEnd: '2026-01-15', balance: -200 }],
      },
    ];
    const dayIndex = buildDayTransactionIndex(
      [
        transaction({ id: 1, accountId: 1, amount: 2800, counterpartyName: 'Acme Payroll' }),
        transaction({ id: 2, accountId: 2, amount: -50, counterpartyName: 'Annual fee' }),
      ],
      accounts,
    );

    const option = buildAccountBalanceHistoryChartOption(
      accounts,
      series,
      { startValue: 0, endValue: 0 },
      [],
      dayIndex,
    );

    const tooltip = option['tooltip'] as { formatter: (params: unknown) => string };
    const result = tooltip.formatter([
      { axisValue: '2026-01-15', marker: '●', seriesName: 'Checking' },
      { axisValue: '2026-01-15', marker: '◆', seriesName: 'Credit line' },
    ]);

    // Was `formatAxisTooltip`, which restated each band's own value — the number the stack draws.
    expect(result).toContain('●Checking');
    expect(result).toContain('Acme Payroll: €2,800.00');
    expect(result).toContain('◆Credit line');
    expect(result).toContain('Annual fee: -€50.00');
  });
});
