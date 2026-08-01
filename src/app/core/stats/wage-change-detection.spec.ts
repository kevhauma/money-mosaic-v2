import type { GrossNetRatioPoint } from './gross-net-ratio';
import { detectWageChanges } from './wage-change-detection';

const point = (
  bucketKey: string,
  net: number,
  gross: number | null = null,
): GrossNetRatioPoint => ({
  bucketKey,
  net,
  gross,
  ratio: gross === null || gross === 0 ? null : net / gross,
});

const netChanges = (points: GrossNetRatioPoint[]) =>
  detectWageChanges(points).filter((change) => change.series === 'net');

const grossChanges = (points: GrossNetRatioPoint[]) =>
  detectWageChanges(points).filter((change) => change.series === 'gross');

describe('detectWageChanges: what counts as a move (TICKET-INC-17)', () => {
  it('reports a rise past the threshold, with both levels and the signed change', () => {
    const [change] = netChanges([point('2026-01', 2000), point('2026-02', 2100)]);

    expect(change).toEqual({
      series: 'net',
      bucketKey: '2026-02',
      fromBucketKey: '2026-01',
      from: 2000,
      to: 2100,
      delta: 100,
      pct: 0.05,
    });
  });

  it('reports a cut as a negative change rather than as a separate kind', () => {
    const [change] = netChanges([point('2026-01', 2000), point('2026-02', 1900)]);

    expect(change.delta).toBe(-100);
    expect(change.pct).toBeCloseTo(-0.05);
  });

  it('ignores a move at or below 1% — rounding and a shifted pay date are not raises', () => {
    expect(netChanges([point('2026-01', 2000), point('2026-02', 2020)])).toEqual([]);
    expect(netChanges([point('2026-01', 2000), point('2026-02', 1980)])).toEqual([]);
  });

  it('reports a move just past 1%', () => {
    expect(netChanges([point('2026-01', 2000), point('2026-02', 2021)])).toHaveLength(1);
  });

  it('reports nothing at all for a perfectly flat wage', () => {
    expect(detectWageChanges([point('2026-01', 2000, 3000), point('2026-02', 2000, 3000)])).toEqual(
      [],
    );
  });

  it('reports every move, not just the first — this is a record, not a summary', () => {
    const changes = netChanges([
      point('2026-01', 2000),
      point('2026-02', 2100),
      point('2026-03', 2100),
      point('2026-04', 2300),
    ]);

    expect(changes.map((change) => change.bucketKey)).toEqual(['2026-02', '2026-04']);
  });
});

describe('detectWageChanges: the two series', () => {
  it('tracks net and gross independently', () => {
    const points = [point('2026-01', 2000, 3000), point('2026-02', 2100, 3000)];

    expect(netChanges(points)).toHaveLength(1);
    expect(grossChanges(points)).toEqual([]);
  });

  it('reports both when both moved in the same month', () => {
    const changes = detectWageChanges([point('2026-01', 2000, 3000), point('2026-02', 2100, 3200)]);

    expect(changes.map((change) => change.series).sort()).toEqual(['gross', 'net']);
  });

  it('reports a gross move even when net stayed flat — a rising deduction rate', () => {
    const points = [point('2026-01', 2000, 3000), point('2026-02', 2000, 3200)];

    expect(netChanges(points)).toEqual([]);
    expect(grossChanges(points)[0].pct).toBeCloseTo(200 / 3000);
  });
});

describe('detectWageChanges: months with nothing to measure', () => {
  it('measures from the previous month that had a figure, skipping a gap', () => {
    // Gross is only entered for January and March; February must not break the comparison.
    const [change] = grossChanges([
      point('2026-01', 2000, 3000),
      point('2026-02', 2000, null),
      point('2026-03', 2000, 3300),
    ]);

    expect(change).toMatchObject({ fromBucketKey: '2026-01', bucketKey: '2026-03', delta: 300 });
  });

  it('never turns a month with no income into a ±100% move', () => {
    const changes = netChanges([
      point('2026-01', 2000),
      point('2026-02', 0),
      point('2026-03', 2000),
    ]);

    expect(changes).toEqual([]);
  });

  it('skips a month whose net came out negative rather than reporting a wild swing', () => {
    // Reachable: `computeGrossNetRatio` subtracts a recorded bonus from what the counted categories
    // received, so a bonus noted against a month with no counted income lands below zero.
    const changes = netChanges([
      point('2026-01', 2000),
      point('2026-02', -1800),
      point('2026-03', 2100),
    ]);

    expect(changes.map((change) => change.bucketKey)).toEqual(['2026-03']);
    expect(changes[0].fromBucketKey).toBe('2026-01');
  });

  it('reports nothing for a single month — there is nothing to measure against', () => {
    expect(detectWageChanges([point('2026-01', 2000, 3000)])).toEqual([]);
  });

  it('reports nothing for an empty series', () => {
    expect(detectWageChanges([])).toEqual([]);
  });
});
