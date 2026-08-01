import type { SalaryMetadata } from '@/core/data-access';
import { collectIncomeEvents, groupIncomeEventsByYear } from './income-events';
import type { IncomeGap } from './income-gap-detection';
import type { IncomeStepChange } from './income-step-change-detection';

const stepChange = (
  changedAtBucketKey: string,
  direction: IncomeStepChange['direction'],
  categoryId = 1,
): IncomeStepChange => ({
  categoryId,
  changedAtBucketKey,
  direction,
  fromAvg: 2000,
  toAvg: direction === 'increase' ? 2400 : 1600,
  pctChange: direction === 'increase' ? 0.2 : -0.2,
});

const gap = (lastSeenBucketKey: string, categoryId = 2): IncomeGap => ({
  categoryId,
  lastSeenBucketKey,
  monthsMissing: 4,
});

const salaryRow = (yearMonth: string, overrides: Partial<SalaryMetadata> = {}): SalaryMetadata =>
  ({ yearMonth, grossWage: 3000, ...overrides }) as SalaryMetadata;

describe('collectIncomeEvents (FR-INC-14, TICKET-INC-17)', () => {
  it('merges all three sources into one list, newest first', () => {
    const events = collectIncomeEvents(
      [stepChange('2024-03', 'increase'), stepChange('2026-02', 'decrease')],
      [gap('2025-06')],
      [salaryRow('2025-12', { bonus: 1800 })],
    );

    expect(events.map((event) => [event.bucketKey, event.kind])).toEqual([
      ['2026-02', 'pay-cut'],
      ['2025-12', 'bonus'],
      ['2025-06', 'stream-stopped'],
      ['2024-03', 'raise'],
    ]);
  });

  it('breaks a tie between two events in the same month deterministically', () => {
    const events = collectIncomeEvents(
      [stepChange('2025-06', 'increase')],
      [gap('2025-06')],
      [salaryRow('2025-06', { bonus: 500 })],
    );

    // Same month three times over: ordered by how much each changes the income story.
    expect(events.map((event) => event.kind)).toEqual(['raise', 'stream-stopped', 'bonus']);
  });

  it('splits step changes into raises and pay cuts, carrying their figures', () => {
    const [raise] = collectIncomeEvents([stepChange('2026-01', 'increase')], [], []);

    expect(raise).toMatchObject({
      kind: 'raise',
      bucketKey: '2026-01',
      categoryId: 1,
      fromAvg: 2000,
      toAvg: 2400,
    });
    expect('direction' in raise).toBe(false);
  });

  it('carries a gap’s months-missing count through', () => {
    const [stopped] = collectIncomeEvents([], [gap('2025-06')], []);

    expect(stopped).toMatchObject({ kind: 'stream-stopped', categoryId: 2, monthsMissing: 4 });
  });

  it('turns a recorded bonus into an event carrying its amount', () => {
    const [bonus] = collectIncomeEvents([], [], [salaryRow('2025-12', { bonus: 1800 })]);

    expect(bonus).toEqual({ kind: 'bonus', bucketKey: '2025-12', amount: 1800 });
  });

  it('makes no event from a salary row that records a gross wage but no bonus', () => {
    expect(collectIncomeEvents([], [], [salaryRow('2025-12')])).toEqual([]);
  });

  it('makes no event from a bonus of zero — a recorded nothing is not a moment', () => {
    expect(collectIncomeEvents([], [], [salaryRow('2025-12', { bonus: 0 })])).toEqual([]);
  });

  it('returns an empty list when nothing was detected anywhere', () => {
    expect(collectIncomeEvents([], [], [])).toEqual([]);
  });
});

describe('groupIncomeEventsByYear (TICKET-INC-17)', () => {
  const THREE_YEARS = collectIncomeEvents(
    [stepChange('2024-03', 'increase'), stepChange('2026-02', 'decrease')],
    [],
    [salaryRow('2026-07', { bonus: 1800 }), salaryRow('2024-12', { bonus: 900 })],
  );

  it('returns years descending, with events descending inside each', () => {
    const grouped = groupIncomeEventsByYear(THREE_YEARS);

    expect(grouped.map((section) => section.year)).toEqual(['2026', '2024']);
    expect(grouped[0].events.map((event) => event.bucketKey)).toEqual(['2026-07', '2026-02']);
    expect(grouped[1].events.map((event) => event.bucketKey)).toEqual(['2024-12', '2024-03']);
  });

  it('omits a year with no events rather than rendering an empty heading', () => {
    // 2025 sits between the two populated years and contributes nothing.
    expect(groupIncomeEventsByYear(THREE_YEARS).map((section) => section.year)).not.toContain(
      '2025',
    );
  });

  it('returns an empty list for no events at all', () => {
    expect(groupIncomeEventsByYear([])).toEqual([]);
  });
});
