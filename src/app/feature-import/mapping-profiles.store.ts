import { Injectable, inject, signal } from '@angular/core';
import { MappingProfilesRepository, type MappingProfile } from '@/core/data-access';

@Injectable({ providedIn: 'root' })
export class MappingProfilesStore {
  private readonly mappingProfilesRepository = inject(MappingProfilesRepository);

  private readonly profilesSignal = signal<MappingProfile[]>([]);
  readonly profiles = this.profilesSignal.asReadonly();

  hydrate = async (): Promise<void> => {
    this.profilesSignal.set(await this.mappingProfilesRepository.getAll());
  };

  addProfile = async (profile: MappingProfile): Promise<MappingProfile> => {
    const id = await this.mappingProfilesRepository.add(profile);
    const added = { ...profile, id };
    this.profilesSignal.update((profiles) => [...profiles, added]);
    return added;
  };

  findForBankAndAccount = (
    bankPreset: string | undefined,
    accountId: number,
  ): MappingProfile | undefined =>
    this.profilesSignal().find(
      (profile) => profile.bankPreset === bankPreset && profile.defaultAccountId === accountId,
    );
}
