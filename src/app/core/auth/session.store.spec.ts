import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { StoreResetService } from '@/core/store-reset';
import { AuthApiService } from './auth-api.service';
import { SessionStore } from './session.store';
import type { PublicUser, SessionUser } from './public-user';

const ADMIN: PublicUser = {
  id: 1,
  email: 'admin@example.com',
  displayName: 'Admin',
  role: 'admin',
};

/** The seeded admin as the server describes it before anyone has changed the password. */
const DEFAULT_PASSWORD_ADMIN: SessionUser = { ...ADMIN, usingDefaultPassword: true };

const unauthorized = (message: string): HttpErrorResponse =>
  new HttpErrorResponse({ status: 401, error: { error: message } });

describe('SessionStore: sign-in, sign-out and restore', () => {
  const api = {
    login: vi.fn(),
    logout: vi.fn(),
    me: vi.fn(),
    changePassword: vi.fn(),
    updateDisplayName: vi.fn(),
  };
  let store: InstanceType<typeof SessionStore>;

  beforeEach(() => {
    vi.clearAllMocks();
    api.logout.mockResolvedValue(undefined);
    TestBed.configureTestingModule({
      providers: [{ provide: AuthApiService, useValue: api }],
    });
    store = TestBed.inject(SessionStore);
  });

  it('starts out unknown — the cookie is HttpOnly, so nothing can be read locally', () => {
    expect(store.status()).toBe('unknown');
    expect(store.user()).toBeNull();
    expect(store.isAuthenticated()).toBe(false);
  });

  it('holds the user after a successful sign-in, and drops the pending flag', async () => {
    api.login.mockResolvedValue(ADMIN);

    const signedIn = await store.login('admin@example.com', 'admin');

    expect(signedIn).toBe(true);
    expect(store.status()).toBe('authenticated');
    expect(store.user()).toEqual(ADMIN);
    expect(store.displayName()).toBe('Admin');
    expect(store.pending()).toBe(false);
    expect(store.error()).toBeNull();
  });

  it("reports the server's own wording for a failed sign-in and stays anonymous", async () => {
    api.login.mockRejectedValue(unauthorized('Incorrect email or password'));

    const signedIn = await store.login('admin@example.com', 'wrong');

    expect(signedIn).toBe(false);
    expect(store.status()).toBe('anonymous');
    expect(store.user()).toBeNull();
    expect(store.pending()).toBe(false);
    expect(store.error()).toBe('Incorrect email or password');
  });

  it('says so plainly when the server cannot be reached at all', async () => {
    api.login.mockRejectedValue(new HttpErrorResponse({ status: 0 }));

    await store.login('admin@example.com', 'admin');

    expect(store.error()).toBe('Cannot reach the server. Is it running?');
  });

  it('restores an existing session from GET /api/auth/me', async () => {
    api.me.mockResolvedValue(ADMIN);

    await store.restore();

    expect(store.status()).toBe('authenticated');
    expect(store.user()).toEqual(ADMIN);
  });

  it('treats a 401 from me as the normal signed-out case, not an error to show', async () => {
    api.me.mockRejectedValue(unauthorized('Not signed in'));

    await store.restore();

    expect(store.status()).toBe('anonymous');
    expect(store.error()).toBeNull();
  });

  it('asks who is signed in only once, however many guards resolve at the same moment', async () => {
    api.me.mockResolvedValue(ADMIN);

    await Promise.all([store.restore(), store.restore(), store.restore()]);

    expect(api.me).toHaveBeenCalledOnce();
  });

  it('re-reads the identity on refresh, past the memo restore holds (TICKET-AUTH-03)', async () => {
    api.me.mockResolvedValue(ADMIN);
    await store.restore();
    expect(store.isAdmin()).toBe(true);

    // An admin who demotes their own account from the panel is no longer an admin, and `restore()`
    // would keep answering from its cache — leaving the nav entry, the guard and every action
    // disagreeing with the server until a reload.
    api.me.mockResolvedValue({ ...ADMIN, role: 'user' });
    await store.refresh();

    expect(store.isAdmin()).toBe(false);
    expect(api.me).toHaveBeenCalledTimes(2);
  });

  it('keeps the session it already has when a refresh fails', async () => {
    api.me.mockResolvedValue(ADMIN);
    await store.restore();

    api.me.mockRejectedValue(new HttpErrorResponse({ status: 500 }));
    await store.refresh();

    // A transient failure to re-read an identity is not a reason to discard the one in hand; a
    // genuinely dead session is the interceptor's job, not this method's.
    expect(store.status()).toBe('authenticated');
    expect(store.isAdmin()).toBe(true);
  });

  it('signs out through the API, clears the session and wipes every registered store', async () => {
    api.login.mockResolvedValue(ADMIN);
    const reset = vi.fn();
    TestBed.inject(StoreResetService).register('SomeStore', reset, () => Promise.resolve());
    await store.login('admin@example.com', 'admin');
    // Signing in wipes too, so that a second user cannot inherit the first's rows without a
    // sign-out in between. Count from here to keep this test about the sign-out.
    reset.mockClear();

    await store.logout();

    expect(api.logout).toHaveBeenCalledOnce();
    expect(store.status()).toBe('anonymous');
    expect(store.user()).toBeNull();
    expect(reset).toHaveBeenCalledOnce();
  });

  it('wipes the stores on sign-in too, so a second user never inherits the earlier rows', async () => {
    api.login.mockResolvedValue(ADMIN);
    const reset = vi.fn();
    const rehydrate = vi.fn(() => Promise.resolve());
    TestBed.inject(StoreResetService).register('SomeStore', reset, rehydrate);

    // No sign-out in between: `/login` is reachable with a live session, and `hydrate()` is
    // memoised, so rehydrating alone would leave the previous user's rows exactly where they were.
    await store.login('alice@example.com', 'secret');
    await store.login('bob@example.com', 'secret');

    expect(reset).toHaveBeenCalledTimes(2);
  });

  it('signs out locally even when the logout call fails — an unreachable server is still a sign-out', async () => {
    api.login.mockResolvedValue(ADMIN);
    api.logout.mockRejectedValue(new HttpErrorResponse({ status: 0 }));
    await store.login('admin@example.com', 'admin');

    await expect(store.logout()).rejects.toBeInstanceOf(HttpErrorResponse);

    expect(store.status()).toBe('anonymous');
    expect(store.user()).toBeNull();
  });

  it('re-asks who is signed in after a sign-out, rather than reusing the previous answer', async () => {
    api.me.mockResolvedValue(ADMIN);
    await store.restore();

    await store.logout();
    await store.restore();

    expect(api.me).toHaveBeenCalledTimes(2);
  });
});

