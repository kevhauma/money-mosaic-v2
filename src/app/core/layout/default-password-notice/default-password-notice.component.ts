import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { SessionStore } from '@/core/auth';
// Imported straight from their files rather than through the `@/shared/ui` barrel, for the same
// reason `app-shell.component.ts` does it: that barrel re-exports every primitive and `@Component`
// has side effects esbuild cannot tree-shake, so one barrel import here would pull the whole of
// `shared/ui` (and `@angular/forms` behind it) into the shell's chunk.
import { AlertComponent } from '@/shared/ui/alert/alert.component';
import { ButtonComponent } from '@/shared/ui/button/button.component';
import { TypographyComponent } from '@/shared/ui/typography/typography.component';

/**
 * The standing reminder that this installation is still running the `admin` / `admin` password every
 * copy of this app ships with (TICKET-AUTH-04).
 *
 * It **nags, it does not block**: this is a deliberately unsecured local-hosting setup, and someone
 * who wants the default password on their own LAN keeps it. Dismissal lasts the session — long
 * enough to get on with what you opened the app for, short enough that a real shared secret does not
 * quietly become permanent.
 *
 * Shown only to an admin still on the seeded password — `SessionStore.showDefaultPasswordNotice`
 * owns that rule, so the shell can mount this unconditionally.
 */
@Component({
  selector: 'app-default-password-notice',
  imports: [AlertComponent, ButtonComponent, TypographyComponent],
  templateUrl: './default-password-notice.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DefaultPasswordNoticeComponent {
  protected readonly sessionStore = inject(SessionStore);
}
