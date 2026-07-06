# In-Browser Neural-Net Transaction Categorizer (TF.js)

## Context

Transactions land uncategorized after CSV import. Today the only auto-categorization is the
user-authored **rules engine**, which never overrides a manual category (`categoryManual`).

We sparred the design space. A deterministic "merchant memory" approach was considered but rejected
for one decisive reason: it depends on a **hand-coded normalizer/stopword list** that is
bank/locale-specific and won't generalize across users. The chosen answer is a **learned model** —
the model *learns* which tokens are noise (e.g. "BETALING" appears across all categories → near-zero
weight), so no per-locale tuning is ever needed. That is the core justification for going neural.

**Decided (user's calls):**
- **TensorFlow.js**, a **deeper MLP** (1–2 hidden layers, softmax over active categories).
- **Suggest-only** — predicts a category per uncategorized transaction; UI shows a ghost suggestion
  + one-click Accept. Never auto-applies, never overrides `categoryManual`.
- **Also produces rule suggestions** — since the MLP is opaque, rule proposals are *mined from
  confident, consistent prediction clusters* per counterparty (not read from weights), surfaced in a
  rule-proposal inbox embedded in the rules page. Accept → existing `createRuleFromCounterparty`.
- **Feature hashing replaces the normalizer** — minimal lowercase+split tokenization + char n-grams,
  hashed to a fixed vector; the model learns token importance. No stopword list.

## The load-bearing constraint

**Never raise the Angular bundle budgets** (initial: 500kB warn / 1MB error, production only).
TF.js is ~1MB+. Therefore **TF.js is imported *only* inside the Web Worker via dynamic `import()`**,
so it lands in the worker chunk, not the initial bundle. **No main-thread file may import any
`@tensorflow/*` — not even `import type`.** This is the single hardest rule and is gated in
verification (grep + production chunk inspection).

## Architecture

```
main thread                         │ Web Worker (only tfjs consumer)
CategoryModelStore (@ngrx/signals)  │
  ├ status/metrics/suggestions      │  category-model.worker.ts
  ├ CategoryModelService ───postMessage(raw rows)──▶ dynamic import tfjs (CPU backend)
  │   (owns long-lived worker)      │    ├ INIT   → rebuild model from artifacts
  ├ CategoryModelRepository ◀─artifacts (transferable ArrayBuffers)─┤ TRAIN  → fit + return artifacts
  │   (Dexie v6 singleton)          │    └ PREDICT→ feature-hash + infer → {idx,confidence}
  └ reuses TransactionsStore/RulesStore/CategoriesStore
```
Feature extraction runs **inside the worker** — main thread sends compact raw strings, not
dim-8192 float arrays (keeps the postMessage boundary cheap). The worker is **long-lived** (unlike
the per-parse CSV worker) so the model stays warm; requests are sequenced (one model in flight).

**Backend: `@tensorflow/tfjs-backend-cpu`** (with `-core` + `-layers`; NOT the `tfjs` umbrella).
WebGL-in-worker needs OffscreenCanvas (fragile); WASM needs served `.wasm` assets. Data is tiny
(dozens–hundreds of rows) → CPU trains sub-second, zero extra assets, most portable.

## Files

### Create — core/ml (pure, tfjs-free, unit-testable)
- `core/ml/feature-hashing.ts` (+ `.spec.ts`) — `tokenize`, `charNgrams`, `hashToken` (FNV-1a),
  `extractFeatures(input, config): Float32Array`. Amount sign in a reserved slot (`vec[dim-1]`);
  char 3–4-grams of counterpartyName for typo/id robustness. `DEFAULT_FEATURE_CONFIG = {dim:8192, charNgramMin:3, charNgramMax:4}`.
- `core/ml/rule-proposal-mining.ts` (+ `.spec.ts`) — `mineRuleProposals(predictions, transactionsById, enabledRules, thresholds)`:
  group by raw `counterpartyName`, modal predicted category, mean confidence + support; keep clusters
  with `support>=4 && meanConfidence>=0.85` **not covered by an enabled rule** (reuse
  `matchesRule` from `core/categorisation/rule-matching.ts`); sort by support then confidence.
- `core/ml/model-config.ts` (+ `.spec.ts`) — shared consts/types (`FeatureConfig`,
  `MODEL_SCHEMA_VERSION`, `MIN_TRAINING_LABELS=25`, `MIN_CATEGORIES=2`, mining thresholds) and pure
  `taxonomySignature(activeCategories)` (stale-detection hash).
- `core/ml/index.ts` — barrel for the pure surface (NOT the worker).

### Create — the worker (only tfjs consumer)
- `core/ml/category-model.worker.ts` — memoized dynamic import of tfjs; `setBackend('cpu')`;
  handles `INIT | TRAIN | PREDICT`. Model: `Dense(64,relu,l2) → Dropout(0.5) → [opt Dense(32) when
  data large] → Dense(numClasses,softmax)`, `adam(1e-3)`, `sparseCategoricalCrossentropy`,
  early-stopping, class weights; skip validationSplit when n<40; `tf.tidy`/`dispose` to bound memory.
  Artifact capture via `tf.io.withSaveHandler`; reload via `tf.io.fromMemory`.
- `core/ml/category-model.worker.types.ts` — message protocol using **plain structural types only**
  (`ArrayBuffer`, `number[]` — never tfjs types): `TrainRequest/PredictRequest/InitRequest` and
  `TrainResponse/PredictResponse/InitResponse/ErrorResponse`, `SerializedArtifacts`
  (`modelTopology`/`weightSpecs`/`weightData` as transferable ArrayBuffers).

### Create/modify — persistence (Dexie v6, additive)
- Modify `core/data-access/app-db.ts` — add `CategoryModelArtifact` type + `categoryModel!` table;
  `.version(6).stores({ ...all 8 existing tables verbatim..., categoryModel: 'id' })`. **No
  `.upgrade()`** (new empty table). Artifact row (singleton id=1) stores topology/specs/weights
  ArrayBuffers, `categoryIdByIndex: number[]`, `featureConfig`, `taxonomySignature`, `metrics`,
  `trainedAt`, `schemaVersion`. Leave versions 1–5 untouched.
- Create `core/data-access/category-model.repository.ts` — `get/save/clear` singleton, mirroring
  `TransferSettingsRepository`. Export from `core/data-access/index.ts`.

### Create/modify — service + store (main thread, no tfjs import)
- `feature-categories/category-model.service.ts` — owns the long-lived worker
  (`new Worker(new URL('@/core/ml/category-model.worker', import.meta.url))`), Promise-wrapped
  `train/predict/init` round-trips (pattern from `csv-import.service.ts`), request sequencing.
- `feature-categories/category-model.store.ts` (`@ngrx/signals`, root) — injects the service +
  `TransactionsStore`/`CategoriesStore`/`RulesStore`/`CategoryModelRepository`. State:
  `status: untrained|not-enough-data|training|ready|stale|error`, `metrics`, `lastTrainedAt`,
  `categoryIdByIndex`, `suggestions: Map<txnId,{categoryId,confidence}>`, `ruleProposals`.
  - `hydrate()` (in `app.config.ts` initializer): load row → none=`untrained`; else compare
    `taxonomySignature` → `ready|stale`; `service.init(artifacts)`; `refreshSuggestions()` if ready.
  - `train()`: build labeled samples from categorized txns in active categories; **cold-start guard**
    (`>=25` labels, `>=2` categories → else `not-enough-data`); `training` → `service.train` →
    persist artifacts → `ready` → `refreshSuggestions()`.
  - `refreshSuggestions()` (guarded on `status==='ready'`): `service.predict(uncategorisedTransactions())`
    → map idx→categoryId → `suggestions`; then `ruleProposals = mineRuleProposals(...)`.
  - `acceptSuggestion(id)` → `TransactionsStore.bulkAssignCategory([id], categoryId)` (sets
    `categoryManual:true`); `acceptProposal(p)` → `RulesStore.createRuleFromCounterparty(sampleTxn, categoryId)`;
    `dismiss*` = local removal.
  - **Retrain trigger: manual "Train model" button** (predictable CPU cost); staleness relabels it
    "Retrain (categories changed)". Auto-retrain-after-N-labels deferred.
  - Export store from `feature-categories/index.ts`.

### Modify — UI (reuse `mm-badge`/`mm-button`, daisyUI, no raw classes)
- `feature-transactions/components/transactions-overview/transactions-overview.component.{ts,html}` —
  inject `CategoryModelStore` via `@/feature-categories` barrel; extend `TransactionRow` with
  `suggestion`; in the uncategorized category cell render a ghost `Suggested: {name} ({conf%})` +
  `Accept` (xs) → `acceptSuggestion`. (Component→store only; no store cycle.)
- Create `feature-categories/components/rule-proposals/rule-proposals.component.{ts,html}` — dismissible
  list of `ruleProposals()` (counterparty, category badge, support · confidence, Accept/Dismiss);
  embed at top of `rules-overview.component.html`; add to imports + `components/index.ts`.
- Create `feature-categories/components/model-status/model-status.component.{ts,html}` — status chip +
  lastTrained + accuracy + Train/Retrain button (spinner while `training`; actionable copy for
  `not-enough-data`); mount on `categories-overview` (no settings page exists).

## Testing & verification
- **Vitest, TestBed-free** (mirror `core/stats/net-worth-trend.spec.ts`): `feature-hashing.spec.ts`
  (determinism, fixed dim, amount-sign slot, n-grams), `rule-proposal-mining.spec.ts` (grouping,
  thresholds, `matchesRule` exclusion, sort), `model-config.spec.ts` (`taxonomySignature` stability).
- **Store test** with a **fake `CategoryModelService`** (canned responses): status transitions,
  cold-start guard, suggestion mapping, accept flows delegate to `bulkAssignCategory` /
  `createRuleFromCounterparty`. Don't run tfjs in unit tests.
- **Suite:** `ng lint` → `ng test` → `ng build --configuration development`.
- **CRITICAL bundle gate:** `Grep "@tensorflow"` under `src/app` must match **only**
  `category-model.worker.ts`. Then `ng build --configuration production` and inspect the chunk table:
  initial total still within budget (no error, no new 500kB warning), tfjs sits in a ~1MB+
  worker/lazy chunk. If tfjs appears in the initial bundle, stop and fix before continuing.
- **Live browser check:** train on seeded/categorized data → uncategorized known-merchant row shows
  ghost suggestion → Accept sets category → rule proposal appears → Accept creates rule + re-runs.

## Risks
- **Bundle leak (highest):** any eager tfjs import (incl. `import type`) breaks the budget — grep gate
  + prod chunk inspection are hard gates.
- **Overfitting on tiny data:** dropout 0.5 + L2 + single hidden layer default + early stopping +
  class weights + the 25-label cold-start floor.
- **Cold start / staleness:** explicit `not-enough-data` and `stale` states with actionable copy;
  predictions suppressed unless `status==='ready'`; taxonomy change → retrain prompt.
- **Cross-thread artifacts:** topology/specs/weights encoded to transferable ArrayBuffers; persisted
  natively in IndexedDB; worker re-`INIT`ed on reload before any predict.
- **DI cycle watch:** `CategoryModelStore` may inject the other stores, but they must never import it
  back — components consume it instead.
- **Future Layer:** auto-retrain-after-N-labels deferred; WASM backend is the documented upgrade path
  if CPU training latency ever bites.
```