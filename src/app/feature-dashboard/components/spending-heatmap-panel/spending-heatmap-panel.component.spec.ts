import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import type { ECElementEvent } from 'echarts/core';
import { provideEchartsCore } from 'ngx-echarts';
import { vi } from 'vitest';
import { appDb, CategoriesRepository, type Category, type Transaction } from '@/core/data-access';
import {
  AppSettingsStore,
  CategoriesStore,
  ChartOptionsStore,
  RangeStore,
  TransactionsStore,
} from '@/core/state';
import { echarts } from '@/shared/echarts';
import { stubEchartsBrowserApis } from '@/shared/echarts/echarts-jsdom.testing';
import { withCleanFormatSettings } from '@/shared/utils/format-settings.testing';
import {
  buildHeatmapChartOption,
  SpendingHeatmapPanelComponent,
} from './spending-heatmap-panel.component';

stubEchartsBrowserApis();

const groceries: Category = {
  id: 1,
  name: 'Groceries',
  kind: 'expense',
  color: '#ff0000',
  icon: 'shopping-cart',
  archived: false,
  isSystem: false,
};

const transaction = (overrides: Partial<Transaction> = {}): Transaction => ({
  id: 1,
  accountId: 1,
  bookingDate: '2026-07-06', // Monday
  amount: -50,
  currency: 'EUR',
  rawDescription: 'Supermarket',
  fingerprint: 'fp-1',
  createdAt: '2026-07-06T00:00:00.000Z',
  categoryId: 1,
  ...overrides,
});

