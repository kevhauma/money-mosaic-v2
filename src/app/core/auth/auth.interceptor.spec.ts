import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { vi, type MockInstance } from 'vitest';
import { firstValueFrom } from 'rxjs';
import { AUTH_ME_URL } from './auth-endpoints';
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
