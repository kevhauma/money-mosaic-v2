import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import {
  AccountsRepository,
  appDb,
  CategoriesRepository,
  TransactionsRepository,
  type Account,
  type Transaction,
} from '@/core/data-access';
import {
  AccountsStore,
  AppSettingsStore,
  CategoriesStore,
  ChartOptionsStore,
  RangeStore,
  TransactionsStore,
} from '@/core/state';
import { withCleanFormatSettings } from '@/shared/utils/format-settings.testing';
import { BillsCalendarComponent } from './bills-calendar.component';

const checking: Account = {
  id: 1,
  name: 'Main account',
  type: 'checking',
  iban: 'NL01BANK0000000001',
  currency: 'EUR',
  openingBalance: 0,
  openingBalanceDate: '2020-01-01',
  color: '#111111',
  icon: 'wallet',
  archived: false,
};

const transaction = (overrides: Partial<Transaction> = {}): Transaction => ({
  id: 1,
  accountId: 1,
  bookingDate: '2026-01-11',
  amount: -12.99,
  currency: 'EUR',
  rawDescription: 'Card payment',
  counterpartyName: 'Streamly',
  fingerprint: 'fp',
  createdAt: '2026-01-11T00:00:00.000Z',
  ...overrides,
});

/**
 * A monthly series on the 11th, ending in April 2026 — so `nextExpectedDate` is 2026-05-12, one day
 * after the pinned `TODAY`, which keeps it comfortably active and lets the projection reach any
 * month the spec navigates to.
 */
const streamlyMonthly = (): Transaction[] =>
  ['2026-01-11', '2026-02-11', '2026-03-11', '2026-04-11'].map((bookingDate, index) =>
    transaction({ id: index + 1, bookingDate }),
  );

/** Five distinct weekly series landing on the same day, to overflow one cell's four-entry cap. */
const fiveOnTheSameDay = (): Transaction[] =>
  ['A', 'B', 'C', 'D', 'E'].flatMap((name, seriesIndex) =>
    ['2026-03-02', '2026-04-02', '2026-05-02'].map((bookingDate, index) =>
      transaction({
        id: seriesIndex * 10 + index + 1,
        bookingDate,
        amount: -(seriesIndex + 1),
        counterpartyName: `Payee ${name}`,
      }),
    ),
  );

/**
 * "Today" for every fixture here. Pinned rather than read from the real clock: whether a series is
 * still running or has stopped (TICKET-REC-04) decides whether it is projected at all, and
 * `RecurringSeriesStore` snapshots `new Date()` when it is first injected.
 */
const TODAY = '2026-05-11T12:00:00.000Z';

