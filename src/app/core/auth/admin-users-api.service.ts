import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ADMIN_USERS_URL } from './auth-endpoints';
import type { AdminUser, AdminUserChanges, NewAccount } from './public-user';

/**
 * The `/api/admin/users` calls, as promises (TICKET-AUTH-03) — the sibling of `AuthApiService`, for
 * the accounts that are *not* the caller's own.
 *
 * Same tier as a repository in `core/data-access/`: `AdminUsersStore` talks to this, never to
 * `HttpClient`. It holds no notion of who is allowed to call it — every rule is the server's, and
 * the panel's job is to show what it answers (a 403 for a non-admin, a 409 for a refused change).
 */
@Injectable({ providedIn: 'root' })
export class AdminUsersApiService {
  private readonly http = inject(HttpClient);

  list(): Promise<AdminUser[]> {
    return firstValueFrom(this.http.get<AdminUser[]>(ADMIN_USERS_URL));
  }

  /** The created account, already seeded with its default categories and mapping profiles. */
  create(account: NewAccount): Promise<AdminUser> {
    return firstValueFrom(this.http.post<AdminUser>(ADMIN_USERS_URL, account));
  }

  update(id: number, changes: AdminUserChanges): Promise<AdminUser> {
    return firstValueFrom(this.http.patch<AdminUser>(`${ADMIN_USERS_URL}/${id}`, changes));
  }

  /**
   * Sets somebody else's password outright — no current password, which is the point of an admin
   * reset. Answers with the account, whose `passwordUpdatedAt` has moved, so the panel's "last
   * changed" column updates without a re-fetch.
   */
  resetPassword(id: number, password: string): Promise<AdminUser> {
    return firstValueFrom(
      this.http.post<AdminUser>(`${ADMIN_USERS_URL}/${id}/password`, { password }),
    );
  }

  /** Deletes the account **and every row it owns**. 204, so there is nothing to read back. */
  async remove(id: number): Promise<void> {
    await firstValueFrom(this.http.delete<void>(`${ADMIN_USERS_URL}/${id}`));
  }
}
