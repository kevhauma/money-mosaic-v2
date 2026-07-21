import { TestBed } from '@angular/core/testing';
import { Router, provideRouter, type UrlTree } from '@angular/router';
import { homeRedirectGuard } from './home-redirect.guard';
import { VisitedService } from './visited.service';

const HAS_VISITED_KEY = 'mm-has-visited';

describe('homeRedirectGuard', () => {
  beforeEach(() => {
    localStorage.removeItem(HAS_VISITED_KEY);
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
  });

  afterEach(() => {
    localStorage.removeItem(HAS_VISITED_KEY);
  });

  it('allows activation (renders the landing page) for a first-time visitor', () => {
    const result = TestBed.runInInjectionContext(() => homeRedirectGuard({} as never, {} as never));

    expect(result).toBe(true);
  });

  it('redirects to /dashboard once the visitor has already reached it', () => {
    TestBed.inject(VisitedService).markVisited();

    const result = TestBed.runInInjectionContext(() =>
      homeRedirectGuard({} as never, {} as never),
    ) as UrlTree;

    expect(TestBed.inject(Router).serializeUrl(result)).toBe('/dashboard');
  });
});
