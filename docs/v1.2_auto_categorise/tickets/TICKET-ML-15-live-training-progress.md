# TICKET-ML-15 — Live per-epoch training progress

- **Area:** Auto-categorisation
- **Type:** Feature
- **Traceability:** adds FR-ML-15 (new)

## User story

As a user, when training takes more than a moment, I want to see what the model is actually doing —
which epoch it's on, its current loss/accuracy, whether it stopped early — instead of a static
"Training…" spinner, so I have some sense of progress instead of wondering if it's stuck.

## Description

Streams per-epoch progress out of the training worker during `model.fit()`, instead of the current
single request/response round-trip that only reports back once training is fully done. ML-12's status
card renders the live epoch/loss/accuracy while `status === 'training'`.

## Current situation (as-is)

- [category-model.worker.ts](../../../src/app/core/ml/category-model.worker.ts)'s `processTrain` (lines
  128-206) calls `model.fit(xs, ys, { epochs: 120, batchSize: Math.min(32, samples.length), verbose: 0,
  classWeight, callbacks: layers.callbacks.earlyStopping({...}) })` and returns exactly one `TRAIN_OK`
  response once the whole `await model.fit(...)` resolves — no intermediate signal of any kind.
- [category-model.worker.types.ts](../../../src/app/core/ml/category-model.worker.types.ts)'s
  `WorkerResponse` union (line 49) is `InitResponse | TrainResponse | PredictResponse | ErrorResponse` —
  every member is terminal; there's no non-terminal progress variant.
- [category-model.service.ts](../../../src/app/feature-categories/category-model.service.ts)'s
  `sendRequest` (lines 44-78) resolves and removes its listeners on the **first** `message` event it
  receives, whatever its type — it has no notion of "more messages are coming for this request."
- [category-model.store.ts](../../../src/app/feature-categories/category-model.store.ts)'s `train()`
  (lines 143-196) sets `status: 'training'`, then `await service.train(...)` as a single opaque promise —
  no intermediate state exists to render.
- `ModelStatusComponent` (relocated/expanded to `/learning` by ML-12) renders a plain spinner + "Training…"
  for `status === 'training'`, with no epoch/loss detail to show even if it wanted to.

## Desired result (to-be)

- New message type in `category-model.worker.types.ts`: `TrainProgress = { type: 'TRAIN_PROGRESS'; epoch:
  number; totalEpochs: number; loss: number; accuracy: number | null; valLoss: number | null }` — a
  non-terminal member alongside the existing terminal `WorkerResponse` union.
- `processTrain` passes an **array** of callbacks to `model.fit` (tf.js's `callbacks` option accepts
  multiple) — the existing `earlyStopping(...)` callback plus a new one whose `onEpochEnd(epoch, logs)`
  does `self.postMessage({ type: 'TRAIN_PROGRESS', epoch, totalEpochs: 120, loss: logs.loss, accuracy:
  logs.acc ?? logs.accuracy ?? null, valLoss: logs.val_loss ?? null })`.
- `processTrain`'s final `TRAIN_OK` response gains `metrics.epochsRun: number` (the actual epoch count
  `history.history.loss.length` ran, versus the 120 cap) so a post-hoc "stopped early" read is possible
  without a separate round-trip.
- `CategoryModelService.train(samples, featureConfig, onProgress?)` gains an optional third parameter,
  `onProgress?: (progress: Omit<TrainProgress, 'type'>) => void`. `sendRequest`'s message handler treats
  `TRAIN_PROGRESS` as non-terminal: call `onProgress` (when provided) and **keep the listeners attached**,
  only cleaning up and resolving/rejecting on `TRAIN_OK`/`PREDICT_OK`/`INIT_OK`/`ERROR`.
- `CategoryModelStore` state gains `trainingProgress: { epoch: number; totalEpochs: number; loss: number;
  accuracy: number | null } | null`. `train()` passes an `onProgress` callback that `patchState`s it on
  every call; reset to `null` immediately when `train()` starts (before the first epoch) and again once
  `status` leaves `'training'` (success, `not-enough-data`, or `error`).
- `ModelStatusComponent`'s `'training'` branch renders the live epoch/loss (and accuracy when present) —
  e.g. "Training… epoch {epoch}/{totalEpochs} · loss {loss | number:'1.3-3'}" — falling back to the
  existing plain "Training…" copy only while `trainingProgress` is still `null` (before the first epoch
  completes).
- `'ready'`'s existing accuracy display can optionally note `metrics.epochsRun` vs the 120 cap when they
  differ (e.g. "stopped early at epoch 43") — nice-to-have, not required if it complicates the copy.

## Acceptance criteria

- [ ] `processTrain` posts one `TRAIN_PROGRESS` message per completed epoch during `model.fit`, each
      carrying the epoch index, the 120-epoch cap, and the current loss (accuracy/valLoss when tf.js
      reports them).
- [ ] `CategoryModelService.train(..., onProgress)` invokes `onProgress` for every `TRAIN_PROGRESS` message
      received before the terminal response, without resolving or detaching listeners early.
- [ ] `CategoryModelService`'s `init`/`predict` round-trips are unaffected — unmodified ML-06 unit tests
      still pass; the listener-lifetime change doesn't alter their single-response behaviour.
- [ ] `CategoryModelStore.train()`'s `trainingProgress` signal updates on every progress callback (verified
      with a fake service that emits several progress calls before resolving) and is `null` once `status`
      is no longer `'training'`.
- [ ] A run that finishes before the 120-epoch cap (early stopping fires) reports `metrics.epochsRun` below
      120, distinguishable from a full run — without any extra worker round-trip.
- [ ] `ModelStatusComponent` shows live epoch/loss (and accuracy, when present) while training, updating as
      `trainingProgress` changes, and reads the plain "Training…" copy only when `trainingProgress` is
      still `null`.
- [ ] `grep -r "@tensorflow" src/app` still matches only `category-model.worker.ts` — no new tfjs import
      anywhere else.
- [ ] Unit tests cover: the worker posts progress messages across a multi-epoch fit (small synthetic
      dataset, asserted via a mocked `self.postMessage`/`onEpochEnd` invocation count); the service
      distinguishes non-terminal `TRAIN_PROGRESS` from the terminal response; the store's
      `trainingProgress` signal transitions correctly across a canned progress→success sequence and a
      canned progress→error sequence.
- [ ] Verified live in the browser: training on enough labelled data to run several epochs shows the
      epoch/loss updating in real time on `/learning` before settling into `'ready'`.
- [ ] Verified via the fallow skill and coding-conventions skill.

## Notes

- Needs ML-12 (this ticket edits `ModelStatusComponent`'s `'training'` rendering, which ML-12 first
  relocates/expands onto `/learning`) — sequenced after it, not parallel.
- Given CPU-backend training on this app's typically tiny datasets (dozens–hundreds of rows) finishes in
  well under a second most of the time, the progress readout will often flash briefly rather than visibly
  tick up — that's fine; the payoff grows as transaction history accumulates and the model's second hidden
  layer kicks in past the 200-sample threshold (`LARGE_SAMPLE_THRESHOLD`).
- No new tfjs surface area beyond what `model.fit`'s existing `callbacks` option already supports (an
  array of callback objects, one of which is the pre-existing `earlyStopping`).
- Raised in a follow-up conversation to `docs/v1.2_auto_categorise/revision-and-feedback.md`, not the
  feedback file itself — "what more info can we show of the NN … when learning takes a while, can we show
  what it's doing in more detail?"
