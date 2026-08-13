import { computeNetWorthProjection } from './net-worth-projection';

const base = {
  today: '2026-08-13',
  startingBalance: 1000,
  perMonth: 200,
  purchases: [],
  horizonMonths: 6,
};

describe('computeNetWorthProjection', () => {
  it('starts at exactly the balance it was given, on today itself', () => {
    const points = computeNetWorthProjection(base);

    expect(points[0]).toMatchObject({ date: '2026-08-13', bucketKey: '2026-08', balance: 1000 });
  });

  it('rises by the rate once per month, on real month-ends', () => {
    const points = computeNetWorthProjection(base);

    expect(points.map((point) => point.balance)).toEqual([
      1000, 1200, 1400, 1600, 1800, 2000, 2200,
    ]);
    expect(points.map((point) => point.date)).toEqual([
      '2026-08-13',
      '2026-09-30',
      '2026-10-31',
      '2026-11-30',
      '2026-12-31',
      '2027-01-31',
      '2027-02-28',
    ]);
  });

  it('steps down in the month a goal is bought, and keeps rising after it', () => {
    const points = computeNetWorthProjection({
      ...base,
      purchases: [{ goalId: 1, name: 'Camera', amount: 1500, on: '2026-10-31' }],
    });

    // 1000 → 1200 → (1400 − 1500) = −100 → 100 → 300 …
    expect(points.map((point) => point.balance)).toEqual([1000, 1200, -100, 100, 300, 500, 700]);
    expect(points[2].purchases).toEqual([{ goalId: 1, name: 'Camera', amount: 1500 }]);
    expect(points[1].purchases).toEqual([]);
  });

  it('steps down twice on different months for two goals', () => {
    const points = computeNetWorthProjection({
      ...base,
      perMonth: 500,
      purchases: [
        { goalId: 1, name: 'Camera', amount: 1000, on: '2026-09-30' },
        { goalId: 2, name: 'Bike', amount: 2000, on: '2026-11-30' },
      ],
    });

    // 1000 → (1500−1000)=500 → 1000 → (1500−2000)=−500 → 0 …
    expect(points.map((point) => point.balance)).toEqual([1000, 500, 1000, -500, 0, 500, 1000]);
    expect(points[1].purchases.map((purchase) => purchase.name)).toEqual(['Camera']);
    expect(points[3].purchases.map((purchase) => purchase.name)).toEqual(['Bike']);
  });

  it('steps down once by the total when two goals land in the same month', () => {
    const points = computeNetWorthProjection({
      ...base,
      purchases: [
        { goalId: 1, name: 'Camera', amount: 300, on: '2026-09-30' },
        { goalId: 2, name: 'Bike', amount: 400, on: '2026-09-30' },
      ],
    });

    expect(points[1].balance).toBe(1200 - 700);
    expect(points[1].purchases).toHaveLength(2);
  });

  it('never dips below the safety net when the purchase dates come from the affordability walk', () => {
    // The invariant FUT-05 guarantees: a goal is only scheduled once the balance *above* the safety
    // net covers its cumulative target, so subtracting it at that date cannot cross the floor.
    const safetyNet = 500;
    const points = computeNetWorthProjection({
      today: '2026-08-13',
      startingBalance: 2000,
      perMonth: 200,
      // 2000 − 500 = 1500 spendable; a 1900 goal is 2 months away (1500 + 400 ≥ 1900).
      purchases: [{ goalId: 1, name: 'Sofa', amount: 1900, on: '2026-10-31' }],
      horizonMonths: 6,
    });

    for (const point of points) {
      expect(point.balance).toBeGreaterThanOrEqual(safetyNet);
    }
  });

  it('draws a declining line for a negative rate rather than refusing to draw', () => {
    const points = computeNetWorthProjection({ ...base, perMonth: -150 });

    expect(points.map((point) => point.balance)).toEqual([1000, 850, 700, 550, 400, 250, 100]);
  });

  it('ignores a purchase dated outside the drawn horizon', () => {
    const points = computeNetWorthProjection({
      ...base,
      horizonMonths: 2,
      purchases: [{ goalId: 1, name: 'Later', amount: 5000, on: '2028-01-31' }],
    });

    expect(points).toHaveLength(3);
    expect(points.every((point) => point.purchases.length === 0)).toBe(true);
  });

  it('draws month 0 alone for a zero horizon', () => {
    const points = computeNetWorthProjection({ ...base, horizonMonths: 0 });

    expect(points).toHaveLength(1);
    expect(points[0].balance).toBe(1000);
  });

  it('reads no clock — the same inputs at two "todays" produce two different grids', () => {
    const inJanuary = computeNetWorthProjection({ ...base, today: '2026-01-31', horizonMonths: 1 });
    const inJune = computeNetWorthProjection({ ...base, today: '2026-06-30', horizonMonths: 1 });

    expect(inJanuary.map((point) => point.date)).toEqual(['2026-01-31', '2026-02-28']);
    expect(inJune.map((point) => point.date)).toEqual(['2026-06-30', '2026-07-31']);
  });
});
