import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
  type AbstractControl,
  type ValidationErrors,
} from '@angular/forms';
import { SessionStore } from '@/core/auth';
import {
  AlertComponent,
  ButtonComponent,
  FieldsetComponent,
  InputComponent,
  TypographyComponent,
} from '@/shared/ui';

/**
 * The new password and its confirmation have to agree **before** anything is sent (TICKET-AUTH-04).
 * A group validator rather than one on the confirm field: the rule is about the pair, and hanging it
 * on one control would leave the error stale after the *other* field is edited.
 *
 * Colocated with its form, per the conventions — there is no `shared/utils/validators/` yet, and a
 * two-field equality check is not vocabulary anything else shares.
 */
const passwordsMatch = (group: AbstractControl): ValidationErrors | null =>
  group.get('newPassword')?.value === group.get('confirmPassword')?.value
    ? null
    : { mismatch: true };

/**
 * The self-service password change (TICKET-AUTH-04), so an admin reset is the fallback rather than
 * the only route.
 *
 * Its own component rather than more of `settings-account-section`: that section was carrying two
 * unrelated forms, and the combined template was the most complex in the feature by a factor of two.
 * Renaming yourself and replacing your password share a heading and nothing else — no state, no
 * validation and no submit path.
 *
 * Feedback lives in this component's own signals rather than on `SessionStore`: this is a page you
 * stay on and come back to, and a root store's error would still be showing on the next visit.
 */
@Component({
  selector: 'app-account-password-form',
  imports: [
    ReactiveFormsModule,
    AlertComponent,
    ButtonComponent,
    FieldsetComponent,
    InputComponent,
    TypographyComponent,
  ],
  templateUrl: './account-password-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountPasswordFormComponent {
  /**
   * Whether this account is still on the password it was created with — the reminder banner's
   * counterpart, stated where it can be acted on. Passed in rather than read from the store again:
   * the section above already has the user, and one owner of that fact is enough.
   */
  readonly usingDefaultPassword = input(false);

  private readonly sessionStore = inject(SessionStore);

  protected readonly form = inject(FormBuilder).nonNullable.group(
    {
      currentPassword: ['', Validators.required],
      newPassword: ['', Validators.required],
      confirmPassword: ['', Validators.required],
    },
    { validators: passwordsMatch },
  );

  protected readonly pending = signal(false);
  protected readonly saved = signal(false);
  protected readonly error = signal<string | null>(null);

  protected async submit(): Promise<void> {
    // The submit button stays enabled on a mismatch on purpose — a dead button explains nothing,
    // whereas `markAllAsTouched` reveals the inline "do not match" line. So this guard is the only
    // thing standing between a mismatched pair and the server, and it has to hold for Enter-in-a-field
    // as much as for a click.
    if (this.form.invalid || this.pending()) {
      this.form.markAllAsTouched();
      return;
    }

    this.pending.set(true);
    this.saved.set(false);
    this.error.set(null);

    const { currentPassword, newPassword } = this.form.getRawValue();
    const failure = await this.sessionStore.changePassword(currentPassword, newPassword);

    this.pending.set(false);
    if (failure !== null) {
      this.error.set(failure);
      return;
    }

    // All three fields cleared on success — nothing secret is left on screen, and the form is ready
    // to be used again rather than showing the values that were just replaced.
    this.form.reset();
    this.saved.set(true);
  }
}
