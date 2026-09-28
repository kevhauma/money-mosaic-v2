import { HttpErrorResponse } from '@angular/common/http';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { AuthApiService, SessionStore, type SessionUser } from '@/core/auth';
import { SettingsAccountSectionComponent } from './settings-account-section.component';

const ADMIN: SessionUser = {
  id: 1,
  email: 'admin',
  displayName: 'Admin',
  role: 'admin',
  usingDefaultPassword: true,
};

describe('SettingsAccountSectionComponent: the signed-in user and their name', () => {
  const api = {
    login: vi.fn(),
    logout: vi.fn(),
    me: vi.fn(),
    changePassword: vi.fn(),
    updateDisplayName: vi.fn(),
  };
  let fixture: ComponentFixture<SettingsAccountSectionComponent>;

  const page = (): HTMLElement => fixture.nativeElement as HTMLElement;

  const nameInput = (): HTMLInputElement => page().querySelector('input[type="text"]')!;

  const type = (input: HTMLInputElement, value: string): void => {
    input.value = value;
    input.dispatchEvent(new Event('input'));
  };

  /** The rename form — the first on the page; the password form is its own component's spec. */
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
      imports: [SettingsAccountSectionComponent],
      providers: [provideRouter([]), { provide: AuthApiService, useValue: api }],
    }).compileComponents();

    // Signed in through the real store, exactly as the app arrives at this page.
    api.login.mockResolvedValue(ADMIN);
    await TestBed.inject(SessionStore).login('admin', 'admin');

    fixture = TestBed.createComponent(SettingsAccountSectionComponent);
    fixture.detectChanges();
  });

  it('shows who is signed in, their role, and seeds the name field with their display name', () => {
    expect(page().textContent).toContain('admin');
    expect(page().querySelector('mm-badge')?.textContent?.trim()).toBe('Administrator');
    expect(nameInput().value).toBe('Admin');
  });

  it('saves a new display name and reports success inline', async () => {
    api.updateDisplayName.mockResolvedValue({ ...ADMIN, displayName: 'The Boss' });
    type(nameInput(), 'The Boss');
    fixture.detectChanges();

    await submit();

    expect(api.updateDisplayName).toHaveBeenCalledExactlyOnceWith('The Boss');
    expect(alertTexts().join(' ')).toContain('display name has been updated');
  });

  it('shows a failed rename inline and keeps what was typed', async () => {
    api.updateDisplayName.mockRejectedValue(
      new HttpErrorResponse({ status: 400, error: { error: 'A display name is required' } }),
    );
    type(nameInput(), 'The Boss');
    fixture.detectChanges();

    await submit();

    expect(alertTexts().join(' ')).toContain('A display name is required');
    expect(nameInput().value).toBe('The Boss');
  });

  it('hosts the password form, which owns its own fields and submit path', () => {
    expect(page().querySelector('app-account-password-form')).not.toBeNull();
  });

  it('does not send an empty display name', async () => {
    type(nameInput(), '');
    fixture.detectChanges();

    await submit();

    expect(api.updateDisplayName).not.toHaveBeenCalled();
  });
});
