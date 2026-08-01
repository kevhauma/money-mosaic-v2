import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import {
  AccountsRepository,
  AppSettingsRepository,
  CategoriesRepository,
  SalaryMetadataRepository,
  TransactionsRepository,
  type Account,
  type AppSettings,
  type SalaryMetadata,
} from '@/core/data-access';
import { AccountsStore, AppSettingsStore, CategoriesStore, TransactionsStore } from '@/core/state';
import {
  DEFAULT_CURRENCY_SYMBOL,
  DEFAULT_CURRENCY_SYMBOL_POSITION,
  DEFAULT_LOCALE,
  syncFormatSettings,
} from '@/shared/utils';
import { IncomeStore } from '../../income.store';
import { BONUS_COLUMN_HINT, SalaryMetadataTableComponent } from './salary-metadata-table.component';

describe('SalaryMetadataTableComponent (FR-INC-10, TICKET-INC-10)', () => {
  const accountsRepository = { getAll: vi.fn() };
  const categoriesRepository = { getAll: vi.fn() };
  const transactionsRepository = { getAll: vi.fn() };
  const appSettingsRepository = { get: vi.fn() };
  const salaryMetadataRepository = { getAll: vi.fn(), upsert: vi.fn(), remove: vi.fn() };

  let fixture: ComponentFixture<SalaryMetadataTableComponent>;

  /** History runs from 2025-01, so the table spans 2025 and 2026 up to the pinned clock. */
  const account: Account = {
    id: 1,
    name: 'Checking',
    type: 'checking',
    currency: 'EUR',
    openingBalance: 0,
    openingBalanceDate: '2025-01-01',
    color: '#000000',
    icon: 'wallet',
    archived: false,
  };

  const setup = async (
    salaryMetadata: SalaryMetadata[] = [],
    focusMonth?: string,
  ): Promise<void> => {
    accountsRepository.getAll.mockResolvedValue([account]);
    categoriesRepository.getAll.mockResolvedValue([]);
    transactionsRepository.getAll.mockResolvedValue([]);
    appSettingsRepository.get.mockResolvedValue({ id: 1 } as AppSettings);
    salaryMetadataRepository.getAll.mockResolvedValue(salaryMetadata);
    salaryMetadataRepository.upsert.mockResolvedValue(1);
    salaryMetadataRepository.remove.mockResolvedValue(undefined);

    await TestBed.configureTestingModule({
      imports: [SalaryMetadataTableComponent],
      providers: [
        { provide: AccountsRepository, useValue: accountsRepository },
        { provide: CategoriesRepository, useValue: categoriesRepository },
        { provide: TransactionsRepository, useValue: transactionsRepository },
        { provide: AppSettingsRepository, useValue: appSettingsRepository },
        { provide: SalaryMetadataRepository, useValue: salaryMetadataRepository },
      ],
    }).compileComponents();

    // Every store must be hydrated *before* the component is created: it snapshots the store's
    // values in its constructor rather than syncing them (see the component's class doc).
    await Promise.all([
      TestBed.inject(AccountsStore).hydrate(),
      TestBed.inject(CategoriesStore).hydrate(),
      TestBed.inject(TransactionsStore).hydrate(),
      TestBed.inject(AppSettingsStore).hydrate(),
      TestBed.inject(IncomeStore).hydrate(),
    ]);

    fixture = TestBed.createComponent(SalaryMetadataTableComponent);
    if (focusMonth !== undefined) fixture.componentRef.setInput('focusMonth', focusMonth);
    fixture.detectChanges();
    await fixture.whenStable();
  };

  /** The `mm-collapse` panels' own root `<div>` — `collapse-open` lives there, not on the host element. */
  const sections = (): HTMLElement[] =>
    [...fixture.nativeElement.querySelectorAll('mm-collapse > div')].map(
      (node) => node as HTMLElement,
    );

  const rowsIn = (sectionIndex: number): HTMLElement[] => [
    ...sections()[sectionIndex].querySelectorAll<HTMLElement>('tbody tr'),
  ];

  /** `[grossWage, bonus]` inputs of the row for `yearMonth`. */
  const cellsFor = (yearMonth: string): HTMLInputElement[] =>
    [...fixture.nativeElement.querySelectorAll(`[data-month="${yearMonth}"] input`)].map(
      (input) => input as HTMLInputElement,
    );

  const typeInto = async (input: HTMLInputElement, value: string): Promise<void> => {
    input.value = value;
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('blur'));
    await fixture.whenStable();
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-03-12T00:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    syncFormatSettings({
      currencySymbol: DEFAULT_CURRENCY_SYMBOL,
      currencySymbolPosition: DEFAULT_CURRENCY_SYMBOL_POSITION,
      locale: DEFAULT_LOCALE,
    });
  });

  it('renders one collapsible section per year, newest first', async () => {
    await setup();

    expect(sections()).toHaveLength(2);
    expect(sections()[0].textContent).toContain('2026');
    expect(sections()[1].textContent).toContain('2025');
  });

  it('renders one row per month in range, each labelled with its month and year', async () => {
    await setup();

    // 2026 runs January–March on the pinned clock; 2025 is a full twelve.
    expect(rowsIn(0)).toHaveLength(3);
    expect(rowsIn(1)).toHaveLength(12);
    expect(rowsIn(0)[0].textContent).toContain('January 2026');
  });

  it('expands the current year and leaves every other year collapsed', async () => {
    await setup();

    expect(sections()[0].className).toContain('collapse-open');
    expect(sections()[1].className).not.toContain('collapse-open');
  });

  it('renders editable rows for a year with no stored entries at all', async () => {
    await setup();

    const cells = cellsFor('2025-06');
    expect(cells).toHaveLength(2);
    expect(cells.every((cell) => cell.value === '')).toBe(true);
  });

  it('fills a row from its stored entry', async () => {
    await setup([{ id: 1, yearMonth: '2026-02', grossWage: 3500, bonus: 900 }]);

    expect(cellsFor('2026-02').map((cell) => cell.value)).toEqual(['3500', '900']);
  });

  it('pins the header row so it stays visible while the body scrolls', async () => {
    await setup();

    const head = fixture.nativeElement.querySelector('thead');
    expect(head.className).toContain('sticky');
    // Sticky without an opaque background shows the scrolled rows straight through it.
    expect(head.className).toContain('bg-base-100');
  });

  it('explains the bonus column, including that it is subtracted before the ratio', async () => {
    await setup();

    const icon = fixture.nativeElement.querySelector('thead ng-icon');
    expect(icon.getAttribute('title')).toBe(BONUS_COLUMN_HINT);
    expect(icon.getAttribute('title')).toContain('Subtracted from your net income');
  });

  describe('persisting on blur', () => {
    it('writes the month once a cell is edited and blurred', async () => {
      await setup();

      await typeInto(cellsFor('2026-02')[0], '3500');

      expect(salaryMetadataRepository.upsert).toHaveBeenCalledExactlyOnceWith({
        yearMonth: '2026-02',
        grossWage: 3500,
        bonus: undefined,
      });
    });

    it('writes nothing when an untouched cell is blurred', async () => {
      await setup();

      cellsFor('2026-02')[0].dispatchEvent(new Event('blur'));
      await fixture.whenStable();

      expect(salaryMetadataRepository.upsert).not.toHaveBeenCalled();
      expect(salaryMetadataRepository.remove).not.toHaveBeenCalled();
    });

    it('writes nothing when a cell is blurred back at its stored value', async () => {
      await setup([{ id: 1, yearMonth: '2026-02', grossWage: 3500 }]);

      cellsFor('2026-02')[0].dispatchEvent(new Event('blur'));
      await fixture.whenStable();

      expect(salaryMetadataRepository.upsert).not.toHaveBeenCalled();
    });

    it('carries the other cell along, so editing one never drops the other', async () => {
      await setup([{ id: 1, yearMonth: '2026-02', grossWage: 3500, bonus: 900 }]);

      await typeInto(cellsFor('2026-02')[0], '3800');

      expect(salaryMetadataRepository.upsert).toHaveBeenCalledExactlyOnceWith({
        id: 1,
        yearMonth: '2026-02',
        grossWage: 3800,
        bonus: 900,
      });
    });

    it('removes the row when both cells are cleared, rather than persisting zeros', async () => {
      await setup([{ id: 4, yearMonth: '2026-02', grossWage: 3500 }]);

      await typeInto(cellsFor('2026-02')[0], '');

      expect(salaryMetadataRepository.remove).toHaveBeenCalledExactlyOnceWith(4);
      expect(salaryMetadataRepository.upsert).not.toHaveBeenCalled();
    });
  });

  describe('arriving from a chart click', () => {
    it('expands the clicked month’s year instead of the current one', async () => {
      await setup([], '2025-06');

      expect(sections()[0].className).not.toContain('collapse-open');
      expect(sections()[1].className).toContain('collapse-open');
    });

    it('focuses that month’s gross-wage cell', async () => {
      await setup([], '2025-06');

      expect(document.activeElement).toBe(cellsFor('2025-06')[0]);
    });

    it('leaves the current year expanded and nothing focused without a target month', async () => {
      await setup();

      expect(sections()[0].className).toContain('collapse-open');
      expect(document.activeElement?.tagName).not.toBe('INPUT');
    });
  });
});
