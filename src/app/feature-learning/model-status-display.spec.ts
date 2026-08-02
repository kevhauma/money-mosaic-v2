import type { CategoryModelStatus } from '@/feature-categories';
import {
  alertStatusFor,
  badgeColorFor,
  statusCopyFor,
  statusLabelFor,
} from './model-status-display';

/**
 * The header badge and the body alert both read these (TICKET-ML-18), so the mapping is tested
 * here once rather than through either surface. Every status is covered on purpose: the failure
 * this guards against is a status added to `CategoryModelStatus` and forgotten in one of the maps.
 */
const ALL_STATUSES: CategoryModelStatus[] = [
  'untrained',
  'not-enough-data',
  'training',
  'ready',
  'stale',
  'error',
];

describe('model-status-display', () => {
  it('gives every status a distinct label', () => {
    const labels = ALL_STATUSES.map(statusLabelFor);

    expect(labels).toEqual([
      'Not trained',
      'Needs more data',
      'Training',
      'Ready',
      'Stale',
      'Error',
    ]);
    expect(new Set(labels).size).toBe(ALL_STATUSES.length);
  });

  it('gives every status a non-empty sentence of its own', () => {
    for (const status of ALL_STATUSES) {
      expect(statusCopyFor(status).length).toBeGreaterThan(0);
    }
    expect(statusCopyFor('untrained')).toBe('Not trained yet.');
    expect(statusCopyFor('stale')).toBe(
      'Categories changed since training — retrain to refresh suggestions.',
    );
  });

  it('colours the badge only for the statuses that carry a verdict', () => {
    expect(badgeColorFor('ready')).toBe('success');
    expect(badgeColorFor('stale')).toBe('warning');
    expect(badgeColorFor('error')).toBe('error');
    // Neutral by design — nothing has gone right or wrong yet.
    expect(badgeColorFor('untrained')).toBeUndefined();
    expect(badgeColorFor('not-enough-data')).toBeUndefined();
    expect(badgeColorFor('training')).toBeUndefined();
  });

  it('tones the body alert per status, including the info tone the badge has no colour for', () => {
    expect(alertStatusFor('not-enough-data')).toBe('info');
    expect(alertStatusFor('ready')).toBe('success');
    expect(alertStatusFor('stale')).toBe('warning');
    expect(alertStatusFor('error')).toBe('error');
    expect(alertStatusFor('untrained')).toBeUndefined();
    expect(alertStatusFor('training')).toBeUndefined();
  });
});
