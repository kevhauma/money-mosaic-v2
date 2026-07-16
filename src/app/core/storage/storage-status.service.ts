import { Injectable, signal } from '@angular/core';

export type StorageStatus = 'granted' | 'denied' | 'unsupported';

/** Only calls `persist()` when not already persisted, per FR-DAT-4. */
const resolvePersistence = async (storage: StorageManager): Promise<StorageStatus> => {
  if (await storage.persisted()) return 'granted';
  return (await storage.persist()) ? 'granted' : 'denied';
};

/**
 * Requests persistent browser storage (FR-DAT-4) so `appDb`'s IndexedDB data is exempt from
 * best-effort eviction under storage pressure. Re-checked on every app load (not cached across
 * visits) since the browser's grant decision can change over time (e.g. denied on first visit,
 * granted later once the site is "installed"/bookmarked).
 */
@Injectable({ providedIn: 'root' })
export class StorageStatusService {
  private readonly _status = signal<StorageStatus>('unsupported');
  readonly status = this._status.asReadonly();

  checkAndRequest = async (): Promise<void> => {
    if (!navigator.storage || !('persist' in navigator.storage)) {
      this._status.set('unsupported');
      return;
    }
    try {
      this._status.set(await resolvePersistence(navigator.storage));
    } catch {
      this._status.set('unsupported');
    }
  };
}
