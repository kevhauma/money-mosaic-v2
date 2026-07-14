import { TestBed } from '@angular/core/testing';
import { RangeStore } from './range-state.store';

describe('RangeStore', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('setPreset applies the preset range', () => {
    const rangeStore = TestBed.inject(RangeStore);

    rangeStore.setPreset('this-year');

    expect(rangeStore.preset()).toBe('this-year');
  });

  it('setPreset("all-time") uses the caller-supplied range', () => {
    const rangeStore = TestBed.inject(RangeStore);

    rangeStore.setPreset('all-time', { from: '2015-03-01', to: '2026-07-08' });

    expect(rangeStore.preset()).toBe('all-time');
    expect(rangeStore.from()).toBe('2015-03-01');
    expect(rangeStore.to()).toBe('2026-07-08');
  });

  it('setCustomRange applies the custom preset and range', () => {
    const rangeStore = TestBed.inject(RangeStore);

    rangeStore.setCustomRange('2026-01-01', '2026-01-15');

    expect(rangeStore.preset()).toBe('custom');
    expect(rangeStore.from()).toBe('2026-01-01');
    expect(rangeStore.to()).toBe('2026-01-15');
  });

  it('selectCustomPreset only flips the preset flag, leaving from/to untouched', () => {
    const rangeStore = TestBed.inject(RangeStore);
    rangeStore.setPreset('this-quarter');
    const { from, to } = rangeStore;

    rangeStore.selectCustomPreset();

    expect(rangeStore.preset()).toBe('custom');
    expect(rangeStore.from()).toBe(from());
    expect(rangeStore.to()).toBe(to());
  });
});
