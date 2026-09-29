import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { AdminUserRow } from '../../admin-user-row';
import { AdminUserActionsComponent } from './admin-user-actions.component';

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

/** The admin's own row, and the only administrator who can sign in — every rule at once. */
const LAST_ADMIN: AdminUserRow = {
  ...ADA,
  id: 1,
  email: 'admin',
  displayName: 'Administrator',
  roleLabel: 'Administrator',
  roleActionLabel: 'Make member',
  nextRole: 'user',
  isSelf: true,
  canChangeRole: false,
  canDisable: false,
  canDelete: false,
  canResetPassword: false,
  blockedReason: 'This is the last administrator who can sign in. Promote another account first.',
};

describe('AdminUserActionsComponent', () => {
  let fixture: ComponentFixture<AdminUserActionsComponent>;

  const button = (label: string): HTMLButtonElement =>
    [...(fixture.nativeElement as HTMLElement).querySelectorAll('button')].find(
      (element) => element.textContent?.trim() === label,
    )!;

  const render = (row: AdminUserRow): void => {
    fixture = TestBed.createComponent(AdminUserActionsComponent);
    fixture.componentRef.setInput('row', row);
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminUserActionsComponent],
    }).compileComponents();
  });

  it('offers all five actions on an ordinary row, labelled for what they do next', () => {
    render(ADA);

    expect(button('Rename').disabled).toBe(false);
    expect(button('Reset password').disabled).toBe(false);
    expect(button('Make administrator').disabled).toBe(false);
    expect(button('Disable').disabled).toBe(false);
    expect(button('Delete').disabled).toBe(false);
    expect((fixture.nativeElement as HTMLElement).querySelector('mm-text')).toBeNull();
  });

  it('reports each press to its parent rather than acting itself', () => {
    render(ADA);
    const pressed: string[] = [];
    const component = fixture.componentInstance;
    component.rename.subscribe(() => pressed.push('rename'));
    component.resetPassword.subscribe(() => pressed.push('resetPassword'));
    component.toggleRole.subscribe(() => pressed.push('toggleRole'));
    component.toggleDisabled.subscribe(() => pressed.push('toggleDisabled'));
    component.remove.subscribe(() => pressed.push('remove'));

    button('Rename').click();
    button('Reset password').click();
    button('Make administrator').click();
    button('Disable').click();
    button('Delete').click();

    expect(pressed).toEqual(['rename', 'resetPassword', 'toggleRole', 'toggleDisabled', 'remove']);
  });

  it('refuses the four blocked actions on the last admin, and says why', () => {
    render(LAST_ADMIN);

    // Renaming is never refused — it cannot lock anyone out and it is not a credential change.
    expect(button('Rename').disabled).toBe(false);
    // Refused because this row is the caller's own, not because of the last-admin rule: see the
    // dedicated case below.
    expect(button('Reset password').disabled).toBe(true);
    expect(button('Make member').disabled).toBe(true);
    expect(button('Disable').disabled).toBe(true);
    expect(button('Delete').disabled).toBe(true);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('last administrator');
  });

  it('does not offer an admin reset on your own row, but does on everyone else’s', () => {
    // The reset route sets a password without asking for the current one — safe aimed at somebody
    // else, and a way around TICKET-AUTH-04 aimed at yourself. Settings is the self-service route.
    render({ ...ADA, isSelf: true, canResetPassword: false });
    expect(button('Reset password').disabled).toBe(true);

    render(ADA);
    expect(button('Reset password').disabled).toBe(false);
  });
});
