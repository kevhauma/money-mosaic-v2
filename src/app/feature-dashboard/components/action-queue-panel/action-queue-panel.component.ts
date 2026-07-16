import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { resolveTransferMatches } from '@/core/transfers';
import {
  AccountsStore,
  CategoriesStore,
  TransactionsStore,
  TransferSettingsStore,
} from '@/core/state';
import { LoadingSkeletonComponent, PaperComponent, TypographyComponent } from '@/shared/ui';
import { UNCATEGORISED_SENTINEL } from '@/shared/utils';

/** Uncategorised-backlog and transfers-needing-review action cards, each hidden when its count is zero. */
@Component({
  selector: 'app-action-queue-panel',
  imports: [LoadingSkeletonComponent, PaperComponent, TypographyComponent],
  templateUrl: './action-queue-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActionQueuePanelComponent {
  protected readonly transactionsStore = inject(TransactionsStore);
  private readonly accountsStore = inject(AccountsStore);
  private readonly categoriesStore = inject(CategoriesStore);
  private readonly transferSettingsStore = inject(TransferSettingsStore);

  protected readonly uncategorisedSentinel = UNCATEGORISED_SENTINEL;

  /** Same matching logic as TransferReviewComponent — reused rather than reimplemented (FR-TRF-3). */
  protected readonly transfersToReviewCount = computed(
    () =>
      resolveTransferMatches(
        this.transactionsStore.transactions(),
        this.accountsStore.accounts(),
        this.categoriesStore.categories(),
        this.transferSettingsStore.matchWindowDays(),
        this.transferSettingsStore.autoLinkMediumConfidence(),
      ).ambiguous.length,
  );
}
