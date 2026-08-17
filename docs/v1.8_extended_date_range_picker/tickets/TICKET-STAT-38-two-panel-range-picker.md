# TICKET-STAT-38 — The two-panel range picker: trigger, searchable quick ranges, prev/next preserved

- **Area:** Statistics & Dashboard / shared UI
- **Type:** Feature
- **Traceability:** revises **FR-STAT-7**'s picker UI; retires the switcher built by
  [TICKET-STAT-10](../../v1.1_joint_accounts/tickets/TICKET-STAT-10-unified-date-range-picker.md) and
  extended by [TICKET-STAT-16](../../v1.3_dashboard_insights/tickets/TICKET-STAT-16-date-range-prev-next-navigation.md),
  on the three pages [TICKET-UI-23](../../v1.6.2_interface_polish/tickets/TICKET-UI-23-per-page-date-range.md)
  gave their own range. Needs [STAT-36](./TICKET-STAT-36-expression-backed-range-state.md) and
  [STAT-37](./TICKET-STAT-37-quick-range-catalogue.md).

## User story

As someone who changes range often, I want one control that shows my current range and opens onto
every range I might want — searchable — so picking "last 90 days" is two clicks instead of a
dropdown hunt followed by two calendar taps.

## Description

The picker itself: a trigger button showing the active range, opening a popover whose right panel
lists the [STAT-37](./TICKET-STAT-37-quick-range-catalogue.md) catalogue in its four groups with a
live search field. The left panel is scaffolded here and filled by
[STAT-39](./TICKET-STAT-39-absolute-panel-apply-staging.md). Prev/next stepping stays where it is,
outside the popover.

## Current situation (as-is)

- [`mm-range-grouping-switcher`](../../../src/app/shared/ui/range-grouping-switcher/range-grouping-switcher.component.html)
  is a flex row of four controls: a prev chevron, a native `<select>` of twelve options (lines
  19–30), a next chevron, and an `mm-date-range-input` that is `[disabled]` unless the preset is
  `custom` (lines 43–48). Everything is visible at all times and the range takes roughly 340px of
  header width.
- It is presentational — value in, three outputs out
  ([component.ts:44-48](../../../src/app/shared/ui/range-grouping-switcher/range-grouping-switcher.component.ts))
  — and every page wires it through
  [`pageRangeControl`](../../../src/app/core/state/page-range-control.ts), which returns exactly those
  four members. Three pages render it: `dashboard-overview`, `explore-overview`, `accounts-overview`.
- Chevrons are disabled for the ranges with no repeatable length (component.ts:51).
- [`mm-date-range-input`](../../../src/app/shared/ui/date-range-input/date-range-input.component.ts)
  wraps a Cally `calendar-range` in the shared `mm-dropdown`, labelling the trigger via
  `formatAlignedRangeLabel` with a `from – to` fallback (lines 46–52). It is **also used standalone**
  by the Transactions filter and stays there untouched — see the version overview's scope decision 4.
- `shared/ui` already provides `dropdown`, `input`, `select`, `button`, `tabs`, `divider`, `flex`,
  `typography` and `empty-state` primitives; no popover-with-panels shape exists yet.
- There are nine themes and a standing rule against fixed light/dark treatments — the sketch's
  "dark-themed popover" cannot be taken literally.

## Desired result (to-be)

- New `mm-range-picker` under `shared/ui/range-picker/`, `OnPush`, presentational (value in, outputs
  out), exported through the `shared/ui` barrel. It replaces `mm-range-grouping-switcher`, which is
  deleted along with its spec once the three pages are moved.
- **Trigger**: a single button showing a clock icon, the active range's plain-language label (the
  catalogue label, or STAT-35's `describeRangeExpression` for a hand-built range, falling back to
  `from – to`) and a chevron. Prev/next chevrons flank it, outside the popover, keeping STAT-16's
  behaviour and its disabled states exactly as they are today.
- **Popover**, opened from the trigger and built on the existing `mm-dropdown`: two panels side by
  side, left "Absolute time range" (scaffolded empty here, filled by STAT-39), right "Quick ranges".
  It sizes to content up to a comfortable max width rather than to the sketch's fixed 850×500.
- **Quick-range panel**: the catalogue's four groups as labelled sections in a single independently
  scrolling list; the active range's entry visibly selected; hover state on the rest. Clicking an
  entry applies it **immediately** and closes the popover.
- **Search field** at the top of that panel, filtering entries by label as you type across all
  groups, hiding groups that end up empty, and showing an "no ranges match" empty state when nothing
  does. One search field only — the sketch's header search and panel search are the same control.
