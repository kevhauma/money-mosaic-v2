import { inject } from '@angular/core';
import { patchState, signalStore, type, withComputed, withMethods } from '@ngrx/signals';
import { addEntity, entityConfig, setAllEntities, withEntities } from '@ngrx/signals/entities';
import { MappingProfilesRepository, type MappingProfile } from '@/core/data-access';

export const matchTemplateForHeaders = (
  profiles: MappingProfile[],
  headers: string[],
): MappingProfile | undefined => {
  const normalizedHeaders = new Set(headers.map((header) => header.trim().toLowerCase()));
  return profiles.find(
    (profile) =>
      !!profile.headerSignature?.length &&
      profile.headerSignature.every((column) => normalizedHeaders.has(column.trim().toLowerCase())),
  );
};

const mappingProfileConfig = entityConfig({
  entity: type<MappingProfile>(),
  selectId: (profile) => profile.id!,
});

export const MappingProfilesStore = signalStore(
  { providedIn: 'root' },
  withEntities(mappingProfileConfig),
  withComputed(({ entities }) => ({ profiles: entities })),
  withMethods((store) => {
    const mappingProfilesRepository = inject(MappingProfilesRepository);

    return {
      hydrate: async (): Promise<void> => {
        patchState(
          store,
          setAllEntities(await mappingProfilesRepository.getAll(), mappingProfileConfig),
        );
      },

      addProfile: async (profile: MappingProfile): Promise<MappingProfile> => {
        const id = await mappingProfilesRepository.add(profile);
        const added: MappingProfile = { ...profile, id };
        patchState(store, addEntity(added, mappingProfileConfig));
        return added;
      },

      findForBankAndAccount: (
        bankPreset: string | undefined,
        accountId: number,
      ): MappingProfile | undefined =>
        store
          .profiles()
          .find(
            (profile) =>
              profile.bankPreset === bankPreset && profile.defaultAccountId === accountId,
          ),

      findTemplateForHeaders: (headers: string[]): MappingProfile | undefined =>
        matchTemplateForHeaders(store.profiles(), headers),
    };
  }),
);
