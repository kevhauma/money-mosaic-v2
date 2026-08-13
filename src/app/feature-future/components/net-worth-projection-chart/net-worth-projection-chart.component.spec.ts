import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideEchartsCore } from 'ngx-echarts';
import { vi } from 'vitest';
import {
  AccountsRepository,
  AppSettingsRepository,
  CategoriesRepository,
  DEFAULT_FORECAST_SETTINGS,
  ForecastSettingsRepository,
  GoalsRepository,
  TransactionsRepository,
  TransfersRepository,
  type Account,
  type ForecastSettings,
  type SavingsGoal,
  type Transaction,
} from '@/core/data-access';
import {
  AccountsStore,
  AppSettingsStore,
  ForecastSettingsStore,
  GoalsStore,
  TransactionsStore,
  TransfersStore,
} from '@/core/state';
import { echarts } from '@/shared/echarts';
import { stubEchartsBrowserApis } from '@/shared/echarts/echarts-jsdom.testing';
import { formatCurrency, HIDDEN_AMOUNT_TEXT } from '@/shared/utils';
import { withCleanFormatSettings } from '@/shared/utils/format-settings.testing';
import { ForecastStore } from '../../forecast.store';
import { NetWorthProjectionChartComponent } from './net-worth-projection-chart.component';

stubEchartsBrowserApis();

const account = (openingBalance: number): Account => ({
  id: 1,
  name: 'Checking',
  type: 'checking',
  currency: 'EUR',
  openingBalance,
  openingBalanceDate: '2020-01-01',
  color: '#000000',
  icon: 'bank',
  archived: false,
});

const goal = (overrides: Partial<SavingsGoal> = {}): SavingsGoal => ({
  id: 1,
  name: 'Camera',
  targetAmount: 1200,
  archived: false,
  createdAt: '2026-01-01',
  ...overrides,
});

/** `count` complete months back from today, each netting the given amount. */
const monthlyHistory = (count: number, amount = 200): Transaction[] => {
  const now = new Date();
  return Array.from({ length: count }, (_, index) => {
    const month = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (index + 1), 10));
    const bookingDate = month.toISOString().slice(0, 10);
    return {
      id: index + 1,
      accountId: 1,
      bookingDate,
      amount,
      currency: 'EUR' as const,
      rawDescription: 'Salary',
      fingerprint: `fp-${bookingDate}`,
      createdAt: `${bookingDate}T00:00:00.000Z`,
    };
  });
};

/**
 * Every fixture this file mounts, destroyed after each test. A live chart leaves a zrender paint
 * queued on `requestAnimationFrame`; if the fixture is still mounted when the frame runs after the
 * test ends, zrender dereferences a painter whose root has gone and throws out-of-band — which
 * Vitest reports as an unhandled error and a non-zero exit, without failing any test.
 */
let mounted: ComponentFixture<NetWorthProjectionChartComponent> | null = null;

afterEach(() => {
  mounted?.destroy();
  mounted = null;
});

