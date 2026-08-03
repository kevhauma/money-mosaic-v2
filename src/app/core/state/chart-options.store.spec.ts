import { TestBed } from '@angular/core/testing';
import { ChartOptionsStore } from './chart-options.store';

describe('ChartOptionsStore (TICKET-STAT-27)', () => {
  let store: InstanceType<typeof ChartOptionsStore>;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    store = TestBed.inject(ChartOptionsStore);
  });

  it('starts empty for every chart, so each caller falls back to its own default', () => {
    expect(store.granularity('accounts-balance-history')).toBeUndefined();
    expect(store.hiddenSeries('accounts-balance-history')).toEqual([]);
    expect(store.zoom('accounts-balance-history')).toBeUndefined();
  });

  it('reads back the granularity, hidden series and zoom it was written', () => {
    store.setGranularity('accounts-balance-history', 'week');
    store.setHiddenSeries('accounts-balance-history', ['Savings', 'Credit line']);
    store.setZoom('accounts-balance-history', { start: 20, end: 60 });

    expect(store.granularity('accounts-balance-history')).toBe('week');
    expect(store.hiddenSeries('accounts-balance-history')).toEqual(['Savings', 'Credit line']);
    expect(store.zoom('accounts-balance-history')).toEqual({ start: 20, end: 60 });
  });

  it('keeps two chart ids isolated — writing one never touches the other', () => {
    store.setGranularity('accounts-balance-history', 'week');
    store.setHiddenSeries('accounts-balance-history', ['Savings']);

    store.setGranularity('dashboard-trend', 'quarter');
    store.setHiddenSeries('dashboard-trend-income', ['Salary']);

    expect(store.granularity('accounts-balance-history')).toBe('week');
    expect(store.hiddenSeries('accounts-balance-history')).toEqual(['Savings']);
    expect(store.granularity('dashboard-trend')).toBe('quarter');
    expect(store.hiddenSeries('dashboard-trend-income')).toEqual(['Salary']);
    // The expense column has its own legend and was never written.
    expect(store.hiddenSeries('dashboard-trend-expense')).toEqual([]);
  });

  it('patches one field without clearing the others held for the same chart', () => {
    store.setHiddenSeries('income-by-category', ['Bonus']);
    store.setZoom('income-by-category', { start: 0, end: 50 });

    store.setGranularity('income-by-category', 'month');

    expect(store.hiddenSeries('income-by-category')).toEqual(['Bonus']);
    expect(store.zoom('income-by-category')).toEqual({ start: 0, end: 50 });
  });

  it('prunes a hidden name the chart no longer draws, so a later series with that name is visible', () => {
    store.setHiddenSeries('accounts-balance-history', ['Savings', 'Old joint']);

    store.pruneHiddenSeries('accounts-balance-history', ['Savings', 'Checking']);

    expect(store.hiddenSeries('accounts-balance-history')).toEqual(['Savings']);
  });

  it('ignores an empty series list rather than reading it as "nothing is drawn any more"', () => {
    store.setHiddenSeries('accounts-balance-history', ['Savings']);

    // Every one of these charts renders once before its store has hydrated; pruning against that
    // first empty frame would wipe the filter on every navigation back to the page.
    store.pruneHiddenSeries('accounts-balance-history', []);

    expect(store.hiddenSeries('accounts-balance-history')).toEqual(['Savings']);
  });

  it('leaves the stored array alone when every hidden name is still drawn', () => {
    store.setHiddenSeries('accounts-balance-history', ['Savings']);
    const before = store.hiddenSeries('accounts-balance-history');

    store.pruneHiddenSeries('accounts-balance-history', ['Savings', 'Checking']);

    expect(store.hiddenSeries('accounts-balance-history')).toBe(before);
  });

  it('is session state only — a fresh injector starts blank, with no repository behind it', () => {
    store.setGranularity('accounts-balance-history', 'year');

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});

    // No `hydrate()` to await and nothing under `core/data-access/` to mock: a reload is a blank slate.
    expect(
      TestBed.inject(ChartOptionsStore).granularity('accounts-balance-history'),
    ).toBeUndefined();
  });
});
