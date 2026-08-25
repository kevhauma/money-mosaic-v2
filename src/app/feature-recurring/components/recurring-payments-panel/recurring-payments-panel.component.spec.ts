import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import {
  AccountsRepository,
  appDb,
  CategoriesRepository,
  RecurringOverridesRepository,
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
import { RecurringSeriesStore } from '../../recurring-series.store';
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

/** A four-occurrence every-two-weeks series, last paid a fortnight ago — active (TICKET-REC-07). */
const fortnightly = (): Transaction[] =>
  ['2026-03-16', '2026-03-30', '2026-04-13', '2026-04-27'].map((bookingDate, index) =>
    transaction({
      id: 300 + index,
      bookingDate,
      amount: -7,
      counterpartyName: 'Veg box',
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

  const recurringOverridesRepository = {
    getAll: vi.fn().mockResolvedValue([]),
    add: vi.fn().mockResolvedValue(1),
    remove: vi.fn().mockResolvedValue(undefined),
  };

  const createFixture = async (
    transactions: Transaction[],
    categories: Category[] = [subscriptions],
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
          useValue: { getAll: vi.fn().mockResolvedValue(categories) },
        },
        // TICKET-REC-11: the panel shows nothing until the user's corrections have loaded, so a
        // fixture with none still has to say so rather than leave the store un-hydrated.
        { provide: RecurringOverridesRepository, useValue: recurringOverridesRepository },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(RecurringPaymentsPanelComponent);
    await TestBed.inject(TransactionsStore).hydrate();
    await TestBed.inject(AccountsStore).hydrate();
    await TestBed.inject(CategoriesStore).hydrate();
    await TestBed.inject(AppSettingsStore).hydrate();
    await TestBed.inject(RecurringSeriesStore).hydrate();
    fixture.detectChanges();
    return fixture;
  };

  beforeEach(() => {
    // The corrections mock is shared, and some cases below seed it — reset it so an override from
    // one test never leaks into the next.
    recurringOverridesRepository.getAll.mockResolvedValue([]);
    recurringOverridesRepository.add.mockClear();
    recurringOverridesRepository.remove.mockClear();
  });

  afterEach(async () => {
    vi.useRealTimers();
    await appDb.appSettings.clear();
  });

  /** The stopped group's disclosure — the button inside its `scope="rowgroup"` heading (TICKET-REC-06). */
  const stoppedToggleOf = (host: HTMLElement): HTMLButtonElement | null =>
    host.querySelector('th[scope="rowgroup"] button');

  /** Clicks that disclosure and settles the view, for assertions about the rows behind it. */
  const openStoppedGroup = (fixture: ComponentFixture<RecurringPaymentsPanelComponent>): void => {
    stoppedToggleOf(fixture.nativeElement as HTMLElement)?.click();
    fixture.detectChanges();
  };

  /** Each series row's eight cells in order — the name is a `<th scope="row">`, the rest `<td>`. */
  const cellsOf = (host: HTMLElement): string[][] =>
    [...host.querySelectorAll('tbody tr')].map((row) =>
      [...row.querySelectorAll('th, td')].map((cell) => cell.textContent?.trim() ?? ''),
    );

  it('lists each detected series with its cadence, typical amount, dates and monthly equivalent', async () => {
    const fixture = await createFixture(streamlyMonthly());
    const [row] = cellsOf(fixture.nativeElement as HTMLElement);

    expect(row).toHaveLength(7); // the Status column was removed on 2026-08-09
    expect(row[0]).toContain('Streamly');
    expect(row[1]).toContain('Subscriptions');
    expect(row[2]).toBe('Monthly');
    expect(row[3]).toBe('€12,99');
    expect(row[4]).toBe('09/05/2026'); // last paid
    expect(row[5]).toBe('08/06/2026'); // next expected: last + the 30-day median gap
    expect(row[6]).toBe('€12,99');
  });

  it('names an every-two-weeks rhythm "Fortnightly" in the cadence column (TICKET-REC-07)', async () => {
    const fixture = await createFixture(fortnightly());
    const [row] = cellsOf(fixture.nativeElement as HTMLElement);

    expect(row[2]).toBe('Fortnightly');
    expect(row[3]).toBe('€7,00');
    expect(row[6]).toBe('€15,22'); // 7 × 365.25 / 14 / 12
  });

  it('sorts the series by monthly equivalent, most expensive first', async () => {
    const fixture = await createFixture([...gymMonthly(), ...streamlyMonthly()]);

    const labels = cellsOf(fixture.nativeElement as HTMLElement).map((row) => row[0]);
    expect(labels[0]).toContain('Streamly'); // €12.99/month
    expect(labels[1]).toContain('Gym'); // €5.00/month
  });

  it('names an uncategorised series explicitly rather than leaving the cell blank', async () => {
    const fixture = await createFixture(gymMonthly());

    expect(cellsOf(fixture.nativeElement as HTMLElement)[0][1]).toContain('Uncategorised');
  });

  it('summarises the count and the summed monthly-equivalent total', async () => {
    const fixture = await createFixture([...gymMonthly(), ...streamlyMonthly()]);

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('2 recurring payments');
    expect(text).toContain('€17,99'); // 12.99 + 5.00
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
    expect(occurrences[0]).toBe('09/02/2026€12,99');
    expect(occurrences[3]).toBe('09/05/2026€12,99');
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

  // The page it sits on has no range at all since the move to /recurring, and the caption saying so
  // moved up to the page intro. This still holds the panel itself to reading no `RangeStore` key.
  it('does not react when any page range changes', async () => {
    const fixture = await createFixture(streamlyMonthly());
    const host = fixture.nativeElement as HTMLElement;

    const before = cellsOf(host);

    // A range that excludes every occurrence — the series must survive it, or cadence detection
    // would be impossible for any range shorter than three of its own periods.
    TestBed.inject(RangeStore).setCustomRange('explore', '2026-07-01', '2026-07-31');
    fixture.detectChanges();

    expect(cellsOf(host)).toEqual(before);
  });

  it('states that joint payments are shown whole, so the Dashboard mismatch reads as a choice (TICKET-REC-09)', async () => {
    const fixture = await createFixture(streamlyMonthly());
    // Collapsed, because the caption wraps across lines in the template.
    const text = ((fixture.nativeElement as HTMLElement).textContent ?? '').replace(/\s+/g, ' ');

    expect(text).toContain(
      'Joint-account payments are shown at their full amount, not your share.',
    );
  });

  describe('change flags (TICKET-REC-04)', () => {
    it('lists stopped series under their own heading, not among live commitments', async () => {
      const fixture = await createFixture([...streamlyMonthly(), ...cancelledMonthly()]);
      const host = fixture.nativeElement as HTMLElement;

      const [active, stopped] = [...host.querySelectorAll('tbody')];
      expect(active.textContent).toContain('Streamly');
      expect(active.textContent).not.toContain('Old gym');
      // The heading now carries the group's count and folds the rows away (TICKET-REC-06), so the
      // rows are asserted through its toggle rather than on first render.
      expect(stopped.textContent).toContain('Stopped (1) — no longer counted in the monthly total');
      openStoppedGroup(fixture);
      expect([...host.querySelectorAll('tbody')][1].textContent).toContain('Old gym');
    });

    it('leaves stopped series out of the count and the monthly total', async () => {
      const fixture = await createFixture([...streamlyMonthly(), ...cancelledMonthly()]);
      const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

      // One active series at €12.99 — the cancelled €30 one costs nothing per month any more.
      expect(text).toContain('1 recurring payment ≈');
      expect(text).not.toContain('€42.99');
    });

    it('renders no flag badges — the Status column was removed on 2026-08-09 (TICKET-REC-11 adds a confidence one)', async () => {
      // Three payments at €9.99 then three at €12.99 (a sustained repricing), plus a cancelled
      // series: between them these carry all three of REC-04's flags. None of them reaches the UI
      // any more. What survives is the *grouping*, which the two tests above assert.
      const repricedMonthly = [
        '2025-12-09',
        '2026-01-09',
        '2026-02-09',
        '2026-03-09',
        '2026-04-09',
        '2026-05-09',
      ].map((bookingDate, index) =>
        transaction({ id: index + 1, bookingDate, amount: index < 3 ? -9.99 : -12.99 }),
      );
      const fixture = await createFixture([...repricedMonthly, ...cancelledMonthly()]);
      const host = fixture.nativeElement as HTMLElement;
      openStoppedGroup(fixture);

      // One badge per rendered row, and it is the confidence marker TICKET-REC-11 added — not a
      // flag badge coming back. The flags themselves still reach the user by their other routes.
      const badges = [...host.querySelectorAll('mm-badge')].map((badge) =>
        badge.textContent?.trim(),
      );
      expect(badges.length).toBe(host.querySelectorAll('tbody tr th[scope="row"]').length);
      for (const badge of badges) {
        expect(['Strong match', 'Fair match', 'Weak match']).toContain(badge);
      }
      expect(host.textContent).not.toContain('Price ↑');
      expect(host.textContent).not.toContain('Overdue');
      expect([...host.querySelectorAll('thead th')].map((th) => th.textContent?.trim())).toEqual([
        'Payment',
        'Category',
        'Cadence',
        'Typical',
        'Last paid',
        'Next expected',
        'Per month',
      ]);
      // Detection is untouched: the two price levels still folded into one series at the new one.
      expect(cellsOf(host)[0][3]).toBe('€12,99');
    });
  });

  describe('the payment column’s width clamp (TICKET-REC-10)', () => {
    /** The shape that pushed the table past its panel: a description-keyed series, so no short name. */
    const LONG_LABEL = 'SEPA INCASSO NUTSBEDRIJF ENERGIELEVERING MAANDTERMIJN AFREKENING';

    const longNameMonthly = (): Transaction[] =>
      ['2026-02-09', '2026-03-09', '2026-04-09', '2026-05-09'].map((bookingDate, index) =>
        transaction({ id: 400 + index, bookingDate, counterpartyName: LONG_LABEL }),
      );

    /** The label span inside the row header's toggle — the second of the button's two spans. */
    const labelSpanOf = (host: HTMLElement): HTMLElement | null =>
      host.querySelector('tbody th[scope="row"] button > span:last-of-type');

    it('bounds the label and ellipsises it, so the column stops growing to fit a name', async () => {
      const fixture = await createFixture(longNameMonthly());
      const label = labelSpanOf(fixture.nativeElement as HTMLElement);

      expect(label?.textContent?.trim()).toBe(LONG_LABEL);
      // A maximum, not a width: a short name still shrinks the column below it. 12rem is the
      // measured budget at 1280px for the seven-column table, stepping up to 16rem once the panel
      // is wide enough to afford it — re-measure if a column is ever added or removed.
      expect(label?.classList.contains('max-w-48')).toBe(true);
      expect(label?.classList.contains('2xl:max-w-3xs')).toBe(true);
      expect(label?.classList.contains('truncate')).toBe(true);
    });

    it('keeps the full name on hover and in the toggle’s accessible name', async () => {
      const fixture = await createFixture(longNameMonthly());
      const host = fixture.nativeElement as HTMLElement;

      expect(labelSpanOf(host)?.getAttribute('title')).toBe(LONG_LABEL);
      expect(
        host.querySelector('tbody th[scope="row"] button')?.getAttribute('aria-label'),
      ).toContain(LONG_LABEL);
    });

    it('leaves mm-table’s horizontal scroll wrapper in place for narrow viewports', async () => {
      const fixture = await createFixture(longNameMonthly());
      const wrapper = (fixture.nativeElement as HTMLElement).querySelector('.mm-table-wrap');

      expect(wrapper?.classList.contains('overflow-x-auto')).toBe(true);
    });
  });

  describe('the collapsed stopped group (TICKET-REC-06)', () => {
    const bothSeries = (): Transaction[] => [...streamlyMonthly(), ...cancelledMonthly()];

    /** Series rows only — the group's heading is a `<tr>` too, but carries one cell, not seven. */
    const seriesRowsOf = (host: HTMLElement): string[][] =>
      cellsOf(host).filter((cells) => cells.length === 7);

    it('renders the group header with its count, and none of its rows, on first render', async () => {
      const fixture = await createFixture(bothSeries());
      const host = fixture.nativeElement as HTMLElement;

      expect(stoppedToggleOf(host)?.textContent).toContain(
        'Stopped (1) — no longer counted in the monthly total',
      );
      expect(stoppedToggleOf(host)?.getAttribute('aria-expanded')).toBe('false');
      // The active half is untouched: one row, and it is the live commitment.
      expect(seriesRowsOf(host).map((row) => row[0])).toEqual([
        expect.stringContaining('Streamly'),
      ]);
      expect(host.textContent).not.toContain('Old gym');
    });

    it('reveals the rows on activation and hides them again, flipping aria-expanded', async () => {
      const fixture = await createFixture(bothSeries());
      const host = fixture.nativeElement as HTMLElement;

      openStoppedGroup(fixture);

      const [, stopped] = [...host.querySelectorAll('tbody')];
      expect(stopped.textContent).toContain('Old gym');
      // The `scope="rowgroup"` heading and the row's own seven columns survive being unfolded.
      expect(host.querySelector('th[scope="rowgroup"]')).not.toBeNull();
      expect(seriesRowsOf(host)).toHaveLength(2);
      // The row itself no longer says "Stopped" — since 2026-08-09 the group heading is the only
      // place that does, which is why the disclosure carries the count.
      expect(seriesRowsOf(host)[1][0]).toContain('Old gym');
      expect(stoppedToggleOf(host)?.getAttribute('aria-expanded')).toBe('true');

      openStoppedGroup(fixture);

      expect(seriesRowsOf(host).map((row) => row[0])).toEqual([
        expect.stringContaining('Streamly'),
      ]);
      expect(stoppedToggleOf(host)?.getAttribute('aria-expanded')).toBe('false');
    });

    it('renders no group and no toggle when nothing is stopped', async () => {
      const fixture = await createFixture(streamlyMonthly());
      const host = fixture.nativeElement as HTMLElement;

      expect(stoppedToggleOf(host)).toBeNull();
      expect(host.textContent).not.toContain('Stopped');
    });

    it('keeps the count and monthly total off the group’s open/closed state', async () => {
      const fixture = await createFixture(bothSeries());
      const textOf = () => (fixture.nativeElement as HTMLElement).textContent ?? '';

      expect(textOf()).toContain('1 recurring payment ≈');
      expect(textOf()).toContain('€12,99');

      openStoppedGroup(fixture);

      expect(textOf()).toContain('1 recurring payment ≈');
      expect(textOf()).not.toContain('€42.99'); // 12.99 + the stopped 30.00
    });

    it('writes nothing to appSettings — the state is component-local and session-only', async () => {
      const fixture = await createFixture(bothSeries());

      openStoppedGroup(fixture);

      expect(await appDb.appSettings.count()).toBe(0);
    });
  });

  describe('a category’s applicability range (TICKET-REC-05)', () => {
    /** `streamlyMonthly` is categorised 1; ending that window last month concludes the series. */
    const endedSubscriptions: Category = { ...subscriptions, activeUntil: '2026-04-30' };

    it('renders no caption when nothing was concluded', async () => {
      const fixture = await createFixture(streamlyMonthly());

      expect((fixture.nativeElement as HTMLElement).textContent).not.toContain(
        'concluded series hidden',
      );
    });

    it('drops the series and captions the absence when its category window has closed', async () => {
      const fixture = await createFixture(streamlyMonthly(), [endedSubscriptions]);
      const host = fixture.nativeElement as HTMLElement;

      expect(cellsOf(host)).toEqual([]);
      expect(host.textContent).toContain('1 concluded series hidden');
      expect(host.textContent).toContain('categories with an ended applicability range');
      // Absent, not flagged: the empty state stands in for the list, and no Stopped group appears.
      expect(host.textContent).not.toContain('Stopped');
    });

    it('leaves an uncategorised series listed, since it has no window to honour', async () => {
      const fixture = await createFixture(
        [...gymMonthly(), ...streamlyMonthly()],
        [endedSubscriptions],
      );
      const host = fixture.nativeElement as HTMLElement;

      expect(cellsOf(host).map((row) => row[0])).toEqual([expect.stringContaining('Gym')]);
      expect(host.textContent).toContain('1 concluded series hidden');
    });
  });

  /**
   * TICKET-REC-11 — the panel's half of "reversible automation": say how sure the detection is,
   * and give the user something to do when it is wrong. The matching of a stored override back onto
   * a re-detected series is `recurring-overrides.spec.ts`'s business; these are about the controls.
   */
  describe('corrections (TICKET-REC-11)', () => {
    /** The dismiss button inside an expanded row's evidence panel. */
    const dismissButtonOf = (host: HTMLElement): HTMLButtonElement | null =>
      [...host.querySelectorAll('button')].find((button) =>
        button.getAttribute('aria-label')?.startsWith('Dismiss '),
      ) ?? null;

    const expandFirstRow = (fixture: ComponentFixture<RecurringPaymentsPanelComponent>): void => {
      (fixture.nativeElement as HTMLElement)
        .querySelector<HTMLButtonElement>('tbody th[scope="row"] button')
        ?.click();
      fixture.detectChanges();
    };

    it('marks every row with how sure the detection is', async () => {
      const fixture = await createFixture(streamlyMonthly());
      const host = fixture.nativeElement as HTMLElement;

      const badge = host.querySelector('tbody th[scope="row"] mm-badge');
      // Four occurrences, steady dates, steady amount — one doubt (fewer than six payments).
      expect(badge?.textContent?.trim()).toBe('Fair match');
      // The tooltip lands on the `.badge` span, not the host: a native attribute does not forward
      // through a wrapping component, so `mm-badge` takes it as its own input.
      expect(badge?.querySelector('span')?.getAttribute('title')).toContain('seen 4 times so far');
    });

    it('offers the dismiss control with the evidence, not on the row itself', async () => {
      const fixture = await createFixture(streamlyMonthly());
      const host = fixture.nativeElement as HTMLElement;

      expect(dismissButtonOf(host)).toBeNull();

      expandFirstRow(fixture);

      expect(dismissButtonOf(host)?.getAttribute('aria-label')).toBe(
        'Dismiss Streamly — not a recurring payment',
      );
    });

    it('dismissing writes an override anchored on the series’ earliest occurrence', async () => {
      const fixture = await createFixture(streamlyMonthly());
      expandFirstRow(fixture);

      dismissButtonOf(fixture.nativeElement as HTMLElement)?.click();
      await fixture.whenStable();

      expect(recurringOverridesRepository.add).toHaveBeenCalledWith(
        expect.objectContaining({ kind: 'dismissed', anchorTransactionId: 1 }),
      );
    });

    it('drops a dismissed series out of the list, the count and the total', async () => {
      recurringOverridesRepository.getAll.mockResolvedValue([
        { id: 1, kind: 'dismissed', anchorTransactionId: 1, createdAt: TODAY },
      ]);
      const fixture = await createFixture([...streamlyMonthly(), ...gymMonthly()]);
      const host = fixture.nativeElement as HTMLElement;

      expect(host.textContent).not.toContain('Streamly');
      expect(host.textContent).toContain('1 recurring payment ≈');
      // €5 gym only — the €12.99 subscription is dismissed, so it counts toward nothing.
      expect(host.textContent).toContain('€5,00');
    });

    it('keeps a dismissed series reachable, and restores it', async () => {
      recurringOverridesRepository.getAll.mockResolvedValue([
        { id: 1, kind: 'dismissed', anchorTransactionId: 1, createdAt: TODAY },
      ]);
      const fixture = await createFixture([...streamlyMonthly(), ...gymMonthly()]);
      const host = fixture.nativeElement as HTMLElement;

      const disclosure = [...host.querySelectorAll('button')].find((button) =>
        button.textContent?.includes('Dismissed (1)'),
      );
      expect(disclosure).toBeTruthy();
      disclosure?.click();
      fixture.detectChanges();

      const restore = [...host.querySelectorAll('button')].find((button) =>
        button.getAttribute('aria-label')?.startsWith('Restore Streamly'),
      );
      expect(restore).toBeTruthy();

      restore?.click();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(recurringOverridesRepository.remove).toHaveBeenCalledWith(1);
      expect(host.textContent).toContain('Streamly');
    });

    it('suggests merging two detections of the same payment, and merges on request', async () => {
      // Same counterparty, same category, two amount bands far enough apart that `bandByAmount`
      // splits them — the review's FreshMarket case.
      const cheap = ['2026-02-06', '2026-03-06', '2026-04-06'].map((bookingDate, index) =>
        transaction({
          id: 400 + index,
          bookingDate,
          amount: -58.4,
          counterpartyName: 'FreshMarket',
        }),
      );
      const dear = ['2026-02-20', '2026-03-20', '2026-04-20'].map((bookingDate, index) =>
        transaction({
          id: 500 + index,
          bookingDate,
          amount: -73.15,
          counterpartyName: 'FreshMarket',
        }),
      );
      const fixture = await createFixture([...cheap, ...dear]);
      const host = fixture.nativeElement as HTMLElement;

      expect(host.textContent).toContain('FreshMarket is listed twice');
      const mergeButton = [...host.querySelectorAll('button')].find((button) =>
        button.getAttribute('aria-label')?.startsWith('Merge the two FreshMarket'),
      );
      expect(mergeButton).toBeTruthy();

      mergeButton?.click();
      await fixture.whenStable();

      expect(recurringOverridesRepository.add).toHaveBeenCalledWith(
        expect.objectContaining({
          kind: 'merged',
          anchorTransactionId: 500,
          mergedIntoTransactionId: 400,
        }),
      );
    });

    it('lists a merged pair as one row', async () => {
      const cheap = ['2026-02-06', '2026-03-06', '2026-04-06'].map((bookingDate, index) =>
        transaction({
          id: 400 + index,
          bookingDate,
          amount: -58.4,
          counterpartyName: 'FreshMarket',
        }),
      );
      const dear = ['2026-02-20', '2026-03-20', '2026-04-20'].map((bookingDate, index) =>
        transaction({
          id: 500 + index,
          bookingDate,
          amount: -73.15,
          counterpartyName: 'FreshMarket',
        }),
      );
      recurringOverridesRepository.getAll.mockResolvedValue([
        {
          id: 1,
          kind: 'merged',
          anchorTransactionId: 500,
          mergedIntoTransactionId: 400,
          createdAt: TODAY,
        },
      ]);
      const fixture = await createFixture([...cheap, ...dear]);
      const host = fixture.nativeElement as HTMLElement;

      const names = [...host.querySelectorAll('tbody th[scope="row"]')].map((cell) =>
        cell.textContent?.trim(),
      );
      expect(names.filter((name) => name?.includes('FreshMarket'))).toHaveLength(1);
      // And the suggestion is gone, because there is nothing left to suggest.
      expect(host.textContent).not.toContain('is listed twice');
    });
  });
});
