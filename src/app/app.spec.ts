import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router, provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { AccountsRepository, type Account, type Transaction } from '@/core/data-access';
import { RangeStore, resolvePresetRange } from '@/core/stats';
import { AccountsStore } from '@/feature-accounts';
import { TransactionsStore } from '@/feature-transactions';
import { STAT_QUERY_PARAMS } from '@/shared/utils';
import { App } from './app';

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

// Mirrors RangeStore's own default state (this-month/month) so the ActivatedRoute mock can be
// set up *before* any TestBed.inject call — overrideProvider must run before the testing module
// is instantiated, so we can't read the default off an injected RangeStore first.
const defaultQueryParams = (): Record<string, string> => {
  const todayIso = new Date().toISOString().slice(0, 10);
  const { from, to } = resolvePresetRange('this-month', todayIso);
  return {
    [STAT_QUERY_PARAMS.from]: from,
    [STAT_QUERY_PARAMS.to]: to,
  };
};

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('does not navigate when the URL already mirrors the range store state', async () => {
    TestBed.overrideProvider(ActivatedRoute, {
      useValue: { snapshot: { queryParamMap: convertToParamMap(defaultQueryParams()) } },
    });
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate');

    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('navigates exactly once when the range changes', async () => {
    TestBed.overrideProvider(ActivatedRoute, {
      useValue: { snapshot: { queryParamMap: convertToParamMap(defaultQueryParams()) } },
    });
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate');

    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(navigateSpy).not.toHaveBeenCalled();

    const rangeStore = TestBed.inject(RangeStore);
    rangeStore.setCustomRange('2026-02-01', '2026-02-15');
    fixture.detectChanges();
    await fixture.whenStable();

    expect(navigateSpy).toHaveBeenCalledTimes(1);
    expect(navigateSpy).toHaveBeenCalledWith(
      [],
      expect.objectContaining({
        queryParams: expect.objectContaining({ [STAT_QUERY_PARAMS.from]: '2026-02-01' }),
      }),
    );
  });

  it('resolves "all-time" via the earliest active account/transaction date, not a hardcoded date', async () => {
    TestBed.overrideProvider(ActivatedRoute, {
      useValue: { snapshot: { queryParamMap: convertToParamMap(defaultQueryParams()) } },
    });
    const accountsRepository = {
      getAll: vi
        .fn()
        .mockResolvedValue([
          account({ id: 1, openingBalanceDate: '2018-05-01' }),
          account({ id: 2, openingBalanceDate: '2022-01-01', archived: true }),
        ]),
    };
    TestBed.overrideProvider(AccountsRepository, { useValue: accountsRepository });

    await TestBed.inject(AccountsStore).hydrate();
    TestBed.inject(TransactionsStore).addMany([transaction({ bookingDate: '2019-02-01' })]);

    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance['onPresetChange']('all-time');

    const rangeStore = TestBed.inject(RangeStore);
    expect(rangeStore.preset()).toBe('all-time');
    expect(rangeStore.from()).toBe('2018-05-01');
  });

  it('selecting "custom" flips the preset without altering the current from/to', async () => {
    TestBed.overrideProvider(ActivatedRoute, {
      useValue: { snapshot: { queryParamMap: convertToParamMap(defaultQueryParams()) } },
    });

    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();

    const rangeStore = TestBed.inject(RangeStore);
    const { from, to } = rangeStore;
    const fromBefore = from();
    const toBefore = to();

    fixture.componentInstance['onPresetChange']('custom');

    expect(rangeStore.preset()).toBe('custom');
    expect(rangeStore.from()).toBe(fromBefore);
    expect(rangeStore.to()).toBe(toBefore);
  });
});
