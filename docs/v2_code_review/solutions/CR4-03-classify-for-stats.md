# CR4-3 — `classifyForStats` special-case accumulation: options

Finding: [CR4-3](../code-review.md#cr4-3--classifyforstats-is-a-single-choke-point-accumulating-special-cases). One 54-line function (cyclomatic 26) encodes the exclusion ordering, three attribution-override modes, two joint-account special cases, and signed category-kind netting — with the ordering constraints living only in a 22-line comment.

**Boundary condition for every option:** centralising this classifier was CR3's deliberate main event (STAT-19). Any "fix" that re-fragments classification back into per-aggregation copies is a regression, not an option. Also a hard perf note: this runs per transaction per aggregation on every store change feeding the dashboard — options must stay allocation-light on the hot path (no closure/array churn per call).

## Option A — Make the exclusion ordering data, not prose

The first five checks (range → nullified → zero → savings → transfer-linked) are a fixed, ordered guard chain whose *order* is the documented invariant. Express it as a module-level ordered list of named predicate steps (plain functions in a `const EXCLUSION_STEPS = [...]` array) that the function walks.

- The invariant "nullified runs before savings" stops being a comment and becomes an assertable fact: a spec can literally check `EXCLUSION_STEPS.map(s => s.name)` equals the canonical order, and TICKET-STAT-18-class bugs (a check inserted on the wrong side) become impossible to do silently.
- Cost: a layer of indirection on a hot path — kept cheap if the steps are top-level named functions (no per-call allocation) and the walk is a plain `for`. Cyclomatic score barely moves; *auditability* is what improves.

## Option B — Name the joint-path strategies

Inside the joint/override branch, the three interleaved cases — `personal` override netting, the untagged-refund-on-joint deduction, and the raw-weight bucketing — become three small named functions (`classifyPersonalOverride`, `classifyUntaggedJointRefund`, `classifyByWeight`), with `classifyForStats` reduced to routing. `resolveContribution`'s partially-empty context (`emptyJointLegContext` spread) gets revisited in the same pass — either the signature narrows to what this caller has, or the fuller context gets threaded from callers that own the maps.

- Wins: each special case gains a name, a doc comment of its own, and a focused spec section; the 22-line mega-comment shrinks to per-function paragraphs. Branch *interleaving* — the actual review concern — drops even though total branch count doesn't.
- Cost: three more exported-or-file-local symbols in `core/stats`; the ordering between the personal-override check and the untagged-refund check still matters and moves up into the router — Option A's "order as data" idea applies to this level too if wanted.

## Option C — Pin behavior with a decision-table spec, change nothing

Leave the function as-is and convert/extend its spec into an exhaustive table: rows of `(override mode | none) × (account joint/own) × (category kind) × (amount sign) × (nullified/transfer/savings flags)` → expected `StatsClassification`. Vitest's `it.each` fits; the existing spec already covers the landmark cases, this makes coverage *systematic*.

- Rationale for "nothing but tests" as a real option: the function is honest about its complexity, every branch is currently correct as far as three reviews can tell, and the risk named in the finding is *future* edits. A complete decision table converts future edits from "reason about interactions" to "one table row changes."
- Cost: the table is large (the point); keeping it readable needs helper builders for transactions. Does not help a human *read* the function — the comment stays load-bearing.

## Option D — Type-level encoding of the phase split

A lighter structural idea: split the function into two visibly-phased internals — `exclude(txn, …): 'skip' | 'savings-amount' | 'proceed'` and `bucket(txn, …): income/expense classification` — so the two halves of the comment (exclusion order vs. bucketing rules) each own a function. Less granular than A+B, more structural than C.

## Recommendation shape (not a decision)

These compose rather than compete: **C is cheap insurance under any of the others** and is the only option that pays off even if nothing else changes. A and B target different halves of the function (guard chain vs. joint routing) and can land independently. The combination "C now; B when the next joint-account feature forces this file open anyway" matches the project's pattern of refactoring hot files while they're already hot — this classifier is *not* currently on a churn hotspot list, so opening it cold purely to restructure is the least attractive path.
