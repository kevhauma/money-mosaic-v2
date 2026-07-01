import { Injectable } from '@angular/core';
import { appDb, type MappingProfile } from './app-db';

@Injectable({ providedIn: 'root' })
export class MappingProfilesRepository {
  getAll = (): Promise<MappingProfile[]> => appDb.mappingProfiles.toArray();

  getByBankAndAccount = (
    bankPreset: string | undefined,
    defaultAccountId: number,
  ): Promise<MappingProfile | undefined> =>
    appDb.mappingProfiles
      .where('defaultAccountId')
      .equals(defaultAccountId)
      .and((profile) => profile.bankPreset === bankPreset)
      .first();

  add = (profile: MappingProfile): Promise<number> => appDb.mappingProfiles.add(profile);

  update = (id: number, changes: Partial<MappingProfile>): Promise<number> =>
    appDb.mappingProfiles.update(id, changes);

  remove = (id: number): Promise<void> => appDb.mappingProfiles.delete(id);
}
