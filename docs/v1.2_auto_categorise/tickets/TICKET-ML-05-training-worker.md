# TICKET-ML-05 — Long-lived training/prediction Web Worker (the only tfjs consumer)

- **Area:** Auto-categorisation
- **Type:** Feature
- **Traceability:** adds FR-ML-5 (new)

## User story

As a user, I want the model to train and predict without freezing the app's UI or bloating the page I
loaded, so auto-categorisation feels like a natural part of the app rather than a slow add-on.

## Description

A Web Worker that is the **only place in the entire codebase allowed to import `@tensorflow/*`**, loaded
via a memoized dynamic `import()` so TF.js never lands in the initial bundle. Handles three message types —
`INIT` (rebuild a model from persisted artifacts), `TRAIN` (fit a fresh model, return serialized
artifacts), `PREDICT` (run inference, return category indices + confidences) — using the CPU backend and a
small MLP.

## Current situation (as-is)

- [csv-import.service.ts](../../../src/app/core/import/csv-import.service.ts) +
  [csv-parse.worker.ts](../../../src/app/core/import/csv-parse.worker.ts) are the existing worker precedent
  — but that worker is **short-lived**: a fresh `Worker` per `parse()` call, terminated on response. This
  ticket's worker is deliberately **long-lived** (created once by ML-06's service, reused across
  train/predict calls) so the model stays warm in worker memory instead of being rebuilt from artifacts on
  every request.
- No `@tensorflow/*` package is imported anywhere in `src/app` today (confirm via `grep -r "@tensorflow" src/app` returning no results before this ticket).
- [core/ml/model-config.ts](../../../src/app/core/ml/model-config.ts) (ML-01) and
  [core/ml/feature-hashing.ts](../../../src/app/core/ml/feature-hashing.ts) (ML-02) exist and are
  tfjs-free.

## Desired result (to-be)

- New `core/ml/category-model.worker.types.ts` — the message protocol, using **plain structural types
  only** (`ArrayBuffer`, `number[]`, plain objects — never any tfjs type):
  ```ts
  export type SerializedArtifacts = {
    modelTopology: ArrayBuffer;
    weightSpecs: ArrayBuffer;
    weightData: ArrayBuffer;
    categoryIdByIndex: number[];
  };
  export type InitRequest = { type: 'INIT'; artifacts: SerializedArtifacts; featureConfig: FeatureConfig };
  export type TrainRequest = {
    type: 'TRAIN';
    samples: { rawDescription: string; counterpartyName?: string; amount: number; categoryId: number }[];
    featureConfig: FeatureConfig;
  };
  export type PredictRequest = {
    type: 'PREDICT';
    transactions: { id: number; rawDescription: string; counterpartyName?: string; amount: number }[];
  };
  export type InitResponse = { type: 'INIT_OK' };
  export type TrainResponse = {
    type: 'TRAIN_OK';
    artifacts: SerializedArtifacts;
    metrics: { accuracy: number; trainedSampleCount: number };
  };
  export type PredictResponse = {
    type: 'PREDICT_OK';
    predictions: { id: number; categoryId: number; confidence: number }[];
  };
  export type ErrorResponse = { type: 'ERROR'; message: string };
  ```
- New `core/ml/category-model.worker.ts`:
  - Memoized dynamic `import('@tensorflow/tfjs-core')` / `-layers` / `-backend-cpu` (not the `tfjs`
    umbrella package), loaded once on first message and reused; calls `setBackend('cpu')`.
  - `INIT`: rebuilds an in-memory model from `SerializedArtifacts` via `tf.io.fromMemory`; replies
    `INIT_OK` (or `ErrorResponse`).
  - `TRAIN`: for each sample, calls `extractFeatures` (ML-02, imported from `core/ml`) to build the input
    matrix; builds `Dense(64, relu, l2) → Dropout(0.5) → [optional Dense(32) when sample count is large] →
    Dense(numClasses, softmax)`; compiles with `adam(1e-3)` + `sparseCategoricalCrossentropy`; trains with
    early stopping and class weights (skip `validationSplit` when `samples.length < 40`); wraps
    tensor-producing work in `tf.tidy`/explicit `dispose()` to bound memory; captures artifacts via
    `tf.io.withSaveHandler`; replies `TRAIN_OK` with `SerializedArtifacts` + metrics (or `ErrorResponse`).
  - `PREDICT`: extracts features per transaction (ML-02) and runs inference against the currently
    loaded/trained model; replies `PREDICT_OK` with one `{id, categoryId, confidence}` per input
    transaction (or `ErrorResponse` if no model is loaded).
  - Requests are processed one at a time (no overlapping train/predict).

## Acceptance criteria

- [ ] `grep -r "@tensorflow" src/app` matches **only** `core/ml/category-model.worker.ts` (or files it alone imports) — no other file, including `category-model.worker.types.ts`, imports any `@tensorflow/*` package, not even `import type`.
- [ ] The dynamic `import()` of tfjs happens once (memoized) and is reused across subsequent messages to the same worker instance — not re-imported per message.
- [ ] `TRAIN` on a known small labeled dataset produces a model whose `PREDICT` on the same data returns the correct category for the large majority of samples (a basic learnability smoke test, not a strict accuracy bound).
- [ ] `TRAIN` with `samples.length < 40` completes without a `validationSplit` and without throwing.
- [ ] `PREDICT` called before any successful `INIT`/`TRAIN` replies with an `ErrorResponse`, not a thrown/uncaught exception that kills the worker.
- [ ] Tensors are disposed after each `TRAIN`/`PREDICT` call — no unbounded growth in `tf.memory().numTensors` across repeated calls (asserted in a test that calls train/predict multiple times).
- [ ] `INIT` from previously `TRAIN`-produced `SerializedArtifacts` reproduces equivalent predictions to the model that produced them (round-trip fidelity).
- [ ] Unit tests exercise the worker's message handling logic directly (not through an actual `Worker` thread, matching how `csv-parse.worker.ts` is tested if a precedent exists, or via a thin exported handler function) for `INIT`/`TRAIN`/`PREDICT`/error paths; these tests **do** exercise real tfjs (unlike ML-07's store tests, which fake this worker entirely).
- [ ] `ng build --configuration production` chunk table: tfjs (and its `-core`/`-layers`/`-backend-cpu` packages) appear only in this worker's own lazy/worker chunk, never in the initial bundle; no new bundle-budget warning or error.
- [ ] Verified via the fallow skill and coding-conventions skill.

## Notes

- **This is the single highest-risk ticket in the version** — see the overview's Definition of Done and
  [auto-categorise.md](../auto-categorise.md)'s Risks section. Any eager import of `@tensorflow/*` from a
  main-thread file breaks the production bundle budget, which this project's hard rules forbid raising.
- Deliberately **not** exported through `core/ml/index.ts` (ML-01) — the worker is loaded only via
  `new Worker(new URL(...))` from ML-06's service, never via a normal ES import from a main-thread file.
- WASM backend is a documented future upgrade path (see version overview's "Considered, not ticketed yet")
  if CPU training latency ever becomes a real problem — out of scope here.
