# TICKET-STAT-39 — The absolute panel: typed expressions, a calendar that doesn't clobber the text, Apply-staged edits

- **Area:** Statistics & Dashboard / shared UI
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
  [TICKET-FUT-06](../../v2.2_goals_and_forecast/tickets/TICKET-FUT-06-forecast-controls.md)'s safety-net
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

- [ ] Both fields render, seeded with the active range's canonical expression text, and are editable
      without first selecting a "Custom" mode — the two-step act is gone.
- [ ] A valid expression (`now-90d`, `now/M`, `now-1M/M`) and a valid absolute date are both accepted
      in either field, with the resolved date previewed beneath it.
- [ ] An invalid entry (`now-6h`, `now-xd`, `15 July`, empty) shows the parser's reason inline,
      disables Apply, and leaves the page's current range untouched.
- [ ] A From later than its To is reported as a pair-level error and disables Apply.
- [ ] The calendar button writes an ISO date into the text field and leaves the field editable
      afterwards; the picked value flows through the same parse-and-preview path.
- [ ] Nothing on the page changes until Apply is pressed — asserted by editing both fields and
      checking the page's figures are unmoved, then pressing Apply and checking they move.
- [ ] Apply is disabled when either field is invalid and when nothing has changed since the panel
      was opened.
- [ ] Applying commits both edges, closes the popover, and updates the trigger label.
- [ ] Picking a quick range while edits are staged discards them and re-seeds both fields from the
      applied range.
- [ ] `Esc` or an outside click with unapplied edits keeps the popover open, shows the unapplied-
      changes message and focuses Apply; a second `Esc` discards and closes.
- [ ] `Esc` or an outside click with **no** unapplied edits closes immediately, as STAT-38 built it.
- [ ] Every field is labelled, errors are associated with their field for screen readers, and the
      panel is fully keyboard-operable.
- [ ] Unit tests cover: seeding from a relative and an absolute range; accepting both grammars;
      each invalid class showing a reason and disabling Apply; the From-after-To pair error; the
      calendar writing into the field; no-commit-before-Apply; Apply's two disabled conditions;
      quick-range-discards-staged-edits; both `Esc` paths (blocked then discarding); the
      no-edits close.
- [ ] `ng lint` + `ng test` + `ng build --configuration development` all pass; `angular.json`
      budgets untouched.
- [ ] Verified live in the browser: typing `now-90d` into From, previewing, applying, and seeing the
      Dashboard's figures move; and an invalid entry leaving the page's figures alone.
- [ ] Verified via the fallow skill and coding-conventions skill.

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
