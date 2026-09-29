import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import type { ImportMode } from '@/core/data-access';
// Imported straight from their files rather than through the `@/shared/ui` barrel, for the same
// reason `app-shell.component.ts` and `default-password-notice.component.ts` do it: the shell mounts
// this eagerly, `@Component` has side effects esbuild cannot tree-shake, and one barrel import would
// pull the whole of `shared/ui` (and `@angular/forms` behind it) into the shell's chunk.
import { AlertComponent } from '@/shared/ui/alert/alert.component';
import { ButtonComponent } from '@/shared/ui/button/button.component';
import { MmModalComponent } from '@/shared/ui/modal/mm-modal.component';
import { TypographyComponent } from '@/shared/ui/typography/typography.component';
import { LocalMigrationService } from '../local-migration.service';

/** One line of "what landed", already counted and already worded — the template only renders it. */
export type MigrationTally = {
  readonly label: string;
  readonly count: number;
};

/** Plural-safe table names, for the two lists this dialog shows. Anything else falls back to its own name. */
const TABLE_LABELS: Record<string, string> = {
  accounts: 'accounts',
  categories: 'categories',
  transactions: 'transactions',
  transfers: 'linked transfers',
  rules: 'rules',
  mappingProfiles: 'import mappings',
  importBatches: 'import batches',
  loans: 'loans',
  savingsGoals: 'savings goals',
  salaryMetadata: 'salary months',
  recurringOverrides: 'recurring corrections',
};

const labelFor = (table: string): string => TABLE_LABELS[table] ?? table;

const tally = (counts: Record<string, number> | undefined): MigrationTally[] =>
  Object.entries(counts ?? {})
    .filter(([, count]) => count > 0)
    .map(([table, count]) => ({ label: labelFor(table), count }));

/**
 * The offer to move a database already sitting in this browser into the signed-in account, and the
 * report of what happened when it was accepted (TICKET-SRV-07).
 *
 * Mounted once, by the app shell, so it can appear on whichever page a sign-in lands on — and
 * unconditionally, because `LocalMigrationService` owns the rule about whether there is anything to
 * offer. The Data section re-opens the same dialog through the same service rather than owning a
 * second copy of this conversation.
 */
@Component({
  selector: 'app-local-migration-dialog',
  imports: [AlertComponent, ButtonComponent, MmModalComponent, TypographyComponent],
  templateUrl: './local-migration-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LocalMigrationDialogComponent {
  protected readonly service = inject(LocalMigrationService);

  /**
   * `null` is a real state, not an unset one: when the account already holds data the ticket asks
   * for merge or replace with **neither** preselected, so that nothing is chosen by not reading.
   */
  protected readonly mode = signal<ImportMode | null>(null);
  protected readonly replaceConfirmed = signal(false);
  protected readonly deletingLocalCopy = signal(false);

  /** Whether the account holds rows of the user's own, as opposed to the first-run seed. */
  protected readonly needsChoice = computed(() => this.service.account()?.hasExistingData === true);

  /**
   * Whether the merge/replace radios are on screen. Shown when the account holds something of its
   * own, and also when this browser has already been moved into it — there the account may look
   * empty by row count while merging again would still duplicate everything, so the decision cannot
   * be defaulted away.
   */
  protected readonly needsModeChoice = computed(
    () => this.needsChoice() || this.service.alreadyMoved(),
  );

  /**
   * An account with nothing of its own is merged into without a question — unless this browser's
   * data has already been moved into it, in which case there is no safe default: merging again
   * duplicates everything, so the choice has to be made deliberately.
   */
  protected readonly chosenMode = computed<ImportMode | null>(() =>
    this.needsModeChoice() ? this.mode() : 'merge',
  );

  protected readonly canMove = computed(() => {
    const mode = this.chosenMode();
    if (mode === null) return false;
    return mode !== 'replace' || this.replaceConfirmed();
  });

  /** What was found in the browser, as one sentence. */
  protected readonly foundLine = computed(() => {
    const summary = this.service.summary();
    if (summary === null) return '';

    const range =
      summary.earliestBookingDate === null || summary.latestBookingDate === null
        ? ''
        : `, dated ${summary.earliestBookingDate} to ${summary.latestBookingDate}`;
    return `${summary.transactions} transactions across ${summary.accounts} accounts${range}.`;
  });

  protected readonly hasTrainedModel = computed(
    () => this.service.summary()?.hasTrainedModel === true,
  );

  /** What replacing would destroy, named — the ticket's explicit-confirmation requirement. */
  protected readonly existingLine = computed(() => {
    const counts = this.service.account()?.counts;
    if (counts === undefined) return '';
    return `${counts['transactions'] ?? 0} transactions and ${counts['accounts'] ?? 0} accounts already in this account`;
  });

  protected readonly migratedTallies = computed(() => tally(this.service.report()?.migrated));
  protected readonly reusedTallies = computed(() => tally(this.service.report()?.reused));
  protected readonly skippedTallies = computed(() => tally(this.service.report()?.skipped));
  /** Kept out of `reusedTallies`: this is data discarded, not a duplicate recognised. */
  protected readonly displacedTallies = computed(() => tally(this.service.report()?.displaced));
  protected readonly clearedReferences = computed(
    () => this.service.report()?.clearedReferences ?? 0,
  );

  protected onOpenChange(open: boolean): void {
    if (!open) this.close();
  }

  /** Dismissing an unanswered offer means "later", never "never". */
  protected close(): void {
    if (this.service.status() === 'offered') this.service.remindLater();
    else this.service.dismiss();
  }

  protected setMode(mode: ImportMode): void {
    this.mode.set(mode);
    this.replaceConfirmed.set(false);
  }

  protected async move(): Promise<void> {
    const mode = this.chosenMode();
    if (mode === null || !this.canMove()) return;
    await this.service.migrate(mode);
  }

  protected async deleteLocalCopy(): Promise<void> {
    this.deletingLocalCopy.set(true);
    try {
      await this.service.deleteLocalCopy();
    } finally {
      this.deletingLocalCopy.set(false);
    }
  }
}
