import type { FeatureConfig } from './model-config';

/** Lowercases and splits on runs of non-letter/non-digit characters (Unicode-aware, no per-locale stopword list). */
export const tokenize = (text: string): string[] =>
  text
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);

/** Every substring of each length in [min, max] of the lowercased text. */
export const charNgrams = (text: string, min: number, max: number): string[] => {
  const lower = text.toLowerCase();
  const grams: string[] = [];

  for (let n = min; n <= max; n++) {
    for (let i = 0; i + n <= lower.length; i++) {
      grams.push(lower.slice(i, i + n));
    }
  }

  return grams;
};

/** FNV-1a 32-bit hash — pure, deterministic, no `crypto` dependency. */
export const hashToken = (token: string): number => {
  let hash = 0x811c9dc5;

  for (let i = 0; i < token.length; i++) {
    hash ^= token.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }

  return hash >>> 0;
};

/**
 * Hashes word tokens (from `rawDescription` + `counterpartyName`) and char n-grams (from
 * `counterpartyName`, for typo/id robustness) into `config.dim - 1` buckets, counting occurrences
 * per bucket. The reserved last slot carries the amount's sign so it can never collide with a
 * hashed bucket. No normalizer, no stopword list — every language/format goes through the same
 * pipeline and the model (ML-05) learns which hashed features are noise.
 */
export const extractFeatures = (
  input: { rawDescription: string; counterpartyName?: string; amount: number },
  config: FeatureConfig,
): Float32Array => {
  const vec = new Float32Array(config.dim);
  const bucketCount = config.dim - 1;

  const addToBucket = (token: string): void => {
    vec[hashToken(token) % bucketCount] += 1;
  };

  for (const token of tokenize(input.rawDescription)) addToBucket(token);

  if (input.counterpartyName) {
    for (const token of tokenize(input.counterpartyName)) addToBucket(token);
    for (const gram of charNgrams(
      input.counterpartyName,
      config.charNgramMin,
      config.charNgramMax,
    )) {
      addToBucket(gram);
    }
  }

  vec[config.dim - 1] = Math.sign(input.amount);

  return vec;
};
