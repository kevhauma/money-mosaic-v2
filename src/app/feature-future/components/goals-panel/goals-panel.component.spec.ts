import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import {
  AccountsRepository,
  AppSettingsRepository,
  CategoriesRepository,
  ForecastSettingsRepository,
  GoalsRepository,
  TransactionsRepository,
  TransfersRepository,
  type Account,
  type ForecastMode,
  type SavingsGoal,
  type Transaction,
} from '@/core/data-access';
import {
  AccountsStore,
  AppSettingsStore,
  ForecastSettingsStore,
  GoalsStore,
  TransactionsStore,
  TransfersStore,
} from '@/core/state';
import { withCleanFormatSettings } from '@/shared/utils/format-settings.testing';
import { GoalsPanelComponent } from './goals-panel.component';

const goal = (overrides: Partial<SavingsGoal> = {}): SavingsGoal => ({
  id: 1,
  name: 'Camera',
  targetAmount: 1200,
  archived: false,
  createdAt: '2026-08-01',
  ...overrides,
});

const goalsRepository = {
  getAll: vi.fn().mockResolvedValue([]),
  add: vi.fn().mockResolvedValue(9),
  update: vi.fn().mockResolvedValue(1),
  remove: vi.fn().mockResolvedValue(undefined),
  bulkUpdateSortOrder: vi.fn().mockResolvedValue(undefined),
};
const appSettingsRepository = {
  get: vi.fn().mockResolvedValue({ id: 1 }),
  setPrivacyMode: vi.fn().mockResolvedValue(1),
};

/** One checking account whose opening balance *is* the net worth when there are no transactions. */
const account = (openingBalance: number): Account => ({
  id: 1,
  name: 'Checking',
  type: 'checking',
  currency: 'EUR',
  openingBalance,
  openingBalanceDate: '2020-01-01',
  color: '#000000',
  icon: 'bank',
  archived: false,
});

const salary = (bookingDate: string, amount: number): Transaction => ({
  id: Number(bookingDate.replaceAll('-', '')),
  accountId: 1,
  bookingDate,
  amount,
  currency: 'EUR',
  rawDescription: 'Salary',
  fingerprint: `fp-${bookingDate}-${amount}`,
  createdAt: `${bookingDate}T00:00:00.000Z`,
});

/**
 * `GoalsStore` self-hydrates on first injection (TICKET-PERF-07), so the repository has to be faked
 * *before* the component is created — re-faking afterwards hits the cached hydration.
 */
