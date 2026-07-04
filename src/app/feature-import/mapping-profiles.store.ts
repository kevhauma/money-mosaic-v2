import { inject } from '@angular/core';
import { patchState, signalStore, type, withComputed, withMethods } from '@ngrx/signals';
import {
  addEntity,
  entityConfig,
  setAllEntities,
  updateEntity,
  withEntities,
} from '@ngrx/signals/entities';
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

      /**
       * Upserts the remembered mapping for a bank+account so repeated imports keep a single profile
       * row (and edits to it actually stick) instead of piling up near-duplicates (CR-1.6).
       */
      upsertForBankAndAccount: async (profile: MappingProfile): Promise<MappingProfile> => {
        const existing = store
          .profiles()
          .find(
            (candidate) =>
              candidate.bankPreset === profile.bankPreset &&
              candidate.defaultAccountId === profile.defaultAccountId,
          );
        if (!existing) {
          const id = await mappingProfilesRepository.add(profile);
          const added: MappingProfile = { ...profile, id };
          patchState(store, addEntity(added, mappingProfileConfig));
          return added;
        }
        await mappingProfilesRepository.update(existing.id!, profile);
        patchState(
          store,
          updateEntity({ id: existing.id!, changes: profile }, mappingProfileConfig),
        );
        return { ...profile, id: existing.id };
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

      /**
       * Auto-detects the matching bank template, trying each template-declared encoding via the
       * caller's `detectHeaders` so a preset whose headers use a non-UTF-8 encoding (e.g.
       * windows-1252 with accented headers) still matches instead of degrading to custom (CR-1.4).
       */
      detectTemplateForFile: async (
        detectHeaders: (encoding: string) => Promise<string[]>,
      ): Promise<MappingProfile | undefined> => {
        const encodings = [
          ...new Set([
            'utf-8',
            ...store
              .profiles()
              .filter((profile) => profile.headerSignature?.length)
              .map((profile) => profile.encoding),
          ]),
        ];
        for (const encoding of encodings) {
          const headers = await detectHeaders(encoding);
          const preset = matchTemplateForHeaders(store.profiles(), headers);
          if (preset) return preset;
        }
        return undefined;
      },
    };
  }),
);
