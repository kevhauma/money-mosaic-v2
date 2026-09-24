/**
 * The Angular app's door onto the shared data model.
 *
 * The entity shapes themselves live at the repo root, in `shared/entities.ts`, so the backend
 * (`server/`) compiles against exactly the same definitions — the client cannot drift from the
 * wire shape without a type error (TICKET-SRV-02). The two workspaces may not import each other
 * (TICKET-SRV-01's ESLint guards, one of which protects a `CLAUDE.md` bundle rule), and `shared/`
 * is the one location both are allowed to reach.
 *
 * This re-export is why that move changed no import path in `src/app/`: `app-db.ts` re-exports
 * this module, the `core/data-access` barrel re-exports `app-db.ts`, and every consumer keeps
 * importing `Account`/`Transaction`/… from where it always did. It is also the only file under
 * `src/app/` that names the shared workspace, so the seam stays greppable.
 */
export * from 'shared/entities';
