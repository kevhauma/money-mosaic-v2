import { withCleanFormatSettings } from '@/shared/utils/format-settings.testing';
import { lastImportStatus, STALE_AFTER_DAYS } from './last-import-status';

/** `now` is an argument, so "40 days ago" is arithmetic rather than a frozen clock. */
const daysBefore = (days: number, now: string): string =>
  new Date(Date.parse(now) - days * 24 * 60 * 60 * 1000).toISOString();

const NOW = '2026-08-24T12:00:00.000Z';

describe('lastImportStatus (TICKET-ACC-13)', () => {
  // Reads a formatted date, so the module-level locale signals are bracketed (TICKET-NG-10).
  withCleanFormatSettings();

  it('says "Never imported" for an account with no batches, not a blank or an epoch date', () => {
    expect(lastImportStatus(undefined, NOW)).toEqual({
      freshness: 'never',
      label: 'Never imported',
      needsAttention: true,
    });
  });

  it('states the date, unmarked, for an account imported today', () => {
    const status = lastImportStatus(NOW, NOW);

    expect(status.freshness).toBe('current');
    expect(status.needsAttention).toBe(false);
    expect(status.label).toBe('Last import 24/08/2026');
  });

  it('stays current right up to the threshold', () => {
    const status = lastImportStatus(daysBefore(STALE_AFTER_DAYS, NOW), NOW);

    expect(status.freshness).toBe('current');
    expect(status.needsAttention).toBe(false);
  });

  it('turns stale one day past it, and says how long ago', () => {
    const status = lastImportStatus(daysBefore(STALE_AFTER_DAYS + 1, NOW), NOW);

    expect(status.freshness).toBe('stale');
    expect(status.needsAttention).toBe(true);
    expect(status.label).toContain(`${STALE_AFTER_DAYS + 1} days ago`);
  });

  it('counts whole days, so 23 hours ago is still today', () => {
    const nearlyADayAgo = new Date(Date.parse(NOW) - 23 * 60 * 60 * 1000).toISOString();

    expect(lastImportStatus(nearlyADayAgo, NOW).label).toBe('Last import 23/08/2026');
  });
});
