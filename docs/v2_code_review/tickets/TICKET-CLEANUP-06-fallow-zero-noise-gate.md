# TICKET-CLEANUP-06 — Drive the Fallow clean-tree report to zero and gate on new findings

- **Area:** Tooling / codebase intelligence
- **Type:** Refactor
- **Traceability:** CR4-14 Options A+B2, CR4-1 Option G1 ([solution doc](../solutions/CR4-14-fallow-noise.md), [template doc](../solutions/CR4-01-template-complexity.md))

## User story

As a developer running Fallow (locally or in the pre-commit hook), I want a clean tree to report exactly zero findings and new findings to fail the gate, so any nonzero report means something — instead of real findings hiding among known-false ones.

## Description

Finish what CLEANUP-02 prepared for: adjudicate the six current clean-tree findings (three resolve via TICKET-DAT-04/CLEANUP-05; three are known-false and get tool-visible suppressions), then enforce `fallow audit` on new findings only in pre-commit — including template-complexity thresholds so the CR4-1 drift can't silently regress.

## Current situation (as-is)

- A clean-tree run reports 6 findings: 3 real (dead `DATA_MANAGEMENT_ROUTES` export; two bento components) and 3 known-false:
  - [scripts/update-dependency-graphs.mjs](../../../scripts/update-dependency-graphs.mjs) — invoked by `.husky/pre-commit`, invisible to import analysis (the in-file comment says so, but the tool can't read prose);
  - `parseError`/`headerMismatchMessage` inputs on the wizard's map-step — read via `@else if (…; as alias)` in the template; the component carries a prose comment *predicting* the false positive instead of a suppression.
- The gate is advisory; nothing fails on new findings; templates are unscored by any threshold.

## Desired result (to-be)

- **Zero findings on a clean tree:** real ones resolved by TICKET-DAT-04 + TICKET-CLEANUP-05; the script gets `// fallow-ignore-file unused-file -- invoked by .husky/pre-commit` (or a `scripts/**` ignorePattern — pick one, record why); the two inputs get `// fallow-ignore-next-line unused-component-input -- read via @else if (…; as alias) in the template`, replacing the prose comments (staleness-tracked: fallow flags suppressions that stop matching).
- **House rule** recorded in `.fallowrc.json`'s header comment: an in-code "this is a false positive" comment must be accompanied by the suppression it predicts.
- **Gate:** `fallow audit --base <ref>` (or the identity baseline) wired into pre-commit alongside the existing hooks, failing on *new* findings only; template cognitive-complexity threshold included, calibrated **above ~25** (accounts-detail is the evidence file) so page orchestrators pass and wizard/comparison-panel shapes don't.

## Acceptance criteria

- [ ] `fallow` clean-tree run reports 0 findings (after DAT-04 + CLEANUP-05 land).
- [ ] Prose false-positive comments replaced by their suppressions; no "known false positive" comment survives without one.
- [ ] Pre-commit fails on an intentionally introduced new finding (prove with a scratch commit, then discard) and passes on a clean tree.
- [ ] Template threshold fires on a template pushed past the calibrated limit (scratch-prove) and passes all current survivors.
- [ ] Baseline re-saved and committed; `.fallowrc.json` carries the house rule + evidence links.
- [ ] `ng lint`, `ng test`, `ng build --configuration development` pass.
- [ ] Verified via the fallow skill and coding-conventions skill.

## Notes

- Needs TICKET-DAT-04 and TICKET-CLEANUP-05; sensibly last in the backlog. Re-save the baseline after any of the big refactor tickets (IMP-11, TXN-09) land if they shift scores.
- Option C (scheduled adjudication) documented as the fallback if the gate's friction proves real — revert to advisory rather than letting suppressed noise accumulate.
