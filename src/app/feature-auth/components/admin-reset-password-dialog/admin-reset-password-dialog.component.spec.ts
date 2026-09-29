import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { vi } from 'vitest';
import type { AdminUserRow } from '../../admin-user-row';
import { AdminUsersStore } from '../../admin-users.store';
import { AdminResetPasswordDialogComponent } from './admin-reset-password-dialog.component';

/** The row the page hands the dialog — only the id and the two names are read from it. */
const ADA: AdminUserRow = {
  id: 2,
  email: 'ada@example.com',
  displayName: 'Ada',
  roleLabel: 'Member',
  roleActionLabel: 'Make administrator',
  nextRole: 'admin',
  statusLabel: 'Active',
  statusColor: 'success',
  statusActionLabel: 'Disable',
  disable: true,
  passwordChangedLabel: 'Never changed',
  createdLabel: '01/02/2026',
  isSelf: false,
  canChangeRole: true,
  canDisable: true,
  canDelete: true,
  canResetPassword: true,
  blockedReason: null,
};

/**
 * The admin reset (TICKET-AUTH-03): a new password with no current one, shown back in plain text so
 * it can be read out to the person it belongs to.
 */
describe('AdminResetPasswordDialogComponent', () => {
  const store = { resetPassword: vi.fn() };
  let fixture: ComponentFixture<AdminResetPasswordDialogComponent>;
  let closed: number;

  const page = (): HTMLElement => fixture.nativeElement as HTMLElement;

  const passwordField = (): HTMLInputElement => page().querySelector('input')!;

  const button = (label: string): HTMLButtonElement | undefined =>
    [...page().querySelectorAll('button')].find((element) => element.textContent?.trim() === label);

  const type = async (value: string): Promise<void> => {
    const field = passwordField();
    field.value = value;
    field.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    fixture.detectChanges();
  };

  const submit = async (): Promise<void> => {
    page().querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    fixture.detectChanges();
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    closed = 0;
    store.resetPassword.mockResolvedValue(null);

    await TestBed.configureTestingModule({
      imports: [AdminResetPasswordDialogComponent],
      providers: [{ provide: AdminUsersStore, useValue: store }],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminResetPasswordDialogComponent);
    fixture.componentRef.setInput('account', ADA);
    fixture.componentInstance.closed.subscribe(() => (closed += 1));
    fixture.detectChanges();
  });

  it('names the account and asks for one password, in the clear', () => {
    expect(page().textContent).toContain('Ada');
    expect(page().textContent).toContain('ada@example.com');
    // One field, not a type-it-twice pair: the value is on screen, so a typo is visible.
    expect(page().querySelectorAll('input')).toHaveLength(1);
    expect(passwordField().type).toBe('text');
  });

  it('sends nothing while the field is empty', async () => {
    await submit();

    expect(store.resetPassword).not.toHaveBeenCalled();
  });

  it('resets the password and shows it back once, keeping the dialog open', async () => {
    await type('fresh-start');

    await submit();

    expect(store.resetPassword).toHaveBeenCalledExactlyOnceWith(2, 'fresh-start');
    expect(page().textContent).toContain('fresh-start');
    expect(page().textContent).toContain('has been signed out');
    // Still open: closing here would leave the admin holding a password they can no longer see, on
    // an account whose old one has already stopped working.
    expect(closed).toBe(0);

    button('Done')!.click();
    await fixture.whenStable();
    expect(closed).toBe(1);
  });

  it("shows the server's wording for a refusal and keeps the form", async () => {
    store.resetPassword.mockResolvedValue('Could not reset the password. Please try again.');
    await type('fresh-start');

    await submit();

    expect(page().textContent).toContain('Could not reset the password');
    expect(page().querySelector('form')).not.toBeNull();
    // The password is not claimed to have been set.
    expect(button('Done')).toBeUndefined();
    expect(closed).toBe(0);
  });

  it('closes without resetting anything when cancelled', async () => {
    await type('fresh-start');

    button('Cancel')!.click();
    await fixture.whenStable();

    expect(store.resetPassword).not.toHaveBeenCalled();
    expect(closed).toBe(1);
  });
});