describe('SessionStore: changing your own password and name (TICKET-AUTH-04)', () => {
  const api = {
    login: vi.fn(),
    logout: vi.fn().mockResolvedValue(undefined),
    me: vi.fn(),
    changePassword: vi.fn(),
    updateDisplayName: vi.fn(),
  };
  let store: InstanceType<typeof SessionStore>;

  /** Signs in as the untouched seeded admin — the state every case below starts from. */
  const signInAsSeededAdmin = async (): Promise<void> => {
    api.login.mockResolvedValue(DEFAULT_PASSWORD_ADMIN);
    await store.login('admin@example.com', 'admin');
  };

  beforeEach(() => {
    vi.clearAllMocks();
    api.logout.mockResolvedValue(undefined);
    TestBed.configureTestingModule({
      providers: [{ provide: AuthApiService, useValue: api }],
    });
    store = TestBed.inject(SessionStore);
  });

  it('adopts the updated user on a successful password change, which retires the reminder', async () => {
    await signInAsSeededAdmin();
    expect(store.showDefaultPasswordNotice()).toBe(true);
    api.changePassword.mockResolvedValue({ ...ADMIN, usingDefaultPassword: false });

    const failure = await store.changePassword('admin', 'something-else');

    expect(failure).toBeNull();
    expect(api.changePassword).toHaveBeenCalledWith('admin', 'something-else');
    // The session is deliberately kept alive server-side, so nothing here signs the user out.
    expect(store.status()).toBe('authenticated');
    expect(store.showDefaultPasswordNotice()).toBe(false);
  });

  it("returns the server's wording for a wrong current password and keeps the session", async () => {
    await signInAsSeededAdmin();
    api.changePassword.mockRejectedValue(unauthorized('Current password is incorrect'));

    const failure = await store.changePassword('not-my-password', 'something-else');

    expect(failure).toBe('Current password is incorrect');
    expect(store.status()).toBe('authenticated');
    expect(store.user()).toEqual(DEFAULT_PASSWORD_ADMIN);
  });

  it('says so plainly when the server cannot be reached for a password change', async () => {
    await signInAsSeededAdmin();
    api.changePassword.mockRejectedValue(new HttpErrorResponse({ status: 0 }));

    expect(await store.changePassword('admin', 'something-else')).toBe(
      'Cannot reach the server. Is it running?',
    );
  });

  it('adopts a new display name, which is what the shell reads', async () => {
    await signInAsSeededAdmin();
    api.updateDisplayName.mockResolvedValue({
      ...DEFAULT_PASSWORD_ADMIN,
      displayName: 'The Boss',
    });

    const failure = await store.updateDisplayName('The Boss');

    expect(failure).toBeNull();
    expect(store.displayName()).toBe('The Boss');
  });

  it('reports a failed rename and leaves the old name in place', async () => {
    await signInAsSeededAdmin();
    // The body a real 500 carries: `createErrorHandler` withholds the true message and answers the
    // literal "Internal server error", which is not worth showing on a form — so the caller's own
    // wording has to win over an `{ error }` body that happens to be present.
    api.updateDisplayName.mockRejectedValue(
      new HttpErrorResponse({ status: 500, error: { error: 'Internal server error' } }),
    );

    expect(await store.updateDisplayName('The Boss')).toBe(
      'Could not save your display name. Please try again.',
    );
    expect(store.displayName()).toBe('Admin');
  });
});

