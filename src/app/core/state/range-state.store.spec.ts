import { TestBed } from '@angular/core/testing';
import { RangeStore } from './range-state.store';

// Every case below runs against the `dashboard` page; the page argument is the only thing
// TICKET-UI-23 changed about these behaviours, and the isolation describe at the bottom is what
// proves the second page is a genuinely separate range rather than an alias of the first.
describe('RangeStore', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('setPreset applies the preset range', () => {
    const rangeStore = TestBed.inject(RangeStore);

    rangeStore.setPreset('dashboard', 'this-year');

    expect(rangeStore.preset('dashboard')).toBe('this-year');
  });

  it('setPreset("all-time") uses the caller-supplied range', () => {
    const rangeStore = TestBed.inject(RangeStore);

    rangeStore.setPreset('dashboard', 'all-time', { from: '2015-03-01', to: '2026-07-08' });

    expect(rangeStore.preset('dashboard')).toBe('all-time');
    expect(rangeStore.from('dashboard')).toBe('2015-03-01');
    expect(rangeStore.to('dashboard')).toBe('2026-07-08');
  });

  it('setCustomRange applies the custom preset and range', () => {
    const rangeStore = TestBed.inject(RangeStore);

    rangeStore.setCustomRange('dashboard', '2026-01-01', '2026-01-15');

    expect(rangeStore.preset('dashboard')).toBe('custom');
    expect(rangeStore.from('dashboard')).toBe('2026-01-01');
    expect(rangeStore.to('dashboard')).toBe('2026-01-15');
  });

  it('selectCustomPreset only flips the preset flag, leaving from/to untouched', () => {
    const rangeStore = TestBed.inject(RangeStore);
    rangeStore.setPreset('dashboard', 'this-quarter');
    const originalFrom = rangeStore.from('dashboard');
    const originalTo = rangeStore.to('dashboard');

    rangeStore.selectCustomPreset('dashboard');

    expect(rangeStore.preset('dashboard')).toBe('custom');
    expect(rangeStore.from('dashboard')).toBe(originalFrom);
    expect(rangeStore.to('dashboard')).toBe(originalTo);
  });

  it('shiftRange on a calendar-aligned preset shifts by its calendar unit and flips preset to custom', () => {
    const rangeStore = TestBed.inject(RangeStore);
    rangeStore.setPreset('dashboard', 'this-month');
    const originalFrom = rangeStore.from('dashboard');
    const originalTo = rangeStore.to('dashboard');

    rangeStore.shiftRange('dashboard', -1);

    expect(rangeStore.preset('dashboard')).toBe('custom');
    // "previous" on a calendar-aligned range steps back a whole month, recomputing that
    // month's real length rather than shifting by a fixed day-count.
    expect(rangeStore.from('dashboard')).not.toBe(originalFrom);
    expect(rangeStore.to('dashboard')).not.toBe(originalTo);
    expect(new Date(rangeStore.to('dashboard')).getTime()).toBeLessThan(
      new Date(originalFrom).getTime(),
    );
  });

  it('shiftRange on a rolling-window preset shifts by the current span length and flips preset to custom', () => {
    const rangeStore = TestBed.inject(RangeStore);
    rangeStore.setPreset('dashboard', 'last-31-days');
    const originalFrom = rangeStore.from('dashboard');
    const originalTo = rangeStore.to('dashboard');
    const dayMs = 24 * 60 * 60 * 1000;
    const spanDays = (new Date(originalTo).getTime() - new Date(originalFrom).getTime()) / dayMs;

    rangeStore.shiftRange('dashboard', 1);

    expect(rangeStore.preset('dashboard')).toBe('custom');
    // "next" moves the window forward so it picks up immediately where the old one ended.
    expect(new Date(rangeStore.from('dashboard')).getTime() - dayMs).toBe(
      new Date(originalTo).getTime(),
    );
    const shiftedSpanDays =
      (new Date(rangeStore.to('dashboard')).getTime() -
        new Date(rangeStore.from('dashboard')).getTime()) /
      dayMs;
    expect(shiftedSpanDays).toBe(spanDays);
  });

  it('shiftRange on an already-custom range shifts by its span length and keeps preset as custom', () => {
    const rangeStore = TestBed.inject(RangeStore);
    rangeStore.setCustomRange('dashboard', '2026-01-01', '2026-01-15');

    rangeStore.shiftRange('dashboard', -1);

    expect(rangeStore.preset('dashboard')).toBe('custom');
    expect(rangeStore.from('dashboard')).toBe('2025-12-17');
    expect(rangeStore.to('dashboard')).toBe('2025-12-31');
  });

  it('keeps landing on clean calendar-year boundaries across repeated "previous" clicks, even across a leap year (regression)', () => {
    const rangeStore = TestBed.inject(RangeStore);
    rangeStore.setPreset('dashboard', 'last-year');
    const startYear = new Date(rangeStore.from('dashboard')).getUTCFullYear();

    // Three clicks flips preset to 'custom' after the first one, and is guaranteed to cross a
    // leap year (every span of 4 consecutive years contains one) — this is exactly the scenario
    // that used to drift onto e.g. 12/31 boundaries instead of clean Jan 1 - Dec 31 ones, because
    // once 'custom', the shift used to fall back to a fixed day-count instead of a calendar-unit.
    rangeStore.shiftRange('dashboard', -1);
    rangeStore.shiftRange('dashboard', -1);
    rangeStore.shiftRange('dashboard', -1);

    expect(rangeStore.preset('dashboard')).toBe('custom');
    expect(rangeStore.from('dashboard')).toBe(`${startYear - 3}-01-01`);
    expect(rangeStore.to('dashboard')).toBe(`${startYear - 3}-12-31`);
  });

  it('keeps landing on clean calendar-month boundaries across repeated "next" clicks', () => {
    const rangeStore = TestBed.inject(RangeStore);
    rangeStore.setPreset('dashboard', 'this-month');

    rangeStore.shiftRange('dashboard', 1);
    rangeStore.shiftRange('dashboard', 1);

    expect(rangeStore.preset('dashboard')).toBe('custom');
    const from = new Date(rangeStore.from('dashboard'));
    const to = new Date(rangeStore.to('dashboard'));
    // Still a clean 1st-of-month to last-of-month span, whatever month it landed on.
    expect(from.getUTCDate()).toBe(1);
    expect(to.getUTCDate()).toBe(
      new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth() + 1, 0)).getUTCDate(),
    );
  });

  it('shiftRange is a no-op while "year-to-date" or "all-time" is selected', () => {
    const rangeStore = TestBed.inject(RangeStore);
    rangeStore.setPreset('dashboard', 'year-to-date');
    const originalFrom = rangeStore.from('dashboard');
    const originalTo = rangeStore.to('dashboard');

    rangeStore.shiftRange('dashboard', -1);

    expect(rangeStore.preset('dashboard')).toBe('year-to-date');
    expect(rangeStore.from('dashboard')).toBe(originalFrom);
    expect(rangeStore.to('dashboard')).toBe(originalTo);
  });
});

