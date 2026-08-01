import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import {
  AccountsRepository,
  AppSettingsRepository,
  CategoriesRepository,
  TransactionsRepository,
  type AppSettings,
  type Category,
} from '@/core/data-access';
import { AccountsStore, AppSettingsStore, CategoriesStore, TransactionsStore } from '@/core/state';
import {
  DEFAULT_CURRENCY_SYMBOL,
  DEFAULT_CURRENCY_SYMBOL_POSITION,
  DEFAULT_LOCALE,
  syncFormatSettings,
} from '@/shared/utils';
import { IncomeSettingsComponent } from './income-settings.component';

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

describe('IncomeSettingsComponent (FR-INC-3/4/12, TICKET-INC-04)', () => {
  const accountsRepository = { getAll: vi.fn() };
  const categoriesRepository = { getAll: vi.fn() };
  const transactionsRepository = { getAll: vi.fn() };
  const appSettingsRepository = {
    get: vi.fn(),
    setExcludedIncomeCategoryIds: vi.fn(),
    setSmoothedBonusCategoryIds: vi.fn(),
    setCareerStartDate: vi.fn(),
  };

  let fixture: ComponentFixture<IncomeSettingsComponent>;

  const setup = async (
    categories: Category[],
    settings: Partial<AppSettings> = {},
  ): Promise<void> => {
    accountsRepository.getAll.mockResolvedValue([]);
    categoriesRepository.getAll.mockResolvedValue(categories);
    transactionsRepository.getAll.mockResolvedValue([]);
    appSettingsRepository.get.mockResolvedValue({ id: 1, ...settings } as AppSettings);
    appSettingsRepository.setExcludedIncomeCategoryIds.mockResolvedValue(1);
    appSettingsRepository.setSmoothedBonusCategoryIds.mockResolvedValue(1);
    appSettingsRepository.setCareerStartDate.mockResolvedValue(1);

    await TestBed.configureTestingModule({
      imports: [IncomeSettingsComponent],
      providers: [
        { provide: AccountsRepository, useValue: accountsRepository },
        { provide: CategoriesRepository, useValue: categoriesRepository },
        { provide: TransactionsRepository, useValue: transactionsRepository },
        { provide: AppSettingsRepository, useValue: appSettingsRepository },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(IncomeSettingsComponent);
    await Promise.all([
      TestBed.inject(AccountsStore).hydrate(),
      TestBed.inject(CategoriesStore).hydrate(),
      TestBed.inject(TransactionsStore).hydrate(),
      TestBed.inject(AppSettingsStore).hydrate(),
    ]);
    fixture.detectChanges();
  };

  /** The checklists in render order: [0] income categories, [1] annual lump sums. */
  const checklists = (): HTMLElement[] => [
    ...fixture.nativeElement.querySelectorAll('app-income-category-checklist'),
  ];

  const checkboxesIn = (index: number): HTMLInputElement[] => [
    ...checklists()[index].querySelectorAll<HTMLInputElement>('input[type="checkbox"]'),
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Hydrating `AppSettingsStore` fires its `syncFormatSettings` effect, and those are
  // process-global module signals (Vitest runs with isolate:false) — reset them so specs that
  // assume the default symbol/locale don't depend on this file's run order.
  afterEach(() => {
    syncFormatSettings({
      currencySymbol: DEFAULT_CURRENCY_SYMBOL,
      currencySymbolPosition: DEFAULT_CURRENCY_SYMBOL_POSITION,
      locale: DEFAULT_LOCALE,
    });
  });

  it('hosts all three settings sections behind one trigger', async () => {
    await setup([category(1, 'Salary', 'income')]);

    expect(fixture.nativeElement.querySelector('app-income-career-start')).not.toBeNull();
    expect(checklists()).toHaveLength(2);
    expect(fixture.nativeElement.textContent).toContain('Income categories');
    expect(fixture.nativeElement.textContent).toContain('Annual lump sums');
  });

  it('lists one checked row per active income category, and no expense/neutral ones', async () => {
    await setup([
      category(1, 'Salary', 'income'),
      category(2, 'Groceries', 'expense'),
      category(3, 'Partner contribution', 'neutral'),
      category(4, 'Other Income', 'income'),
    ]);

    expect(checkboxesIn(0)).toHaveLength(2);
    expect(checkboxesIn(0).every((input) => input.checked)).toBe(true);
    expect(fixture.nativeElement.textContent).not.toContain('Groceries');
  });

  it('leaves an excluded category unchecked and reflects the count on the trigger', async () => {
    await setup([category(1, 'Salary', 'income'), category(2, 'Other Income', 'income')], {
      excludedIncomeCategoryIds: [2],
    });

    expect(checkboxesIn(0).map((input) => input.checked)).toEqual([true, false]);
    expect(fixture.nativeElement.textContent).toContain('1/2');
  });

  it('omits archived income categories, consistent with every other picker in the app', async () => {
    await setup([
      category(1, 'Salary', 'income'),
      category(2, 'Old side gig', 'income', { archived: true }),
    ]);

    expect(checkboxesIn(0)).toHaveLength(1);
    expect(fixture.nativeElement.textContent).not.toContain('Old side gig');
  });

  it('unchecking an income category persists the exclusion through the store', async () => {
    await setup([category(1, 'Salary', 'income'), category(2, 'Other Income', 'income')]);

    checkboxesIn(0)[1].dispatchEvent(new Event('change'));
    await fixture.whenStable();

    expect(appSettingsRepository.setExcludedIncomeCategoryIds).toHaveBeenCalledExactlyOnceWith([2]);
  });

  it('offers only the counted categories for smoothing', async () => {
    await setup([category(1, 'Salary', 'income'), category(2, 'Holiday bonus', 'income')], {
      excludedIncomeCategoryIds: [2],
    });

    expect(checkboxesIn(1)).toHaveLength(1);
    expect(checklists()[1].textContent).toContain('Salary');
    expect(checklists()[1].textContent).not.toContain('Holiday bonus');
  });

  it('starts with nothing marked for smoothing', async () => {
    await setup([category(1, 'Salary', 'income'), category(2, 'Holiday bonus', 'income')]);

    expect(checkboxesIn(1).some((input) => input.checked)).toBe(false);
  });

  it('marking a category for smoothing persists it through the store', async () => {
    await setup([category(1, 'Salary', 'income'), category(2, 'Holiday bonus', 'income')]);

    checkboxesIn(1)[1].dispatchEvent(new Event('change'));
    await fixture.whenStable();

    expect(appSettingsRepository.setSmoothedBonusCategoryIds).toHaveBeenCalledExactlyOnceWith([2]);
  });

  it('reflects an already-marked category as checked', async () => {
    await setup([category(1, 'Salary', 'income'), category(2, 'Holiday bonus', 'income')], {
      smoothedBonusCategoryIds: [2],
    });

    expect(checkboxesIn(1).map((input) => input.checked)).toEqual([false, true]);
  });

  it('explains an empty checklist rather than showing a blank section', async () => {
    await setup([category(1, 'Groceries', 'expense')]);

    expect(checkboxesIn(0)).toHaveLength(0);
    expect(fixture.nativeElement.textContent).toContain('no income categories yet');
  });
});
