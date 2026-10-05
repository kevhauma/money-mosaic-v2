import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { BackupReminderService } from '@/core/onboarding';
import { TransactionsStore } from '@/core/state';
// Imported straight from their files rather than through the `@/shared/ui` barrel, for the same
// reason `app-shell.component.ts` and `default-password-notice.component.ts` do it: that barrel
// re-exports every primitive and `@Component` has side effects esbuild cannot tree-shake, so one
// barrel import here would pull the whole of `shared/ui` (and `@angular/forms` behind it) into the
// shell's chunk.
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
  private readonly transactionsStore = inject(TransactionsStore);

  /**
   * Seeded from storage once rather than read per change detection, and flipped by `dismiss()` so
   * the banner disappears without waiting for anything to re-read `localStorage`.
   */
  private readonly dismissed = signal(this.reminder.isDismissed());

  /**
   * `hydrated` is what keeps this from flashing: an un-hydrated store reads as empty, so without it
   * the banner would be hidden on load, appear when the transactions arrived, and look like a
   * glitch rather than a notice.
   */
  protected readonly visible = computed(
    () =>
      !this.dismissed() &&
      this.transactionsStore.hydrated() &&
      this.transactionsStore.transactions().length > 0,
  );

  protected dismiss(): void {
    this.reminder.dismiss();
    this.dismissed.set(true);
  }
}
