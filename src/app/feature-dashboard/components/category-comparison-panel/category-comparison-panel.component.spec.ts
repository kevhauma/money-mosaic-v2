import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { appDb, CategoriesRepository, type Category } from '@/core/data-access';
import { RangeStore } from '@/core/stats';
import { CategoriesStore, TransactionsStore } from '@/core/state';
import { formatDisplayDate } from '@/shared/ui';
import { CategoryComparisonSettingsStore } from '../../category-comparison-settings.store';
import { CategoryComparisonPanelComponent } from './category-comparison-panel.component';

const groceries: Category = {
  id: 1,
  name: 'Groceries',
  kind: 'expense',
  color: '#ff0000',
  icon: 'shopping-cart',
  archived: false,
  isSystem: false,
};

describe('CategoryComparisonPanelComponent', () => {
  let fixture: ComponentFixture<CategoryComparisonPanelComponent>;

  beforeEach(async () => {
    // The panel's window is anchored to "today" — pin it so the test is deterministic regardless
    // of the real system clock (TICKET-STAT-04's anchor rule). Fakes only `Date`, not timers —
    // this app is zoneless, and `fixture.whenStable()` needs real timers to settle.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-07-12T12:00:00.000Z'));

    await TestBed.configureTestingModule({
      imports: [CategoryComparisonPanelComponent],
      providers: [
        provideRouter([]),
        { provide: CategoriesRepository, useValue: { add: vi.fn().mockResolvedValue(1) } },
      ],
    }).compileComponents();

    TestBed.inject(RangeStore).setCustomRange('2026-07-01', '2026-07-31');

    fixture = TestBed.createComponent(CategoryComparisonPanelComponent);
    await fixture.whenStable();
  });

  afterEach(async () => {
    vi.useRealTimers();
    // The "excluding categories" describe block below writes through the real
    // CategoryComparisonSettingsStore/repository to the shared `appDb` (fake-indexeddb is a
    // global singleton and Vitest runs with isolate:false), so leftover rows here leak into
    // other spec files unless cleared.
    await appDb.categoryComparisonSettings.clear();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('shows an empty state when fewer than 2 window periods have any activity', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain(
      'Not enough history yet to compare periods',
    );
  });

  it('renders the top category with drill-down-linked bars once 2+ periods have data', async () => {
    await TestBed.inject(CategoriesStore).addCategory(groceries);
    TestBed.inject(TransactionsStore).addMany([
      {
        id: 1,
        accountId: 1,
        bookingDate: '2026-06-10',
        amount: -40,
        currency: 'EUR',
        rawDescription: 'Supermarket',
        fingerprint: 'fp-1',
        createdAt: '2026-06-10T00:00:00.000Z',
        categoryId: 1,
      },
      {
        id: 2,
        accountId: 1,
        bookingDate: '2026-07-10',
        amount: -60,
        currency: 'EUR',
        rawDescription: 'Supermarket',
        fingerprint: 'fp-2',
        createdAt: '2026-07-10T00:00:00.000Z',
        categoryId: 1,
      },
    ]);

    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Groceries');
    expect(text).not.toContain('Not enough history yet');

    const link = fixture.nativeElement.querySelector('a[href*="categoryId=1"]');
    expect(link).toBeTruthy();
  });

  describe('bar tooltip period label', () => {
    it('shows "<Month> <year>" for a month-aligned window period', async () => {
      TestBed.inject(RangeStore).setPreset('this-month');
      await TestBed.inject(CategoriesStore).addCategory(groceries);
      TestBed.inject(TransactionsStore).addMany([
        {
          id: 1,
          accountId: 1,
          bookingDate: '2026-06-10',
          amount: -40,
          currency: 'EUR',
          rawDescription: 'Supermarket',
          fingerprint: 'fp-1',
          createdAt: '2026-06-10T00:00:00.000Z',
          categoryId: 1,
        },
        {
          id: 2,
          accountId: 1,
          bookingDate: '2026-07-10',
          amount: -60,
          currency: 'EUR',
          rawDescription: 'Supermarket',
          fingerprint: 'fp-2',
          createdAt: '2026-07-10T00:00:00.000Z',
          categoryId: 1,
        },
      ]);
      fixture.detectChanges();

      const selectedBar = fixture.nativeElement.querySelector('.bg-primary') as HTMLElement;
      const selectedAnchor = selectedBar.closest('a.tooltip') as HTMLElement;
      expect(selectedAnchor.getAttribute('data-tip')?.split('\n')[0]).toBe('July 2026');
    });

    it('shows "W<n> <year>" for a week-aligned window period', async () => {
      TestBed.inject(RangeStore).setPreset('this-week');
      await TestBed.inject(CategoriesStore).addCategory(groceries);
      TestBed.inject(TransactionsStore).addMany([
        {
          id: 1,
          accountId: 1,
          bookingDate: '2026-06-30',
          amount: -40,
          currency: 'EUR',
          rawDescription: 'Supermarket',
          fingerprint: 'fp-1',
          createdAt: '2026-06-30T00:00:00.000Z',
          categoryId: 1,
        },
        {
          id: 2,
          accountId: 1,
          bookingDate: '2026-07-10',
          amount: -60,
          currency: 'EUR',
          rawDescription: 'Supermarket',
          fingerprint: 'fp-2',
          createdAt: '2026-07-10T00:00:00.000Z',
          categoryId: 1,
        },
      ]);
      fixture.detectChanges();

      const selectedBar = fixture.nativeElement.querySelector('.bg-primary') as HTMLElement;
      const selectedAnchor = selectedBar.closest('a.tooltip') as HTMLElement;
      expect(selectedAnchor.getAttribute('data-tip')?.split('\n')[0]).toMatch(/^W\d+ 2026$/);
    });

    it('falls back to the formatted date range for a non-calendar-aligned (custom rolling) window period', async () => {
      TestBed.inject(RangeStore).setCustomRange('2026-06-15', '2026-06-24');
      await TestBed.inject(CategoriesStore).addCategory(groceries);
      TestBed.inject(TransactionsStore).addMany([
        {
          id: 1,
          accountId: 1,
          bookingDate: '2026-06-08',
          amount: -40,
          currency: 'EUR',
          rawDescription: 'Supermarket',
          fingerprint: 'fp-1',
          createdAt: '2026-06-08T00:00:00.000Z',
          categoryId: 1,
        },
        {
          id: 2,
          accountId: 1,
          bookingDate: '2026-06-20',
          amount: -60,
          currency: 'EUR',
          rawDescription: 'Supermarket',
          fingerprint: 'fp-2',
          createdAt: '2026-06-20T00:00:00.000Z',
          categoryId: 1,
        },
      ]);
      fixture.detectChanges();

      const selectedBar = fixture.nativeElement.querySelector('.bg-primary') as HTMLElement;
      const selectedAnchor = selectedBar.closest('a.tooltip') as HTMLElement;
      expect(selectedAnchor.getAttribute('data-tip')?.split('\n')[0]).toBe(
        `${formatDisplayDate('2026-06-15')} – ${formatDisplayDate('2026-06-24')}`,
      );
    });
  });

  it('hides the panel entirely for the all-time preset', () => {
    TestBed.inject(RangeStore).setPreset('all-time', { from: '2020-01-01', to: '2026-07-12' });

    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.card')).toBeNull();
  });

  describe('excluding categories', () => {
    it('lists active expense categories in the exclude checklist, unchecked by default', async () => {
      await TestBed.inject(CategoriesStore).addCategory(groceries);
      fixture.detectChanges();

      const label = [...fixture.nativeElement.querySelectorAll('.dropdown-content label')].find(
        (l: HTMLElement) => l.textContent?.includes('Groceries'),
      ) as HTMLElement | undefined;

      expect(label).toBeTruthy();
      const checkbox = label!.querySelector('input[type="checkbox"]') as HTMLInputElement;
      expect(checkbox.checked).toBe(false);
    });

    it('a checklist toggle calls through to the settings store with the toggled exclusion set', async () => {
      await TestBed.inject(CategoriesStore).addCategory(groceries);
      fixture.detectChanges();
      const settingsStore = TestBed.inject(CategoryComparisonSettingsStore);
      const setSpy = vi.spyOn(settingsStore, 'setExcludedCategoryIds').mockResolvedValue();

      const checkbox = fixture.nativeElement.querySelector(
        '.dropdown-content input[type="checkbox"]',
      ) as HTMLInputElement;
      checkbox.dispatchEvent(new Event('change'));

      expect(setSpy).toHaveBeenCalledExactlyOnceWith([1]);
    });

    it('drops an excluded category from the panel once the settings store reports it excluded', async () => {
      await TestBed.inject(CategoriesStore).addCategory(groceries);
      TestBed.inject(TransactionsStore).addMany([
        {
          id: 1,
          accountId: 1,
          bookingDate: '2026-06-10',
          amount: -40,
          currency: 'EUR',
          rawDescription: 'Supermarket',
          fingerprint: 'fp-1',
          createdAt: '2026-06-10T00:00:00.000Z',
          categoryId: 1,
        },
        {
          id: 2,
          accountId: 1,
          bookingDate: '2026-07-10',
          amount: -60,
          currency: 'EUR',
          rawDescription: 'Supermarket',
          fingerprint: 'fp-2',
          createdAt: '2026-07-10T00:00:00.000Z',
          categoryId: 1,
        },
      ]);
      fixture.detectChanges();
      const cardsGridBefore = fixture.nativeElement.querySelector('.mt-4.grid');
      expect(cardsGridBefore?.textContent ?? '').toContain('Groceries');

      await TestBed.inject(CategoryComparisonSettingsStore).setExcludedCategoryIds([1]);
      fixture.detectChanges();

      const cardsGridAfter = fixture.nativeElement.querySelector('.mt-4.grid');
      expect(cardsGridAfter?.textContent ?? '').not.toContain('Groceries');
    });
  });
});
