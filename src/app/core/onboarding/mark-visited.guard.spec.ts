import { TestBed } from '@angular/core/testing';
import { markVisitedGuard } from './mark-visited.guard';
import { VisitedService } from './visited.service';

const HAS_VISITED_KEY = 'mm-has-visited';

describe('markVisitedGuard', () => {
  afterEach(() => {
    localStorage.removeItem(HAS_VISITED_KEY);
  });

  it('marks the visitor as having reached the dashboard and always allows activation', () => {
    TestBed.configureTestingModule({});

    const result = TestBed.runInInjectionContext(() => markVisitedGuard({} as never, {} as never));

    expect(result).toBe(true);
    expect(TestBed.inject(VisitedService).hasVisited()).toBe(true);
  });
});
