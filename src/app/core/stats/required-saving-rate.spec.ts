import type { SavingsGoal } from '@/core/data-access';
import { computeGoalAffordability } from './goal-affordability';
import { computeRequiredSavingRate } from './required-saving-rate';

const goal = (overrides: Partial<SavingsGoal> = {}): SavingsGoal => ({
  id: 1,
  name: 'Camera',
  targetAmount: 1200,
  archived: false,
  createdAt: '2026-08-01',
  ...overrides,
});

const options = {
  today: '2026-08-09',
  startingBalance: 0,
  safetyNetAmount: 0,
  perMonth: 200,
};

describe('computeRequiredSavingRate: the formula', () => {
  it('divides what is missing by the months there are left to save in', () => {
    // Seven month-ends after 9 August 2026 up to 15 March 2027 (August's own end counts, March's
    // falls after the date). 1400 / 7 = 200.
    const plan = computeRequiredSavingRate(
      [goal({ targetAmount: 1400, targetDate: '2027-03-15' })],
      options,
    );

    expect(plan.goals[0]).toMatchObject({
      reason: 'required',
      monthsAvailable: 7,
      requiredPerMonth: 200,
    });
  });

  it('reports the gap against the measured rate, in both directions', () => {
    const short = computeRequiredSavingRate(
      [goal({ targetAmount: 2100, targetDate: '2027-03-15' })],
      options,
    );
    const ahead = computeRequiredSavingRate(
      [goal({ targetAmount: 700, targetDate: '2027-03-15' })],
      options,
    );

    // 300/month needed against 200 measured: short by 100.
    expect(short.goals[0].gapPerMonth).toBe(100);
    // 100/month needed against 200 measured: ahead by 100.
    expect(ahead.goals[0].gapPerMonth).toBe(-100);
  });

  it('counts the spendable balance, so the safety net raises every required rate', () => {
    const withoutNet = computeRequiredSavingRate(
      [goal({ targetAmount: 2100, targetDate: '2027-03-15' })],
      { ...options, startingBalance: 700 },
    );
    const withNet = computeRequiredSavingRate(
      [goal({ targetAmount: 2100, targetDate: '2027-03-15' })],
      { ...options, startingBalance: 700, safetyNetAmount: 700 },
    );

    expect(withoutNet.goals[0].requiredPerMonth).toBe(200);
    expect(withNet.goals[0].requiredPerMonth).toBe(300);
  });

  it('can flip a goal from already-affordable to required when the safety net rises', () => {
    const goals = [goal({ targetAmount: 1000, targetDate: '2027-03-15' })];

    expect(
      computeRequiredSavingRate(goals, { ...options, startingBalance: 1500 }).goals[0].reason,
    ).toBe('already-affordable');
    expect(
      computeRequiredSavingRate(goals, {
        ...options,
        startingBalance: 1500,
        safetyNetAmount: 800,
      }).goals[0].reason,
    ).toBe('required');
  });
});

