import { inject, Injectable } from '@angular/core';
import { ApiClient } from './api-client';
import type { Transfer } from './entities';

const PATH = '/transfers';

/**
 * Reads and the bare create. The writes that *mean* something — link, unlink, the auto-link pass —
 * are `TransferLinkingService`'s, because each is one fact spanning two tables and cannot be split
 * into two requests (TICKET-SRV-04).
 *
 * There is deliberately **no `remove`**. `DELETE /api/transfers/:id` exists, but it removes only
 * the `Transfer` row and leaves both legs stamped with a `transferId` whose row is gone — the orphan
 * state `POST /api/transfers/:id/unlink` exists to prevent. Its one caller was
 * `TransferCleanupService`, whose whole body is server-side now, so the method went with it instead
 * of being ported into a trap.
 */
@Injectable({ providedIn: 'root' })
export class TransfersRepository {
  private readonly api = inject(ApiClient);

  getAll = (): Promise<Transfer[]> => this.api.get<Transfer[]>(PATH);

  add = (transfer: Transfer): Promise<number> =>
    this.api.post<{ id: number }>(PATH, transfer).then(({ id }) => id);
}
