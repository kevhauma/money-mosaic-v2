# TICKET-FUT-04 — Goals list: add what I want to buy, edit it, delete it, drag it into priority order

- **Area:** Goals
- **Type:** Feature
- **Traceability:** extends **FR-FUT-2** ([TICKET-FUT-02](./TICKET-FUT-02-goals-persistence.md)),
  renders on FR-FUT-3's page ([TICKET-FUT-03](./TICKET-FUT-03-future-page-scaffold.md)). Privacy-mode
  compliance per [TICKET-PRIV-01](../../v2/tickets/TICKET-PRIV-01-privacy-mode-dashboard.md).

## User story

As someone who wants several things but can't buy them all at once, I want to list them with what
they cost and drag them into the order I'd actually buy them, so the app can tell me when each one
comes within reach.

## Description

The Goals section on `/future`: a form to add "what I want" and "what it costs", an editable,
deletable row per goal, and drag-to-reorder that sets the funding order every projection in this
version depends on.

## Current situation (as-is)

- [TICKET-FUT-02](./TICKET-FUT-02-goals-persistence.md) provides `SavingsGoal`, `GoalsRepository`
  and `GoalsStore`, but nothing renders them.
- [TICKET-FUT-03](./TICKET-FUT-03-future-page-scaffold.md) provides `/future` and its shell, whose
  body is an empty state.
- The reorder interaction already exists twice over:
  [`dashboard-customize-panel.component.html`](../../../src/app/feature-dashboard/components/dashboard-customize-panel/dashboard-customize-panel.component.html)
  uses `cdkDropList`/`cdkDrag`/`cdkDragHandle` with an `(cdkDropListDropped)` handler, and
  `computeReorderUpdates` ([sortable.ts](../../../src/app/shared/utils/sortable.ts)) turns a move
  into the minimal `sortOrder` writes.
- Reactive-form conventions, `mm-*` shared UI (`mm-paper`, `mm-button`, `mm-empty-state`,
  `mm-text`), `formatCurrency()` and `localeDate` are all established across the Categories and
  Accounts features.

## Desired result (to-be)

- New `app-goals-panel` under `feature-future/components/goals-panel/`, `OnPush`, rendered as the
  first section of `/future` and exported via the feature's components barrel.
- **Add**: a compact reactive form — name (required, trimmed, non-empty), target amount (required,
  numeric, greater than zero), optional "wanted by" date, optional note. Submitting appends the
  goal and clears the form; the new goal lands at the bottom of the order.
- **Rows**: name, target amount (`formatCurrency()`), wanted-by date (`localeDate`) when set, and
  the note when set. Each row has an edit affordance (inline or dialog, matching whichever the
  Categories feature uses) and a delete with a confirmation step, since a goal is user-authored
  data that cannot be recovered from an import.
- **Reorder**: drag by an explicit handle, `cdkDropList` + `cdkDrag` as the dashboard customize
  panel does, persisting through `GoalsStore.reorder` → `computeReorderUpdates` → repository. The
  list must also be reorderable **from the keyboard** (move up / move down controls, or CDK's
  keyboard drag) — drag-only would make the funding order unreachable without a mouse.
- A caption above the list states plainly what the order means: goals are funded top-down, so the
  first goal is paid for before the second starts accumulating.
- Amounts mask under privacy mode per TICKET-PRIV-01, in rows and in any total.
- Empty state when there are no goals: one line explaining what to add and why, via
  `mm-empty-state`, not a hand-rolled block.
- Reads and writes go exclusively through `GoalsStore` from `@/core/state` — no repository or
  `appDb` import in the component.

## Acceptance criteria

- [x] A goal can be added with a name and a target amount; it appears in the list immediately and
      survives a reload. (Spec "adds a goal with a name and a target amount, and it appears in the
      list"; live: Camera €1.200 and Holiday €3.000 added through the dialog and still present
      after a reload.)
- [x] The form rejects an empty name, a missing amount, a zero or negative amount, and a
      non-numeric amount, with a visible message per field and no write attempted. (Spec `it.each`
      over empty name / whitespace-only name / missing amount / zero / negative, each asserting the
      message text **and** `expect(goalsRepository.add).not.toHaveBeenCalled()`, plus a separate
      non-numeric case. Note: `<input type="number">` will not hold `"abc"`, so a non-numeric entry
      reaches the control as blank — the spec asserts the no-write either way rather than pretending
      to test a state the browser cannot produce.)
- [x] A goal can be edited (name, amount, wanted-by date, note) and the change persists. (Spec
      "edits a goal through the store and persists the change" drives the row's Edit menu item and
      asserts `update(1, { name: 'Camera body', targetAmount: 1500 })`.)
- [x] A goal can be deleted, behind a confirmation, and does not come back on reload. (Spec "asks
      for confirmation before deleting, and only deletes once confirmed" asserts no `remove` call
      while the dialog is open, then `remove(1)` and an empty list after confirming; persistence is
      `GoalsRepository.remove`, covered by its own repository spec.)
