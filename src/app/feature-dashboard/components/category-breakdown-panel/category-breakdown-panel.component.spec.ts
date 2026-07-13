import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideEchartsCore } from 'ngx-echarts';
import { vi } from 'vitest';
import { CategoriesRepository, type Category } from '@/core/data-access';
import { RangeStore } from '@/core/stats';
import { echarts } from '@/shared/echarts';
import { CategoriesStore } from '@/feature-categories';
import { TransactionsStore } from '@/feature-transactions';
import { CategoryBreakdownPanelComponent } from './category-breakdown-panel.component';

// jsdom has no ResizeObserver; the echarts directive needs one to observe its host element.
class ResizeObserverStub {
  observe = (): void => {};
  unobserve = (): void => {};
  disconnect = (): void => {};
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;

const groceries: Category = {
  id: 1,
  name: 'Groceries',
  kind: 'expense',
  color: '#000000',
  icon: 'shopping-cart',
  archived: false,
  isSystem: false,
};

/** Builds `count` distinct expense categories (ids 1..count) so top-5/expand tests have >5 rows to work with. */
const buildExpenseCategories = (count: number): Category[] =>
  Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    name: `Category ${i + 1}`,
    kind: 'expense' as const,
    color: '#000000',
    icon: 'shopping-cart',
    archived: false,
    isSystem: false,
  }));