- **Responsive**: the two panels sit side by side from `md` up and stack below it; the popover never
  exceeds the viewport width and each panel keeps its own scroll.
- **Themed, not dark**: colours, radii and elevation come from the active theme's tokens and the
  `mm-paper` primitive. The sketch's timezone footer row is dropped entirely (this app has no
  timezone concept — see the version overview's scope decision 1).
- **Keyboard and a11y**: the trigger is a real button with `aria-expanded`; focus moves into the
  popover on open and returns to the trigger on close; `Esc` and an outside click close it (STAT-39
  adds the unapplied-edits exception); arrow keys move through the quick-range list; every entry is
  reachable by keyboard and the search field is labelled.

## Acceptance criteria

- [x] `mm-range-picker` renders on Dashboard, Explore and Accounts, and
      `mm-range-grouping-switcher` plus its spec are deleted with no remaining imports.
      (`src/app/shared/ui/range-grouping-switcher/` directory removed entirely; the three pages'
      `.ts`/`.html` swapped to `RangePickerComponent`/`<mm-range-picker>`; `grep -rn
      "mm-range-grouping-switcher\|RangeGroupingSwitcherComponent\|RangeGroupingSwitcherValue"
      src/` finds only a historical mention in `range-picker.component.ts`'s own doc comment, no
      live import. `ng build` succeeds, confirming no dangling reference.)
- [x] The trigger shows the active range's label and updates when the range changes from any source,
      including a prev/next step. (`range-picker.component.spec.ts` → "shows the catalogue label as
      the trigger text", "shows a calendar-aligned label for a hand-built range, falling back to raw
      dates otherwise" — `triggerLabel` is a `computed()` over `value()`, so it updates from any
      source that changes the input, prev/next included.)
- [x] Prev/next still steps the range per STAT-16 and stays disabled for the entries where it is
      disabled today — asserted against the same cases the existing switcher spec covers, which are
      migrated rather than dropped. (`range-picker.component.spec.ts` → the three
      disables/enables-previous/next cases and the two `rangeShift` emission cases, migrated
      verbatim in intent from the deleted `range-grouping-switcher.component.spec.ts`, with
      `year-to-date`/`all-time` updated to the current `this-year-so-far`/`all-time` ids.)
