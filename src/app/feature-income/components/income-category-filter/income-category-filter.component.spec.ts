import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import {
  AppSettingsRepository,
  CategoriesRepository,
  type AppSettings,
  type Category,
} from '@/core/data-access';
import { AppSettingsStore, CategoriesStore } from '@/core/state';
import {
  DEFAULT_CURRENCY_SYMBOL,
  DEFAULT_CURRENCY_SYMBOL_POSITION,
  DEFAULT_LOCALE,
  syncFormatSettings,
} from '@/shared/utils';
import { IncomeCategoryFilterComponent } from './income-category-filter.component';

const category = (
  id: number,
  name: string,
  kind: Category['kind'],
  overrides: Partial<Category> = {},
): Category => ({
  id,
  name,
  kind,
  color: '#34d399',
  icon: 'tablerCash',
  archived: false,
  isSystem: false,
  sortOrder: id,
  ...overrides,
});

describe('IncomeCategoryFilterComponent (FR-INC-3, TICKET-INC-03)', () => {
  const categoriesRepository = { getAll: vi.fn() };
  const appSettingsRepository = { get: vi.fn(), setExcludedIncomeCategoryIds: vi.fn() };

  let fixture: ComponentFixture<IncomeCategoryFilterComponent>;

  const setup = async (
    categories: Category[],
    excludedIncomeCategoryIds?: number[],
  ): Promise<void> => {
    categoriesRepository.getAll.mockResolvedValue(categories);
    appSettingsRepository.get.mockResolvedValue({
      id: 1,
      excludedIncomeCategoryIds,
    } as AppSettings);
    appSettingsRepository.setExcludedIncomeCategoryIds.mockResolvedValue(1);

    await TestBed.configureTestingModule({
      imports: [IncomeCategoryFilterComponent],
      providers: [
        { provide: CategoriesRepository, useValue: categoriesRepository },
        { provide: AppSettingsRepository, useValue: appSettingsRepository },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(IncomeCategoryFilterComponent);
    await TestBed.inject(CategoriesStore).hydrate();
    await TestBed.inject(AppSettingsStore).hydrate();
    fixture.detectChanges();
  };

  const checkboxes = (): HTMLInputElement[] =>
    Array.from(fixture.nativeElement.querySelectorAll('input[type="checkbox"]'));

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Hydrating `AppSettingsStore` fires its `syncFormatSettings` effect, and those are
  // process-global module signals (Vitest runs with isolate:false) — reset them so specs that
  // assume the default symbol/locale don't depend on this file's run order (same guard as
  // `app-settings.store.spec.ts`).
  afterEach(() => {
    syncFormatSettings({
      currencySymbol: DEFAULT_CURRENCY_SYMBOL,
      currencySymbolPosition: DEFAULT_CURRENCY_SYMBOL_POSITION,
      locale: DEFAULT_LOCALE,
    });
  });

  it('renders one checked row per active income category, and no expense/neutral ones', async () => {
    await setup([
      category(1, 'Salary', 'income'),
      category(2, 'Groceries', 'expense'),
      category(3, 'Partner contribution', 'neutral'),
      category(4, 'Other Income', 'income'),
    ]);

    expect(checkboxes()).toHaveLength(2);
    expect(checkboxes().every((input) => input.checked)).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Salary');
    expect(fixture.nativeElement.textContent).toContain('Other Income');
    expect(fixture.nativeElement.textContent).not.toContain('Groceries');
  });

  it('leaves an excluded category unchecked and reflects the count in the trigger', async () => {
    await setup([category(1, 'Salary', 'income'), category(2, 'Other Income', 'income')], [2]);

    expect(checkboxes().map((input) => input.checked)).toEqual([true, false]);
    expect(fixture.nativeElement.textContent).toContain('1/2');
  });

  it('omits archived income categories, consistent with every other picker in the app', async () => {
    await setup([
      category(1, 'Salary', 'income'),
      category(2, 'Old side gig', 'income', { archived: true }),
    ]);

    expect(checkboxes()).toHaveLength(1);
    expect(fixture.nativeElement.textContent).not.toContain('Old side gig');
  });

  it('unchecking a row persists the exclusion through the store', async () => {
    await setup([category(1, 'Salary', 'income'), category(2, 'Other Income', 'income')]);

    checkboxes()[1].dispatchEvent(new Event('change'));
    await fixture.whenStable();

    expect(appSettingsRepository.setExcludedIncomeCategoryIds).toHaveBeenCalledExactlyOnceWith([2]);
  });

  it('renders nothing at all when the user has no income categories', async () => {
    await setup([category(1, 'Groceries', 'expense')]);

    expect(fixture.nativeElement.querySelector('mm-dropdown')).toBeNull();
  });
});
