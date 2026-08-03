import { Injector, runInInjectionContext, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  chartGranularity,
  chartSeriesFilter,
  chartZoomControl,
  hiddenSeriesFromEvent,
  zoomFromEvent,
} from './chart-options-control';
import { ChartOptionsStore } from './chart-options.store';

describe('hiddenSeriesFromEvent (TICKET-STAT-27)', () => {
  it('names only the entries echarts reports as off — it sends the whole legend map, not just what changed', () => {
    expect(
      hiddenSeriesFromEvent({ selected: { Checking: true, Savings: false, 'Credit line': false } }),
    ).toEqual(['Savings', 'Credit line']);
  });

  it('is empty for a fully-shown legend, and for an event carrying no selection at all', () => {
    expect(hiddenSeriesFromEvent({ selected: { Checking: true } })).toEqual([]);
    expect(hiddenSeriesFromEvent({})).toEqual([]);
  });
});

describe('zoomFromEvent (TICKET-STAT-27)', () => {
  it('reads the percentages off the slider event', () => {
    expect(zoomFromEvent({ start: 25, end: 75 })).toEqual({ start: 25, end: 75 });
  });

  it("reads them off the inside-zoom's batch instead, which is where echarts puts them", () => {
    expect(zoomFromEvent({ batch: [{ start: 10, end: 40 }] })).toEqual({ start: 10, end: 40 });
  });

  it('yields nothing for an event with no usable bounds, so a partial payload never overwrites a real window', () => {
    expect(zoomFromEvent({})).toBeUndefined();
    expect(zoomFromEvent({ start: 10 })).toBeUndefined();
    expect(zoomFromEvent({ batch: [] })).toBeUndefined();
  });
});

describe('chartGranularity (TICKET-STAT-27)', () => {
  let injector: Injector;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    injector = TestBed.inject(Injector);
  });

  it('seeds from the caller when the session holds nothing for that chart (TICKET-STAT-15 unchanged)', () => {
    const granularity = runInInjectionContext(injector, () =>
      chartGranularity('accounts-balance-history', () => 'day'),
    );

    expect(granularity.value()).toBe('day');
  });

  it("adopts the session's value instead of re-seeding, so a remount keeps the user's bucket", () => {
    TestBed.inject(ChartOptionsStore).setGranularity('accounts-balance-history', 'month');

    const granularity = runInInjectionContext(injector, () =>
      chartGranularity('accounts-balance-history', () => 'day'),
    );

    expect(granularity.value()).toBe('month');
  });

  it('writes straight to the store, which is what a later mount reads back', () => {
    const granularity = runInInjectionContext(injector, () =>
      chartGranularity('accounts-balance-history', () => 'day'),
    );

    granularity.set('quarter');

    expect(TestBed.inject(ChartOptionsStore).granularity('accounts-balance-history')).toBe(
      'quarter',
    );
    expect(granularity.value()).toBe('quarter');
  });

  it('never records the seed as a choice, so a later mount still re-derives it from the range', () => {
    // Mirroring a local writable into the store would write the seed on mount, and
    // `pickGranularityForSpan` would then never run again for the whole session.
    const first = runInInjectionContext(injector, () =>
      chartGranularity('accounts-balance-history', () => 'day'),
    );
    expect(first.value()).toBe('day');
    expect(
      TestBed.inject(ChartOptionsStore).granularity('accounts-balance-history'),
    ).toBeUndefined();

    // The range moved between visits, so the next mount's seed is a different bucket.
    const second = runInInjectionContext(injector, () =>
      chartGranularity('accounts-balance-history', () => 'month'),
    );

    expect(second.value()).toBe('month');
  });
});

describe('chartSeriesFilter (TICKET-STAT-27)', () => {
  let injector: Injector;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    injector = TestBed.inject(Injector);
  });

  it('records a legend toggle and reads it straight back', () => {
    const filter = runInInjectionContext(injector, () =>
      chartSeriesFilter('accounts-balance-history', signal(['Checking', 'Savings'])),
    );

    filter.onLegendSelectChanged({ selected: { Checking: true, Savings: false } });

    expect(filter.hidden()).toEqual(['Savings']);
  });

  it('prunes a hidden name once it leaves the series list, so its return renders visible', () => {
    const names = signal<readonly string[]>(['Checking', 'Savings']);
    const filter = runInInjectionContext(injector, () =>
      chartSeriesFilter('accounts-balance-history', names),
    );
    filter.onLegendSelectChanged({ selected: { Checking: true, Savings: false } });

    // The account is deleted...
    names.set(['Checking']);
    TestBed.tick();
    // ...and a new one is later created with the same name.
    names.set(['Checking', 'Savings']);
    TestBed.tick();

    expect(filter.hidden()).toEqual([]);
  });

  it('keeps two chart ids apart, even when they list the same series name', () => {
    const income = runInInjectionContext(injector, () =>
      chartSeriesFilter('dashboard-trend-income', signal(['Groceries'])),
    );
    const expense = runInInjectionContext(injector, () =>
      chartSeriesFilter('dashboard-trend-expense', signal(['Groceries'])),
    );

    income.onLegendSelectChanged({ selected: { Groceries: false } });

    expect(income.hidden()).toEqual(['Groceries']);
    expect(expense.hidden()).toEqual([]);
  });
});

describe('chartZoomControl (TICKET-STAT-27)', () => {
  let injector: Injector;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    injector = TestBed.inject(Injector);
  });

  it('holds nothing until the user drags, so the chart keeps its range-scrubbed default', () => {
    const zoom = runInInjectionContext(injector, () => chartZoomControl('income-by-category'));

    expect(zoom.manual()).toBeUndefined();
  });

  it('keeps a dragged window, and ignores an event that carries no bounds', () => {
    const zoom = runInInjectionContext(injector, () => chartZoomControl('income-by-category'));

    zoom.onDataZoom({ start: 30, end: 90 });
    expect(zoom.manual()).toEqual({ start: 30, end: 90 });

    zoom.onDataZoom({});
    expect(zoom.manual()).toEqual({ start: 30, end: 90 });
  });
});
