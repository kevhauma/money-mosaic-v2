# TICKET-ML-04 — `categoryModel` Dexie table + repository

- **Area:** Auto-categorisation
- **Type:** Feature
- **Traceability:** adds FR-ML-4 (new)

## User story

As a user, I want a model I've trained to still be there the next time I open the app, so I don't have to
retrain it from scratch on every page load.

## Description

An additive Dexie table holding a single persisted model artifact row (topology, weight specs, weight
data, and the metadata needed to know whether it's still valid), plus a thin repository following the
existing singleton-row pattern (`TransferSettingsRepository`). No worker, no tfjs import, no UI in this
ticket — it only stores/retrieves whatever `SerializedArtifacts` shape ML-05 produces.

## Current situation (as-is)

- [app-db.ts](../../../src/app/core/data-access/app-db.ts) currently ships schema **`.version(6)`** (lines
  519-544, the neutral-category backfill from
  [TICKET-CAT-02](../../v1.1_joint_accounts/tickets/TICKET-CAT-02-neutral-category-kind.md)) — the design
  doc's reference to `.version(6)` for this feature predates that ship; the next free version number is
  **7**.
- [transfer-settings.repository.ts](../../../src/app/core/data-access/transfer-settings.repository.ts) is
  the existing precedent for a singleton-row repository (`get`/`update` against a fixed id) — this ticket
  follows the same shape (`get`/`save`/`clear`) rather than the multi-row `getAll`/`add`/`update`/`remove`
  shape used by `categories.repository.ts` etc., since there is exactly one model at a time.
- No ML-related table or repository exists yet.

## Desired result (to-be)

- New type in `app-db.ts`:
  ```ts
  export type CategoryModelArtifact = {
    id: 1; // singleton row
    modelTopology: ArrayBuffer;
    weightSpecs: ArrayBuffer;
    weightData: ArrayBuffer;
    categoryIdByIndex: number[];
    featureConfig: FeatureConfig; // from core/ml/model-config.ts
    taxonomySignature: string;
    metrics: { accuracy: number; trainedSampleCount: number };
    trainedAt: string; // ISO timestamp
    schemaVersion: number; // MODEL_SCHEMA_VERSION at training time
  };
  ```
- New `.version(7).stores({ ...all 8 existing tables verbatim..., categoryModel: 'id' })` block appended
  after the current `.version(6)` block — full table map repeated per the project's additive-versioning
  rule. **No `.upgrade()`** — brand-new, empty table. If another version's tickets claim 7 first at
  implementation time, this becomes the next free number instead; every other version's tickets are
  otherwise unaffected.
- New `core/data-access/category-model.repository.ts`:
  ```ts
  @Injectable({ providedIn: 'root' })
  export class CategoryModelRepository {
    get = async (): Promise<CategoryModelArtifact | undefined> => appDb.categoryModel.get(1);
    save = (artifact: CategoryModelArtifact): Promise<1> => appDb.categoryModel.put(artifact);
    clear = (): Promise<void> => appDb.categoryModel.delete(1);
  }
  ```
- `CategoryModelArtifact` and `CategoryModelRepository` exported through
  [core/data-access/index.ts](../../../src/app/core/data-access/index.ts).

## Acceptance criteria

- [ ] `CategoryModelArtifact` type defined in `app-db.ts` with the fields above.
- [ ] New `.version(7)` block (or next free number) is additive — no edits to the `.version(6)` block — and repeats the full existing table map.
- [ ] `categoryModel` table indexed on `id` only (singleton row, no query indexes needed).
- [ ] `CategoryModelRepository` implements `get`/`save`/`clear`; no component or store touches `appDb.categoryModel` directly.
- [ ] Both are exported through `core/data-access/index.ts`.
- [ ] Unit tests cover: repository round-trip (save then get returns the same artifact, including `ArrayBuffer` fields) against a real (fake-indexeddb-backed) `appDb` instance, matching how existing repository specs are structured; `clear` removes the row; `get` returns `undefined` before anything is saved.
- [ ] No import of `@tensorflow/*` anywhere in this file — the repository only moves opaque `ArrayBuffer`s, never interprets them.
- [ ] Verified via the fallow skill and coding-conventions skill.

## Notes

- `this.on('populate')` is left untouched — no artifact exists until the user trains a model (ML-07).
- Independent of ML-02/ML-03/ML-05 — only needs ML-01's `FeatureConfig` type — so it can be built in
  parallel with those.
- `ArrayBuffer` fields round-trip through IndexedDB's structured clone natively; no serialization helper is
  needed in this ticket (the worker, ML-05, is what produces/consumes them as transferable objects).
