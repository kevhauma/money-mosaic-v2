import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { CategoriesRepository, TransactionsRepository, type Category } from '@/core/data-access';
import { CategoriesStore } from '@/core/state';
import type { TransactionFilters } from '../../transaction-filters';
import { TransactionFiltersComponent } from './transaction-filters.component';

/** Protected surface we reach into for form/behaviour assertions. */
type Internals = {
  filterForm: { value: unknown; patchValue: (value: Record<string, string>) => void };
  hasActiveFilters: () => boolean;
  clearFilters: () => void;
  canMakeRuleFromFilter: () => boolean;
  onMakeRuleFromFilter: () => void;
};

describe('TransactionFiltersComponent', () => {
  let fixture: ComponentFixture<TransactionFiltersComponent>;
  let emitted: TransactionFilters[];

  const setInputs = async (queryParams: Record<string, string>): Promise<void> => {
    fixture.componentRef.setInput('accountId', queryParams['accountId']);
    fixture.componentRef.setInput('from', queryParams['from']);
    fixture.componentRef.setInput('to', queryParams['to']);
    fixture.componentRef.setInput('categoryId', queryParams['categoryId']);
    await fixture.whenStable();
  };

  const setup = async (queryParams: Record<string, string> = {}): Promise<void> => {
    await TestBed.configureTestingModule({
      imports: [TransactionFiltersComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(TransactionFiltersComponent);
    emitted = [];
    fixture.componentInstance.filtersChange.subscribe((value) => emitted.push(value));
    await setInputs(queryParams);
  };

  const internals = (): Internals => fixture.componentInstance as unknown as Internals;

  it('should create with no query params', async () => {
    await setup({});
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('pre-fills the filter form from drill-down query params (FR-STAT-6)', async () => {
    await setup({ from: '2026-07-01', to: '2026-07-31', categoryId: '3', accountId: '2' });

    expect(internals().filterForm.value).toEqual({
      accountId: '2',
      dateFrom: '2026-07-01',
      dateTo: '2026-07-31',
      categoryId: '3',
      text: '',
      amountMin: '',
      amountMax: '',
      amountDirection: 'all',
    });
  });

  it('accepts the uncategorised sentinel from a query param', async () => {
    await setup({ categoryId: 'uncategorised' });

    expect((internals().filterForm.value as { categoryId: string }).categoryId).toBe(
      'uncategorised',
    );
  });

  it('re-seeds the filter form when a same-route drill-down changes the categoryId input (CR-7.2)', async () => {
    await setup({ categoryId: '3' });
    internals().filterForm.patchValue({ text: 'groceries', amountMin: '10' });

    await setInputs({ categoryId: '7' });

    const value = internals().filterForm.value as {
      categoryId: string;
      text: string;
      amountMin: string;
    };
    expect(value.categoryId).toBe('7');
    // Free-text/amount filters are not URL-backed, so a route-driven reseed leaves them alone (CR-2.4).
    expect(value.text).toBe('groceries');
    expect(value.amountMin).toBe('10');
  });

  it('emits the settled filters after construction', async () => {
    await setup({ categoryId: '3' });

    expect(emitted.at(-1)).toEqual({
      accountId: '',
      dateFrom: '',
      dateTo: '',
      categoryId: '3',
      text: '',
      amountMin: '',
      amountMax: '',
      amountDirection: 'all',
    });
  });

  it('showUncategorisedOnly jumps straight to the uncategorised filter (callable by the parent)', async () => {
    await setup();

    fixture.componentInstance.showUncategorisedOnly();
    await fixture.whenStable();

    expect((internals().filterForm.value as { categoryId: string }).categoryId).toBe(
      'uncategorised',
    );
    expect(emitted.at(-1)?.categoryId).toBe('uncategorised');
  });

  it('clearFilters resets every field and disables itself once nothing is active', async () => {
    await setup();
    internals().filterForm.patchValue({ accountId: '2', text: 'groceries' });
    await fixture.whenStable();
    expect(internals().hasActiveFilters()).toBe(true);

    internals().clearFilters();
    await fixture.whenStable();

    expect(internals().filterForm.value).toEqual({
      accountId: '',
      dateFrom: '',
      dateTo: '',
      categoryId: '',
      text: '',
      amountMin: '',
      amountMax: '',
      amountDirection: 'all',
    });
    expect(internals().hasActiveFilters()).toBe(false);
  });

  describe('amountDirection (TICKET-TXN-08, revised by TICKET-TXN-10)', () => {
    const directionOf = (): string =>
      (internals().filterForm.value as { amountDirection: string }).amountDirection;

    it('starts on "All", with that button selected on first paint', async () => {
      await setup();
      fixture.detectChanges();

      expect(directionOf()).toBe('all');
      const buttons = Array.from(
        fixture.nativeElement.querySelectorAll(
          '[aria-label="Amount direction"] button',
        ) as NodeListOf<HTMLButtonElement>,
      );
      expect(buttons.map((b) => b.textContent?.trim())).toEqual(['All', 'Income', 'Expenses']);
      expect(buttons.map((b) => b.getAttribute('aria-pressed'))).toEqual([
        'true',
        'false',
        'false',
      ]);
    });

    it('choosing a direction activates hasActiveFilters on its own', async () => {
      await setup();
      internals().filterForm.patchValue({ amountDirection: 'income' });
      await fixture.whenStable();

      // Was excluded from the "any field set" scan entirely, because 'expense' was always populated.
      expect(internals().hasActiveFilters()).toBe(true);
    });

    it('a direction change together with a Min/Max value activates hasActiveFilters', async () => {
      await setup();
      internals().filterForm.patchValue({ amountDirection: 'income', amountMin: '10' });
      await fixture.whenStable();

      expect(internals().hasActiveFilters()).toBe(true);
    });

    it('leaves hasActiveFilters off while the direction is still "All"', async () => {
      await setup();
      await fixture.whenStable();

      expect(internals().hasActiveFilters()).toBe(false);
    });

    it('clearFilters resets amountDirection back to "All"', async () => {
      await setup();
      internals().filterForm.patchValue({ amountDirection: 'income', amountMin: '10' });
      await fixture.whenStable();

      internals().clearFilters();
      await fixture.whenStable();

      expect(directionOf()).toBe('all');
      expect(internals().hasActiveFilters()).toBe(false);
    });

    it('a drill-down re-seed leaves the direction on "All" (FR-STAT-6)', async () => {
      await setup({ from: '2026-07-01', to: '2026-07-31', categoryId: '3' });
      await fixture.whenStable();

      expect(directionOf()).toBe('all');

      // …and still does when a same-route drill-down changes the params again (CR-7.2).
      await setInputs({ categoryId: '7' });

      expect(directionOf()).toBe('all');
    });

    /**
     * jsdom has no layout, so the overlap this ticket fixed can only be *measured* in a browser
     * (recorded on TICKET-TXN-11). What a spec can hold is the class contract the fix rests on:
     * four `lg` tracks, and spans that make the two rows fill exactly — change any of these and
     * the wide controls are back in a track too narrow for them.
     */
    it('lays the lg grid out in four tracks, with spans that fill both rows (TICKET-TXN-11)', async () => {
      await setup();
      fixture.detectChanges();
      const form = fixture.nativeElement.querySelector('form') as HTMLElement;
      const spanOf = (selector: string): string =>
        Array.from((form.querySelector(selector) as HTMLElement).classList)
          .filter((token) => token.includes('col-span'))
          .sort()
          .join(' ');

      expect(form.classList).toContain('lg:grid-cols-4');
      // Row 1: Account + Date range + Category + Search, one track each.
      expect(spanOf('mm-fieldset[legend="Search"]')).toBe('col-span-2 lg:col-span-1 sm:col-span-3');
      // Row 2: the amount group over three tracks, the button pair in the fourth.
      expect(spanOf('[data-testid="amount-group"]')).toBe('col-span-2 lg:col-span-3 sm:col-span-3');
      expect(spanOf('[data-testid="filter-actions"]')).toBe(
        'col-span-2 lg:col-span-1 sm:col-span-3',
      );
    });

    it('stacks the action buttons once they share one lg track (TICKET-TXN-11)', async () => {
      await setup();
      fixture.detectChanges();
      const actions = fixture.nativeElement.querySelector(
        '[data-testid="filter-actions"]',
      ) as HTMLElement;

      // Side by side while the pair owns a whole row; one per line at `lg`, where the track is
      // ~187px and "Make rule from filter" alone needs 139px on one line.
      expect(actions.classList).toContain('grid-cols-2');
      expect(actions.classList).toContain('lg:grid-cols-1');
      // The tip opens leftwards because this cell sits on the form's right edge; centred, its
      // pseudo-element pushed the form's scrollWidth past its clientWidth.
      expect(actions.querySelector('.tooltip')?.classList).toContain('tooltip-left');
    });

    it('renders the direction with Min and Max in one group, not merely adjacent in the grid', async () => {
      await setup();
      fixture.detectChanges();
      const group = fixture.nativeElement.querySelector(
        '[data-testid="amount-group"]',
      ) as HTMLElement;

      // Grid order alone puts Category between them at the 2- and 3-column wraps.
      expect(group.querySelector('[aria-label="Amount direction"]')).not.toBeNull();
      expect(
        Array.from(group.querySelectorAll('mm-fieldset') as NodeListOf<HTMLElement>).map((f) =>
          f.textContent?.includes('Min amount')
            ? 'Min amount'
            : f.textContent?.includes('Max amount')
              ? 'Max amount'
              : 'Amount type',
        ),
      ).toEqual(['Amount type', 'Min amount', 'Max amount']);
    });
  });

  describe('canMakeRuleFromFilter (TICKET-CAT-07)', () => {
    it('is disabled when no filter is active', async () => {
      await setup();
      expect(internals().canMakeRuleFromFilter()).toBe(false);
    });

    it('is enabled once text is set', async () => {
      await setup();
      internals().filterForm.patchValue({ text: 'netflix' });
      // `text` flows through the 150ms-debounced needle (CR-2.4) — real timers only, this app is
      // zoneless and `fixture.whenStable()` needs real timers to settle (see category-comparison-
      // panel.component.spec.ts), so fake timers aren't an option here.
      await new Promise((resolve) => setTimeout(resolve, 200));
      await fixture.whenStable();
      expect(internals().canMakeRuleFromFilter()).toBe(true);
    });

    it('is enabled once accountId is set', async () => {
      await setup();
      internals().filterForm.patchValue({ accountId: '2' });
      await fixture.whenStable();
      expect(internals().canMakeRuleFromFilter()).toBe(true);
    });

    it('is enabled once an amount bound is set alongside a direction', async () => {
      await setup();
      internals().filterForm.patchValue({ amountMin: '10', amountDirection: 'expense' });
      await fixture.whenStable();
      expect(internals().canMakeRuleFromFilter()).toBe(true);
    });

    it('stays disabled for an amount bound with the direction still on "All" (TICKET-TXN-10)', async () => {
      await setup();
      internals().filterForm.patchValue({ amountMin: '10' });
      await fixture.whenStable();

      // An either-sign magnitude match is not expressible as a rule condition, so there is nothing
      // to convert — and the tooltip says which choice is missing.
      expect(internals().canMakeRuleFromFilter()).toBe(false);
    });

    it('stays disabled for a date-only filter — no convertible axis is set', async () => {
      await setup();
      internals().filterForm.patchValue({ dateFrom: '2026-06-01' });
      await fixture.whenStable();
      expect(internals().canMakeRuleFromFilter()).toBe(false);
    });

    it('stays disabled for a category-only filter — no convertible axis is set', async () => {
      await setup();
      internals().filterForm.patchValue({ categoryId: '3' });
      await fixture.whenStable();
      expect(internals().canMakeRuleFromFilter()).toBe(false);
    });

    it('onMakeRuleFromFilter emits makeRuleFromFilter', async () => {
      await setup();
      let emittedCount = 0;
      fixture.componentInstance.makeRuleFromFilter.subscribe(() => emittedCount++);

      internals().onMakeRuleFromFilter();

      expect(emittedCount).toBe(1);
    });
  });
});

describe('TransactionFiltersComponent: applicability-aware category list (TICKET-CAT-11)', () => {
  let fixture: ComponentFixture<TransactionFiltersComponent>;

  const category = (id: number, name: string, window: Partial<Category> = {}): Category => ({
    id,
    name,
    kind: 'expense',
    color: '#7F77DD',
    icon: 'tag',
    archived: false,
    isSystem: false,
    sortOrder: id,
    ...window,
  });

  const setupWith = async (
    categories: Category[],
    queryParams: Record<string, string> = {},
  ): Promise<HTMLElement> => {
    await TestBed.configureTestingModule({
      imports: [TransactionFiltersComponent],
      providers: [
        provideRouter([]),
        { provide: TransactionsRepository, useValue: { getAll: vi.fn().mockResolvedValue([]) } },
        {
          provide: CategoriesRepository,
          useValue: { getAll: vi.fn().mockResolvedValue(categories) },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TransactionFiltersComponent);
    await TestBed.inject(CategoriesStore).hydrate();
    fixture.componentRef.setInput('accountId', queryParams['accountId']);
    fixture.componentRef.setInput('from', queryParams['from']);
    fixture.componentRef.setInput('to', queryParams['to']);
    fixture.componentRef.setInput('categoryId', queryParams['categoryId']);
    await fixture.whenStable();
    fixture.detectChanges();

    return fixture.nativeElement as HTMLElement;
  };

  /** The Category fieldset's own options — the Account select above it has its own. */
  const categoryOptionLabels = (host: HTMLElement): string[] => {
    const fieldset = [...host.querySelectorAll('mm-fieldset')].find((element) =>
      element.textContent?.includes('All categories'),
    );
    return [...(fieldset?.querySelectorAll('option') ?? [])].map(
      (option) => option.textContent?.trim() ?? '',
    );
  };

  it('offers every active category when no date filter is set — the whole history is on the table', async () => {
    const host = await setupWith([
      category(7, 'Groceries'),
      category(9, 'Rent', { activeUntil: '2023-06-30' }),
    ]);

    expect(categoryOptionLabels(host)).toEqual([
      'All categories',
      'Uncategorised',
      'Groceries',
      'Rent (ended)',
    ]);
  });

  it('drops a category whose window misses the active date filter', async () => {
    const host = await setupWith(
      [category(7, 'Groceries'), category(9, 'Rent', { activeUntil: '2023-06-30' })],
      { from: '2026-01-01', to: '2026-12-31' },
    );

    expect(categoryOptionLabels(host)).toEqual(['All categories', 'Uncategorised', 'Groceries']);
  });

  it('keeps a category whose window overlaps the active date filter', async () => {
    const host = await setupWith([category(9, 'Rent', { activeUntil: '2023-06-30' })], {
      from: '2023-01-01',
      to: '2023-12-31',
    });

    expect(categoryOptionLabels(host)).toEqual(['All categories', 'Uncategorised', 'Rent (ended)']);
  });

  it('keeps the current selection offerable even when the range would drop it', async () => {
    const host = await setupWith(
      [category(7, 'Groceries'), category(9, 'Rent', { activeUntil: '2023-06-30' })],
      { from: '2026-01-01', to: '2026-12-31', categoryId: '9' },
    );

    expect(categoryOptionLabels(host)).toEqual([
      'All categories',
      'Uncategorised',
      'Groceries',
      'Rent (ended)',
    ]);
  });

  it('leaves windowless categories offered for any range', async () => {
    const host = await setupWith([category(7, 'Groceries')], {
      from: '1999-01-01',
      to: '1999-12-31',
    });

    expect(categoryOptionLabels(host)).toEqual(['All categories', 'Uncategorised', 'Groceries']);
  });
});
