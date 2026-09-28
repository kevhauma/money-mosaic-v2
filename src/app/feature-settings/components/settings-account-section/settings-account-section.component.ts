import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { SessionStore, type UserRole } from '@/core/auth';
import {
  AlertComponent,
  BadgeComponent,
  ButtonComponent,
  FieldsetComponent,
  InputComponent,
  PaperComponent,
  TypographyComponent,
} from '@/shared/ui';
import { AccountPasswordFormComponent } from '../account-password-form/account-password-form.component';

/** What each role is called in the one place a user reads their own. */
const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrator',
  user: 'Standard user',
};

/**
 * Settings' Account section (TICKET-AUTH-04): who you are signed in as, and the display name you can
 * change about yourself. The password form below it is its own component — the two share a heading
 * and nothing else.
 *
 * The rename reports inline and holds its feedback in this component's own signals rather than
 * parking it on `SessionStore`: this is a page you stay on and come back to, and a root store's
 * error would still be showing on the next visit.
 */
@Component({
  selector: 'app-settings-account-section',
  imports: [
    ReactiveFormsModule,
    AccountPasswordFormComponent,
    AlertComponent,
    BadgeComponent,
    ButtonComponent,
    FieldsetComponent,
    InputComponent,
    PaperComponent,
    TypographyComponent,
  ],
  templateUrl: './settings-account-section.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsAccountSectionComponent {
  private readonly sessionStore = inject(SessionStore);
  private readonly formBuilder = inject(FormBuilder);

  protected readonly user = this.sessionStore.user;

  protected readonly roleLabel = computed(() => {
    const role = this.user()?.role;
    return role === undefined ? '' : ROLE_LABELS[role];
  });

  protected readonly nameForm = this.formBuilder.nonNullable.group({
    displayName: ['', Validators.required],
  });

  protected readonly namePending = signal(false);
  protected readonly nameSaved = signal(false);
  protected readonly nameError = signal<string | null>(null);

  constructor() {
    // Seeded once from the signed-in user rather than bound to it: this is an editable draft of the
    // name, and re-seeding it on every store patch would wipe what someone is halfway through
    // typing. The page sits behind the session guard, so there is a user by the time it mounts.
    this.nameForm.controls.displayName.setValue(this.user()?.displayName ?? '');
  }

  protected async saveDisplayName(): Promise<void> {
    if (this.nameForm.invalid || this.namePending()) {
      this.nameForm.markAllAsTouched();
      return;
    }

    this.namePending.set(true);
    this.nameSaved.set(false);
    this.nameError.set(null);

    const failure = await this.sessionStore.updateDisplayName(
      this.nameForm.getRawValue().displayName,
    );

    this.namePending.set(false);
    if (failure !== null) {
      this.nameError.set(failure);
      return;
    }
    this.nameSaved.set(true);
  }
}
