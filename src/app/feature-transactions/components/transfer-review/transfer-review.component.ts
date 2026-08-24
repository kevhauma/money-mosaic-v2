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
import {
  ButtonComponent,
  FieldsetComponent,
  FlexComponent,
  InputComponent,
  LabelComponent,
  PaperComponent,
  TypographyComponent,
} from '@/shared/ui';
import { LocaleDatePipe, negativeMoneyColor, SignedAmountPipe } from '@/shared/utils';

@Component({
  selector: 'app-transfer-review',
  imports: [
    ReactiveFormsModule,
    NgIcon,
    LocaleDatePipe,
    SignedAmountPipe,
    ButtonComponent,
    FieldsetComponent,
    FlexComponent,
    InputComponent,
    LabelComponent,
    PaperComponent,
    TypographyComponent,
  ],
  templateUrl: './transfer-review.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  viewProviders: [provideIcons({ tablerRefresh })],
})
export class TransferReviewComponent {
  /** The one money-colour rule, bound rather than restated per amount (TICKET-UI-27). These two lists
   * are built by a template-called method, not a view-model, so the helper is exposed here instead of
   * being joined onto a row field the way the transactions and suggestions tables do it. */
  protected readonly amountColor = negativeMoneyColor;
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

  protected readonly reviewExpanded = signal(false);

  /**
   * Unique-but-disabled and genuinely ambiguous candidates, surfaced for one-click confirmation
   * (FR-TRF-3).
   *
   * **No longer gated on `reviewExpanded`** (TICKET-TRF-06, re-deciding CR-2.2). The gate made the
   * scan free while collapsed, but it also meant the collapsed trigger could not say how many pairs
   * were waiting — and a review step that cannot tell you whether it is done, pending or empty is a
   * step users never learn to perform. The count is the whole point of the trigger, so it has to be
   * true whether or not the panel is open.
   *
   * The cost is bounded: this is a `computed`, so it runs once per change to the underlying data
   * rather than per change-detection pass, it only ever considers *unlinked* transactions, and the
   * panel exists on `/transactions` alone. If it does become a problem, move the scan behind a
   * worker rather than putting the gate back — the gate is what hid the step.
   */
  protected readonly ambiguousCandidates = computed<TransferCandidate[]>(
    () =>
      resolveTransferMatches(
        this.transactionsStore.transactions(),
        this.accountsStore.accounts(),
        this.categoriesStore.categories(),
        this.settingsStore.matchWindowDays(),
        this.settingsStore.autoLinkMediumConfidence(),
      ).ambiguous,
  );

  /** How many pairs are waiting on the user — the figure the trigger states (TICKET-TRF-06). */
  protected readonly pendingCount = computed(() => this.ambiguousCandidates().length);

  /** How many pairs are already linked, so "nothing to review" reads as *resolved* rather than as *empty*. */
  protected readonly linkedCount = computed(() => this.transfersStore.transfers().length);

  /**
   * The trigger's own status line (TICKET-TRF-06). Three states, deliberately worded apart: pairs
   * waiting, everything linked and nothing waiting, and no transfers at all — an app with no linked
   * pairs and no candidates has not "finished reviewing", it has nothing to review yet.
   */
  protected readonly reviewStatus = computed(() => {
    const pending = this.pendingCount();
    const linked = this.linkedCount();

    if (pending > 0)
      return `${pending} pair${pending === 1 ? '' : 's'} need${pending === 1 ? 's' : ''} review`;
    if (linked > 0) return `${linked} pair${linked === 1 ? '' : 's'} linked, none to review`;
    return 'No transfers found yet';
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
