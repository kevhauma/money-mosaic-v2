import { HttpErrorResponse } from '@angular/common/http';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { vi } from 'vitest';
import {
  AdminUsersApiService,
  AuthApiService,
  SessionStore,
  type AdminUser,
  type SessionUser,
} from '@/core/auth';
import { withCleanFormatSettings } from '@/shared/utils/format-settings.testing';
import { AdminUsersStore } from '../../admin-users.store';
import { AdminUsersPageComponent } from './admin-users-page.component';

const ADMIN_SESSION: SessionUser = {
  id: 1,
  email: 'admin',
  displayName: 'Administrator',
  role: 'admin',
  usingDefaultPassword: true,
};

const ADMIN: AdminUser = {
  id: 1,
  email: 'admin',
  displayName: 'Administrator',
  role: 'admin',
  disabled: false,
  createdAt: '2026-01-01T09:00:00.000Z',
  // Equal to `createdAt` — the seeded account, still on the password it shipped with.
  passwordUpdatedAt: '2026-01-01T09:00:00.000Z',
};

const ADA: AdminUser = {
  id: 2,
  email: 'ada@example.com',
  displayName: 'Ada',
  role: 'user',
  disabled: false,
  createdAt: '2026-02-01T09:00:00.000Z',
  passwordUpdatedAt: '2026-03-04T09:00:00.000Z',
};

const httpError = (status: number, message: string): HttpErrorResponse =>
  new HttpErrorResponse({ status, error: { error: message } });

