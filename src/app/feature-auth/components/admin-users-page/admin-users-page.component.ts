import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { SessionStore } from '@/core/auth';
import {
  AlertComponent,
  BadgeComponent,
  ButtonComponent,
  ConfirmDialogComponent,
  EmptyStateComponent,
  InputComponent,
  LoadingSkeletonComponent,
  PageHeaderComponent,
  PaperComponent,
  TableComponent,
  TypographyComponent,
} from '@/shared/ui';
import { toAdminUserRow, type AdminUserRow } from '../../admin-user-row';
import { AdminUsersStore } from '../../admin-users.store';
import { AdminCreateAccountDialogComponent } from '../admin-create-account-dialog/admin-create-account-dialog.component';
import { AdminUserActionsComponent } from '../admin-user-actions/admin-user-actions.component';
import { AdminResetPasswordDialogComponent } from '../admin-reset-password-dialog/admin-reset-password-dialog.component';

/**
 * `/admin/users` (TICKET-AUTH-03) — every account on this installation, with create, rename,
 * promote/demote, disable and delete.
 *
 * Behind `adminGuard`, which redirects a non-admin rather than letting this render: every endpoint it
 * calls answers a non-admin with 403, so the page would be an error report. The guard is not the
 * enforcement, though — `requireAdmin` on the server is.
 *
 * The two dialogs are separate components mounted by `@if`, so each is created fresh and destroyed
 * with what it was holding (a plaintext password, in one case), and each row's five controls are
 * `app-admin-user-actions`. What stays here is the table, the feedback line and the decisions —
 * which row is being renamed, which account a dialog is about, what the delete confirmation says.
 */
@Component({
  selector: 'app-admin-users-page',
  imports: [
    ReactiveFormsModule,
    AdminCreateAccountDialogComponent,
    AdminResetPasswordDialogComponent,
    AdminUserActionsComponent,
    AlertComponent,
    BadgeComponent,
    ButtonComponent,
    ConfirmDialogComponent,
    EmptyStateComponent,
    InputComponent,
    LoadingSkeletonComponent,
    PageHeaderComponent,
    PaperComponent,
    TableComponent,
    TypographyComponent,
  ],
  templateUrl: './admin-users-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminUsersPageComponent {
  private readonly store = inject(AdminUsersStore);
  private readonly session = inject(SessionStore);
  private readonly router = inject(Router);

  protected readonly loading = this.store.loading;
  /** Why the list could not be loaded — the store's own state, with a retry beside it. */
  protected readonly loadError = this.store.error;

  /**
   * One display-ready row per account. Every label, badge colour and "may this row do that?" is
   * resolved here (`admin-user-row.ts`) rather than in the template.
   */
  protected readonly rows = computed<AdminUserRow[]>(() => {
    const context = {
      callerId: this.session.user()?.id ?? 0,
      enabledAdminCount: this.store.enabledAdminCount(),
    };
    return this.store.users().map((user) => toAdminUserRow(user, context));
  });

  protected readonly createOpen = signal(false);
  protected readonly resetTarget = signal<AdminUserRow | null>(null);
  protected readonly deleteTarget = signal<AdminUserRow | null>(null);
  protected readonly deleteOpen = signal(false);

  /** The row being renamed in place, and the field that renames it. One at a time, deliberately. */
  protected readonly editingId = signal<number | null>(null);
  /**
   * A one-field `FormGroup` rather than a bare `FormControl`: `(ngSubmit)` comes from a form
   * directive, so a `<form>` with no `[formGroup]` on it would bind an event that never fires and
   * Enter-in-the-field would silently do nothing.
   */
  protected readonly renameForm = inject(FormBuilder).nonNullable.group({
    displayName: ['', Validators.required],
  });

  /** The last action's outcome, shown above the table — every action reports to the same line. */
  protected readonly actionError = signal<string | null>(null);
  protected readonly actionNotice = signal<string | null>(null);

  /** What the delete confirmation says, and the phrase it makes the admin type to mean it. */
  protected readonly deletePrompt = computed(() => {
    const target = this.deleteTarget();
    if (target === null) return { title: 'Delete account?', message: '', phrase: '' };
    return {
      title: `Delete ${target.displayName}?`,
      message:
        `This erases the account and everything in it — every transaction, bank account, ` +
        `category, rule, import, loan, goal and setting ${target.displayName} owns. It cannot be ` +
        `undone. Type the account's email to confirm.`,
      phrase: target.email,
    };
  });

  protected startRename(row: AdminUserRow): void {
    this.clearFeedback();
    this.renameForm.setValue({ displayName: row.displayName });
    this.editingId.set(row.id);
  }

  protected cancelRename(): void {
    this.editingId.set(null);
  }

  protected async saveRename(row: AdminUserRow): Promise<void> {
    const displayName = this.renameForm.getRawValue().displayName.trim();
    if (displayName === '') {
      this.renameForm.markAllAsTouched();
      return;
    }

    this.editingId.set(null);
    await this.apply(this.store.saveChanges(row.id, { displayName }), `Renamed to ${displayName}.`);
  }

  protected async toggleRole(row: AdminUserRow): Promise<void> {
    const saved = await this.apply(
      this.store.saveChanges(row.id, { role: row.nextRole }),
      `${row.displayName} is now ${row.nextRole === 'admin' ? 'an administrator' : 'a member'}.`,
    );

    // Demoting *yourself* is allowed while another administrator remains — but it ends this page's
    // right to exist, and the session store is still holding the role from sign-in. Without this the
    // nav entry stays, `adminGuard` keeps admitting the URL, and every further action answers 403
    // with nothing on screen explaining why. Re-read the identity from the server, then leave.
    if (saved && row.isSelf && row.nextRole !== 'admin') {
      await this.session.refresh();
      await this.router.navigateByUrl('/dashboard');
    }
  }

  protected async toggleDisabled(row: AdminUserRow): Promise<void> {
    await this.apply(
      this.store.saveChanges(row.id, { disabled: row.disable }),
      row.disable
        ? `${row.displayName} is disabled and has been signed out everywhere.`
        : `${row.displayName} can sign in again.`,
    );
  }

  protected askDelete(row: AdminUserRow): void {
    this.clearFeedback();
    this.deleteTarget.set(row);
    this.deleteOpen.set(true);
  }

  protected async confirmDelete(): Promise<void> {
    const target = this.deleteTarget();
    if (target === null) return;

    this.deleteTarget.set(null);
    await this.apply(
      this.store.deleteAccount(target.id),
      `${target.displayName} and all of their data have been deleted.`,
    );
  }

  protected openReset(row: AdminUserRow): void {
    this.clearFeedback();
    this.resetTarget.set(row);
  }

  protected retry(): Promise<void> {
    return this.store.reload();
  }

  private clearFeedback(): void {
    this.actionError.set(null);
    this.actionNotice.set(null);
  }

  /**
   * Runs one store action and reports it on the page's single feedback line — the store returns the
   * server's reason for a refusal rather than parking it in root state (TICKET-AUTH-04's convention),
   * so the wording an admin reads is the server's own.
   */
  /** Runs one panel action, reporting it inline. Answers whether it succeeded. */
  private async apply(action: Promise<string | null>, notice: string): Promise<boolean> {
    this.clearFeedback();
    const failure = await action;
    if (failure !== null) {
      this.actionError.set(failure);
      return false;
    }
    this.actionNotice.set(notice);
    return true;
  }
}
