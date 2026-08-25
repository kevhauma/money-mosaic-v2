# CR4-12 — Coding-conventions skill self-contradiction: options

Finding: [CR4-12](../code-review.md#cr4-12--the-coding-conventions-skill-contradicts-itself-about-persistence-and-hydration). Line 96 describes constructor-`effect()` persistence mirroring and bootstrap-time hydration; line 99 (and the actual code) describe `withPersistedCrud` explicit-await persistence and hydrate-on-first-injection (PERF-07). Two incompatible patterns presented as current.

## Option A — Correct the prose

Rewrite the state-management section so exactly one persistence/hydration story exists: explicit repository awaits (`withPersistedCrud` for plain CRUD, hand-rolled methods for divergent operations, per the NG-08 decision already documented at line 99) and idempotent `hydrate()` on first injection via `withHooks`/`onInit` (PERF-07). Delete the effect-mirroring and bootstrap-hydration sentences, or move them to a one-line "historical: replaced by …" note if the archaeology is considered valuable (it mostly isn't — git history carries it).

- The whole edit is a paragraph. The main care point is *scope*: while the file is open, also land the one-liners other findings want written down — CR4-1's template rule, CR4-7's export-placement rule, CR4-10's store-placement sentence — so the conventions doc gets one coherent pass instead of four dribbled edits.

## Option B — Point at exemplars instead of describing patterns

Prose drifts; code links drift less. For the volatile patterns (persistence, hydration, store features), replace description with designation: *"the canonical store shape is `core/state/accounts.store.ts` — copy it"*, keeping only the rules that aren't expressible as an example (never touch `appDb` directly; adoption of `withPersistedCrud` is per-method). A stale link is loudly broken; stale prose is quietly believed.

- Trade-off: exemplars underspecify *why* (the NG-08 rationale paragraph is genuinely useful and should survive). The workable blend: rule + rationale in prose, mechanics by exemplar link.

## Option C — Same process hook as CR4-11

Whatever the content fix, the recurrence guard is shared with the project-map skill: the `work-ticket` skill's doc-side-effect step covers "did this ticket change a pattern the conventions skill describes?" This is one checklist line, not a separate mechanism — see [CR4-11 Option B](./CR4-11-project-map-skill.md); implement once, cover both files.

## Recommendation shape

A is near-mandatory (a conventions doc teaching a retired pattern with known footguns is actively harmful, and the fix is minutes). B applied selectively — exemplar links for store mechanics, prose kept for rules and rationale. C rides along with CR4-11's process change. All of it belongs in one documentation session with CR4-11; they share the review motion and the reviewer.
