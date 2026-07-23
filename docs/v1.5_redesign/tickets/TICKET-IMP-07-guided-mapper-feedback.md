# TICKET-IMP-07 — Guided, field-by-field feedback in the import mapper

- **Area:** Import (mapping wizard)
- **Type:** Feature
- **Traceability:** FR-IMP-3 (refines the mapping-wizard requirement — the fields it lists exist, but the wizard gives no feedback while mapping them)

## User story

As a user importing a bank CSV for the first time, I want the mapper to walk me through each field one at a time — showing what value it will actually pull in, flagging problems immediately, and explaining why I can't continue — so I don't have to guess which column goes where or why the Confirm button is stuck.

## Description

The mapper currently renders all nine column fields at once with no feedback beyond a static placeholder ("— select column —" vs "— none —"). This ticket replaces that flat form with a guided, sequential flow through the column-mapping fields, adds live per-field sample values, inline validation messages, duplicate-column detection, and a clear explanation whenever the primary action is disabled.

## Current situation (as-is)

- [import-map-step.component.html:74-96](../../../src/app/feature-import/components/import-map-step/import-map-step.component.html) — all nine column fields (`date`, `amount`, `debit`, `credit`, `description`, `counterpartyName`, `counterpartyIban`, `ownIban`, `balance`) render simultaneously in one `@for` loop, each an `mm-select` with no per-field error state.
- [import-map-step.component.ts:83-101](../../../src/app/feature-import/components/import-map-step/import-map-step.component.ts) — `Validators.required` is set on `date` and `description`, but nothing in the template reads `form.controls.date.invalid` or renders an error; an unmapped required field just looks like an empty dropdown.
- [import-map-step.component.ts:181-185](../../../src/app/feature-import/components/import-map-step/import-map-step.component.ts) — `updateResult()` sets `result` to `null` whenever `form.invalid`, with no signal exposing *which* control is invalid.
- [import-wizard.component.html:32-40](../../../src/app/feature-import/components/import-wizard/import-wizard.component.html) — the Confirm/Next button is disabled whenever `!mapResult()`, `parseError()`, or `headerMismatchMessage()` — again with no visible reason when it's the mapping that's incomplete.
- Nothing in the mapper cross-checks that two target fields aren't mapped to the same source column (e.g. `date` and `balance` both set to the same header).
- No mechanism shows what a mapping will actually produce — the user only sees the *raw* file preview table ([import-map-step.component.html:106-121](../../../src/app/feature-import/components/import-map-step/import-map-step.component.html)), not a per-field resolved sample value next to the dropdown that's mapping it.

## Desired result (to-be)

- The column-mapping section becomes a guided, sequential flow: one field is "active" at a time (starting with `date`), in a fixed order (`date` → `description` → `amount`/`debit`/`credit` → `counterpartyName` → `counterpartyIban` → `ownIban` → `balance`). Completed fields collapse into a compact summary row (label + chosen column + resolved sample value) that stays visible and clickable — clicking one re-opens it for editing without losing progress on later fields.
- The active field's `mm-select` shows, live, the actual value from `previewRows()`'s first data row for whichever column is currently selected (e.g. selecting "Datum" for Date shows "→ 14/07/2026"), updating as the user changes the selection.
- Required fields (`date`, `description`) carry a visible required marker, and an inline error message appears under the field the moment it's touched-and-empty or otherwise invalid, using Angular's existing `Validators.required` state — no new validation logic, just surfacing what already exists.
- If two target fields resolve to the same source column, both show an inline warning ("Also mapped to <other field>") — this is advisory, not blocking, since some banks legitimately reuse a column (e.g. no separate balance column).
- When the wizard's Confirm/Next button is disabled because of the mapping step specifically, a banner (or tooltip on the button) names the exact blocking field(s) (e.g. "Map a column for: Date").
- The non-column settings (delimiter, decimal separator, date format, encoding, header rows, sign convention, mapping name, remember-for-account) are unaffected by the guided flow — they stay as the existing flat fieldset group above the column section.
- Users can still see/reach every column field without forcibly stepping through one-by-one for re-edits — the collapsed summary rows make already-mapped fields directly clickable, so this is progressive disclosure for first-time mapping, not a hard linear gate.

## Acceptance criteria

- [x] Column fields render as a sequential guided flow (one active field + collapsed summary rows for completed fields), replacing the flat simultaneous `@for` list, while the non-column settings fieldset group is unchanged.
- [x] The active field shows a live resolved sample value from the first row of `previewRows()` for the currently-selected source column, updating on selection change.
- [x] `date` and `description` show a required marker and an inline error message when empty/invalid, driven by the form's existing `Validators.required` state (no new validators introduced).
- [x] Two target fields mapped to the same source column both display a non-blocking inline "also mapped to X" warning.
- [x] When `import-wizard.component.ts`'s Confirm/Next button is disabled due to `!mapResult()` from an invalid mapping form, a visible message names the specific unmapped/invalid required field(s) — exposed via a new signal/getter on `ImportMapStepComponent` (e.g. `invalidFieldLabels()`) that the wizard or the mapper itself renders.
- [x] Clicking a collapsed/completed field's summary row re-opens it for editing in place without discarding the mapping already chosen for other fields.
- [x] No Dexie schema or repository changes — this is presentation/interaction only within `import-map-step.component.ts`/`.html`.
- [x] Unit tests cover: guided flow advances to the next field once the current one is valid; sample value updates when the active field's selection changes; required-field error message appears/disappears with control state; duplicate-column warning appears for two fields sharing a source column and clears when resolved; collapsed field re-opens for edit and preserves other fields' values; `invalidFieldLabels()` (or equivalent) lists exactly the unmapped required fields.
- [x] Verified via the fallow skill and coding-conventions skill, plus a live browser check (ask the user first per this repo's verification rule; continue without it if declined).

## Notes

- This is a QoL/interaction ticket, not part of the v1.5 styling rework — filed under `docs/v1.5_redesign` at the user's explicit request as a separate "QoL addendum" section, mirroring how a similar QoL batch was previously appended to `docs/v1.1_joint_accounts` rather than mixed into that version's original ticket set. It does not depend on and is not blocked by any `TICKET-UI-*` ticket in this folder.
- Scope is deliberately narrower than a full wizard redesign: no changes to Step 1 (select/account assignment) or Step 3 (summary), no new Mapping Profile fields, no change to auto-detection logic (`detectAndPrefill`) beyond it still pre-filling the guided flow's fields.
- Superseded/duplicates the general `topic-import-flow` roadmap idea's mapper-guidance angle for the specific scope covered here — that roadmap entry is left in place for the other unrelated import-flow ideas it also bundles (multi-account CSV, auto-create account), so don't remove it as part of this ticket.
- Existing precedent for field-level guidance in this codebase: `TICKET-IMP-03`'s header-mismatch messaging operates at the file level; this ticket is the field-level counterpart.