describe('SpendingHeatmapPanelComponent (TICKET-STAT-29)', () => {
  // These assertions read formatted currency, and format-settings.ts's signals are process-global
  // under isolate:false — pin them so another spec file's locale/symbol can't reach in here.
  withCleanFormatSettings();

  let fixture: ComponentFixture<SpendingHeatmapPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SpendingHeatmapPanelComponent],
      providers: [
        provideRouter([]),
        provideEchartsCore({ echarts }),
        {
          provide: CategoriesRepository,
          // CategoriesStore self-hydrates on injection (TICKET-PERF-07); tests seed via addCategory.
          // `add` echoes the seeded id back (the store takes the *repository's* id), so a spec can
          // seed two categories without the second silently landing on the first's id.
          useValue: {
            add: vi.fn((category: Category) => Promise.resolve(category.id ?? 1)),
            getAll: vi.fn().mockResolvedValue([]),
          },
        },
      ],
    }).compileComponents();

    TestBed.inject(RangeStore).setCustomRange('dashboard', '2026-07-06', '2026-07-26');

    fixture = TestBed.createComponent(SpendingHeatmapPanelComponent);
    // Awaited explicitly, not just `whenStable()`: each store's on-injection hydration
    // (TICKET-PERF-07) only resolves once the shared fake-indexeddb actually opens, which a later
    // `appDb` write in a test can be what triggers — and a hydration landing mid-test would patch
    // the seeded transactions straight back to empty.
    await TestBed.inject(TransactionsStore).hydrate();
    await TestBed.inject(CategoriesStore).hydrate();
    await TestBed.inject(AppSettingsStore).hydrate();
    await fixture.whenStable();
  });

  afterEach(async () => {
    await appDb.appSettings.clear();
  });

  const seedGroceries = async (...transactions: Transaction[]): Promise<void> => {
    await TestBed.inject(CategoriesStore).addCategory(groceries);
    TestBed.inject(TransactionsStore).addMany(transactions);
    fixture.detectChanges();
  };

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders nothing when the selected range holds no spend', () => {
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent.trim()).toBe('');
  });

  it('renders the chart and its screen-reader table once there is spend', async () => {
    await seedGroceries(
      transaction({ id: 1, bookingDate: '2026-07-06', amount: -40 }), // Mon
      transaction({ id: 2, bookingDate: '2026-07-11', amount: -10 }), // Sat
    );

    const chart = fixture.nativeElement.querySelector('[echarts]') as HTMLElement;
    expect(chart).not.toBeNull();
    expect(chart.getAttribute('role')).toBe('img');
    expect(chart.getAttribute('aria-label')).toContain('day of the week');

    const table = fixture.nativeElement.querySelector('table.sr-only') as HTMLElement;
    expect(table).not.toBeNull();
    // Seven day columns plus the category header cell.
    expect(table.querySelectorAll('thead th')).toHaveLength(8);
    const rowText = table.querySelector('tbody tr')?.textContent ?? '';
    expect(rowText).toContain('Groceries');
    expect(rowText).toContain('€40.00'); // Monday
    expect(rowText).toContain('€10.00'); // Saturday
    expect(rowText).toContain('€0.00'); // an empty day is still a cell
  });

  it('plots one heatmap cell per row and column, with the heaviest category on top of the y-axis', async () => {
    await TestBed.inject(CategoriesStore).addCategory(groceries);
    await TestBed.inject(CategoriesStore).addCategory({ ...groceries, id: 2, name: 'Rent' });
    TestBed.inject(TransactionsStore).addMany([
      transaction({ id: 1, amount: -100, categoryId: 1 }),
      transaction({ id: 2, amount: -900, categoryId: 2 }),
    ]);
    fixture.detectChanges();

    const option = fixture.componentInstance['chartOption']();
    const series = option['series'] as [{ data: [number, number, number][] }];
    const yAxis = option['yAxis'] as { data: string[] };

    expect(series[0].data).toHaveLength(14); // two rows x seven columns
    // echarts draws category index 0 at the bottom, so the axis is the ranking reversed.
    expect(yAxis.data).toEqual(['Groceries', 'Rent']);
  });

  it('drills down to the clicked row’s category over the panel’s range', async () => {
    await seedGroceries(transaction({ id: 1, amount: -40 }));
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    // Monday (column 0) of the single row, which sits at y = 0 once reversed.
    fixture.componentInstance['onChartClick']({ value: [0, 0, 40] } as unknown as ECElementEvent);

    expect(navigate).toHaveBeenCalledExactlyOnceWith(['/transactions'], {
      queryParams: { from: '2026-07-06', to: '2026-07-26', categoryId: '1' },
    });
  });

  it('drills down to the range alone from the "Other" row, which folds several categories', async () => {
    await TestBed.inject(CategoriesStore).addCategory(groceries);
    TestBed.inject(TransactionsStore).addMany([
      transaction({ id: 1, amount: -40, categoryId: 1 }),
      transaction({ id: 2, amount: -25, categoryId: undefined }), // uncategorised -> Other
    ]);
    fixture.detectChanges();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    // "Other" is the last row in the ranking, so it sits at y = 0 on the reversed axis.
    fixture.componentInstance['onChartClick']({ value: [0, 0, 25] } as unknown as ECElementEvent);

    expect(navigate).toHaveBeenCalledExactlyOnceWith(['/transactions'], {
      queryParams: { from: '2026-07-06', to: '2026-07-26' },
    });
  });

  it('withholds every figure with privacy mode on, keeping the cells', async () => {
    await seedGroceries(transaction({ id: 1, amount: -40 }));
    expect(fixture.nativeElement.querySelector('table.sr-only')?.textContent).toContain('€40.00');

    await TestBed.inject(AppSettingsStore).setPrivacyMode(true);
    fixture.detectChanges();

    // Withheld, not blurred: `.sr-only` clips the table to 1px so a CSS blur paints nothing, and a
    // screen reader would read the amount out regardless.
    const tableText = fixture.nativeElement.querySelector('table.sr-only').textContent as string;
    expect(tableText).not.toContain('€');
    expect(tableText).toContain('hidden');

    const option = fixture.componentInstance['chartOption']();
    // The scale's labels are amounts, so it goes away; the cells it colours do not.
    expect((option['visualMap'] as { show: boolean }).show).toBe(false);
    expect((option['series'] as [{ data: unknown[] }])[0].data.length).toBe(7);

    const tooltipFormatter = (option['tooltip'] as { formatter: (p: unknown) => string }).formatter;
    const tooltipText = tooltipFormatter({ value: [0, 0, 40] });
    expect(tooltipText).toContain('Groceries');
    expect(tooltipText).not.toContain('40');
  });

  it('shows the amount in the tooltip while privacy mode is off', async () => {
    await seedGroceries(transaction({ id: 1, amount: -40 }));

    const option = fixture.componentInstance['chartOption']();
    const tooltipFormatter = (option['tooltip'] as { formatter: (p: unknown) => string }).formatter;

    expect(tooltipFormatter({ value: [0, 0, 40] })).toContain('€40.00');
  });

  describe('cycles restricted to the range (TICKET-STAT-31)', () => {
    it('offers day of week alone on a week-long range', async () => {
      TestBed.inject(RangeStore).setCustomRange('dashboard', '2026-07-06', '2026-07-12');
      await seedGroceries(transaction({ id: 1, amount: -40 }));

      expect(fixture.componentInstance['availableCycles']()).toEqual(['day-of-week']);
      const buttons = Array.from(
        fixture.nativeElement.querySelectorAll('mm-cycle-picker button') as NodeListOf<HTMLElement>,
      ).map((button) => button.textContent?.trim());
      expect(buttons).toEqual(['Day of week']);
    });

    it('falls back to the longest cycle the range can fill, without overwriting the stored choice', async () => {
      await seedGroceries(transaction({ id: 1, amount: -40 }));
      TestBed.inject(RangeStore).setCustomRange('dashboard', '2025-07-06', '2026-07-12');
      fixture.componentInstance['setCycle']('month-of-year');
      fixture.detectChanges();
      expect(fixture.componentInstance['cycle']()).toBe('month-of-year');

      // Narrow to a single week: month-of-year no longer fits.
      TestBed.inject(RangeStore).setCustomRange('dashboard', '2026-07-06', '2026-07-12');
      fixture.detectChanges();

      expect(fixture.componentInstance['cycle']()).toBe('day-of-week');
      // The user's choice is still on record — a range change is not a click on the picker.
      expect(TestBed.inject(ChartOptionsStore).cycle('dashboard-heatmap')).toBe('month-of-year');

      // Widen back past a year and the stored choice returns.
      TestBed.inject(RangeStore).setCustomRange('dashboard', '2025-07-06', '2026-07-12');
      fixture.detectChanges();
      expect(fixture.componentInstance['cycle']()).toBe('month-of-year');
    });

    it('draws the effective cycle, not the stored one, in the chart and the table', async () => {
      await seedGroceries(transaction({ id: 1, amount: -40 }));
      TestBed.inject(RangeStore).setCustomRange('dashboard', '2025-07-06', '2026-07-12');
      fixture.componentInstance['setCycle']('month-of-year');
      TestBed.inject(RangeStore).setCustomRange('dashboard', '2026-07-06', '2026-07-12');
      fixture.detectChanges();

      expect(
        (fixture.componentInstance['chartOption']()['xAxis'] as { data: string[] }).data,
      ).toHaveLength(7);
      expect(fixture.nativeElement.querySelector('table.sr-only caption').textContent).toContain(
        'day of the week',
      );
    });
  });

  describe('excluded categories (TICKET-STAT-32)', () => {
    const rent = { ...groceries, id: 2, name: 'Rent' };

    const seedTwoCategories = async (): Promise<void> => {
      await TestBed.inject(CategoriesStore).addCategory(groceries);
      await TestBed.inject(CategoriesStore).addCategory(rent);
      TestBed.inject(TransactionsStore).addMany([
        transaction({ id: 1, amount: -40, categoryId: 1 }),
        transaction({ id: 2, amount: -900, categoryId: 2 }),
      ]);
      fixture.detectChanges();
    };

    it('renders the shared exclusion checklist with every active expense category', async () => {
      await seedTwoCategories();

      expect(fixture.nativeElement.querySelector('app-category-exclusion-dropdown')).not.toBeNull();
      const labels = Array.from(
        fixture.nativeElement.querySelectorAll('.dropdown-content li') as NodeListOf<HTMLElement>,
      ).map((row) => row.textContent?.trim());
      expect(labels).toEqual(['Groceries', 'Rent']);
      expect(fixture.nativeElement.textContent).toContain('Exclude categories');
    });

    it('drops an excluded category from the grid and rescales the colours', async () => {
      await seedTwoCategories();
      expect(fixture.componentInstance['heatmap']().maxAmount).toBe(900);

      await TestBed.inject(AppSettingsStore).setHeatmapExcludedCategoryIds([2]);
      fixture.detectChanges();

      expect(fixture.componentInstance['heatmap']().rows.map((row) => row.name)).toEqual([
        'Groceries',
      ]);
      expect(fixture.componentInstance['heatmap']().maxAmount).toBe(40);
      const triggerText = (
        fixture.nativeElement.querySelector('app-category-exclusion-dropdown') as HTMLElement
      ).textContent?.replace(/\s+/g, ' ');
      expect(triggerText).toContain('Exclude categories (1)');
    });

    it('ticking a category in the checklist writes the whole set through AppSettingsStore', async () => {
      await seedTwoCategories();
      const setExcluded = vi
        .spyOn(TestBed.inject(AppSettingsStore), 'setHeatmapExcludedCategoryIds')
        .mockResolvedValue();

      const checkboxes = fixture.nativeElement.querySelectorAll(
        '.dropdown-content input[type="checkbox"]',
      ) as NodeListOf<HTMLInputElement>;
      checkboxes[1].dispatchEvent(new Event('change')); // Rent
      fixture.detectChanges();

      expect(setExcluded).toHaveBeenCalledExactlyOnceWith([2]);
    });

    it('self-hides when everything is excluded', async () => {
      await seedTwoCategories();

      await TestBed.inject(AppSettingsStore).setHeatmapExcludedCategoryIds([1, 2]);
      fixture.detectChanges();

      expect(fixture.componentInstance['hasSpend']()).toBe(false);
      expect(fixture.nativeElement.textContent.trim()).toBe('');
    });
  });

  describe('cycle switching (TICKET-STAT-30)', () => {
    const xAxisLabels = (): string[] =>
      (fixture.componentInstance['chartOption']()['xAxis'] as { data: string[] }).data;

    it('starts on day of the week, the axis the panel shipped with', async () => {
      await seedGroceries(transaction({ id: 1, amount: -40 }));

      expect(fixture.componentInstance['cycle']()).toBe('day-of-week');
      expect(xAxisLabels()).toHaveLength(7);
    });

    it('switches the chart, its table and its accessible name together', async () => {
      await seedGroceries(transaction({ id: 1, amount: -40 }));
      // A year-shaped cycle needs a year-shaped range to be on offer at all (TICKET-STAT-31).
      TestBed.inject(RangeStore).setCustomRange('dashboard', '2025-07-06', '2026-07-12');

      fixture.componentInstance['setCycle']('month-of-year');
      fixture.detectChanges();

      expect(xAxisLabels()).toHaveLength(12);
      expect(xAxisLabels()[0]).toBe('Jan');
      // The table can't be left describing the previous axis.
      const table = fixture.nativeElement.querySelector('table.sr-only') as HTMLElement;
      expect(table.querySelectorAll('thead th')).toHaveLength(13);
      expect(table.querySelector('caption')?.textContent).toContain('per month');
      expect(
        (fixture.nativeElement.querySelector('[echarts]') as HTMLElement).getAttribute(
          'aria-label',
        ),
      ).toContain('category and month');
    });

    it('holds the chosen cycle in ChartOptionsStore, so a remount keeps it', async () => {
      await seedGroceries(transaction({ id: 1, amount: -40 }));
      TestBed.inject(RangeStore).setCustomRange('dashboard', '2025-07-06', '2026-07-12');

      fixture.componentInstance['setCycle']('quarter-of-year');

      expect(TestBed.inject(ChartOptionsStore).cycle('dashboard-heatmap')).toBe('quarter-of-year');

      const remounted = TestBed.createComponent(SpendingHeatmapPanelComponent);
      remounted.detectChanges();
      expect(remounted.componentInstance['cycle']()).toBe('quarter-of-year');
    });

    it('says so when an offered cycle still cannot reach every column, and stays quiet when it can', async () => {
      // A whole February: long enough to offer day-of-month (TICKET-STAT-31's 28-day threshold),
      // but it never reaches the 29th-31st — which is exactly the case this note exists for.
      TestBed.inject(RangeStore).setCustomRange('dashboard', '2026-02-01', '2026-02-28');
      await seedGroceries(transaction({ id: 1, bookingDate: '2026-02-03', amount: -40 }));

      // Four weeks covers all seven weekdays...
      expect(fixture.componentInstance['partialCycleNote']()).toBeNull();

      // ...but only 28 of the 31 day-of-month columns.
      fixture.componentInstance['setCycle']('day-of-month');
      fixture.detectChanges();

      expect(fixture.componentInstance['partialCycleNote']()).toBe(
        'This range only covers 28 of 31 days of the month',
      );
      expect(fixture.nativeElement.textContent).toContain(
        'This range only covers 28 of 31 days of the month',
      );
    });
  });
});