describe('RangeStore: one range per page (TICKET-UI-23)', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('every range-owning page starts on this-month', () => {
    const rangeStore = TestBed.inject(RangeStore);

    expect(rangeStore.preset('dashboard')).toBe('this-month');
    expect(rangeStore.preset('accounts')).toBe('this-month');
    expect(rangeStore.preset('explore')).toBe('this-month');
    expect(rangeStore.from('dashboard')).toBe(rangeStore.from('accounts'));
    expect(rangeStore.to('dashboard')).toBe(rangeStore.to('accounts'));
    expect(rangeStore.from('dashboard')).toBe(rangeStore.from('explore'));
    expect(rangeStore.to('dashboard')).toBe(rangeStore.to('explore'));
  });

  it('setting the Explore range leaves the Dashboard range untouched, and vice versa (TICKET-EXP-01)', () => {
    const rangeStore = TestBed.inject(RangeStore);
    const dashboardFrom = rangeStore.from('dashboard');

    rangeStore.setCustomRange('explore', '2023-05-01', '2023-05-31');

    expect(rangeStore.preset('explore')).toBe('custom');
    expect(rangeStore.from('explore')).toBe('2023-05-01');
    expect(rangeStore.preset('dashboard')).toBe('this-month');
    expect(rangeStore.from('dashboard')).toBe(dashboardFrom);

    rangeStore.setPreset('dashboard', 'last-year');

    expect(rangeStore.from('explore')).toBe('2023-05-01');
    expect(rangeStore.to('explore')).toBe('2023-05-31');
  });

  it('setting the Dashboard range leaves the Accounts range untouched', () => {
    const rangeStore = TestBed.inject(RangeStore);
    const accountsFrom = rangeStore.from('accounts');
    const accountsTo = rangeStore.to('accounts');

    rangeStore.setPreset('dashboard', 'last-year');

    expect(rangeStore.preset('dashboard')).toBe('last-year');
    expect(rangeStore.preset('accounts')).toBe('this-month');
    expect(rangeStore.from('accounts')).toBe(accountsFrom);
    expect(rangeStore.to('accounts')).toBe(accountsTo);
  });

  it('setting the Accounts range leaves the Dashboard range untouched', () => {
    const rangeStore = TestBed.inject(RangeStore);
    const dashboardFrom = rangeStore.from('dashboard');
    const dashboardTo = rangeStore.to('dashboard');

    rangeStore.setCustomRange('accounts', '2024-02-01', '2024-02-29');

    expect(rangeStore.preset('accounts')).toBe('custom');
    expect(rangeStore.from('accounts')).toBe('2024-02-01');
    expect(rangeStore.preset('dashboard')).toBe('this-month');
    expect(rangeStore.from('dashboard')).toBe(dashboardFrom);
    expect(rangeStore.to('dashboard')).toBe(dashboardTo);
  });

  it('shifting one page never shifts the other', () => {
    const rangeStore = TestBed.inject(RangeStore);
    const dashboardFrom = rangeStore.from('dashboard');

    rangeStore.shiftRange('accounts', -1);

    expect(rangeStore.preset('accounts')).toBe('custom');
    expect(rangeStore.from('accounts')).not.toBe(dashboardFrom);
    expect(rangeStore.from('dashboard')).toBe(dashboardFrom);
  });

  it('all-time resolves per page from the caller-supplied full-history range', () => {
    const rangeStore = TestBed.inject(RangeStore);

    rangeStore.setPreset('accounts', 'all-time', { from: '2015-03-01', to: '2026-07-08' });

    expect(rangeStore.preset('accounts')).toBe('all-time');
    expect(rangeStore.from('accounts')).toBe('2015-03-01');
    expect(rangeStore.preset('dashboard')).toBe('this-month');
    expect(rangeStore.from('dashboard')).not.toBe('2015-03-01');
  });
});
