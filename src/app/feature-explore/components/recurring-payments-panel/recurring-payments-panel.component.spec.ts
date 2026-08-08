import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import {
  AccountsRepository,
  appDb,
  CategoriesRepository,
  TransactionsRepository,
  type Account,
  type Category,
  type Transaction,
} from '@/core/data-access';
import {
  AccountsStore,
  AppSettingsStore,
  CategoriesStore,
  RangeStore,
  TransactionsStore,
} from '@/core/state';
import { withCleanFormatSettings } from '@/shared/utils/format-settings.testing';
import { RecurringPaymentsPanelComponent } from './recurring-payments-panel.component';

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

const subscriptions: Category = {
  id: 1,
  name: 'Subscriptions',
  kind: 'expense',
  color: '#ff0000',
  icon: 'tag',
  archived: false,
  isSystem: false,
};

const transaction = (overrides: Partial<Transaction> = {}): Transaction => ({
  id: 1,
  accountId: 1,
  bookingDate: '2026-01-11',
  amount: -12.99,
  currency: 'EUR',
  rawDescription: 'Card payment',
  counterpartyName: 'Streamly',
  categoryId: 1,
  fingerprint: 'fp',
  createdAt: '2026-01-11T00:00:00.000Z',
  ...overrides,
});

/**
 * "Today" for every fixture below. Pinned rather than read from the real clock: the panel's series
 * come from `RecurringSeriesStore`, which snapshots `new Date()` when it is first injected, and
 * whether a series reads as active or stopped (TICKET-REC-04) is entirely a question of where now
 * sits relative to its last payment.
 */
const TODAY = '2026-05-11T12:00:00.000Z';

/** A four-occurrence monthly series at €12.99, the most recent one two days ago — an active commitment. */
const streamlyMonthly = (): Transaction[] =>
  ['2026-02-09', '2026-03-09', '2026-04-09', '2026-05-09'].map((bookingDate, index) =>
    transaction({ id: index + 1, bookingDate }),
  );

/** A second, cheaper monthly series so sort order has something to prove. */
const gymMonthly = (): Transaction[] =>
  ['2026-03-04', '2026-04-04', '2026-05-04'].map((bookingDate, index) =>
    transaction({
      id: 100 + index,
      bookingDate,
      amount: -5,
      counterpartyName: 'Gym',
      categoryId: undefined,
    }),
  );

/** A monthly series that went quiet in the autumn — far past `STOPPED_INTERVALS`. */
const cancelledMonthly = (): Transaction[] =>
  ['2025-08-04', '2025-09-04', '2025-10-04'].map((bookingDate, index) =>
    transaction({
      id: 200 + index,
      bookingDate,
      amount: -30,
      counterpartyName: 'Old gym',
      categoryId: undefined,
    }),
  );

