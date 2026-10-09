import { TestBed } from '@angular/core/testing';
import type { UiPreferences } from '@/core/data-access';
import { UiPreferencesService } from '@/core/ui-preferences';
import { fakeUiPreferences } from '@/core/ui-preferences/ui-preferences.testing';
import { BackupReminderService } from './backup-reminder.service';

describe('BackupReminderService', () => {
  const setup = async (stored: Partial<UiPreferences> = {}) => {
    const fake = fakeUiPreferences(stored);
    TestBed.configureTestingModule({ providers: fake.providers });
    await TestBed.inject(UiPreferencesService).restore();
    return { ...fake, service: TestBed.inject(BackupReminderService) };
  };

  it('starts undismissed and remembers a dismissal on the account', async () => {
    const { service, repository } = await setup();
    expect(service.isDismissed()).toBe(false);

    await service.dismiss();

    expect(repository.setBackupReminderDismissed).toHaveBeenCalledWith(true);
    expect(service.isDismissed()).toBe(true);
  });

  it("reads the account's stored dismissal", async () => {
    const { service } = await setup({ backupReminderDismissed: true });

    expect(service.isDismissed()).toBe(true);
  });

  /**
   * The flag this reminder owns is deliberately *not* the landing page's (TICKET-PUB-01). That one
   * is set the first time anyone reaches the dashboard — before this reminder can have anything to
   * say, since it waits for an account with transactions in it. Sharing a flag would mean
   * dismissing a notice nobody had seen.
   */
  it('is not dismissed by the landing-page flag', async () => {
    const { service } = await setup({ hasVisited: true });

    expect(service.isDismissed()).toBe(false);
  });

  /** It renders inside the shell on every page: a refused save is a reminder seen again, not a throw. */
  it('a dismissal the server refused neither sticks nor throws', async () => {
    const { service, repository } = await setup();
    repository.setBackupReminderDismissed.mockRejectedValue(new Error('denied'));

    await expect(service.dismiss()).resolves.toBeUndefined();
    expect(service.isDismissed()).toBe(false);
  });
});
