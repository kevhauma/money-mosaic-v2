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
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import type { ValidationErrors, ValidatorFn } from '@angular/forms';
import type { Account, JointOwner } from '@/core/data-access';
import { ButtonComponent, InputComponent, MmModalComponent, SelectComponent } from '@/shared/ui';
import { fractionToPercentage, normalizeIban, percentageToFraction } from '@/shared/utils';
import { ibanValidator } from '@/shared/utils/validators/iban.validator';
import { percentageValidator } from '@/shared/utils/validators/percentage.validator';
import { ICON_BY_ACCOUNT_TYPE } from '../../account-icons';

export type AccountFormValue = Omit<Account, 'id' | 'archived'>;

type CoOwnerGroup = FormGroup<{
  name: FormControl<string>;
  ibans: FormArray<FormControl<string>>;
  sharePercent: FormControl<string>;
}>;

const today = (): string => new Date().toISOString().slice(0, 10);

/** A co-owner sub-form needs at least one non-blank IBAN to be a valid person to attribute to. */
const requireAtLeastOneIbanValidator: ValidatorFn = (control): ValidationErrors | null => {
  const array = control as FormArray<FormControl<string>>;
  const hasValue = array.controls.some((iban) => iban.value.trim().length > 0);
  return hasValue ? null : { required: true };
};

/**
 * A duplicate IBAN (across co-owners, or matching the account's own IBAN) would make attribution
 * ambiguous — reject it at the whole-form level so the message can name the collision generically.
 */
const uniqueCoOwnerIbansValidator: ValidatorFn = (control): ValidationErrors | null => {
  const group = control as FormGroup<{
    iban: FormControl<string>;
    coOwners: FormArray<CoOwnerGroup>;
  }>;
  const seen = new Set<string>();

  const ownIban = normalizeIban(group.controls.iban?.value);
  if (ownIban) {
    seen.add(ownIban);
  }

  for (const coOwner of group.controls.coOwners?.value ?? []) {
    for (const raw of coOwner.ibans ?? []) {
      const normalized = normalizeIban(raw);
      if (!normalized) {
        continue;
      }
      if (seen.has(normalized)) {
        return { duplicateIban: true };
      }
      seen.add(normalized);
    }
  }

  return null;
};

