import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AUTH_LOGIN_URL, AUTH_LOGOUT_URL, AUTH_ME_URL } from './auth-endpoints';
import type { PublicUser } from './public-user';

/**
 * The `/api/auth` calls, as promises. The session cookie is `HttpOnly`, so there is no client-side
 * "am I signed in?" to read — `me()` is the only answer, and `SessionStore` is its only caller.
 *
 * Same tier as a repository in `core/data-access/`: the store talks to this, never to `HttpClient`.
 */
@Injectable({ providedIn: 'root' })
export class AuthApiService {
  private readonly http = inject(HttpClient);

  login(email: string, password: string): Promise<PublicUser> {
    return firstValueFrom(this.http.post<PublicUser>(AUTH_LOGIN_URL, { email, password }));
  }

  /** 204 and idempotent server-side — signing out without a session is a success. */
  async logout(): Promise<void> {
    await firstValueFrom(this.http.post<void>(AUTH_LOGOUT_URL, {}));
  }

  me(): Promise<PublicUser> {
    return firstValueFrom(this.http.get<PublicUser>(AUTH_ME_URL));
  }
}
