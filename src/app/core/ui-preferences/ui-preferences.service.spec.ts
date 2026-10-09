import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { vi } from 'vitest';
import type { UiPreferences } from '@/core/data-access';
import { StoreResetService } from '@/core/store-reset';
import { UiPreferencesService } from './ui-preferences.service';
import { fakeUiPreferences } from './ui-preferences.testing';

const serverError = (): HttpErrorResponse =>
  new HttpErrorResponse({ status: 500, statusText: 'Internal Server Error', url: '/api' });

/** A promise this spec resolves by hand, for reads and writes that have to be overtaken. */
const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((settle) => (resolve = settle));
  return { promise, resolve };
};

describe('UiPreferencesService: the account’s interface state', () => {
  const setup = (stored: Partial<UiPreferences> = {}) => {
    const fake = fakeUiPreferences(stored);
    TestBed.configureTestingModule({ providers: fake.providers });
    return { ...fake, service: TestBed.inject(UiPreferencesService) };
  };

  afterEach(() => vi.restoreAllMocks());

  it('reads as "nothing chosen yet" before anything is loaded', () => {
    const { service } = setup({ themeStyle: 'cyberpunk', hasVisited: true });

    expect(service.themeStyle()).toBeUndefined();
    expect(service.hasVisited()).toBe(false);
    expect(service.backupReminderDismissed()).toBe(false);
  });

  it('restore() loads what this account has stored', async () => {
    const { service } = setup({
      themeStyle: 'cyberpunk',
      hasVisited: true,
      backupReminderDismissed: true,
    });

    await service.restore();

    expect(service.themeStyle()).toBe('cyberpunk');
    expect(service.hasVisited()).toBe(true);
    expect(service.backupReminderDismissed()).toBe(true);
  });

  /**
   * The request would answer 401, and `authInterceptor` reads any 401 as an expired session and
   * routes to `/login` — dropping the URL a signed-out visitor was actually trying to reach.
   */
  it('asks for nothing while nobody is signed in', async () => {
    const { service, repository, session } = setup({ hasVisited: true });
    session.isAuthenticated.set(false);

    await service.restore();

    expect(repository.get).not.toHaveBeenCalled();
    expect(service.hasVisited()).toBe(false);
  });

  /** A theme is not worth failing a boot over, and bootstrap awaits this. */
  it('restore() never rejects, and a failed read leaves the defaults standing', async () => {
    const { service, repository } = setup();
    repository.get.mockRejectedValue(serverError());

    await expect(service.restore()).resolves.toBeUndefined();
    expect(service.themeStyle()).toBeUndefined();
  });

  it('logs a failure that is not the server answering, since nothing else will', async () => {
    const { service, repository } = setup();
    const bug = new TypeError('repository.get is not a function');
    repository.get.mockRejectedValue(bug);
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await service.restore();

    expect(log).toHaveBeenCalledWith(bug);
  });

  it.each([
    {
      name: 'setThemeStyle',
      method: 'setThemeStyle',
      write: (service: UiPreferencesService) => service.setThemeStyle('memphis'),
      read: (service: UiPreferencesService) => service.themeStyle(),
      expected: 'memphis',
    },
    {
      name: 'markVisited',
      method: 'setHasVisited',
      write: (service: UiPreferencesService) => service.markVisited(),
      read: (service: UiPreferencesService) => service.hasVisited(),
      expected: true,
    },
    {
      name: 'dismissBackupReminder',
      method: 'setBackupReminderDismissed',
      write: (service: UiPreferencesService) => service.dismissBackupReminder(),
      read: (service: UiPreferencesService) => service.backupReminderDismissed(),
      expected: true,
    },
  ] as const)('$name persists through the repository, then adopts it', async (testCase) => {
    const { service, repository } = setup();

    await testCase.write(service);

    expect(repository[testCase.method]).toHaveBeenCalledOnce();
    expect(testCase.read(service)).toBe(testCase.expected);
  });

  /** A write that did not land is not shown as though it had — nor thrown at a click handler. */
  it('does not adopt a write the server refused, and does not reject', async () => {
    const { service, repository } = setup();
    repository.setThemeStyle.mockRejectedValue(serverError());

    await expect(service.setThemeStyle('memphis')).resolves.toBeUndefined();
    expect(service.themeStyle()).toBeUndefined();
  });

  /**
   * The shared-browser case, which used to be a per-user `localStorage` key: Alice's theme and
   * dismissals must not still be on screen when Bob signs in on the same tab.
   */
  it('signing out drops the previous account’s preferences', async () => {
    const { service } = setup({ themeStyle: 'cyberpunk', backupReminderDismissed: true });
    await service.restore();

    TestBed.inject(StoreResetService).resetAll();

    expect(service.themeStyle()).toBeUndefined();
    expect(service.backupReminderDismissed()).toBe(false);
  });

  it('signing in again re-reads the new account’s preferences', async () => {
    const { service, repository } = setup();
    repository.get.mockResolvedValue({
      id: 1,
      themeStyle: 'skeuomorphism',
      hasVisited: true,
      backupReminderDismissed: undefined,
    });

    await TestBed.inject(StoreResetService).rehydrateAll();

    expect(service.themeStyle()).toBe('skeuomorphism');
  });

  it('a read started for the previous account does not land on the next one', async () => {
    const { service, repository } = setup();
    const aliceRead = deferred<UiPreferences>();
    repository.get.mockReturnValueOnce(aliceRead.promise);

    const restoring = service.restore();
    TestBed.inject(StoreResetService).resetAll();
    aliceRead.resolve({
      id: 1,
      themeStyle: 'cyberpunk',
      hasVisited: true,
      backupReminderDismissed: true,
    });
    await restoring;

    expect(service.themeStyle()).toBeUndefined();
  });

  /**
   * After a second sign-in the re-read is fired and not awaited, and the dashboard guard can mark the
   * account visited before it answers. The older answer must not quietly undo the newer write.
   */
  it('a write made while a read is in flight survives that read', async () => {
    const { service, repository } = setup();
    const read = deferred<UiPreferences>();
    repository.get.mockReturnValueOnce(read.promise);

    const restoring = service.restore();
    await service.markVisited();
    read.resolve({
      id: 1,
      themeStyle: 'memphis',
      hasVisited: false,
      backupReminderDismissed: false,
    });
    await restoring;

    expect(service.hasVisited()).toBe(true);
    expect(service.themeStyle()).toBe('memphis');
  });
});