describe('computeRequiredSavingRate: the same plan as the other mode', () => {
  const goals = [
    goal({ id: 1, targetAmount: 1000, targetDate: '2027-03-15' }),
    goal({ id: 2, targetAmount: 500, targetDate: '2027-06-15' }),
    goal({ id: 3, targetAmount: 2000, targetDate: '2028-01-15' }),
  ];

  it('accumulates targets exactly as computeGoalAffordability does — asserted against it', () => {
    const required = computeRequiredSavingRate(goals, options);
    const affordability = computeGoalAffordability(goals, {
      today: options.today,
      startingBalance: options.startingBalance,
      safetyNetAmount: options.safetyNetAmount,
      perMonth: options.perMonth,
    });

    expect(required.goals.map((entry) => entry.cumulativeTarget)).toEqual(
      affordability.map((entry) => entry.cumulativeTarget),
    );
  });

  it('moves the required rates of the goals below a reordered one', () => {
    const camera = goal({ id: 1, targetAmount: 1200, targetDate: '2027-08-15' });
    const holiday = goal({ id: 2, targetAmount: 3000, targetDate: '2027-08-15' });

    const cameraFirst = computeRequiredSavingRate([camera, holiday], options);
    const holidayFirst = computeRequiredSavingRate([holiday, camera], options);

    // Same date, same cumulative total for the pair — but the *first* goal's own rate changes.
    expect(cameraFirst.goals[0].requiredPerMonth).not.toBe(holidayFirst.goals[0].requiredPerMonth);
    expect(cameraFirst.goals[1].cumulativeTarget).toBe(4200);
    expect(holidayFirst.goals[1].cumulativeTarget).toBe(4200);
  });

  it('round-trips with FUT-05: feeding back a projected ETA needs no more than the measured rate', () => {
    const single = [goal({ targetAmount: 1400 })];
    const [projected] = computeGoalAffordability(single, {
      today: options.today,
      startingBalance: 0,
      safetyNetAmount: 0,
      perMonth: 200,
    });

    const plan = computeRequiredSavingRate(
      [goal({ targetAmount: 1400, targetDate: projected.affordableOn as string })],
      options,
    );

    expect(plan.goals[0].requiredPerMonth).toBeLessThanOrEqual(options.perMonth);
  });
});

describe('computeRequiredSavingRate: the plan rate is a maximum', () => {
  it('takes the largest required rate, not the sum', () => {
    const plan = computeRequiredSavingRate(
      [
        goal({ id: 1, targetAmount: 700, targetDate: '2027-03-15' }), // 100/month
        goal({ id: 2, targetAmount: 700, targetDate: '2027-10-15' }), // cumulative 1400 over 14
      ],
      options,
    );

    const rates = plan.goals.map((entry) => entry.requiredPerMonth);
    expect(plan.planRequiredPerMonth).toBe(Math.max(...(rates as number[])));
    // Summing would double-count the same euros.
    expect(plan.planRequiredPerMonth).not.toBe((rates[0] as number) + (rates[1] as number));
  });

  it('names the goal that sets the pace, even when it is not the last one', () => {
    const plan = computeRequiredSavingRate(
      [
        // Tight: 2100 in 7 months = 300/month.
        goal({ id: 1, targetAmount: 2100, targetDate: '2027-03-15' }),
        // Loose: cumulative 2200 across 28 months ≈ 79/month.
        goal({ id: 2, targetAmount: 100, targetDate: '2028-12-15' }),
      ],
      options,
    );

    expect(plan.bindingGoalId).toBe(1);
    expect(plan.planRequiredPerMonth).toBe(300);
  });

  it('excludes the undated, the already-affordable and the due-now from the maximum', () => {
    const plan = computeRequiredSavingRate(
      [
        goal({ id: 1, targetAmount: 700, targetDate: '2027-03-15' }),
        goal({ id: 2, targetAmount: 100 }),
        goal({ id: 3, targetAmount: 100, targetDate: '2026-08-20' }),
      ],
      { ...options, startingBalance: 0 },
    );

    expect(plan.goals.map((entry) => entry.reason)).toEqual([
      'required',
      'no-target-date',
      'due-now',
    ]);
    expect(plan.bindingGoalId).toBe(1);
    expect(plan.planRequiredPerMonth).toBe(100);
  });

  it('has no plan rate at all when nothing is dated', () => {
    const plan = computeRequiredSavingRate([goal({ targetAmount: 1200 })], options);

    expect(plan.planRequiredPerMonth).toBeNull();
    expect(plan.bindingGoalId).toBeNull();
  });
});

