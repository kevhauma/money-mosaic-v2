import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import {
  AccountsRepository,
  AppSettingsRepository,
  CategoriesRepository,
  SalaryMetadataRepository,
  TransactionsRepository,
  type AppSettings,
  type Category,
} from '@/core/data-access';
import { AccountsStore, AppSettingsStore, CategoriesStore, TransactionsStore } from '@/core/state';
import { withCleanFormatSettings } from '@/shared/utils/format-settings.testing';
import { IncomeMainCategoryComponent } from './income-main-category.component';

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

describe('IncomeMainCategoryComponent (TICKET-INC-19)', () => {
  // Hydrating `AppSettingsStore` fires its `syncFormatSettings` effect, and those are
  // process-global module signals (Vitest runs with isolate:false).
  withCleanFormatSettings();

  const accountsRepository = { getAll: vi.fn() };
  const categoriesRepository = { getAll: vi.fn() };
  const transactionsRepository = { getAll: vi.fn() };
  const salaryMetadataRepository = { getAll: vi.fn(), upsert: vi.fn(), remove: vi.fn() };
  const appSettingsRepository = { get: vi.fn(), setMainIncomeCategoryId: vi.fn() };

  let fixture: ComponentFixture<IncomeMainCategoryComponent>;

  const setup = async (
    categories: Category[],
    settings: Partial<AppSettings> = {},
  ): Promise<void> => {
    accountsRepository.getAll.mockResolvedValue([]);
    categoriesRepository.getAll.mockResolvedValue(categories);
    transactionsRepository.getAll.mockResolvedValue([]);
    salaryMetadataRepository.getAll.mockResolvedValue([]);
    appSettingsRepository.get.mockResolvedValue({ id: 1, ...settings } as AppSettings);
    appSettingsRepository.setMainIncomeCategoryId.mockResolvedValue(1);

    await TestBed.configureTestingModule({
      imports: [IncomeMainCategoryComponent],
      providers: [
        { provide: AccountsRepository, useValue: accountsRepository },
        { provide: CategoriesRepository, useValue: categoriesRepository },
        { provide: TransactionsRepository, useValue: transactionsRepository },
        { provide: SalaryMetadataRepository, useValue: salaryMetadataRepository },
        { provide: AppSettingsRepository, useValue: appSettingsRepository },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(IncomeMainCategoryComponent);
    await Promise.all([
      TestBed.inject(AccountsStore).hydrate(),
      TestBed.inject(CategoriesStore).hydrate(),
      TestBed.inject(TransactionsStore).hydrate(),
      TestBed.inject(AppSettingsStore).hydrate(),
    ]);
    fixture.detectChanges();
  };

  /** Every radio in render order: [0] is always "No main category", then one per counted category. */
  const radios = (): HTMLInputElement[] => [
    ...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLInputElement>(
      'input[type="radio"]',
    ),
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists every counted income category plus the "no main category" option', async () => {
    await setup([
      category(1, 'Salary', 'income'),
      category(2, 'Freelance', 'income'),
      category(3, 'Groceries', 'expense'),
    ]);

    expect(radios()).toHaveLength(3);
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('No main category — split proportionally');
    expect(text).toContain('Salary');
    expect(text).toContain('Freelance');
    expect(text).not.toContain('Groceries');
  });

  it('offers only the categories that count toward growth (FR-INC-3)', async () => {
    // Excluding a category leaves it with no series, so there would be nothing to subtract from.
    await setup([category(1, 'Salary', 'income'), category(2, 'Freelance', 'income')], {
      excludedIncomeCategoryIds: [2],
    });

    expect(radios()).toHaveLength(2);
    expect(fixture.nativeElement.textContent).not.toContain('Freelance');
  });

  it('omits archived income categories, consistent with every other picker in the app', async () => {
    await setup([
      category(1, 'Salary', 'income'),
      category(2, 'Old side gig', 'income', { archived: true }),
    ]);

    expect(radios()).toHaveLength(2);
    expect(fixture.nativeElement.textContent).not.toContain('Old side gig');
  });

  it('defaults to "no main category", which is the pro-rata split', async () => {
    await setup([category(1, 'Salary', 'income'), category(2, 'Freelance', 'income')]);

    expect(radios().map((radio) => radio.checked)).toEqual([true, false, false]);
  });

  it('marks the stored category as selected', async () => {
    await setup([category(1, 'Salary', 'income'), category(2, 'Freelance', 'income')], {
      mainIncomeCategoryId: 2,
    });

    expect(radios().map((radio) => radio.checked)).toEqual([false, false, true]);
  });

  it('persists the picked category through the store', async () => {
    await setup([category(1, 'Salary', 'income'), category(2, 'Freelance', 'income')]);

    radios()[1].dispatchEvent(new Event('change'));
    await fixture.whenStable();

    expect(appSettingsRepository.setMainIncomeCategoryId).toHaveBeenCalledExactlyOnceWith(1);
  });

  it('persists a clear when "no main category" is picked back', async () => {
    await setup([category(1, 'Salary', 'income'), category(2, 'Freelance', 'income')], {
      mainIncomeCategoryId: 1,
    });

    radios()[0].dispatchEvent(new Event('change'));
    await fixture.whenStable();

    expect(appSettingsRepository.setMainIncomeCategoryId).toHaveBeenCalledExactlyOnceWith(
      undefined,
    );
  });

  it('explains why nothing is offered when no income category is counted', async () => {
    await setup([category(1, 'Groceries', 'expense')]);

    expect(radios()).toHaveLength(1);
    expect(fixture.nativeElement.textContent).toContain('no income category is counted right now');
  });
});
