# TICKET-ML-02 — Feature hashing / vectorisation

- **Area:** Auto-categorisation
- **Type:** Feature
- **Traceability:** adds FR-ML-2 (new)

## User story

As a user whose bank exports transactions in whatever language and format their bank uses, I want the
categoriser to turn a transaction's raw text into something a model can learn from without anyone having to
hand-write a normalizer or stopword list for my bank, so the feature works the same regardless of locale or
export format.

## Description

A pure, deterministic function that converts a transaction's raw text fields (description, counterparty
name) and amount into a fixed-size numeric vector via feature hashing (tokenize + hash) and character
n-grams — no normalizer, no stopword list, no per-bank tuning. The model (ML-05) learns which hashed
features are noise; this ticket only produces the vector.

## Current situation (as-is)

- [rule-matching.ts](../../../src/app/core/categorisation/rule-matching.ts) reads
  `transaction.rawDescription`, `counterpartyName`, `counterpartyIban`, and `amount` directly (string
  `contains`/`equals`/`regex` matching) — there is no numeric/vectorised representation of a transaction
  anywhere in the codebase today.
- No hashing or tokenization utility exists in `core/`.

## Desired result (to-be)

- New `core/ml/feature-hashing.ts`:
  ```ts
  export function tokenize(text: string): string[]; // lowercase, split on non-alphanumeric
  export function charNgrams(text: string, min: number, max: number): string[]; // lowercase char n-grams, min..max length
  export function hashToken(token: string): number; // FNV-1a 32-bit hash
  export function extractFeatures(
    input: { rawDescription: string; counterpartyName?: string; amount: number },
    config: FeatureConfig,
  ): Float32Array; // length === config.dim
  ```
- `extractFeatures` hashes word tokens (from `rawDescription` + `counterpartyName`) and char n-grams
  (`charNgramMin`..`charNgramMax`, from `counterpartyName`, for typo/id robustness) into buckets
  `hashToken(token) % (config.dim - 1)`, incrementing each bucket's count; the amount's sign
  (`Math.sign(amount)`) is written into the reserved last slot, `vec[config.dim - 1]`, so word/n-gram
  hashing never collides into it.
- No stopword list, no locale-specific normalization of any kind — every transaction, in any language,
  goes through the same tokenize → hash → bucket pipeline.

## Acceptance criteria

- [x] `extractFeatures` always returns a `Float32Array` of exactly `config.dim` length, for any input text (including empty strings).
- [x] `vec[config.dim - 1]` always equals `Math.sign(amount)` (`-1`, `0`, or `1`) and is never touched by token/n-gram hashing.
- [x] `extractFeatures` is deterministic: identical input + config always produces an identical vector (needed later so the worker's PREDICT results are reproducible and testable).
- [x] `tokenize` lowercases and splits on non-alphanumeric boundaries; `charNgrams` produces every substring of each length in `[min, max]`.
- [x] `hashToken` is a pure function with no external dependency (no `crypto`, no tfjs) — same string always hashes to the same number.
- [x] No import of `@tensorflow/*` anywhere in this file.
- [x] Unit tests (`feature-hashing.spec.ts`) cover: determinism (same input twice), the fixed `dim` length regardless of input length, the amount-sign slot for positive/negative/zero amounts, n-gram generation at the configured min/max, and that two transactions with completely different text hash to different vectors (basic collision sanity, not a formal proof).
- [x] No TestBed — pure functions, co-located `feature-hashing.spec.ts`.
- [x] Verified via the fallow skill and coding-conventions skill.

## Notes

- This is the file that replaces the rejected "hand-coded merchant normalizer" design (see
  [auto-categorise.md](../auto-categorise.md)'s Context section) — the deliberate trade-off is that the
  model, not this function, learns which tokens matter.
- Runs both inside the worker (ML-05, at train/predict time) and will be reused by ML-03's mining logic only
  indirectly (mining groups by raw `counterpartyName` text, not by hashed features) — this ticket has no
  dependency on ML-03.
