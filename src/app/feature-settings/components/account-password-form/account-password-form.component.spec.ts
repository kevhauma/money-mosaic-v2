import { HttpErrorResponse } from '@angular/common/http';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { AuthApiService, SessionStore, type SessionUser } from '@/core/auth';
import { AccountPasswordFormComponent } from './account-password-form.component';

const ADMIN: SessionUser = {
  id: 1,
  email: 'admin',
  displayName: 'Admin',
  role: 'admin',
  usingDefaultPassword: true,
};

describe('AccountPasswordFormComponent: changing your own password (TICKET-AUTH-04)', () => {
  const api = {
    login: vi.fn(),
    logout: vi.fn(),
    me: vi.fn(),
    changePassword: vi.fn(),
    updateDisplayName: vi.fn(),
  };
  let fixture: ComponentFixture<AccountPasswordFormComponent>;

  const page = (): HTMLElement => fixture.nativeElement as HTMLElement;

  /** The three password fields, in template order: current, new, confirm. */
  const passwordInputs = (): HTMLInputElement[] =>
    Array.from(page().querySelectorAll('input[type="password"]'));

  const fill = (current: string, next: string, confirm: string): void => {
    for (const [input, value] of [
      [passwordInputs()[0], current],
      [passwordInputs()[1], next],
      [passwordInputs()[2], confirm],
    ] as const) {
      input.value = value;
      input.dispatchEvent(new Event('input'));
    }
    fixture.detectChanges();
  };

  const submit = async (): Promise<void> => {
    page().querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    fixture.detectChanges();
  };

  const alertTexts = (): string[] =>
    Array.from(page().querySelectorAll('mm-alert')).map((alert) => alert.textContent!.trim());

  beforeEach(async () => {
    vi.clearAllMocks();
    await TestBed.configureTestingModule({
      imports: [AccountPasswordFormComponent],
      providers: [provideRouter([]), { provide: AuthApiService, useValue: api }],
    }).compileComponents();

    // Signed in through the real store, exactly as the app arrives at this page.
    api.login.mockResolvedValue(ADMIN);
    await TestBed.inject(SessionStore).login('admin', 'admin');

    fixture = TestBed.createComponent(AccountPasswordFormComponent);
    fixture.detectChanges();
  });

  it('never sends a mismatched confirmation to the server', async () => {
    fill('admin', 'something-else', 'something-different');

    await submit();

    expect(api.changePassword).not.toHaveBeenCalled();
    expect(page().textContent).toContain('do not match');
  });

  it('changes the password, clears all three fields and reports success inline', async () => {
    api.changePassword.mockResolvedValue({ ...ADMIN, usingDefaultPassword: false });
    fill('admin', 'something-else', 'something-else');

    await submit();

    expect(api.changePassword).toHaveBeenCalledExactlyOnceWith('admin', 'something-else');
    expect(passwordInputs().map((input) => input.value)).toEqual(['', '', '']);
    expect(alertTexts().join(' ')).toContain('Your password has been changed');
  });

  it("shows the server's wording for a wrong current password and keeps what was typed", async () => {
    api.changePassword.mockRejectedValue(
      new HttpErrorResponse({ status: 401, error: { error: 'Current password is incorrect' } }),
    );
    fill('not-my-password', 'something-else', 'something-else');

    await submit();

    expect(alertTexts().join(' ')).toContain('Current password is incorrect');
    // Nothing is cleared on a failure: the retry is one field of typing, not three.
    expect(passwordInputs().map((input) => input.value)).toEqual([
      'not-my-password',
      'something-else',
      'something-else',
    ]);
  });

  it('says the password is the shipped one when told so, and otherwise explains the sign-out', () => {
    fixture.componentRef.setInput('usingDefaultPassword', true);
    fixture.detectChanges();
    expect(page().textContent).toContain('every copy of this app ships with');

    fixture.componentRef.setInput('usingDefaultPassword', false);
    fixture.detectChanges();
    expect(page().textContent).toContain('signs out every other device');
  });
});
