import { signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TransactionsStore } from '@/core/state';
import type { Transaction } from '@/core/data-access';
import { BackupReminderComponent } from './backup-reminder.component';

/**
 * Only the two members the component reads. The real store is an `@ngrx/signals` store with
 * eighteen computeds behind a repository; standing one up here would test the store rather than
 * the rule this component owns — which is *when* the reminder is worth showing.
 */
const fakeStore = {
  hydrated: signal(false),
  transactions: signal<Transaction[]>([]),
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
    localStorage.clear();
    vi.restoreAllMocks();
    fakeStore.hydrated.set(true);
    fakeStore.transactions.set(someTransactions());

    await TestBed.configureTestingModule({
      imports: [BackupReminderComponent],
      providers: [provideRouter([]), { provide: TransactionsStore, useValue: fakeStore }],
    }).compileComponents();
  });

  it('tells an account with data where that data is, and what is not backing it up', () => {
    render();

    const text = banner()?.textContent ?? '';
    expect(text).toMatch(/stored on the Money Mosaic server/i);
    expect(text).toMatch(/only copy/i);
    // The claim v3 made false, and the one this ticket was originally written to make.
    expect(text).not.toMatch(/never leaves (your|this) browser/i);
    expect(text).not.toMatch(/local-first/i);
  });

  it('links to where a backup is actually taken', () => {
    render();

    expect(banner()?.querySelector('a[href="/settings"]')).toBeTruthy();
  });

  /**
   * A fresh account has nothing to lose, and this would be competing with the Import call-to-action
   * that owns an empty dashboard (TICKET-STAT-22).
   */
  it('stays away from an empty account', () => {
    fakeStore.transactions.set([]);
    render();

    expect(banner()).toBeNull();
  });

  /**
   * An un-hydrated store reads as empty. Without this the banner would be absent on load and
   * appear when the transactions landed, which reads as a glitch rather than a notice.
   */
  it('waits for the store to hydrate rather than flashing in afterwards', () => {
    fakeStore.hydrated.set(false);
    render();

    expect(banner()).toBeNull();

    fakeStore.hydrated.set(true);
    fixture.detectChanges();

    expect(banner()).not.toBeNull();
  });

  it('goes away when dismissed, and persists that', () => {
    render();
    expect(banner()).not.toBeNull();

    const dismiss = [...(banner()?.querySelectorAll('button') ?? [])].find((button) =>
      /got it/i.test(button.textContent ?? ''),
    );
    dismiss?.click();
    fixture.detectChanges();

    expect(banner()).toBeNull();
    expect(localStorage.getItem('mm-backup-reminder-dismissed')).toBe('true');
  });

  it('does not come back on the next load once dismissed', () => {
    localStorage.setItem('mm-backup-reminder-dismissed', 'true');
    render();

    expect(banner()).toBeNull();
  });
});
