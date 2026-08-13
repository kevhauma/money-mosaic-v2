import type { SavingsGoal } from '@/core/data-access';
import type { GoalAffordability, RequiredSavingPlan, SavingVelocity } from '@/core/stats';
import { withCleanFormatSettings } from '@/shared/utils/format-settings.testing';
import { forecastNotice } from './forecast-notices';

const velocity = (overrides: Partial<SavingVelocity> = {}): SavingVelocity => ({
  basis: 'net-cash-flow',
  monthsCovered: 6,
  months: [],
  perMonth: 200,
  median: 200,
  min: 100,
  max: 300,
  hasEnoughHistory: true,
  ...overrides,
});

const entry = (overrides: Partial<GoalAffordability> = {}): GoalAffordability => ({
  goalId: 1,
  cumulativeTarget: 1200,
  reason: 'projected',
  affordableOn: '2027-03-31',
  monthsAway: 7,
  onTrack: null,
  ...overrides,
});

const base = { dataReady: true, goalCount: 1, velocity: velocity(), affordability: [entry()] };

describe('forecastNotice', () => {
  withCleanFormatSettings();

  it('says nothing at all when there are no goals — the empty state already speaks', () => {
    expect(forecastNotice({ ...base, goalCount: 0, affordability: [] })).toEqual({
      text: '',
      status: 'info',
    });
  });

  it('holds off while the accounts data is still loading rather than showing a figure that will move', () => {
    const notice = forecastNotice({ ...base, dataReady: false });

    expect(notice.text).toContain('Working out');
    expect(notice.status).toBe('info');
  });

  it('says what is missing when there is not enough history, and what would fix it', () => {
    const notice = forecastNotice({
      ...base,
      velocity: velocity({ hasEnoughHistory: false, perMonth: 0, monthsCovered: 0 }),
    });

    expect(notice.status).toBe('warning');
    expect(notice.text).toContain('Not enough complete months');
    expect(notice.text).toContain('shorten the window');
  });

  it.each([0, -150])('explains a rate of %s instead of showing a blank', (perMonth) => {
    const notice = forecastNotice({ ...base, velocity: velocity({ perMonth }) });

    expect(notice.status).toBe('warning');
    expect(notice.text).toContain('spent more than you earned');
  });

  it('reports the last goal’s ETA as the plan’s finish line', () => {
    const notice = forecastNotice({
      ...base,
      goalCount: 2,
      affordability: [
        entry({ goalId: 1, affordableOn: '2026-12-31', monthsAway: 4 }),
        entry({ goalId: 2, affordableOn: '2028-08-31', monthsAway: 24 }),
      ],
    });

    expect(notice.text).toBe('All 2 goals covered by ≈ August 2028.');
    expect(notice.status).toBe('info');
  });

  it('says so plainly when everything is already affordable', () => {
    const notice = forecastNotice({
      ...base,
      affordability: [entry({ reason: 'already-affordable', affordableOn: null, monthsAway: 0 })],
    });

    expect(notice.text).toBe('You can afford all 1 goal right now.');
  });

  it('counts the goals that have no date at all instead of quietly reporting the rest', () => {
    const notice = forecastNotice({
      ...base,
      goalCount: 3,
      affordability: [
        entry({ goalId: 1 }),
        entry({ goalId: 2, reason: 'never-at-this-rate', affordableOn: null, monthsAway: null }),
        entry({ goalId: 3, reason: 'never-at-this-rate', affordableOn: null, monthsAway: null }),
      ],
    });

    expect(notice.text).toBe('2 of your 3 goals are out of reach at this rate.');
    expect(notice.status).toBe('warning');
  });

  it('gets the singular right for one unreachable goal', () => {
    const notice = forecastNotice({
      ...base,
      affordability: [
        entry({ reason: 'never-at-this-rate', affordableOn: null, monthsAway: null }),
      ],
    });

    expect(notice.text).toBe('1 of your 1 goal is out of reach at this rate.');
  });
});

describe('forecastNotice: required-rate mode (TICKET-FUT-09)', () => {
  withCleanFormatSettings();

  const plan = (overrides: Partial<RequiredSavingPlan> = {}): RequiredSavingPlan => ({
    goals: [],
    planRequiredPerMonth: 340,
    bindingGoalId: 1,
    ...overrides,
  });

  const goalsById = new Map<number, SavingsGoal>([
    [
      1,
      {
        id: 1,
        name: 'Camera',
        targetAmount: 1200,
        archived: false,
        createdAt: '2026-01-01',
      },
    ],
  ]);

  const required = { ...base, requiredMode: true, goalsById };

  it('names the plan rate, the gap against what you save, and the goal setting the pace', () => {
    const notice = forecastNotice({ ...required, requiredPlan: plan() });

    expect(notice.text).toBe(
      "To hit every date, save ≈ €340.00/month — €140.00/month more than the €200.00 you've averaged. Camera is the one setting the pace.",
    );
    expect(notice.status).toBe('warning');
  });

  it('reads the other way round when the plan needs less than you already save', () => {
    const notice = forecastNotice({
      ...required,
      requiredPlan: plan({ planRequiredPerMonth: 150 }),
    });

    expect(notice.text).toContain("€50.00/month less than the €200.00 you've averaged");
    expect(notice.status).toBe('info');
  });

  it('asks for a date when no goal has one, instead of leaving an empty panel', () => {
    const notice = forecastNotice({
      ...required,
      requiredPlan: plan({ planRequiredPerMonth: null, bindingGoalId: null }),
    });

    expect(notice.text).toContain('None of your goals has a wanted-by date yet');
    expect(notice.status).toBe('warning');
  });

  it('still answers on a history too thin for the other mode — the measured rate is only the comparison', () => {
    const notice = forecastNotice({
      ...required,
      velocity: velocity({ hasEnoughHistory: false, perMonth: 0, monthsCovered: 0 }),
      requiredPlan: plan(),
    });

    expect(notice.text).toContain('save ≈ €340.00/month');
    expect(notice.text).not.toContain('Not enough complete months');
  });
});
