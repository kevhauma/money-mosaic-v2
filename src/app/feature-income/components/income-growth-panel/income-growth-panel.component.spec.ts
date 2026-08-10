import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import {
  AccountsRepository,
  AppSettingsRepository,
  CategoriesRepository,
  TransactionsRepository,
  type Account,
  type AppSettings,
  type Category,
  type Transaction,
} from '@/core/data-access';
import { AccountsStore, AppSettingsStore, CategoriesStore, TransactionsStore } from '@/core/state';
import {
  DEFAULT_CURRENCY_SYMBOL,
  DEFAULT_CURRENCY_SYMBOL_POSITION,
  DEFAULT_LOCALE,
  syncFormatSettings,
} from '@/shared/utils';
import { buildIncomeGrowthCard, IncomeGrowthPanelComponent } from './income-growth-panel.component';

const comparisonWindow = (from: string, to: string, total: number, pct: number | null) => ({
  from,
  to,
  total,
  pct,
});

describe('buildIncomeGrowthCard (FR-INC-5, TICKET-INC-05)', () => {
  it('renders the delta with an explicit sign and both figures beneath it', () => {
    const card = buildIncomeGrowthCard(
      'vs. previous month',
      2200,
      comparisonWindow('2026-05-01', '2026-05-31', 2000, 0.1),
      'n/a',
    );

    expect(card.value).toBe('+10%');
    expect(card.subLabel).toContain('2,000');
    expect(card.subLabel).toContain('2,200');
  });

  it('colours a rise as growth and a decline as a loss', () => {
    const rise = comparisonWindow('2026-05-01', '2026-05-31', 2000, 0.1);
    const fall = comparisonWindow('2026-05-01', '2026-05-31', 2000, -0.1);
    const flat = comparisonWindow('2026-05-01', '2026-05-31', 2000, 0);

    expect(buildIncomeGrowthCard('x', 2200, rise, 'n/a').color).toBe('success');
    expect(buildIncomeGrowthCard('x', 1800, fall, 'n/a').color).toBe('error');
    expect(buildIncomeGrowthCard('x', 2000, flat, 'n/a').color).toBeUndefined();
  });

  it('shows a dash rather than ±∞% when the compared window earned nothing', () => {
    const card = buildIncomeGrowthCard(
      'vs. previous month',
      2200,
      comparisonWindow('2026-05-01', '2026-05-31', 0, null),
      'n/a',
    );

    expect(card.value).toBe('—');
    expect(card.color).toBeUndefined();
  });

  it('says why there is no comparison at all, rather than showing an empty card', () => {
    const card = buildIncomeGrowthCard(
      'vs. same month last year',
      2200,
      null,
      'no data from a year ago yet',
    );

    expect(card.value).toBe('—');
    expect(card.subLabel).toBe('no data from a year ago yet');
    expect(card.tooltip).toBe('');
  });

  it('links to its own baseline window, not the shared current month (TICKET-INC-15)', () => {
    const card = buildIncomeGrowthCard(
      'vs. start of year',
      2200,
      comparisonWindow('2026-01-01', '2026-01-31', 2000, 0.1),
      'n/a',
    );

    expect(card.link).toBe('/transactions');
    expect(card.queryParams).toEqual({ from: '2026-01-01', to: '2026-01-31' });
  });

  it('links two different cards to two different months', () => {
    const yearStart = buildIncomeGrowthCard(
      'vs. start of year',
      2200,
      comparisonWindow('2026-01-01', '2026-01-31', 2000, 0.1),
      'n/a',
    );
    const priorYear = buildIncomeGrowthCard(
      'vs. same month last year',
      2200,
      comparisonWindow('2025-07-01', '2025-07-31', 2000, 0.1),
      'n/a',
    );

    expect(yearStart.queryParams).not.toEqual(priorYear.queryParams);
  });

  it('sets no link at all in the — state, so a dead card is not a dead link', () => {
    const card = buildIncomeGrowthCard('vs. start of year', 2200, null, 'nothing to compare');

    expect(card.link).toBeUndefined();
    expect(card.queryParams).toBeUndefined();
  });
});

