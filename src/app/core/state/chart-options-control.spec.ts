import { Injector, runInInjectionContext, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  chartBillsView,
  chartCycle,
  chartGroupCategories,
  chartGranularity,
  chartSeriesFilter,
  chartStacked,
  chartVisibleMonth,
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

describe('chartVisibleMonth (TICKET-REC-03)', () => {
  let injector: Injector;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    injector = TestBed.inject(Injector);
  });

  it('seeds from the caller when the session holds nothing for that chart', () => {
    const month = runInInjectionContext(injector, () =>
      chartVisibleMonth('recurring-bills-calendar', () => '2026-08'),
    );

    expect(month.value()).toBe('2026-08');
  });

  it("adopts the session's value instead of re-seeding, so a remount keeps the browsed month", () => {
    TestBed.inject(ChartOptionsStore).setVisibleMonth('recurring-bills-calendar', '2026-11');

    const month = runInInjectionContext(injector, () =>
      chartVisibleMonth('recurring-bills-calendar', () => '2026-08'),
    );

    expect(month.value()).toBe('2026-11');
  });

  it('writes straight to the store, which is what a later mount reads back', () => {
    const month = runInInjectionContext(injector, () =>
      chartVisibleMonth('recurring-bills-calendar', () => '2026-08'),
    );

    month.set('2027-01');

    expect(TestBed.inject(ChartOptionsStore).visibleMonth('recurring-bills-calendar')).toBe(
      '2027-01',
    );
    expect(month.value()).toBe('2027-01');
  });

  it('never records the seed as a choice — it is clock-derived, so recording it would pin the month', () => {
    const month = runInInjectionContext(injector, () =>
      chartVisibleMonth('recurring-bills-calendar', () => '2026-08'),
    );

    expect(month.value()).toBe('2026-08');
    expect(
      TestBed.inject(ChartOptionsStore).visibleMonth('recurring-bills-calendar'),
    ).toBeUndefined();
  });
});

describe('chartBillsView (TICKET-REC-03)', () => {
  let injector: Injector;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    injector = TestBed.inject(Injector);
  });

  it('seeds from the caller when the session holds nothing for that chart', () => {
    const view = runInInjectionContext(injector, () =>
      chartBillsView('recurring-bills-calendar', () => 'calendar'),
    );

    expect(view.value()).toBe('calendar');
  });

  it("adopts the session's value instead of re-seeding, so a remount keeps the chosen view", () => {
    TestBed.inject(ChartOptionsStore).setBillsView('recurring-bills-calendar', 'list');

    const view = runInInjectionContext(injector, () =>
      chartBillsView('recurring-bills-calendar', () => 'calendar'),
    );

    expect(view.value()).toBe('list');
  });

  it('writes straight to the store, which is what a later mount reads back', () => {
    const view = runInInjectionContext(injector, () =>
      chartBillsView('recurring-bills-calendar', () => 'calendar'),
    );

    view.set('list');

    expect(TestBed.inject(ChartOptionsStore).billsView('recurring-bills-calendar')).toBe('list');
    expect(view.value()).toBe('list');
  });

  it('never records the seed as a choice', () => {
    const view = runInInjectionContext(injector, () =>
      chartBillsView('recurring-bills-calendar', () => 'calendar'),
    );

    expect(view.value()).toBe('calendar');
    expect(TestBed.inject(ChartOptionsStore).billsView('recurring-bills-calendar')).toBeUndefined();
  });

  it('is independent of the same chart id’s visible month — two choices, one entry', () => {
    const view = runInInjectionContext(injector, () =>
      chartBillsView('recurring-bills-calendar', () => 'calendar'),
    );
    const month = runInInjectionContext(injector, () =>
      chartVisibleMonth('recurring-bills-calendar', () => '2026-08'),
    );

    view.set('list');

    expect(month.value()).toBe('2026-08');
    expect(view.value()).toBe('list');
  });
});

