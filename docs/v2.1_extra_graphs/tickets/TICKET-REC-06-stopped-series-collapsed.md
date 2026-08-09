# TICKET-REC-06 — Collapse the stopped series group, closed by default

- **Area:** Recurring
- **Type:** Feature
- **Traceability:** extends **FR-REC-2** (the recurring payments panel). Follow-up polish on
  [TICKET-REC-04](./TICKET-REC-04-recurring-change-flags.md)'s stopped-group split, from feedback
  on the shipped panel.

## User story

As someone reviewing my recurring payments, I want the stopped series tucked behind a collapsed
"Stopped" section that I open only when I care, so the list leads with what I still pay for
instead of growing forever with every subscription I ever cancelled.

## Description

The "Stopped — no longer counted in the monthly total" group at the bottom of the recurring
payments panel becomes collapsible and starts collapsed: a header line with the group's count is
always visible, the rows behind it render only on demand. Stopped series accumulate for life
(a series is kept listed by design, REC-04), so the group only ever grows — the panel should pay
that cost only when asked.

## Current situation (as-is)

- [TICKET-REC-04](./TICKET-REC-04-recurring-change-flags.md) split the panel's table into two
  `<tbody>` groups — `activeRows()` then `stoppedRows()` — with a `scope="rowgroup"` heading row
  between them ([recurring-payments-panel.component.html](../../../src/app/feature-explore/components/recurring-payments-panel/recurring-payments-panel.component.html)
  lines 126–140, computeds in
  [recurring-payments-panel.component.ts](../../../src/app/feature-explore/components/recurring-payments-panel/recurring-payments-panel.component.ts)).
- The stopped rows are always rendered. There is no way to fold them away, and since a stopped
  series never leaves the result (deliberate — disappearing is the opposite of announcing,
  REC-04), the dead half of the table grows monotonically with the user's history.
- The panel already has a per-row disclosure pattern (the occurrences fold-out via component-local
  `expandedKeys`), and `@/shared/ui` has an
  [`mm-collapse`](../../../src/app/shared/ui/collapse/collapse.component.ts) wrapping daisyUI's
  collapse — but neither is applied to the stopped group, and `mm-collapse` cannot wrap a
  `<tbody>` without breaking the table (the same HTML constraint the template's `ngTemplateOutlet`
  comment records for `<tr>`).

## Desired result (to-be)

- The stopped group is **closed by default** on every visit: only its header line renders,
  carrying the count so the collapsed state still says what it hides — e.g.
  "Stopped (3) — no longer counted in the monthly total".
- Activating the header toggles the stopped rows open/closed. The control is a real button with
  `aria-expanded`, keyboard-operable, and the toggle affordance is text/icon, not colour-only.
- Open/closed state is **component-local and session-only** (a `signal`, like `expandedKeys`) —
  not persisted to `appSettings` and not in `ChartOptionsStore`; it is a reading aid, and closed
  is the correct state on every fresh visit anyway.
- Because a `<tbody>` cannot live inside a collapse wrapper, the fold works by conditionally
  rendering the stopped rows (`@if`/`@for` inside the second `<tbody>`), not by wrapping the
  table in `mm-collapse` — the two-`tbody` table semantics and the `scope="rowgroup"` heading
  survive when open.
- Everything else REC-04 established is untouched: stopped series stay out of the summary count
  and monthly total, keep their badges when opened, and the bills calendar below is unaffected.

## Acceptance criteria

> ⚠️ **Detail drift, 2026-08-09.** The Status column was removed from the panel on request, so where
> the boxes below say a revealed row renders "eight columns" and its "Stopped" badge, it now renders
> **seven** and no badge — the group heading is the only place stopped-ness is stated. The behaviour
> this ticket is actually about (closed by default, count in the heading, rows folded by not being
> rendered, `scope="rowgroup"` preserved) is unchanged and still covered by its specs.

- [x] With at least one stopped series, the panel renders the stopped-group header (with count)
      but none of the stopped rows on first render; active rows are unaffected.
      (`stoppedGroup` computed + the `@if (stoppedGroup().open)` guard inside the second `<tbody>`;
      spec "renders the group header with its count, and none of its rows, on first render".)
