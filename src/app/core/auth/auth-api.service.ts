import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
  AUTH_LOGIN_URL,
  AUTH_LOGOUT_URL,
  AUTH_ME_URL,
  AUTH_PASSWORD_URL,
  AUTH_TOKENS_URL,
} from './auth-endpoints';
import type { ApiToken, IssuedApiToken, SessionUser } from './public-user';

/**
 * The `/api/auth` calls, as promises. The session cookie is `HttpOnly`, so there is no client-side
 * "am I signed in?" to read — `me()` is the only answer, and `SessionStore` is its only caller.
 *
 * Same tier as a repository in `core/data-access/`: the store talks to this, never to `HttpClient`.
 */
@Injectable({ providedIn: 'root' })
export class AuthApiService {
  private readonly http = inject(HttpClient);

  login(email: string, password: string): Promise<SessionUser> {
    return firstValueFrom(this.http.post<SessionUser>(AUTH_LOGIN_URL, { email, password }));
  }

  /** 204 and idempotent server-side — signing out without a session is a success. */
  async logout(): Promise<void> {
    await firstValueFrom(this.http.post<void>(AUTH_LOGOUT_URL, {}));
  }

  me(): Promise<SessionUser> {
    return firstValueFrom(this.http.get<SessionUser>(AUTH_ME_URL));
  }

  /**
   * Changes the signed-in user's own password (TICKET-AUTH-04). There is deliberately no id
   * argument: the server takes the account from the session cookie, so this call cannot be aimed at
   * anyone else. A 401 means the current password was wrong, not that the session expired.
   *
   * Answers with the updated user, whose `usingDefaultPassword` is now `false` — which is what
   * retires the reminder banner without a second request.
   */
  changePassword(currentPassword: string, newPassword: string): Promise<SessionUser> {
    return firstValueFrom(
      this.http.post<SessionUser>(AUTH_PASSWORD_URL, { currentPassword, newPassword }),
    );
  }

  /** Renames the signed-in user — the one field a non-admin may change about themselves. */
  updateDisplayName(displayName: string): Promise<SessionUser> {
    return firstValueFrom(this.http.patch<SessionUser>(AUTH_ME_URL, { displayName }));
  }

  /** The signed-in user's own MCP tokens (TICKET-MCP-05); like the password, never anyone else's. */
  listTokens(): Promise<ApiToken[]> {
    return firstValueFrom(this.http.get<ApiToken[]>(AUTH_TOKENS_URL));
  }

  /** The only response that ever carries the plain token. */
  createToken(name: string): Promise<IssuedApiToken> {
    return firstValueFrom(this.http.post<IssuedApiToken>(AUTH_TOKENS_URL, { name }));
  }

  async revokeToken(id: number): Promise<void> {
    await firstValueFrom(this.http.delete<void>(`${AUTH_TOKENS_URL}/${id}`));
  }
}
