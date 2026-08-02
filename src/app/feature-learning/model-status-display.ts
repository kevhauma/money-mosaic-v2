import type { CategoryModelStatus } from '@/feature-categories';
import type { AlertStatus, BadgeColor } from '@/shared/ui';

/**
 * The one place the auto-categoriser's status turns into something a user can read (TICKET-ML-18).
 *
 * Lives in the feature root rather than on `ModelStatusComponent` because two surfaces now render
 * the same verdict: the Learning page's header badge and the status panel's alert in the body. A
 * second copy of these maps would drift the first time a status is added — which is exactly what
 * this module exists to prevent, so read from here rather than re-deriving at a call site.
 */

/** Short chip label per status (FR-ML-10) — distinct copy so `'error'` never reads like `'not-enough-data'`. */
const STATUS_LABEL: Record<CategoryModelStatus, string> = {
  untrained: 'Not trained',
  'not-enough-data': 'Needs more data',
  training: 'Training',
  ready: 'Ready',
  stale: 'Stale',
  error: 'Error',
};

const STATUS_COPY: Record<CategoryModelStatus, string> = {
  untrained: 'Not trained yet.',
  'not-enough-data':
    'Categorise a few more transactions across at least two categories before training.',
  training: 'Training…',
  ready: 'Trained',
  stale: 'Categories changed since training — retrain to refresh suggestions.',
  error: 'Something went wrong while training. Try again.',
};

const ALERT_STATUS: Partial<Record<CategoryModelStatus, AlertStatus>> = {
  'not-enough-data': 'info',
  ready: 'success',
  stale: 'warning',
  error: 'error',
};

const BADGE_COLOR: Partial<Record<CategoryModelStatus, BadgeColor>> = {
  ready: 'success',
  stale: 'warning',
  error: 'error',
};

export const statusLabelFor = (status: CategoryModelStatus): string => STATUS_LABEL[status];

export const statusCopyFor = (status: CategoryModelStatus): string => STATUS_COPY[status];

/** Undefined for the statuses that carry no colour of their own (`untrained`, `training`). */
export const alertStatusFor = (status: CategoryModelStatus): AlertStatus | undefined =>
  ALERT_STATUS[status];

/** Undefined for the statuses that carry no colour of their own (`untrained`, `not-enough-data`, `training`). */
export const badgeColorFor = (status: CategoryModelStatus): BadgeColor | undefined =>
  BADGE_COLOR[status];
