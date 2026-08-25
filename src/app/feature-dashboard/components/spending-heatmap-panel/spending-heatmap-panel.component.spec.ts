import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import type { ECElementEvent, EChartsCoreOption } from 'echarts/core';
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
import { echarts, resolveHeatmapCellColor } from '@/shared/echarts';
import { stubEchartsBrowserApis } from '@/shared/echarts/echarts-jsdom.testing';
import { withCleanFormatSettings } from '@/shared/utils/format-settings.testing';
import {
  buildHeatmapChartOption,
  SpendingHeatmapPanelComponent,
} from './spending-heatmap-panel.component';

stubEchartsBrowserApis();

/** What one cell looks like once its colour is resolved per cell (TICKET-STAT-34) rather than by a `visualMap`. */
type HeatmapCellItem = { value: [number, number, number]; itemStyle: { color: string } };

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
    // The "All" band leads the table (TICKET-STAT-33); the category rows follow it.
    const rowText = table.querySelectorAll('tbody tr')[1]?.textContent ?? '';
    expect(rowText).toContain('Groceries');
    expect(rowText).toContain('€40,00'); // Monday
    expect(rowText).toContain('€10,00'); // Saturday
    expect(rowText).toContain('€0,00'); // an empty day is still a cell
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
    const series = option['series'] as [{ data: HeatmapCellItem[] }, { data: HeatmapCellItem[] }];
    const yAxis = option['yAxis'] as [{ data: string[] }, { data: string[] }];

    expect(series[1].data).toHaveLength(14); // two category rows x seven columns
    expect(series[0].data).toHaveLength(7); // the band's own strip (TICKET-STAT-33)
    // echarts draws category index 0 at the bottom, so the axis is the ranking reversed.
    expect(yAxis[1].data).toEqual(['Groceries', 'Rent']);
    expect(yAxis[0].data).toEqual(['All']);
  });

  it('drills down to the clicked row’s category over the panel’s range', async () => {
    await seedGroceries(transaction({ id: 1, amount: -40 }));
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    // Monday (column 0) of the single row, which sits at y = 0 once reversed.
    fixture.componentInstance['onChartClick']({
      seriesIndex: 1,
      value: [0, 0, 40],
    } as unknown as ECElementEvent);

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
    fixture.componentInstance['onChartClick']({
      seriesIndex: 1,
      value: [0, 0, 25],
    } as unknown as ECElementEvent);

    expect(navigate).toHaveBeenCalledExactlyOnceWith(['/transactions'], {
      queryParams: { from: '2026-07-06', to: '2026-07-26' },
    });
  });

  it('withholds every figure with privacy mode on, keeping the cells', async () => {
    await seedGroceries(transaction({ id: 1, amount: -40 }));
    expect(fixture.nativeElement.querySelector('table.sr-only')?.textContent).toContain('€40,00');

    await TestBed.inject(AppSettingsStore).setPrivacyMode(true);
    fixture.detectChanges();

    // Withheld, not blurred: `.sr-only` clips the table to 1px so a CSS blur paints nothing, and a
    // screen reader would read the amount out regardless.
    const tableText = fixture.nativeElement.querySelector('table.sr-only').textContent as string;
    expect(tableText).not.toContain('€');
    expect(tableText).toContain('hidden');

    const option = fixture.componentInstance['chartOption']();
    // The visualMap that remains is hidden and carries no labels, so it leaks no figure
    // (TICKET-STAT-34); the cells it exists to permit stay.
    expect((option['visualMap'] as { show: boolean }).show).toBe(false);
    const series = option['series'] as [{ data: unknown[] }, { data: unknown[] }];
    expect(series[1].data.length).toBe(7); // one category row
    expect(series[0].data.length).toBe(7); // the band

    const tooltipFormatter = (option['tooltip'] as { formatter: (p: unknown) => string }).formatter;
    const tooltipText = tooltipFormatter({ seriesIndex: 1, value: [0, 0, 40] });
    expect(tooltipText).toContain('Groceries');
    expect(tooltipText).not.toContain('40');
  });

  it('states what the shading is relative to, in place of the removed amount scale (TICKET-STAT-34)', async () => {
    await seedGroceries(transaction({ id: 1, amount: -40 }));

    // The caption states the grid's rule; it no longer hedges shade to *depth within a colour*
    // (TICKET-STAT-45) — that wording outlived the per-category hues it described, and neither
    // does it disclaim that a row is exempt from the scale (TICKET-STAT-43).
    expect(fixture.nativeElement.textContent).toContain(
      'one scale for the whole grid — the stronger the colour, the more spend',
    );
    expect(fixture.nativeElement.textContent).not.toContain('within a colour');
    expect(fixture.nativeElement.textContent).not.toContain('The All row has its own scale');
    // What remains is a hidden, label-less visualMap that only exists because echarts refuses to
    // draw a cartesian heatmap without one — not a scale the reader can see.
    expect(fixture.componentInstance['chartOption']()['visualMap']).toEqual(
      expect.objectContaining({ show: false }),
    );
  });

  it('shows the amount in the tooltip while privacy mode is off', async () => {
    await seedGroceries(transaction({ id: 1, amount: -40 }));

    const option = fixture.componentInstance['chartOption']();
    const tooltipFormatter = (option['tooltip'] as { formatter: (p: unknown) => string }).formatter;

    expect(tooltipFormatter({ seriesIndex: 1, value: [0, 0, 40] })).toContain('€40,00');
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
        (fixture.componentInstance['chartOption']()['xAxis'] as [unknown, { data: string[] }])[1]
          .data,
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

  describe('the "All" band (TICKET-STAT-33)', () => {
    const seedTwoDays = async (): Promise<void> => {
      await TestBed.inject(CategoriesStore).addCategory(groceries);
      await TestBed.inject(CategoriesStore).addCategory({ ...groceries, id: 2, name: 'Rent' });
      TestBed.inject(TransactionsStore).addMany([
        transaction({ id: 1, bookingDate: '2026-07-06', amount: -40, categoryId: 1 }), // Mon
        transaction({ id: 2, bookingDate: '2026-07-06', amount: -900, categoryId: 2 }), // Mon
        transaction({ id: 3, bookingDate: '2026-07-11', amount: -25, categoryId: 1 }), // Sat
      ]);
      fixture.detectChanges();
    };

    const tableRows = (): { header: string; cells: string[] }[] =>
      Array.from(
        fixture.nativeElement.querySelectorAll('table.sr-only tbody tr') as NodeListOf<HTMLElement>,
      ).map((row) => ({
        header: row.querySelector('th')?.textContent?.trim() ?? '',
        cells: Array.from(row.querySelectorAll('td')).map((cell) => cell.textContent?.trim() ?? ''),
      }));

    it('leads the screen-reader table with an "All" row of the column totals', async () => {
      await seedTwoDays();

      const rows = tableRows();
      expect(rows[0].header).toBe('All');
      expect(rows[0].cells[0]).toBe('€940,00'); // Monday: 900 + 40
      expect(rows[0].cells[5]).toBe('€25,00'); // Saturday
      expect(rows.map((row) => row.header)).toEqual(['All', 'Rent', 'Groceries']);
      expect(fixture.nativeElement.querySelector('table.sr-only caption')?.textContent).toContain(
        'in total and per category',
      );
    });

    it('withholds the band’s figures under privacy mode like every other row', async () => {
      await seedTwoDays();
      await TestBed.inject(AppSettingsStore).setPrivacyMode(true);
      fixture.detectChanges();

      const bandRow = tableRows()[0];
      expect(bandRow.header).toBe('All');
      expect(bandRow.cells).toEqual(Array<string>(7).fill('hidden'));
    });

    it('drills down to the range with no category filter, like the "Other" fold', async () => {
      await seedTwoDays();
      const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

      // The band is its own series (index 0), on its own grid above the categories'.
      fixture.componentInstance['onChartClick']({
        seriesIndex: 0,
        value: [0, 0, 940],
      } as unknown as ECElementEvent);

      expect(navigate).toHaveBeenCalledExactlyOnceWith(['/transactions'], {
        queryParams: { from: '2026-07-06', to: '2026-07-26' },
      });
    });

    it('follows the totals when a category is excluded (TICKET-STAT-32)', async () => {
      await seedTwoDays();
      expect(tableRows()[0].cells[0]).toBe('€940,00');

      await TestBed.inject(AppSettingsStore).setHeatmapExcludedCategoryIds([2]); // Rent
      fixture.detectChanges();

      // Rent's 900 leaves the band, not just the grid.
      expect(tableRows()[0].cells[0]).toBe('€40,00');
      expect(tableRows().map((row) => row.header)).toEqual(['All', 'Groceries']);
    });

    it('re-folds with the cycle (TICKET-STAT-30)', async () => {
      await seedTwoDays();
      TestBed.inject(RangeStore).setCustomRange('dashboard', '2025-07-06', '2026-07-12');
      fixture.componentInstance['setCycle']('month-of-year');
      fixture.detectChanges();

      const bandRow = tableRows()[0];
      expect(bandRow.header).toBe('All');
      expect(bandRow.cells).toHaveLength(12);
      expect(bandRow.cells[6]).toBe('€965,00'); // all of it lands in July
    });

    it('still renders nothing at all when there is no spend', () => {
      fixture.detectChanges();

      // A band of zeroes is not a reason to show an empty chart.
      expect(fixture.componentInstance['hasSpend']()).toBe(false);
      expect(fixture.nativeElement.textContent.trim()).toBe('');
    });
  });

  describe('cycle switching (TICKET-STAT-30)', () => {
    const xAxisLabels = (): string[] =>
      (fixture.componentInstance['chartOption']()['xAxis'] as [unknown, { data: string[] }])[1]
        .data;

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
      { categoryId: 1, name: 'Rent', total: 900 },
      { categoryId: 2, name: 'Groceries', total: 40 },
    ],
    cells: [
      { rowIndex: 0, columnIndex: 0, amount: 900 },
      { rowIndex: 0, columnIndex: 1, amount: 0 },
      { rowIndex: 1, columnIndex: 0, amount: 25 },
      { rowIndex: 1, columnIndex: 1, amount: 15 },
    ],
    totalsRow: [925, 15], // Mon 900 + 25, Tue 0 + 15
    maxAmount: 900,
    coveredColumnCount: 2,
  };

  /**
   * The **one** scale every category row shares, pooled over the whole grid: cells
   * [900, 0, 25, 15] → min 0, max 900, average 235. Restated here so the expectations read as
   * arithmetic on the fixture rather than as whatever the builder happened to compute.
   */
  const CATEGORY_SCALE = { min: 0, average: 235, max: 900 };
  /** And the band's own, which is the one exception (TICKET-STAT-33): 925 and 15, average 470. */
  const BAND_SCALE = { min: 15, average: 470, max: 925 };

  /** The theme's primary, which both grids now ramp from (TICKET-STAT-45). */
  const RAMP_COLOR = '#0000ff';
  const LIGHT = { plotMode: 'light', rampColor: RAMP_COLOR } as const;
  const DARK = { plotMode: 'dark', rampColor: RAMP_COLOR } as const;

  /** The categories' series; the band is its own (index 0) on its own grid. */
  const cellItems = (option: EChartsCoreOption): HeatmapCellItem[] =>
    (option['series'] as [unknown, { data: HeatmapCellItem[] }])[1].data;
  const bandItems = (option: EChartsCoreOption): HeatmapCellItem[] =>
    (option['series'] as [{ data: HeatmapCellItem[] }])[0].data;

  it('reverses the rows onto the y-axis, so the heaviest category sits on top', () => {
    const option = buildHeatmapChartOption(heatmap, ['Mon', 'Tue'], LIGHT, false);

    const yAxis = option['yAxis'] as [{ data: string[] }, { data: string[] }];
    expect(yAxis[1].data).toEqual(['Groceries', 'Rent']);
    expect((option['xAxis'] as [unknown, { data: string[] }])[1].data).toEqual(['Mon', 'Tue']);
  });

  it('emits one [column, row, amount] tuple per cell, with the row index mirrored to match the axis', () => {
    const option = buildHeatmapChartOption(heatmap, ['Mon', 'Tue'], LIGHT, false);

    expect(cellItems(option).map((item) => item.value)).toEqual([
      [0, 1, 900],
      [1, 1, 0],
      [0, 0, 25],
      [1, 0, 15],
    ]);
  });

  describe('one theme-primary ramp on one shared scale (TICKET-STAT-34, TICKET-STAT-45)', () => {
    it('draws no reader-visible amount scale — no colour maps to one amount across the chart', () => {
      const option = buildHeatmapChartOption(heatmap, ['Mon', 'Tue'], LIGHT, false);

      // The visualMap that survives is hidden and label-less; echarts refuses to draw a cartesian
      // heatmap without one at all, so it cannot simply be dropped.
      expect(option['visualMap']).toEqual(expect.objectContaining({ show: false }));
    });

    it('colours every cell from the theme’s primary, against the shared scale', () => {
      const items = cellItems(buildHeatmapChartOption(heatmap, ['Mon', 'Tue'], LIGHT, false));

      // One hue for the whole grid — only the position on the pooled scale differs per cell.
      expect(items.map((item) => item.itemStyle.color)).toEqual([
        resolveHeatmapCellColor(RAMP_COLOR, CATEGORY_SCALE, 900, 'light'),
        resolveHeatmapCellColor(RAMP_COLOR, CATEGORY_SCALE, 0, 'light'),
        resolveHeatmapCellColor(RAMP_COLOR, CATEGORY_SCALE, 25, 'light'),
        resolveHeatmapCellColor(RAMP_COLOR, CATEGORY_SCALE, 15, 'light'),
      ]);
    });

    it('reads every category row against the same scale, so equal amounts shade equally', () => {
      // The same amount in two different rows: on a shared scale they must match — which is
      // exactly what a per-row scale would *not* do.
      const twin = {
        ...heatmap,
        cells: [
          { rowIndex: 0, columnIndex: 0, amount: 100 },
          { rowIndex: 0, columnIndex: 1, amount: 0 },
          { rowIndex: 1, columnIndex: 0, amount: 100 },
          { rowIndex: 1, columnIndex: 1, amount: 40 },
        ],
      };

      const items = cellItems(buildHeatmapChartOption(twin, ['Mon', 'Tue'], LIGHT, false));

      expect(items[0].itemStyle.color).toBe(items[2].itemStyle.color);
    });

    it('ramps the "Other" fold from the same primary as every other row', () => {
      const withOther = {
        ...heatmap,
        rows: [...heatmap.rows, { categoryId: null, name: 'Other', total: 30 }],
        cells: [
          ...heatmap.cells,
          { rowIndex: 2, columnIndex: 0, amount: 20 },
          { rowIndex: 2, columnIndex: 1, amount: 10 },
        ],
        totalsRow: [945, 25],
      };
      // Six cells now: [900, 0, 25, 15, 20, 10] → min 0, max 900, average 161.666…
      const sharedScale = { min: 0, average: 970 / 6, max: 900 };

      const items = cellItems(buildHeatmapChartOption(withOther, ['Mon', 'Tue'], LIGHT, false));

      expect(items[4].itemStyle.color).toBe(
        resolveHeatmapCellColor(RAMP_COLOR, sharedScale, 20, 'light'),
      );
      expect(items[5].itemStyle.color).toBe(
        resolveHeatmapCellColor(RAMP_COLOR, sharedScale, 10, 'light'),
      );
    });

    it('flips the direction with the theme’s mode', () => {
      const light = cellItems(buildHeatmapChartOption(heatmap, ['Mon', 'Tue'], LIGHT, false));
      const dark = cellItems(buildHeatmapChartOption(heatmap, ['Mon', 'Tue'], DARK, false));

      const brightness = (hex: string): number =>
        parseInt(hex.slice(1, 3), 16) +
        parseInt(hex.slice(3, 5), 16) +
        parseInt(hex.slice(5, 7), 16);

      // Rent's Monday is the grid's heaviest cell, its Tuesday the quietest. Light mode runs
      // pale → deep, dark mode deep → bright — the same ramp, mirrored.
      expect(brightness(light[0].itemStyle.color)).toBeLessThan(brightness(RAMP_COLOR));
      expect(brightness(light[1].itemStyle.color)).toBeGreaterThan(brightness(RAMP_COLOR));
      expect(brightness(dark[0].itemStyle.color)).toBeGreaterThan(brightness(RAMP_COLOR));
      expect(brightness(dark[1].itemStyle.color)).toBeLessThan(brightness(RAMP_COLOR));
    });
  });

  describe('the "All" band (TICKET-STAT-33)', () => {
    it('draws the band on its own grid above the categories, with a margin between them', () => {
      const option = buildHeatmapChartOption(heatmap, ['Mon', 'Tue'], LIGHT, false);

      const grids = option['grid'] as [
        { top: number; height: number; left: number },
        { top: number; left: number },
      ];
      const yAxis = option['yAxis'] as [{ data: string[] }, { data: string[] }];

      expect(yAxis[0].data).toEqual(['All']);
      expect(yAxis[1].data).toEqual(['Groceries', 'Rent']);
      // A margin, not a whole empty row: the categories start below the band's strip plus a gap.
      expect(grids[1].top).toBeGreaterThan(grids[0].top + grids[0].height);
      // Both grids share a left inset, so the two sets of columns line up.
      expect(grids[1].left).toBe(grids[0].left);
    });

    it('plots one band cell per column, holding the aggregate’s totals', () => {
      const band = bandItems(buildHeatmapChartOption(heatmap, ['Mon', 'Tue'], LIGHT, false));

      expect(band.map((item) => item.value)).toEqual([
        [0, 0, 925],
        [1, 0, 15],
      ]);
    });

    it('scales the band on its own maximum, off the same theme primary as the grid', () => {
      const band = bandItems(buildHeatmapChartOption(heatmap, ['Mon', 'Tue'], LIGHT, false));

      expect(band[0].itemStyle.color).toBe(
        resolveHeatmapCellColor(RAMP_COLOR, BAND_SCALE, 925, 'light'),
      );
      expect(band[1].itemStyle.color).toBe(
        resolveHeatmapCellColor(RAMP_COLOR, BAND_SCALE, 15, 'light'),
      );
    });

    it('leaves the category rows’ shading identical to what it is without the band', () => {
      const withBand = cellItems(buildHeatmapChartOption(heatmap, ['Mon', 'Tue'], LIGHT, false));
      // The same grid with a band 100x heavier: a shared scale would repaint every category cell.
      const hugeBand = { ...heatmap, totalsRow: [92500, 1500] };

      const withHugeBand = cellItems(
        buildHeatmapChartOption(hugeBand, ['Mon', 'Tue'], LIGHT, false),
      );

      expect(withHugeBand.map((item) => item.itemStyle.color)).toEqual(
        withBand.map((item) => item.itemStyle.color),
      );
    });

    it('names the band in its tooltip, and still drops the amount in privacy mode', () => {
      const shown = (option: EChartsCoreOption): string =>
        (option['tooltip'] as { formatter: (p: unknown) => string }).formatter({
          seriesIndex: 0,
          value: [0, 0, 925],
        });

      expect(shown(buildHeatmapChartOption(heatmap, ['Mon', 'Tue'], LIGHT, false))).toBe(
        'All · Mon<br/>€925,00',
      );
      expect(shown(buildHeatmapChartOption(heatmap, ['Mon', 'Tue'], LIGHT, true))).toBe(
        'All · Mon',
      );
    });
  });

  it('drops the tooltip’s amount in privacy mode', () => {
    const option = buildHeatmapChartOption(heatmap, ['Mon', 'Tue'], LIGHT, true);

    const tooltip = (option['tooltip'] as { formatter: (p: unknown) => string }).formatter({
      seriesIndex: 1,
      value: [0, 1, 900],
    });
    expect(tooltip).toBe('Rent · Mon');
  });
});
