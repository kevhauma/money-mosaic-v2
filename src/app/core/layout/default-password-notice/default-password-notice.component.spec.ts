import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { AuthApiService, SessionStore, type SessionUser } from '@/core/auth';
import { DefaultPasswordNoticeComponent } from './default-password-notice.component';

const SEEDED_ADMIN: SessionUser = {
  id: 1,
  email: 'admin',
  displayName: 'Administrator',
  role: 'admin',
  usingDefaultPassword: true,
};

describe('DefaultPasswordNoticeComponent: who sees the reminder, and for how long', () => {
  const api = {
    login: vi.fn(),
    logout: vi.fn(),
    me: vi.fn(),
    changePassword: vi.fn(),
    updateDisplayName: vi.fn(),
  };
  let fixture: ComponentFixture<DefaultPasswordNoticeComponent>;

  const banner = (): HTMLElement | null =>
    (fixture.nativeElement as HTMLElement).querySelector('mm-alert');

  /** Signs in as `user` through the real store, then renders. */
  const renderFor = async (user: SessionUser | null): Promise<void> => {
    if (user !== null) {
      api.login.mockResolvedValue(user);
      await TestBed.inject(SessionStore).login(user.email, 'password');
    }
    fixture = TestBed.createComponent(DefaultPasswordNoticeComponent);
    fixture.detectChanges();
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    await TestBed.configureTestingModule({
      imports: [DefaultPasswordNoticeComponent],
      providers: [provideRouter([]), { provide: AuthApiService, useValue: api }],
    }).compileComponents();
  });

  it('shows for an admin still on the seeded password, and links to Settings', async () => {
    await renderFor(SEEDED_ADMIN);

    expect(banner()?.textContent).toContain('the password it shipped with');
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('a[href="/settings"]'),
    ).not.toBeNull();
  });

  it('renders nothing once the password has been changed', async () => {
    await renderFor({ ...SEEDED_ADMIN, usingDefaultPassword: false });

    expect(banner()).toBeNull();
  });

  it('renders nothing for a non-admin', async () => {
    await renderFor({ ...SEEDED_ADMIN, role: 'user' });

    expect(banner()).toBeNull();
  });

  it('renders nothing while nobody is signed in', async () => {
    await renderFor(null);

    expect(banner()).toBeNull();
  });

  it('can be waved away for the session', async () => {
    await renderFor(SEEDED_ADMIN);

    const buttons = (fixture.nativeElement as HTMLElement).querySelectorAll('button');
    buttons[buttons.length - 1].click();
    fixture.detectChanges();

    expect(banner()).toBeNull();
  });

  it('disappears for good once the password change lands', async () => {
    await renderFor(SEEDED_ADMIN);
    api.changePassword.mockResolvedValue({ ...SEEDED_ADMIN, usingDefaultPassword: false });

    // The same call the Settings form makes — the flag on its answer is what retires the banner.
    await TestBed.inject(SessionStore).changePassword('admin', 'something-else');
    fixture.detectChanges();

    expect(banner()).toBeNull();
  });
});
