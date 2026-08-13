import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideEchartsCore } from 'ngx-echarts';
import { vi } from 'vitest';
import {
  AccountsRepository,
  AppSettingsRepository,
  CategoriesRepository,
  DEFAULT_FORECAST_SETTINGS,
  ForecastSettingsRepository,
  GoalsRepository,
  TransactionsRepository,
  TransfersRepository,
  type Account,
  type ForecastSettings,
  type SavingsGoal,
  type Transaction,
} from '@/core/data-access';
import {
  AccountsStore,
  ForecastSettingsStore,
  GoalsStore,
  TransactionsStore,
  TransfersStore,
} from '@/core/state';
import { echarts } from '@/shared/echarts';
import { stubEchartsBrowserApis } from '@/shared/echarts/echarts-jsdom.testing';
import { withCleanFormatSettings } from '@/shared/utils/format-settings.testing';
import { FutureOverviewComponent } from '../future-overview/future-overview.component';
import { ForecastControlsComponent } from './forecast-controls.component';

stubEchartsBrowserApis();

const forecastSettingsRepository = {
  get: vi.fn().mockResolvedValue(DEFAULT_FORECAST_SETTINGS),
  setLookbackMonths: vi.fn().mockResolvedValue(1),
  setBasis: vi.fn().mockResolvedValue(1),
  setSafetyNetAmount: vi.fn().mockResolvedValue(1),
  setMode: vi.fn().mockResolvedValue(1),
  setScopeAccountIds: vi.fn().mockResolvedValue(1),
};

const account: Account = {
  id: 1,
  name: 'Checking',
  type: 'checking',
  currency: 'EUR',
  openingBalance: 0,
  openingBalanceDate: '2020-01-01',
  color: '#000000',
  icon: 'bank',
  archived: false,
};

const movement = (bookingDate: string, amount: number): Transaction => ({
  id: Number(bookingDate.replaceAll('-', '')) + (amount > 0 ? 0 : 1),
  accountId: 1,
  bookingDate,
  amount,
  currency: 'EUR',
  rawDescription: amount > 0 ? 'Salary' : 'Rent',
  fingerprint: `fp-${bookingDate}-${amount}`,
  createdAt: `${bookingDate}T00:00:00.000Z`,
});

/** `count` complete months back from today, each netting +200. */
const monthlyHistory = (count: number): Transaction[] => {
  const now = new Date();
  return Array.from({ length: count }, (_, index) => {
    const month = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (index + 1), 10));
    return movement(month.toISOString().slice(0, 10), 200);
  });
};

