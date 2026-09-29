import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  AlertComponent,
  ButtonComponent,
  FieldsetComponent,
  InputComponent,
  MmModalComponent,
  TypographyComponent,
} from '@/shared/ui';
import type { AdminUserRow } from '../../admin-user-row';
import { AdminUsersStore } from '../../admin-users.store';

/**
 * Resetting somebody else's password (TICKET-AUTH-03) — no current password, because the person who
 * forgot theirs is not the person at the keyboard.
 *
 * **The password is deliberately in plain text**, both while it is typed and in the confirmation
 * afterwards. There is no email delivery on a LAN-hosted box, so the only way this reaches the person
 * it belongs to is the admin reading it out — which is also why there is no confirm-it-twice field:
 * the value is on screen, so a typo is visible rather than guessed at. It is shown once, in this
 * dialog, and is never stored anywhere readable.
 *
 * The account comes in as the table's row view-model rather than being looked up here: the page has
 * it already, and the dialog needs only its id and a name to say whose password it is about.
 */
@Component({
  selector: 'app-admin-reset-password-dialog',
  imports: [
    ReactiveFormsModule,
    AlertComponent,
    ButtonComponent,
    FieldsetComponent,
    InputComponent,
    MmModalComponent,
    TypographyComponent,
  ],
  templateUrl: './admin-reset-password-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminResetPasswordDialogComponent {
  readonly account = input.required<AdminUserRow>();
  readonly closed = output<void>();

  private readonly store = inject(AdminUsersStore);

  protected readonly open = signal(true);
  protected readonly pending = signal(false);
  protected readonly error = signal<string | null>(null);
  /** The password that was actually set — what the admin now has to read out. */
  protected readonly issued = signal<string | null>(null);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    password: ['', Validators.required],
  });

  protected onOpenChange(open: boolean): void {
    this.open.set(open);
    if (!open) this.closed.emit();
  }

  protected async submit(): Promise<void> {
    if (this.form.invalid || this.pending()) {
      this.form.markAllAsTouched();
      return;
    }

    this.pending.set(true);
    this.error.set(null);

    const { password } = this.form.getRawValue();
    const failure = await this.store.resetPassword(this.account().id, password);

    this.pending.set(false);
    if (failure !== null) {
      this.error.set(failure);
      return;
    }

    // The dialog stays open on success, showing the password back: closing here would leave the admin
    // holding a password they can no longer see, on an account whose old one has already stopped
    // working.
    this.issued.set(password);
  }
}