- [x] Goals can be reordered by drag, and the new order persists across a reload. (Spec "persists a
      drag as a full renumbering of the order" moves an item three slots and asserts the exact
      `bulkUpdateSortOrder` payload. Live: Holiday dragged from bottom to top, then a full page
      reload — the list came back `Holiday, Bike, Camera`. Driving CDK's drag from the automation
      harness needed a synthetic pointer sequence with `buttons: 1`; without it CDK's
      fake-mousedown-from-screen-reader guard ignores the gesture. That is a property of synthetic
      events, not of the page.)
- [x] Goals can be reordered **without a pointer** — the keyboard path is asserted in a spec, not
      just claimed. (Spec "reorders from the keyboard alone" clicks the real
      `button[aria-label="Move Holiday up"]` and asserts the resulting `sortOrder` writes; a second
      spec asserts the buttons are disabled at each end. Live: clicking "Move Camera up" reordered
      `Holiday, Bike, Camera` → `Holiday, Camera, Bike`.)
- [x] A newly added goal appears last in the order, not first. (Spec "appends a new goal last in the
      funding order rather than first" — `sortOrder: 2` behind two existing goals; live, Camera and
      Holiday each landed at the bottom as they were added.)
- [x] The caption stating that goals are funded top-down is present. (Spec "states that goals are
      funded top down" asserts the sentence verbatim; visible under the section title.)
- [x] Every amount honours privacy mode; amounts use `formatCurrency()` and dates `localeDate`.
      (Spec "formats the amount through formatCurrency" (`€1,234.50`) and "wraps every amount in the
      privacy blur, driven by the global setting". Live: "Hide amounts" blurs all three targets and
      leaves the names and the wanted-by line sharp.)
- [x] The empty state renders when there are no goals and explains what a goal is for. (Spec
      "renders the empty state, and no rows, when there are no goals"; `mm-empty-state`, not a
      hand-rolled block.)
- [x] All data access goes through `GoalsStore` from `@/core/state`; no repository or Dexie import
      in the component. (`goals-panel.component.ts` imports `GoalsStore`/`AppSettingsStore` from
      `@/core/state` and `SavingsGoal` as a type only; no repository, no `appDb`.)
- [x] Unit tests cover: add (happy path and each validation failure); edit; delete-with-confirm;
      drag reorder persisting the right `sortOrder` writes; keyboard reorder; new goal appended
      last; privacy masking; and the empty state. (18 cases in
      `goals-panel.component.spec.ts`, driving the real DOM — dialog inputs, menu items and
      aria-labelled buttons — rather than calling component methods, except for the two paths a
      unit test cannot synthesise (`onDrop`, and the confirm dialog's own click).)
- [x] `ng lint` + `ng test` + `ng build --configuration development` all pass; `angular.json`
      budgets untouched. (Lint clean; 2804 tests / 256 files green; dev build completed with
      `Initial total` unchanged at 2.16 MB.)
- [x] Verified live in the browser: three goals added, dragged into a different order, reloaded,
      and the order held. (See the drag criterion above; no console errors at any point.)
- [x] Verified via the fallow skill and coding-conventions skill. (`fallow audit --base HEAD` →
      verdict `pass`, 0 introduced findings. The first run flagged three: two template-complexity
      HIGHs and a CRAP-30 validator. All three were fixed rather than suppressed — the row moved
      into its own presentational `app-goal-row` component, the form's per-field error text and
      dialog labels moved out of the template onto the class (the "templates branch on state, they
      never derive it" rule), and `positiveAmountValidator` handed the blank case back to
      `Validators.required`. The now-stale `unused-export` suppression on `GoalsStore` was removed,
      as FUT-02 said it would be.)

## Notes

- **The order is not cosmetic** — unlike the dashboard row order it copies its interaction from,
  this order changes the numbers: [TICKET-FUT-05](./TICKET-FUT-05-goal-affordability-projection.md)
  funds goals sequentially, so dragging a goal up pushes every goal below it further out. That is
  the whole point of making it reorderable, and it is why the caption is an acceptance criterion
  rather than a nicety.
- **Why delete confirms and archive doesn't ship.** `SavingsGoal.archived` exists from FUT-02 but
  gets no UI here; "I bought it, keep the record" is a real follow-up, not this ticket's job. Until
  then, delete is the only removal path and therefore confirms.
- No "how much I've already put toward this goal" field, deliberately. Money is fungible and the
  app has no way to know which euro is earmarked; the projection instead starts from real net worth
  minus a user-set safety net ([TICKET-FUT-06](./TICKET-FUT-06-forecast-controls.md)), which is
  checkable against a bank statement. Recorded in the version overview.
- **The wanted-by date is optional but load-bearing.** FUT-05 uses it only for an on-track chip, but
  [TICKET-FUT-09](./TICKET-FUT-09-required-saving-rate-mode.md)'s second mode has nothing to solve
  for without it — so the field gets a real label ("when do you want it?") rather than being buried,
  and FUT-09 adds the prompt on rows that lack one.
- Needs FUT-02 and FUT-03. Independent of FUT-01.
