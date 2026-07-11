# TICKET-ML-01 — Shared ML config, types, and taxonomy signature

- **Area:** Auto-categorisation
- **Type:** Feature
- **Traceability:** adds FR-ML-1 (new)

## User story

As a user, I want the auto-categoriser's behaviour (how much data it needs before it will train, how
confident a rule proposal must be) to be governed by one consistent, well-reasoned set of rules, so the
feature behaves predictably instead of every part inventing its own thresholds.

## Description

Introduce `core/ml/`, a new pure (tfjs-free) module, starting with `model-config.ts`: the shared types and
constants every other FR-ML ticket imports — `FeatureConfig`, the Dexie schema-version marker for the
model artifact, cold-start/mining thresholds, and a `taxonomySignature` helper used to detect when a
trained model is stale relative to the current category list. No UI, no worker, no persistence in this
ticket.

## Current situation (as-is)

- No `core/ml/` folder exists yet anywhere in the codebase.
- [core/stats/](../../../src/app/core/stats/) (e.g.
  [period-stats.ts](../../../src/app/core/stats/period-stats.ts)) is the existing precedent for a
  TestBed-free pure module with co-located `*.spec.ts` files — `core/ml/` follows the same shape.
- [categories.store.ts](../../../src/app/feature-categories/categories.store.ts) exposes the active
  category list the model trains against, but nothing today computes a stable signature of it.

## Desired result (to-be)

- New `core/ml/model-config.ts`:
  ```ts
  export type FeatureConfig = {
    dim: number;
    charNgramMin: number;
    charNgramMax: number;
  };

  export const DEFAULT_FEATURE_CONFIG: FeatureConfig = { dim: 8192, charNgramMin: 3, charNgramMax: 4 };

  export const MODEL_SCHEMA_VERSION = 1; // bump whenever the artifact shape or feature config changes incompatibly
  export const MIN_TRAINING_LABELS = 25; // cold-start floor: fewer categorised transactions ⇒ 'not-enough-data'
  export const MIN_CATEGORIES = 2; // fewer active categories ⇒ 'not-enough-data'
  export const RULE_PROPOSAL_MIN_SUPPORT = 4; // minimum cluster size to propose a rule
  export const RULE_PROPOSAL_MIN_CONFIDENCE = 0.85; // minimum mean prediction confidence to propose a rule

  export function taxonomySignature(activeCategories: { id: number; name: string }[]): string;
  ```
- `taxonomySignature` is a pure, order-independent hash (sort by `id` first) of active category
  id+name pairs — stable across re-runs with the same categories, changes whenever a category is
  added/removed/renamed, used later (ML-07) to flip a trained model from `ready` to `stale`.
- New `core/ml/index.ts` barrel exporting the pure surface only (the worker, added in ML-05, is
  deliberately **not** re-exported here so no main-thread import chain can accidentally pull it in).

## Acceptance criteria

- [x] `model-config.ts` exports exactly the types/consts above with no import of `@tensorflow/*` anywhere in the file or its transitive imports.
- [x] `taxonomySignature` returns the same string for the same category set regardless of input array order, and a different string when any id, name, or the set's membership changes.
- [x] `core/ml/index.ts` exists and re-exports `model-config.ts`'s surface; it does not export anything from a worker file (none exists yet in this ticket).
- [x] Unit tests (`model-config.spec.ts`) cover: signature stability under reordering, signature change on rename/add/remove, and that the exported thresholds match the documented values.
- [x] No TestBed — pure functions/consts, co-located `model-config.spec.ts`.
- [x] Verified via the fallow skill and coding-conventions skill.

## Notes

- This ticket exists purely so every later ticket (ML-02 through ML-10) references the same constants
  instead of six different hand-copied magic numbers — see [auto-categorise.md](../auto-categorise.md)'s
  `core/ml/model-config.ts` file entry.
- `MODEL_SCHEMA_VERSION` is distinct from the Dexie table's schema version (ML-04) — this one versions the
  *artifact shape/feature config*, so a future incompatible change to `FeatureConfig` or the worker's
  message protocol can invalidate old persisted models without a Dexie migration.
