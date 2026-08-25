# TICKET-STAT-39 — The absolute panel: typed expressions, a calendar that doesn't clobber the text, Apply-staged edits

- **Area:** Statistics & Dashboard / shared UI
- **Released in:** [v1.8 Extended date-range picker](../../releases/v1.8_extended_date_range_picker/overview.md)
- **Type:** Feature
- **Traceability:** revises **FR-STAT-7**; fills the left panel scaffolded by
  [STAT-38](./TICKET-STAT-38-two-panel-range-picker.md) using the grammar from
  [STAT-35](./TICKET-STAT-35-relative-range-expressions.md).

## User story

As a power user, I want to type `now-90d` or an exact date into the From and To fields and press
Apply once, so I can set a precise window without clicking through a calendar twice — and without the
page re-querying on every keystroke.

## Description

The picker's left panel: two text fields accepting either a relative expression or an absolute date,
each with a calendar button that fills the field without replacing it, an inline error naming why an
entry is invalid, and an Apply button that is the only thing that commits the edit.

## Current situation (as-is)

- Custom ranges today are calendar-only. `mm-date-range-input`
  ([component.ts](../../../src/app/shared/ui/date-range-input/date-range-input.component.ts)) wraps a
  Cally `calendar-range` and emits `{from, to}` the moment both ends are picked (lines 54–60) — there
  is **no staging**: every pick writes straight through `onCustomRangeChange`
  ([page-range-control.ts:104](../../../src/app/core/state/page-range-control.ts)) and the page
  recomputes immediately.
- The field is `[disabled]` unless the preset is already `custom`
  ([range-grouping-switcher.component.html:43-48](../../../src/app/shared/ui/range-grouping-switcher/range-grouping-switcher.component.html)),
  so setting a custom range is a two-step act: choose "Custom", then pick.
- There is nowhere to *type* a date. The only text the control shows is its own read-only label
  (`formatAlignedRangeLabel`, falling back to `from – to`, lines 46–52).
- No validation surface exists, because no input can be invalid — Cally only emits well-formed pairs.
- [`mm-input`](../../../src/app/shared/ui/input/input.component.ts) and the shared
  [`linkControlToSetting`](../../../src/app/shared/utils/link-control-to-setting.ts) helper are the
  established pattern for a validated, form-bound field elsewhere in the app.
- [STAT-38](./TICKET-STAT-38-two-panel-range-picker.md) leaves this panel rendering its heading and
  nothing else.

## Desired result (to-be)

- The left panel renders **From** and **To** as `mm-input` text fields, each seeded with the active
  range's canonical expression (`now-30d`, or `2026-07-01` for an absolute end), each with a calendar
  icon-button beside it.
- Both fields accept **either grammar** — an expression or a `YYYY-MM-DD` date — parsed through
  `parseRangeExpression`. Parsing runs on input; the resolved date is previewed under the field
  ("`now-30d` → 15 Jul 2026") so a relative entry is never a mystery.
- **Invalid input shows the parser's reason inline** and disables Apply. It does **not** clear the
  field, blank the range, or revert — the last applied range stays in force on the page behind,
  matching the deliberate choice recorded in
  [TICKET-FUT-06](../../future/tickets/TICKET-FUT-06-forecast-controls.md)'s safety-net
  handling.
- **A range whose From is after its To is invalid** and reported as such, on the pair rather than on
  either field.
- **The calendar button opens a day picker that writes into the text field** rather than replacing
  the control — picking 3 August sets the field's text to `2026-08-03`, which then flows through the
  same parse-and-preview path. The text field remains the single source of truth for that edge.
- **Apply staging**: nothing in this panel affects the page until **Apply time range** is pressed.
  Apply commits both edges, closes the popover, and is disabled while either field is invalid or
  while nothing has changed.
- **Quick ranges still apply instantly** ([STAT-38](./TICKET-STAT-38-two-panel-range-picker.md)) —
  and picking one while edits are staged **discards them**, re-seeding both fields from the range
  just applied. The two commit models coexist; the collision resolves in favour of the more recent,
  more explicit action.