const createFixture = async (
  settings: ForecastSettings = DEFAULT_FORECAST_SETTINGS,
  transactions: Transaction[] = [],
  accounts: Account[] = [account],
): Promise<ComponentFixture<ForecastControlsComponent>> => {
  forecastSettingsRepository.get.mockResolvedValue(settings);
  await TestBed.configureTestingModule({
    imports: [ForecastControlsComponent],
    providers: [
      { provide: ForecastSettingsRepository, useValue: forecastSettingsRepository },
      { provide: AccountsRepository, useValue: { getAll: vi.fn().mockResolvedValue(accounts) } },
      {
        provide: TransactionsRepository,
        useValue: { getAll: vi.fn().mockResolvedValue(transactions) },
      },
      { provide: TransfersRepository, useValue: { getAll: vi.fn().mockResolvedValue([]) } },
      { provide: CategoriesRepository, useValue: { getAll: vi.fn().mockResolvedValue([]) } },
      { provide: GoalsRepository, useValue: { getAll: vi.fn().mockResolvedValue([]) } },
      {
        provide: AppSettingsRepository,
        useValue: { get: vi.fn().mockResolvedValue({ id: 1 }), setPrivacyMode: vi.fn() },
      },
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(ForecastControlsComponent);
  await Promise.all([
    TestBed.inject(ForecastSettingsStore).hydrate(),
    TestBed.inject(AccountsStore).hydrate(),
    TestBed.inject(TransactionsStore).hydrate(),
    TestBed.inject(TransfersStore).hydrate(),
  ]);
  fixture.detectChanges();
  return fixture;
};

const host = (fixture: ComponentFixture<ForecastControlsComponent>): HTMLElement =>
  fixture.nativeElement as HTMLElement;

const lookbackSelect = (fixture: ComponentFixture<ForecastControlsComponent>) =>
  host(fixture).querySelector('mm-select select') as HTMLSelectElement;

/**
 * The basis toggle's two buttons — a segmented control, not a dropdown. Scoped to the fieldset,
 * since TICKET-FUT-09's page-level mode toggle is an `mm-tabs` on this panel too.
 */
const basisTabButtons = (fixture: ComponentFixture<ForecastControlsComponent>) =>
  [...host(fixture).querySelectorAll('mm-fieldset mm-tabs [role="tab"]')] as HTMLButtonElement[];

/** The page-level mode toggle (TICKET-FUT-09), which sits outside any fieldset. */
const modeTabButtons = (fixture: ComponentFixture<ForecastControlsComponent>) =>
  [...host(fixture).querySelectorAll('mm-tabs [role="tab"]')].filter(
    (tab) => !tab.closest('mm-fieldset'),
  ) as HTMLButtonElement[];

const activeModeLabel = (fixture: ComponentFixture<ForecastControlsComponent>) =>
  modeTabButtons(fixture)
    .find((tab) => tab.classList.contains('tab-active'))
    ?.textContent?.trim();

const activeBasisLabel = (fixture: ComponentFixture<ForecastControlsComponent>) =>
  basisTabButtons(fixture)
    .find((tab) => tab.classList.contains('tab-active'))
    ?.textContent?.trim();

const safetyNetInput = (fixture: ComponentFixture<ForecastControlsComponent>) =>
  host(fixture).querySelector('mm-input input') as HTMLInputElement;

const setValue = (element: HTMLInputElement | HTMLSelectElement, value: string): void => {
  element.value = value;
  element.dispatchEvent(new Event(element instanceof HTMLSelectElement ? 'change' : 'input'));
};

describe('ForecastControlsComponent (TICKET-FUT-06)', () => {
  withCleanFormatSettings();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all three controls on the defaults when the row has never been written', async () => {
    const fixture = await createFixture();

    expect(lookbackSelect(fixture).value).toBe('6');
    expect(activeBasisLabel(fixture)).toBe('Money left over');
    expect(safetyNetInput(fixture).value).toBe('0');
  });

  it('reflects a persisted row rather than the defaults', async () => {
    const fixture = await createFixture({
      id: 1,
      lookbackMonths: 24,
      basis: 'savings-transfers',
      safetyNetAmount: 2500,
    });

    expect(lookbackSelect(fixture).value).toBe('24');
    expect(activeBasisLabel(fixture)).toBe('Money moved to savings');
    expect(safetyNetInput(fixture).value).toBe('2500');
  });

  it('offers all five lookback presets, including all history', async () => {
    const fixture = await createFixture();
    const labels = [...lookbackSelect(fixture).options].map((option) => option.textContent?.trim());

    expect(labels).toEqual([
      'Last 3 months',
      'Last 6 months',
      'Last 12 months',
      'Last 24 months',
      'All history',
    ]);
  });

  it('persists a changed lookback through the store', async () => {
    const fixture = await createFixture();

    setValue(lookbackSelect(fixture), '12');
    fixture.detectChanges();

    expect(forecastSettingsRepository.setLookbackMonths).toHaveBeenCalledWith(12);
  });

  it('renders the basis as a two-option toggle with both readings visible at once', async () => {
    const fixture = await createFixture();

    expect(basisTabButtons(fixture).map((tab) => tab.textContent?.trim())).toEqual([
      'Money left over',
      'Money moved to savings',
    ]);
    // Not a dropdown — that would hide the alternative behind a click.
    expect(host(fixture).querySelectorAll('mm-select').length).toBe(1);
  });

  it('persists a changed basis, and shows that option’s explanation of what it counts', async () => {
    const fixture = await createFixture();

    expect(host(fixture).textContent).toContain('Everything that came in, minus everything');

    basisTabButtons(fixture)[1].click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(forecastSettingsRepository.setBasis).toHaveBeenCalledWith('savings-transfers');
    expect(activeBasisLabel(fixture)).toBe('Money moved to savings');
    expect(host(fixture).textContent).toContain(
      'deliberately moved into your own savings accounts',
    );
  });

  it('persists a safety net of zero and of a positive amount', async () => {
    const fixture = await createFixture();

    setValue(safetyNetInput(fixture), '1500');
    fixture.detectChanges();
    expect(forecastSettingsRepository.setSafetyNetAmount).toHaveBeenCalledWith(1500);

    setValue(safetyNetInput(fixture), '0');
    fixture.detectChanges();
    expect(forecastSettingsRepository.setSafetyNetAmount).toHaveBeenCalledWith(0);
  });

  it.each([
    ['a negative amount', '-100'],
    ['a blank amount', ''],
  ])('rejects %s with a visible message and writes nothing', async (_case, value) => {
    const fixture = await createFixture();
    vi.clearAllMocks();

    setValue(safetyNetInput(fixture), value);
    fixture.detectChanges();

    expect(forecastSettingsRepository.setSafetyNetAmount).not.toHaveBeenCalled();
    expect(host(fixture).textContent).toMatch(
      /Enter (an amount, or 0 for none|zero or a positive)/,
    );
  });

  it('reports the measured rate with the window and the spread behind it', async () => {
    const fixture = await createFixture(DEFAULT_FORECAST_SETTINGS, monthlyHistory(6));
    const text = host(fixture).textContent ?? '';

    expect(text).toContain('You saved about');
    expect(text).toContain('€200.00/month');
    expect(text).toContain('6 complete months');
    expect(text).toContain('typical month €200.00');
    expect(text).toContain('from €200.00 to €200.00');
  });

  it('clamps a window longer than the history and says how many months it really measured', async () => {
    const fixture = await createFixture(
      { ...DEFAULT_FORECAST_SETTINGS, lookbackMonths: 24 },
      monthlyHistory(2),
    );

    expect(host(fixture).textContent).toContain('2 complete months');
    expect(host(fixture).textContent).not.toContain('24 complete');
  });

  it('says what is missing instead of a €0/month rate when there is no complete month at all', async () => {
    const fixture = await createFixture(DEFAULT_FORECAST_SETTINGS, []);

    expect(host(fixture).textContent).toContain('Not enough complete months in this window');
    expect(host(fixture).textContent).not.toContain('/month');
  });
});

describe('ForecastControlsComponent: the controls move the forecast below them (TICKET-FUT-06)', () => {
  withCleanFormatSettings();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * The whole page, not just the controls: the point of these three settings is that the goal ETAs
   * change when they do, and a spec that only watched the controls would never notice if the wiring
   * between them and `ForecastStore` came loose.
   */
  // A live chart leaves a zrender paint queued on rAF; destroying the page keeps it from firing
  // against a torn-down painter after the test ends.
  let mountedPage: ComponentFixture<FutureOverviewComponent> | null = null;
  afterEach(() => {
    mountedPage?.destroy();
    mountedPage = null;
  });

  const createPage = async (
    goals: SavingsGoal[],
    transactions: Transaction[],
    openingBalance: number,
  ): Promise<ComponentFixture<FutureOverviewComponent>> => {
    forecastSettingsRepository.get.mockResolvedValue(DEFAULT_FORECAST_SETTINGS);
    await TestBed.configureTestingModule({
      imports: [FutureOverviewComponent],
      providers: [
        provideRouter([]),
        provideEchartsCore({ echarts }),
        { provide: ForecastSettingsRepository, useValue: forecastSettingsRepository },
        {
          provide: AccountsRepository,
          useValue: { getAll: vi.fn().mockResolvedValue([{ ...account, openingBalance }]) },
        },
        {
          provide: TransactionsRepository,
          useValue: { getAll: vi.fn().mockResolvedValue(transactions) },
        },
        { provide: TransfersRepository, useValue: { getAll: vi.fn().mockResolvedValue([]) } },
        { provide: CategoriesRepository, useValue: { getAll: vi.fn().mockResolvedValue([]) } },
        { provide: GoalsRepository, useValue: { getAll: vi.fn().mockResolvedValue(goals) } },
        {
          provide: AppSettingsRepository,
          useValue: { get: vi.fn().mockResolvedValue({ id: 1 }), setPrivacyMode: vi.fn() },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(FutureOverviewComponent);
    mountedPage = fixture;
    await Promise.all([
      TestBed.inject(ForecastSettingsStore).hydrate(),
      TestBed.inject(AccountsStore).hydrate(),
      TestBed.inject(TransactionsStore).hydrate(),
      TestBed.inject(TransfersStore).hydrate(),
      TestBed.inject(GoalsStore).hydrate(),
    ]);
    fixture.detectChanges();
    return fixture;
  };

  const goal: SavingsGoal = {
    id: 1,
    name: 'Camera',
    targetAmount: 1000,
    archived: false,
    createdAt: '2026-01-01',
  };

  it('raising the safety net pushes a goal out of "affordable now" in the same tick', async () => {
    // Net worth is the opening balance plus six months of +200 = 1200, against a 1000 goal:
    // affordable, until 800 of it is set aside and only 400 is left to spend.
    const fixture = await createPage([goal], monthlyHistory(6), 0);
    const page = fixture.nativeElement as HTMLElement;
    expect(page.textContent).toContain('You can buy this now');

    const input = page.querySelector('mm-input input') as HTMLInputElement;
    setValue(input, '800');

    // The store awaits its repository before patching, and that promise is not something the
    // fixture can await — so poll rather than betting on a single macrotask, which is flaky when
    // the whole suite is running.
    // Generous, because this fixture mounts the whole page — chart included — and the store awaits
    // its repository before patching. `waitFor` only waits as long as it actually needs to.
    await vi.waitFor(
      () => {
        fixture.detectChanges();
        expect(page.textContent).not.toContain('You can buy this now');
      },
      { timeout: 8_000, interval: 25 },
    );
    expect(page.textContent).toMatch(/in \d+ months?/);
    // Explicit per-test timeout: this fixture mounts the whole page, and Vitest's 5s default is
    // marginal for it once the rest of the suite is competing for the worker.
  }, 15_000);

  it('changing the lookback recomputes the rate and the ETAs together', async () => {
    // Six months of +200, then a much better three most recent months would change a 3-month rate.
    const fixture = await createPage([goal], monthlyHistory(6), 0);
    const page = fixture.nativeElement as HTMLElement;
    expect(page.textContent).toContain('6 complete months');

    setValue(page.querySelector('mm-select select') as HTMLSelectElement, '3');

    await vi.waitFor(
      () => {
        fixture.detectChanges();
        expect(page.textContent).toContain('3 complete months');
      },
      { timeout: 8_000, interval: 25 },
    );
    expect(forecastSettingsRepository.setLookbackMonths).toHaveBeenCalledWith(3);
  }, 15_000);
});

describe('ForecastControlsComponent: the mode toggle (TICKET-FUT-09)', () => {
  withCleanFormatSettings();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('offers both questions, and defaults to "when can I afford it"', async () => {
    const fixture = await createFixture();

    expect(modeTabButtons(fixture).map((tab) => tab.textContent?.trim())).toEqual([
      'When can I afford it?',
      'What do I need to save?',
    ]);
    expect(activeModeLabel(fixture)).toBe('When can I afford it?');
  });

  it('reflects a persisted mode rather than the default', async () => {
    const fixture = await createFixture({
      ...DEFAULT_FORECAST_SETTINGS,
      mode: 'required-rate',
    });

    expect(activeModeLabel(fixture)).toBe('What do I need to save?');
  });

  it('persists a mode change through the store, and swaps the explanation under it', async () => {
    const fixture = await createFixture();
    expect(host(fixture).textContent).toContain('Keep saving as you have been');

    modeTabButtons(fixture)[1].click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(forecastSettingsRepository.setMode).toHaveBeenCalledWith('required-rate');
    expect(activeModeLabel(fixture)).toBe('What do I need to save?');
    expect(host(fixture).textContent).toContain('Set a wanted-by date per goal');
  });

  it('falls back to "when can I afford it" for a row written before the field existed', async () => {
    // `mode` is optional on the row (FUT-02 declared it ahead of this ticket), so a stored row can
    // genuinely lack it — the store resolves the default rather than rendering no active tab.
    const fixture = await createFixture({
      id: 1,
      lookbackMonths: 6,
      basis: 'net-cash-flow',
      safetyNetAmount: 0,
    });

    expect(activeModeLabel(fixture)).toBe('When can I afford it?');
  });
});

describe('ForecastControlsComponent: the account scope (TICKET-FUT-08)', () => {
  withCleanFormatSettings();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const scopeCheckboxes = (fixture: ComponentFixture<ForecastControlsComponent>) =>
    [...host(fixture).querySelectorAll('input[type="checkbox"]')] as HTMLInputElement[];

  const withTwoAccounts = (settings: ForecastSettings = DEFAULT_FORECAST_SETTINGS) => {
    forecastSettingsRepository.get.mockResolvedValue(settings);
    return createFixture(
      settings,
      [],
      [
        { ...account, id: 1, name: 'Checking' },
        { ...account, id: 2, name: 'Savings', type: 'savings' as const },
      ],
    );
  };

  it('offers every account, unticked, and says the forecast is looking at all of them', async () => {
    const fixture = await withTwoAccounts();

    expect(scopeCheckboxes(fixture)).toHaveLength(2);
    expect(scopeCheckboxes(fixture).every((box) => !box.checked)).toBe(true);
    expect(host(fixture).textContent).toContain('All accounts');
  });

  it('persists a selection through the store', async () => {
    const fixture = await withTwoAccounts();

    scopeCheckboxes(fixture)[0].click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(forecastSettingsRepository.setScopeAccountIds).toHaveBeenCalledWith([1]);
  });

  it('reflects a persisted scope and names it', async () => {
    const fixture = await withTwoAccounts({
      ...DEFAULT_FORECAST_SETTINGS,
      scopeAccountIds: [2],
    });

    expect(scopeCheckboxes(fixture)[1].checked).toBe(true);
    expect(host(fixture).textContent).toContain('Savings');
  });

  it('reverts to all accounts when the last one is unticked, rather than emptying the forecast', async () => {
    const fixture = await withTwoAccounts({
      ...DEFAULT_FORECAST_SETTINGS,
      scopeAccountIds: [1],
    });

    scopeCheckboxes(fixture)[0].click();
    await fixture.whenStable();
    fixture.detectChanges();

    // An empty array is stored as "all accounts" — the zero-account state is not reachable.
    expect(forecastSettingsRepository.setScopeAccountIds).toHaveBeenCalledWith([]);
    expect(host(fixture).textContent).toContain('All accounts');
  });

  it('ignores an id whose account has since been deleted, and keeps the rest of the selection', async () => {
    const fixture = await withTwoAccounts({
      ...DEFAULT_FORECAST_SETTINGS,
      scopeAccountIds: [2, 999],
    });

    expect(host(fixture).textContent).toContain('Savings');
    expect(host(fixture).textContent).not.toContain('All accounts');
    expect(scopeCheckboxes(fixture)[1].checked).toBe(true);
  });
});