const createFixture = async (
  goals: SavingsGoal[] = [],
  {
    accounts = [] as Account[],
    transactions = [] as Transaction[],
    mode = 'when-affordable' as ForecastMode,
  } = {},
): Promise<ComponentFixture<GoalsPanelComponent>> => {
  goalsRepository.getAll.mockResolvedValue(goals);
  await TestBed.configureTestingModule({
    imports: [GoalsPanelComponent],
    providers: [
      { provide: GoalsRepository, useValue: goalsRepository },
      { provide: AppSettingsRepository, useValue: appSettingsRepository },
      { provide: AccountsRepository, useValue: { getAll: vi.fn().mockResolvedValue(accounts) } },
      {
        provide: TransactionsRepository,
        useValue: { getAll: vi.fn().mockResolvedValue(transactions) },
      },
      { provide: TransfersRepository, useValue: { getAll: vi.fn().mockResolvedValue([]) } },
      { provide: CategoriesRepository, useValue: { getAll: vi.fn().mockResolvedValue([]) } },
      {
        provide: ForecastSettingsRepository,
        useValue: {
          get: vi.fn().mockResolvedValue({
            id: 1,
            lookbackMonths: 6,
            basis: 'net-cash-flow',
            safetyNetAmount: 0,
            mode,
          }),
        },
      },
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(GoalsPanelComponent);
  await TestBed.inject(GoalsStore).hydrate();
  // The forecast reads all four (TICKET-FUT-05) and gates its figures on `AccountsStore.dataReady`,
  // which is `TransactionsStore.hydrated() && TransfersStore.hydrated()`.
  await Promise.all([
    TestBed.inject(AccountsStore).hydrate(),
    TestBed.inject(TransactionsStore).hydrate(),
    TestBed.inject(TransfersStore).hydrate(),
    TestBed.inject(ForecastSettingsStore).hydrate(),
  ]);
  fixture.detectChanges();
  return fixture;
};

const host = (fixture: ComponentFixture<GoalsPanelComponent>): HTMLElement =>
  fixture.nativeElement as HTMLElement;

const rowNames = (fixture: ComponentFixture<GoalsPanelComponent>): string[] =>
  [...host(fixture).querySelectorAll('app-goal-row')].map(
    (row) => row.querySelector('mm-text')?.textContent?.trim() ?? '',
  );

/** Store writes are awaited internally and patch state a microtask later — let them land. */
const flush = async (fixture: ComponentFixture<GoalsPanelComponent>): Promise<void> => {
  await fixture.whenStable();
  fixture.detectChanges();
};

/** Fills the add/edit dialog's controls and submits it, the way a user would. */
const submitForm = async (
  fixture: ComponentFixture<GoalsPanelComponent>,
  values: Partial<Record<'name' | 'targetAmount' | 'targetDate' | 'note', string>>,
): Promise<void> => {
  const form = host(fixture).querySelector('app-goal-form') as HTMLElement;
  for (const [control, value] of Object.entries(values)) {
    const input = form.querySelector(
      `mm-input[formcontrolname="${control}"] input`,
    ) as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
  }
  fixture.detectChanges();
  (form.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
  await flush(fixture);
};

const clickAddGoal = (fixture: ComponentFixture<GoalsPanelComponent>): void => {
  const buttons = [...host(fixture).querySelectorAll('mm-button button')] as HTMLButtonElement[];
  buttons.find((button) => button.textContent?.includes('Add goal'))!.click();
  fixture.detectChanges();
};

describe('GoalsPanelComponent: adding a goal (TICKET-FUT-04)', () => {
  withCleanFormatSettings();

  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(goalsRepository, { getAll: goalsRepository.getAll });
    goalsRepository.add.mockResolvedValue(9);
  });

  it('adds a goal with a name and a target amount, and it appears in the list', async () => {
    const fixture = await createFixture([]);

    clickAddGoal(fixture);
    await submitForm(fixture, { name: 'Camera', targetAmount: '1200' });

    expect(goalsRepository.add).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Camera', targetAmount: 1200, archived: false }),
    );
    expect(rowNames(fixture)).toEqual(['Camera']);
  });

  it('appends a new goal last in the funding order rather than first', async () => {
    const fixture = await createFixture([
      goal({ id: 1, name: 'Holiday', sortOrder: 0 }),
      goal({ id: 2, name: 'Laptop', sortOrder: 1 }),
    ]);

    clickAddGoal(fixture);
    await submitForm(fixture, { name: 'Camera', targetAmount: '1200' });

    expect(goalsRepository.add).toHaveBeenCalledWith(expect.objectContaining({ sortOrder: 2 }));
    expect(rowNames(fixture)).toEqual(['Holiday', 'Laptop', 'Camera']);
  });

  it('keeps an optional wanted-by date and note, and drops them when blank', async () => {
    const fixture = await createFixture([]);

    clickAddGoal(fixture);
    await submitForm(fixture, {
      name: 'Camera',
      targetAmount: '1200',
      targetDate: '2027-06-01',
      note: 'second-hand',
    });

    expect(goalsRepository.add).toHaveBeenCalledWith(
      expect.objectContaining({ targetDate: '2027-06-01', note: 'second-hand' }),
    );

    vi.clearAllMocks();
    goalsRepository.add.mockResolvedValue(10);
    clickAddGoal(fixture);
    await submitForm(fixture, { name: 'Bike', targetAmount: '400' });

    expect(goalsRepository.add).toHaveBeenCalledWith(
      expect.objectContaining({ targetDate: undefined, note: undefined }),
    );
  });
});

describe('GoalsPanelComponent: form validation (TICKET-FUT-04)', () => {
  withCleanFormatSettings();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    ['an empty name', { name: '', targetAmount: '1200' }, 'Give the goal a name.'],
    ['a whitespace-only name', { name: '   ', targetAmount: '1200' }, 'Give the goal a name.'],
    ['a missing amount', { name: 'Camera', targetAmount: '' }, 'Enter what it costs.'],
    ['a zero amount', { name: 'Camera', targetAmount: '0' }, 'Enter an amount greater than zero.'],
    [
      'a negative amount',
      { name: 'Camera', targetAmount: '-50' },
      'Enter an amount greater than zero.',
    ],
  ])('rejects %s with a visible message and no write', async (_case, values, message) => {
    const fixture = await createFixture([]);

    clickAddGoal(fixture);
    await submitForm(fixture, values);

    expect(goalsRepository.add).not.toHaveBeenCalled();
    expect(host(fixture).querySelector('app-goal-form')?.textContent).toContain(message);
  });

  it('rejects a non-numeric amount', async () => {
    const fixture = await createFixture([]);

    clickAddGoal(fixture);
    // `<input type="number">` refuses to hold "abc", so the control ends up blank — either way the
    // form must not write, which is what this asserts.
    await submitForm(fixture, { name: 'Camera', targetAmount: 'abc' });

    expect(goalsRepository.add).not.toHaveBeenCalled();
  });
});

