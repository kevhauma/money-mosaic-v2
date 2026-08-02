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
import { pickGranularityForSpan } from '@/core/stats';
import { AccountsStore, CategoriesStore, RangeStore, TransactionsStore } from '@/core/state';
import { echarts } from '@/shared/echarts';
import {
  AccountBalanceChartComponent,
  buildAccountBalanceChartOption,
} from './account-balance-chart.component';
import { withCleanFormatSettings } from '@/shared/utils/format-settings.testing';

// jsdom has no ResizeObserver; the echarts directive needs one to observe its host element.
class ResizeObserverStub {
  observe = (): void => {};
  unobserve = (): void => {};
  disconnect = (): void => {};
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;

const account: Account = {
  id: 1,
  name: 'Checking',
  type: 'checking',
  currency: 'EUR',
  openingBalance: 1000,
  openingBalanceDate: '2026-01-01',
  color: '#3366ff',
  icon: 'wallet',
  archived: false,
};

describe('AccountBalanceChartComponent', () => {
  // These assertions read formatted currency, and format-settings.ts's signals are process-global
  // under isolate:false — pin them so another spec file's locale/symbol can't reach in here.
  withCleanFormatSettings();

  let fixture: ComponentFixture<AccountBalanceChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AccountBalanceChartComponent],
      providers: [provideRouter([]), provideEchartsCore({ echarts })],
    }).compileComponents();

    fixture = TestBed.createComponent(AccountBalanceChartComponent);
    fixture.componentRef.setInput('account', account);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('defaults its local granularity control from pickGranularityForSpan for the current shared date range (TICKET-STAT-15)', () => {
    const rangeStore = TestBed.inject(RangeStore);
    const expected = pickGranularityForSpan(rangeStore.from('accounts'), rangeStore.to('accounts'));

    expect(fixture.componentInstance['granularity']()).toBe(expected);
  });

  it("changing its local granularity control changes only its own chart's points (TICKET-STAT-15)", () => {
    fixture.componentInstance['granularity'].set('day');
    const pointsAsDay = fixture.componentInstance['points']().length;

    fixture.componentInstance['granularity'].set('quarter');
    const pointsAsQuarter = fixture.componentInstance['points']().length;

    expect(pointsAsQuarter).toBeLessThan(pointsAsDay);
  });
});

describe('AccountBalanceChartComponent: a joint account plots its real balance (TICKET-ACC-07)', () => {
  const jointAccount: Account = {
    id: 1,
    name: 'Joint',
    type: 'joint',
    currency: 'EUR',
    openingBalance: 1000,
    openingBalanceDate: '2026-01-01',
    color: '#3366ff',
    icon: 'users',
    archived: false,
    ownershipShare: 0.5,
  };
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

  it("ends on the same figure as the detail page's balance header (AccountsStore.balancesById)", async () => {
    await TestBed.configureTestingModule({
      imports: [AccountBalanceChartComponent],
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

    const accountsStore = TestBed.inject(AccountsStore);
    await accountsStore.hydrate();
    await TestBed.inject(TransactionsStore).hydrate();
    await TestBed.inject(CategoriesStore).hydrate();

    const jointFixture = TestBed.createComponent(AccountBalanceChartComponent);
    jointFixture.componentRef.setInput('account', jointAccount);
    await jointFixture.whenStable();

    const plotted = jointFixture.componentInstance['points']().at(-1)?.balance;

    expect(plotted).toBe(1200);
    expect(plotted).toBe(accountsStore.balancesById().get(1));
    // Not the stake — that's the divergence this ticket fixes.
    expect(accountsStore.jointAccountStakeById().get(1)).toBe(400);
  });
});

describe('buildAccountBalanceChartOption', () => {
  it("colours its single line series with the account's own colour and an x-axis dataZoom", () => {
    const option = buildAccountBalanceChartOption(
      account,
      [
        { bucketKey: '2026-01', bucketEnd: '2026-01-31', balance: 1000 },
        { bucketKey: '2026-02', bucketEnd: '2026-02-28', balance: 1200 },
      ],
      { startValue: 0, endValue: 1 },
    );

    expect(option['series']).toEqual([{ type: 'line', data: [1000, 1200], color: '#3366ff' }]);
    const dataZoom = option['dataZoom'] as { xAxisIndex: number }[];
    expect(dataZoom).toHaveLength(2);
    expect(dataZoom.every((zoom) => zoom.xAxisIndex === 0)).toBe(true);
  });

  it('applies the given zoom window to both dataZoom entries', () => {
    const option = buildAccountBalanceChartOption(
      account,
      [
        { bucketKey: '2026-01', bucketEnd: '2026-01-31', balance: 1000 },
        { bucketKey: '2026-02', bucketEnd: '2026-02-28', balance: 1200 },
        { bucketKey: '2026-03', bucketEnd: '2026-03-31', balance: 1300 },
      ],
      { startValue: 1, endValue: 2 },
    );

    const dataZoom = option['dataZoom'] as { startValue: number; endValue: number }[];
    expect(dataZoom.every((zoom) => zoom.startValue === 1 && zoom.endValue === 2)).toBe(true);
  });

  it('renders the hovered point as 2-decimal EUR through the shared tooltip formatter (TICKET-STAT-12)', () => {
    const option = buildAccountBalanceChartOption(
      account,
      [{ bucketKey: '2026-01', bucketEnd: '2026-01-31', balance: 1234.5600000000002 }],
      { startValue: 0, endValue: 1 },
    );

    const tooltip = option['tooltip'] as { formatter: (params: unknown) => string };
    const result = tooltip.formatter([
      { axisValueLabel: '2026-01', marker: '●', seriesName: 'Checking', value: 1234.5600000000002 },
    ]);

    expect(result).toBe('2026-01<br/>●Checking: €1,234.56');
  });
});
