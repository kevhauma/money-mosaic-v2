import type { SavingVelocity } from '@/core/stats';
import { withCleanFormatSettings } from '@/shared/utils/format-settings.testing';
import {
  ALL_HISTORY_LOOKBACK_MONTHS,
  BASIS_OPTIONS,
  LOOKBACK_OPTIONS,
  describeVelocity,
} from './forecast-controls-vm';

const month = (from: string, to: string, amount: number) => ({
  bucketKey: from.slice(0, 7),
  from,
  to,
  amount,
});

const velocity = (overrides: Partial<SavingVelocity> = {}): SavingVelocity => ({
  basis: 'net-cash-flow',
  monthsCovered: 2,
  months: [month('2026-06-01', '2026-06-30', 100), month('2026-07-01', '2026-07-31', 300)],
  perMonth: 200,
  median: 200,
  min: 100,
  max: 300,
  hasEnoughHistory: true,
  ...overrides,
});

describe('forecast control options', () => {
  it('offers 3, 6, 12, 24 months and all history', () => {
    expect(LOOKBACK_OPTIONS.map((option) => option.value)).toEqual([
      3,
      6,
      12,
      24,
      ALL_HISTORY_LOOKBACK_MONTHS,
    ]);
  });

  it('gives each saving basis a one-line explanation of what it counts', () => {
    expect(BASIS_OPTIONS.map((option) => option.value)).toEqual([
      'net-cash-flow',
      'savings-transfers',
    ]);
    for (const option of BASIS_OPTIONS) {
      expect(option.hint.length).toBeGreaterThan(20);
    }
  });
});

describe('describeVelocity', () => {
  withCleanFormatSettings();

  it('reports the mean, the window it came from, and the spread inside it', () => {
    const readout = describeVelocity(velocity());

    expect(readout.insufficientMessage).toBe('');
    expect(readout.rateLabel).toBe('€200,00/month');
    expect(readout.windowLabel).toBe('June 2026 – July 2026 · 2 complete months');
    expect(readout.spreadLabel).toBe('typical month €200,00 · from €100,00 to €300,00');
  });

  it('reports the months actually measured, not the months requested', () => {
    // A 24-month window over one month of imported history.
    const readout = describeVelocity(
      velocity({
        monthsCovered: 1,
        months: [month('2026-07-01', '2026-07-31', 300)],
        perMonth: 300,
        median: 300,
        min: 300,
        max: 300,
      }),
    );

    expect(readout.windowLabel).toBe('July 2026 – July 2026 · 1 complete month');
  });

  it('says what is missing instead of showing a €0/month rate', () => {
    const readout = describeVelocity(
      velocity({ hasEnoughHistory: false, monthsCovered: 0, months: [], perMonth: 0 }),
    );

    expect(readout.insufficientMessage).toContain('Not enough complete months');
    expect(readout.rateLabel).toBe('');
    expect(readout.spreadLabel).toBe('');
  });

  // TICKET-STAT-42 — "You saved about €1,600.10/month" was a third unlabelled answer to the same
  // question the Dashboard already answers twice. The basis was always a choice; the readout never
  // said which choice produced the number.
  it('names which of the two measures the rate is', () => {
    expect(describeVelocity(velocity({ basis: 'net-cash-flow' })).basisLabel).toBe(
      'counting money left over',
    );
    expect(describeVelocity(velocity({ basis: 'savings-transfers' })).basisLabel).toBe(
      'counting money moved to savings',
    );
  });

  it('takes that wording from BASIS_OPTIONS, so the toggle and the readout cannot drift apart', () => {
    for (const option of BASIS_OPTIONS) {
      expect(describeVelocity(velocity({ basis: option.value })).basisLabel).toBe(
        `counting ${option.label.toLowerCase()}`,
      );
    }
  });

  it('names no basis when there is no rate to name one for', () => {
    const readout = describeVelocity(
      velocity({ hasEnoughHistory: false, monthsCovered: 0, months: [], perMonth: 0 }),
    );

    expect(readout.basisLabel).toBe('');
  });

  it('keeps a negative rate visible rather than hiding it', () => {
    const readout = describeVelocity(
      velocity({ perMonth: -150, median: -150, min: -200, max: -100 }),
    );

    expect(readout.rateLabel).toBe('-€150,00/month');
  });
});
