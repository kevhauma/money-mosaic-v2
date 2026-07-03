import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  effect,
  inject,
  input,
  model,
  output,
  viewChild,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import type { Account } from '@/core/data-access';
import { ButtonComponent, InputComponent, SelectComponent } from '@/shared/ui';
import { ibanValidator } from '@/shared/utils/validators/iban.validator';
import { ICON_BY_ACCOUNT_TYPE } from '../../account-icons';

export type AccountFormValue = Omit<Account, 'id' | 'archived'>;

const today = (): string => new Date().toISOString().slice(0, 10);

@Component({
  selector: 'app-account-form',
  imports: [ReactiveFormsModule, ButtonComponent, InputComponent, SelectComponent],
  templateUrl: './account-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountFormComponent {
  readonly open = model(false);
  readonly account = input<Account | null>(null);
  readonly saved = output<AccountFormValue>();

  private readonly formBuilder = inject(FormBuilder);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  protected readonly form = this.formBuilder.nonNullable.group({
    name: ['', Validators.required],
    type: this.formBuilder.nonNullable.control<Account['type']>('checking', Validators.required),
    iban: ['', ibanValidator],
    openingBalance: [0, Validators.required],
    openingBalanceDate: [today(), Validators.required],
    color: ['#7F77DD', Validators.required],
    icon: ['wallet', Validators.required],
  });

  constructor() {
    effect(() => {
      const dialogElement = this.dialog().nativeElement;
      if (this.open()) {
        this.resetForm();
        dialogElement.showModal?.();
      } else {
        dialogElement.close?.();
      }
    });
  }

  private resetForm(): void {
    const existing = this.account();
    this.form.reset(
      existing
        ? {
            name: existing.name,
            type: existing.type,
            iban: existing.iban ?? '',
            openingBalance: existing.openingBalance,
            openingBalanceDate: existing.openingBalanceDate,
            color: existing.color,
            icon: existing.icon,
          }
        : {
            name: '',
            type: 'checking',
            iban: '',
            openingBalance: 0,
            openingBalanceDate: today(),
            color: '#7F77DD',
            icon: ICON_BY_ACCOUNT_TYPE.checking,
          },
    );
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    this.saved.emit({
      ...value,
      iban: value.iban || undefined,
      currency: 'EUR',
    });
    this.open.set(false);
  }

  protected cancel(): void {
    this.open.set(false);
  }
}