- **Unapplied edits block the close**: `Esc` and an outside click keep the popover open and mark the
  unapplied state — the Apply button takes focus and is visibly flagged, plus a one-line "you have
  unapplied changes" message. A second `Esc` discards the edits and closes, so there is always a way
  out that isn't Apply. (The sketch says "unless there are unapplied edits" and stops; this is the
  resolution.)

## Acceptance criteria

- [x] Both fields render, seeded with the active range's canonical expression text, and are editable
      without first selecting a "Custom" mode — the two-step act is gone. (`mm-absolute-range-panel`
      mounts unconditionally in the picker's left panel, no mode gate;
      `absolute-range-panel.component.spec.ts`'s "seeds both fields from a relative/absolute applied
      range on reset()".)
- [x] A valid expression (`now-90d`, `now/M`, `now-1M/M`) and a valid absolute date are both accepted
      in either field, with the resolved date previewed beneath it.
      (`absolute-range-panel.component.spec.ts`: "accepts a relative expression and an absolute date
      in either field, previewing the resolved date".)
- [x] An invalid entry (`now-6h`, `now-xd`, `15 July`, empty) shows the parser's reason inline,
      disables Apply, and leaves the page's current range untouched.
      (`absolute-range-panel.component.spec.ts`'s `it.each` "shows the parser's reason inline for an
      invalid entry" + "does not clear, blank, or revert the field on an invalid entry"; nothing emits
      until Apply per "emits nothing until Apply is clicked".)
- [x] A From later than its To is reported as a pair-level error and disables Apply.
      (`absolute-range-panel.component.spec.ts`: "reports a From later than its To as a pair-level
      error and disables Apply".)
- [x] The calendar button writes an ISO date into the text field and leaves the field editable
      afterwards; the picked value flows through the same parse-and-preview path. **Implementation
      note:** built with Cally's `<calendar-date>` (the codebase's existing pattern, per
      `date-range-input.component.ts`) but that combination crashed a vitest worker process when
      nested two Angular component levels deep (`RangePickerComponent` → `AbsoluteRangePanelComponent`
      → `mm-dropdown` → `calendar-date`) — reproducible, isolated via binary search, not a hang but a
      forked-process crash. Swapped to a hidden native `<input type="date">` opened via `.showPicker()`
      from the calendar icon-button; same field-writing contract, no custom-element/jsdom risk.
      (`absolute-range-panel.component.spec.ts`: "the calendar button writes an ISO date into the
      field, which stays editable afterwards".)
- [x] Nothing on the page changes until Apply is pressed — asserted by editing both fields and
      checking the page's figures are unmoved, then pressing Apply and checking they move.
      Mechanism verified at the unit level (`absolute-range-panel.component.spec.ts`: "emits nothing
      until Apply is clicked"; `range-picker.component.spec.ts`: "applying commits both edges, closes
      the popover, and updates the trigger label" — `customRangeChange` only fires from `onApplyClick`,
      wired through to all three consumer pages' `onCustomRangeChange`). The live "figures move"
      observation is the separate browser-verification criterion below.
- [x] Apply is disabled when either field is invalid and when nothing has changed since the panel
      was opened. (`absolute-range-panel.component.spec.ts`: "Apply is disabled while either field is
      invalid" + "Apply is disabled when nothing has changed since the panel opened".)
- [x] Applying commits both edges, closes the popover, and updates the trigger label.
      (`range-picker.component.spec.ts`: "applying commits both edges, closes the popover, and updates
      the trigger label".)
- [x] Picking a quick range while edits are staged discards them and re-seeds both fields from the
      applied range. (`range-picker.component.spec.ts`: "picking a quick range while edits are staged
      discards them, applies the quick range, and closes".)
- [x] `Esc` or an outside click with unapplied edits keeps the popover open, shows the unapplied-
      changes message and focuses Apply; a second `Esc` discards and closes.
      (`range-picker.component.spec.ts`: "Esc with unapplied edits keeps the popover open...", "an
      outside click with unapplied edits keeps the popover open...", "a second Esc discards the staged
      edits and closes".)
- [x] `Esc` or an outside click with **no** unapplied edits closes immediately, as STAT-38 built it.
      (`range-picker.component.spec.ts`: "Esc or an outside click with no unapplied edits still closes
      immediately (STAT-38 behaviour unchanged)".)
- [x] Every field is labelled, errors are associated with their field for screen readers, and the
      panel is fully keyboard-operable. `mm-input`s carry `ariaLabel`/`ariaInvalid`/`ariaDescribedBy`
      pointing at each field's hint `<div>` (error or preview text); calendar buttons are labelled
      (`ariaLabel="Pick a from/to date"`); the hidden native date inputs are `tabindex="-1"` +
      `aria-hidden="true"` so they're excluded from both tab order and the a11y tree — the calendar
      icon-button and text field are the only reachable affordances for that edge; Apply is a real
      `<button>`. Reviewed by the `conventions-reviewer` subagent, which confirmed the hidden-input
      pattern introduces no accessibility regression.
- [x] Unit tests cover: seeding from a relative and an absolute range; accepting both grammars;
      each invalid class showing a reason and disabling Apply; the From-after-To pair error; the
      calendar writing into the field; no-commit-before-Apply; Apply's two disabled conditions;
      quick-range-discards-staged-edits; both `Esc` paths (blocked then discarding); the
      no-edits close. (All present across `absolute-range-panel.component.spec.ts` (19 tests) and
      `range-picker.component.spec.ts`'s "the absolute panel and Apply staging (TICKET-STAT-39)"
      describe block (6 tests).)
- [x] `ng lint` + `ng test` + `ng build --configuration development` all pass; `angular.json`
      budgets untouched. (`verifier` subagent, final pass: lint clean, 268 test files / 3120 tests
      green, dev build clean; `angular.json` not touched — see `git diff`.)
- [ ] Verified live in the browser: typing `now-90d` into From, previewing, applying, and seeing the
      Dashboard's figures move; and an invalid entry leaving the page's figures alone. (Skipped —
      user declined the live-browser check for this ticket.)
- [x] Verified via the fallow skill and coding-conventions skill. (`npx fallow dead-code` and
      `npx fallow health --complexity` both clean; `conventions-reviewer` subagent found one real
      issue — inline `'…' + instanceId` string assembly in template bindings — fixed by hoisting to
      `fromHintId`/`toHintId` class fields; also added the missing `shared/ui/index.ts` barrel export
      for `AbsoluteRangePanelComponent`, matching every other `shared/ui` primitive.)

## Notes

- **Why keep two commit models at all.** Staging exists so a two-field edit doesn't fire a half-built
  range (`from` updated, `to` not yet) at the page; a quick range has no half-built state, so making
  it wait for Apply would be a click tax on the common path. The models differ because the actions
  differ — the risk is only in their collision, which is why that is its own acceptance criterion.
- **Why a second `Esc` discards rather than Apply-on-close.** Committing on close would apply a range
  the user was in the middle of typing, which is the exact failure staging exists to prevent. Two
  `Esc`s is the standard "I meant it" escape hatch and needs no extra chrome.
- **Why the text field, not the calendar, owns the value.** Both edges must round-trip through one
  parser or a relative entry would be silently converted to absolute the moment the calendar is
  touched — losing exactly the property [STAT-36](./TICKET-STAT-36-expression-backed-range-state.md)
  was built for.
- **Deliberately not doing**: a natural-language parser ("last tuesday"), and time-of-day input —
  both out of scope per the version overview's scope decision 1.
- Needs [STAT-38](./TICKET-STAT-38-two-panel-range-picker.md) for the panel and
  [STAT-35](./TICKET-STAT-35-relative-range-expressions.md) for the parser.
  [STAT-40](./TICKET-STAT-40-recently-used-ranges.md) adds a list below these fields that fills them.
