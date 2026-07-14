# TICKET-SOLID-06 — Extract the attribution-override fieldset from `transaction-edit-form`

- **Area:** Transactions (edit form component composition)
- **Type:** Refactor
- **Traceability:** CR3-2.2; the attribution UI shipped with TICKET-TXN-03
- **Fallow evidence (2026-07-14):** worst component rollup in the app — cyclomatic 30 (template 16 + `resetForm` 14); the template alone is a critical finding (cognitive 23, 127 lines)

## User story

As a developer, I want the attribution-override sub-feature (mode select, joint-account picker, reimbursement picker, validation) in its own child component, so the edit form reads as a small form again and the attribution logic is testable in isolation.

## Description

The edit form class is in decent shape — the weight is the TICKET-TXN-03 attribution-override sub-feature living inline: three visibility computeds, two `toSignal` bridges, `effectiveJointAccountId`, `reimbursementCandidateTransfers`, `buildAttributionOverride`, and the corresponding template block. Extracting it roughly halves both the class and the template.

## Current situation (as-is)

- [transaction-edit-form.component.ts:110-227](../../../src/app/feature-transactions/components/transaction-edit-form/transaction-edit-form.component.ts) — the attribution cluster (`jointAccounts`, `showAttribution`, `selectedAttributionMode`, `showJointAccountPicker`, `showReimbursementPicker`, `effectiveJointAccountId`, `reimbursementCandidateTransfers`, `buildAttributionOverride`).
- [transaction-edit-form.component.ts:163-175](../../../src/app/feature-transactions/components/transaction-edit-form/transaction-edit-form.component.ts) — `transferAmount`/`transferDate` run `.find()` over the whole transactions array per template call, per candidate row; the component already builds a `transactionsById` map twice elsewhere (lines 151, 220).
- The corresponding block of [transaction-edit-form.component.html](../../../src/app/feature-transactions/components/transaction-edit-form/transaction-edit-form.component.html) (cyclomatic 16 as a whole).

## Desired result (to-be)

- An `app-attribution-override-fieldset` child component (feature-transactions/components) that takes the transaction (and form group or emits a value) and returns/validates `Transaction['attributionOverride']`; the parent keeps only submit orchestration and the `attributionError` surfacing.
- One shared `transactionsById` computed inside the child; `transferAmount`/`transferDate` become O(1) lookups.
- Both the parent class and its template drop below fallow's critical thresholds.

## Acceptance criteria

- [ ] Edit-form behaviour is unchanged: category/notes/nullified editing, attribution set/clear for `personal`/`shared`/`notMine`, joint-account auto-pick when only one exists, reimbursement candidate list, validation errors shown inline — all verified live in the browser.
- [ ] `transferAmount`/`transferDate` no longer call `.find()` over the full transactions array (map lookup instead).
- [ ] Existing `transaction-edit-form.component.spec.ts` cases pass (updated for the new component boundary where selectors moved); the fieldset gains its own spec covering mode switching, sole-joint-account defaulting, and a validation failure surfacing.
- [ ] Fallow re-run: `transaction-edit-form.component` leaves the critical component-rollup findings.
- [ ] Verified via the fallow skill and coding-conventions skill.

## Notes

- Same medicine applies to `rule-form` (27/26) and `import-map-step` (24/37) later — out of scope here; keep this ticket to one component so the pattern is reviewable.
- Categories are involved only as pass-through values — no rule evaluation is touched, so `categoryManual` semantics can't regress; still, keep the "manual category" spec case green.