describe('RecurringPaymentsPanelComponent (TICKET-REC-02)', () => {
  // Every assertion here reads formatted currency/dates, and format-settings.ts's signals are
  // process-global under isolate:false — pin them so another spec file can't reach in.
  withCleanFormatSettings();

  const createFixture = async (
    transactions: Transaction[],
  ): Promise<ComponentFixture<RecurringPaymentsPanelComponent>> => {
    // Fakes only `Date`, not timers — this app is zoneless and `whenStable()` needs real ones.
    // Set before `TestBed` builds anything, since `RecurringSeriesStore` reads the clock once, on
    // its first injection.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(TODAY));

    await TestBed.configureTestingModule({
      imports: [RecurringPaymentsPanelComponent],
      providers: [
        {
          provide: TransactionsRepository,
          useValue: { getAll: vi.fn().mockResolvedValue(transactions) },
        },
        {
          provide: AccountsRepository,
          useValue: { getAll: vi.fn().mockResolvedValue([checking]) },
        },
        {
          provide: CategoriesRepository,
          useValue: { getAll: vi.fn().mockResolvedValue([subscriptions]) },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(RecurringPaymentsPanelComponent);
    await TestBed.inject(TransactionsStore).hydrate();
    await TestBed.inject(AccountsStore).hydrate();
    await TestBed.inject(CategoriesStore).hydrate();
    await TestBed.inject(AppSettingsStore).hydrate();
    fixture.detectChanges();
    return fixture;
  };

  afterEach(async () => {
    vi.useRealTimers();
    await appDb.appSettings.clear();
  });

  /** Each series row's eight cells in order — the name is a `<th scope="row">`, the rest `<td>`. */
  const cellsOf = (host: HTMLElement): string[][] =>
    [...host.querySelectorAll('tbody tr')].map((row) =>
      [...row.querySelectorAll('th, td')].map((cell) => cell.textContent?.trim() ?? ''),
    );

  it('lists each detected series with its cadence, typical amount, dates and monthly equivalent', async () => {
    const fixture = await createFixture(streamlyMonthly());
    const [row] = cellsOf(fixture.nativeElement as HTMLElement);

    expect(row[0]).toContain('Streamly');
    expect(row[1]).toBe(''); // status: an active series in good standing carries no badge
    expect(row[2]).toContain('Subscriptions');
    expect(row[3]).toBe('Monthly');
    expect(row[4]).toBe('€12.99');
    expect(row[5]).toBe('05/09/2026'); // last paid
    expect(row[6]).toBe('06/08/2026'); // next expected: last + the 30-day median gap
    expect(row[7]).toBe('€12.99');
  });

  it('sorts the series by monthly equivalent, most expensive first', async () => {
    const fixture = await createFixture([...gymMonthly(), ...streamlyMonthly()]);

    const labels = cellsOf(fixture.nativeElement as HTMLElement).map((row) => row[0]);
    expect(labels[0]).toContain('Streamly'); // €12.99/month
    expect(labels[1]).toContain('Gym'); // €5.00/month
  });

  it('names an uncategorised series explicitly rather than leaving the cell blank', async () => {
    const fixture = await createFixture(gymMonthly());

    expect(cellsOf(fixture.nativeElement as HTMLElement)[0][2]).toContain('Uncategorised');
  });

  it('summarises the count and the summed monthly-equivalent total', async () => {
    const fixture = await createFixture([...gymMonthly(), ...streamlyMonthly()]);

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('2 recurring payments');
    expect(text).toContain('€17.99'); // 12.99 + 5.00
  });

  it('expands a series to its individual occurrences, and collapses again', async () => {
    const fixture = await createFixture(streamlyMonthly());
    const host = fixture.nativeElement as HTMLElement;

    expect(host.querySelectorAll('tbody li')).toHaveLength(0);

    const toggle = host.querySelector('tbody button') as HTMLButtonElement;
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    toggle.click();
    fixture.detectChanges();

    const occurrences = [...host.querySelectorAll('tbody li')].map(
      (item) => item.textContent?.replace(/\s+/g, '').trim() ?? '',
    );
    expect(occurrences).toHaveLength(4);
    expect(occurrences[0]).toBe('02/09/2026€12.99');
    expect(occurrences[3]).toBe('05/09/2026€12.99');
    expect(host.querySelector('tbody button')?.getAttribute('aria-expanded')).toBe('true');

    (host.querySelector('tbody button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(host.querySelectorAll('tbody li')).toHaveLength(0);
  });

  it('blurs every amount under privacy mode — rows, occurrences and the summary', async () => {
    const fixture = await createFixture(streamlyMonthly());
    await TestBed.inject(AppSettingsStore).setPrivacyMode(true);
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    (host.querySelector('tbody button') as HTMLButtonElement).click();
    fixture.detectChanges();

    // Summary total, typical amount, monthly equivalent, plus one per occurrence.
    const blurred = [...host.querySelectorAll('.mm-privacy-blurred')];
    expect(blurred).toHaveLength(7);

    // And no amount escapes one: every element that renders a currency figure as its *own* text
    // (not a descendant's) sits inside a blurred wrapper.
    const ownText = (node: Element): string =>
      [...node.childNodes]
        .filter((child) => child.nodeType === Node.TEXT_NODE)
        .map((child) => child.textContent ?? '')
        .join('');
    const amounts = [...host.querySelectorAll('*')].filter((node) => /€\d/.test(ownText(node)));

    expect(amounts.length).toBeGreaterThan(0);
    expect(amounts.every((node) => node.closest('.mm-privacy-blurred') !== null)).toBe(true);
  });

  it('explains the three-occurrence minimum when nothing is detected', async () => {
    const fixture = await createFixture([
      transaction({ id: 1, bookingDate: '2026-01-11' }),
      transaction({ id: 2, bookingDate: '2026-02-11' }),
    ]);

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('at least three times');
    expect((fixture.nativeElement as HTMLElement).querySelector('tbody')).toBeNull();
  });

  it('states that detection ignores the page range, and does not react when the range changes', async () => {
    const fixture = await createFixture(streamlyMonthly());
    const host = fixture.nativeElement as HTMLElement;

    expect(host.textContent).toContain('not filtered by the range above');
    const before = cellsOf(host);

    // A range that excludes every occurrence — the series must survive it, or cadence detection
    // would be impossible for any range shorter than three of its own periods.
    TestBed.inject(RangeStore).setCustomRange('explore', '2026-07-01', '2026-07-31');
    fixture.detectChanges();

    expect(cellsOf(host)).toEqual(before);
  });

  describe('change flags (TICKET-REC-04)', () => {
    it('lists stopped series under their own heading, not among live commitments', async () => {
      const fixture = await createFixture([...streamlyMonthly(), ...cancelledMonthly()]);
      const host = fixture.nativeElement as HTMLElement;

      const [active, stopped] = [...host.querySelectorAll('tbody')];
      expect(active.textContent).toContain('Streamly');
      expect(active.textContent).not.toContain('Old gym');
      expect(stopped.textContent).toContain('Stopped — no longer counted in the monthly total');
      expect(stopped.textContent).toContain('Old gym');
    });

    it('leaves stopped series out of the count and the monthly total', async () => {
      const fixture = await createFixture([...streamlyMonthly(), ...cancelledMonthly()]);
      const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

      // One active series at €12.99 — the cancelled €30 one costs nothing per month any more.
      expect(text).toContain('1 recurring payment ≈');
      expect(text).not.toContain('€42.99');
    });

    it('badges a stopped series, in words rather than by colour alone', async () => {
      const fixture = await createFixture(cancelledMonthly());
      const badges = [...(fixture.nativeElement as HTMLElement).querySelectorAll('mm-badge')];

      expect(badges).toHaveLength(1);
      expect(badges[0].textContent?.trim()).toBe('Stopped');
    });

    it('badges a price step with both levels, and withholds them under privacy mode', async () => {
      // Three payments at €9.99, then three at €12.99 — a sustained new level, monthly throughout.
      const fixture = await createFixture(
        ['2025-12-09', '2026-01-09', '2026-02-09', '2026-03-09', '2026-04-09', '2026-05-09'].map(
          (bookingDate, index) =>
            transaction({
              id: index + 1,
              bookingDate,
              amount: index < 3 ? -9.99 : -12.99,
            }),
        ),
      );
      const host = fixture.nativeElement as HTMLElement;

      const badge = host.querySelector('mm-badge');
      expect(badge?.textContent?.trim()).toBe('Price ↑ €9.99 → €12.99');

      await TestBed.inject(AppSettingsStore).setPrivacyMode(true);
      fixture.detectChanges();

      // The figures are baked into the badge's text, so `mm-privacy-blur` can't reach them —
      // they have to be withheld rather than blurred.
      const masked = host.querySelector('mm-badge')?.textContent?.trim();
      expect(masked).toBe('Price ↑ ••• → •••');
      expect(masked).not.toContain('€');
    });
  });
});
