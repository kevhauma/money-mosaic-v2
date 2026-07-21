import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { VisitedService } from './visited.service';

/**
 * Guards the root `''` route: a visitor who has already reached the dashboard once is sent
 * straight there instead of seeing the landing page again (TICKET-PUB-01).
 */
export const homeRedirectGuard: CanActivateFn = () => {
  const visited = inject(VisitedService);
  if (visited.hasVisited()) {
    return inject(Router).createUrlTree(['/dashboard']);
  }
  return true;
};
