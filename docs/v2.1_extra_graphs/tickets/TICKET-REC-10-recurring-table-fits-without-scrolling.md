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

> **Implementation note, 2026-08-09.** The clamp is a measured constant, not a chosen one, and it
> **depends on the column count — re-measure it whenever a column is added or removed.**
>
> As shipped: **8rem**, stepping up to 16rem at `2xl` — not the single generous max-width first
> written. Measured live at a 1280px viewport, where the app shell leaves this panel **909px** and
> the other seven columns needed **703px** of it, so the payment name had ~140px before the table
> overflowed again. A flat 16rem (256px) put the horizontal scrollbar straight back (`scrollWidth`
> 1024 vs `clientWidth` 909).
>
> **Re-measured later the same day**, after the Status column was removed from the panel on request:
> six other columns instead of seven returns ~73px to the budget, so the name now has ~213px and the
> clamp was widened to **12rem** (`max-w-48`), still stepping to 16rem at `2xl`. Re-verified at both
> viewports — 1280×900: 909 = 909; 1536×900: 1165 = 1165. Every measurement quoted in the criteria
> below is from that second pass unless it names the eight-column table.

- [x] At a 1280px-wide viewport with a long payment name in the data, the recurring table's wrapper
      has no horizontal overflow (`scrollWidth <= clientWidth`) and the "Per month" column is fully
      visible. (Measured in the browser on `/explore` at 1280×900 with a 68-character label in the
      Payment column: wrapper `scrollWidth` 909 = `clientWidth` 909, and both the "Per month" `<th>`
      and its cells have a `right` edge inside the wrapper's. Re-measured at 1536×900, where the
      clamp steps to 256px: 1165 = 1165. Also holds with a row expanded.)
- [x] A payment name too long for the column renders ellipsised rather than widening the column or
      wrapping to a second line. (Same session: the label span renders at exactly 192px against a
      426px full-text width, `scrollWidth > clientWidth` so the ellipsis is active, and its height is
      one line. Computed style on the live element: `max-width: 192px`, `overflow: hidden`,
      `text-overflow: ellipsis`, `white-space: nowrap`. `truncate`'s `overflow: hidden` is also what
      zeroes the flex item's automatic minimum size, so the max-width binds inside the button's flex
      row rather than being overridden by `min-width: auto`.)
- [x] The full, untruncated name is reachable on hover, and the toggle's existing `aria-label` still
      carries the full `row.label` so nothing is lost to a screen reader.
      (`recurring-payments-panel.component.spec.ts` → "keeps the full name on hover and in the
      toggle's accessible name": `title` on the label span equals the full label, and the button's
      `aria-label` still contains it. `title` is the native hover affordance; no new component.)
- [x] A short payment name is not padded out to the clamp — the column still shrinks to content below
      the maximum. (Measured on the live page's seven real series at 1536, where the clamp is 256px:
      the labels render at 36–69px — "NS Rail" 36, "Trattoria Bella" 69 — so the column is sized by
      its content, not by the maximum.)
- [x] `mm-table` keeps its `overflow-x-auto` wrapper, so a narrow viewport can still reach every
      column; the shared primitive itself is unchanged (this is a panel-level fix, not a change to
      every table in the app). (`table.component.ts` is untouched by this change's diff;
      `recurring-payments-panel.component.spec.ts` → "leaves mm-table's horizontal scroll wrapper in
      place for narrow viewports" asserts `.mm-table-wrap` still carries `overflow-x-auto`.)
- [x] The expandable occurrence rows, the stopped-group disclosure and the `colspan="8"` detail rows
      still render and behave as before. (All 22 pre-existing specs in
      `recurring-payments-panel.component.spec.ts` pass unmodified, including "expands a series to
      its individual occurrences, and collapses again" and the whole "collapsed stopped group
      (TICKET-REC-06)" block. Confirmed live too: expanding "Vesta Rentals" renders a
      `colspan="8"` row listing its 4 payments, the toggle's `aria-label` flips to "Hide the 4
      payments behind Vesta Rentals", and the wrapper still measures 909 = 909 while open. The
      stopped-group disclosure had nothing to show on this dataset — no stopped series — so that
      half is covered by its specs only.)
- [x] Unit tests cover: the truncation class/width constraint being applied to the payment cell; the
      full label still present in the toggle's accessible name; and the existing expand/collapse and
      stopped-group specs passing unchanged. (Three specs under `describe('the payment column's width
      clamp (TICKET-REC-10)')`; 25 specs pass in that file, up from 22.)
- [x] `ng lint` + `ng test` + `ng build --configuration development` all pass. (Lint clean; 2623
      tests in 243 files pass; dev build completes.)
- [x] Verified via the fallow skill and coding-conventions skill. (`fallow audit --base HEAD` →
      verdict `pass`, 0 introduced findings; styling health A / 94.5, no new Tailwind arbitrary
      values — the clamp uses the named scale.)
- [x] Verified live in the browser: the panel on `/explore` shows all eight columns (seven, since
      the Status column was removed — see the note above) with no
      horizontal scrollbar, and hovering a truncated name reveals it in full. (Measured on
      `http://localhost:4210/explore` at 1280×900 and 1536×900 — see the first two criteria. The
      hover text is the `title` attribute on the label span, read back off the live element as the
      full label. No screenshot: the Browser pane was not displayed in this session, so the page
      composited no frames; the DOM/geometry measurements above stand in for it.)

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
