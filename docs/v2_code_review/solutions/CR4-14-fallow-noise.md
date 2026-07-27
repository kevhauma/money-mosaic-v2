# CR4-14 — Fallow gate noise: options

Finding: [CR4-14](../code-review.md#cr4-14--the-fallow-gate-is-accumulating-un-adjudicated-noise-again). A clean-tree run reports 6 findings: 3 known-false (the husky-invoked graph script; the two `@else if (…; as alias)` template-read inputs), 3 real (dead routes export, two bento components). The false ones erode trust in the gate; the real ones hid among them.

The end-state worth aiming at, because it's the only *enforceable* one: **a clean tree reports zero findings**, so any nonzero report means something. Every option below serves that.

## Option A — Adjudicate the current six (the floor)

- **Real findings:** resolved by [CR4-8](./CR4-08-data-management-route-remnants.md) (routes file) and [CR4-9](./CR4-09-bento-grid.md) (bento) — those docs own the how.
- **`scripts/update-dependency-graphs.mjs`:** invoked by `.husky/pre-commit`, invisible to import analysis. Either an `ignorePatterns` entry for `scripts/**` (broad but honest — everything there is hook/tooling-invoked) or a file-level `// fallow-ignore-file unused-file -- invoked by .husky/pre-commit` suppression (narrow, self-documenting at the site). The in-file comment already says "Run by .husky/pre-commit" — the suppression just makes the tool read it too.
- **`parseError`/`headerMismatchMessage` inputs:** the component carries a prose comment *predicting* the false positive. Replace prose with the mechanism: `// fallow-ignore-next-line unused-component-input -- read via @else if (…; as alias) in the template` on each. Same knowledge, tool-visible, and staleness-tracked (Fallow flags suppressions that stop matching — so if the template read ever disappears, the suppression itself gets reported).
- House rule worth writing while here (one line, `.fallowrc.json` header comment already sets the tone): *"an in-code 'this is a false positive' comment must be accompanied by the suppression it predicts."*

## Option B — Re-baseline and gate on new-only

With A landed and the tree at zero, the gating question becomes cheap. Two grades:

- **B1 — keep `fallow:audit` advisory** (current state) but with a zero-noise report, reviewers actually read it. No CI change.
- **B2 — enforce:** wire `fallow audit --base <ref>` (or the identity-based `--baseline` snapshot) into pre-commit alongside the existing hooks, failing on *new* findings only. CR3's CLEANUP-02 explicitly did the config groundwork "before any fallow CI gate" — this is the gate it was preparing for. The zero-clean-tree state from Option A is what makes false-failure risk acceptable.
- If B2: include template complexity thresholds or not per [CR4-1's G1 option](./CR4-01-template-complexity.md) — decide the threshold there, carry it here.

## Option C — Scheduled adjudication instead of continuous

If gating feels heavy for a solo-cadence project: a standing rule that the Fallow report gets adjudicated (suppress-with-reason or fix) at every version close, rather than per commit. Cheaper, and matches how CR3 actually operated — but this finding exists *because* the between-reviews interval let six findings pile up, so C is documented as the known-weaker fallback, chosen consciously if at all.

## Recommendation shape

A is table stakes and mostly falls out of CR4-8/9 plus two suppression comments and one config line. B2 is the durable fix and was already the declared trajectory (CLEANUP-02); its only precondition is A. C only if B2's friction proves real in practice — revert to advisory rather than letting suppressed-noise accumulate again.