describe('GoalsPanelComponent: editing and deleting (TICKET-FUT-04)', () => {
  withCleanFormatSettings();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('edits a goal through the store and persists the change', async () => {
    const fixture = await createFixture([goal({ id: 1, name: 'Camera', targetAmount: 1200 })]);

    const menuItems = [
      ...host(fixture).querySelectorAll('mm-dropdown li button'),
    ] as HTMLButtonElement[];
    menuItems.find((button) => button.textContent?.includes('Edit'))!.click();
    fixture.detectChanges();
    await submitForm(fixture, { name: 'Camera body', targetAmount: '1500' });

    expect(goalsRepository.update).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ name: 'Camera body', targetAmount: 1500 }),
    );
  });

  it('asks for confirmation before deleting, and only deletes once confirmed', async () => {
    const fixture = await createFixture([goal({ id: 1, name: 'Camera' })]);
    const component = fixture.componentInstance as unknown as {
      confirmDelete: (goal: SavingsGoal) => void;
      deleteConfirmed: () => void;
    };

    component.confirmDelete(goal({ id: 1, name: 'Camera' }));
    fixture.detectChanges();

    expect(goalsRepository.remove).not.toHaveBeenCalled();
    expect(host(fixture).querySelector('mm-confirm-dialog')?.textContent).toContain(
      'This cannot be undone.',
    );

    component.deleteConfirmed();
    await flush(fixture);

    expect(goalsRepository.remove).toHaveBeenCalledWith(1);
    expect(rowNames(fixture)).toEqual([]);
  });
});