- [x] The popover lists all 21 catalogue entries under their four group headings, with the active
      entry marked as selected. (`range-picker.component.spec.ts` → "renders every QUICK_RANGES
      entry under its group heading when opened", "marks the active entry as selected via
      aria-current".)
- [x] Clicking a quick range applies it immediately, closes the popover, and the page's figures
      recompute in the same tick. (`range-picker.component.spec.ts` → "clicking a quick range emits
      presetChange with its id and closes the popover" — `selectQuickRange` emits then closes
      synchronously, no async boundary; `dashboard-overview.component.spec.ts` → "renders the range
      picker in the header, and a quick-range selection re-scopes the page" exercises this through
      the real `RangeStore`, synchronously within one `fixture.detectChanges()`.)
- [x] Typing in the search filters entries live across groups, hides emptied groups, and shows an
      empty state when nothing matches; clearing the search restores the full list.
      (`range-picker.component.spec.ts` → "typing in the search filters entries live and hides
      emptied groups", "shows an empty state when nothing matches, and clearing the search restores
      the full list".)
- [x] The two panels stack below `md` and sit side by side from `md` up, with the popover never
      exceeding the viewport width. (`range-picker.component.spec.ts` → "the popover panel stacks
      below md and sits side by side from md up" asserts the `flex-col md:flex-row` classes are
      present; the panel's `max-w-[min(42rem,calc(100vw-2rem))]` caps it against the viewport —
      visual confirmation waived, see the live-browser line below.)
- [ ] The popover carries no hardcoded light/dark colours — it renders correctly on the default
      light theme, the default dark theme and at least one non-default theme. **Partially
      verified:** `grep -nE "#[0-9a-fA-F]{3,6}|rgb\(|dark:"` over `range-picker.component.html`/`.ts`
      finds nothing — every color comes from daisyUI/`mm-` semantic classes
      (`btn-ghost`, `bg-base-content/50`, `border-base-300`, `mm-paper`'s own theme-token
      background), the same pattern every other `shared/ui` primitive uses. Actual cross-theme
      rendering left unticked — user declined the live browser check this ticket would need to
      confirm it visually.
- [x] `Esc` and an outside click close the popover; focus enters on open and returns to the trigger
      on close; the trigger exposes `aria-expanded`; the quick-range list is arrow-key navigable.
      (`range-picker.component.spec.ts` → "the trigger exposes aria-expanded...", "Escape closes the
      popover", "a click outside the component closes the popover", "a click inside the popover does
      not close it", "focus moves into the popover... and returns to the trigger on close", "falls
      back to focusing the trigger's native button when the previously-focused element is gone" —
      the last one added after `conventions-reviewer` caught a real bug: the fallback was calling
      `.focus()` on `<mm-button>`'s un-focusable host element instead of its inner native `<button>`,
      fixed and the fallback branch now has dedicated coverage — and "ArrowDown/ArrowUp move focus
      through the visible quick-range buttons".)
- [x] The Transactions filter's standalone `mm-date-range-input` is untouched and still works.
      (`git diff --stat` confirms `date-range-input.component.ts`/`.html`/`.spec.ts` not touched by
      this ticket; `transaction-filters.component.ts` — the only other consumer — not touched
      either.)
- [x] The picker holds no state of its own — value in, outputs out — and each page keeps wiring it
      through `pageRangeControl`. (`RangePickerComponent`'s only external contract is `value` in and
      `presetChange`/`rangeShift` out — `isOpen`/`searchTerm` are its own ephemeral view state, not
      range data, same as `mm-modal`'s own `open` model. All three pages still call
      `pageRangeControl(page)` unchanged — `page-range-control.ts` itself untouched beyond doc
      comments.)
- [x] Unit tests cover: rendering the full grouped catalogue; selection marking; applying a quick
      range emitting the right id; search filtering, group hiding and the empty state; `Esc` and
      outside-click closing; prev/next emission and disabled states; the stacked-vs-side-by-side
      class switch. (All in `range-picker.component.spec.ts`, 21 tests, all passing — see the
      specific case names cited against each criterion above.)
- [x] `ng lint` + `ng test` + `ng build --configuration development` all pass; `angular.json`
      budgets untouched. (Verified via the `verifier` subagent across three runs — the last after
      the focus-fallback fix — 267 spec files / 3093–3094 tests (one pre-existing, unrelated
      import-wizard flake reproduced as green in isolation), lint clean, dev build clean.
      `angular.json` not touched in this diff.)
- [ ] Verified live in the browser on all three pages: opening the picker, searching, applying a
      quick range, and stepping with prev/next. (Skipped — user declined the live browser check for
      this ticket.)
- [x] Verified via the fallow skill and coding-conventions skill. (`npx fallow dead-code --baseline
      .fallow-baseline.json --fail-on-issues --quiet` and `npx fallow health --complexity
      --max-cognitive 30 --max-cyclomatic 30 --max-crap 1000 --fail-on-issues --quiet` both exit 0
      with no output, re-run clean after the focus-fallback fix. `conventions-reviewer` subagent
      found the diff structurally clean and caught one real bug (the focus-fallback issue above,
      fixed and covered) plus one worth-flagging note (this ticket deliberately drops the
      `customRangeChange` output rather than shipping it unbound, recorded in `page-range-control.ts`'s
      doc comment for STAT-39).)

## Notes

- **Why the chevrons stay outside the popover.** Stepping is the one range action that is worth doing
  repeatedly — the whole point of STAT-16 was avoiding a reopen per step. Putting them inside would
  cost a click per step and undo that ticket. The sketch's layout simply has nowhere for them, which
  is a gap in the sketch rather than a decision.
- **Why `mm-dropdown` rather than `mm-modal`.** A range change is a lightweight, reversible action
  and the user needs to see the page behind it; a modal would also fight the stacked mobile layout
  less gracefully than a full-width dropdown panel.
- **Why the left panel ships empty.** Splitting the popover shell from the absolute panel keeps this
  ticket's diff to a widget swap that three pages can be verified against, and leaves STAT-39 to be
  reviewed purely on its input parsing and staging rules. The empty panel is visible for one ticket's
  worth of time; it renders its heading and nothing else.
- **The fixed 850×500 was not taken literally** — a hard pixel size cannot survive nine themes, a
  stacked mobile layout and a list whose length now depends on a search. Max-width plus content
  sizing gets the same two-panel reading.
- Needs STAT-36 (the state it binds to) and STAT-37 (the catalogue it lists).
  [STAT-39](./TICKET-STAT-39-absolute-panel-apply-staging.md) and
  [STAT-40](./TICKET-STAT-40-recently-used-ranges.md) both build inside the left panel.
