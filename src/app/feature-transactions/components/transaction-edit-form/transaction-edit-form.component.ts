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
  viewChild,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import type { Category, Transaction } from '@/core/data-access';
import { categoryAppliesOn, withEndedSuffix } from '@/core/categorisation';
import { validateNullified } from '@/core/transactions';
import { AccountsStore, CategoriesStore } from '@/core/state';
import { RulesStore } from '@/feature-categories';
import {
  ButtonComponent,
  ConfirmDialogComponent,
  FieldsetComponent,
  FlexComponent,
  LabelComponent,
  MmModalComponent,
  SelectComponent,
  TableComponent,
  TypographyComponent,
} from '@/shared/ui';
import { formatCurrency, formatDate } from '@/shared/utils';
import { AttributionOverrideFieldsetComponent } from '../attribution-override-fieldset/attribution-override-fieldset.component';
import type { CategorySelectOption } from '../../category-picker';

const todayIso = (): string => new Date().toISOString().slice(0, 10);

export type TransactionEditResult = Partial<
  Pick<Transaction, 'categoryId' | 'categoryManual' | 'notes' | 'attributionOverride' | 'nullified'>
>;

@Component({
  selector: 'app-transaction-edit-form',
  imports: [
    ReactiveFormsModule,
    ButtonComponent,
    ConfirmDialogComponent,
    FieldsetComponent,
    FlexComponent,
    LabelComponent,
    SelectComponent,
    MmModalComponent,
    AttributionOverrideFieldsetComponent,
    TableComponent,
    TypographyComponent,
  ],
  templateUrl: './transaction-edit-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransactionEditFormComponent {
  readonly open = model(false);
  readonly transaction = input<Transaction | null>(null);
  readonly saved = output<TransactionEditResult>();
  readonly deleteRequested = output<void>();

  private readonly categoriesStore = inject(CategoriesStore);
  private readonly rulesStore = inject(RulesStore);
  private readonly accountsStore = inject(AccountsStore);

  protected readonly attributionFieldset = viewChild(AttributionOverrideFieldsetComponent);

  private readonly formBuilder = inject(FormBuilder);

  protected readonly form = this.formBuilder.nonNullable.group({
    categoryId: [''],
    notes: [''],
    alwaysCategorise: [false],
    nullified: [false],
  });

  protected readonly nullifiedError = signal<string | null>(null);

  /** A linked transfer leg is already excluded from income/expense and has no category — the toggle is hidden for it (TICKET-TXN-04). */
  protected readonly isTransferLeg = computed(() => this.transaction()?.transferId != null);

  protected readonly deleteConfirmOpen = signal(false);

  /**
   * True only while this dialog is closed *by us* to make room for the delete confirm
   * (TICKET-UI-30) — never while the user closed it themselves.
   */
  private readonly confirmDetour = signal(false);

  /**
   * The edit **session**, as distinct from which dialog is on screen: it spans the detour through
   * the delete confirm, so a cancelled delete returns to a form nobody re-seeded.
   *
   * Everything that seeds a control reads this rather than `open`, this component's own form and
   * `app-attribution-override-fieldset` alike — the fieldset is mounted outside the `@if (open())`
   * and reseeds on every `false → true` of its own `open` input, so handing it the raw dialog state
   * would silently discard an unsaved attribution pick on the way back while leaving `notes` intact.
   */
  protected readonly editSessionOpen = computed(() => this.open() || this.confirmDetour());

  /**
   * Which transaction is about to be deleted, in enough detail to check (TICKET-UI-30). Description
   * alone is not enough: the seeded dataset alone has eight rows reading "Supermarket", so the
   * confirm named a row the user had no way to identify. Date and amount are what the user is
   * looking at in the table.
   */
  private readonly deleteSubject = computed(() => {
    const transaction = this.transaction();
    if (!transaction) return '';
    const description = transaction.counterpartyName ?? transaction.rawDescription;
    return `${formatDate(transaction.bookingDate)} · ${formatCurrency(transaction.amount, {
      signed: true,
    })} · ${description}`;
  });

  /** Stern, deletion-specific warning — names the row, then calls out the transfer-unlink side effect when it applies. */
  protected readonly deleteMessage = computed(() =>
    [
      this.deleteSubject(),
      'This permanently deletes this transaction and cannot be undone.',
      this.isTransferLeg() ? 'Its linked transfer will also be removed.' : '',
    ]
      .filter(Boolean)
      .join(' — '),
  );

  constructor() {
    // Keyed on the session, not the dialog: a return from a cancelled delete confirm is not a fresh
    // open, and re-seeding there would throw away edits the user had not saved yet (TICKET-UI-30).
    effect(() => {
      if (this.editSessionOpen()) {
        this.resetForm();
      }
    });
  }

  private categoryLabel(category: Category): string {
    return category.group ? `${category.group} · ${category.name}` : category.name;
  }

  /**
   * The categories offerable to *this* transaction (TICKET-CAT-11) — those whose applicability
   * window covers its booking date, so editing a 2022 row still offers a rent that ended in 2023
   * while a fresh import from this month does not.
   *
   * The already-assigned category is appended when the window filter drops it, marked "(ended)":
   * a `<select>` whose value is not among its options is a broken control, and re-opening an old
   * transaction is not the moment to silently un-categorise it.
   */
  protected readonly categoryOptions = computed<CategorySelectOption[]>(() => {
    const transaction = this.transaction();
    const categories = this.categoriesStore.activeCategories();
    if (!transaction) return [];

    const today = todayIso();
    const options = categories
      .filter((category) => categoryAppliesOn(category, transaction.bookingDate))
      .map((category) => ({ value: String(category.id), label: this.categoryLabel(category) }));

    const assigned = categories.find((category) => category.id === transaction.categoryId);
    if (assigned && !categoryAppliesOn(assigned, transaction.bookingDate)) {
      options.push({
        value: String(assigned.id),
        label: withEndedSuffix(this.categoryLabel(assigned), assigned, today),
      });
    }

    return options;
  });

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

  private resetForm(): void {
    const existing = this.transaction();
    this.form.reset({
      categoryId: existing?.categoryId != null ? String(existing.categoryId) : '',
      notes: existing?.notes ?? '',
      alwaysCategorise: false,
      nullified: existing?.nullified ?? false,
    });
    this.nullifiedError.set(null);
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
      const built = this.attributionFieldset()?.buildOverride();
      if (!built) {
        return;
      }
      result.attributionOverride = built.value;
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

  /**
   * Hands the screen over to the confirm rather than stacking on top of it (TICKET-UI-30). The
   * confirm used to open over a still-live edit dialog, whose un-dimmed "Save changes" stayed
   * clickable behind it and whose Escape target was ambiguous. Closing this one first leaves exactly
   * one `showModal()` dialog open, so the focus trap, the backdrop and Escape all have one owner.
   */
  protected confirmDelete(): void {
    // Detour first: `editSessionOpen` must not dip to false between these two writes, or the seed
    // effect fires and the form the user is about to come back to is already blank.
    this.confirmDetour.set(true);
    this.open.set(false);
    this.deleteConfirmOpen.set(true);
  }

  /**
   * The confirm closes itself on both Cancel and Confirm, so this is where "backed out" is told from
   * "went through": backing out returns to the edit dialog, with whatever was typed still in the
   * form (`restoringFromConfirm` suppresses the reset).
   */
  protected onDeleteConfirmOpenChange(open: boolean): void {
    this.deleteConfirmOpen.set(open);
    // `onDeleteConfirmed` has already ended the detour when the delete went through, so a still-open
    // detour is what a Cancel or an Escape looks like — there is no second flag reconstructing it.
    if (open || !this.confirmDetour()) return;

    this.open.set(true);
    this.confirmDetour.set(false);
  }

  /** `ConfirmDialogComponent` emits this *before* closing itself, so the detour is already over by the time `onDeleteConfirmOpenChange` sees the close. */
  protected onDeleteConfirmed(): void {
    this.confirmDetour.set(false);
    this.deleteRequested.emit();
  }
}
