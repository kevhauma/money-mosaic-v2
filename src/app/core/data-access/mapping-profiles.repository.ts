import { inject, Injectable } from '@angular/core';
import { ApiClient } from './api-client';
import type { MappingProfile } from './entities';

const PATH = '/mappingProfiles';

/** See `accounts.repository.ts` for the shape, and for what `update`'s `Promise<number>` means. */
@Injectable({ providedIn: 'root' })
export class MappingProfilesRepository {
  private readonly api = inject(ApiClient);

  getAll = (): Promise<MappingProfile[]> => this.api.get<MappingProfile[]>(PATH);

  add = (profile: MappingProfile): Promise<number> =>
    this.api.post<{ id: number }>(PATH, profile).then(({ id }) => id);

  update = (id: number, changes: Partial<MappingProfile>): Promise<number> =>
    this.api.patch<MappingProfile>(`${PATH}/${id}`, changes).then(() => 1);
}