@Component({
  selector: 'app-account-form',
  imports: [
    ReactiveFormsModule,
    ButtonComponent,
    InputComponent,
    SelectComponent,
    MmModalComponent,
  ],
  templateUrl: './account-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountFormComponent {
  readonly open = model(false);
  readonly account = input<Account | null>(null);
  readonly saved = output<AccountFormValue>();

  private readonly formBuilder = inject(FormBuilder);

  protected readonly form = this.formBuilder.nonNullable.group(
    {
      name: ['', Validators.required],
      type: this.formBuilder.nonNullable.control<Account['type']>('checking', Validators.required),
      iban: ['', ibanValidator],
      openingBalance: [0, Validators.required],
      openingBalanceDate: [today(), Validators.required],
      color: ['#7F77DD', Validators.required],
      icon: ['wallet', Validators.required],
      ownershipSharePercent: ['', percentageValidator],
      coOwners: this.formBuilder.array<CoOwnerGroup>([]),
    },
    { validators: uniqueCoOwnerIbansValidator },
  );

  /** Drives the ownership-share placeholder; updated alongside add/remove rather than derived from
   *  the FormArray directly, since FormArray changes aren't natively reactive. */
  private readonly coOwnerCount = signal(0);
  private isResetting = false;

  protected readonly selectedType = toSignal(this.form.controls.type.valueChanges, {
    initialValue: this.form.controls.type.value,
  });

  // "1 / (1 + co-owner count)", with 0 co-owners falling back to the 50/50 assumption used before
  // co-owners could be registered at all (TICKET-ACC-02) — i.e. the denominator's co-owner count is
  // floored at 1 rather than 0.
  protected readonly sharePlaceholder = computed(
    () => `${Math.round(100 / (1 + Math.max(this.coOwnerCount(), 1)))}%`,
  );

  protected get coOwnersArray(): FormArray<CoOwnerGroup> {
    return this.form.controls.coOwners;
  }

  constructor() {
    effect(() => {
      if (this.open()) {
        this.resetForm();
      }
    });

    this.form.controls.type.valueChanges.pipe(takeUntilDestroyed()).subscribe((type) => {
      // Skip while resetForm() is (re)hydrating the form for a newly opened/edited account — its own
      // logic already decides the correct coOwners/share for that account, in either order.
      if (this.isResetting || type === 'joint') {
        return;
      }
      this.form.controls.ownershipSharePercent.setValue('');
      this.coOwnersArray.clear();
      this.coOwnerCount.set(0);
    });
  }

  protected addCoOwner(): void {
    this.coOwnersArray.push(this.newCoOwnerGroup());
    this.coOwnerCount.set(this.coOwnersArray.length);
  }

  protected removeCoOwner(index: number): void {
    this.coOwnersArray.removeAt(index);
    this.coOwnerCount.set(this.coOwnersArray.length);
  }

  protected addIban(group: CoOwnerGroup): void {
    group.controls.ibans.push(this.newIbanControl());
  }

  protected removeIban(group: CoOwnerGroup, index: number): void {
    group.controls.ibans.removeAt(index);
  }

  private newIbanControl(value = ''): FormControl<string> {
    return this.formBuilder.nonNullable.control(value, ibanValidator);
  }

  private newCoOwnerGroup(owner?: JointOwner): CoOwnerGroup {
    const ibans = owner?.ibans.length ? owner.ibans : [''];
    return this.formBuilder.nonNullable.group({
      name: [owner?.name ?? '', Validators.required],
      ibans: this.formBuilder.array<FormControl<string>>(
        ibans.map((iban) => this.newIbanControl(iban)),
        requireAtLeastOneIbanValidator,
      ),
      sharePercent: [
        owner?.share != null ? String(fractionToPercentage(owner.share)) : '',
        percentageValidator,
      ],
    });
  }

  private resetForm(): void {
    this.isResetting = true;
    const existing = this.account();

    this.coOwnersArray.clear();
    for (const coOwner of existing?.coOwners ?? []) {
      this.coOwnersArray.push(this.newCoOwnerGroup(coOwner));
    }
    this.coOwnerCount.set(this.coOwnersArray.length);

    this.form.patchValue(
      existing
        ? {
            name: existing.name,
            type: existing.type,
            iban: existing.iban ?? '',
            openingBalance: existing.openingBalance,
            openingBalanceDate: existing.openingBalanceDate,
            color: existing.color,
            icon: existing.icon,
            ownershipSharePercent:
              existing.ownershipShare != null
                ? String(fractionToPercentage(existing.ownershipShare))
                : '',
          }
        : {
            name: '',
            type: 'checking',
            iban: '',
            openingBalance: 0,
            openingBalanceDate: today(),
            color: '#7F77DD',
            icon: ICON_BY_ACCOUNT_TYPE.checking,
            ownershipSharePercent: '',
          },
    );
    this.form.markAsPristine();
    this.form.markAsUntouched();
    this.isResetting = false;
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const coOwners: JointOwner[] = value.coOwners.map((coOwner) => ({
      name: coOwner.name,
      ibans: coOwner.ibans.map((iban) => iban.trim()).filter((iban) => iban.length > 0),
      share:
        coOwner.sharePercent === ''
          ? undefined
          : percentageToFraction(Number(coOwner.sharePercent)),
    }));

    this.saved.emit({
      name: value.name,
      type: value.type,
      iban: value.iban || undefined,
      currency: 'EUR',
      openingBalance: value.openingBalance,
      openingBalanceDate: value.openingBalanceDate,
      color: value.color,
      icon: value.icon,
      ownershipShare:
        value.ownershipSharePercent === ''
          ? undefined
          : percentageToFraction(Number(value.ownershipSharePercent)),
      coOwners: coOwners.length > 0 ? coOwners : undefined,
    });
    this.open.set(false);
  }

  protected cancel(): void {
    this.open.set(false);
  }
}
