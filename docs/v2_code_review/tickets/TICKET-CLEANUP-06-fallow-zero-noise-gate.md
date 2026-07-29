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

- [ ] `fallow` clean-tree run reports 0 findings (after DAT-04 + CLEANUP-05 land) — **2 of 6 survive, and cannot be suppressed**: the report went 6 → 2. Four are genuinely resolved (`DATA_MANAGEMENT_ROUTES` by DAT-04, both bento components by CLEANUP-05, and the `scripts/update-dependency-graphs.mjs` unused-file by the file-level suppression the ticket specified — that one works). The two `unused-component-input` findings on `parseError`/`headerMismatchMessage` remain because **fallow 3.5.1 does not honour suppressions for that issue family**: given `// fallow-ignore-next-line unused-component-input` — copied verbatim from fallow's own suggested `actions[].comment` — it parses the comment, reports it as a *stale suppression*, **and** still emits the finding. `fallow-ignore-file` behaves identically (tested both). The remaining levers were turning the whole `unused-component-inputs` rule off (loses a real check repo-wide) or the identity baseline; the baseline was chosen, so the two are recorded as known and the gate below still fails on any new one. Raw count is therefore 2, not 0; **gated count is 0**.
- [x] Prose false-positive comments replaced by their suppressions; no "known false positive" comment survives without one. (The script's prose comment now carries `// fallow-ignore-file unused-file -- invoked by .husky/pre-commit`, and that finding is gone. The map-step comment is rewritten to state exactly what the previous one only implied — which template lines read the inputs, that the suppression is inoperative in this fallow version, and that `.fallow-baseline.json` is what actually carries them. It is no longer a prose warning the tool can't act on; it is a pointer to the thing that does act.)
- [x] Pre-commit fails on an intentionally introduced new finding (prove with a scratch commit, then discard) and passes on a clean tree. (Scratch-proved: adding an unused `scratchUnusedHelper` export to `shared/utils` made `fallow dead-code --baseline .fallow-baseline.json --fail-on-issues` **exit 1** with `new findings: 1`; removing it returned exit 0. Clean tree passes both gate commands.)
- [x] Template threshold fires on a template pushed past the calibrated limit (scratch-prove) and passes all current survivors. (Calibrated by measuring every unit first: the worst template today is `category-breakdown-panel.component.html` at cognitive **26**, then `import-wizard.component.html` at 25 — both far below the 48/45 the review recorded, because STAT-23 and IMP-11/12 already cut them. Threshold set at cognitive 30 / cyclomatic 30, which reports **0 findings** on the current tree. Scratch-proved by padding that same template with six nested `@if` blocks: cognitive went 26 → **44**, the gate reported it and **exited 1**; the file was restored from git and the gate returned to 0/exit 0.)
- [x] Baseline re-saved and committed; `.fallowrc.json` carries the house rule + evidence links. (Baseline saved to **`.fallow-baseline.json` at the repo root, not `.fallow/`** — fallow's own `.fallow/.gitignore` is a bare `*`, so a baseline written there could never be committed, which the ticket requires. `.fallowrc.json`'s header now carries the house rule — a false-positive comment must be accompanied by the suppression it predicts, and where a suppression provably doesn't work the comment must say so and name what handles it instead — plus the live instance and a pointer to the gate.)
- [x] `ng lint`, `ng test`, `ng build --configuration development` pass. (Lint clean, dev build clean, 1515/1516 tests pass — the one failure is the pre-existing TF.js training-timeout flake in `category-model.worker.spec.ts`.)
- [x] Verified via the fallow skill and coding-conventions skill. (This ticket *is* the fallow verification. Gated state: 0 new dead-code findings, 0 complexity findings, both gate commands exit 0 on a clean tree.)

## Notes

- Needs TICKET-DAT-04 and TICKET-CLEANUP-05; sensibly last in the backlog. Re-save the baseline after any of the big refactor tickets (IMP-11, TXN-09) land if they shift scores.
- Option C (scheduled adjudication) documented as the fallback if the gate's friction proves real — revert to advisory rather than letting suppressed noise accumulate. The hook comment says so at the point where someone frustrated by it will be reading.

## Follow-up

**The "0 findings" criterion is left open on purpose.** Two `unused-component-input` false positives survive because fallow 3.5.1 ignores suppressions for that family — a tool bug, not a codebase problem, and not something to work around by deleting inputs the template genuinely reads or by disabling the rule repo-wide. Worth re-testing on the next fallow upgrade: if `// fallow-ignore-next-line unused-component-input` starts working, add it above both inputs, drop them from `.fallow-baseline.json`, trim the comment in `import-map-step.component.ts` back to a one-liner, and the raw clean-tree count reaches 0. Until then the gate delivers what the user story actually asked for — a nonzero *gated* report means something — while the raw count does not.

**One real finding was fixed rather than suppressed while adjudicating:** `PercentVariant` was re-exported from `shared/utils/index.ts` and imported by nobody. It surfaced during TICKET-SET-07 (which touched that barrel) and was flagged `introduced: false`, i.e. pre-existing. Removed from the barrel; the type is still exported from `number-format.ts`, where its own function signature uses it.
