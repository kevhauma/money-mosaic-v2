# TICKET-SRV-08 — Retire Dexie and rewrite the docs that still say "no backend"

- **Area:** Server
- **Released in:** _unreleased_
- **Type:** Refactor
- **Traceability:** retires FR-DAT-4 / NFR-STORE-1 and the Persistence section of [`finance-app-spec.md`](../../reference/finance-app-spec.md); planned for v3

## User story

As a developer picking this codebase up after v3, I want no trace of the old local database and no documentation claiming the app has no backend, so I am not misled about where the data lives.

## Description

Deletes IndexedDB from the app — the Dexie dependency, `app-db.ts`, the test polyfill, the persistent-storage request — reworks the three features that were built on top of it, and updates every document that describes the app as local-first with no backend.

## Current situation (as-is)

By the time this ticket starts, [TICKET-SRV-05](./TICKET-SRV-05-repositories-over-http.md) has moved the repositories onto HTTP and [TICKET-SRV-07](./TICKET-SRV-07-migrate-local-database.md) has moved existing users' data to the server. What is left behind:

- **[`app-db.ts`](../../../src/app/core/data-access/app-db.ts)** — the `AppDb` class, sixteen version blocks, the populate seed. Its entity `type`s already moved to `entities.ts` in [TICKET-SRV-02](./TICKET-SRV-02-drizzle-schema-per-user.md); the seed constants are now duplicated by `seedUserDefaults` on the server.
- **`dexie` in [`package.json`](../../../package.json)**, and `fake-indexeddb` as a dev dependency with the global polyfill in [`test-setup.ts`](../../../src/test-setup.ts) (global because Vitest runs with `isolate: false`).
- **[`storage-status.service.ts`](../../../src/app/core/storage/storage-status.service.ts)** — asks for persistent browser storage so IndexedDB is not evicted (FR-DAT-4). Already unhooked from bootstrap by [TICKET-SRV-06](./TICKET-SRV-06-bootstrap-hydration-over-network.md); its "storage may be evicted" UI is now false.
- **[`dev-seed.service.ts`](../../../src/app/dev-seed/dev-seed.service.ts)** — the dev-only sample dataset (TICKET-DEV-01), written straight into Dexie tables and loaded from a lazy chunk a production build never references.
- **`feature-data-management`** — the JSON export/import ([TICKET-DAT-01](../../data-management/tickets/TICKET-DAT-01-full-data-export-import.md)), delete-all-data ([TICKET-DAT-03](../../data-management/tickets/TICKET-DAT-03-delete-all-data.md)) and the QR transfer ([TICKET-DAT-05](../../data-management/tickets/TICKET-DAT-05-qr-code-data-sync.md)). All three still make sense — they just read from a different place now.
- **Documents that assert the app has no backend**: [`CLAUDE.md`](../../../CLAUDE.md) line 3 ("**No backend** — all data lives in IndexedDB"), [`finance-app-spec.md`](../../reference/finance-app-spec.md)'s "Persistence: Local-first (IndexedDB, no backend)", the whole of [`.claude/skills/data-model/SKILL.md`](../../../.claude/skills/data-model/SKILL.md), and the parts of [`project-map/SKILL.md`](../../../.claude/skills/project-map/SKILL.md) describing the data-access layer.

## Desired result (to-be)

- **Deleted**: `app-db.ts`, `storage-status.service.ts` and its `core/storage/` barrel, `test-setup.ts`'s IndexedDB polyfill, the `dexie` dependency and the `fake-indexeddb` dev dependency. `npm ls dexie` finds nothing.
- **Dev seed reworked** to post its sample dataset through the API for the signed-in user, keeping its existing shape and its dev-only gating (`isDevMode()` plus the dynamic import, so a production build still never references the dataset). It seeds only when the account is empty, as it does today.
- **The three data-management features re-sourced**, each keeping its user-facing behaviour:
  - **JSON export** reads `GET /api/data/export`. The trained-model loss recorded in DAT-05 is fixed in passing, since the artifact is stored as bytes server-side — or, if that turns out to need its own work, the export **says** what it is leaving out rather than dropping it silently.
  - **JSON import** posts to `POST /api/data/import`, keeping the replace-vs-merge dialog and the schema-version guard.
  - **QR send/receive** keeps working end to end — `exportAll`/`importAll` were always transport-agnostic, so only their source changes. The frame format, chunking and camera code are untouched.
  - **Delete all data** calls `DELETE /api/data`, and its confirmation copy changes from "this browser" to "your account".