- [x] Activating the header shows the stopped rows (badges, columns and the `scope="rowgroup"`
      heading intact); activating it again hides them. The control is a button with
      `aria-expanded` reflecting the state.
      (Spec "reveals the rows on activation and hides them again, flipping aria-expanded" asserts
      the row's eight columns, its "Stopped" badge cell, the surviving
      `th[scope="rowgroup"]`, and `aria-expanded` in both directions. The disclosure is an
      `mm-button` **inside** the heading, so the group is still announced as a row group; the
      affordance is the ▸/▾ glyph plus the label, never colour alone.)
- [x] With zero stopped series, no header and no toggle render (as today).
      (Spec "renders no group and no toggle when nothing is stopped".)
- [x] The state is a component-local signal — nothing written to `appSettings`, `ChartOptionsStore`
      or any repository; no Dexie change.
      (`private readonly stoppedGroupOpen = signal(false)` beside `expandedKeys`; spec "writes
      nothing to appSettings — the state is component-local and session-only" asserts
      `appDb.appSettings.count()` is 0 after toggling. No store, repository or schema file is in
      this ticket's diff.)
- [x] The summary count and monthly total remain computed from `activeSeries()` regardless of the
      group's open/closed state.
      (Untouched in the diff; spec "keeps the count and monthly total off the group’s open/closed
      state" pins both before and after opening.)
- [x] Unit tests cover: closed by default with stopped series present; toggling open reveals the
      rows and updates `aria-expanded`; toggling closed hides them again; count shown in the
      collapsed header; no group rendered when nothing is stopped.
      (Five new cases in `recurring-payments-panel.component.spec.ts` under "the collapsed stopped
      group (TICKET-REC-06)". Two REC-04 specs were updated rather than left passing by accident —
      they read the heading text and the stopped row's badge, both of which the fold now changes;
      they open the group explicitly via the new `openStoppedGroup` helper.)
- [x] Verified via the fallow skill and coding-conventions skill.
      (Both `.husky/pre-commit` fallow gates exit 0; the header's display facts are resolved on the
      `stoppedGroup` view-model rather than derived in the template, per the conventions skill.)
- [x] Verified live in the browser: the collapsed group on `/explore` with real or crafted data,
      opened and closed.
      (2026-08-09, dev server on :4210, with a crafted stopped series — three monthly €30 rows
      ending 2025-11-10, long past `STOPPED_INTERVALS`. **Closed on load:** header reads
      "▸ Stopped (1) — no longer counted in the monthly total", `aria-expanded="false"`,
      `aria-label="Show the 1 stopped payment"`, and "Old Gym Fixture" appears nowhere in the
      panel; the seven active rows and the "7 recurring payments ≈ €1,202.04 /month" summary are
      unchanged. **Opened:** glyph ▾, `aria-expanded="true"`, label "Hide the 1 stopped payment",
      the row renders all eight columns with its "Stopped" badge, the `th[scope="rowgroup"]`
      heading survives, and the summary total is still €1,202.04. **Closed again:** back to ▸,
      `aria-expanded="false"`, row gone. The crafted rows were deleted afterwards — the dev
      database is back to its original 41 transactions.)

## Notes

- Session-only state is a deliberate scope call, mirroring the version overview's "Persisting
  chart choices across reloads" entry: promoting it to `appSettings` (or `ChartOptionsStore`)
  would need its own ticket, not a quiet default here.
- A screen reader consideration for implementation: keep the always-visible header as (or next
  to) the `scope="rowgroup"` heading so the group is still announced as a row group when open —
  don't replace the table heading row with a button floating outside the table.
- Needs [TICKET-REC-04](./TICKET-REC-04-recurring-change-flags.md) (shipped). Independent of
  [TICKET-CAT-11](./TICKET-CAT-11-pickers-respect-applicability.md) and
  [TICKET-REC-05](./TICKET-REC-05-recurring-honours-category-range.md) — though REC-05 will
  shrink the stopped group's most annoying case (a concluded category's series showing as
  stopped), this ticket handles the ordinary accumulation that remains.
