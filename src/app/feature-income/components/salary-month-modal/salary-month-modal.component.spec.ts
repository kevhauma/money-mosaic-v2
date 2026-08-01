import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
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
import { IncomeStore } from '../../income.store';
import { SalaryMonthModalComponent } from './salary-month-modal.component';

describe('SalaryMonthModalComponent (FR-INC-10, TICKET-INC-18)', () => {
  const accountsRepository = { getAll: vi.fn() };
  const categoriesRepository = { getAll: vi.fn() };
  const transactionsRepository = { getAll: vi.fn() };
  const appSettingsRepository = { get: vi.fn() };
  const salaryMetadataRepository = { getAll: vi.fn(), upsert: vi.fn(), remove: vi.fn() };

  let fixture: ComponentFixture<SalaryMonthModalComponent>;

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

  const setup = async (yearMonth: string, salaryMetadata: SalaryMetadata[] = []): Promise<void> => {
    accountsRepository.getAll.mockResolvedValue([account]);
    categoriesRepository.getAll.mockResolvedValue([]);
    transactionsRepository.getAll.mockResolvedValue([]);
    appSettingsRepository.get.mockResolvedValue({ id: 1 } as AppSettings);
    salaryMetadataRepository.getAll.mockResolvedValue(salaryMetadata);
    salaryMetadataRepository.upsert.mockResolvedValue(1);
    salaryMetadataRepository.remove.mockResolvedValue(undefined);

    await TestBed.configureTestingModule({
      imports: [SalaryMonthModalComponent],
      providers: [
        provideRouter([]),
        { provide: AccountsRepository, useValue: accountsRepository },
        { provide: CategoriesRepository, useValue: categoriesRepository },
        { provide: TransactionsRepository, useValue: transactionsRepository },
        { provide: AppSettingsRepository, useValue: appSettingsRepository },
        { provide: SalaryMetadataRepository, useValue: salaryMetadataRepository },
      ],
    }).compileComponents();

    // Hydrated before the component initialises: it snapshots the store's values in `ngOnInit`.
    await Promise.all([
      TestBed.inject(AccountsStore).hydrate(),
      TestBed.inject(CategoriesStore).hydrate(),
      TestBed.inject(TransactionsStore).hydrate(),
      TestBed.inject(AppSettingsStore).hydrate(),
      TestBed.inject(IncomeStore).hydrate(),
    ]);

    fixture = TestBed.createComponent(SalaryMonthModalComponent);
    fixture.componentRef.setInput('yearMonth', yearMonth);
    fixture.detectChanges();
    await fixture.whenStable();
  };

  /** `[grossWage, bonus]`. */
  const cells = (): HTMLInputElement[] =>
    [...fixture.nativeElement.querySelectorAll('input')].map((input) => input as HTMLInputElement);

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
  });

  it('shows the clicked month’s stored figures', async () => {
    await setup('2026-02', [{ id: 4, yearMonth: '2026-02', grossWage: 3500, bonus: 900 }]);

    expect(cells().map((cell) => cell.value)).toEqual(['3500', '900']);
  });

  it('shows empty fields for a month with no row yet', async () => {
    await setup('2026-02');

    expect(cells().map((cell) => cell.value)).toEqual(['', '']);
  });

  it('names the month it is editing, so the modal says which one it opened on', async () => {
    await setup('2026-02');

    expect(fixture.nativeElement.textContent).toContain('February 2026');
  });

  it('writes the month once a field is edited and blurred', async () => {
    await setup('2026-02');

    await typeInto(cells()[0], '3500');

    expect(salaryMetadataRepository.upsert).toHaveBeenCalledExactlyOnceWith({
      yearMonth: '2026-02',
      grossWage: 3500,
      bonus: undefined,
    });
  });

  it('writes nothing when an untouched field is blurred', async () => {
    await setup('2026-02');

    cells()[0].dispatchEvent(new Event('blur'));
    await fixture.whenStable();

    expect(salaryMetadataRepository.upsert).not.toHaveBeenCalled();
    expect(salaryMetadataRepository.remove).not.toHaveBeenCalled();
  });

  it('deletes the row when both fields are cleared', async () => {
    await setup('2026-02', [{ id: 4, yearMonth: '2026-02', grossWage: 3500 }]);

    await typeInto(cells()[0], '');

    expect(salaryMetadataRepository.remove).toHaveBeenCalledExactlyOnceWith(4);
    expect(salaryMetadataRepository.upsert).not.toHaveBeenCalled();
  });

  it('keeps the neighbouring field when only one is edited', async () => {
    await setup('2026-02', [{ id: 4, yearMonth: '2026-02', grossWage: 3500, bonus: 900 }]);

    await typeInto(cells()[0], '3600');

    expect(salaryMetadataRepository.upsert).toHaveBeenCalledExactlyOnceWith({
      id: 4,
      yearMonth: '2026-02',
      grossWage: 3600,
      bonus: 900,
    });
  });

  it('links to the full salary page for a user who came for one month and stayed', async () => {
    await setup('2026-02');

    expect(fixture.nativeElement.querySelector('a[href="/income/salary"]')).not.toBeNull();
  });

  it('explains what the bonus field does, as the table’s column header does', async () => {
    await setup('2026-02');

    expect(fixture.nativeElement.textContent).toContain('Subtracted from your net income');
  });
});
