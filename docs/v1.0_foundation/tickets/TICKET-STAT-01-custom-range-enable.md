# TICKET-STAT-01 — Enable custom range when "Custom" preset is selected (bug)

> **Superseded by [TICKET-STAT-03](./TICKET-STAT-03-expanded-range-presets-default-grouping.md).** That ticket folds this exact bug fix into a broader preset/default-grouping overhaul. Implement STAT-03 instead of this ticket in isolation; kept here for traceability.

- **Area:** Statistics & Dashboard
- **Type:** Bug fix
- **Traceability:** FR-STAT-7

## User story

As a user, I want selecting 'Custom' in the topbar date-range dropdown to actually enable the from/to date pickers, so I can pick a custom range instead of the inputs staying disabled.

## Description

Selecting "Custom" in the date-range dropdown must enable the from/to date inputs so a custom range can actually be chosen. Today it no-ops and the inputs stay disabled.

## Current situation (as-is)

- [range-grouping-switcher.component.ts](../../../src/app/shared/ui/range-grouping-switcher/range-grouping-switcher.component.ts) `onPresetChange()` **returns early** on `'custom'`: `if (raw === 'custom') return;` — it only emits `presetChange` for the non-custom presets (`presetChange` is typed `Exclude<RangeGroupingPreset, 'custom'>`).
- In the template ([range-grouping-switcher.component.html](../../../src/app/shared/ui/range-grouping-switcher/range-grouping-switcher.component.html)) the from/to `<input type="date">` are `[disabled]="value().preset !== 'custom'"`.
- Because choosing "Custom" never propagates a preset change to the owner, `value().preset` never becomes `'custom'`, so the inputs stay **permanently disabled** — a custom range can never be selected.

## Desired result (to-be)

- Selecting "Custom" sets the owning state's preset to `'custom'`, releasing the `[disabled]` binding so the from/to pickers become editable.
- Editing from/to then emits `customRangeChange` and drives the stats range (existing `onFromChange`/`onToChange` already emit; they're just never reachable).

## Acceptance criteria

- [ ] Selecting "Custom" causes the owner's `value().preset` to become `'custom'` (either by widening `presetChange` to include `'custom'`, or adding a dedicated output/event for it — pick the minimal clean fix).
- [ ] Once "Custom" is selected, both the from and to `<input type="date">` are enabled and editable.
- [ ] Changing from/to emits `customRangeChange` and the dashboard/stats recompute for the chosen range (FR-STAT-7), consistent with the other presets.
- [ ] Switching back to a non-custom preset re-disables the inputs and applies that preset's computed range, as today.
- [ ] The owner ([app.ts](../../../src/app/app.ts) / [range-state.store.ts](../../../src/app/core/stats/range-state.store.ts)) handles the `'custom'` preset without regressing the existing preset wiring.
- [ ] Unit tests cover: selecting "Custom" enables the inputs and propagates preset `'custom'`; editing from/to emits `customRangeChange`; switching away re-disables and re-applies a preset range. Update [range-grouping-switcher.component.spec.ts](../../../src/app/shared/ui/range-grouping-switcher/range-grouping-switcher.component.spec.ts).
- [ ] Verified live in the browser: pick Custom → inputs enable → choose a range → dashboard updates.

## Notes

- Root cause is the early `return` for `'custom'` plus the output type excluding `'custom'`. Prefer widening the contract so "custom" is a first-class preset change over hacking the template.