const createFixture = async ({
  goals = [] as SavingsGoal[],
  transactions = [] as Transaction[],
  openingBalance = 0,
  settings = DEFAULT_FORECAST_SETTINGS as ForecastSettings,
} = {}): Promise<ComponentFixture<NetWorthProjectionChartComponent>> => {
  await TestBed.configureTestingModule({
    imports: [NetWorthProjectionChartComponent],
    providers: [
      provideEchartsCore({ echarts }),
      { provide: GoalsRepository, useValue: { getAll: vi.fn().mockResolvedValue(goals) } },
      {
        provide: AccountsRepository,
        useValue: { getAll: vi.fn().mockResolvedValue([account(openingBalance)]) },
      },
      {
        provide: TransactionsRepository,
        useValue: { getAll: vi.fn().mockResolvedValue(transactions) },
      },
      { provide: TransfersRepository, useValue: { getAll: vi.fn().mockResolvedValue([]) } },
      { provide: CategoriesRepository, useValue: { getAll: vi.fn().mockResolvedValue([]) } },
      {
        provide: ForecastSettingsRepository,
        useValue: { get: vi.fn().mockResolvedValue(settings) },
      },
      {
        provide: AppSettingsRepository,
        useValue: { get: vi.fn().mockResolvedValue({ id: 1 }), setPrivacyMode: vi.fn() },
      },
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(NetWorthProjectionChartComponent);
  await Promise.all([
    TestBed.inject(GoalsStore).hydrate(),
    TestBed.inject(AccountsStore).hydrate(),
    TestBed.inject(TransactionsStore).hydrate(),
    TestBed.inject(TransfersStore).hydrate(),
    TestBed.inject(ForecastSettingsStore).hydrate(),
  ]);
  fixture.detectChanges();
  mounted = fixture;
  return fixture;
};

const host = (fixture: ComponentFixture<NetWorthProjectionChartComponent>): HTMLElement =>
  fixture.nativeElement as HTMLElement;

const accessibleRows = (fixture: ComponentFixture<NetWorthProjectionChartComponent>) =>
  [...host(fixture).querySelectorAll('table.sr-only tbody tr')].map((row) => ({
    month: row.querySelector('th')?.textContent?.trim(),
    balance: row.querySelectorAll('td')[0]?.textContent?.trim(),
    bought: row.querySelectorAll('td')[1]?.textContent?.trim(),
  }));

describe('NetWorthProjectionChartComponent (TICKET-FUT-07)', () => {
  withCleanFormatSettings();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts the series at exactly AccountsStore.netWorth() — asserted against the store', async () => {
    const fixture = await createFixture({
      goals: [goal()],
      transactions: monthlyHistory(6),
      openingBalance: 500,
    });

    const netWorth = TestBed.inject(AccountsStore).netWorth();
    expect(TestBed.inject(ForecastStore).projection()[0].balance).toBe(netWorth);
    // Through the app's own formatter, not a hand-rolled `Intl` — the figure table must read the
    // same as every other amount on the page.
    expect(accessibleRows(fixture)[0].balance).toBe(formatCurrency(netWorth));
  });

  it('rises by the measured rate between purchases and steps down at the goal’s ETA', async () => {
    // Net worth is 6 x 200 = 1200; a 3000 goal is genuinely ahead, so it steps the line rather
    // than being affordable on day one.
    const fixture = await createFixture({
      goals: [goal({ targetAmount: 3000 })],
      transactions: monthlyHistory(6),
      openingBalance: 0,
    });
    const projection = TestBed.inject(ForecastStore).projection();
    const perMonth = TestBed.inject(ForecastStore).velocity().perMonth;

    const stepIndex = projection.findIndex((entry) => entry.purchases.length > 0);
    expect(stepIndex).toBeGreaterThan(0);
    // Every month before the purchase rises by exactly the rate...
    expect(projection[1].balance - projection[0].balance).toBe(perMonth);
    // ...and the purchase month is the rate minus the goal's target.
    expect(projection[stepIndex].balance - projection[stepIndex - 1].balance).toBe(perMonth - 3000);
    expect(host(fixture).querySelector('div[echarts]')).not.toBeNull();
  });

  it('never dips below a non-zero safety net', async () => {
    const fixture = await createFixture({
      goals: [goal({ targetAmount: 1000 }), goal({ id: 2, name: 'Bike', targetAmount: 800 })],
      transactions: monthlyHistory(6),
      openingBalance: 1500,
      settings: { ...DEFAULT_FORECAST_SETTINGS, safetyNetAmount: 400 },
    });

    for (const entry of TestBed.inject(ForecastStore).projection()) {
      expect(entry.balance).toBeGreaterThanOrEqual(400);
    }
    expect(host(fixture).querySelector('div[echarts]')).not.toBeNull();
  });

  it('says in the caption how many goals were left off, and does not plot them', async () => {
    const fixture = await createFixture({
      goals: [
        goal({ targetAmount: 3000 }),
        goal({ id: 2, name: 'Yacht', targetAmount: 5_000_000 }),
      ],
      transactions: monthlyHistory(6),
      openingBalance: 0,
    });

    expect(host(fixture).textContent).toContain('1 goal is not drawn');
    const plotted = TestBed.inject(ForecastStore)
      .projection()
      .flatMap((entry) => entry.purchases.map((purchase) => purchase.name));
    expect(plotted).toContain('Camera');
    expect(plotted).not.toContain('Yacht');
  });

  it('states the straight-line simplifications rather than letting the curve imply precision', async () => {
    const fixture = await createFixture({
      goals: [goal()],
      transactions: monthlyHistory(6),
    });

    expect(host(fixture).textContent).toContain(
      'no compounding, interest, inflation or upcoming bills',
    );
  });

  it('draws a declining line with an explicit caption when the rate is negative', async () => {
    const fixture = await createFixture({
      goals: [goal()],
      transactions: monthlyHistory(6, -300),
      openingBalance: 5000,
    });
    const projection = TestBed.inject(ForecastStore).projection();

    expect(projection[1].balance).toBeLessThan(projection[0].balance);
    expect(host(fixture).textContent).toContain('spent more than you earned');
    expect(host(fixture).querySelector('div[echarts]')).not.toBeNull();
  });

  it.each([
    ['no goals', { transactions: [] as Transaction[] }, 'Add a goal above'],
    [
      'no complete months of history',
      { goals: [goal()], transactions: [] as Transaction[] },
      'Not enough complete months',
    ],
  ])('renders the empty state, not a chart, with %s', async (_case, options, message) => {
    const fixture = await createFixture(options);

    expect(host(fixture).querySelector('mm-empty-state')).not.toBeNull();
    expect(host(fixture).querySelector('div[echarts]')).toBeNull();
    expect(host(fixture).textContent).toContain(message);
  });

  it('ships the screen-reader figure table, matching the plotted series month for month', async () => {
    const fixture = await createFixture({
      goals: [goal({ targetAmount: 3000 })],
      transactions: monthlyHistory(6),
    });
    const projection = TestBed.inject(ForecastStore).projection();
    const rows = accessibleRows(fixture);

    expect(rows).toHaveLength(projection.length);
    const boughtRow = rows.find((row) => row.bought);
    expect(boughtRow?.bought).toContain('Camera');
    expect(boughtRow?.bought).toContain('€3,000.00');
  });

  it('withholds the figures in that table under privacy mode, rather than blurring a clipped box', async () => {
    const fixture = await createFixture({
      goals: [goal({ targetAmount: 3000 })],
      transactions: monthlyHistory(6),
    });

    await TestBed.inject(AppSettingsStore).setPrivacyMode(true);
    fixture.detectChanges();

    const rows = accessibleRows(fixture);
    expect(rows.every((row) => row.balance === HIDDEN_AMOUNT_TEXT)).toBe(true);
    const boughtRow = rows.find((row) => row.bought);
    expect(boughtRow?.bought).toBe('Camera');
  });
});

describe('NetWorthProjectionChartComponent: required-rate mode (TICKET-FUT-09)', () => {
  withCleanFormatSettings();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const requiredSettings: ForecastSettings = {
    ...DEFAULT_FORECAST_SETTINGS,
    mode: 'required-rate',
  };

  const inTwoYears = (): string =>
    new Date(Date.UTC(new Date().getUTCFullYear() + 2, 0, 15)).toISOString().slice(0, 10);

  const seriesOf = (fixture: ComponentFixture<NetWorthProjectionChartComponent>) => {
    const option = (
      fixture.componentInstance as unknown as { chartOption: () => Record<string, unknown> }
    ).chartOption();
    return option['series'] as { name: string; data: number[] }[];
  };

  it('rises at the plan rate and draws the measured rate as a dashed comparison series', async () => {
    const fixture = await createFixture({
      goals: [goal({ targetAmount: 12000, targetDate: inTwoYears() })],
      transactions: monthlyHistory(6),
      settings: requiredSettings,
    });

    const series = seriesOf(fixture);
    expect(series[0].name).toBe('At the rate this plan needs');
    expect(series[1].name).toBe('At the rate you actually save');
    // The plan needs more per month than the measured 200, so it climbs faster.
    expect(series[0].data[1] - series[0].data[0]).toBeGreaterThan(
      series[1].data[1] - series[1].data[0],
    );
  });

  it('steps down on the goal’s own wanted-by date, not on a computed ETA', async () => {
    const targetDate = inTwoYears();
    await createFixture({
      goals: [goal({ targetAmount: 12000, targetDate })],
      transactions: monthlyHistory(6),
      settings: requiredSettings,
    });

    const purchase = TestBed.inject(ForecastStore)
      .projection()
      .find((point) => point.purchases.length > 0);
    expect(purchase?.bucketKey).toBe(targetDate.slice(0, 7));
  });

  it('still starts at exactly AccountsStore.netWorth() in this mode too', async () => {
    const fixture = await createFixture({
      goals: [goal({ targetAmount: 12000, targetDate: inTwoYears() })],
      transactions: monthlyHistory(6),
      openingBalance: 700,
      settings: requiredSettings,
    });

    expect(TestBed.inject(ForecastStore).projection()[0].balance).toBe(
      TestBed.inject(AccountsStore).netWorth(),
    );
    expect(accessibleRows(fixture)[0].balance).toBe(
      formatCurrency(TestBed.inject(AccountsStore).netWorth()),
    );
  });

  it('gives the figure table a column for the second series', async () => {
    const fixture = await createFixture({
      goals: [goal({ targetAmount: 12000, targetDate: inTwoYears() })],
      transactions: monthlyHistory(6),
      settings: requiredSettings,
    });

    const headers = [...host(fixture).querySelectorAll('table.sr-only thead th')].map((cell) =>
      cell.textContent?.trim(),
    );
    expect(headers).toEqual([
      'Month',
      'Projected balance',
      'At the rate you actually save',
      'Bought',
    ]);
    expect(host(fixture).querySelectorAll('table.sr-only tbody tr td')).not.toHaveLength(0);
  });

  it('omits an undated goal from the line and counts it in the caption', async () => {
    const fixture = await createFixture({
      goals: [
        goal({ targetAmount: 12000, targetDate: inTwoYears() }),
        goal({ id: 2, name: 'Someday', targetAmount: 500 }),
      ],
      transactions: monthlyHistory(6),
      settings: requiredSettings,
    });

    expect(host(fixture).textContent).toContain(
      "1 goal is not drawn: there's no monthly figure to plot for it",
    );
    const plotted = TestBed.inject(ForecastStore)
      .projection()
      .flatMap((point) => point.purchases.map((purchase) => purchase.name));
    expect(plotted).not.toContain('Someday');
  });

  it('draws even on a history too thin for the other mode — the measured rate is only the comparison', async () => {
    const fixture = await createFixture({
      goals: [goal({ targetAmount: 12000, targetDate: inTwoYears() })],
      transactions: [],
      settings: requiredSettings,
    });

    expect(host(fixture).querySelector('div[echarts]')).not.toBeNull();
  });

  it('asks for a date rather than drawing, when no goal has one', async () => {
    const fixture = await createFixture({
      goals: [goal({ targetAmount: 12000 })],
      transactions: monthlyHistory(6),
      settings: requiredSettings,
    });

    expect(host(fixture).querySelector('mm-empty-state')).not.toBeNull();
    expect(host(fixture).textContent).toContain('Give a goal a wanted-by date');
  });
});