describe('IncomeGrowthPanelComponent', () => {
  const accountsRepository = { getAll: vi.fn() };
  const categoriesRepository = { getAll: vi.fn() };
  const transactionsRepository = { getAll: vi.fn() };
  const appSettingsRepository = { get: vi.fn() };

  let fixture: ComponentFixture<IncomeGrowthPanelComponent>;

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

  const salary: Category = {
    id: 1,
    name: 'Salary',
    kind: 'income',
    color: '#34d399',
    icon: 'cash',
    archived: false,
    isSystem: true,
    sortOrder: 1,
  };

  const payslip = (
    id: number,
    bookingDate: string,
    amount: number,
    categoryId = 1,
  ): Transaction => ({
    id,
    accountId: 1,
    bookingDate,
    amount,
    currency: 'EUR',
    rawDescription: 'Payslip',
    fingerprint: `fp-${id}`,
    categoryId,
    createdAt: `${bookingDate}T00:00:00.000Z`,
  });

  const setup = async (
    transactions: Transaction[],
    settings: Partial<AppSettings> = {},
  ): Promise<void> => {
    transactionsRepository.getAll.mockResolvedValue(transactions);
    appSettingsRepository.get.mockResolvedValue({ id: 1, ...settings } as AppSettings);

    await TestBed.configureTestingModule({
      imports: [IncomeGrowthPanelComponent],
      providers: [
        // The cards link to `/transactions` since TICKET-INC-15, so `routerLink` needs a router.
        provideRouter([]),
        { provide: AccountsRepository, useValue: accountsRepository },
        { provide: CategoriesRepository, useValue: categoriesRepository },
        { provide: TransactionsRepository, useValue: transactionsRepository },
        { provide: AppSettingsRepository, useValue: appSettingsRepository },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(IncomeGrowthPanelComponent);
    await Promise.all([
      TestBed.inject(AccountsStore).hydrate(),
      TestBed.inject(CategoriesStore).hydrate(),
      TestBed.inject(TransactionsStore).hydrate(),
      TestBed.inject(AppSettingsStore).hydrate(),
    ]);
    fixture.detectChanges();
  };

  /** The two comparison cards, as `{ label, value }` pairs. */
  const cards = (): { label: string; value: string }[] =>
    [...fixture.nativeElement.querySelectorAll('mm-stat-card')].map((card) => ({
      label: (card as HTMLElement).querySelector('.stat-title')?.textContent?.trim() ?? '',
      value: (card as HTMLElement).querySelector('.stat-value')?.textContent?.trim() ?? '',
    }));

  beforeEach(() => {
    vi.clearAllMocks();
    // `IncomeStore.incomeRange` runs to *today*, and which month is "the last complete one" flips
    // on the last day of every month — so the clock is pinned mid-month rather than left to decide
    // once a month whether these assertions hold. Only `Date` is faked; timers stay real, so
    // TestBed's own async plumbing is untouched.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-08-12T00:00:00Z'));
    accountsRepository.getAll.mockResolvedValue([account]);
    categoriesRepository.getAll.mockResolvedValue([salary]);
  });

  // Hydrating `AppSettingsStore` fires its `syncFormatSettings` effect, and those are
  // process-global module signals (Vitest runs with isolate:false) — reset them so specs that
  // assume the default symbol/locale don't depend on this file's run order.
  afterEach(() => {
    vi.useRealTimers();
    syncFormatSettings({
      currencySymbol: DEFAULT_CURRENCY_SYMBOL,
      currencySymbolPosition: DEFAULT_CURRENCY_SYMBOL_POSITION,
      locale: DEFAULT_LOCALE,
    });
  });

  it('compares the last complete month against three baselines, oldest first', async () => {
    await setup([
      payslip(1, '2024-03-15', 1500), // The first month anything was earned at all.
      payslip(2, '2025-07-15', 2000),
      payslip(3, '2026-01-15', 2500),
      payslip(4, '2026-06-15', 9000), // June must not be a baseline — the year's start is.
      payslip(5, '2026-07-15', 3000),
    ]);

    // Chronological by baseline: since I started, since last year, since January.
    expect(cards()).toEqual([
      { label: 'vs. start of career', value: '+100%' },
      { label: 'vs. same month last year', value: '+50%' },
      { label: 'vs. start of year', value: '+20%' },
    ]);
  });

  it('starts the career from the first month that earned anything, not the first empty bucket', async () => {
    // The account opens 2024-01-01 but nothing arrives until March; a baseline of zero would
    // render as a dash and the card could never say anything.
    await setup([payslip(1, '2024-03-15', 1500), payslip(2, '2026-07-15', 3000)]);

    expect(cards()[0]).toEqual({ label: 'vs. start of career', value: '+100%' });
  });

  it('names the baseline month and its figure in the card’s sub-label and tooltip', async () => {
    await setup([payslip(1, '2026-01-15', 2500), payslip(2, '2026-07-15', 3000)]);

    const first = fixture.nativeElement.querySelector('mm-stat-card') as HTMLElement;

    expect(first.querySelector('.stat-desc')?.textContent).toContain('€2,500.00');
    expect(first.querySelector('.stat-desc')?.textContent).toContain('€3,000.00');
    // The tooltip names the baseline month, so "+20%" says what it is 20% of.
    expect(first.querySelector('.tooltip-content')?.textContent).toContain('01/01/2026');
    expect(first.querySelector('.tooltip-content')?.textContent).toContain('€2,500.00');
  });

  it('names the month it compared, so the two deltas are unambiguous', async () => {
    await setup([payslip(1, '2026-06-15', 2500), payslip(2, '2026-07-15', 3000)]);

    // August is in progress on the pinned clock, so July is the month under comparison.
    expect(fixture.nativeElement.textContent).toContain('07/01/2026');
    expect(fixture.nativeElement.textContent).toContain('07/31/2026');
    expect(fixture.nativeElement.textContent).toContain('last complete month');
  });

  it('shows no percentage rather than ±∞% when the compared month earned nothing', async () => {
    await setup([payslip(1, '2026-07-15', 3000)]);

    expect(cards()[0].value).toBe('—');
    expect(fixture.nativeElement.textContent).not.toContain('Infinity');
    expect(fixture.nativeElement.textContent).not.toContain('NaN');
  });

  it('drops a deselected category from both sides of the comparison (FR-INC-3)', async () => {
    await setup([payslip(1, '2026-06-15', 2500), payslip(2, '2026-07-15', 3000)], {
      excludedIncomeCategoryIds: [1],
    });

    // With the only income category excluded, both windows are zero — so there is no % to state.
    expect(cards()[0].value).toBe('—');
  });

  it('spreads a smoothed bonus over its year instead of reading it as a raise (FR-INC-4)', async () => {
    categoriesRepository.getAll.mockResolvedValue([
      salary,
      { ...salary, id: 2, name: 'Holiday bonus' },
    ]);

    await setup(
      [
        payslip(1, '2026-01-15', 2000),
        payslip(2, '2026-07-15', 2000),
        payslip(3, '2026-07-20', 6000, 2),
      ],
      { smoothedBonusCategoryIds: [2] },
    );

    // Unsmoothed, July would be 8000 against January's 2000 — a +300% "raise". Smoothed, the bonus
    // is spread across 2026's eight rendered months, so both windows carry the same share of it.
    expect(cards()[0].value).toBe('0%');
  });

  it('reads the bonus as a spike when it is not marked for smoothing', async () => {
    categoriesRepository.getAll.mockResolvedValue([
      salary,
      { ...salary, id: 2, name: 'Holiday bonus' },
    ]);

    await setup([
      payslip(1, '2026-01-15', 2000),
      payslip(2, '2026-07-15', 2000),
      payslip(3, '2026-07-20', 6000, 2),
    ]);

    expect(cards()[0].value).toBe('+300%');
  });

  it('says so when the history holds no complete month yet', async () => {
    accountsRepository.getAll.mockResolvedValue([{ ...account, openingBalanceDate: '2026-08-01' }]);

    await setup([payslip(1, '2026-08-05', 2000)]);

    expect(fixture.nativeElement.querySelector('mm-stat-card')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('No complete calendar month');
  });

  describe('free-standing cards (TICKET-INC-15)', () => {
    /** Enough history for all three baselines to land on three different months. */
    const withThreeBaselines = (settings: Partial<AppSettings> = {}): Promise<void> =>
      setup(
        [
          payslip(1, '2024-03-15', 1500),
          payslip(2, '2025-07-15', 2000),
          payslip(3, '2026-01-15', 2500),
          payslip(4, '2026-07-15', 3000),
        ],
        settings,
      );

    it('renders the cards outside any mm-paper, in the dashboard’s own stat-row container', async () => {
      await withThreeBaselines();

      const card = fixture.nativeElement.querySelector('mm-stat-card') as HTMLElement;

      expect(card.closest('mm-paper')).toBeNull();
      const row = card.parentElement;
      expect(row?.classList.contains('flex')).toBe(true);
      expect(row?.classList.contains('flex-wrap')).toBe(true);
      expect(row?.classList.contains('gap-6')).toBe(true);
    });

    it('alternates the tilt hooks, like the dashboard’s row', async () => {
      await withThreeBaselines();

      const tilts = [...fixture.nativeElement.querySelectorAll('mm-stat-card')].map(
        (card) => (card as HTMLElement).firstElementChild?.className ?? '',
      );

      expect(tilts[0]).toContain('mm-tilt-l');
      expect(tilts[1]).toContain('mm-tilt-r');
    });

    it('keeps the heading and the compared-month caption above the row', async () => {
      await withThreeBaselines();

      expect(fixture.nativeElement.querySelector('h2')?.textContent?.trim()).toBe('Income growth');
      expect(fixture.nativeElement.textContent).toContain('last complete month');
    });

    it('links each card to its own baseline month, so all three differ', async () => {
      await withThreeBaselines();

      const links = [...fixture.nativeElement.querySelectorAll('mm-stat-card a')].map(
        (anchor) => (anchor as HTMLAnchorElement).getAttribute('href') ?? '',
      );

      expect(links).toHaveLength(3);
      expect(links.every((link) => link.includes('/transactions'))).toBe(true);
      // Career start, then the same month last year, then this year's opening month.
      expect(links[0]).toContain('2024-03-01');
      expect(links[1]).toContain('2025-07-01');
      expect(links[2]).toContain('2026-01-01');
      expect(new Set(links).size).toBe(3);
    });

    it('blurs every card and the caption’s figure with privacy mode on (TICKET-PRIV-02)', async () => {
      await withThreeBaselines({ privacyMode: true });
      const cardElements = [
        ...fixture.nativeElement.querySelectorAll('mm-stat-card'),
      ] as HTMLElement[];

      expect(cardElements.length).toBeGreaterThan(0);
      for (const card of cardElements) {
        expect(card.querySelector('.stat-value .mm-privacy-blurred')).not.toBeNull();
        expect(card.querySelector('.stat-desc .mm-privacy-blurred')).not.toBeNull();
        // The label is the whole point of leaving the card in place.
        expect(card.querySelector('.stat-title .mm-privacy-blurred')).toBeNull();
      }
      // A hover must not hand the figure back: the tooltip is where these cards spell their
      // amounts out in full (`€38,400`), and it is the only place they do.
      const tooltips = [
        ...fixture.nativeElement.querySelectorAll('.tooltip-content'),
      ] as HTMLElement[];
      expect(tooltips.length).toBeGreaterThan(0);
      expect(tooltips.every((tip) => tip.querySelector('.mm-privacy-blurred') !== null)).toBe(true);
      // Which month the deltas compare is a label, so the caption's prose stays sharp — only the
      // figure at the end of it blurs.
      expect(fixture.nativeElement.textContent).toContain('last complete month');
      expect(fixture.nativeElement.querySelector('p .mm-privacy-blurred')).not.toBeNull();
      expect(fixture.nativeElement.querySelector('p')?.textContent).toContain(
        'last complete month',
      );
    });

    it('renders the same cards unblurred with privacy mode off', async () => {
      await withThreeBaselines();

      expect(fixture.nativeElement.querySelector('.mm-privacy-blurred')).toBeNull();
      expect(cards()).toHaveLength(3);
    });

    it('renders a card with no comparable window as plain text, not a dead link', async () => {
      // No 2025 history at all, so "vs. same month last year" has nothing to point at.
      await setup([payslip(1, '2026-01-15', 2500), payslip(2, '2026-07-15', 3000)], {
        careerStartDate: '2026-01-01',
      });

      const second = fixture.nativeElement.querySelectorAll('mm-stat-card')[1] as HTMLElement;

      expect(cards()[1].value).toBe('—');
      expect(second.querySelector('a')).toBeNull();
    });
  });
});
