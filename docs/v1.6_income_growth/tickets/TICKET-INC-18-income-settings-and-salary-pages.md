# TICKET-INC-18 — Income settings and Salary details as their own pages

- **Area:** Income
- **Type:** Refactor
- **Traceability:** revises FR-INC-3/4/10/12 presentation

## User story

As a user, I want the Income page's settings and my salary details to open as real pages rather than a
cramped popup and a modal, so each control has room for the explanation and tooltips it needs — and so I
can link to, reload, and go back from them like anything else in the app.

## Description

Promotes the two configuration surfaces off `/income` into routed child pages: `/income/settings` and
`/income/salary`. Both are currently squeezed into overlays sized for a control list, which leaves no room
to explain what any of them actually do — and the settings on this page are the ones that most need
explaining, since each silently changes every figure on the page.

## Current situation (as-is)

- **Settings** live in a 320px dropdown panel:
  [income-settings.component.html](../../../src/app/feature-income/components/income-settings/income-settings.component.html)
  is an `mm-dropdown` with `contentClass="z-10 w-80 p-4"` holding three sections (career start, income
  categories, annual lump sums), each with a single-line `hint`. TICKET-INC-04 consolidated three scattered
  controls into it — the right call then, and the reason there is now nowhere to put a second sentence.
- **Salary details** live in an `mm-modal max-w-3xl` in
  [income-overview.component.html](../../../src/app/feature-income/components/income-overview/income-overview.component.html),
  mounted only while open (`@if (salaryDetailsOpen())`) so the table rebuilds its controls from stored
  values each time. Its month focus comes from a `salaryDetailsFocusMonth` signal, set either by the header
  button (undefined) or by a chart click (`bucketKeyForChartClick`).
- Both are therefore unlinkable, unreloadable and outside the back button: a chart click that opens June's
  salary row can't be bookmarked or returned to, and a reload drops you back on the bare page.
- [income.routes.ts](../../../src/app/feature-income/income.routes.ts) has exactly one route (`path: ''`),
  carrying the feature's `provideEchartsCore` providers.
- The Income page's empty state points the user at "Income settings" as a *name*, with no way to click
  through to it.

## Desired result (to-be)

- `INCOME_ROUTES` gains two child routes under the existing `provideEchartsCore` providers, both
  lazy-loaded like the overview:
  - `/income/settings` → `IncomeSettingsPageComponent`
  - `/income/salary` → `SalaryDetailsPageComponent`
- Each page uses `mm-page-header` with its own title/subtitle and a back link to `/income`, following the
  shape of the app's existing routed pages rather than inventing a sub-page pattern.
- **Settings page:** the three existing sections keep their state and behaviour unchanged — only their
  container changes. The `mm-dropdown` wrapper is dropped; each section gets room for a real explanation
  (what the setting changes, and which panels it changes) plus per-control tooltips, laid out one section
  per `mm-paper`. `IncomeCategoryChecklistComponent`'s `hint` input stays; longer copy goes in the section,
  not into the hint.
- **Salary details page:** hosts the existing `SalaryMetadataTableComponent` unchanged, with room above it
  for the explanation the modal's one-paragraph blurb has to compress today (what gross means here, why a
  bank export can't supply it, what the Bonus column does to the charts).
- **Chart click → one-month modal.** `salaryDetailsFocusMonth` doesn't move to the salary page at all: a
  click on the trend chart opens a small modal holding *only that month's* gross and bonus fields, and
  nothing else. Clicking a spike is a one-month question ("what was June?"), and answering it by navigating
  away from the chart and scrolling a multi-year table is the wrong shape — the whole reason the focus
  wiring existed. The full table stays the salary page's job.
  - The modal writes through the same pure `resolveSalaryMetadataWrite`
    ([salary-metadata-edit.ts](../../../src/app/feature-income/salary-metadata-edit.ts)) and
    `IncomeStore.setSalaryMetadata`/`removeSalaryMetadata` the table uses — same save-on-blur semantics,
    same "both cells cleared deletes the row" rule, no second write path.
  - It carries a link to `/income/salary` for the user who came to edit one month and stayed to fill in
    several.