- **Persistent-storage UI removed** from the Data section, along with any copy about browser eviction. What replaces it is a short statement of where the data actually is now — the server, in a SQLite file — linking to the backup guidance from [TICKET-SRV-09](./TICKET-SRV-09-single-process-local-hosting.md).
- **Documentation rewritten to be true**:
  - `CLAUDE.md`'s opening paragraph, its Commands section (the server's scripts), and its hard rules — the Dexie-additive-migration rule is replaced by the Drizzle migration rule, and the "never touch `appDb` directly" rule becomes "never call the API outside a repository", which is the same rule about the same seam.
  - `finance-app-spec.md`'s Persistence line, plus FR-DAT-4 and NFR-STORE-1, which described a guarantee the app no longer makes.
  - `.claude/skills/data-model/SKILL.md` rewritten for the Drizzle schema: tables, columns, indexes, the per-user ownership rule, the migration workflow, and the repository layer as an HTTP client. The Dexie version history is **not** carried forward — it described upgrades for databases that no longer exist.
  - `.claude/skills/project-map/SKILL.md` gains `server/` and `feature-auth/`.
- **The bundle gets smaller**, and the measured before/after initial-bundle numbers are recorded on this ticket. The `angular.json` budgets are **not** raised — they are only ever lowered, if at all.

## Acceptance criteria

- [ ] `grep -ri "dexie\|indexeddb" src/` returns nothing but the migration helper's comments, if any survive; `npm ls dexie fake-indexeddb` finds neither package.
- [ ] `ng test` passes without the IndexedDB polyfill, with no spec silently skipped — the test count before and after is compared and any drop is explained on this ticket.
- [ ] The dev seed still populates a dev account end to end, and a production build still contains no reference to the sample dataset.
- [ ] JSON export, JSON import, QR send, QR receive and delete-all-data each work against the server, covered by their existing specs adapted to the new source.
- [ ] The trained category model is either included in the export or explicitly reported as excluded — never silently dropped, which is the pre-existing defect this ticket must not inherit.
- [ ] No persistent-storage request is made by the app, and no UI mentions browser eviction.
- [ ] `CLAUDE.md`, `finance-app-spec.md`, `data-model/SKILL.md` and `project-map/SKILL.md` contain no claim that the app has no backend or stores data in IndexedDB — checked by reading them, and by a grep for "IndexedDB" and "no backend" across `docs/reference/`, `CLAUDE.md` and `.claude/skills/`.
- [ ] Historical documents are **not** rewritten: `docs/releases/` overviews and shipped tickets keep saying what was true when they shipped, per `docs/README.md`.
- [ ] `ng build --configuration development` initial-bundle size is recorded before and after, and the after is smaller. Budgets untouched.
- [ ] `ng lint`, `ng test` and `ng build --configuration development` are all green.
- [ ] Verified via the fallow skill and coding-conventions skill — fallow's dead-code pass is expected to find newly-orphaned exports and is part of the acceptance, not an afterthought.
- [ ] Verified live in the browser: export a backup, delete all data, re-import the backup, and confirm the app returns to its previous state.

## Notes

- **Deleting the local database is not reversible for anyone who skipped [TICKET-SRV-07](./TICKET-SRV-07-migrate-local-database.md).** The code that reads the old IndexedDB goes away here. That ordering is deliberate and it is the reason SRV-07 is a prerequisite rather than a nice-to-have — and a reason to leave a generous gap between shipping the two.
- **The documentation half is not paperwork.** `CLAUDE.md` and the skills are loaded into context on every session in this repo; leaving them describing Dexie means every future session starts from a false model of the app and writes code against a database that no longer exists. Treat it as part of the change, not a follow-up.
- **`fallow` will have a lot to say** after seventeen repositories change shape and a whole service is deleted. Budget for it.
- Depends on [TICKET-SRV-05](./TICKET-SRV-05-repositories-over-http.md), [TICKET-SRV-06](./TICKET-SRV-06-bootstrap-hydration-over-network.md) and [TICKET-SRV-07](./TICKET-SRV-07-migrate-local-database.md).
