import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { BackupReminderService } from './backup-reminder.service';

const ALICE = 1;
const BOB = 2;
const keys = [`mm-backup-reminder-dismissed:${ALICE}`, `mm-backup-reminder-dismissed:${BOB}`];

describe('BackupReminderService', () => {
  let service: BackupReminderService;

  const clearOwnKeys = (): void => keys.forEach((key) => localStorage.removeItem(key));

  beforeEach(() => {
    clearOwnKeys();
    TestBed.configureTestingModule({});
    service = TestBed.inject(BackupReminderService);
  });

  /**
   * Both of these matter more than they look. The Angular unit-test builder runs with
   * `isolate: false`, so every spec file shares one process: `localStorage.clear()` would wipe
   * other files' keys (the theme, the landing-page flag), and a `Storage.prototype` spy left
   * installed would make `localStorage` throw for whatever runs next in this worker — a flake that
   * surfaces nowhere near its cause.
   */
  afterEach(() => {
    vi.restoreAllMocks();
    clearOwnKeys();
  });

  it('starts undismissed and remembers a dismissal', () => {
    expect(service.isDismissed(ALICE)).toBe(false);

    service.dismiss(ALICE);

    expect(service.isDismissed(ALICE)).toBe(true);
    expect(TestBed.inject(BackupReminderService).isDismissed(ALICE)).toBe(true);
  });

  /**
   * The warning is about *your* data being unbacked-up, so the dismissal has to be yours. On a
   * household's shared browser a single key would mean whoever signed in first silently dismissed
   * it for everyone who came after, each of whom has their own un-backed-up account.
   */
  it('dismisses for one account without dismissing for another', () => {
    service.dismiss(ALICE);

    expect(service.isDismissed(ALICE)).toBe(true);
    expect(service.isDismissed(BOB)).toBe(false);
  });

  /**
   * The flag this reminder owns is deliberately *not* the landing page's (TICKET-PUB-01). That one
   * is set the first time anyone reaches the dashboard — before this reminder can have anything to
   * say, since it waits for an account with transactions in it. Sharing a key would mean dismissing
   * a notice nobody had seen.
   */
  it('uses keys of its own, so the landing-page flag does not dismiss it', () => {
    localStorage.setItem('mm-has-visited', 'true');

    expect(service.isDismissed(ALICE)).toBe(false);

    service.dismiss(ALICE);

    expect(localStorage.getItem('mm-has-visited')).toBe('true');
    localStorage.removeItem('mm-has-visited');
  });

  /**
   * A private window, blocked site data, or a browser mid-clear can make either accessor throw.
   * This renders inside the shell on every page, so an exception escaping here would take the app
   * with it — an unreadable flag reads as "not dismissed" and an unwritable one simply does not
   * stick.
   */
  it('survives a localStorage that throws, in both directions', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });
    expect(service.isDismissed(ALICE)).toBe(false);

    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('denied');
    });
    expect(() => service.dismiss(ALICE)).not.toThrow();
  });
});
