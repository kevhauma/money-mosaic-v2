import { resolvePresetRange } from './date-buckets';
import { computeComparisonWindow } from './period-window';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

describe('computeComparisonWindow', () => {
  it('returns null for all-time — there is no "previous all-time" to compare against', () => {
    expect(
      computeComparisonWindow(
        { preset: 'all-time', from: '2020-01-01', to: '2026-01-01' },
        '2026-07-12',
      ),
    ).toBeNull();
  });

  it('is a trailing-only window when the selection is the period containing today (this-month)', () => {
    const window = computeComparisonWindow(
      { preset: 'this-month', from: '2026-07-01', to: '2026-07-31' },
      '2026-07-12',
    );

    expect(window).toEqual([
      { from: '2026-03-01', to: '2026-03-31', isSelected: false },
      { from: '2026-04-01', to: '2026-04-30', isSelected: false },
      { from: '2026-05-01', to: '2026-05-31', isSelected: false },
      { from: '2026-06-01', to: '2026-06-30', isSelected: false },
      { from: '2026-07-01', to: '2026-07-31', isSelected: true },
    ]);
  });

  it('reaches 1 period forward + 3 back when the selection is the immediately-preceding period (last-month)', () => {
    const window = computeComparisonWindow(
      { preset: 'last-month', from: '2026-06-01', to: '2026-06-30' },
      '2026-07-12',
    );

    expect(window).toEqual([
      { from: '2026-03-01', to: '2026-03-31', isSelected: false },
      { from: '2026-04-01', to: '2026-04-30', isSelected: false },
      { from: '2026-05-01', to: '2026-05-31', isSelected: false },
      { from: '2026-06-01', to: '2026-06-30', isSelected: true },
      { from: '2026-07-01', to: '2026-07-31', isSelected: false },
    ]);
  });

  it('is a plain trailing window when the selection is more than 4 periods in the past (custom, day-count)', () => {
    // A 30-day custom period ~8 months before "today" — well beyond the 4-period reach.
    const window = computeComparisonWindow(
      { preset: 'custom', from: '2025-11-01', to: '2025-11-30' },
      '2026-07-12',
    )!;

    expect(window).toHaveLength(5);
    // The selected period is the most recent (last) entry — a plain trailing window, not reaching "now".
    expect(window[4]).toEqual({ from: '2025-11-01', to: '2025-11-30', isSelected: true });
    expect(window.filter((p) => p.isSelected)).toHaveLength(1);

    // Every period is a contiguous, equal-length (30-day) block.
    for (const p of window) {
      const days =
        (Date.parse(`${p.to}T00:00:00Z`) - Date.parse(`${p.from}T00:00:00Z`)) / MS_PER_DAY + 1;
      expect(days).toBe(30);
    }
    for (let i = 0; i < window.length - 1; i++) {
      const gapMs =
        Date.parse(`${window[i + 1].from}T00:00:00Z`) - Date.parse(`${window[i].to}T00:00:00Z`);
      expect(gapMs).toBe(MS_PER_DAY);
    }
  });

  it('shifts a day-count preset (last-31-days) that already reaches today with no forward steps needed', () => {
    const window = computeComparisonWindow(
      { preset: 'last-31-days', from: '2026-06-12', to: '2026-07-12' },
      '2026-07-12',
    )!;

    expect(window[4]).toEqual({ from: '2026-06-12', to: '2026-07-12', isSelected: true });
  });

  it('does not misalign a shifted month across a non-leap February (month-length drift check)', () => {
    const window = computeComparisonWindow(
      { preset: 'this-month', from: '2026-03-01', to: '2026-03-31' },
      '2026-03-15',
    )!;

    // 1 month back from March 2026 is February 2026 — a real 28-day month, not "30 days before March 1".
    expect(window[3]).toEqual({ from: '2026-02-01', to: '2026-02-28', isSelected: false });
  });

  it('lands on a leap-year February when shifting into one (month-length drift check)', () => {
    const window = computeComparisonWindow(
      { preset: 'this-month', from: '2024-03-01', to: '2024-03-31' },
      '2024-03-15',
    )!;

    expect(window[3]).toEqual({ from: '2024-02-01', to: '2024-02-29', isSelected: false });
  });

  it('shifts a quarter-granularity preset by whole calendar quarters (this-quarter)', () => {
    const window = computeComparisonWindow(
      { preset: 'this-quarter', from: '2026-07-01', to: '2026-09-30' },
      '2026-07-12',
    )!;

    // 1 quarter back from Q3 2026 is Q2 2026 (Apr-Jun).
    expect(window[3]).toEqual({ from: '2026-04-01', to: '2026-06-30', isSelected: false });
  });

  it('shifts a year-granularity preset by whole calendar years (this-year)', () => {
    const window = computeComparisonWindow(
      { preset: 'this-year', from: '2026-01-01', to: '2026-12-31' },
      '2026-07-12',
    )!;

    expect(window[3]).toEqual({ from: '2025-01-01', to: '2025-12-31', isSelected: false });
  });

  it('shifts a week-granularity preset by whole 7-day weeks (this-week)', () => {
    const todayIso = '2026-07-08';
    const selected = resolvePresetRange('this-week', todayIso);

    const window = computeComparisonWindow({ preset: 'this-week', ...selected }, todayIso)!;

    expect(window).toHaveLength(5);
    expect(window[4]).toEqual({ ...selected, isSelected: true });
    for (let i = 0; i < window.length - 1; i++) {
      const gapMs =
        Date.parse(`${window[i + 1].from}T00:00:00Z`) - Date.parse(`${window[i].to}T00:00:00Z`);
      expect(gapMs).toBe(MS_PER_DAY);
      const days =
        (Date.parse(`${window[i].to}T00:00:00Z`) - Date.parse(`${window[i].from}T00:00:00Z`)) /
          MS_PER_DAY +
        1;
      expect(days).toBe(7);
    }
  });

  it('shifts year-to-date (variable day-count) by its own exact length', () => {
    const window = computeComparisonWindow(
      { preset: 'year-to-date', from: '2026-01-01', to: '2026-07-12' },
      '2026-07-12',
    )!;

    expect(window[4]).toEqual({ from: '2026-01-01', to: '2026-07-12', isSelected: true });
  });
});
