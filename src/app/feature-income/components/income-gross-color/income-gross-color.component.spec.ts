import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import {
  AccountsRepository,
  AppSettingsRepository,
  CategoriesRepository,
  TransactionsRepository,
  type AppSettings,
} from '@/core/data-access';
import { AccountsStore, AppSettingsStore, CategoriesStore, TransactionsStore } from '@/core/state';
import { IncomeGrossColorComponent } from './income-gross-color.component';

describe('IncomeGrossColorComponent (TICKET-SET-08)', () => {
  const accountsRepository = { getAll: vi.fn() };
  const categoriesRepository = { getAll: vi.fn() };
  const transactionsRepository = { getAll: vi.fn() };
  const appSettingsRepository = { get: vi.fn(), setGrossColor: vi.fn() };

  let fixture: ComponentFixture<IncomeGrossColorComponent>;

  const setup = async (settings: Partial<AppSettings> = {}): Promise<void> => {
    accountsRepository.getAll.mockResolvedValue([]);
    categoriesRepository.getAll.mockResolvedValue([]);
    transactionsRepository.getAll.mockResolvedValue([]);
    appSettingsRepository.get.mockResolvedValue({ id: 1, ...settings } as AppSettings);
    appSettingsRepository.setGrossColor.mockResolvedValue(1);

    await TestBed.configureTestingModule({
      imports: [IncomeGrossColorComponent],
      providers: [
        { provide: AccountsRepository, useValue: accountsRepository },
        { provide: CategoriesRepository, useValue: categoriesRepository },
        { provide: TransactionsRepository, useValue: transactionsRepository },
        { provide: AppSettingsRepository, useValue: appSettingsRepository },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(IncomeGrossColorComponent);
    await Promise.all([
      TestBed.inject(AccountsStore).hydrate(),
      TestBed.inject(CategoriesStore).hydrate(),
      TestBed.inject(TransactionsStore).hydrate(),
      TestBed.inject(AppSettingsStore).hydrate(),
    ]);
    fixture.detectChanges();
  };

  const swatch = (label: string): HTMLButtonElement =>
    fixture.nativeElement.querySelector(`button[aria-label="${label}"]`) as HTMLButtonElement;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.removeItem('mm-theme-style');
    document.documentElement.removeAttribute('data-theme');
  });

  it('renders a swatch for every preset plus a Default option', async () => {
    await setup();

    expect(fixture.nativeElement.querySelectorAll('button[aria-pressed]')).toHaveLength(7);
  });

  it('starts on Default when nothing is stored', async () => {
    await setup();

    expect(swatch('Default').getAttribute('aria-pressed')).toBe('true');
    expect(swatch('Violet').getAttribute('aria-pressed')).toBe('false');
  });

  it('marks the stored color selected', async () => {
    await setup({ grossColor: 'violet' });

    expect(swatch('Violet').getAttribute('aria-pressed')).toBe('true');
    expect(swatch('Default').getAttribute('aria-pressed')).toBe('false');
  });

  it('persists a picked preset through the store', async () => {
    await setup();

    swatch('Violet').click();
    await fixture.whenStable();

    expect(appSettingsRepository.setGrossColor).toHaveBeenCalledExactlyOnceWith('violet');
  });

  it('clearing back to Default persists undefined', async () => {
    await setup({ grossColor: 'violet' });

    swatch('Default').click();
    await fixture.whenStable();

    expect(appSettingsRepository.setGrossColor).toHaveBeenCalledExactlyOnceWith(undefined);
  });

  it("shows each swatch in the canvas hex the charts will draw, not the accent picker's OKLCH", async () => {
    // The resolver reads the `data-theme` attribute, not `ThemeService`'s signal — set it directly
    // rather than injecting the service, which would instantiate TestBed before `setup` configures it.
    document.documentElement.setAttribute('data-theme', 'deformable');
    await setup();

    // `resolveGrossSeriesColor('violet')`'s light-mode value, rendered as rgb() by the DOM.
    expect((swatch('Violet').firstElementChild as HTMLElement).style.backgroundColor).toBe(
      'rgb(132, 81, 201)',
    );
  });

  it('shows the theme-palette fallback on the Default swatch, not an empty placeholder', async () => {
    await setup();

    expect((swatch('Default').firstElementChild as HTMLElement).style.backgroundColor).not.toBe('');
  });
});
