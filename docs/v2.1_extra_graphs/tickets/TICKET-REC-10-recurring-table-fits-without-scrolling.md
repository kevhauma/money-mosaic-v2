# TICKET-REC-10 — The recurring table fits its panel, with long payment names truncated

- **Area:** Recurring
- **Type:** Bug fix
- **Traceability:** revises **FR-REC-2** (the panel), and the table rules in
  [ui-layout-spec.md](../../v1.0_foundation/ui-layout-spec.md). From feedback on the shipped panel.

## User story

As someone reading the recurring payments panel, I want the whole table visible without dragging it
sideways, so I can compare what each commitment costs per month without losing the column that says
so.

## Description

The panel renders eight columns inside `mm-table`'s `overflow-x-auto` wrapper, and the Payment column
grows to fit its longest label. On a real dataset that pushes the table past the panel, so the
rightmost column — **Per month**, the one the panel exists to show — is clipped behind a horizontal
scrollbar. This ticket clamps the payment name to the space available and puts the full text one
hover (or focus) away.

## Current situation (as-is)

- `mm-table` ([table.component.ts](../../../src/app/shared/ui/table/table.component.ts)) wraps its
  content in `overflow-x-auto` by default, so an over-wide table scrolls rather than reflows. That is
  the right primitive default and is not what changes here.
- The panel
  ([recurring-payments-panel.component.html](../../../src/app/feature-explore/components/recurring-payments-panel/recurring-payments-panel.component.html))
  renders eight columns. The Payment `<th scope="row">` holds an `mm-button` whose label span already
  carries `truncate`, but **nothing constrains the column's width** — `truncate` needs a bounded box
  to do anything, and a table cell sizes to its content, so the column simply grows and the table
  overflows.
- Observed live on 2026-08-09 with the seeded dataset: a horizontal scrollbar under the table and
  "Per month" cut off mid-value.
- The accessible path is already in place and must not regress: the toggle's `toggleAriaLabel`
  (`recurring-payments-panel.component.ts`) embeds the full `row.label`, so a screen reader announces
  the complete name however the text is visually clipped. Only the *sighted* affordance is missing.

## Desired result (to-be)

- **The table fits its panel at ordinary desktop widths without a horizontal scrollbar.** The Payment
  column is clamped (a max-width, so short names still shrink) and its label ellipsises.
- **The full name is available on hover and on keyboard focus.** A `title` attribute alone covers the
  mouse; the toggle is already a focusable `mm-button` carrying the full label in `aria-label`, so
  the keyboard/AT path is satisfied — the criterion is that both are true after the change, not that
  a new tooltip component is introduced.
- **The scroll wrapper stays.** Narrow viewports must still be able to reach every column; this
  ticket removes the *need* to scroll at normal widths, it does not remove the ability to.
- Nothing else about the table changes: the eight columns, the expandable occurrence rows, the
  stopped-group disclosure (REC-06) and the `colspan="8"` detail rows all stay as they are.

## Acceptance criteria

- [ ] At a 1280px-wide viewport with a long payment name in the data, the recurring table's wrapper
      has no horizontal overflow (`scrollWidth <= clientWidth`) and the "Per month" column is fully
      visible.
- [ ] A payment name too long for the column renders ellipsised rather than widening the column or
      wrapping to a second line.
- [ ] The full, untruncated name is reachable on hover, and the toggle's existing `aria-label` still
      carries the full `row.label` so nothing is lost to a screen reader.
- [ ] A short payment name is not padded out to the clamp — the column still shrinks to content below
      the maximum.
- [ ] `mm-table` keeps its `overflow-x-auto` wrapper, so a narrow viewport can still reach every
      column; the shared primitive itself is unchanged (this is a panel-level fix, not a change to
      every table in the app).
- [ ] The expandable occurrence rows, the stopped-group disclosure and the `colspan="8"` detail rows
      still render and behave as before.
- [ ] Unit tests cover: the truncation class/width constraint being applied to the payment cell; the
      full label still present in the toggle's accessible name; and the existing expand/collapse and
      stopped-group specs passing unchanged.
- [ ] `ng lint` + `ng test` + `ng build --configuration development` all pass.
- [ ] Verified via the fallow skill and coding-conventions skill.
- [ ] Verified live in the browser: the panel on `/explore` shows all eight columns with no
      horizontal scrollbar, and hovering a truncated name reveals it in full.

## Notes

- **"Vertical" versus "horizontal" in the report.** The request said "no vertical scroll", but the
  remedy it prescribes — truncating the payment description — can only relieve *width*, and a
  horizontal scrollbar is what is actually observed. This ticket is written for the horizontal
  overflow. If the panel's *height* is also unwanted (the table growing the page as the series list
  grows), that is a different fix — a max-height with `mm-table`'s `scroll="auto"` mode, or paging —
  and deserves its own ticket.
- The clamp belongs on the panel's payment column, not on `mm-table`: seven other tables in the app
  use the same primitive and have no over-wide column.
- Independent of [TICKET-REC-08](./TICKET-REC-08-fuzzy-description-clustering.md) and
  [TICKET-REC-09](./TICKET-REC-09-recurring-includes-joint-accounts.md), though REC-08 makes it more
  visible: fuller clusters mean more series, and description-keyed series carry the longest labels
  (`label` falls back to `rawDescription` when there is no counterparty name).
