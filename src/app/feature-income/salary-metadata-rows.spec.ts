import type { SalaryMetadata } from '@/core/data-access';
import { buildSalaryMetadataSections, monthLabel } from './salary-metadata-rows';

const months = (...yearMonths: string[]): string[] => yearMonths;

describe('monthLabel (FR-INC-10, TICKET-INC-10)', () => {
  it('names the month and the year, so a row read out of context still says which month it is', () => {
    expect(monthLabel('2025-07')).toBe('July 2025');
  });

  it('handles both ends of the year', () => {
    expect(monthLabel('2025-01')).toBe('January 2025');
    expect(monthLabel('2025-12')).toBe('December 2025');
  });
});

describe('buildSalaryMetadataSections (FR-INC-10, TICKET-INC-10)', () => {
  it('gives every month in range a row, whether or not it has a stored entry', () => {
    const sections = buildSalaryMetadataSections(
      months('2026-01', '2026-02', '2026-03'),
      new Map(),
    );

    expect(sections).toHaveLength(1);
    expect(sections[0].rows.map((row) => row.yearMonth)).toEqual(['2026-01', '2026-02', '2026-03']);
    expect(sections[0].rows.every((row) => row.grossWage === null && row.bonus === null)).toBe(
      true,
    );
  });

  it('fills a row from its stored entry', () => {
    const byMonth = new Map<string, SalaryMetadata>([
      ['2026-02', { id: 1, yearMonth: '2026-02', grossWage: 3500, bonus: 900 }],
    ]);

    const [{ rows }] = buildSalaryMetadataSections(months('2026-01', '2026-02'), byMonth);

    expect(rows[1]).toMatchObject({ grossWage: 3500, bonus: 900 });
    expect(rows[0]).toMatchObject({ grossWage: null, bonus: null });
  });

  it('leaves a field null when only the other one is stored', () => {
    const byMonth = new Map<string, SalaryMetadata>([
      ['2026-01', { id: 1, yearMonth: '2026-01', grossWage: 3500 }],
    ]);

    expect(buildSalaryMetadataSections(months('2026-01'), byMonth)[0].rows[0]).toMatchObject({
      grossWage: 3500,
      bonus: null,
    });
  });

  it('groups rows into one section per calendar year, newest year first', () => {
    const sections = buildSalaryMetadataSections(
      months('2024-11', '2024-12', '2025-01', '2026-01'),
      new Map(),
    );

    expect(sections.map((section) => section.year)).toEqual(['2026', '2025', '2024']);
    expect(sections[2].rows).toHaveLength(2);
  });

  it('keeps months ascending within a year', () => {
    const sections = buildSalaryMetadataSections(
      months('2025-01', '2025-06', '2025-12'),
      new Map(),
    );

    expect(sections[0].rows.map((row) => row.label)).toEqual([
      'January 2025',
      'June 2025',
      'December 2025',
    ]);
  });

  it('renders the months a partial year actually covers, not a padded twelve', () => {
    // History starting in October gives October–December, not a year of rows the range can't show.
    const sections = buildSalaryMetadataSections(
      months('2025-10', '2025-11', '2025-12'),
      new Map(),
    );

    expect(sections[0].rows).toHaveLength(3);
  });

  it('returns nothing for an empty range', () => {
    expect(buildSalaryMetadataSections([], new Map())).toEqual([]);
  });
});