describe('CategoryBreakdownPanelComponent', () => {
  let fixture: ComponentFixture<CategoryBreakdownPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CategoryBreakdownPanelComponent],
      providers: [
        provideRouter([]),
        provideEchartsCore({ echarts }),
        {
          provide: CategoriesRepository,
          // Echoes back the fixture's own id so seeding several distinct categories in one test
          // doesn't collapse them onto whatever a fixed mocked id would return.
          useValue: { add: vi.fn((category: Category) => Promise.resolve(category.id)) },
        },
      ],
    }).compileComponents();

    TestBed.inject(RangeStore).setCustomRange('2026-07-01', '2026-07-31');

    fixture = TestBed.createComponent(CategoryBreakdownPanelComponent);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('shows an empty state for both columns when there is no data for the range', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No expense data for this range.');
    expect(fixture.nativeElement.textContent).toContain('No income data for this range.');
  });

  it("reuses the entry's formattedTotal in the pie tooltip instead of reformatting total (TICKET-STAT-12)", async () => {
    await TestBed.inject(CategoriesStore).addCategory(groceries);
    TestBed.inject(TransactionsStore).addMany([
      {
        id: 1,
        accountId: 1,
        bookingDate: '2026-07-05',
        amount: -1234.5600000000002,
        currency: 'EUR',
        rawDescription: 'Supermarket',
        fingerprint: 'fp-1',
        createdAt: '2026-07-05T00:00:00.000Z',
        categoryId: 1,
      },
    ]);
    fixture.detectChanges();

    const expenseColumn = fixture.componentInstance['columns']().find((c) => c.kind === 'expense')!;
    const tooltip = expenseColumn.chartOption['tooltip'] as {
      formatter: (params: unknown) => string;
    };
    const series = expenseColumn.chartOption['series'] as {
      data: { name: string; formattedTotal: string }[];
    }[];
    const groceriesSlice = series[0].data.find((d) => d.name === 'Groceries')!;

    const result = tooltip.formatter({
      marker: '●',
      name: groceriesSlice.name,
      data: groceriesSlice,
    });

    expect(result).toBe(`●Groceries: ${groceriesSlice.formattedTotal}`);
    expect(groceriesSlice.formattedTotal).toBe('€1,234.56');
  });

  describe('side-by-side columns (TICKET-STAT-13)', () => {
    it('renders both columns simultaneously with independent data, no toggle required', () => {
      TestBed.inject(TransactionsStore).addMany([
        {
          id: 1,
          accountId: 1,
          bookingDate: '2026-07-05',
          amount: -25,
          currency: 'EUR',
          rawDescription: 'Unknown shop',
          fingerprint: 'fp-1',
          createdAt: '2026-07-05T00:00:00.000Z',
        },
        {
          id: 2,
          accountId: 1,
          bookingDate: '2026-07-06',
          amount: 1000,
          currency: 'EUR',
          rawDescription: 'Salary',
          fingerprint: 'fp-2',
          createdAt: '2026-07-06T00:00:00.000Z',
        },
      ]);
      fixture.detectChanges();

      const [expenseColumn, incomeColumn] = fixture.componentInstance['columns']();
      expect(expenseColumn.entries.length).toBe(1);
      expect(incomeColumn.entries.length).toBe(1);
    });

    it('shows its own empty state for one column while the other renders normally', () => {
      TestBed.inject(TransactionsStore).addMany([
        {
          id: 1,
          accountId: 1,
          bookingDate: '2026-07-05',
          amount: 1000,
          currency: 'EUR',
          rawDescription: 'Salary',
          fingerprint: 'fp-1',
          createdAt: '2026-07-05T00:00:00.000Z',
        },
      ]);
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toContain('No expense data for this range.');
      expect(fixture.nativeElement.textContent).not.toContain('No income data for this range.');
    });

    it('defaults each column to top-5 with a remaining-count toggle label, and expanding one column does not affect the other', async () => {
      const categories = buildExpenseCategories(7);
      for (const category of categories) {
        await TestBed.inject(CategoriesStore).addCategory(category);
      }
      TestBed.inject(TransactionsStore).addMany(
        categories.map((category, i) => ({
          id: i + 1,
          accountId: 1,
          bookingDate: '2026-07-05',
          amount: -(100 + i),
          currency: 'EUR',
          rawDescription: `Purchase ${i + 1}`,
          fingerprint: `fp-${i + 1}`,
          createdAt: '2026-07-05T00:00:00.000Z',
          categoryId: category.id,
        })),
      );
      TestBed.inject(TransactionsStore).addMany([
        {
          id: 100,
          accountId: 1,
          bookingDate: '2026-07-06',
          amount: 1000,
          currency: 'EUR',
          rawDescription: 'Salary',
          fingerprint: 'fp-salary',
          createdAt: '2026-07-06T00:00:00.000Z',
        },
      ]);
      fixture.detectChanges();

      let [expenseColumn, incomeColumn] = fixture.componentInstance['columns']();
      expect(expenseColumn.visibleEntries.length).toBe(5);
      expect(expenseColumn.remainingCount).toBe(2);
      expect(expenseColumn.toggleLabel).toBe('Show more (2)');
      expect(incomeColumn.visibleEntries.length).toBe(1);

      // `columns` is a plain computed signal — toggling recomputes it on next read, no
      // change detection pass (and thus no extra echarts repaint) needed.
      fixture.componentInstance['toggleColumn']('expense');

      [expenseColumn, incomeColumn] = fixture.componentInstance['columns']();
      expect(expenseColumn.visibleEntries.length).toBe(7);
      expect(expenseColumn.expanded).toBe(true);
      expect(expenseColumn.toggleLabel).toBe('Show less');
      // Expanding expense must not expand or otherwise change income's row count.
      expect(incomeColumn.visibleEntries.length).toBe(1);
      expect(incomeColumn.expanded).toBe(false);
    });

    it('collapses expanded columns back to top-5 when the selected range changes', async () => {
      const categories = buildExpenseCategories(7);
      for (const category of categories) {
        await TestBed.inject(CategoriesStore).addCategory(category);
      }
      TestBed.inject(TransactionsStore).addMany(
        categories.map((category, i) => ({
          id: i + 1,
          accountId: 1,
          bookingDate: '2026-07-05',
          amount: -(100 + i),
          currency: 'EUR',
          rawDescription: `Purchase ${i + 1}`,
          fingerprint: `fp-${i + 1}`,
          createdAt: '2026-07-05T00:00:00.000Z',
          categoryId: category.id,
        })),
      );
      fixture.detectChanges();

      fixture.componentInstance['toggleColumn']('expense');
      expect(fixture.componentInstance['columns']()[0].expanded).toBe(true);

      // `expandedColumns` is a `linkedSignal` sourced from the range — its reset recomputes
      // lazily on next read, synchronously, no change-detection flush needed.
      TestBed.inject(RangeStore).setCustomRange('2026-08-01', '2026-08-31');

      expect(fixture.componentInstance['columns']()[0].expanded).toBe(false);
      expect(fixture.componentInstance['columns']()[0].visibleEntries.length).toBeLessThanOrEqual(
        5,
      );
    });
  });

  describe('uncategorised spend callout (TICKET-STAT-09)', () => {
    it('shows the €/%/count callout under the expense column when some spend is uncategorised', async () => {
      await TestBed.inject(CategoriesStore).addCategory(groceries);
      TestBed.inject(TransactionsStore).addMany([
        {
          id: 1,
          accountId: 1,
          bookingDate: '2026-07-05',
          amount: -75,
          currency: 'EUR',
          rawDescription: 'Supermarket',
          fingerprint: 'fp-1',
          createdAt: '2026-07-05T00:00:00.000Z',
          categoryId: 1,
        },
        {
          id: 2,
          accountId: 1,
          bookingDate: '2026-07-06',
          amount: -25,
          currency: 'EUR',
          rawDescription: 'Unknown shop',
          fingerprint: 'fp-2',
          createdAt: '2026-07-06T00:00:00.000Z',
        },
      ]);

      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toContain(
        '€25.00 uncategorised (25% of expense, 1 transaction)',
      );
    });

    it('hides the callout when the uncategorised total is zero', async () => {
      await TestBed.inject(CategoriesStore).addCategory(groceries);
      TestBed.inject(TransactionsStore).addMany([
        {
          id: 1,
          accountId: 1,
          bookingDate: '2026-07-05',
          amount: -75,
          currency: 'EUR',
          rawDescription: 'Supermarket',
          fingerprint: 'fp-1',
          createdAt: '2026-07-05T00:00:00.000Z',
          categoryId: 1,
        },
      ]);

      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).not.toContain('uncategorised');
    });
  });
});
