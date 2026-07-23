import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
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
      amountDirection: 'expense',
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
      amountDirection: 'expense',
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
      amountDirection: 'expense',
    });
    expect(internals().hasActiveFilters()).toBe(false);
  });

  describe('amountDirection (TICKET-TXN-08)', () => {
    it('toggling the direction alone does not activate hasActiveFilters', async () => {
      await setup();
      internals().filterForm.patchValue({ amountDirection: 'income' });
      await fixture.whenStable();

      expect(internals().hasActiveFilters()).toBe(false);
    });

    it('a direction change together with a Min/Max value activates hasActiveFilters', async () => {
      await setup();
      internals().filterForm.patchValue({ amountDirection: 'income', amountMin: '10' });
      await fixture.whenStable();

      expect(internals().hasActiveFilters()).toBe(true);
    });

    it('clearFilters resets amountDirection back to expense', async () => {
      await setup();
      internals().filterForm.patchValue({ amountDirection: 'income', amountMin: '10' });
      await fixture.whenStable();

      internals().clearFilters();
      await fixture.whenStable();

      expect((internals().filterForm.value as { amountDirection: string }).amountDirection).toBe(
        'expense',
      );
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

    it('is enabled once an amount bound is set', async () => {
      await setup();
      internals().filterForm.patchValue({ amountMin: '10' });
      await fixture.whenStable();
      expect(internals().canMakeRuleFromFilter()).toBe(true);
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
