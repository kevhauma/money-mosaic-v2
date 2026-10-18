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
import { createHydration, registerStoreReset, withHydrationState } from '@/core/store-reset';

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

const signatureKey = (profile: MappingProfile): string =>
  JSON.stringify(
    [
      ...new Set((profile.headerSignature ?? []).map((column) => column.trim().toLowerCase())),
    ].sort(),
  );

/**
 * Whether two profiles describe the same kind of file: the same bank preset, or — for a mapping the
 * user built for a file no preset knows (TICKET-IMP-17) — the same header line. Keying a custom
 * mapping on its missing `bankPreset` alone would make every custom mapping of one account the
 * same row, so remembering a second file type would overwrite the first.
 */
const sameFileType = (a: MappingProfile, b: MappingProfile): boolean =>
  a.bankPreset || b.bankPreset
    ? a.bankPreset === b.bankPreset
    : signatureKey(a) !== '[]' && signatureKey(a) === signatureKey(b);

const mappingProfileConfig = entityConfig({
  entity: type<MappingProfile>(),
  selectId: (profile) => profile.id!,
});

export const MappingProfilesStore = signalStore(
  { providedIn: 'root' },
  withEntities(mappingProfileConfig),
  withComputed(({ entities }) => ({ profiles: entities })),
  withHydrationState(),
  withMethods((store) => {
    const mappingProfilesRepository = inject(MappingProfilesRepository);
    /**
     * `hydrate` is idempotent — triggered on first injection (`withHooks` below, TICKET-PERF-07)
     * so this store's own code/data only lands once something on the `/import` route actually
     * injects it, and safe to await again from `detectTemplateForFile` below without re-fetching.
     * `retry` re-reads after a failed load and `reset` empties the store when the signed-in user
     * changes (TICKET-SRV-06, TICKET-AUTH-02).
     */
    const { hydrate, retry, reset } = createHydration(store, () =>
      mappingProfilesRepository.getAll().then((profiles) => {
        patchState(store, setAllEntities(profiles, mappingProfileConfig));
      }),
    );

    return {
      reset,
      hydrate,
      retry,

      /**
       * Upserts the remembered mapping for a file type + account so repeated imports keep a single
       * profile row (and edits to it actually stick) instead of piling up near-duplicates (CR-1.6).
       */
      upsertRemembered: async (profile: MappingProfile): Promise<MappingProfile> => {
        const existing = store
          .profiles()
          .find(
            (candidate) =>
              candidate.defaultAccountId === profile.defaultAccountId &&
              sameFileType(candidate, profile),
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

      /** The mapping remembered for this account and the file type `detected` stands for — which is
       * `detected` itself when the header match already landed on this account's saved mapping. */
      findRemembered: (detected: MappingProfile, accountId: number): MappingProfile | undefined =>
        detected.defaultAccountId === accountId
          ? detected
          : store
              .profiles()
              .find(
                (profile) =>
                  profile.defaultAccountId === accountId && sameFileType(profile, detected),
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
      // Registers this store for the sign-out wipe (TICKET-AUTH-02), before hydration starts.
      registerStoreReset('MappingProfilesStore', store.reset, store.hydrate);

      // Fire-and-forget: kicks off hydration the moment `/import` first injects this store
      // instead of at app bootstrap, so its data/code only lands when that route is visited
      // (TICKET-PERF-07). `detectTemplateForFile` awaits it itself when a read needs it settled.
      // `.catch` because nothing awaits this: the failure is already on the store's `error` for the
      // page to render, and un-caught it would be an unhandled rejection too (TICKET-SRV-06).
      void store.hydrate().catch(() => undefined);
    },
  }),
);
