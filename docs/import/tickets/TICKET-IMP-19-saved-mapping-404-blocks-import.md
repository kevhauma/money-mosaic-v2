# TICKET-IMP-19 — An import that uses a saved mapping fails with a 404 on the mapping

- **Area:** Import
- **Released in:** _unreleased_
- **Type:** Bug fix
- **Traceability:** FR-IMP-* (remembered mapping per account, CR-1.6); TICKET-SRV-03 (reference ownership check), TICKET-SRV-05 (repositories over HTTP)

## User story

As someone importing a bank file the app already knows, I want the import to go through when the page says it is using my saved mapping, so I don't hit an unexplained 404 and lose the import.

## Description

The map step recognises the file ("Detected: … — using your saved mapping"), but committing the import fails with a 404 on the mapping and nothing is imported. Remembering a mapping is a convenience. It must never block an import, and the 404's real cause has to be found and fixed.

## Current situation (as-is)

- The map step matches the file against the stored profiles ([`detectTemplateForFile` / `findRemembered`](../../../src/app/feature-import/mapping-profiles.store.ts)) and shows "using your saved mapping" ([import-map-step.component.html](../../../src/app/feature-import/components/import-map-step/import-map-step.component.html)).
- On commit, [`ImportWizardSession`](../../../src/app/feature-import/import-wizard-session.ts) (around `upsertRemembered`) first saves the mapping when "remember for this account" is on, then calls `commitImport` with `mappingProfileId: savedProfile?.id`. The mapping save is awaited before the commit, so if it throws, the import never runs.
- `upsertRemembered` picks the row to update **from the client store**, not from the server. It then sends `PATCH /api/mappingProfiles/:id` ([mapping-profiles.repository.ts](../../../src/app/core/data-access/mapping-profiles.repository.ts)).
- The server answers 404 on any of these:
  1. `PATCH /api/mappingProfiles/:id`: the id is not a row this user owns (`updateOwnedRow` returns `undefined`, see [entity-router.ts](../../../server/src/routes/entity-router.ts)). This happens when the store holds an id the server no longer has under this user, for example after TICKET-SRV-12 moved the row to another account during a backup restore, or after it was deleted elsewhere.
  2. `POST`/`PATCH /api/mappingProfiles`: `defaultAccountId` names an account this user does not own (`assertReferencesOwned` + `SOFT_REFERENCES` in [ownership.ts](../../../server/src/http/ownership.ts)).
  3. `POST /api/import/commit`: `batch.mappingProfileId` or `batch.accountId` is not this user's (same check, for `importBatches`), or a backfill id isn't (`applyBackfill` in [import.ts](../../../server/src/routes/import.ts)).
- **Root cause (confirmed 2026-11-15): suspect #1, a stale profile id left behind by a backup restore.** After a restore, [data-management-overview](../../../src/app/feature-data-management/components/data-management-overview/data-management-overview.component.ts) only _offered_ a reload ("Reload now" / "Later"). On **Later**, every store that had already hydrated kept its old rows. In `replace` mode the restore runs `clearUserRows` and writes back only the backup's profiles, so a profile remembered after the backup was taken is deleted on the server but still sits in `MappingProfilesStore`. The next import of that file type still matches it ("using your saved mapping"). `upsertRemembered` then PATCHes the deleted id, and the awaited save rejects before `commitImport` runs.
  - Reproduced against a throwaway server (temp `DB_FILE`, port 4399): sign in as `admin`, `POST /api/mappingProfiles` (gets id 3, `defaultAccountId: 1`), export a backup without that profile, `POST /api/data/import/staged` + `POST /api/data/import {mode:"replace"}` → 204. Then the commit's save: `PATCH /api/mappingProfiles/3` with body `{name:"My bank", headerSignature:["Date","Amount","Desc"], delimiter:";", …, defaultAccountId:1}` → **`404 {"error":"Not found","code":"row_not_found"}`**. Server-side reason: `updateOwnedRow` ([entity-router.ts](../../../server/src/routes/entity-router.ts)) matches no row on `id = 3 and userId = 1`, so the route throws `notFound()`. The server is right. The client sent an id it should no longer have had.
  - The user's own instance wasn't available to inspect. This is the one path, out of the three listed above, that produces both "using your saved mapping" and a 404 on the mapping with consistent server data.

## Desired result (to-be)

- An import whose file matches a saved mapping commits, every time.
- The mapping save can't cancel the import. If remembering the mapping fails, the import still goes through without a `mappingProfileId`, and the user sees a short, non-blocking note that the mapping wasn't saved.
- The root cause found in step 1 below is fixed where it starts. For example, if the stored row is gone (404 on `PATCH`), `upsertRemembered` creates a new row instead of failing and replaces the stale entry in the store.
- An error never reaches the user as a bare "404". It says which step failed: saving the mapping or committing the import.

