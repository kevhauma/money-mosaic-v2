import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import {
  AdminUsersApiService,
  AuthApiService,
  SessionStore,
  type AdminUser,
  type SessionUser,
} from '@/core/auth';
import { StoreResetService } from '@/core/store-reset';
import { AdminUsersStore } from './admin-users.store';

const ADMIN_SESSION: SessionUser = {
  id: 1,
  email: 'admin',
  displayName: 'Administrator',
  role: 'admin',
  usingDefaultPassword: false,
};

const ACCOUNT: AdminUser = {
  id: 2,
  email: 'ada',
  displayName: 'Ada',
  role: 'user',
  disabled: false,
  createdAt: '2026-02-01T09:00:00.000Z',
  passwordUpdatedAt: '2026-02-01T09:00:00.000Z',
};

describe('AdminUsersStore', () => {
  const api = {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    resetPassword: vi.fn(),
    remove: vi.fn(),
  };
  const auth = { login: vi.fn(), logout: vi.fn(), me: vi.fn() };

  /** Signs a role in **before** the store is injected — its first injection is what hydrates it. */
  const signInAs = async (role: 'admin' | 'user'): Promise<void> => {
    auth.login.mockResolvedValue({ ...ADMIN_SESSION, role });
    await TestBed.inject(SessionStore).login('whoever', 'password');
  };

  beforeEach(() => {
    vi.clearAllMocks();
    api.list.mockResolvedValue([ACCOUNT]);
    TestBed.configureTestingModule({
      providers: [
        { provide: AdminUsersApiService, useValue: api },
        { provide: AuthApiService, useValue: auth },
      ],
    });
  });

  it('loads every account on first injection, for an admin', async () => {
    await signInAs('admin');

    const store = TestBed.inject(AdminUsersStore);
    await store.hydrate();

    expect(api.list).toHaveBeenCalledOnce();
    expect(store.users()).toEqual([ACCOUNT]);
    expect(store.enabledAdminCount()).toBe(0);
  });

  it('asks the server nothing for a non-admin, rather than collecting a 403', async () => {
    // The case `rehydrateAll` creates: an ordinary user signing in on a tab where an admin had the
    // panel open. The endpoint could only ever answer 403, so the store does not call it.
    await signInAs('user');

    const store = TestBed.inject(AdminUsersStore);
    await store.hydrate();

    expect(api.list).not.toHaveBeenCalled();
    expect(store.users()).toEqual([]);
  });

  it('counts only the administrators who could sign in', async () => {
    api.list.mockResolvedValue([
      { ...ACCOUNT, id: 1, role: 'admin' },
      { ...ACCOUNT, id: 3, role: 'admin', disabled: true },
      ACCOUNT,
    ]);
    await signInAs('admin');

    const store = TestBed.inject(AdminUsersStore);
    await store.hydrate();

    expect(store.enabledAdminCount()).toBe(1);
  });

  it('empties itself when the signed-in user changes (TICKET-AUTH-02)', async () => {
    await signInAs('admin');
    const store = TestBed.inject(AdminUsersStore);
    await store.hydrate();
    expect(store.users()).toHaveLength(1);

    TestBed.inject(StoreResetService).resetAll();

    expect(store.users()).toEqual([]);
    // The memoised hydration went with it, so the next load genuinely re-reads.
    await store.hydrate();
    expect(api.list).toHaveBeenCalledTimes(2);
  });

  it('returns the message for a failed action rather than parking it on the store', async () => {
    await signInAs('admin');
    const store = TestBed.inject(AdminUsersStore);
    await store.hydrate();
    api.update.mockRejectedValue(new Error('offline'));

    await expect(store.saveChanges(2, { displayName: 'Ada L' })).resolves.toContain(
      'Could not save that change',
    );
    expect(store.error()).toBeNull();
  });
});
