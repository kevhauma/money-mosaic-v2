import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import type { UserRole } from '@/core/auth';
import {
  AlertComponent,
  ButtonComponent,
  FieldsetComponent,
  InputComponent,
  MmModalComponent,
  SelectComponent,
  TypographyComponent,
} from '@/shared/ui';
import { AdminUsersStore } from '../../admin-users.store';

/**
 * The admin panel's create-account dialog (TICKET-AUTH-03). The server creates the account **and**
 * seeds its default categories, mapping profiles and transfer settings, so what this form starts is
 * a working app rather than an empty one.
 *
 * Its own component rather than more of the page's template, the `account-password-form` precedent:
 * a four-field form with its own validation and its own submit path shares nothing with the table
 * behind it but a heading.
 *
 * **Mounted fresh on each open** (`@if` in the page) and torn down on close, so nothing a previous
 * open typed — a password, above all — is still in the DOM the next time it appears. That is also why
 * it takes no `open` input: being rendered *is* being open, and dismissing it emits `closed`.
 */
@Component({
  selector: 'app-admin-create-account-dialog',
  imports: [
    ReactiveFormsModule,
    AlertComponent,
    ButtonComponent,
    FieldsetComponent,
    InputComponent,
    MmModalComponent,
    SelectComponent,
    TypographyComponent,
  ],
  templateUrl: './admin-create-account-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminCreateAccountDialogComponent {
  readonly closed = output<void>();

  private readonly store = inject(AdminUsersStore);

  protected readonly open = signal(true);
  protected readonly pending = signal(false);
  protected readonly error = signal<string | null>(null);

  /**
   * `Validators.required` on the identifier and no `Validators.email`, the login form's decision for
   * the same reason: the server takes the identifier as free text, and the account every installation
   * ships with is literally `admin`. A rule here would refuse identifiers the server accepts.
   */
  protected readonly form = inject(FormBuilder).nonNullable.group({
    email: ['', Validators.required],
    displayName: ['', Validators.required],
    password: ['', Validators.required],
    role: ['user' as UserRole, Validators.required],
  });

  protected onOpenChange(open: boolean): void {
    this.open.set(open);
    // Esc, the backdrop and the Cancel button all arrive here — one way out, so the page's mount
    // flag cannot drift from what is on screen.
    if (!open) this.closed.emit();
  }

  protected async submit(): Promise<void> {
    if (this.form.invalid || this.pending()) {
      this.form.markAllAsTouched();
      return;
    }

    this.pending.set(true);
    this.error.set(null);

    const failure = await this.store.createAccount(this.form.getRawValue());

    this.pending.set(false);
    if (failure !== null) {
      // The duplicate-email 409 lands here, in the dialog, with the typed values still in place —
      // changing one field is a keystroke rather than a re-entry.
      this.error.set(failure);
      return;
    }

    this.onOpenChange(false);
  }
}
