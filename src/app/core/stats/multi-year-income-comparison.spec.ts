import { computeMultiYearIncomeComparison } from './multi-year-income-comparison';
import type { YearlyIncomeEntry } from './yearly-income-summary';

const year = (year: string, total: number, isPartialYear = false): YearlyIncomeEntry => ({
  year,
  total,
  isPartialYear,
  pctVsPriorYear: null,
});

/** Six complete years, 2020–2025, rising 10k → 15k. */
const sixYears: YearlyIncomeEntry[] = [
  year('2020', 10000),
  year('2021', 11000),
  year('2022', 12000),
  year('2023', 13000),
  year('2024', 14000),
  year('2025', 15000),
];

describe('computeMultiYearIncomeComparison: span selection (FR-INC-7)', () => {
  it('compares the last 3 years for the 3-year span', () => {
    const result = computeMultiYearIncomeComparison(sixYears, 3);

    expect(result).toMatchObject({
      firstYear: '2023',
      firstYearTotal: 13000,
      lastYear: '2025',
      lastYearTotal: 15000,
    });
  });

  it('compares the last 5 years for the 5-year span', () => {
    expect(computeMultiYearIncomeComparison(sixYears, 5)).toMatchObject({
      firstYear: '2021',
      lastYear: '2025',
    });
  });

  it('spans every year present for all-time, even beyond 5', () => {
    expect(computeMultiYearIncomeComparison(sixYears, 'all-time')).toMatchObject({
      firstYear: '2020',
      firstYearTotal: 10000,
      lastYear: '2025',
      lastYearTotal: 15000,
    });
  });

  it('reports the aggregate change from the span’s first year to its last', () => {
    // 2020 → 2025: 10000 → 15000.
    expect(computeMultiYearIncomeComparison(sixYears, 'all-time')?.pctChange).toBeCloseTo(0.5);
  });

  it('reports a decline as a negative fraction of the first year', () => {
    const declining = [year('2023', 20000), year('2024', 18000), year('2025', 15000)];

    expect(computeMultiYearIncomeComparison(declining, 3)?.pctChange).toBeCloseTo(-0.25);
  });
});

describe('computeMultiYearIncomeComparison: truncation to available history', () => {
  const twoYears = [year('2024', 10000), year('2025', 12000)];

  it('compares the two years available when 5 years are requested, rather than erroring', () => {
    expect(computeMultiYearIncomeComparison(twoYears, 5)).toMatchObject({
      firstYear: '2024',
      lastYear: '2025',
    });
  });

  it('still computes the percentage over the truncated span', () => {
    expect(computeMultiYearIncomeComparison(twoYears, 5)?.pctChange).toBeCloseTo(0.2);
  });

  it('does not pad the missing years with zeros, which would read as a surge', () => {
    // Padding 2021–2023 with zeros would make the first year 0 and drop pctChange to null.
    expect(computeMultiYearIncomeComparison(twoYears, 5)?.firstYearTotal).toBe(10000);
  });
});

describe('computeMultiYearIncomeComparison: no percentage to report', () => {
  it('is null (not ±∞%) when the first year’s total is zero', () => {
    const result = computeMultiYearIncomeComparison([year('2024', 0), year('2025', 12000)], 3);

    expect(result?.firstYearTotal).toBe(0);
    expect(result?.pctChange).toBeNull();
  });

  it('is null with a single comparable year — there is nothing to compare it against', () => {
    const result = computeMultiYearIncomeComparison([year('2025', 12000)], 3);

    expect(result).toMatchObject({ firstYear: '2025', lastYear: '2025', pctChange: null });
  });

  it('returns null outright when the summary is empty', () => {
    expect(computeMultiYearIncomeComparison([], 'all-time')).toBeNull();
  });
});

describe('computeMultiYearIncomeComparison: partial years are not comparable', () => {
  const throughMid2026 = [...sixYears, year('2026', 7000, true)];

  it('ends the span at the last complete year rather than an in-progress one', () => {
    expect(computeMultiYearIncomeComparison(throughMid2026, 'all-time')).toMatchObject({
      lastYear: '2025',
      lastYearTotal: 15000,
    });
  });

  it('counts comparable years, not calendar ones, when taking the last 3', () => {
    expect(computeMultiYearIncomeComparison(throughMid2026, 3)).toMatchObject({
      firstYear: '2023',
      lastYear: '2025',
    });
  });

  it('drops a partial first year, whose basis is incomplete', () => {
    const fromMid2023 = [year('2023', 6000, true), year('2024', 14000), year('2025', 15000)];

    expect(computeMultiYearIncomeComparison(fromMid2023, 'all-time')?.firstYear).toBe('2024');
  });

  it('returns null when every year is partial — nothing comparable exists yet', () => {
    const result = computeMultiYearIncomeComparison(
      [year('2025', 6000, true), year('2026', 7000, true)],
      'all-time',
    );

    expect(result).toBeNull();
  });
});
