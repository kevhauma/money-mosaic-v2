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

- [ ] A goal can be added with a name and a target amount; it appears in the list immediately and
      survives a reload.
- [ ] The form rejects an empty name, a missing amount, a zero or negative amount, and a
      non-numeric amount, with a visible message per field and no write attempted.
- [ ] A goal can be edited (name, amount, wanted-by date, note) and the change persists.
- [ ] A goal can be deleted, behind a confirmation, and does not come back on reload.
- [ ] Goals can be reordered by drag, and the new order persists across a reload.
- [ ] Goals can be reordered **without a pointer** — the keyboard path is asserted in a spec, not
      just claimed.
- [ ] A newly added goal appears last in the order, not first.
- [ ] The caption stating that goals are funded top-down is present.
- [ ] Every amount honours privacy mode; amounts use `formatCurrency()` and dates `localeDate`.
- [ ] The empty state renders when there are no goals and explains what a goal is for.
- [ ] All data access goes through `GoalsStore` from `@/core/state`; no repository or Dexie import
      in the component.
- [ ] Unit tests cover: add (happy path and each validation failure); edit; delete-with-confirm;
      drag reorder persisting the right `sortOrder` writes; keyboard reorder; new goal appended
      last; privacy masking; and the empty state.
- [ ] `ng lint` + `ng test` + `ng build --configuration development` all pass; `angular.json`
      budgets untouched.
- [ ] Verified live in the browser: three goals added, dragged into a different order, reloaded,
      and the order held. *(Ask the user first; if declined, note it here rather than ticking.)*
- [ ] Verified via the fallow skill and coding-conventions skill.

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
