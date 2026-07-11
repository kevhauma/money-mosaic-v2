import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  model,
  output,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import type { Category, Transaction, Transfer } from '@/core/data-access';
import {
  reimbursementCandidates,
  validateAttributionOverride,
  validateNullified,
} from '@/core/transactions';
import { AccountsStore } from '@/feature-accounts';
import { CategoriesStore, RulesStore } from '@/feature-categories';
import { ButtonComponent, MmModalComponent, SelectComponent } from '@/shared/ui';
import { SignedAmountPipe } from '@/shared/utils';
import { TransactionsStore } from '../../transactions.store';
import { TransferSettingsStore } from '../../transfer-settings.store';
import { TransfersStore } from '../../transfers.store';

export type TransactionEditResult = Partial<
  Pick<Transaction, 'categoryId' | 'categoryManual' | 'notes' | 'attributionOverride' | 'nullified'>
>;

@Component({
  selector: 'app-transaction-edit-form',
  imports: [
    ReactiveFormsModule,
    ButtonComponent,
    SelectComponent,
    MmModalComponent,
    SignedAmountPipe,
  ],
  templateUrl: './transaction-edit-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransactionEditFormComponent {
  readonly open = model(false);
  readonly transaction = input<Transaction | null>(null);
  readonly saved = output<TransactionEditResult>();

  protected readonly categoriesStore = inject(CategoriesStore);
  private readonly rulesStore = inject(RulesStore);
  private readonly accountsStore = inject(AccountsStore);
  private readonly transactionsStore = inject(TransactionsStore);
  private readonly transfersStore = inject(TransfersStore);
  private readonly transferSettingsStore = inject(TransferSettingsStore);

  private readonly formBuilder = inject(FormBuilder);

  protected readonly form = this.formBuilder.nonNullable.group({
    categoryId: [''],
    notes: [''],
    alwaysCategorise: [false],
    attributionMode: [''],
    attributionJointAccountId: [''],
    attributionReimbursementTransferId: [''],
    nullified: [false],
  });

  protected readonly attributionError = signal<string | null>(null);
  protected readonly nullifiedError = signal<string | null>(null);

  /** A linked transfer leg is already excluded from income/expense and has no category — the toggle is hidden for it (TICKET-TXN-04). */
  protected readonly isTransferLeg = computed(() => this.transaction()?.transferId != null);

  constructor() {
    effect(() => {
      if (this.open()) {
        this.resetForm();
      }
    });
  }

  protected categoryLabel(category: Category): string {
    return category.group ? `${category.group} · ${category.name}` : category.name;
  }

  protected readonly showAlwaysCategorise = computed(() => !!this.transaction()?.counterpartyName);

  /** Header→value pairs, in original column order, for the "Original CSV row" table (TICKET-TXN-06). */
  protected readonly rawRowEntries = computed(() => {
    const rawRow = this.transaction()?.rawRow;
    return rawRow ? Object.entries(rawRow) : [];
  });

  /** The one-off misattribution escape hatch only makes sense once a joint account exists (TICKET-TXN-03). */
  protected readonly jointAccounts = computed(() =>
    this.accountsStore.accounts().filter((account) => account.type === 'joint'),
  );
  protected readonly showAttribution = computed(() => this.jointAccounts().length > 0);

  private readonly selectedAttributionMode = toSignal(
    this.form.controls.attributionMode.valueChanges,
    { initialValue: this.form.controls.attributionMode.value },
  );
  private readonly selectedJointAccountId = toSignal(
    this.form.controls.attributionJointAccountId.valueChanges,
    { initialValue: this.form.controls.attributionJointAccountId.value },
  );

  protected readonly showJointAccountPicker = computed(
    () => this.selectedAttributionMode() === 'shared' && this.jointAccounts().length > 1,
  );
  protected readonly showReimbursementPicker = computed(
    () => this.selectedAttributionMode() === 'shared',
  );

  /** The joint account a `shared` override applies to — explicitly picked, or the sole one when unambiguous. */
  private readonly effectiveJointAccountId = computed<number | undefined>(() => {
    const raw = this.selectedJointAccountId();
    if (raw) return Number(raw);
    const accounts = this.jointAccounts();
    return accounts.length === 1 ? accounts[0].id : undefined;
  });

  /** Linked transfers touching the effective joint account within its `matchWindowDays` of this transaction (TICKET-TXN-03). */
  protected readonly reimbursementCandidateTransfers = computed<Transfer[]>(() => {
    const transactionEntity = this.transaction();
    const jointAccountId = this.effectiveJointAccountId();
    if (
      this.selectedAttributionMode() !== 'shared' ||
      jointAccountId == null ||
      !transactionEntity
    ) {
      return [];
    }
    const transactionsById = new Map(
      this.transactionsStore.transactions().map((transaction) => [transaction.id!, transaction]),
    );
    return reimbursementCandidates(
      this.transfersStore.transfers(),
      transactionsById,
      jointAccountId,
      transactionEntity.bookingDate,
      this.transferSettingsStore.matchWindowDays(),
    );
  });

  protected transferAmount(transfer: Transfer): number {
    return Math.abs(
      this.transactionsStore.transactions().find((t) => t.id === transfer.fromTransactionId)
        ?.amount ?? 0,
    );
  }

  protected transferDate(transfer: Transfer): string {
    return (
      this.transactionsStore.transactions().find((t) => t.id === transfer.fromTransactionId)
        ?.bookingDate ?? '—'
    );
  }

  private resetForm(): void {
    const existing = this.transaction();
    const override = existing?.attributionOverride;
    this.form.reset({
      categoryId: existing?.categoryId != null ? String(existing.categoryId) : '',
      notes: existing?.notes ?? '',
      alwaysCategorise: false,
      attributionMode: override?.mode ?? '',
      attributionJointAccountId:
        override?.jointAccountId != null ? String(override.jointAccountId) : '',
      attributionReimbursementTransferId:
        override?.reimbursementTransferId != null ? String(override.reimbursementTransferId) : '',
      nullified: existing?.nullified ?? false,
    });
    this.attributionError.set(null);
    this.nullifiedError.set(null);
  }

  private buildAttributionOverride(existing: Transaction): Transaction['attributionOverride'] {
    const value = this.form.getRawValue();
    const mode = value.attributionMode;
    if (mode !== 'personal' && mode !== 'shared' && mode !== 'notMine') {
      return undefined;
    }

    const pickedJointAccountId = value.attributionJointAccountId
      ? Number(value.attributionJointAccountId)
      : undefined;
    const jointAccountId =
      mode === 'shared' ? (pickedJointAccountId ?? this.effectiveJointAccountId()) : undefined;
    const reimbursementTransferId =
      mode === 'shared' && value.attributionReimbursementTransferId
        ? Number(value.attributionReimbursementTransferId)
        : undefined;

    const override: NonNullable<Transaction['attributionOverride']> = {
      mode,
      ...(jointAccountId != null ? { jointAccountId } : {}),
      ...(reimbursementTransferId != null ? { reimbursementTransferId } : {}),
    };

    validateAttributionOverride(existing, override, {
      jointAccounts: this.jointAccounts(),
      transactionsById: new Map(
        this.transactionsStore.transactions().map((transaction) => [transaction.id!, transaction]),
      ),
      transfersById: this.transfersStore.transfersById(),
    });

    return override;
  }

  protected async submit(): Promise<void> {
    const existing = this.transaction();
    if (!existing) {
      return;
    }

    const value = this.form.getRawValue();
    const categoryId = value.categoryId ? Number(value.categoryId) : undefined;
    const notes = value.notes.trim() || undefined;

    const result: TransactionEditResult = { notes };
    if (categoryId !== existing.categoryId) {
      result.categoryId = categoryId;
      result.categoryManual = true;
    }

    if (this.showAttribution()) {
      try {
        result.attributionOverride = this.buildAttributionOverride(existing);
      } catch (error) {
        this.attributionError.set(
          error instanceof Error ? error.message : 'Invalid attribution override.',
        );
        return;
      }
    }

    const nullified = value.nullified;
    try {
      validateNullified(existing, nullified);
    } catch (error) {
      this.nullifiedError.set(
        error instanceof Error ? error.message : 'This transaction cannot be nullified.',
      );
      return;
    }
    result.nullified = nullified;

    this.attributionError.set(null);
    this.nullifiedError.set(null);
    this.saved.emit(result);
    this.open.set(false);

    if (value.alwaysCategorise && categoryId != null) {
      await this.rulesStore.createRuleFromCounterparty(existing, categoryId);
    }
  }

  protected cancel(): void {
    this.open.set(false);
  }
}
