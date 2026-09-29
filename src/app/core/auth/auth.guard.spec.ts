import { TestBed } from '@angular/core/testing';
import {
  Router,
  provideRouter,
  type ActivatedRouteSnapshot,
  type RouterStateSnapshot,
  type UrlTree,
} from '@angular/router';
import { vi } from 'vitest';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthApiService } from './auth-api.service';
import { authGuard } from './auth.guard';
import { SessionStore } from './session.store';
import type { PublicUser } from './public-user';

const ADMIN: PublicUser = {
  id: 1,
  email: 'admin@example.com',
  displayName: 'Admin',
  role: 'admin',
};

const runGuard = (url: string): Promise<boolean | UrlTree> =>
  Promise.resolve(
    TestBed.runInInjectionContext(() =>
      authGuard({} as ActivatedRouteSnapshot, { url } as RouterStateSnapshot),
    ),
  ) as Promise<boolean | UrlTree>;

describe('authGuard', () => {
  const api = { login: vi.fn(), logout: vi.fn(), me: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthApiService, useValue: api }],
    });
  });

  it('lets a signed-in user through without asking again', async () => {
    api.login.mockResolvedValue(ADMIN);
    await TestBed.inject(SessionStore).login('admin@example.com', 'admin');

    await expect(runGuard('/transactions')).resolves.toBe(true);
    expect(api.me).not.toHaveBeenCalled();
  });

  it('sends a signed-out visitor to /login carrying the URL it stopped', async () => {
    api.me.mockRejectedValue(new Error('401'));

    const result = (await runGuard('/transactions?page=2')) as UrlTree;

    expect(TestBed.inject(Router).serializeUrl(result)).toBe(
      '/login?returnUrl=%2Ftransactions%3Fpage%3D2',
    );
  });

  it('awaits restore() on an unknown session, so a hard refresh does not bounce to /login', async () => {
    // The hard-refresh case: status is `unknown` and only `GET /api/auth/me` can settle it. The
    // guard must wait for that answer rather than treating "not yet known" as "not signed in".
    let identify = (): void => {};
    api.me.mockReturnValue(
      new Promise<PublicUser>((resolve) => {
        identify = () => resolve(ADMIN);
      }),
    );
    const session = TestBed.inject(SessionStore);

    const pending = runGuard('/transactions');
    expect(session.status()).toBe('unknown');
    identify();

    await expect(pending).resolves.toBe(true);
    expect(session.status()).toBe('authenticated');
  });

  it('redirects once the restore comes back signed out', async () => {
    api.me.mockRejectedValue(new Error('401'));

    const result = (await runGuard('/dashboard')) as UrlTree;

    expect(TestBed.inject(Router).serializeUrl(result)).toBe('/login?returnUrl=%2Fdashboard');
    expect(api.me).toHaveBeenCalledOnce();
  });

  it('does not claim an unreachable server means signed out (TICKET-SRV-06)', async () => {
    // Status 0: nothing answered. Sending this person to `/login` would state that they are signed
    // out — and the form there needs the same server, so it could not put it right either.
    api.me.mockRejectedValue(new HttpErrorResponse({ status: 0 }));
    const session = TestBed.inject(SessionStore);

    await expect(runGuard('/dashboard')).resolves.toBe(false);
    expect(session.status()).toBe('unknown');
  });

  it('lets the same visitor through once the server answers again', async () => {
    api.me.mockRejectedValueOnce(new HttpErrorResponse({ status: 0 }));
    await runGuard('/dashboard');

    api.me.mockResolvedValue(ADMIN);

    await expect(runGuard('/dashboard')).resolves.toBe(true);
    // Two calls, not one: the failed identification is not remembered as an answer.
    expect(api.me).toHaveBeenCalledTimes(2);
  });
});
