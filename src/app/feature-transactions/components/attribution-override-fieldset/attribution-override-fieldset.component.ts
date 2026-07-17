import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import type { Account, Transaction, Transfer } from '@/core/data-access';
import { reimbursementCandidates, validateAttributionOverride } from '@/core/transactions';
import { TransactionsStore, TransferSettingsStore, TransfersStore } from '@/core/state';
import { FieldsetComponent, SelectComponent, TypographyComponent } from '@/shared/ui';
import { SignedAmountPipe } from '@/shared/utils';

/** Built attribution override, or `undefined` when the mode select is left at "Default". */
export type AttributionOverrideResult = { value: Transaction['attributionOverride'] };

/**
 * The TICKET-TXN-03 attribution-override sub-feature of the transaction edit form: mode select,
 * joint-account picker (shown only when ambiguous), reimbursement-transfer picker, and validation.
 * Extracted from `TransactionEditFormComponent` (TICKET-SOLID-06) to keep the parent a small form.
 */
@Component({
  selector: 'app-attribution-override-fieldset',
  imports: [
    ReactiveFormsModule,
    FieldsetComponent,
    SelectComponent,
    SignedAmountPipe,
    TypographyComponent,
  ],
  templateUrl: './attribution-override-fieldset.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttributionOverrideFieldsetComponent {
  readonly open = input.required<boolean>();
  readonly transaction = input.required<Transaction | null>();
  readonly jointAccounts = input.required<Account[]>();

  private readonly transactionsStore = inject(TransactionsStore);
  private readonly transfersStore = inject(TransfersStore);
  private readonly transferSettingsStore = inject(TransferSettingsStore);
  private readonly formBuilder = inject(FormBuilder);

  protected readonly form = this.formBuilder.nonNullable.group({
    mode: [''],
    jointAccountId: [''],
    reimbursementTransferId: [''],
  });

  protected readonly error = signal<string | null>(null);

  constructor() {
    effect(() => {
      if (this.open()) {
        this.resetForm();
      }
    });
  }

  private resetForm(): void {
    const override = this.transaction()?.attributionOverride;
    this.form.reset({
      mode: override?.mode ?? '',
      jointAccountId: override?.jointAccountId != null ? String(override.jointAccountId) : '',
      reimbursementTransferId:
        override?.reimbursementTransferId != null ? String(override.reimbursementTransferId) : '',
    });
    this.error.set(null);
  }

  private readonly selectedMode = toSignal(this.form.controls.mode.valueChanges, {
    initialValue: this.form.controls.mode.value,
  });
  private readonly selectedJointAccountId = toSignal(
    this.form.controls.jointAccountId.valueChanges,
    { initialValue: this.form.controls.jointAccountId.value },
  );

  protected readonly showJointAccountPicker = computed(
    () => this.selectedMode() === 'shared' && this.jointAccounts().length > 1,
  );
  protected readonly showReimbursementPicker = computed(() => this.selectedMode() === 'shared');

  /** The joint account a `shared` override applies to — explicitly picked, or the sole one when unambiguous. */
  private readonly effectiveJointAccountId = computed<number | undefined>(() => {
    const raw = this.selectedJointAccountId();
    if (raw) return Number(raw);
    const accounts = this.jointAccounts();
    return accounts.length === 1 ? accounts[0].id : undefined;
  });

  private readonly transactionsById = computed(
    () =>
      new Map(
        this.transactionsStore.transactions().map((transaction) => [transaction.id!, transaction]),
      ),
  );

  /** Linked transfers touching the effective joint account within its `matchWindowDays` of this transaction (TICKET-TXN-03). */
  protected readonly reimbursementCandidateTransfers = computed<Transfer[]>(() => {
    const transactionEntity = this.transaction();
    const jointAccountId = this.effectiveJointAccountId();
    if (this.selectedMode() !== 'shared' || jointAccountId == null || !transactionEntity) {
      return [];
    }
    return reimbursementCandidates(
      this.transfersStore.transfers(),
      this.transactionsById(),
      jointAccountId,
      transactionEntity.bookingDate,
      this.transferSettingsStore.matchWindowDays(),
    );
  });

  protected transferAmount(transfer: Transfer): number {
    return Math.abs(this.transactionsById().get(transfer.fromTransactionId)?.amount ?? 0);
  }

  protected transferDate(transfer: Transfer): string {
    return this.transactionsById().get(transfer.fromTransactionId)?.bookingDate ?? '—';
  }

  /**
   * Builds and validates the override from current form state (TICKET-TXN-03). Returns `undefined`
   * and sets `error()` for the template to surface when validation fails; the caller must not submit.
   */
  buildOverride(): AttributionOverrideResult | undefined {
    const existing = this.transaction();
    if (!existing) {
      return undefined;
    }

    const value = this.form.getRawValue();
    const mode = value.mode;
    if (mode !== 'personal' && mode !== 'shared' && mode !== 'notMine') {
      this.error.set(null);
      return { value: undefined };
    }

    const pickedJointAccountId = value.jointAccountId ? Number(value.jointAccountId) : undefined;
    const jointAccountId =
      mode === 'shared' ? (pickedJointAccountId ?? this.effectiveJointAccountId()) : undefined;
    const reimbursementTransferId =
      mode === 'shared' && value.reimbursementTransferId
        ? Number(value.reimbursementTransferId)
        : undefined;

    const override: NonNullable<Transaction['attributionOverride']> = {
      mode,
      ...(jointAccountId != null ? { jointAccountId } : {}),
      ...(reimbursementTransferId != null ? { reimbursementTransferId } : {}),
    };

    try {
      validateAttributionOverride(existing, override, {
        jointAccounts: this.jointAccounts(),
        transactionsById: this.transactionsById(),
        transfersById: this.transfersStore.transfersById(),
      });
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Invalid attribution override.');
      return undefined;
    }

    this.error.set(null);
    return { value: override };
  }
}
