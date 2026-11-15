# TICKET-NG-12 — Settings text fields never drop typed characters

- **Area:** Shared utilities (shared/utils) — settings form binding
- **Released in:** _unreleased_
- **Type:** Bug fix
- **Traceability:** CR6-27 (text-field part); fixes `linkControlToSetting` from TICKET-SET-07 / CR4-5

## User story

As a user typing a currency symbol or a safety-net amount, I want every character I type to stay in the field, so a slow server never rewrites what I'm typing.

## Description

`linkControlToSetting` saves on every value change and its pull-back effect writes the store's value into the control whenever they differ. The store only updates after each save's reply, so while a reply is in flight the store holds an older value than the field, and the effect overwrites the field with it.

## Current situation (as-is)

- [link-control-to-setting.ts:17-30](../../../src/app/shared/utils/link-control-to-setting.ts) — `control.valueChanges.subscribe(write)` (line 22) and an `effect` that calls `control.setValue(read(), { emitEvent: false })` when `control.value !== read()` (lines 24-29).
- The store setters persist first and patch after, e.g. [app-settings.store.ts](../../../src/app/core/state/app-settings.store.ts) `await repository…; patchState(…)`.
- Failure: type "kr" in the currency-symbol field. "k" is saved; "kr" is saved; the "k" reply patches the store to "k", the effect sees `"kr" !== "k"` and sets the field to "k". A character typed in that moment is appended to "k", so the field ends up "kx" or similar. Out-of-order replies leave the older value in the field for good.
- Callers with free-text input: currency symbol ([settings-currency-locale-section.component.ts:59-63](../../../src/app/feature-settings/components/settings-currency-locale-section/settings-currency-locale-section.component.ts)) and the forecast safety net ([forecast-controls.component.ts:132-136](../../../src/app/feature-future/components/forecast-controls/forecast-controls.component.ts)); the other callers (locale, lookback, privacy, reporting, career start) are selects or date pickers.

## Desired result (to-be)

- While a control is focused or has a save in flight, the pull-back effect doesn't overwrite it; it applies the store's value once the control is idle (blur, or the last reply landed) and the values still differ.
- Saves are debounced (e.g. 300 ms) or sent on blur for text inputs, so typing "kr" sends one request, not two. Selects keep saving immediately.
- Hydration and a change from another tab still land in an idle field, as today.

## Acceptance criteria

- [ ] Typing "kr" with a delayed write that resolves "k" after "kr" was typed leaves the field "kr" (fake timers, deferred repository promise).
- [ ] Typing "kr" quickly sends one write with "kr".
- [ ] A store change while the field is idle (hydration landing, another tab) updates the field without echoing a write.
- [ ] A select bound through the helper still writes on change, immediately.
- [ ] `link-control-to-setting.spec.ts` covers the four cases above.
- [ ] Persistence stays in the store setters; the helper never calls a repository or the API.
- [ ] `ng lint`, `ng test`, `ng build --configuration development` pass.
- [ ] Live browser check: with network throttled to "Slow 3G", type a three-character currency symbol in Settings; it stays as typed and is saved.
- [ ] Verified via the fallow skill and coding-conventions skill.

## Notes

- Lost clicks on list toggles are the other half of CR6-27: [TICKET-NG-22](./TICKET-NG-22-list-toggles-keep-clicks.md).
- The helper takes a `FormControl`; if it needs to know whether the control is a text input, an options argument (`{ debounceMs }`) is enough — no per-caller wrapper.