describe('chartCycle (TICKET-STAT-30)', () => {
  let injector: Injector;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    injector = TestBed.inject(Injector);
  });

  it('seeds from the caller when the session holds nothing for that chart', () => {
    const cycle = runInInjectionContext(injector, () =>
      chartCycle('dashboard-heatmap', () => 'day-of-week'),
    );

    expect(cycle.value()).toBe('day-of-week');
  });

  it("adopts the session's value instead of re-seeding, so a remount keeps the user's axis", () => {
    TestBed.inject(ChartOptionsStore).setCycle('dashboard-heatmap', 'month-of-year');

    const cycle = runInInjectionContext(injector, () =>
      chartCycle('dashboard-heatmap', () => 'day-of-week'),
    );

    expect(cycle.value()).toBe('month-of-year');
  });

  it('writes straight to the store, which is what a later mount reads back', () => {
    const cycle = runInInjectionContext(injector, () =>
      chartCycle('dashboard-heatmap', () => 'day-of-week'),
    );

    cycle.set('quarter-of-year');

    expect(TestBed.inject(ChartOptionsStore).cycle('dashboard-heatmap')).toBe('quarter-of-year');
    expect(cycle.value()).toBe('quarter-of-year');
  });

  it('never records the seed as a choice', () => {
    const cycle = runInInjectionContext(injector, () =>
      chartCycle('dashboard-heatmap', () => 'day-of-week'),
    );

    expect(cycle.value()).toBe('day-of-week');
    expect(TestBed.inject(ChartOptionsStore).cycle('dashboard-heatmap')).toBeUndefined();
  });

  it('is independent of the same chart id’s bucket size — two vocabularies, one entry', () => {
    const cycle = runInInjectionContext(injector, () =>
      chartCycle('dashboard-heatmap', () => 'day-of-week'),
    );
    const granularity = runInInjectionContext(injector, () =>
      chartGranularity('dashboard-heatmap', () => 'month'),
    );

    cycle.set('quarter-of-year');

    expect(granularity.value()).toBe('month');
    expect(cycle.value()).toBe('quarter-of-year');
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

describe('chartGroupCategories (TICKET-EXP-03)', () => {
  let injector: Injector;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    injector = TestBed.inject(Injector);
  });

  it('seeds from the caller when the session holds nothing for that chart', () => {
    const grouping = runInInjectionContext(injector, () =>
      chartGroupCategories('explore-money-flow', () => true),
    );

    expect(grouping.value()).toBe(true);
  });

  it("adopts the session's value instead of re-seeding, so a remount keeps the user's choice", () => {
    TestBed.inject(ChartOptionsStore).setGroupCategories('explore-money-flow', false);

    const grouping = runInInjectionContext(injector, () =>
      chartGroupCategories('explore-money-flow', () => true),
    );

    expect(grouping.value()).toBe(false);
  });

  it('writes straight to the store, which is what a later mount reads back', () => {
    const grouping = runInInjectionContext(injector, () =>
      chartGroupCategories('explore-money-flow', () => true),
    );

    grouping.set(false);

    expect(TestBed.inject(ChartOptionsStore).groupCategories('explore-money-flow')).toBe(false);
    expect(grouping.value()).toBe(false);
  });

  it('never records the seed as a choice — `false` off the store must be the user, not the default', () => {
    const grouping = runInInjectionContext(injector, () =>
      chartGroupCategories('explore-money-flow', () => true),
    );

    expect(grouping.value()).toBe(true);
    expect(TestBed.inject(ChartOptionsStore).groupCategories('explore-money-flow')).toBeUndefined();
  });
});

describe('chartStacked (TICKET-ACC-12)', () => {
  let injector: Injector;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    injector = TestBed.inject(Injector);
  });

  it('seeds from the caller when the session holds nothing for that chart', () => {
    const stacked = runInInjectionContext(injector, () =>
      chartStacked('accounts-balance-history', () => false),
    );

    expect(stacked.value()).toBe(false);
  });

  it("adopts the session's value instead of re-seeding, so a remount keeps the combined view", () => {
    TestBed.inject(ChartOptionsStore).setStacked('accounts-balance-history', true);

    const stacked = runInInjectionContext(injector, () =>
      chartStacked('accounts-balance-history', () => false),
    );

    expect(stacked.value()).toBe(true);
  });

  it('writes straight to the store, which is what a later mount reads back', () => {
    const stacked = runInInjectionContext(injector, () =>
      chartStacked('accounts-balance-history', () => false),
    );

    stacked.set(true);

    expect(TestBed.inject(ChartOptionsStore).stacked('accounts-balance-history')).toBe(true);
    expect(stacked.value()).toBe(true);
  });

  it('never records the seed as a choice', () => {
    const stacked = runInInjectionContext(injector, () =>
      chartStacked('accounts-balance-history', () => false),
    );

    expect(stacked.value()).toBe(false);
    expect(TestBed.inject(ChartOptionsStore).stacked('accounts-balance-history')).toBeUndefined();
  });

  it("leaves the same chart id's hidden series alone — two choices, one entry", () => {
    const store = TestBed.inject(ChartOptionsStore);
    store.setHiddenSeries('accounts-balance-history', ['Savings']);

    const stacked = runInInjectionContext(injector, () =>
      chartStacked('accounts-balance-history', () => false),
    );
    stacked.set(true);

    expect(store.hiddenSeries('accounts-balance-history')).toEqual(['Savings']);
    expect(stacked.value()).toBe(true);
  });
});
