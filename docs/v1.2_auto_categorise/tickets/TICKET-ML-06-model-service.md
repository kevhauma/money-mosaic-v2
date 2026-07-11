# TICKET-ML-06 — Main-thread `CategoryModelService` owning the worker

- **Area:** Auto-categorisation
- **Type:** Feature
- **Traceability:** adds FR-ML-6 (new)

## User story

As a user, I want the app to keep talking to the same trained model across multiple actions in a session
(viewing suggestions, accepting one, retraining), so it doesn't feel like it forgets what it just learned
moments ago.

## Description

A main-thread, injectable service that owns a single **long-lived** instance of ML-05's worker and exposes
`init`/`train`/`predict` as Promise-wrapped round-trips, sequencing requests so only one is in flight at a
time. This is the only file allowed to construct the worker; no main-thread file below this one in the
dependency chain touches `postMessage` directly.

## Current situation (as-is)

- [csv-import.service.ts](../../../src/app/core/import/csv-import.service.ts) is the existing
  Promise-wrapped-worker-round-trip precedent, but it creates and **terminates** a fresh worker per call
  (`parse()`). This ticket deliberately keeps the worker alive across calls instead — constructed once,
  reused for every `init`/`train`/`predict`, since ML-05's worker holds the trained model in memory between
  requests.
- No `CategoryModelService` or equivalent exists yet.

## Desired result (to-be)

- New `feature-categories/category-model.service.ts`:
  ```ts
  @Injectable({ providedIn: 'root' })
  export class CategoryModelService {
    private worker = new Worker(new URL('@/core/ml/category-model.worker', import.meta.url));
    private queue: Promise<unknown> = Promise.resolve(); // sequences requests

    init(artifacts: SerializedArtifacts, featureConfig: FeatureConfig): Promise<void>;
    train(samples: TrainRequest['samples'], featureConfig: FeatureConfig): Promise<TrainResponse>;
    predict(transactions: PredictRequest['transactions']): Promise<PredictResponse['predictions']>;
  }
  ```
  Each method posts the corresponding request (ML-05's protocol types) and resolves/rejects from the next
  matching response/`ErrorResponse` message, chained onto `this.queue` so a `train()` in flight is never
  interleaved with a `predict()`.
- The worker is created once, in the constructor, for the service's lifetime (the service is
  `providedIn: 'root'`, so effectively for the app's session) — never re-created per call.
- Errors from the worker (`ErrorResponse`, or the worker's own `onerror`) reject the corresponding promise
  with a real `Error`, never leave a caller awaiting forever.

## Acceptance criteria

- [x] The worker is constructed exactly once per service instance (in the constructor or on first use, memoized) — not re-created inside `init`/`train`/`predict`.
- [x] `init`/`train`/`predict` each return a `Promise` that resolves with the corresponding typed response payload and rejects on an `ErrorResponse` or worker error.
- [x] Calling `train()` and `predict()` back-to-back without awaiting the first does not interleave their worker messages — the second request's message is posted only after the first's response arrives (sequenced via an internal queue).
- [x] No component or store constructs `Worker(...)` directly for this feature — `CategoryModelService` is the sole owner.
- [x] Unit tests use a fake/mocked `Worker` (matching how `csv-import.service.spec.ts` mocks `csv-parse.worker.ts` if such a precedent exists, or a hand-rolled `postMessage`/`onmessage` stub) to verify: request/response matching, sequencing under concurrent calls, and error propagation — no real tfjs execution in this ticket's tests.
- [x] `grep -r "@tensorflow" src/app/feature-categories/category-model.service.ts` returns no matches — the service only imports ML-05's structural protocol types, never tfjs itself.
- [x] Verified via the fallow skill and coding-conventions skill.

## Notes

- Lives in `feature-categories/` (not `core/ml/`) because it's the main-thread integration point that
  ML-07's store injects directly — `core/ml/` stays reserved for the pure/worker surface per
  [auto-categorise.md](../auto-categorise.md)'s file layout.
- Needs ML-05's worker to exist (imports its types and constructs it via `new URL(...)`), but has no
  dependency on ML-03/ML-04 — it's a pure transport layer.
