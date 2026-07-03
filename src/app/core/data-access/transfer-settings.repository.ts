import { Injectable } from '@angular/core';
import { appDb, DEFAULT_TRANSFER_SETTINGS, type TransferSettings } from './app-db';

@Injectable({ providedIn: 'root' })
export class TransferSettingsRepository {
  get = async (): Promise<TransferSettings> =>
    (await appDb.transferSettings.get(1)) ?? DEFAULT_TRANSFER_SETTINGS;

  update = (changes: Partial<TransferSettings>): Promise<number> =>
    appDb.transferSettings.update(1, changes);
}
