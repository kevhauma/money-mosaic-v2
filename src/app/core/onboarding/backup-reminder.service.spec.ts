import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BackupReminderService } from './backup-reminder.service';

describe('BackupReminderService', () => {
  let service: BackupReminderService;

  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    TestBed.configureTestingModule({});
    service = TestBed.inject(BackupReminderService);
  });

  it('starts undismissed and remembers a dismissal', () => {
    expect(service.isDismissed()).toBe(false);

    service.dismiss();

    expect(service.isDismissed()).toBe(true);
    expect(TestBed.inject(BackupReminderService).isDismissed()).toBe(true);
  });

  /**
   * The flag this reminder owns is deliberately *not* the landing page's (TICKET-PUB-01). That one
   * is set the first time anyone reaches the dashboard — before this reminder can have anything to
   * say, since it waits for an account with transactions in it. Sharing a key would mean dismissing
   * a notice nobody had seen.
   */
  it('uses a key of its own, so the landing-page flag does not dismiss it', () => {
    localStorage.setItem('mm-has-visited', 'true');

    expect(service.isDismissed()).toBe(false);

    service.dismiss();

    expect(localStorage.getItem('mm-has-visited')).toBe('true');
  });

  /**
   * A private window, blocked site data, or a browser mid-clear can make either accessor throw. A
   * reminder is never worth breaking the shell over, so an unreadable flag reads as "not
   * dismissed" and an unwritable one simply does not stick.
   */
  it('survives a localStorage that throws, in both directions', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });
    expect(service.isDismissed()).toBe(false);

    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('denied');
    });
    expect(() => service.dismiss()).not.toThrow();
  });
});