- The salary page therefore mounts `SalaryMetadataTableComponent` with no focus month. Whether
  `focusMonth` stays on the table (it also drives year-section expansion) or is removed with its last
  caller is the implementer's call — document whichever.
- The Income page's header buttons become `routerLink`s to the two pages, and its empty state links to
  `/income/settings` instead of naming it.
- The settings dropdown and the full salary table drop out of the overview's imports (both move to their
  pages), leaving the overview with only the one-month modal.

## Acceptance criteria

- [ ] `/income/settings` and `/income/salary` are lazy-loaded child routes under `INCOME_ROUTES`, inheriting
      its `provideEchartsCore` providers; route spec asserts both resolve.
- [ ] Every existing settings behaviour is preserved on the new page — career start validation and its
      rejection messages, the counted-category toggle, the annual-lump-sum toggle, and the rule that
      deselecting a counted category drops it from the smoothing list; the assertions in
      `income-settings.component.spec.ts` all still pass against the page.
- [ ] Every existing salary-details behaviour is preserved — save-on-blur, clearing both amounts deleting
      the row, and the year-section/newest-first month ordering; `salary-metadata-table.component.spec.ts`
      passes unchanged.
- [ ] Clicking a point on the income chart opens the one-month modal for that bucket, showing that month's
      stored gross and bonus (or empty fields when it has no row); component spec asserts the month shown
      for a click on a populated month and on an empty one.
- [ ] The one-month modal saves through `resolveSalaryMetadataWrite` and the `IncomeStore` methods — same
      save-on-blur behaviour as the table, including that clearing both fields deletes the row and that
      touching nothing writes nothing; unit test all three cases against the modal.
- [ ] An edit made in the modal is reflected on the page's charts without a reload (the store round-trip
      the table already does); component spec asserts the chart's companion table updates.
- [ ] The modal links to `/income/salary`; component spec asserts the `routerLink`.
- [ ] The salary page mounts the full table with no focus month and renders every month, unfiltered.
- [ ] Browser back from either page returns to `/income`, and both pages carry a visible back link;
      component spec asserts the link.
- [ ] Each settings section carries explanatory copy naming which panels it affects, and each control has a
      tooltip; component spec asserts the copy is present (so a later refactor can't quietly drop it).
- [ ] The Income page's empty state links to `/income/settings`; component spec asserts the `routerLink`.
- [ ] The settings `mm-dropdown` and the full salary table no longer render on the Income overview; spec
      asserts both are gone and that the only remaining overlay is the one-month modal.
- [ ] No store, repository or persistence change — this ticket moves UI only; `IncomeStore`'s API is
      untouched and no `AppSettings` field is added.
- [ ] `angular.json` bundle budgets not raised — the overview's chunk should shrink, not grow; confirm
      against the dev build's output.
- [ ] Verified via the `fallow` skill and the `coding-conventions` skill.
- [ ] Verified live in the browser: both pages open from the header and back returns to the charts; a chart
      click opens the one-month modal for the clicked month, an edit there moves the chart, and the modal's
      link reaches the full salary page.

## Notes

- This partly reverses TICKET-INC-04's consolidation, and deliberately so: that ticket's problem was *three
  scattered controls with no shared home*, which a single entry point solved. The popup is still one entry
  point — it just becomes a page, so the controls can be explained rather than merely listed.
- The two salary surfaces answer different questions and that's why there are two: the modal is "what was
  this month?", asked from the chart and answered without leaving it; the page is "let me fill in the last
  three years". A route with a focused month would have served the second shape for a user asking the
  first — which is what the modal-with-a-focus-month does today.
- Blocks TICKET-PUB-07: the guide describes opening a popup and a modal, so it must be written after this
  lands or it documents a flow that no longer exists.
- Two pages rather than one settings page with a salary tab — they're different kinds of thing (preferences
  vs. data entry), and the salary table is the one surface on this page where the user *types* rather than
  configures.
