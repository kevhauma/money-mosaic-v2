import { inject, Injectable } from '@angular/core';
import { ApiClient } from './api-client';
import type { MappingProfile } from './entities';

const PATH = '/mappingProfiles';

/**
 * See `accounts.repository.ts` for the shape. Unlike there, `update` resolves 0 for a row the
 * server no longer has instead of rejecting — the old table's own answer, and what lets
 * `upsertRemembered` replace a remembered mapping a backup restore removed (TICKET-IMP-19).
 */
@Injectable({ providedIn: 'root' })
export class MappingProfilesRepository {
  private readonly api = inject(ApiClient);

  getAll = (): Promise<MappingProfile[]> => this.api.get<MappingProfile[]>(PATH);

  add = (profile: MappingProfile): Promise<number> =>
    this.api.post<{ id: number }>(PATH, profile).then(({ id }) => id);

  update = (id: number, changes: Partial<MappingProfile>): Promise<number> =>
    this.api.patchOptional<MappingProfile>(`${PATH}/${id}`, changes).then((row) => (row ? 1 : 0));
}
