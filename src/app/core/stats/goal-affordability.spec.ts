import type { SavingsGoal } from '@/core/data-access';
import { computeGoalAffordability } from './goal-affordability';

const goal = (overrides: Partial<SavingsGoal> = {}): SavingsGoal => ({
  id: 1,
  name: 'Camera',
  targetAmount: 1200,
  archived: false,
  createdAt: '2026-08-01',
  ...overrides,
});

const options = {
  today: '2026-08-13',
  startingBalance: 0,
  safetyNetAmount: 0,
  perMonth: 100,
};

describe('computeGoalAffordability: sequential funding', () => {
  it('accumulates targets in the given order', () => {
    const result = computeGoalAffordability(
      [
        goal({ id: 1, targetAmount: 1000 }),
        goal({ id: 2, targetAmount: 500 }),
        goal({ id: 3, targetAmount: 2000 }),
      ],
      options,
    );

    expect(result.map((entry) => entry.cumulativeTarget)).toEqual([1000, 1500, 3500]);
  });

  it('pushes every goal below a reordered one further out — the point of the ordering', () => {
    const camera = goal({ id: 1, targetAmount: 1200 });
    const holiday = goal({ id: 2, targetAmount: 3000 });

    const cameraFirst = computeGoalAffordability([camera, holiday], options);
    const holidayFirst = computeGoalAffordability([holiday, camera], options);

    // Camera alone: 12 months. Behind the holiday it costs 4200 cumulative: 42 months.
    expect(cameraFirst[0].monthsAway).toBe(12);
    expect(holidayFirst[1].monthsAway).toBe(42);
    // ...and the holiday moves the other way: 42 months behind the camera, 30 on its own.
    expect(cameraFirst[1].monthsAway).toBe(42);
    expect(holidayFirst[0].monthsAway).toBe(30);
  });

  it('rounds a part-month up — you cannot buy it halfway through the month you reach it', () => {
    const result = computeGoalAffordability([goal({ targetAmount: 1250 })], options);

    expect(result[0].monthsAway).toBe(13);
  });
});

describe('computeGoalAffordability: money already in hand', () => {
  it('reports a covered goal as already affordable, with no date and no savings plan', () => {
    const result = computeGoalAffordability([goal({ targetAmount: 1200 })], {
      ...options,
      startingBalance: 5000,
    });

    expect(result[0]).toMatchObject({
      reason: 'already-affordable',
      monthsAway: 0,
      affordableOn: null,
    });
  });

  it('treats an exactly-covered target as affordable, not one month away', () => {
    const result = computeGoalAffordability([goal({ targetAmount: 1200 })], {
      ...options,
      startingBalance: 1200,
    });

    expect(result[0].reason).toBe('already-affordable');
  });

  it('still projects the goals below one that is already covered', () => {
    const result = computeGoalAffordability(
      [goal({ id: 1, targetAmount: 1000 }), goal({ id: 2, targetAmount: 1000 })],
      { ...options, startingBalance: 1500 },
    );

    expect(result[0].reason).toBe('already-affordable');
    expect(result[1]).toMatchObject({ reason: 'projected', monthsAway: 5 });
  });
});

describe('computeGoalAffordability: the safety net', () => {
  it('reduces the spendable balance', () => {
    const result = computeGoalAffordability([goal({ targetAmount: 1000 })], {
      ...options,
      startingBalance: 1500,
      safetyNetAmount: 1000,
    });

    // 1500 - 1000 = 500 spendable; 500 short at 100/month.
    expect(result[0]).toMatchObject({ reason: 'projected', monthsAway: 5 });
  });

  it('can push a goal from affordable-now to projected', () => {
    const goals = [goal({ targetAmount: 1000 })];
    const withoutNet = computeGoalAffordability(goals, { ...options, startingBalance: 1500 });
    const withNet = computeGoalAffordability(goals, {
      ...options,
      startingBalance: 1500,
      safetyNetAmount: 800,
    });

    expect(withoutNet[0].reason).toBe('already-affordable');
    expect(withNet[0].reason).toBe('projected');
  });
});

