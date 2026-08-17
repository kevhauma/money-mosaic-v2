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
} from '@/core/data-access';
import { AccountsStore, AppSettingsStore, CategoriesStore, TransactionsStore } from '@/core/state';
import { IncomeStore } from '../../income.store';
import { SalaryDetailsPageComponent } from './salary-details-page.component';

describe('SalaryDetailsPageComponent (FR-INC-10, TICKET-INC-18)', () => {
  const accountsRepository = { getAll: vi.fn() };
  const categoriesRepository = { getAll: vi.fn() };
  const transactionsRepository = { getAll: vi.fn() };
  const appSettingsRepository = { get: vi.fn() };
  const salaryMetadataRepository = { getAll: vi.fn(), upsert: vi.fn(), remove: vi.fn() };

  let fixture: ComponentFixture<SalaryDetailsPageComponent>;

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

  const setup = async (): Promise<void> => {
    accountsRepository.getAll.mockResolvedValue([account]);
    categoriesRepository.getAll.mockResolvedValue([]);
    transactionsRepository.getAll.mockResolvedValue([]);
    appSettingsRepository.get.mockResolvedValue({ id: 1 } as AppSettings);
    salaryMetadataRepository.getAll.mockResolvedValue([]);

    await TestBed.configureTestingModule({
      imports: [SalaryDetailsPageComponent],
      providers: [
        provideRouter([]),
        { provide: AccountsRepository, useValue: accountsRepository },
        { provide: CategoriesRepository, useValue: categoriesRepository },
        { provide: TransactionsRepository, useValue: transactionsRepository },
        { provide: AppSettingsRepository, useValue: appSettingsRepository },
        { provide: SalaryMetadataRepository, useValue: salaryMetadataRepository },
      ],
    }).compileComponents();

    await Promise.all([
      TestBed.inject(AccountsStore).hydrate(),
      TestBed.inject(CategoriesStore).hydrate(),
      TestBed.inject(TransactionsStore).hydrate(),
      TestBed.inject(AppSettingsStore).hydrate(),
      TestBed.inject(IncomeStore).hydrate(),
    ]);

    fixture = TestBed.createComponent(SalaryDetailsPageComponent);
    fixture.detectChanges();
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

  it('is a real page with a header and a way back', async () => {
    await setup();

    expect(fixture.nativeElement.querySelector('mm-page-header')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('a[href="/income"]')?.textContent).toContain(
      'Back to income',
    );
  });

  it('renders no subtitle and no range control (TICKET-UI-22, TICKET-INC-21)', async () => {
    await setup();

    expect(fixture.nativeElement.querySelector('mm-page-header h1')?.textContent?.trim()).toBe(
      'Salary details',
    );
    // Each section on this page explains its own control (TICKET-INC-18), so a header caption was
    // doubly redundant.
    expect(fixture.nativeElement.querySelector('mm-page-header .mm-page-title p')).toBeNull();
    expect(fixture.nativeElement.querySelector('mm-range-picker')).toBeNull();
  });

  it('mounts the full table, unfiltered and with every month in range', async () => {
    await setup();

    expect(fixture.nativeElement.querySelector('app-salary-metadata-table')).not.toBeNull();
    // 2025 in full plus January–March 2026 on the pinned clock — nothing narrowed to one month.
    expect(fixture.nativeElement.querySelectorAll('tbody tr')).toHaveLength(15);
  });

  it('explains what gross means here and what the bonus column does to the charts', async () => {
    await setup();

    const text = fixture.nativeElement.textContent as string;

    // Asserted so a later refactor can't quietly drop the copy that made this a page.
    expect(text).toContain('only ever records what');
    expect(text).toContain('before deductions');
    expect(text).toContain('spread across its year on the income chart');
    expect(text).toContain('Nothing here needs saving');
  });
});
