import { HttpErrorResponse } from '@angular/common/http';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { vi, type MockInstance } from 'vitest';
import { AuthApiService, type PublicUser } from '@/core/auth';
import { LoginPageComponent } from './login-page.component';
import { provideFakeApi } from '@/core/data-access/fake-api.testing';

const ADMIN: PublicUser = {
  id: 1,
  email: 'admin@example.com',
  displayName: 'Admin',
  role: 'admin',
};

describe('LoginPageComponent', () => {
  const api = { login: vi.fn(), logout: vi.fn(), me: vi.fn() };
  let fixture: ComponentFixture<LoginPageComponent>;
  let navigateByUrl: MockInstance<Router['navigateByUrl']>;

  /** Types into the two `mm-input`s the way the form's value accessors receive it. */
  const fillIn = (email: string, password: string): void => {
    const inputs = (fixture.nativeElement as HTMLElement).querySelectorAll('input');
    inputs[0].value = email;
    inputs[0].dispatchEvent(new Event('input'));
    inputs[1].value = password;
    inputs[1].dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };

  const submit = async (): Promise<void> => {
    (fixture.nativeElement as HTMLElement)
      .querySelector('form')!
      .dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    fixture.detectChanges();
  };

  const passwordValue = (): string =>
    (fixture.nativeElement as HTMLElement).querySelectorAll('input')[1].value;

  beforeEach(async () => {
    vi.clearAllMocks();
    await TestBed.configureTestingModule({
      imports: [LoginPageComponent],
      providers: [
        ...provideFakeApi(),
        provideRouter([]),
        { provide: AuthApiService, useValue: api },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(LoginPageComponent);
    navigateByUrl = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    fixture.detectChanges();
  });

  it('renders an identifier field, a password field and a submit button — no shell around them', () => {
    const page = fixture.nativeElement as HTMLElement;
    const inputs = page.querySelectorAll('input');

    // Deliberately `text` rather than `email`: the seeded account's identifier is `admin`, and the
    // server takes the field as free text (TICKET-AUTH-04).
    expect(inputs[0].type).toBe('text');
    expect(inputs[1].type).toBe('password');
    expect(page.querySelector('button[type="submit"]')).not.toBeNull();
    expect(page.querySelector('app-shell')).toBeNull();
    expect(page.querySelector('nav')).toBeNull();
  });

  it("signs in with the seeded account's bare `admin` identifier, which is not an email address", async () => {
    // The regression this pins: the field carried `Validators.email`, so the only account a fresh
    // installation has was rejected in the browser before any request went out and nobody could sign
    // in at all. The server takes the identifier as free text on purpose — whatever it accepts, this
    // form has to be able to send (TICKET-AUTH-04).
    api.login.mockResolvedValue(ADMIN);
    fillIn('admin', 'admin');

    await submit();

    expect(api.login).toHaveBeenCalledExactlyOnceWith('admin', 'admin');
  });

  it('lands on the URL the guard stopped, rather than the dashboard', async () => {
    api.login.mockResolvedValue(ADMIN);
    fixture.componentRef.setInput('returnUrl', '/transactions?page=2');
    fillIn('admin@example.com', 'admin');

    await submit();

    expect(api.login).toHaveBeenCalledWith('admin@example.com', 'admin');
    expect(navigateByUrl).toHaveBeenCalledWith('/transactions?page=2');
  });

  it('falls back to the dashboard when nothing was asked for', async () => {
    api.login.mockResolvedValue(ADMIN);
    fillIn('admin@example.com', 'admin');

    await submit();

    expect(navigateByUrl).toHaveBeenCalledWith('/dashboard');
  });

  it("shows the server's message inline, keeps the form usable and clears the password", async () => {
    api.login.mockRejectedValue(
      new HttpErrorResponse({ status: 401, error: { error: 'Incorrect email or password' } }),
    );
    fillIn('admin@example.com', 'wrong');

    await submit();

    const page = fixture.nativeElement as HTMLElement;
    expect(page.querySelector('mm-alert')?.textContent?.trim()).toBe('Incorrect email or password');
    expect(passwordValue()).toBe('');
    expect(page.querySelectorAll('input')[0].value).toBe('admin@example.com');
    expect(page.querySelector('button[type="submit"]')?.hasAttribute('disabled')).toBe(false);
    expect(navigateByUrl).not.toHaveBeenCalled();
  });

  it('does not call the API at all with an empty form', async () => {
    await submit();

    expect(api.login).not.toHaveBeenCalled();
  });
});
