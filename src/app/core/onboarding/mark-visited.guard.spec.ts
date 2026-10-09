import { TestBed } from '@angular/core/testing';
import { fakeUiPreferences } from '@/core/ui-preferences/ui-preferences.testing';
import { markVisitedGuard } from './mark-visited.guard';

describe('markVisitedGuard', () => {
  it('marks the account as having reached the dashboard and always allows activation', () => {
    const { providers, repository } = fakeUiPreferences();
    TestBed.configureTestingModule({ providers });

    const result = TestBed.runInInjectionContext(() => markVisitedGuard({} as never, {} as never));

    expect(result).toBe(true);
    expect(repository.setHasVisited).toHaveBeenCalledWith(true);
  });
});