describe('AdminUsersPageComponent', () => {
  withCleanFormatSettings();

  const api = {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    resetPassword: vi.fn(),
    remove: vi.fn(),
  };
  const auth = { login: vi.fn(), logout: vi.fn(), me: vi.fn() };
  let fixture: ComponentFixture<AdminUsersPageComponent>;

  const page = (): HTMLElement => fixture.nativeElement as HTMLElement;

  const buttons = (): HTMLButtonElement[] => [...page().querySelectorAll('button')];

  /** The nth button whose label is exactly this text — the panel repeats labels per row. */
  const button = (label: string, occurrence = 0): HTMLButtonElement => {
    const matches = buttons().filter((element) => element.textContent?.trim() === label);
    const match = matches[occurrence];
    if (match === undefined)
      throw new Error(`no "${label}" button (#${occurrence}) among: ${matches.length} matches`);
    return match;
  };

  const click = async (element: HTMLElement): Promise<void> => {
    element.click();
    await settle();
  };

  const type = async (input: HTMLInputElement, value: string): Promise<void> => {
    input.value = value;
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    fixture.detectChanges();
  };

  const inputs = (): HTMLInputElement[] => [...page().querySelectorAll('input')];

  const submitForm = async (form: HTMLFormElement): Promise<void> => {
    form.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    fixture.detectChanges();
  };

  /** The rows of the account table, as their text. */
  const rowText = (): string[] =>
    [...page().querySelectorAll('tbody tr')].map((row) => row.textContent ?? '');

  /**
   * Waits on the store's own hydration rather than on change detection alone. Since TICKET-SRV-06
   * it resolves a couple of microtasks after the request it made — the shared `createHydration`
   * wraps the read in a `.then` that clears `loading` and a `.catch` that records `error` — so a
   * bare `whenStable()` returns while the page is still showing its skeleton. `hydrate()` answers
   * with whichever load is in flight, including the forced one the "try again" button fires, and
   * its rejection is the failure the page is about to render.
   */
  const settle = async (): Promise<void> => {
    await TestBed.inject(AdminUsersStore)
      .hydrate()
      .catch(() => undefined);
    await fixture.whenStable();
    fixture.detectChanges();
  };

  const render = async (): Promise<void> => {
    fixture = TestBed.createComponent(AdminUsersPageComponent);
    fixture.detectChanges();
    await settle();
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    api.list.mockResolvedValue([ADMIN, ADA]);
    auth.login.mockResolvedValue(ADMIN_SESSION);

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AdminUsersApiService, useValue: api },
        { provide: AuthApiService, useValue: auth },
      ],
    });

    // Signed in as the admin *before* the page is created: the store only asks the server for the
    // list when the signed-in user is an admin, and the table needs to know whose row is its own.
    await TestBed.inject(SessionStore).login('admin', 'admin');
  });

  it('lists every account with its role, status and last password change', async () => {
    await render();

    const rows = rowText();
    expect(rows).toHaveLength(2);
    expect(rows[0]).toContain('Administrator');
    expect(rows[0]).toContain('Active');
    // `passwordUpdatedAt === createdAt` reads as never having been changed, which for the seeded
    // account means it is still `admin`.
    expect(rows[0]).toContain('Never changed');
    expect(rows[0]).toContain('You');
    expect(rows[1]).toContain('ada@example.com');
    expect(rows[1]).toContain('Changed 04/03/2026');
  });

  it("offers no disable or delete on the admin's own row, and says why", async () => {
    await render();

    const ownRow = page().querySelectorAll('tbody tr')[0]!;
    const ownButtons = [...ownRow.querySelectorAll('button')];
    const labelled = (label: string): HTMLButtonElement =>
      ownButtons.find((element) => element.textContent?.trim() === label)!;

    expect(labelled('Disable').disabled).toBe(true);
    expect(labelled('Delete').disabled).toBe(true);
    // The only admin who can sign in, so the role toggle is refused too — the same rule the server
    // enforces, mirrored so the button explains itself rather than earning a 409.
    expect(labelled('Make member').disabled).toBe(true);
    expect(ownRow.textContent).toContain('last administrator');
  });

  it('creates an account through the dialog and adds it to the table', async () => {
    const created: AdminUser = {
      id: 3,
      email: 'grace',
      displayName: 'Grace',
      role: 'admin',
      disabled: false,
      createdAt: '2026-03-05T09:00:00.000Z',
      passwordUpdatedAt: '2026-03-05T09:00:00.000Z',
    };
    api.create.mockResolvedValue(created);
    await render();

    await click(button('New account'));
    const dialogInputs = inputs();
    await type(dialogInputs[0]!, 'grace');
    await type(dialogInputs[1]!, 'Grace');
    await type(dialogInputs[2]!, 'hopper');
    const select = page().querySelector('select')!;
    select.value = 'admin';
    select.dispatchEvent(new Event('change'));
    await submitForm(page().querySelector('form')!);

    expect(api.create).toHaveBeenCalledExactlyOnceWith({
      email: 'grace',
      displayName: 'Grace',
      password: 'hopper',
      role: 'admin',
    });
    expect(rowText()).toHaveLength(3);
    expect(rowText()[2]).toContain('Grace');
  });

  it("keeps the create dialog open and shows the server's wording for a duplicate email", async () => {
    api.create.mockRejectedValue(httpError(409, 'An account with that email already exists'));
    await render();

    await click(button('New account'));
    const dialogInputs = inputs();
    await type(dialogInputs[0]!, 'ada@example.com');
    await type(dialogInputs[1]!, 'Impostor');
    await type(dialogInputs[2]!, 'secret');
    await submitForm(page().querySelector('form')!);

    expect(page().textContent).toContain('An account with that email already exists');
    // Still open, with what was typed still in it.
    expect(inputs()[1]!.value).toBe('Impostor');
    expect(rowText()).toHaveLength(2);
  });

  it('resets a password and shows it back once, in plain text', async () => {
    api.resetPassword.mockResolvedValue({ ...ADA, passwordUpdatedAt: '2026-03-06T09:00:00.000Z' });
    await render();

    // Ada's row, not the admin's own.
    await click(button('Reset password', 1));
    await type(inputs()[0]!, 'fresh-start');
    await submitForm(page().querySelector('form')!);

    expect(api.resetPassword).toHaveBeenCalledExactlyOnceWith(2, 'fresh-start');
    // Read out to the person it belongs to — there is no email delivery on a LAN box.
    expect(page().textContent).toContain('fresh-start');
    expect(page().textContent).toContain('has been signed out');
  });

  it('deletes an account only once its email is typed into the confirmation', async () => {
    api.remove.mockResolvedValue(undefined);
    await render();

    await click(button('Delete', 1));
    const confirm = button('Delete account and data');
    expect(confirm.disabled).toBe(true);
    expect(page().textContent).toContain('every transaction, bank account');

    // The phrase field is the confirm dialog's own, and it has to match exactly.
    const phraseField = inputs().find((input) => input.classList.contains('input'))!;
    await type(phraseField, 'ada@exampl');
    expect(button('Delete account and data').disabled).toBe(true);

    await type(phraseField, 'ada@example.com');
    await click(button('Delete account and data'));

    expect(api.remove).toHaveBeenCalledExactlyOnceWith(2);
    expect(rowText()).toHaveLength(1);
    expect(page().textContent).toContain('all of their data have been deleted');
  });

  it('reports the refusal when a delete is rejected, and keeps the row', async () => {
    api.remove.mockRejectedValue(httpError(409, 'You cannot delete your own account.'));
    await render();

    await click(button('Delete', 1));
    const phraseField = inputs().find((input) => input.classList.contains('input'))!;
    await type(phraseField, 'ada@example.com');
    await click(button('Delete account and data'));

    expect(page().textContent).toContain('You cannot delete your own account.');
    expect(rowText()).toHaveLength(2);
  });

  it('renames an account in place', async () => {
    api.update.mockResolvedValue({ ...ADA, displayName: 'Ada Lovelace' });
    await render();

    await click(button('Rename', 1));
    await type(inputs()[0]!, 'Ada Lovelace');
    await submitForm(page().querySelector('tbody form')!);

    expect(api.update).toHaveBeenCalledExactlyOnceWith(2, { displayName: 'Ada Lovelace' });
    expect(rowText()[1]).toContain('Ada Lovelace');
  });

  it('promotes and disables from the row buttons', async () => {
    api.update.mockResolvedValue({ ...ADA, role: 'admin' });
    await render();

    await click(button('Make administrator'));
    expect(api.update).toHaveBeenCalledWith(2, { role: 'admin' });

    api.update.mockResolvedValue({ ...ADA, disabled: true });
    await click(button('Disable', 1));
    expect(api.update).toHaveBeenLastCalledWith(2, { disabled: true });
    expect(page().textContent).toContain('signed out everywhere');
  });

  it('leaves the panel after demoting your own account, with the session re-read', async () => {
    // Allowed while another administrator remains, and it ends this page's right to exist. Without
    // the refresh the store would still hold `role: 'admin'` from sign-in, so the nav entry and the
    // guard would keep admitting a page whose every action now answers 403.
    api.list.mockResolvedValue([ADMIN, { ...ADA, role: 'admin' }]);
    api.update.mockResolvedValue({ ...ADMIN, role: 'user' });
    auth.me.mockResolvedValue({ ...ADMIN_SESSION, role: 'user' });
    const navigateByUrl = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    await render();

    await click(button('Make member'));

    expect(api.update).toHaveBeenCalledWith(1, { role: 'user' });
    expect(TestBed.inject(SessionStore).isAdmin()).toBe(false);
    expect(navigateByUrl).toHaveBeenCalledWith('/dashboard');
  });

  it('stays put when demoting your own account is refused', async () => {
    // A second administrator, so the client offers the demotion at all — the refusal under test is
    // the server's, not the mirrored last-admin rule that would grey the button out.
    api.list.mockResolvedValue([ADMIN, { ...ADA, role: 'admin' }]);
    api.update.mockRejectedValue(httpError(409, 'There would be no administrator left.'));
    const navigateByUrl = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    await render();

    await click(button('Make member'));

    expect(page().textContent).toContain('no administrator left');
    expect(navigateByUrl).not.toHaveBeenCalled();
    expect(TestBed.inject(SessionStore).isAdmin()).toBe(true);
  });

  it('offers a retry when the list could not be loaded', async () => {
    api.list.mockRejectedValueOnce(httpError(500, 'Internal server error'));
    await render();

    expect(page().querySelector('tbody')).toBeNull();
    api.list.mockResolvedValue([ADMIN]);
    await click(button('Try again'));

    expect(rowText()).toHaveLength(1);
  });
});