describe('computeGoalAffordability: a rate that gets you nowhere', () => {
  it.each([0, -120])('answers a perMonth of %s instead of dividing by it', (perMonth) => {
    const result = computeGoalAffordability([goal({ targetAmount: 1200 })], {
      ...options,
      perMonth,
    });

    expect(result[0]).toMatchObject({
      reason: 'never-at-this-rate',
      affordableOn: null,
      monthsAway: null,
    });
  });

  it('still reports what is already affordable even at a negative rate', () => {
    const result = computeGoalAffordability(
      [goal({ id: 1, targetAmount: 500 }), goal({ id: 2, targetAmount: 5000 })],
      { ...options, startingBalance: 1000, perMonth: -300 },
    );

    expect(result[0].reason).toBe('already-affordable');
    expect(result[1].reason).toBe('never-at-this-rate');
  });

  it('refuses a target that is only reachable past the horizon, rather than naming an absurd year', () => {
    const result = computeGoalAffordability([goal({ targetAmount: 1_000_000 })], {
      ...options,
      perMonth: 100,
    });

    // 10,000 months out — well past the 600-month backstop.
    expect(result[0].reason).toBe('never-at-this-rate');
    expect(result[0].affordableOn).toBeNull();
  });

  it('honours an explicit horizonMonths', () => {
    const goals = [goal({ targetAmount: 1200 })];

    expect(computeGoalAffordability(goals, { ...options, horizonMonths: 12 })[0].reason).toBe(
      'projected',
    );
    expect(computeGoalAffordability(goals, { ...options, horizonMonths: 11 })[0].reason).toBe(
      'never-at-this-rate',
    );
  });
});

describe('computeGoalAffordability: calendar-correct dates', () => {
  it('names a real month-end rather than drifting by a fixed day count', () => {
    const result = computeGoalAffordability([goal({ targetAmount: 700 })], options);

    // 7 months on from August 2026 is March 2027, whose end is the 31st.
    expect(result[0].affordableOn).toBe('2027-03-31');
  });

  it('lands on the real end of a short month when projected from a 31st', () => {
    const result = computeGoalAffordability([goal({ targetAmount: 100 })], {
      ...options,
      today: '2026-01-31',
    });

    expect(result[0].affordableOn).toBe('2026-02-28');
  });

  it('handles a leap February the same way', () => {
    const result = computeGoalAffordability([goal({ targetAmount: 100 })], {
      ...options,
      today: '2024-01-31',
    });

    expect(result[0].affordableOn).toBe('2024-02-29');
  });

  it('rolls into the next year', () => {
    const result = computeGoalAffordability([goal({ targetAmount: 400 })], {
      ...options,
      today: '2026-11-05',
    });

    expect(result[0].affordableOn).toBe('2027-03-31');
    expect(result[0].monthsAway).toBe(4);
  });

  it('reads no clock — the same goals at two different "todays" give two different dates', () => {
    const goals = [goal({ targetAmount: 300 })];

    expect(
      computeGoalAffordability(goals, { ...options, today: '2026-01-10' })[0].affordableOn,
    ).toBe('2026-04-30');
    expect(
      computeGoalAffordability(goals, { ...options, today: '2026-06-10' })[0].affordableOn,
    ).toBe('2026-09-30');
  });
});

describe('computeGoalAffordability: on track against a wanted-by date', () => {
  it('is on track when the ETA lands on or before the date', () => {
    const result = computeGoalAffordability(
      [goal({ targetAmount: 700, targetDate: '2027-06-01' })],
      options,
    );

    expect(result[0].affordableOn).toBe('2027-03-31');
    expect(result[0].onTrack).toBe(true);
  });

  it('is behind when the ETA lands after it', () => {
    const result = computeGoalAffordability(
      [goal({ targetAmount: 700, targetDate: '2026-12-01' })],
      options,
    );

    expect(result[0].onTrack).toBe(false);
  });

  it('is on track when the money is already there, whatever the date', () => {
    const result = computeGoalAffordability(
      [goal({ targetAmount: 700, targetDate: '2026-09-01' })],
      { ...options, startingBalance: 1000 },
    );

    expect(result[0].onTrack).toBe(true);
  });

  it('has no verdict without a date, and none when there is no ETA to compare', () => {
    const [undated, unreachable] = computeGoalAffordability(
      [
        goal({ id: 1, targetAmount: 700 }),
        goal({ id: 2, targetAmount: 700, targetDate: '2027-06-01' }),
      ],
      { ...options, perMonth: 0 },
    );

    expect(undated.onTrack).toBeNull();
    expect(unreachable.onTrack).toBeNull();
  });
});

describe('computeGoalAffordability: degenerate input', () => {
  it('returns an empty list for no goals', () => {
    expect(computeGoalAffordability([], options)).toEqual([]);
  });

  it('reads no store and no clock — it is a pure function of its arguments', () => {
    const goals = [goal({ targetAmount: 700 })];

    expect(computeGoalAffordability(goals, options)).toEqual(
      computeGoalAffordability(goals, options),
    );
  });
});
