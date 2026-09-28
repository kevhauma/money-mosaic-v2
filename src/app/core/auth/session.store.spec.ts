import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { StoreResetService } from '@/core/store-reset';
import { AuthApiService } from './auth-api.service';
import { SessionStore } from './session.store';
import type { PublicUser } from './public-user';

const ADMIN: PublicUser = {
  id: 1,
  email: 'admin@example.com',
  displayName: 'Admin',
  role: 'admin',
};

const unauthorized = (message: string): HttpErrorResponse =>
  new HttpErrorResponse({ status: 401, error: { error: message } });

describe('SessionStore: sign-in, sign-out and restore', () => {
  const api = { login: vi.fn(), logout: vi.fn(), me: vi.fn() };
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
