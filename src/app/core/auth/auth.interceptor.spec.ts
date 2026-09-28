import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { vi, type MockInstance } from 'vitest';
import { firstValueFrom } from 'rxjs';
import { AUTH_ME_URL, AUTH_PASSWORD_URL, WRONG_CURRENT_PASSWORD_CODE } from './auth-endpoints';
import { authInterceptor } from './auth.interceptor';
import { AuthApiService } from './auth-api.service';
import { SessionStore } from './session.store';
import type { PublicUser } from './public-user';

const ADMIN: PublicUser = {
  id: 1,
  email: 'admin@example.com',
  displayName: 'Admin',
  role: 'admin',
};

describe('authInterceptor', () => {
  const api = { login: vi.fn().mockResolvedValue(ADMIN), logout: vi.fn(), me: vi.fn() };
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let session: InstanceType<typeof SessionStore>;
  let navigate: MockInstance<Router['navigate']>;

  /** Signs in through the mocked API, so the session starts out `authenticated` for each case. */
  const signIn = async (): Promise<void> => {
    await session.login('admin@example.com', 'admin');
  };

  beforeEach(() => {
    vi.clearAllMocks();
    api.login.mockResolvedValue(ADMIN);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthApiService, useValue: api },
      ],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    session = TestBed.inject(SessionStore);
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('sends the session cookie with every /api call', () => {
    void firstValueFrom(http.get('/api/accounts'));

    const request = httpMock.expectOne('/api/accounts');

    expect(request.request.withCredentials).toBe(true);
    request.flush([]);
  });

  it('clears the session and routes to /login when an /api call answers 401', async () => {
    await signIn();
    const response = firstValueFrom(http.get('/api/accounts')).catch(() => 'rejected');

    httpMock
      .expectOne('/api/accounts')
      .flush({ error: 'Not signed in' }, { status: 401, statusText: 'Unauthorized' });
    await response;

    expect(session.status()).toBe('anonymous');
    expect(session.user()).toBeNull();
    // Carries where the user was, the same way the guard does — an expiry mid-session should come
    // back to the interrupted page rather than dumping them on the dashboard.
    expect(navigate).toHaveBeenCalledWith(['/login'], {
      queryParams: { returnUrl: expect.any(String) as string },
    });
  });

  it('redirects once when several parallel calls all answer 401', async () => {
    await signIn();
    const responses = Promise.all([
      firstValueFrom(http.get('/api/accounts')).catch(() => 'rejected'),
      firstValueFrom(http.get('/api/transactions')).catch(() => 'rejected'),
      firstValueFrom(http.get('/api/categories')).catch(() => 'rejected'),
    ]);

    for (const url of ['/api/accounts', '/api/transactions', '/api/categories']) {
      httpMock
        .expectOne(url)
        .flush({ error: 'Not signed in' }, { status: 401, statusText: 'Unauthorized' });
    }
    await responses;

    // Three redirects would cancel one another, and the last would record a returnUrl of /login.
    expect(navigate).toHaveBeenCalledOnce();
  });

  it('leaves a 401 from GET /api/auth/me alone — that is how a signed-out visitor is identified', async () => {
    await signIn();
    const response = firstValueFrom(http.get(AUTH_ME_URL)).catch(() => 'rejected');

    httpMock
      .expectOne(AUTH_ME_URL)
      .flush({ error: 'Not signed in' }, { status: 401, statusText: 'Unauthorized' });
    await response;

    expect(session.status()).toBe('authenticated');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('leaves a 401 from the login call alone — a rejected password is shown on the form', async () => {
    const response = firstValueFrom(http.post('/api/auth/login', {})).catch(() => 'rejected');

    httpMock
      .expectOne('/api/auth/login')
      .flush({ error: 'Incorrect email or password' }, { status: 401, statusText: 'Unauthorized' });
    await response;

    expect(navigate).not.toHaveBeenCalled();
  });

  it('leaves a 401 from the change-password call alone — a wrong current password is not an expiry', async () => {
    await signIn();
    const response = firstValueFrom(http.post(AUTH_PASSWORD_URL, {})).catch(() => 'rejected');

    httpMock
      .expectOne(AUTH_PASSWORD_URL)
      .flush(
        { error: 'Current password is incorrect', code: WRONG_CURRENT_PASSWORD_CODE },
        { status: 401, statusText: 'Unauthorized' },
      );
    await response;

    // The server explicitly kept this session alive (TICKET-AUTH-04), so mistyping the current
    // password must leave the user on the Settings form rather than back at /login.
    expect(session.status()).toBe('authenticated');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('signs out on a 401 from the change-password call that is NOT the wrong-password answer', async () => {
    await signIn();
    const response = firstValueFrom(http.post(AUTH_PASSWORD_URL, {})).catch(() => 'rejected');

    // What `requireAuth` answers when the session expired while the form sat open — same status and
    // same URL as the case above, distinguishable only by the missing `code`. The URL must not be
    // exempt outright, or this user is left typing into a form backed by a dead cookie.
    httpMock
      .expectOne(AUTH_PASSWORD_URL)
      .flush({ error: 'Not signed in' }, { status: 401, statusText: 'Unauthorized' });
    await response;

    expect(session.status()).toBe('anonymous');
    expect(navigate).toHaveBeenCalled();
  });

  it('ignores a non-/api request entirely, credentials included', () => {
    void firstValueFrom(http.get('/assets/guides.json'));

    const request = httpMock.expectOne('/assets/guides.json');

    expect(request.request.withCredentials).toBe(false);
    request.flush({});
  });

  it('passes a non-401 failure through without touching the session', async () => {
    await signIn();
    const response = firstValueFrom(http.get('/api/accounts')).catch(() => 'rejected');

    httpMock
      .expectOne('/api/accounts')
      .flush({ error: 'Internal server error' }, { status: 500, statusText: 'Server Error' });
    await response;

    expect(session.status()).toBe('authenticated');
    expect(navigate).not.toHaveBeenCalled();
  });
});
