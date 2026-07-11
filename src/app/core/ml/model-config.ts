export type FeatureConfig = {
  dim: number;
  charNgramMin: number;
  charNgramMax: number;
};

export const DEFAULT_FEATURE_CONFIG: FeatureConfig = {
  dim: 8192,
  charNgramMin: 3,
  charNgramMax: 4,
};

/** Versions the persisted artifact shape/feature config (ML-04) — distinct from the Dexie table's own schema version, so an incompatible `FeatureConfig`/worker-protocol change can invalidate old models without a migration. */
export const MODEL_SCHEMA_VERSION = 1;

/** Cold-start floor: fewer categorised transactions than this ⇒ 'not-enough-data'. */
export const MIN_TRAINING_LABELS = 25;

/** Fewer active categories than this ⇒ 'not-enough-data'. */
export const MIN_CATEGORIES = 2;

/** Minimum prediction-cluster size before a rule proposal is mined from it (ML-03). */
export const RULE_PROPOSAL_MIN_SUPPORT = 4;

/** Minimum mean prediction confidence across a cluster before it becomes a rule proposal (ML-03). */
export const RULE_PROPOSAL_MIN_CONFIDENCE = 0.85;

/**
 * Order-independent signature of the active category taxonomy, used to flip a trained model from
 * `ready` to `stale` (ML-07) when categories are added/removed/renamed after training.
 */
export const taxonomySignature = (activeCategories: { id: number; name: string }[]): string =>
  [...activeCategories]
    .sort((a, b) => a.id - b.id)
    .map((category) => `${category.id}:${category.name}`)
    .join('|');