## Acceptance criteria

_Implementation note (2026-11-15):_ the fix also covers the cause at its source. After a successful backup restore, [data-management-overview](../../../src/app/feature-data-management/components/data-management-overview/data-management-overview.component.ts) now calls `StoreResetService.resetAll()` + `rehydrateAll()`, the same pair sign-in uses. Choosing "Later" on the reload prompt no longer leaves stale accounts, transactions or mapping profiles in memory.

- [x] Reproduce first: record the failing request (method, path, body) and the server-side reason for the 404. Write the confirmed root cause into this ticket's as-is, replacing "Root cause not yet pinned". (Done in the as-is above: `PATCH /api/mappingProfiles/3` → `404 row_not_found`, from `updateOwnedRow` matching no row after a `replace` restore that was never followed by a reload. Reproduced with curl on a throwaway server, and again live, see the last criterion.)
- [x] Importing a file the page reports as "using your saved mapping" commits its rows. Check this against the reproduced case. (Live on a temp-DB dev stack: remembered profile 3 deleted on the server while the tab still held it. `imp19-b.csv` showed "Detected: imp19-a — using your saved mapping", and Confirm import added 2 rows.)
- [x] A failure while saving the mapping doesn't stop the commit. The batch is created without `mappingProfileId`, and a non-blocking message says the mapping wasn't remembered. (`ImportWizardSession.rememberMapping` catches the save and sets `mappingNotSaved`, shown as a warning `mm-alert` in `import-wizard.component.html`. A commit failure now sets `commitError` (renamed from `accountCreationError`) to "Couldn't import <file>: <reason>." instead of an unhandled rejection. Spec: `import-wizard-session.spec.ts` › "remembering the mapping never blocks the import".)
- [x] `upsertRemembered` recovers from a stale id: on a 404 from `PATCH` it adds a new profile and updates the store entry, so there's still one remembered row per account + file type (CR-1.6). (`MappingProfilesRepository.update` now resolves 0 on a `row_not_found` 404, via the new `ApiClient.patchOptional`. `upsertRemembered` then adds a new profile and swaps the stale entity for it. Live: `PATCH /mappingProfiles/3 404` → `POST /mappingProfiles 201` → `POST /import/commit 201`. The server then held only profile 4 for the account.)
- [x] Persistence stays in `MappingProfilesRepository` / `ImportService`. No component or store calls the API directly. (The only new HTTP code is `ApiClient.patchOptional`, called from `mapping-profiles.repository.ts`. The store and session go through the repository and stores. The data-management fix uses `StoreResetService`, not the API.)
- [x] Unit tests cover: `upsertRemembered` with a stale id (PATCH 404 → add + store replaced); the session committing when the mapping save rejects; the session passing `mappingProfileId` when the save succeeds; plus a server spec for whichever 404 the reproduction pins, if the fix is server-side. (`mapping-profiles.store.spec.ts` › "replaces a remembered row the server no longer has". `import-wizard-session.spec.ts`: 3 cases. `mapping-profiles.repository.spec.ts` › "update resolves 0…". `api-client.spec.ts` › "patchOptional…". `data-management-overview.component.spec.ts` › "reloads every store after a restore". No server spec: the server's 404 is correct, and the fix is client-side.)
- [x] Verified via the fallow skill and coding-conventions skill. (`fallow dead-code --baseline` and `fallow health --complexity` both exit 0. `ng lint`, `ng test` (3955 passed) and `ng build --configuration development` pass. `conventions-reviewer` run on the diff.)
- [x] Live browser check: import a file with a saved mapping and confirm the rows land and the mapping is still remembered on the next import. (2026-11-15, Orca browser against `ng serve` + an API on a throwaway DB. File A added 2 rows and saved profile 3. Profile 3 was deleted server-side. File B: "using your saved mapping", PATCH 404 → POST → 2 rows added. File C: "using your saved mapping", `PATCH /mappingProfiles/4 200`, 1 row added, batch `mappingProfileId: 4`. Then a backup restore (replace, without profile 4) + **Later** + in-app navigation to Import: `GET /mappingProfiles` refired with no page reload, and the page said "No bank preset matched" rather than claiming the deleted mapping.)

## Notes

- Possibly related to the recent backup-import fixes (904c38b6 "accept soft references to deleted rows on import", d824da97 "prune orphaned transfers"). A restored backup can leave `mappingProfiles.defaultAccountId` pointing at an account that no longer exists. That's fine as stored data, but it gets the client into suspect #2 if the store's profile is sent back unchanged.
- Overlaps with TICKET-SET-11 (manage import mappings in Settings), which will add a second place that edits or deletes these rows. Its store must stay in step with the import's, or suspect #1 gets easier to hit.
