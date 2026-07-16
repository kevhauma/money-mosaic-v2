# TICKET-UI-06 — Label & Fieldset primitives

- **Area:** Design System
- **Type:** Feature
- **Traceability:** FR-UI-6

## User story

As a developer, I want a clear, shared Label component and Fieldset component with a documented distinction between them, so forms stop guessing which one to reach for and don't hand-author either pattern per call site.

## Description

Prepare.md flags both `label` and `fieldset`/`fieldset-legend` as extraction candidates, and explicitly notes the ambiguity: *"what's different between fieldset-legend and 'label'?"* This ticket resolves that ambiguity as part of the extraction rather than shipping two overlapping primitives with no usage guidance.

## Current situation (as-is)

- No `mm-label` or `mm-fieldset` component exists in `shared/ui/`; daisyUI's `label`/`fieldset`/`fieldset-legend` classes are applied directly wherever forms need them.
- `input.component.ts`/`select.component.ts` already implement `ControlValueAccessor` for individual controls but don't own the label markup around them.

## Desired result (to-be)

- **`mm-label`** (selector `mm-label`) wraps a single field's caption — used for one `mm-input`/`mm-select`/etc., analogous to a native `<label for="...">`. Takes a `text`/`for` (or content projection) input.
- **`mm-fieldset`** (selector `mm-fieldset`) wraps a *group* of related fields with a `legend` input rendering `fieldset-legend` — used when multiple controls are logically grouped (e.g. an address block, a date-range pair), never for a single field.
- The distinction is documented directly in this ticket and in a short doc-comment on each component: **label = one field's caption; fieldset = a named group of fields.** This resolves prepare.md's open question so future usage doesn't re-litigate it per call site.
- Existing forms identified by [TICKET-UI-01](./TICKET-UI-01-styling-audit.md)'s audit migrate to the correct one of the two based on whether they're captioning a single control or grouping several.

## Acceptance criteria

- [ ] `mm-label` component wrapping a single field's caption
- [ ] `mm-fieldset` component wrapping a grouped set of fields with a `legend`
- [ ] Usage guidance (label vs. fieldset) documented on both components
- [ ] Existing forms migrated to use the correct primitive per the guidance above
- [ ] Verified via the fallow and coding-conventions skills

## Notes

While auditing forms for this ticket, also check whether `input.component.ts`'s `type="color"` variant needs the `rounded-field` class prepare.md flagged — if it's a single, narrow usage, fix it inline here rather than opening a separate ticket.
