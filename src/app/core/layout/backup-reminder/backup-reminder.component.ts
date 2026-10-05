import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { SessionStore } from '@/core/auth';
import { BackupReminderService } from '@/core/onboarding';
import { TransactionsStore } from '@/core/state';
// Imported straight from their files rather than through the `@/shared/ui` barrel, for the same
// reason `app-shell.component.ts` and `default-password-notice.component.ts` do it: that barrel
// re-exports every primitive and `@Component` has side effects esbuild cannot tree-shake, so one
// barrel import here would pull the whole of `shared/ui` (and `@angular/forms` behind it) into the
// shell's chunk. The exception is recorded in CLAUDE.md's hard rules.
import { AlertComponent } from '@/shared/ui/alert/alert.component';
import { ButtonComponent } from '@/shared/ui/button/button.component';
import { TypographyComponent } from '@/shared/ui/typography/typography.component';

/**
 * The one-time notice that this account's figures live on a server somebody has to back up
 * (TICKET-PUB-04).
 *
 * Until v3 the equivalent message was a privacy one — "nothing ever leaves your browser" — and the
 * ticket was written to deliver exactly that. The data moved
 * ([TICKET-SRV-05](../../../../../docs/server/tickets/TICKET-SRV-05-repositories-over-http.md)),
 * which turned that sentence into a false claim and left the *useful* half unsaid: a browser
 * profile was at least being caught by whatever backs up the machine, and one SQLite file the user
 * has never heard of is not. So this says where the data is and that losing that file loses
 * everything, which is the part nobody can infer.
 *
 * **It is the nudge, not the explanation.** The authoritative copy is the "Where your data lives"
 * panel on Settings → Data (`feature-data-management`), which this deliberately echoes in two
 * sentences and defers to — including its split between the export, which is the user's own, and
 * the server's database file, which is the operator's. Keep the two in step if either changes.
 *
 * **Not shown on an empty account.** A fresh account has nothing to lose, and a banner there would
 * compete with the Import call-to-action that owns that screen
 * ([TICKET-STAT-22](../../../../../docs/dashboard/tickets/TICKET-STAT-22-empty-dashboard-state.md)).
 * Waiting for the first transactions also means it arrives at the moment the warning is about
 * something real.
 */
@Component({
  selector: 'app-backup-reminder',
  imports: [AlertComponent, ButtonComponent, TypographyComponent],
  templateUrl: './backup-reminder.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BackupReminderComponent {
  private readonly reminder = inject(BackupReminderService);
  private readonly sessionStore = inject(SessionStore);
  private readonly transactionsStore = inject(TransactionsStore);

  /**
   * Re-read per signed-in user rather than seeded once, because the flag is per account: signing
   * out and back in as somebody else has to re-evaluate it, and a `signal` captured at construction
   * would carry the previous user's answer.
   */
  private readonly dismissedFor = signal<number | null>(null);

  private readonly userId = computed(() => this.sessionStore.user()?.id ?? null);

  /**
   * `hydrated` is what keeps this from flashing: an un-hydrated store reads as empty, so without it
   * the banner would be hidden on load, appear when the transactions arrived, and look like a
   * glitch rather than a notice.
   */
  protected readonly visible = computed(() => {
    const userId = this.userId();
    if (userId === null) return false;
    if (this.dismissedFor() === userId || this.reminder.isDismissed(userId)) return false;
    return this.transactionsStore.hydrated() && this.transactionsStore.transactions().length > 0;
  });

  protected dismiss(): void {
    const userId = this.userId();
    if (userId === null) return;
    this.reminder.dismiss(userId);
    this.dismissedFor.set(userId);
  }
}