describe('GoalsPanelComponent: funding order (TICKET-FUT-04)', () => {
  withCleanFormatSettings();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('states that goals are funded top down', async () => {
    const fixture = await createFixture([goal()]);

    expect(host(fixture).textContent).toContain(
      'Goals are funded top down: the first one is paid for before the second starts saving up.',
    );
  });

  it('persists a drag as a full renumbering of the order', async () => {
    const fixture = await createFixture([
      goal({ id: 1, name: 'Camera', sortOrder: 0 }),
      goal({ id: 2, name: 'Holiday', sortOrder: 1 }),
      goal({ id: 3, name: 'Laptop', sortOrder: 2 }),
    ]);
    const component = fixture.componentInstance as unknown as {
      onDrop: (event: { previousIndex: number; currentIndex: number }) => void;
    };

    // Laptop dragged to the top — three slots, which no neighbour swap can express.
    component.onDrop({ previousIndex: 2, currentIndex: 0 });
    await flush(fixture);

    expect(goalsRepository.bulkUpdateSortOrder).toHaveBeenCalledWith([
      { id: 3, sortOrder: 0 },
      { id: 1, sortOrder: 1 },
      { id: 2, sortOrder: 2 },
    ]);
    expect(rowNames(fixture)).toEqual(['Laptop', 'Camera', 'Holiday']);
  });

  it('reorders from the keyboard alone — the move buttons are real controls, not decoration', async () => {
    const fixture = await createFixture([
      goal({ id: 1, name: 'Camera', sortOrder: 0 }),
      goal({ id: 2, name: 'Holiday', sortOrder: 1 }),
    ]);

    const moveUp = host(fixture).querySelector(
      'button[aria-label="Move Holiday up"]',
    ) as HTMLButtonElement;
    expect(moveUp).not.toBeNull();
    moveUp.click();
    await flush(fixture);

    expect(goalsRepository.bulkUpdateSortOrder).toHaveBeenCalledWith([
      { id: 2, sortOrder: 0 },
      { id: 1, sortOrder: 1 },
    ]);
    expect(rowNames(fixture)).toEqual(['Holiday', 'Camera']);
  });

  it('disables the move buttons at each end of the list', async () => {
    const fixture = await createFixture([
      goal({ id: 1, name: 'Camera', sortOrder: 0 }),
      goal({ id: 2, name: 'Holiday', sortOrder: 1 }),
    ]);

    const buttonFor = (label: string): HTMLButtonElement =>
      host(fixture).querySelector(`button[aria-label="${label}"]`) as HTMLButtonElement;

    expect(buttonFor('Move Camera up').disabled).toBe(true);
    expect(buttonFor('Move Camera down').disabled).toBe(false);
    expect(buttonFor('Move Holiday down').disabled).toBe(true);
  });
});

describe('GoalsPanelComponent: presentation (TICKET-FUT-04)', () => {
  withCleanFormatSettings();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('formats the amount through formatCurrency and the date through formatDate', async () => {
    const fixture = await createFixture([
      goal({ id: 1, name: 'Camera', targetAmount: 1234.5, targetDate: '2027-06-01' }),
    ]);

    expect(host(fixture).textContent).toContain('€1.234,50');
    expect(host(fixture).textContent).toContain('Wanted by');
  });

  it('wraps every amount in the privacy blur, driven by the global setting (TICKET-PRIV-01)', async () => {
    const fixture = await createFixture([goal({ id: 1, targetAmount: 1200 })]);
    const blur = host(fixture).querySelector('mm-privacy-blur > *') as HTMLElement;

    expect(blur.className).not.toContain('mm-privacy-blurred');

    await TestBed.inject(AppSettingsStore).setPrivacyMode(true);
    await flush(fixture);

    expect((host(fixture).querySelector('mm-privacy-blur > *') as HTMLElement).className).toContain(
      'mm-privacy-blurred',
    );
  });

  it('renders the empty state, and no rows, when there are no goals', async () => {
    const fixture = await createFixture([]);

    expect(host(fixture).querySelector('mm-empty-state')).not.toBeNull();
    expect(host(fixture).textContent).toContain('Nothing planned yet');
    expect(rowNames(fixture)).toEqual([]);
  });
});

