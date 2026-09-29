import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { vi } from 'vitest';
import { AdminUsersStore } from '../../admin-users.store';
import { AdminCreateAccountDialogComponent } from './admin-create-account-dialog.component';

/**
 * The create-account dialog on its own (TICKET-AUTH-03) — the page's spec drives it through the
 * table, this one drives the form: what it sends, what it does with a refusal, and when it closes.
 * The store is a stand-in, so nothing here reaches `HttpClient`.
 */
describe('AdminCreateAccountDialogComponent', () => {
  const store = { createAccount: vi.fn() };
  let fixture: ComponentFixture<AdminCreateAccountDialogComponent>;
  let closed: number;

  const page = (): HTMLElement => fixture.nativeElement as HTMLElement;

  const inputs = (): HTMLInputElement[] => [...page().querySelectorAll('input')];

  const button = (label: string): HTMLButtonElement =>
    [...page().querySelectorAll('button')].find(
      (element) => element.textContent?.trim() === label,
    )!;

  const type = async (input: HTMLInputElement, value: string): Promise<void> => {
    input.value = value;
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    fixture.detectChanges();
  };

  const submit = async (): Promise<void> => {
    page().querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    fixture.detectChanges();
  };

  const fillIn = async (email: string, displayName: string, password: string): Promise<void> => {
    const [emailField, nameField, passwordField] = inputs();
    await type(emailField!, email);
    await type(nameField!, displayName);
    await type(passwordField!, password);
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    closed = 0;
    store.createAccount.mockResolvedValue(null);

    await TestBed.configureTestingModule({
      imports: [AdminCreateAccountDialogComponent],
      providers: [{ provide: AdminUsersStore, useValue: store }],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminCreateAccountDialogComponent);
    fixture.componentInstance.closed.subscribe(() => (closed += 1));
    fixture.detectChanges();
  });

  it('asks for an identifier, a name, a password and a role, and defaults to member', () => {
    // Three text fields: the password is deliberately *not* masked — the admin has to read it out,
    // there being no email delivery on a LAN box.
    expect(inputs()).toHaveLength(3);
    expect(inputs().every((field) => field.type === 'text')).toBe(true);
    expect(page().querySelector('select')!.value).toBe('user');
  });

  it('sends what was typed, and closes on success', async () => {
    await fillIn('grace', 'Grace', 'hopper');
    const select = page().querySelector('select')!;
    select.value = 'admin';
    select.dispatchEvent(new Event('change'));
    await submit();

    expect(store.createAccount).toHaveBeenCalledExactlyOnceWith({
      email: 'grace',
      displayName: 'Grace',
      password: 'hopper',
      role: 'admin',
    });
    expect(closed).toBe(1);
  });

  it('sends nothing while a field is empty', async () => {
    await fillIn('grace', '', 'hopper');
    await submit();

    expect(store.createAccount).not.toHaveBeenCalled();
    expect(closed).toBe(0);
  });

  it("shows the server's refusal and stays open with the values still in place", async () => {
    store.createAccount.mockResolvedValue('An account with that email already exists');
    await fillIn('ada', 'Impostor', 'secret');

    await submit();

    expect(page().textContent).toContain('An account with that email already exists');
    expect(closed).toBe(0);
    // Changing one field is a keystroke rather than a re-entry.
    expect(inputs()[1]!.value).toBe('Impostor');
  });

  it('closes without creating anything when cancelled', async () => {
    await fillIn('grace', 'Grace', 'hopper');

    button('Cancel').click();
    await fixture.whenStable();

    expect(store.createAccount).not.toHaveBeenCalled();
    expect(closed).toBe(1);
  });
});
