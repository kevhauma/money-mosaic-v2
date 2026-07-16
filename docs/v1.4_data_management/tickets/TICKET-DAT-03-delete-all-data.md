# TICKET-DAT-03 — Delete all data, with confirmation

- **Area:** Data Management
- **Type:** Feature
- **Traceability:** FR-DAT-3

## User story

As a user, I want a "delete all data" action with confirmation, so I can start fresh without having to dig through browser devtools to clear IndexedDB myself.

## Description

There is currently no in-app way to wipe the database — the only option today is manually deleting IndexedDB via browser devtools, which is not something most users know how to do. This ticket adds a deliberately-hard-to-trigger-by-accident action that clears every table.

## Current situation (as-is)

- No "delete all data" or equivalent destructive action exists anywhere in `src/`.
- The closest existing pattern for a destructive, confirmable action is [confirm-dialog.component.ts](../../../src/app/shared/ui/confirm-dialog/confirm-dialog.component.ts) (`mm-confirm-dialog`), already used for other irreversible actions in the app (e.g. archiving/clearing records) — this ticket should reuse it, not build a new confirmation pattern.
- FR-DAT-3 in [finance-app-spec.md:111](../../v1.0_foundation/finance-app-spec.md) specs this; it was never ticketed or built.

## Desired result (to-be)

- A "Delete all data" action lives in the Data Management section (from TICKET-DAT-01, or Settings if TICKET-SET-01 has landed), visually separated from non-destructive actions (e.g. in a danger-styled section using daisyUI's `alert-error`/`btn-error` tokens).
- Triggering it opens an `mm-confirm-dialog` that requires an explicit extra confirmation step beyond a single click — given the severity (irreversible, whole-database loss), this ticket requires the user to type a confirmation phrase (e.g. the literal word "DELETE") into a text field before the confirm button enables, not just a Yes/No click, which is too easy to hit by accident.
- On confirmation, every `appDb` table is cleared inside one `db.transaction('rw', appDb.tables, ...)`, then the app reloads (a real page reload, not in-place store resets) so every store re-hydrates from the now-empty database exactly as it would on a genuinely fresh install — this avoids having to manually reset every store's in-memory signal state.
- If TICKET-DAT-01 has landed by the time this is built, the confirmation dialog's copy mentions exporting a backup first ("Consider exporting your data before deleting — this cannot be undone") with a link to Export, without making export a hard requirement (the user must still be free to delete without exporting).

## Acceptance criteria

- [x] "Delete all data" action is visually distinct as destructive (danger styling), separated from other Data Management actions.
- [x] Confirming requires typing an exact confirmation phrase into a field before the destructive action can be triggered — not a single-click Yes/No.
- [x] Confirmed deletion clears every `appDb` table inside one write transaction.
- [x] After deletion, the app reloads and renders as a genuinely fresh/empty install (matches the first-run state, no stale in-memory store data left over).
- [x] Components/stores never call `appDb.<table>.clear()` directly outside the new repository/service method that implements this.
- [x] Unit tests cover: the clear operation empties every table; the confirmation gate rejects a submit attempt when the typed phrase doesn't match exactly.
- [x] Verified via the fallow skill and coding-conventions skill.
- [x] Verified live in the browser: seed the app with data, trigger Delete All Data, confirm with the exact phrase, and confirm the app reloads into an empty first-run state; also verify the confirm button stays disabled when the typed phrase is wrong or incomplete.

## Notes

- Deliberately the last of the three Data Management tickets to build (after TICKET-DAT-01 and TICKET-DAT-02) since its confirmation copy is strictly better once Export exists to link to — but it has no hard code dependency on either and could ship first if prioritized differently.
- Typed-phrase confirmation (rather than a checkbox or a second click) is a deliberate friction choice for a whole-database-destroying action — consistent with how significant this action is relative to smaller per-record destructive actions elsewhere in the app.
