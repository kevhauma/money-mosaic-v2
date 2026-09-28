import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { SessionStore } from '@/core/auth';
// Imported straight from their files rather than through the `@/shared/ui` barrel: that barrel
// re-exports `mm-privacy-toggle`, which injects `AppSettingsStore` — importing it here would drag
// `@/core/state` (and Dexie behind it) into the login chunk, which is meant to carry nothing but
// the form (TICKET-AUTH-02). Same reasoning as `app.config.ts`'s note about the shell barrel.
import { AlertComponent } from '@/shared/ui/alert/alert.component';
import { ButtonComponent } from '@/shared/ui/button/button.component';
import { FieldsetComponent } from '@/shared/ui/fieldset/fieldset.component';
import { InputComponent } from '@/shared/ui/input/input.component';
import { PaperComponent } from '@/shared/ui/paper/paper.component';
import { TypographyComponent } from '@/shared/ui/typography/typography.component';

/** Where a sign-in lands when nothing else was asked for. */
const DEFAULT_LANDING_URL = '/dashboard';

/**
 * The pre-shell route (TICKET-AUTH-02): a full-page, sidebar-free sign-in form.
 *
 * Deliberately *not* a child of `AppShellComponent` — rendering it inside the shell would make the
 * nav, its icons and every feature store eager for a signed-out visitor, defeating the lazy-shell
 * decision `app.config.ts` documents.
 */
@Component({
  selector: 'app-login-page',
  imports: [
    ReactiveFormsModule,
    AlertComponent,
    ButtonComponent,
    FieldsetComponent,
    InputComponent,
    PaperComponent,
    TypographyComponent,
  ],
  templateUrl: './login-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPageComponent {
  /**
   * The URL the guard was stopping, bound straight off `?returnUrl=` by the router's component
   * input binding — the page reads the parameter at the routing layer and nowhere else.
   */
  readonly returnUrl = input<string>();

  private readonly sessionStore = inject(SessionStore);
  private readonly router = inject(Router);

  protected readonly pending = this.sessionStore.pending;
  protected readonly error = this.sessionStore.error;

  protected readonly form = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  protected async submit(): Promise<void> {
    if (this.form.invalid || this.pending()) {
      this.form.markAllAsTouched();
      return;
    }

    const { email, password } = this.form.getRawValue();
    const signedIn = await this.sessionStore.login(email, password);

    if (!signedIn) {
      // The form stays usable and keeps the identifier; only the secret is dropped, so a retry is
      // one field of typing rather than two.
      this.form.controls.password.reset('');
      return;
    }

    await this.router.navigateByUrl(this.returnUrl() ?? DEFAULT_LANDING_URL);
  }
}
