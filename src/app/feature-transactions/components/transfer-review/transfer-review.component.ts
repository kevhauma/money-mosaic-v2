import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { tablerRefresh } from '@ng-icons/tabler-icons';
import {
  AccountsStore,
  CategoriesStore,
  TransactionsStore,
  TransfersStore,
  TransferSettingsStore,
} from '@/core/state';
import { resolveTransferMatches, type TransferCandidate } from '@/core/transfers';
import { ButtonComponent, InputComponent, TypographyComponent } from '@/shared/ui';
import { SignedAmountPipe } from '@/shared/utils';

@Component({
  selector: 'app-transfer-review',
  imports: [
    ReactiveFormsModule,
    NgIcon,
    SignedAmountPipe,
    ButtonComponent,
    InputComponent,
    TypographyComponent,
  ],
  templateUrl: './transfer-review.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  viewProviders: [provideIcons({ tablerRefresh })],
})
export class TransferReviewComponent {
  protected readonly transactionsStore = inject(TransactionsStore);
  protected readonly accountsStore = inject(AccountsStore);
  protected readonly categoriesStore = inject(CategoriesStore);
  protected readonly transfersStore = inject(TransfersStore);
  protected readonly settingsStore = inject(TransferSettingsStore);

  private readonly formBuilder = inject(FormBuilder);

  protected readonly settingsForm = this.formBuilder.nonNullable.group({
    matchWindowDays: [this.settingsStore.matchWindowDays()],
    autoLinkMediumConfidence: [this.settingsStore.autoLinkMediumConfidence()],
  });

  /** Gates the expensive match scan: while collapsed the computed short-circuits, so editing a transaction never triggers a full re-match (CR-2.2). */
  protected readonly reviewExpanded = signal(false);

  /** Unique-but-disabled and genuinely ambiguous candidates, surfaced for one-click confirmation (FR-TRF-3). Only computed while the review section is expanded. */
  protected readonly ambiguousCandidates = computed<TransferCandidate[]>(() => {
    if (!this.reviewExpanded()) return [];
    return resolveTransferMatches(
      this.transactionsStore.transactions(),
      this.accountsStore.accounts(),
      this.categoriesStore.categories(),
      this.settingsStore.matchWindowDays(),
      this.settingsStore.autoLinkMediumConfidence(),
    ).ambiguous;
  });

  protected readonly lastRunCount = signal<number | null>(null);

  protected toggleReview(): void {
    this.reviewExpanded.update((expanded) => !expanded);
  }

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
