# CR4-10 — Store placement rule doesn't cover two real stores: options

Finding: [CR4-10](../code-review.md#cr4-10--the-store-placement-rule-has-a-documented-two-way-split-but-a-third-kind-exists). The written rule is binary (cross-feature entity stores → `core/state/`; single-feature stores → the feature folder), but `range-state.store.ts` lives in `core/stats/` and `AppSettingsStore` is a settings singleton, not an entity store.

Two stores are "misfiled" only relative to a rule that's too narrow — so the options are about which rule to write, and the code moves (if any) follow from it. Either resolution is cheap; ambiguity is the only expensive state.

## Option A — "All app-wide stores live in `core/state/`" (move one file)

Widen the rule to: *any* store consumed across features or app-wide (entity or not) lives in `core/state/`; only genuinely feature-private stores stay in feature folders. `AppSettingsStore` is then already correct; `range-state.store.ts` moves from `core/stats/` to `core/state/` (a `core → core` move — import updates across its consumers, no barrel-cycle risk since `core/state` already sits below features).

- Wins: one folder answers "where is shared state?"; the next cross-cutting store (privacy mode is coming via PRIV-01) has an unambiguous home.
- Cost: `range-state.store.ts` is genuinely stats-flavored (selected range/granularity feeding the aggregations) — moving it separates it from the `core/stats` functions it parameterizes. Mostly aesthetic; imports don't care.

## Option B — "Stores live with their domain" (move nothing)

Widen the rule the other way: `core/state/` is specifically for *entity* stores (the original barrel-cycle fix); other shared stores live in the `core/<domain>` that owns their concern — `range-state` with stats, and (under strict reading) `AppSettingsStore` would move to a `core/settings/` or stay grandfathered in `core/state/` as the entity-adjacent persistence case it is.

- Wins: zero-to-tiny diff; keeps domain cohesion (`core/stats` remains self-contained).
- Cost: "where do I put a new shared store?" now requires judging its domain — a judgment rule rather than a lookup rule, which is exactly what fails at 2 a.m. The `AppSettingsStore` edge (Dexie-backed like the entity stores, but not an entity) shows the seam immediately.

## Option C — Rule plus registry

Whichever rule wins, add the missing inventory line: the project-map skill's state section lists *every* store with its location and rationale (it currently omits `AppSettingsStore` entirely — part of CR4-11's staleness). A complete registry makes future placement drift self-evident regardless of which rule governs.

## Recommendation shape

This is a genuinely low-stakes fork — the review's point was the *gap*, not the placements. A is slightly favored by the project's history (the lookup-style rules — "components never touch `appDb`", "cross-feature via barrels" — are the ones that have held), and PRIV-01 will force the question soon anyway. C should happen under any outcome as part of the CR4-11 rewrite, which is also the natural place to write whichever sentence wins.
