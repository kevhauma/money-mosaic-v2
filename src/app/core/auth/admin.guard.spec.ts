import { TestBed } from '@angular/core/testing';
import {
  Router,
  provideRouter,
  type ActivatedRouteSnapshot,
  type RouterStateSnapshot,
  type UrlTree,
} from '@angular/router';
import { vi } from 'vitest';
import { adminGuard } from './admin.guard';
import { AuthApiService } from './auth-api.service';
import type { SessionUser } from './public-user';
import { SessionStore } from './session.store';

const ADMIN: SessionUser = {
  id: 1,
  email: 'admin',
  displayName: 'Administrator',
  role: 'admin',
  usingDefaultPassword: false,
};

const MEMBER: SessionUser = { ...ADMIN, id: 2, email: 'ada', role: 'user' };

const runGuard = (url: string): Promise<boolean | UrlTree> =>
  Promise.resolve(
    TestBed.runInInjectionContext(() =>
      adminGuard({} as ActivatedRouteSnapshot, { url } as RouterStateSnapshot),
    ),
  ) as Promise<boolean | UrlTree>;

const urlOf = (result: boolean | UrlTree): string =>
  TestBed.inject(Router).serializeUrl(result as UrlTree);

describe('adminGuard', () => {
  const api = { login: vi.fn(), logout: vi.fn(), me: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthApiService, useValue: api }],
    });
  });

  it('lets an admin through', async () => {
    api.login.mockResolvedValue(ADMIN);
    await TestBed.inject(SessionStore).login('admin', 'admin');

    await expect(runGuard('/admin/users')).resolves.toBe(true);
    expect(api.me).not.toHaveBeenCalled();
  });

  it('redirects a signed-in non-admin to the dashboard rather than rendering the panel', async () => {
    api.login.mockResolvedValue(MEMBER);
    await TestBed.inject(SessionStore).login('ada', 'lovelace');

    const result = await runGuard('/admin/users');

    // Not `false`, and not the page: every endpoint the panel calls answers a non-admin with 403.
    expect(result).not.toBe(true);
    expect(urlOf(result)).toBe('/dashboard');
  });

  it('sends a signed-out visitor to /login carrying the URL it stopped', async () => {
    api.me.mockRejectedValue(new Error('401'));

    const result = await runGuard('/admin/users');

    expect(urlOf(result)).toBe('/login?returnUrl=%2Fadmin%2Fusers');
  });

  it('awaits restore() on an unknown session, so a hard refresh does not bounce an admin away', async () => {
    let identify = (): void => {};
    api.me.mockReturnValue(
      new Promise<SessionUser>((resolve) => {
        identify = () => resolve(ADMIN);
      }),
    );
    const session = TestBed.inject(SessionStore);

    const pending = runGuard('/admin/users');
    expect(session.status()).toBe('unknown');
    identify();

    await expect(pending).resolves.toBe(true);
  });
});
