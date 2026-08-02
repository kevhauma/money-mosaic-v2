import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { vi } from 'vitest';
import { AccountsRepository, type Account, type Transaction } from '@/core/data-access';
import { resolvePresetRange, STAT_QUERY_PARAMS } from '@/shared/utils';
import { AccountsStore } from './accounts.store';
import { pageRangeControl } from './page-range-control';
import { RangeStore, type RangePageKey } from './range-state.store';
import { TransactionsStore } from './transactions.store';

const account = (overrides: Partial<Account> = {}): Account => ({
  id: 1,
  name: 'Checking',
  type: 'checking',
  currency: 'EUR',
  openingBalance: 0,
  openingBalanceDate: '2020-01-01',
  color: '#000000',
  icon: 'wallet',
  archived: false,
  ...overrides,
});

const transaction = (overrides: Partial<Transaction> = {}): Transaction => ({
  id: 1,
  accountId: 1,
  bookingDate: '2021-06-01',
  amount: 100,
  currency: 'EUR',
  rawDescription: 'Deposit',
  fingerprint: 'fp',
  createdAt: '2021-06-01T00:00:00.000Z',
  ...overrides,
});

/**
 * Mirrors `RangeStore`'s own default (this-month) so the `ActivatedRoute` mock can be set up
 * *before* any `TestBed.inject` call — `overrideProvider` must run before the testing module is
 * instantiated, so we can't read the default off an injected store first.
 */
const defaultQueryParams = (): Record<string, string> => {
  const todayIso = new Date().toISOString().slice(0, 10);
  const { from, to } = resolvePresetRange('this-month', todayIso);
  return { [STAT_QUERY_PARAMS.from]: from, [STAT_QUERY_PARAMS.to]: to };
};

