import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideEchartsCore } from 'ngx-echarts';
import { vi } from 'vitest';
import {
  AccountsRepository,
  TransactionsRepository,
  type Account,
  type Transaction,
} from '@/core/data-access';
import { computeNetWorthTrend } from '@/core/stats';
import { echarts } from '@/shared/echarts';
import { AccountsStore } from '../../accounts.store';
import {
  buildNetWorthHistoryChartOption,
  NetWorthHistoryChartComponent,
} from './net-worth-history-chart.component';

// jsdom has no ResizeObserver; the echarts directive needs one to observe its host element.
class ResizeObserverStub {
  observe = (): void => {};
  unobserve = (): void => {};
  disconnect = (): void => {};
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;

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

describe('NetWorthHistoryChartComponent', () => {
  let fixture: ComponentFixture<NetWorthHistoryChartComponent>;

  beforeEach(async () => {
    const accountsRepository = {
      getAll: vi.fn().mockResolvedValue([account({ id: 1 }), account({ id: 2, archived: true })]),
      update: vi.fn().mockResolvedValue(1),
    };
    const transactionsRepository = { getAll: vi.fn().mockResolvedValue([]) };

    await TestBed.configureTestingModule({
      imports: [NetWorthHistoryChartComponent],
      providers: [
        provideRouter([]),
        provideEchartsCore({ echarts }),
        { provide: AccountsRepository, useValue: accountsRepository },
        { provide: TransactionsRepository, useValue: transactionsRepository },
      ],
    }).compileComponents();

    await TestBed.inject(AccountsStore).hydrate();

    fixture = TestBed.createComponent(NetWorthHistoryChartComponent);
    await fixture.whenStable();
  });

  it('should create, wired to only the active (non-archived) accounts', () => {
    expect(fixture.componentInstance).toBeTruthy();
    expect(TestBed.inject(AccountsStore).activeAccounts()).toHaveLength(1);
  });
});

describe('buildNetWorthHistoryChartOption', () => {
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
      { accountId: 1, points: [{ bucketKey: '2026-01', bucketEnd: '2026-01-31', netWorth: 1100 }] },
      { accountId: 2, points: [{ bucketKey: '2026-01', bucketEnd: '2026-01-31', netWorth: -200 }] },
    ];

    const option = buildNetWorthHistoryChartOption(accounts, series, {
      startValue: 0,
      endValue: 0,
    });

    expect(option['series']).toEqual([
      {
        name: 'Checking',
        type: 'line',
        stack: 'net-worth',
        areaStyle: {},
        color: '#3366ff',
        data: [1100],
      },
      {
        name: 'Credit line',
        type: 'line',
        stack: 'net-worth',
        areaStyle: {},
        color: '#ff3366',
        data: [-200],
      },
    ]);
    expect(option['legend']).toEqual({ data: ['Checking', 'Credit line'] });
  });

  it("the stacked bands' per-bucket sum equals the combined computeNetWorthTrend total", () => {
    const transactions = [
      transaction({ id: 1, accountId: 1, amount: 200, bookingDate: '2026-01-10' }),
      transaction({ id: 2, accountId: 2, amount: -50, bookingDate: '2026-01-20' }),
    ];

    const combined = computeNetWorthTrend(
      transactions,
      accounts,
      '2026-01-01',
      '2026-02-28',
      'month',
    );
    const series = [
      {
        accountId: 1,
        points: computeNetWorthTrend(
          transactions.filter((t) => t.accountId === 1),
          [accounts[0]],
          '2026-01-01',
          '2026-02-28',
          'month',
        ),
      },
      {
        accountId: 2,
        points: computeNetWorthTrend(
          transactions.filter((t) => t.accountId === 2),
          [accounts[1]],
          '2026-01-01',
          '2026-02-28',
          'month',
        ),
      },
    ];

    const option = buildNetWorthHistoryChartOption(accounts, series, {
      startValue: 0,
      endValue: 1,
    });
    const bandData = (option['series'] as { data: number[] }[]).map((s) => s.data);

    combined.forEach((point, bucketIndex) => {
      const stackedTotal = bandData.reduce(
        (sum: number, data: number[]) => sum + data[bucketIndex],
        0,
      );
      expect(stackedTotal).toBe(point.netWorth);
    });
  });

  it('applies the given zoom window to both dataZoom entries', () => {
    const series = [
      {
        accountId: 1,
        points: [
          { bucketKey: '2026-01', bucketEnd: '2026-01-31', netWorth: 1000 },
          { bucketKey: '2026-02', bucketEnd: '2026-02-28', netWorth: 1100 },
        ],
      },
    ];

    const option = buildNetWorthHistoryChartOption([accounts[0]], series, {
      startValue: 1,
      endValue: 1,
    });

    const dataZoom = option['dataZoom'] as { startValue: number; endValue: number }[];
    expect(dataZoom.every((zoom) => zoom.startValue === 1 && zoom.endValue === 1)).toBe(true);
  });

  it('renders every hovered band as 2-decimal EUR through the shared tooltip formatter (TICKET-STAT-12)', () => {
    const series = [
      { accountId: 1, points: [{ bucketKey: '2026-01', bucketEnd: '2026-01-31', netWorth: 1100 }] },
      { accountId: 2, points: [{ bucketKey: '2026-01', bucketEnd: '2026-01-31', netWorth: -200 }] },
    ];

    const option = buildNetWorthHistoryChartOption(accounts, series, {
      startValue: 0,
      endValue: 0,
    });

    const tooltip = option['tooltip'] as { formatter: (params: unknown) => string };
    const result = tooltip.formatter([
      { axisValueLabel: '2026-01', marker: '●', seriesName: 'Checking', value: 1234.5600000000002 },
      { axisValueLabel: '2026-01', marker: '●', seriesName: 'Credit line', value: -200 },
    ]);

    expect(result).toBe('2026-01<br/>●Checking: €1,234.56<br/>●Credit line: -€200.00');
  });
});
