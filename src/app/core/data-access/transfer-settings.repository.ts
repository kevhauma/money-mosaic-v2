import { inject, Injectable } from '@angular/core';
import { ApiClient } from './api-client';
import type { TransferSettings } from './entities';
import { DEFAULT_TRANSFER_SETTINGS } from './seed-data';

const PATH = '/settings/transferSettings';

/**
 * A singleton settings row, and the archetype of the six under `/api/settings/` (TICKET-SRV-05).
 *
 * **The response is still spread over `DEFAULT_TRANSFER_SETTINGS`, and that is not cosmetic.** A row
 * nobody has written answers `{}` — keys *absent*, not present-and-`undefined` — and the stores here
 * derive their signal members from the seed object's **keys**, so handing a body straight through
 * would produce a store missing a member (the `withState`-needs-every-key gotcha from v2.2). The
 * `DEFAULT_*` constants live in the repo-root `shared/` workspace precisely so the server layers an
 * unwritten row over the same object this does.
 *
 * **The merge itself moved to the server.** Each setter sends a one-field `PATCH` that is applied
 * inside a transaction, so two tabs writing two different fields at the same moment can no longer
 * lose one of them — which the read-merge-put these methods used to do always could.
 */
@Injectable({ providedIn: 'root' })
export class TransferSettingsRepository {
  private readonly api = inject(ApiClient);

  get = (): Promise<TransferSettings> =>
    this.api
      .get<Partial<TransferSettings>>(PATH)
      .then((settings) => ({ ...DEFAULT_TRANSFER_SETTINGS, ...settings }));

  update = (changes: Partial<TransferSettings>): Promise<number> =>
    this.api.patch<TransferSettings>(PATH, changes).then(() => 1);
}
