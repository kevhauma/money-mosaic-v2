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

  it('shiftRange on a calendar-aligned preset shifts by its calendar unit and flips preset to custom', () => {
    const rangeStore = TestBed.inject(RangeStore);
    rangeStore.setPreset('this-month');
    const { from, to } = rangeStore;
    const originalFrom = from();
    const originalTo = to();

    rangeStore.shiftRange(-1);

    expect(rangeStore.preset()).toBe('custom');
    // "previous" on a calendar-aligned range steps back a whole month, recomputing that
    // month's real length rather than shifting by a fixed day-count.
    expect(rangeStore.from()).not.toBe(originalFrom);
    expect(rangeStore.to()).not.toBe(originalTo);
    expect(new Date(rangeStore.to()).getTime()).toBeLessThan(new Date(originalFrom).getTime());
  });

  it('shiftRange on a rolling-window preset shifts by the current span length and flips preset to custom', () => {
    const rangeStore = TestBed.inject(RangeStore);
    rangeStore.setPreset('last-31-days');
    const { from, to } = rangeStore;
    const originalFrom = from();
    const originalTo = to();
    const dayMs = 24 * 60 * 60 * 1000;
    const spanDays = (new Date(originalTo).getTime() - new Date(originalFrom).getTime()) / dayMs;

    rangeStore.shiftRange(1);

    expect(rangeStore.preset()).toBe('custom');
    // "next" moves the window forward so it picks up immediately where the old one ended.
    expect(new Date(rangeStore.from()).getTime() - dayMs).toBe(new Date(originalTo).getTime());
    const shiftedSpanDays =
      (new Date(rangeStore.to()).getTime() - new Date(rangeStore.from()).getTime()) / dayMs;
    expect(shiftedSpanDays).toBe(spanDays);
  });

  it('shiftRange on an already-custom range shifts by its span length and keeps preset as custom', () => {
    const rangeStore = TestBed.inject(RangeStore);
    rangeStore.setCustomRange('2026-01-01', '2026-01-15');

    rangeStore.shiftRange(-1);

    expect(rangeStore.preset()).toBe('custom');
    expect(rangeStore.from()).toBe('2025-12-17');
    expect(rangeStore.to()).toBe('2025-12-31');
  });

  it('keeps landing on clean calendar-year boundaries across repeated "previous" clicks, even across a leap year (regression)', () => {
    const rangeStore = TestBed.inject(RangeStore);
    rangeStore.setPreset('last-year');
    const startYear = new Date(rangeStore.from()).getUTCFullYear();

    // Three clicks flips preset to 'custom' after the first one, and is guaranteed to cross a
    // leap year (every span of 4 consecutive years contains one) — this is exactly the scenario
    // that used to drift onto e.g. 12/31 boundaries instead of clean Jan 1 - Dec 31 ones, because
    // once 'custom', the shift used to fall back to a fixed day-count instead of a calendar-unit.
    rangeStore.shiftRange(-1);
    rangeStore.shiftRange(-1);
    rangeStore.shiftRange(-1);

    expect(rangeStore.preset()).toBe('custom');
    expect(rangeStore.from()).toBe(`${startYear - 3}-01-01`);
    expect(rangeStore.to()).toBe(`${startYear - 3}-12-31`);
  });

  it('keeps landing on clean calendar-month boundaries across repeated "next" clicks', () => {
    const rangeStore = TestBed.inject(RangeStore);
    rangeStore.setPreset('this-month');

    rangeStore.shiftRange(1);
    rangeStore.shiftRange(1);

    expect(rangeStore.preset()).toBe('custom');
    const from = new Date(rangeStore.from());
    const to = new Date(rangeStore.to());
    // Still a clean 1st-of-month to last-of-month span, whatever month it landed on.
    expect(from.getUTCDate()).toBe(1);
    expect(to.getUTCDate()).toBe(
      new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth() + 1, 0)).getUTCDate(),
    );
  });

  it('shiftRange is a no-op while "year-to-date" or "all-time" is selected', () => {
    const rangeStore = TestBed.inject(RangeStore);
    rangeStore.setPreset('year-to-date');
    const { from, to } = rangeStore;

    rangeStore.shiftRange(-1);

    expect(rangeStore.preset()).toBe('year-to-date');
    expect(rangeStore.from()).toBe(from());
    expect(rangeStore.to()).toBe(to());
  });
});