describe('computeRequiredSavingRate: months available', () => {
  it('counts month-ends after today up to and including the target date', () => {
    const plan = computeRequiredSavingRate(
      [goal({ targetAmount: 1000, targetDate: '2026-10-31' })],
      options,
    );

    // 31 August, 30 September, 31 October.
    expect(plan.goals[0].monthsAvailable).toBe(3);
  });

  it('does not count the current month-end when today is that month-end', () => {
    const plan = computeRequiredSavingRate(
      [goal({ targetAmount: 1000, targetDate: '2026-09-30' })],
      { ...options, today: '2026-08-31' },
    );

    expect(plan.goals[0].monthsAvailable).toBe(1);
  });

  it('counts from a 31st across a short month', () => {
    const plan = computeRequiredSavingRate(
      [goal({ targetAmount: 1000, targetDate: '2026-03-31' })],
      { ...options, today: '2026-01-31' },
    );

    // February's end and March's end — January's own end is today, not after it.
    expect(plan.goals[0].monthsAvailable).toBe(2);
  });

  it('counts across a year boundary', () => {
    const plan = computeRequiredSavingRate(
      [goal({ targetAmount: 1000, targetDate: '2027-02-15' })],
      { ...options, today: '2026-11-10' },
    );

    // 30 November, 31 December, 31 January.
    expect(plan.goals[0].monthsAvailable).toBe(3);
  });
});

describe('computeRequiredSavingRate: nothing divides by zero', () => {
  it.each([
    ['this month', '2026-08-20'],
    ['already past', '2025-01-01'],
  ])('answers a date %s with due-now and the amount still missing', (_case, targetDate) => {
    const plan = computeRequiredSavingRate([goal({ targetAmount: 1200, targetDate })], options);

    expect(plan.goals[0]).toMatchObject({
      reason: 'due-now',
      monthsAvailable: 0,
      requiredPerMonth: null,
      gapPerMonth: null,
      shortfallNow: 1200,
    });
  });

  it('reports a goal with no date as having nothing to solve for', () => {
    const plan = computeRequiredSavingRate([goal({ targetAmount: 1200 })], options);

    expect(plan.goals[0]).toMatchObject({
      reason: 'no-target-date',
      monthsAvailable: null,
      requiredPerMonth: null,
    });
  });

  it.each([0, -300])(
    'still answers with a measured rate of %s — the gap becomes the whole requirement',
    (perMonth) => {
      const plan = computeRequiredSavingRate(
        [goal({ targetAmount: 1400, targetDate: '2027-03-15' })],
        { ...options, perMonth },
      );

      expect(plan.goals[0].requiredPerMonth).toBe(200);
      expect(plan.goals[0].gapPerMonth).toBe(200 - perMonth);
    },
  );

  it('never emits an Infinity, a NaN or a negative required rate', () => {
    const plan = computeRequiredSavingRate(
      [
        goal({ id: 1, targetAmount: 1200, targetDate: '2026-08-20' }),
        goal({ id: 2, targetAmount: 1200, targetDate: '2027-03-15' }),
        goal({ id: 3, targetAmount: 1200 }),
        goal({ id: 4, targetAmount: 1, targetDate: '2027-03-15' }),
      ],
      { ...options, startingBalance: 100000 },
    );

    for (const entry of plan.goals) {
      expect(Number.isFinite(entry.requiredPerMonth ?? 0)).toBe(true);
      expect(entry.requiredPerMonth ?? 0).toBeGreaterThanOrEqual(0);
    }
  });

  it('returns an empty plan for no goals', () => {
    expect(computeRequiredSavingRate([], options)).toEqual({
      goals: [],
      planRequiredPerMonth: null,
      bindingGoalId: null,
    });
  });

  it('reads no clock — the same goal at two "todays" needs two different rates', () => {
    const goals = [goal({ targetAmount: 1200, targetDate: '2027-03-15' })];

    const early = computeRequiredSavingRate(goals, { ...options, today: '2026-08-09' });
    const late = computeRequiredSavingRate(goals, { ...options, today: '2026-12-09' });

    expect(late.goals[0].requiredPerMonth).toBeGreaterThan(
      early.goals[0].requiredPerMonth as number,
    );
  });
});