describe('SessionStore: the default-password reminder (TICKET-AUTH-04)', () => {
  const api = {
    login: vi.fn(),
    logout: vi.fn().mockResolvedValue(undefined),
    me: vi.fn(),
    changePassword: vi.fn(),
    updateDisplayName: vi.fn(),
  };
  let store: InstanceType<typeof SessionStore>;

  const restoreAs = async (user: SessionUser): Promise<void> => {
    api.me.mockResolvedValue(user);
    await store.restore();
  };

  beforeEach(() => {
    vi.clearAllMocks();
    api.logout.mockResolvedValue(undefined);
    TestBed.configureTestingModule({
      providers: [{ provide: AuthApiService, useValue: api }],
    });
    store = TestBed.inject(SessionStore);
  });

  it('is hidden while nobody is signed in', () => {
    expect(store.showDefaultPasswordNotice()).toBe(false);
  });

  it('shows for an admin still on the seeded password', async () => {
    await restoreAs(DEFAULT_PASSWORD_ADMIN);

    expect(store.showDefaultPasswordNotice()).toBe(true);
  });

  it('stays hidden for an admin who has changed the password', async () => {
    await restoreAs({ ...ADMIN, usingDefaultPassword: false });

    expect(store.showDefaultPasswordNotice()).toBe(false);
  });

  it('stays hidden for a non-admin, who could not act on it anyway', async () => {
    await restoreAs({ ...ADMIN, role: 'user', usingDefaultPassword: true });

    expect(store.showDefaultPasswordNotice()).toBe(false);
  });

  it('can be dismissed for the session, and comes back on the next sign-in', async () => {
    await restoreAs(DEFAULT_PASSWORD_ADMIN);

    store.dismissDefaultPasswordNotice();
    expect(store.showDefaultPasswordNotice()).toBe(false);

    // Dismissal is state, not a stored preference: a shared password should not be able to go quiet
    // for good on one click.
    await store.logout();
    api.login.mockResolvedValue(DEFAULT_PASSWORD_ADMIN);
    await store.login('admin@example.com', 'admin');

    expect(store.showDefaultPasswordNotice()).toBe(true);
  });

  it('comes back for somebody who signs in over a live session, without signing out first', async () => {
    await restoreAs(DEFAULT_PASSWORD_ADMIN);
    store.dismissDefaultPasswordNotice();

    // `/login` is reachable with a live session, so the dismissal cannot be left to the sign-out
    // path that clears it: one admin dismissing the reminder must not hide it from the next.
    api.login.mockResolvedValue(DEFAULT_PASSWORD_ADMIN);
    await store.login('admin@example.com', 'admin');

    expect(store.showDefaultPasswordNotice()).toBe(true);
  });
});