@Component({
  selector: 'app-dashboard-range-host',
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class DashboardRangeHostComponent {
  readonly range = pageRangeControl('dashboard');
}

@Component({
  selector: 'app-accounts-range-host',
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class AccountsRangeHostComponent {
  readonly range = pageRangeControl('accounts');
}

describe('pageRangeControl (TICKET-UI-23)', () => {
  const setup = async (queryParams: Record<string, string> = defaultQueryParams()) => {
    await TestBed.configureTestingModule({
      imports: [DashboardRangeHostComponent, AccountsRangeHostComponent],
      providers: [provideRouter([])],
    }).compileComponents();
    TestBed.overrideProvider(ActivatedRoute, {
      useValue: { snapshot: { queryParamMap: convertToParamMap(queryParams) } },
    });
  };

  it("exposes the page's own range as the switcher value, defaulting to this-month", async () => {
    await setup();
    const fixture = TestBed.createComponent(DashboardRangeHostComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.range.value().preset).toBe('this-month');
    expect(fixture.componentInstance.range.value().from).toBe(
      TestBed.inject(RangeStore).from('dashboard'),
    );
  });

  it('reads ?from=&to= on entry so a drill-down link lands on that range', async () => {
    await setup({
      [STAT_QUERY_PARAMS.from]: '2024-03-01',
      [STAT_QUERY_PARAMS.to]: '2024-03-31',
    });
    const fixture = TestBed.createComponent(DashboardRangeHostComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const rangeStore = TestBed.inject(RangeStore);
    expect(rangeStore.preset('dashboard')).toBe('custom');
    expect(rangeStore.from('dashboard')).toBe('2024-03-01');
    expect(rangeStore.to('dashboard')).toBe('2024-03-31');
    // The other page is untouched by the link — it never read those params.
    expect(rangeStore.preset('accounts')).toBe('this-month');
  });

  it('keeps the named preset when re-entered with its own mirrored params (regression)', async () => {
    // The effect below writes the page's range into `?from=&to=`, so coming back to the page
    // (refresh, back navigation, a bookmark) hands the entry read its own output. Reading it
    // unconditionally demoted "This month" to "Custom" on every return.
    await setup();
    const fixture = TestBed.createComponent(DashboardRangeHostComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.range.value().preset).toBe('this-month');
  });

  it("does not navigate when the URL already mirrors the page's range", async () => {
    await setup();
    const navigateSpy = vi.spyOn(TestBed.inject(Router), 'navigate');

    const fixture = TestBed.createComponent(DashboardRangeHostComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it("mirrors the page's range back into the URL exactly once when it changes", async () => {
    await setup();
    const navigateSpy = vi.spyOn(TestBed.inject(Router), 'navigate');

    const fixture = TestBed.createComponent(DashboardRangeHostComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(navigateSpy).not.toHaveBeenCalled();

    fixture.componentInstance.range.onCustomRangeChange({ from: '2026-02-01', to: '2026-02-15' });
    fixture.detectChanges();
    await fixture.whenStable();

    expect(navigateSpy).toHaveBeenCalledTimes(1);
    expect(navigateSpy).toHaveBeenCalledWith(
      [],
      expect.objectContaining({
        queryParams: expect.objectContaining({ [STAT_QUERY_PARAMS.from]: '2026-02-01' }),
        replaceUrl: true,
      }),
    );
  });

  it('resolves "all-time" via the earliest active account/transaction date, not a hardcoded date', async () => {
    await setup();
    TestBed.overrideProvider(AccountsRepository, {
      useValue: {
        getAll: vi
          .fn()
          .mockResolvedValue([
            account({ id: 1, openingBalanceDate: '2018-05-01' }),
            account({ id: 2, openingBalanceDate: '2022-01-01', archived: true }),
          ]),
      },
    });

    await TestBed.inject(AccountsStore).hydrate();
    TestBed.inject(TransactionsStore).addMany([transaction({ bookingDate: '2019-02-01' })]);

    const fixture = TestBed.createComponent(DashboardRangeHostComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.range.onPresetChange('all-time');

    const rangeStore = TestBed.inject(RangeStore);
    expect(rangeStore.preset('dashboard')).toBe('all-time');
    expect(rangeStore.from('dashboard')).toBe('2018-05-01');
  });

  it('selecting "custom" flips the preset without altering the current from/to', async () => {
    await setup();
    const fixture = TestBed.createComponent(DashboardRangeHostComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const rangeStore = TestBed.inject(RangeStore);
    const fromBefore = rangeStore.from('dashboard');
    const toBefore = rangeStore.to('dashboard');

    fixture.componentInstance.range.onPresetChange('custom');

    expect(rangeStore.preset('dashboard')).toBe('custom');
    expect(rangeStore.from('dashboard')).toBe(fromBefore);
    expect(rangeStore.to('dashboard')).toBe(toBefore);
  });

  it('scopes every write to its own page, in both directions', async () => {
    await setup();
    const dashboard = TestBed.createComponent(DashboardRangeHostComponent);
    const accounts = TestBed.createComponent(AccountsRangeHostComponent);
    dashboard.detectChanges();
    accounts.detectChanges();
    await dashboard.whenStable();
    await accounts.whenStable();

    dashboard.componentInstance.range.onPresetChange('last-year');
    accounts.componentInstance.range.onCustomRangeChange({ from: '2023-05-01', to: '2023-05-31' });

    expect(dashboard.componentInstance.range.value().preset).toBe('last-year');
    expect(accounts.componentInstance.range.value()).toEqual({
      preset: 'custom',
      from: '2023-05-01',
      to: '2023-05-31',
    });
    // …and the Dashboard's own window survived the Accounts write.
    expect(dashboard.componentInstance.range.value().from).not.toBe('2023-05-01');
  });

  it('covers every declared range-owning page key', () => {
    // A page added to `RangePageKey` without a default entry would read `undefined` at runtime;
    // this fails loudly instead.
    const rangeStore = TestBed.inject(RangeStore);
    const pages: RangePageKey[] = ['dashboard', 'accounts'];

    for (const page of pages) {
      expect(rangeStore.preset(page)).toBe('this-month');
    }
  });
});
