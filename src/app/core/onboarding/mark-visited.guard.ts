import { inject } from '@angular/core';
import type { CanActivateFn } from '@angular/router';
import { VisitedService } from './visited.service';

/**
 * Attached to the dashboard route: reaching `/dashboard` by any path (the landing page's CTA, a
 * direct URL, a bookmark, ...) marks this browser as visited so the landing page (TICKET-PUB-01)
 * doesn't show again on a later visit to `/`. Always allows activation.
 */
export const markVisitedGuard: CanActivateFn = () => {
  inject(VisitedService).markVisited();
  return true;
};
