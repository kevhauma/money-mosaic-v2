import { signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SessionStore, type SessionUser } from '@/core/auth';
import { BackupReminderService } from '@/core/onboarding';
import { TransactionsStore } from '@/core/state';
import type { Transaction } from '@/core/data-access';
import { BackupReminderComponent } from './backup-reminder.component';

const ALICE: SessionUser = {
  id: 1,
  email: 'alice',
  displayName: 'Alice',
  role: 'user',
  usingDefaultPassword: false,
};

/**
 * Only the members the component reads. The real stores are `@ngrx/signals` stores behind a
 * repository and an HTTP session; standing them up here would test them rather than the rule this
 * component owns — which is *when* the reminder is worth showing, and to whom.
 *
 * The dismissal is faked at `BackupReminderService` for the same reason. Whose dismissal it is —
 * that Alice waving it away does not wave it away for Bob — is the account's row on the server and
 * the sign-out reset in front of it, and `ui-preferences.service.spec.ts` is where that is pinned.
 */
const fakeTransactions = {
  hydrated: signal(false),
  transactions: signal<Transaction[]>([]),
};
const fakeSession = { user: signal<SessionUser | null>(null) };
const dismissed = signal(false);
const fakeReminder = {
  isDismissed: () => dismissed(),
  dismiss: vi.fn(() => {
    dismissed.set(true);
    return Promise.resolve();
  }),
};

/** One row, since nothing here reads a field of it — only that the account is not empty. */
const someTransactions = (): Transaction[] => [{ id: 1 } as Transaction];

describe('BackupReminderComponent: when the backup reminder is worth showing', () => {
  let fixture: ComponentFixture<BackupReminderComponent>;

  const banner = (): HTMLElement | null =>
    (fixture.nativeElement as HTMLElement).querySelector('mm-alert');

  const render = (): void => {
    fixture = TestBed.createComponent(BackupReminderComponent);
    fixture.detectChanges();
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    dismissed.set(false);
    fakeTransactions.hydrated.set(true);
    fakeTransactions.transactions.set(someTransactions());
    fakeSession.user.set(ALICE);

    await TestBed.configureTestingModule({
      imports: [BackupReminderComponent],
      providers: [
        provideRouter([]),
        { provide: TransactionsStore, useValue: fakeTransactions },
        { provide: SessionStore, useValue: fakeSession },
        { provide: BackupReminderService, useValue: fakeReminder },
      ],
    }).compileComponents();
  });

  it('tells an account with data where that data is, and what is not backing it up', () => {
    render();

    const text = banner()?.textContent ?? '';
    expect(text).toMatch(/stored on the Money Mosaic server/i);
    expect(text).toMatch(/nothing else is/i);
    // The claim v3 made false, and the one this ticket was originally written to make.
    expect(text).not.toMatch(/never leaves (your|this) browser/i);
    expect(text).not.toMatch(/local-first/i);
  });

  /**
   * The export is this account's own copy; the database file underneath belongs to whoever runs
   * the server. Settings → Data keeps those apart and so must this, or a member reads it as a duty
   * they have no way to discharge.
   */
  it('keeps the personal export and the operator-only file backup apart', () => {
    render();

    const text = banner()?.textContent ?? '';
    expect(text).toMatch(/Export your own copy/i);
    expect(text).toMatch(/if you are the one running the server/i);
  });

  it('points at where a backup is actually taken', () => {
    render();

    // Named as a route the user can follow, matching `guides.ts`: there is no "Data page" — Data
    // is a nav group heading, and the export lives in Settings' Data section.
    expect(banner()?.textContent).toMatch(/Settings → Data/);
    expect(banner()?.querySelector('a[href="/settings"]')).toBeTruthy();
  });

  /**
   * A fresh account has nothing to lose, and this would be competing with the Import call-to-action
   * that owns an empty dashboard (TICKET-STAT-22).
   */
  it('stays away from an empty account', () => {
    fakeTransactions.transactions.set([]);
    render();

    expect(banner()).toBeNull();
  });

  /**
   * An un-hydrated store reads as empty. Without this the banner would be absent on load and
   * appear when the transactions landed, which reads as a glitch rather than a notice.
   */
  it('waits for the store to hydrate rather than flashing in afterwards', () => {
    fakeTransactions.hydrated.set(false);
    render();

    expect(banner()).toBeNull();

    fakeTransactions.hydrated.set(true);
    fixture.detectChanges();

    expect(banner()).not.toBeNull();
  });

  it('shows nothing while nobody is signed in', () => {
    fakeSession.user.set(null);
    render();

    expect(banner()).toBeNull();
  });

  it('goes away when dismissed, and saves that to the account', () => {
    render();
    expect(banner()).not.toBeNull();

    const dismiss = [...(banner()?.querySelectorAll('button') ?? [])].find((button) =>
      /got it/i.test(button.textContent ?? ''),
    );
    dismiss?.click();
    fixture.detectChanges();

    expect(fakeReminder.dismiss).toHaveBeenCalledOnce();
    expect(banner()).toBeNull();
  });

  it('does not come back for an account that already dismissed it', () => {
    dismissed.set(true);
    render();

    expect(banner()).toBeNull();
  });
});
