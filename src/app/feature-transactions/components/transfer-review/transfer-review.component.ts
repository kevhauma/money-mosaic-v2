import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { tablerRefresh } from '@ng-icons/tabler-icons';
import { AccountsStore } from '@/feature-accounts';
import { resolveTransferMatches, type TransferCandidate } from '@/core/transfers';
import { ButtonComponent, InputComponent } from '@/shared/ui';
import { SignedAmountPipe } from '@/shared/utils';
import { TransactionsStore } from '../../transactions.store';
import { TransfersStore } from '../../transfers.store';
import { TransferSettingsStore } from '../../transfer-settings.store';

@Component({
  selector: 'app-transfer-review',
  imports: [ReactiveFormsModule, NgIcon, SignedAmountPipe, ButtonComponent, InputComponent],
  templateUrl: './transfer-review.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  viewProviders: [provideIcons({ tablerRefresh })],
})
export class TransferReviewComponent {
  protected readonly transactionsStore = inject(TransactionsStore);
  protected readonly accountsStore = inject(AccountsStore);
  protected readonly transfersStore = inject(TransfersStore);
  protected readonly settingsStore = inject(TransferSettingsStore);

  private readonly formBuilder = inject(FormBuilder);

  protected readonly settingsForm = this.formBuilder.nonNullable.group({
    matchWindowDays: [this.settingsStore.matchWindowDays()],
    autoLinkMediumConfidence: [this.settingsStore.autoLinkMediumConfidence()],
  });

  /** Unique-but-disabled and genuinely ambiguous candidates, surfaced for one-click confirmation (FR-TRF-3). */
  protected readonly ambiguousCandidates = computed(
    () =>
      resolveTransferMatches(
        this.transactionsStore.transactions(),
        this.accountsStore.accounts(),
        this.settingsStore.matchWindowDays(),
        this.settingsStore.autoLinkMediumConfidence(),
      ).ambiguous,
  );

  protected readonly lastRunCount = signal<number | null>(null);

  protected accountName(accountId: number): string {
    return this.accountsStore.accounts().find((account) => account.id === accountId)?.name ?? '—';
  }

  protected async saveSettings(): Promise<void> {
    const value = this.settingsForm.getRawValue();
    await this.settingsStore.update(value);
  }

  protected async runAutoLink(): Promise<void> {
    this.lastRunCount.set(await this.transfersStore.runAutoLink());
  }

  protected confirmCandidate(candidate: TransferCandidate): void {
    void this.transfersStore.link(candidate.from, candidate.to);
  }
}
