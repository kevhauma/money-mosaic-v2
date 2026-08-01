import { computeGrossNetGrowth } from './gross-net-growth';
import type { GrossNetRatioPoint } from './gross-net-ratio';

const ratioPoint = (bucketKey: string, net: number, gross: number | null): GrossNetRatioPoint => ({
  bucketKey,
  net,
  gross,
  ratio: gross === null || gross === 0 ? null : net / gross,
});

describe('computeGrossNetGrowth: the shared baseline (FR-INC-13, TICKET-INC-16)', () => {
  it('anchors on the earliest bucket where gross and net are both known', () => {
    // Net runs from January; gross is only recorded from April.
    const points = [
      ratioPoint('2026-01', 2000, null),
      ratioPoint('2026-02', 2000, null),
      ratioPoint('2026-03', 2000, null),
      ratioPoint('2026-04', 2160, 3000),
      ratioPoint('2026-05', 2300, 3300),
    ];

    const growth = computeGrossNetGrowth(points);

    for (const point of growth.slice(0, 3)) {
      expect(point.grossFromStart).toBeNull();
      expect(point.netFromStart).toBeNull();
      expect(point.grossPctFromStart).toBeNull();
      expect(point.netPctFromStart).toBeNull();
    }
    expect(growth[3]).toMatchObject({
      grossFromStart: 0,
      netFromStart: 0,
      grossPctFromStart: 0,
      netPctFromStart: 0,
    });
  });

  it('still reports the levels for the months before the baseline — they are real data', () => {
    const growth = computeGrossNetGrowth([
      ratioPoint('2026-01', 2000, null),
      ratioPoint('2026-02', 2160, 3000),
    ]);

    expect(growth[0].netValue).toBe(2000);
    expect(growth[0].grossValue).toBeNull();
  });

  it('uses one baseline for both series, not one each', () => {
    // If net were anchored on its own first month (2,000) rather than the shared April baseline
    // (2,160), February would read as +8% instead of 0%.
    const growth = computeGrossNetGrowth([
      ratioPoint('2026-01', 2000, null),
      ratioPoint('2026-02', 2160, 3000),
    ]);

    expect(growth[1].netPctFromStart).toBe(0);
  });

  it('leaves every from-start field null when no month has a gross wage at all', () => {
    const growth = computeGrossNetGrowth([
      ratioPoint('2026-01', 2000, null),
      ratioPoint('2026-02', 2100, null),
    ]);

    expect(growth.every((point) => point.netFromStart === null)).toBe(true);
    expect(growth.every((point) => point.grossPctFromStart === null)).toBe(true);
    expect(growth[1].netValue).toBe(2100);
  });
});

describe('computeGrossNetGrowth: the distances', () => {
  const A_RAISE = [
    ratioPoint('2026-01', 2160, 3000),
    ratioPoint('2026-02', 2300, 3300),
    ratioPoint('2026-03', 2000, 2800),
  ];

  it('reports value − baseline for a rise and for a cut', () => {
    const growth = computeGrossNetGrowth(A_RAISE);

    expect(growth[1].grossFromStart).toBe(300);
    expect(growth[1].netFromStart).toBe(140);
    expect(growth[2].grossFromStart).toBe(-200);
    expect(growth[2].netFromStart).toBe(-160);
  });

  it('reports (value − baseline) / baseline as the percentage, both directions', () => {
    const growth = computeGrossNetGrowth(A_RAISE);

    expect(growth[1].grossPctFromStart).toBeCloseTo(300 / 3000);
    expect(growth[1].netPctFromStart).toBeCloseTo(140 / 2160);
    expect(growth[2].grossPctFromStart).toBeCloseTo(-200 / 3000);
    expect(growth[2].netPctFromStart).toBeCloseTo(-160 / 2160);
  });

  it('shows gross outrunning net when the deduction rate climbs', () => {
    const growth = computeGrossNetGrowth(A_RAISE);

    expect(growth[1].grossPctFromStart!).toBeGreaterThan(growth[1].netPctFromStart!);
  });

  it('returns one point per bucket, in order', () => {
    expect(computeGrossNetGrowth(A_RAISE).map((point) => point.bucketKey)).toEqual([
      '2026-01',
      '2026-02',
      '2026-03',
    ]);
  });
});

describe('computeGrossNetGrowth: months with nothing entered', () => {
  it('nulls every gross field while the net fields carry on', () => {
    const growth = computeGrossNetGrowth([
      ratioPoint('2026-01', 2160, 3000),
      ratioPoint('2026-02', 2300, null),
    ]);

    expect(growth[1]).toMatchObject({
      grossValue: null,
      grossFromStart: null,
      grossPctFromStart: null,
      netValue: 2300,
      netFromStart: 140,
    });
    expect(growth[1].netPctFromStart).toBeCloseTo(140 / 2160);
  });

  it('yields null percentages for a zero baseline, never Infinity or NaN', () => {
    // A baseline month where the user received nothing counted — deselecting every category, say.
    const growth = computeGrossNetGrowth([
      { bucketKey: '2026-01', net: 0, gross: 0, ratio: null },
      ratioPoint('2026-02', 2160, 3000),
    ]);

    expect(growth[1].netPctFromStart).toBeNull();
    expect(growth[1].grossPctFromStart).toBeNull();
    // The absolute distance is still perfectly well-defined.
    expect(growth[1].netFromStart).toBe(2160);
    expect(growth[1].grossFromStart).toBe(3000);
  });

  it('returns an empty array for an empty series rather than throwing', () => {
    expect(computeGrossNetGrowth([])).toEqual([]);
  });
});
