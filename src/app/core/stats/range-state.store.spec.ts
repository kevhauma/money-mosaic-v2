import { TestBed } from '@angular/core/testing';
import { RangeStore } from './range-state.store';

describe('RangeStore', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('setPreset applies the preset range and its default groupBy in one patch', () => {
    const rangeStore = TestBed.inject(RangeStore);

    rangeStore.setPreset('this-year');

    expect(rangeStore.preset()).toBe('this-year');
    expect(rangeStore.groupBy()).toBe('month');
  });

  it('setPreset("all-time") uses the caller-supplied range and defaults groupBy to quarter', () => {
    const rangeStore = TestBed.inject(RangeStore);

    rangeStore.setPreset('all-time', { from: '2015-03-01', to: '2026-07-08' });

    expect(rangeStore.preset()).toBe('all-time');
    expect(rangeStore.from()).toBe('2015-03-01');
    expect(rangeStore.to()).toBe('2026-07-08');
    expect(rangeStore.groupBy()).toBe('quarter');
  });

  it('setCustomRange patches groupBy to the span-based default', () => {
    const rangeStore = TestBed.inject(RangeStore);

    rangeStore.setCustomRange('2026-01-01', '2026-01-15');
    expect(rangeStore.groupBy()).toBe('day');

    rangeStore.setCustomRange('2010-01-01', '2026-01-01');
    expect(rangeStore.groupBy()).toBe('quarter');
  });

  it('selectCustomPreset only flips the preset flag, leaving from/to/groupBy untouched', () => {
    const rangeStore = TestBed.inject(RangeStore);
    rangeStore.setPreset('this-quarter');
    const { from, to, groupBy } = rangeStore;

    rangeStore.selectCustomPreset();

    expect(rangeStore.preset()).toBe('custom');
    expect(rangeStore.from()).toBe(from());
    expect(rangeStore.to()).toBe(to());
    expect(rangeStore.groupBy()).toBe(groupBy());
  });

  it('manual setGroupBy survives until the next preset/custom-range change', () => {
    const rangeStore = TestBed.inject(RangeStore);
    rangeStore.setPreset('this-year');

    rangeStore.setGroupBy('day');
    expect(rangeStore.groupBy()).toBe('day');

    rangeStore.setPreset('this-quarter');
    expect(rangeStore.groupBy()).toBe('week');
  });
});