describe('GoalsPanelComponent: the affordability readout (TICKET-FUT-05)', () => {
  withCleanFormatSettings();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * A fixture with a real measured rate: twelve complete months of €200 net, and an opening balance
   * that puts a known amount on the table today. `today` is the machine's own date, so the
   * assertions below are about *shape* — which verdict, and that a month is named — rather than
   * about a specific month, which would rot on the first of every month.
   */
  const withHistory = (goals: SavingsGoal[], openingBalance: number) => {
    const months: Transaction[] = [];
    const now = new Date();
    for (let back = 1; back <= 12; back++) {
      const month = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - back, 10));
      months.push(salary(month.toISOString().slice(0, 10), 200));
    }
    return createFixture(goals, { accounts: [account(openingBalance)], transactions: months });
  };

  it('tells you outright when the money is already there', async () => {
    // Opening balance 5000 + 12 months of 200 = 7400 net worth, against a 1200 goal.
    const fixture = await withHistory([goal({ id: 1, name: 'Camera', targetAmount: 1200 })], 5000);

    expect(host(fixture).textContent).toContain('You can buy this now');
    expect(host(fixture).textContent).toContain('You can afford all 1 goal right now.');
  });

  it('names a month and a months-away count for a goal that is still ahead', async () => {
    const fixture = await withHistory([goal({ id: 1, name: 'Camera', targetAmount: 20000 })], 0);
    const text = host(fixture).textContent ?? '';

    expect(text).toContain('≈ ');
    expect(text).toMatch(/in \d+ months?/);
    // Never a raw number or an invalid date.
    expect(text).not.toContain('NaN');
    expect(text).not.toContain('Infinity');
  });

  it('shows what the order costs cumulatively, so a goal behind another says so', async () => {
    const fixture = await withHistory(
      [
        goal({ id: 1, name: 'Camera', targetAmount: 1200, sortOrder: 0 }),
        goal({ id: 2, name: 'Holiday', targetAmount: 3000, sortOrder: 1 }),
      ],
      0,
    );

    expect(host(fixture).textContent).toContain('with everything above it');
    // 1200 + 3000 for the second goal.
    expect(host(fixture).textContent).toContain('€4.200,00');
  });

  it('says nothing has a date when the measured rate is negative, rather than going blank', async () => {
    const spending: Transaction[] = [];
    const now = new Date();
    for (let back = 1; back <= 6; back++) {
      const month = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - back, 10));
      spending.push(salary(month.toISOString().slice(0, 10), -500));
    }
    const fixture = await createFixture([goal({ id: 1, targetAmount: 1200 })], {
      accounts: [account(0)],
      transactions: spending,
    });

    expect(host(fixture).textContent).toContain('spent more than you earned');
    expect(host(fixture).textContent).toContain('Not at this rate');
  });

  it('says what is missing when there is no complete month of history at all', async () => {
    const fixture = await createFixture([goal({ id: 1, targetAmount: 1200 })], {
      accounts: [account(0)],
      transactions: [],
    });

    expect(host(fixture).textContent).toContain('Not enough complete months');
  });

  it('renders no ETA at all while the accounts data is still loading', async () => {
    goalsRepository.getAll.mockResolvedValue([goal({ id: 1, targetAmount: 1200 })]);
    await TestBed.configureTestingModule({
      imports: [GoalsPanelComponent],
      providers: [
        { provide: GoalsRepository, useValue: goalsRepository },
        { provide: AppSettingsRepository, useValue: appSettingsRepository },
        { provide: AccountsRepository, useValue: { getAll: vi.fn().mockResolvedValue([]) } },
        // Never resolves — `dataReady` stays false, which is the state under test.
        {
          provide: TransactionsRepository,
          useValue: { getAll: vi.fn(() => new Promise(() => {})) },
        },
        { provide: TransfersRepository, useValue: { getAll: vi.fn(() => new Promise(() => {})) } },
        { provide: CategoriesRepository, useValue: { getAll: vi.fn().mockResolvedValue([]) } },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(GoalsPanelComponent);
    await TestBed.inject(GoalsStore).hydrate();
    fixture.detectChanges();

    expect(TestBed.inject(AccountsStore).dataReady()).toBe(false);
    expect(host(fixture).textContent).toContain('Working out where this plan lands');
    expect(host(fixture).textContent).not.toContain('You can buy this now');
    expect(host(fixture).textContent).not.toContain('Not at this rate');
  });

  it('shows an on-track chip against a wanted-by date, and behind when it will not make it', async () => {
    const nextYear = new Date(Date.UTC(new Date().getUTCFullYear() + 5, 0, 1))
      .toISOString()
      .slice(0, 10);
    const lastMonth = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1))
      .toISOString()
      .slice(0, 10);
    const fixture = await withHistory(
      [
        goal({ id: 1, name: 'Reachable', targetAmount: 3000, targetDate: nextYear, sortOrder: 0 }),
        goal({ id: 2, name: 'Too soon', targetAmount: 9000, targetDate: lastMonth, sortOrder: 1 }),
      ],
      0,
    );

    expect(host(fixture).textContent).toContain('On track');
    expect(host(fixture).textContent).toContain('Behind');
  });
});

