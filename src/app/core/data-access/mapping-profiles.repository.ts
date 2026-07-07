import { Injectable } from '@angular/core';
import { appDb, type MappingProfile } from './app-db';

@Injectable({ providedIn: 'root' })
export class MappingProfilesRepository {
  getAll = (): Promise<MappingProfile[]> => appDb.mappingProfiles.toArray();

  add = (profile: MappingProfile): Promise<number> => appDb.mappingProfiles.add(profile);

  update = (id: number, changes: Partial<MappingProfile>): Promise<number> =>
    appDb.mappingProfiles.update(id, changes);
}
