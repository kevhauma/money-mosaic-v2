import { TestBed } from '@angular/core/testing';
import { Router, provideRouter, type UrlTree } from '@angular/router';
import type { UiPreferences } from '@/core/data-access';
import { UiPreferencesService } from '@/core/ui-preferences';
import { fakeUiPreferences } from '@/core/ui-preferences/ui-preferences.testing';
import { homeRedirectGuard } from './home-redirect.guard';

describe('homeRedirectGuard', () => {
  /** The app initializer has loaded the account's preferences by the time any guard runs. */
  const setup = async (stored: Partial<UiPreferences> = {}): Promise<void> => {
    const fake = fakeUiPreferences(stored);
    TestBed.configureTestingModule({ providers: [provideRouter([]), ...fake.providers] });
    await TestBed.inject(UiPreferencesService).restore();
  };

  it('allows activation (renders the landing page) for an account seeing it for the first time', async () => {
    await setup();

    const result = TestBed.runInInjectionContext(() => homeRedirectGuard({} as never, {} as never));

    expect(result).toBe(true);
  });

  it('redirects to /dashboard once the account has already reached it', async () => {
    await setup({ hasVisited: true });

    const result = TestBed.runInInjectionContext(() =>
      homeRedirectGuard({} as never, {} as never),
    ) as UrlTree;

    expect(TestBed.inject(Router).serializeUrl(result)).toBe('/dashboard');
  });
});