describe('GoalsPanelComponent: required-rate mode (TICKET-FUT-09)', () => {
  withCleanFormatSettings();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  /** Six complete months of +200, and a goal dated far enough out to need a sane monthly figure. */
  const inRequiredMode = (goals: SavingsGoal[], openingBalance = 0) => {
    const months: Transaction[] = [];
    const now = new Date();
    for (let back = 1; back <= 6; back++) {
      const month = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - back, 10));
      months.push(salary(month.toISOString().slice(0, 10), 200));
    }
    return createFixture(goals, {
      accounts: [account(openingBalance)],
      transactions: months,
      mode: 'required-rate',
    });
  };

  const inTwoYears = (): string =>
    new Date(Date.UTC(new Date().getUTCFullYear() + 2, 0, 15)).toISOString().slice(0, 10);

  it('swaps the row readout for a monthly figure, on the same single list of rows', async () => {
    const fixture = await inRequiredMode([
      goal({ id: 1, name: 'Camera', targetAmount: 4800, targetDate: inTwoYears() }),
    ]);

    expect(host(fixture).textContent).toContain('Save ≈ ');
    expect(host(fixture).textContent).toContain('/month to make');
    expect(host(fixture).textContent).not.toContain('in 24 months');
    // One list, not two.
    expect(host(fixture).querySelectorAll('app-goal-row')).toHaveLength(1);
  });

  it('reports the gap against the measured rate on the row', async () => {
    const fixture = await inRequiredMode([
      goal({ id: 1, name: 'Camera', targetAmount: 12000, targetDate: inTwoYears() }),
    ]);

    expect(host(fixture).textContent).toMatch(/more than you've been saving|ahead of this/);
  });

  it('prompts for a date on an undated goal instead of showing a rate', async () => {
    const fixture = await inRequiredMode([goal({ id: 1, name: 'Camera', targetAmount: 4800 })]);

    expect(host(fixture).textContent).toContain('Add a wanted-by date to see what this needs');
  });

  it('says what the whole plan demands and which goal sets the pace', async () => {
    const fixture = await inRequiredMode([
      goal({ id: 1, name: 'Camera', targetAmount: 12000, targetDate: inTwoYears() }),
    ]);

    expect(host(fixture).textContent).toContain('To hit every date, save ≈ ');
    expect(host(fixture).textContent).toContain('Camera is the one setting the pace.');
  });

  it('keeps the reorder controls working — the order still drives both readings', async () => {
    const fixture = await inRequiredMode([
      goal({ id: 1, name: 'Camera', targetAmount: 4800, targetDate: inTwoYears(), sortOrder: 0 }),
      goal({ id: 2, name: 'Bike', targetAmount: 1000, targetDate: inTwoYears(), sortOrder: 1 }),
    ]);

    expect(host(fixture).querySelector('button[aria-label="Move Bike up"]')).not.toBeNull();
    expect(rowNames(fixture)).toEqual(['Camera', 'Bike']);
  });
});
