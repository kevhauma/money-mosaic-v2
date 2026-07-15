import { inject } from '@angular/core';
import { patchState, signalStore, type, withComputed, withHooks, withMethods } from '@ngrx/signals';
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
    let hydration: Promise<void> | null = null;

    /**
     * Idempotent — triggered on first injection (`withHooks` below, TICKET-PERF-07) so this
     * store's own code/data only lands once something on the `/import` route actually injects
     * it, and safe to await again from `detectTemplateForFile` below without re-fetching.
     */
    const hydrate = (): Promise<void> => {
      if (!hydration) {
        hydration = mappingProfilesRepository.getAll().then((profiles) => {
          patchState(store, setAllEntities(profiles, mappingProfileConfig));
        });
      }
      return hydration;
    };

    return {
      hydrate,

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
        // Guards against the on-injection hydrate (TICKET-PERF-07) still being in flight when a
        // file is dropped moments after navigating to `/import` — idempotent, resolves
        // immediately once already hydrated.
        await hydrate();
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
  withHooks({
    onInit(store) {
      // Fire-and-forget: kicks off hydration the moment `/import` first injects this store
      // instead of at app bootstrap, so its data/code only lands when that route is visited
      // (TICKET-PERF-07). `detectTemplateForFile` awaits it itself when a read needs it settled.
      void store.hydrate();
    },
  }),
);
