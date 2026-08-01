import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import {
  AccountsRepository,
  AppSettingsRepository,
  CategoriesRepository,
  TransactionsRepository,
  type Account,
  type AppSettings,
  type Transaction,
} from '@/core/data-access';
import { AccountsStore, AppSettingsStore, CategoriesStore, TransactionsStore } from '@/core/state';
import {
  DEFAULT_CURRENCY_SYMBOL,
  DEFAULT_CURRENCY_SYMBOL_POSITION,
  DEFAULT_LOCALE,
  syncFormatSettings,
} from '@/shared/utils';
import { IncomeCareerStartComponent } from './income-career-start.component';

describe('IncomeCareerStartComponent (FR-INC-12, TICKET-INC-12)', () => {
  const accountsRepository = { getAll: vi.fn() };
  const categoriesRepository = { getAll: vi.fn() };
  const transactionsRepository = { getAll: vi.fn() };
  const appSettingsRepository = { get: vi.fn(), setCareerStartDate: vi.fn() };

  let fixture: ComponentFixture<IncomeCareerStartComponent>;

  const account: Account = {
    id: 1,
    name: 'Checking',
    type: 'checking',
    currency: 'EUR',
    openingBalance: 0,
    openingBalanceDate: '2024-01-01',
    color: '#000000',
    icon: 'wallet',
    archived: false,
  };

  const payslip = (id: number, bookingDate: string): Transaction => ({
    id,
    accountId: 1,
    bookingDate,
    amount: 2000,
    currency: 'EUR',
    rawDescription: 'Payslip',
    fingerprint: `fp-${id}`,
    categoryId: 1,
    createdAt: `${bookingDate}T00:00:00.000Z`,
  });

  const setup = async (careerStartDate?: string): Promise<void> => {
    accountsRepository.getAll.mockResolvedValue([account]);
    categoriesRepository.getAll.mockResolvedValue([]);
    transactionsRepository.getAll.mockResolvedValue([
      payslip(1, '2024-02-01'),
      payslip(2, '2025-06-01'),
    ]);
    appSettingsRepository.get.mockResolvedValue({ id: 1, careerStartDate } as AppSettings);
    appSettingsRepository.setCareerStartDate.mockResolvedValue(1);

    await TestBed.configureTestingModule({
      imports: [IncomeCareerStartComponent],
      providers: [
        { provide: AccountsRepository, useValue: accountsRepository },
        { provide: CategoriesRepository, useValue: categoriesRepository },
        { provide: TransactionsRepository, useValue: transactionsRepository },
        { provide: AppSettingsRepository, useValue: appSettingsRepository },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(IncomeCareerStartComponent);
    await Promise.all([
      TestBed.inject(AccountsStore).hydrate(),
      TestBed.inject(CategoriesStore).hydrate(),
      TestBed.inject(TransactionsStore).hydrate(),
      TestBed.inject(AppSettingsStore).hydrate(),
    ]);
    fixture.detectChanges();
  };

  const dateInput = (): HTMLInputElement =>
    fixture.nativeElement.querySelector('input[type="date"]') as HTMLInputElement;

  /** Types a date the way the native picker does — value, then an `input` event. */
  const enterDate = (value: string): void => {
    const input = dateInput();
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };

  const visibleText = (): string => fixture.nativeElement.textContent as string;

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

  it('starts empty with a hint about what the date means, and no date persisted', async () => {
    await setup();

    expect(dateInput().value).toBe('');
    expect(visibleText()).toContain('When your working life started');
    expect(appSettingsRepository.setCareerStartDate).not.toHaveBeenCalled();
  });

  it('persists a date inside the history through the store', async () => {
    await setup();

    enterDate('2024-09-01');

    expect(appSettingsRepository.setCareerStartDate).toHaveBeenCalledExactlyOnceWith('2024-09-01');
  });

  it('shows the stored date through localeDate rather than only in the native field', async () => {
    await setup('2024-09-01');

    // Day-first under `en-BE` vs. the `en-US` default the field itself renders in — the setting
    // (TICKET-SET-04) reaches this caption, which is the only place on the control where the app's
    // own locale can show: a native date input always paints in the *browser's* locale.
    expect(dateInput().value).toBe('2024-09-01');
    expect(visibleText()).toContain('Income shown from 09/01/2024');

    syncFormatSettings({
      currencySymbol: DEFAULT_CURRENCY_SYMBOL,
      currencySymbolPosition: DEFAULT_CURRENCY_SYMBOL_POSITION,
      locale: 'en-BE',
    });
    fixture.detectChanges();

    expect(visibleText()).toContain('Income shown from 01/09/2024');
  });

  it('rejects a date in the future with a visible message and persists nothing', async () => {
    await setup();

    enterDate('2999-01-01');

    expect(visibleText()).toContain("hasn't happened yet");
    expect(appSettingsRepository.setCareerStartDate).not.toHaveBeenCalled();
  });

  it('rejects a past date that sits after the last transaction, and persists nothing', async () => {
    await setup();

    enterDate('2025-08-01');

    expect(visibleText()).toContain('after your most recent transaction');
    expect(appSettingsRepository.setCareerStartDate).not.toHaveBeenCalled();
  });

  it('leaves a rejected date in the field to be corrected rather than snapping it back', async () => {
    await setup('2024-09-01');

    enterDate('2999-01-01');

    expect(dateInput().value).toBe('2999-01-01');
  });

  it('caps the native picker at the last transaction', async () => {
    await setup();

    expect(dateInput().getAttribute('max')).toBe('2025-06-01');
  });

  it('clears the setting, restoring the full-history span', async () => {
    await setup('2024-09-01');

    const clear = [...fixture.nativeElement.querySelectorAll('button')].find((button) =>
      (button as HTMLButtonElement).textContent?.includes('Clear'),
    ) as HTMLButtonElement;
    clear.click();
    fixture.detectChanges();

    expect(appSettingsRepository.setCareerStartDate).toHaveBeenCalledExactlyOnceWith(undefined);
    expect(dateInput().value).toBe('');
  });

  it('does not clear the stored date when the field goes momentarily empty mid-edit', async () => {
    await setup('2024-09-01');

    // What a native date input reports while its segments are being retyped — not an instruction
    // to clear, which is what the Clear button is for.
    enterDate('');

    expect(appSettingsRepository.setCareerStartDate).not.toHaveBeenCalled();
  });

  it('marks the field itself invalid, not just the message below it', async () => {
    await setup();

    enterDate('2999-01-01');

    expect(dateInput().getAttribute('aria-invalid')).toBe('true');
    expect(dateInput().className).toContain('input-error');
  });

  it('offers no Clear button while no date is set', async () => {
    await setup();

    const buttons = [...fixture.nativeElement.querySelectorAll('button')];

    expect(buttons).toHaveLength(0);
  });
});
