import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
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
import { IncomeSettingsPageComponent } from './income-settings-page.component';

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

describe('IncomeSettingsPageComponent (FR-INC-3/4/12, TICKET-INC-04, TICKET-INC-18)', () => {
  const accountsRepository = { getAll: vi.fn() };
  const categoriesRepository = { getAll: vi.fn() };
  const transactionsRepository = { getAll: vi.fn() };
  const appSettingsRepository = {
    get: vi.fn(),
    setExcludedIncomeCategoryIds: vi.fn(),
    setSmoothedBonusCategoryIds: vi.fn(),
    setCareerStartDate: vi.fn(),
  };

  let fixture: ComponentFixture<IncomeSettingsPageComponent>;

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
      imports: [IncomeSettingsPageComponent],
      providers: [
        // A page since TICKET-INC-18, so its back link needs a router.
        provideRouter([]),
        { provide: AccountsRepository, useValue: accountsRepository },
        { provide: CategoriesRepository, useValue: categoriesRepository },
        { provide: TransactionsRepository, useValue: transactionsRepository },
        { provide: AppSettingsRepository, useValue: appSettingsRepository },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(IncomeSettingsPageComponent);
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

  it('hosts every settings section on one page', async () => {
    await setup([category(1, 'Salary', 'income')]);

    expect(fixture.nativeElement.querySelector('app-income-career-start')).not.toBeNull();
    expect(checklists()).toHaveLength(2);
    expect(fixture.nativeElement.textContent).toContain('Income categories');
    expect(fixture.nativeElement.textContent).toContain('Annual lump sums');
    // TICKET-SET-08 — the gross-series color lives here too, beside the other page-level choices.
    expect(fixture.nativeElement.querySelector('app-income-gross-color')).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Chart colours');
  });

  describe('as a page (TICKET-INC-18)', () => {
    it('is a real page with a header and a way back, not an overlay', async () => {
      await setup([category(1, 'Salary', 'income')]);

      expect(fixture.nativeElement.querySelector('mm-page-header')).not.toBeNull();
      expect(fixture.nativeElement.querySelector('mm-dropdown')).toBeNull();
      expect(fixture.nativeElement.querySelector('a[href="/income"]')?.textContent).toContain(
        'Back to income',
      );
    });

    it('gives each section room to say what it changes and which panels it changes', async () => {
      await setup([category(1, 'Salary', 'income')]);

      const text = fixture.nativeElement.textContent as string;

      // Asserted so a later refactor can't quietly drop the explanations back to one-line hints,
      // which is the whole reason these controls became a page.
      expect(text).toContain('Every panel on the Income page reads from here');
      expect(text).toContain('removes it from every figure on the page at once');
      expect(text).toContain('spreads each year’s total evenly across that year’s months');
      expect(text).toContain('it changes no figure anywhere');
    });

    it('spells out both ways to record an annual lump sum, beside the control itself', async () => {
      await setup([category(1, 'Salary', 'income')]);

      const text = fixture.nativeElement.textContent as string;

      // The same two routes the getting-started guide's third step gives. Repeated here on purpose:
      // a first-timer looks for their bonus category, doesn't have one because payroll bundles it
      // into the salary deposit, and concludes the feature doesn't apply to them.
      expect(text).toContain('There are two ways to record one');
      expect(text).toContain('its own transaction, in its own category');
      expect(text).toContain('Tick that category in the list below');
      expect(text).toContain('paid inside your regular salary deposit');
      expect(text).toContain('type the bonus part into its Bonus column');
      expect(text).toContain('Both do the same thing to the charts');
    });

    it('shows the onboarding hand-off banner only when arrived from the intro (TICKET-PUB-08)', async () => {
      await setup([category(1, 'Salary', 'income')]);

      expect(fixture.nativeElement.querySelector('mm-alert')).toBeNull();

      fixture.componentRef.setInput('from', 'setup');
      fixture.detectChanges();

      const banner = fixture.nativeElement.querySelector('mm-alert') as HTMLElement;
      expect(banner).not.toBeNull();
      expect(banner.textContent).toContain('Work down the page');
      expect(banner.querySelector('a[href="/income"]')?.textContent).toContain('Back to Income');
    });

    it('keeps a one-line hint on each control alongside the section copy', async () => {
      await setup([category(1, 'Salary', 'income')]);

      const hints = [...fixture.nativeElement.querySelectorAll('mm-label')].map(
        (label) => (label as HTMLElement).textContent ?? '',
      );

      expect(
        hints.some((hint) => hint.includes('Tick the categories that make up your income')),
      ).toBe(true);
      expect(hints.some((hint) => hint.includes('pays out once a year'))).toBe(true);
    });
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