describe('BillsCalendarComponent (TICKET-REC-03)', () => {
  withCleanFormatSettings();

  const createFixture = async (
    transactions: Transaction[],
  ): Promise<ComponentFixture<BillsCalendarComponent>> => {
    // Fakes only `Date`, not timers — this app is zoneless and `whenStable()` needs real ones.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(TODAY));

    await TestBed.configureTestingModule({
      imports: [BillsCalendarComponent],
      providers: [
        {
          provide: TransactionsRepository,
          useValue: { getAll: vi.fn().mockResolvedValue(transactions) },
        },
        {
          provide: AccountsRepository,
          useValue: { getAll: vi.fn().mockResolvedValue([checking]) },
        },
        { provide: CategoriesRepository, useValue: { getAll: vi.fn().mockResolvedValue([]) } },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(BillsCalendarComponent);
    await TestBed.inject(TransactionsStore).hydrate();
    await TestBed.inject(AccountsStore).hydrate();
    await TestBed.inject(CategoriesStore).hydrate();
    await TestBed.inject(AppSettingsStore).hydrate();
    fixture.detectChanges();
    return fixture;
  };

  /** Every spec picks its own month explicitly, rather than relying on the seeded current one. */
  const showMonth = (fixture: ComponentFixture<BillsCalendarComponent>, month: string): void => {
    TestBed.inject(ChartOptionsStore).setVisibleMonth('recurring-bills-calendar', month);
    fixture.detectChanges();
  };

  const showView = (
    fixture: ComponentFixture<BillsCalendarComponent>,
    view: 'calendar' | 'list',
  ): void => {
    TestBed.inject(ChartOptionsStore).setBillsView('recurring-bills-calendar', view);
    fixture.detectChanges();
  };

  /**
   * By accessible name, not by DOM order — the view switcher's own tabs are `<button>`s too, and
   * sit above these, so `querySelectorAll('button')[n]` silently picks the wrong control.
   */
  const clickButton = (host: HTMLElement, name: string): void => {
    const button = [...host.querySelectorAll('button')].find(
      (candidate) =>
        candidate.getAttribute('aria-label') === name || candidate.textContent?.trim() === name,
    );
    expect(button, `no button named "${name}"`).toBeDefined();
    button?.click();
  };

  afterEach(async () => {
    vi.useRealTimers();
    await appDb.appSettings.clear();
  });

  it('renders nothing at all when no series was detected', async () => {
    const fixture = await createFixture([transaction()]);

    expect((fixture.nativeElement as HTMLElement).textContent?.trim()).toBe('');
  });

  it('opens in calendar view on whole Monday-first weeks, with the month’s days in place', async () => {
    const fixture = await createFixture(streamlyMonthly());
    showMonth(fixture, '2026-07'); // 1 July 2026 is a Wednesday; 31 July a Friday
    const host = fixture.nativeElement as HTMLElement;

    expect(host.textContent).toContain('July 2026');

    const cells = [...host.querySelectorAll('.grid > div')];
    // Seven weekday headers, then five whole weeks of seven days.
    expect(cells).toHaveLength(7 + 35);
    expect(cells.slice(0, 7).map((cell) => cell.textContent?.trim())).toEqual([
      'Mon',
      'Tue',
      'Wed',
      'Thu',
      'Fri',
      'Sat',
      'Sun',
    ]);

    const days = cells.slice(7);
    // The grid starts on Monday 29 June, so 1 July lands in the third column.
    expect(days[0].textContent).toContain('29');
    expect(days[2].textContent).toContain('1');
    expect(days[0].className).toContain('opacity-40'); // June, dimmed
    expect(days[2].className).not.toContain('opacity-40');
  });

  it('places an expected payment on its own day, with the month total above', async () => {
    const fixture = await createFixture(streamlyMonthly());
    showMonth(fixture, '2026-07');
    const host = fixture.nativeElement as HTMLElement;

    // nextExpectedDate is 2026-05-12, so the monthly rhythm reaches July on the 12th.
    const twelfth = [...host.querySelectorAll('.grid > div')].find((cell) =>
      cell.textContent?.includes('Streamly'),
    );
    expect(twelfth?.textContent).toContain('12');
    expect(twelfth?.textContent).toContain('€12,99');
    expect(host.textContent).toContain('expected this month');
  });

  it('collapses a crowded day to "+N more", keeping the full day on the cell title', async () => {
    const fixture = await createFixture(fiveOnTheSameDay());
    showMonth(fixture, '2026-08');
    const host = fixture.nativeElement as HTMLElement;

    const crowded = [...host.querySelectorAll('.grid > div')].find((cell) =>
      cell.textContent?.includes('+1 more'),
    );
    expect(crowded).toBeDefined();
    // `mm-text.truncate` selects the hosts only — the class input also routes onto each one's
    // inner element, so a bare `.truncate` would double-count every entry.
    expect(crowded?.querySelectorAll('mm-text.truncate')).toHaveLength(4);
    // Nothing is actually lost — all five are on the cell's own tooltip.
    expect(crowded?.getAttribute('title')?.split('\n')).toHaveLength(5);
  });

  it('shows the same occurrences in list view, date-ordered and with empty days absent', async () => {
    const fixture = await createFixture([...streamlyMonthly(), ...fiveOnTheSameDay()]);
    showMonth(fixture, '2026-08');
    const host = fixture.nativeElement as HTMLElement;

    // In-month cells only: the grid deliberately also fills its leading/trailing days, which the
    // list — scoped to the visible month, like the header total — does not speak for.
    const calendarLabels = [...host.querySelectorAll('.grid > div')]
      .filter((cell) => !cell.className.includes('opacity-40'))
      .flatMap((cell) => [...cell.querySelectorAll('mm-text.truncate')])
      .map((node) => node.textContent?.trim());
    const calendarTotal = host.textContent?.match(/€[\d.,]+\s*expected/)?.[0];

    showView(fixture, 'list');

    const listDays = [...host.querySelectorAll('ul > li')];
    expect(host.querySelector('.grid')).toBeNull(); // the grid is gone, not merely hidden
    // Every rendered day heading has at least one payment under it — no empty days.
    expect(listDays.length).toBeGreaterThan(0);
    // The two views agree on the month's total...
    expect(host.textContent?.match(/€[\d.,]+\s*expected/)?.[0]).toBe(calendarTotal);
    // ...and on which payments they are, allowing for the calendar's "+N more" collapse.
    const listLabels = [...host.querySelectorAll('li li mm-text.truncate')].map((node) =>
      node.textContent?.trim(),
    );
    expect(listLabels.length).toBeGreaterThanOrEqual(calendarLabels.length);
    for (const label of calendarLabels) expect(listLabels).toContain(label);
  });

  it('drops the visually-hidden mirror in list view, which is its own accessible reading', async () => {
    const fixture = await createFixture(streamlyMonthly());
    showMonth(fixture, '2026-07');
    const host = fixture.nativeElement as HTMLElement;

    const mirror = host.querySelector('table.sr-only');
    expect(mirror?.textContent).toContain('Streamly');
    expect(mirror?.textContent).toContain('€12,99');

    showView(fixture, 'list');
    expect(host.querySelector('table.sr-only')).toBeNull();
  });

  it('navigates months through the session store, and back to today', async () => {
    const fixture = await createFixture(streamlyMonthly());
    showMonth(fixture, '2026-07');
    const host = fixture.nativeElement as HTMLElement;
    const chartOptions = TestBed.inject(ChartOptionsStore);

    clickButton(host, 'Next month');
    fixture.detectChanges();
    expect(chartOptions.visibleMonth('recurring-bills-calendar')).toBe('2026-08');
    expect(host.textContent).toContain('August 2026');

    clickButton(host, 'Previous month');
    clickButton(host, 'Previous month');
    fixture.detectChanges();
    expect(chartOptions.visibleMonth('recurring-bills-calendar')).toBe('2026-06');

    clickButton(host, 'This month');
    fixture.detectChanges();
    expect(chartOptions.visibleMonth('recurring-bills-calendar')).toBe(
      new Date().toISOString().slice(0, 7),
    );
  });

  it('rolls the year over at December, rather than producing a month 13', async () => {
    const fixture = await createFixture(streamlyMonthly());
    showMonth(fixture, '2026-12');
    const host = fixture.nativeElement as HTMLElement;

    clickButton(host, 'Next month');
    fixture.detectChanges();

    expect(TestBed.inject(ChartOptionsStore).visibleMonth('recurring-bills-calendar')).toBe(
      '2027-01',
    );
    expect(host.textContent).toContain('January 2027');
  });

  it('keeps the chosen view in the session store rather than local state', async () => {
    const fixture = await createFixture(streamlyMonthly());
    const chartOptions = TestBed.inject(ChartOptionsStore);

    // Nothing stored until the user chooses — the seed is a fallback, never a recorded choice.
    expect(chartOptions.billsView('recurring-bills-calendar')).toBeUndefined();
    expect(fixture.nativeElement.querySelector('.grid')).not.toBeNull();

    showView(fixture, 'list');
    expect(chartOptions.billsView('recurring-bills-calendar')).toBe('list');
  });

  it('blurs every amount under privacy mode, and withholds them from the hidden mirror', async () => {
    const fixture = await createFixture(streamlyMonthly());
    showMonth(fixture, '2026-07');
    await TestBed.inject(AppSettingsStore).setPrivacyMode(true);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;

    expect(host.querySelectorAll('.mm-privacy-blurred').length).toBeGreaterThan(0);
    // The sr-only table is read aloud, so a blur would hide nothing — the figure is withheld.
    const mirror = host.querySelector('table.sr-only');
    expect(mirror?.textContent).toContain('hidden');
    expect(mirror?.textContent).not.toContain('€12.99');

    // And the native day tooltip is painted outside the blur box, so its figure has to go too.
    const titles = [...host.querySelectorAll('[title]')].map((cell) => cell.getAttribute('title'));
    expect(titles.some((title) => title?.includes('Streamly'))).toBe(true);
    expect(titles.some((title) => title?.includes('€'))).toBe(false);
  });

  it('marks today in both views', async () => {
    const fixture = await createFixture(streamlyMonthly());
    const today = new Date().toISOString().slice(0, 10);
    showMonth(fixture, today.slice(0, 7));
    const host = fixture.nativeElement as HTMLElement;

    const todayCells = [...host.querySelectorAll('.grid > div')].filter((cell) =>
      cell.className.includes('ring-primary'),
    );
    expect(todayCells).toHaveLength(1);
    expect(todayCells[0].textContent).toContain(String(Number(today.slice(8, 10))));
  });

  describe('change flags (TICKET-REC-04)', () => {
    /**
     * Monthly at 30-day steps, last paid 2026-04-01: expected 2026-05-01, which is 10 days before
     * the pinned `TODAY` — past the 7-day grace, and nowhere near two whole intervals of silence.
     */
    const overdueMonthly = (): Transaction[] =>
      ['2026-02-01', '2026-03-03', '2026-04-02'].map((bookingDate, index) =>
        transaction({ id: index + 1, bookingDate }),
      );

    /** Quiet since the autumn — far past two intervals, so `stopped` rather than merely late. */
    const cancelledMonthly = (): Transaction[] =>
      ['2025-08-04', '2025-09-04', '2025-10-04'].map((bookingDate, index) =>
        transaction({ id: 200 + index, bookingDate, counterpartyName: 'Old gym' }),
      );

    it('marks an overdue expected occurrence on its past day, in words as well as styling', async () => {
      const fixture = await createFixture(overdueMonthly());
      showMonth(fixture, '2026-05');
      const host = fixture.nativeElement as HTMLElement;

      const marked = [...host.querySelectorAll('.grid > div div')].filter((entry) =>
        entry.className.includes('ring-warning'),
      );
      expect(marked).toHaveLength(1);
      expect(marked[0].textContent).toContain('Streamly');

      // Colour is never the only signal: the hidden mirror and the day tooltip both say it.
      expect(host.querySelector('table.sr-only')?.textContent).toContain('not yet arrived');
      const titles = [...host.querySelectorAll('[title]')].map((cell) =>
        cell.getAttribute('title'),
      );
      expect(titles.some((title) => title?.includes('not yet arrived'))).toBe(true);
    });

    it('says the same thing in list view, where there is no cell to outline', async () => {
      const fixture = await createFixture(overdueMonthly());
      showMonth(fixture, '2026-05');
      showView(fixture, 'list');
      const host = fixture.nativeElement as HTMLElement;

      const badges = [...host.querySelectorAll('mm-badge')];
      expect(badges).toHaveLength(1);
      expect(badges[0].textContent?.trim()).toBe('Not yet arrived');
    });

    it('stops projecting a stopped series — the panel above has just called it finished', async () => {
      const fixture = await createFixture([...overdueMonthly(), ...cancelledMonthly()]);
      showMonth(fixture, '2026-05');
      const host = fixture.nativeElement as HTMLElement;

      // The cancelled series' rhythm would otherwise still land on the 4th of every month.
      expect(host.textContent).not.toContain('Old gym');
      expect(host.textContent).toContain('Streamly');
    });
  });

  // /recurring has no range of its own; poking another page's key proves this reads none at all.
  it('ignores every page date range entirely', async () => {
    const fixture = await createFixture(streamlyMonthly());
    showMonth(fixture, '2026-07');
    const host = fixture.nativeElement as HTMLElement;
    const before = host.textContent;

    TestBed.inject(RangeStore).setCustomRange('explore', '2020-01-01', '2020-01-31');
    fixture.detectChanges();

    expect(host.textContent).toBe(before);
  });
});