describe('buildHeatmapChartOption (TICKET-STAT-29)', () => {
  // No TestBed and no chart instance: the option builder is a pure function of the aggregate's
  // output, which is the whole reason it lives outside the component class.
  withCleanFormatSettings();

  const heatmap = {
    columnKeys: ['mon', 'tue'],
    rows: [
      { categoryId: 1, name: 'Rent', color: '#ff0000', total: 900 },
      { categoryId: 2, name: 'Groceries', color: '#00ff00', total: 40 },
    ],
    cells: [
      { rowIndex: 0, columnIndex: 0, amount: 900 },
      { rowIndex: 0, columnIndex: 1, amount: 0 },
      { rowIndex: 1, columnIndex: 0, amount: 25 },
      { rowIndex: 1, columnIndex: 1, amount: 15 },
    ],
    maxAmount: 900,
    coveredColumnCount: 2,
  };

  it('reverses the rows onto the y-axis, so the heaviest category sits on top', () => {
    const option = buildHeatmapChartOption(
      heatmap,
      ['Mon', 'Tue'],
      ['#eee', '#999', '#333'],
      false,
    );

    expect((option['yAxis'] as { data: string[] }).data).toEqual(['Groceries', 'Rent']);
    expect((option['xAxis'] as { data: string[] }).data).toEqual(['Mon', 'Tue']);
  });

  it('emits one [column, row, amount] tuple per cell, with the row index mirrored to match the axis', () => {
    const option = buildHeatmapChartOption(
      heatmap,
      ['Mon', 'Tue'],
      ['#eee', '#999', '#333'],
      false,
    );

    expect((option['series'] as [{ data: number[][] }])[0].data).toEqual([
      [0, 1, 900],
      [1, 1, 0],
      [0, 0, 25],
      [1, 0, 15],
    ]);
  });

  it('scales the colour ramp from zero to the grid’s own maximum', () => {
    const ramp = ['#eee', '#999', '#333'];

    const visualMap = buildHeatmapChartOption(heatmap, ['Mon', 'Tue'], ramp, false)[
      'visualMap'
    ] as { min: number; max: number; show: boolean; inRange: { color: string[] }; text: string[] };

    expect(visualMap.min).toBe(0);
    expect(visualMap.max).toBe(900);
    expect(visualMap.inRange.color).toBe(ramp);
    expect(visualMap.text).toEqual(['€900.00', '€0.00']);
  });

  it('hides the amount-labelled scale, and the tooltip’s amount, in privacy mode', () => {
    const option = buildHeatmapChartOption(heatmap, ['Mon', 'Tue'], ['#eee', '#999', '#333'], true);

    expect((option['visualMap'] as { show: boolean }).show).toBe(false);
    const tooltip = (option['tooltip'] as { formatter: (p: unknown) => string }).formatter({
      value: [0, 1, 900],
    });
    expect(tooltip).toBe('Rent · Mon');
  });
});
