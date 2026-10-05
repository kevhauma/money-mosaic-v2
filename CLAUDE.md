# MoneyMosaicVibe

Self-hosted personal finance app: import bank CSV exports, categorize transactions with rules (and a trained auto-categoriser), link inter-account transfers, track joint/shared accounts, and view dashboard insights. **Two workspaces** — an Angular SPA in `src/` and its own backend in `server/` (v3, TICKET-SRV-*). Every byte of user data lives on that server, in one SQLite file, scoped to the signed-in account; the browser holds a session cookie and a handful of per-browser UI preferences in `localStorage`, nothing more. It is meant to run on your own machine or home network, not on the public internet.

Stack: Angular 21 (standalone, signals, zoneless-style OnPush), @ngrx/signals, @angular/cdk (drag-drop), Tailwind CSS 4 + daisyUI 5, ngx-echarts, PapaParse (in a Web Worker), Vitest — over Express 5 + SQLite (better-sqlite3) + Drizzle ORM.

## Commands

```bash
npm run dev                           # both: ng serve on 4210 + the API server on 4300
npm run start:local                   # production: build the app, then serve it with the API on one port (4300)
ng serve                              # the Angular app alone (preview launch config "dev", port 4210)
ng build --configuration development  # fast compile check (also catches worker-bundling issues)
ng test                               # Vitest unit tests (Angular workspace)
ng lint                               # ESLint (Angular workspace)

npm run server                        # the API server alone
npm run server:install                # install server/node_modules (native better-sqlite3)
npm run server:migrate                # generate SQL from server/src/schema, then apply it
npm run test:server                   # backend tests (in-memory SQLite)
npm --prefix server run lint          # ESLint (server workspace)
npm --prefix server run typecheck     # tsc --noEmit (server workspace)
```

The two workspaces have separate `package.json`/`tsconfig.json`/ESLint/Vitest setups, so `ng lint`
and `ng test` never read `server/` and the server's own commands never read `src/`. A change that
touches both needs both sets run.

Verification before declaring any change done: `ng lint` + `ng test` + `ng build --configuration development` — plus `npm --prefix server run lint`, `npm --prefix server run typecheck` and `npm run test:server` whenever `server/` or `shared/` changed — plus the `Fallow` skill (code-quality check — say so and skip if unavailable in the session, don't skip it silently), plus a live browser check for UI-visible changes.

## Where knowledge lives (read these instead of re-exploring)

| Topic | Source |
|---|---|
| Coding conventions (naming, folders, styling, forms, testing) | `.claude/skills/coding-conventions/SKILL.md` |
| Data model: entities, the Drizzle schema, migrations, the repository layer | `.claude/skills/data-model/SKILL.md` |
| Running/backing up the server, and the full endpoint list | `server/README.md` |
| Feature/store/service map — what lives where | `.claude/skills/project-map/SKILL.md` |
| Functional requirements (FR-TXN-*, FR-CAT-*, FR-TRF-*, ...) | `docs/reference/finance-app-spec.md`, `docs/releases/v1.0_foundation/overview.md` |
| UI layout spec | `docs/reference/ui-layout-spec.md` |
| Every ticket, by feature area (dashboard, transactions, accounts, import, income, loans, ...) | `docs/<area>/overview.md` + `docs/<area>/tickets/` — don't hardcode an area list here, list `docs/` or ask the `spec-navigator` subagent |
| What a given release shipped, in build order, with its scope decisions | `docs/releases/<version>/overview.md` — each ticket links back to its release via its **Released in** line |
| Angular / Tailwind 4 / daisyUI / Vitest guidance | installed skills in `.agents/skills/` (managed by `npx skills`, tracked in `skills-lock.json`) |
| `docs/` layout (area folders vs. `releases/` vs. `reference/`, ticket ID scheme) | `docs/README.md` |

Subagents in `.claude/agents/`: `conventions-reviewer` (diff review against project rules), `verifier` (lint/test/build runner), `spec-navigator` (answers requirement/spec questions from `docs/`), `ticket-worker` (works one ticket end-to-end in its own context, for running tickets back-to-back — **never run two of these, or one alongside `verifier`, at the same time**: they share this working tree).

## Hard rules

- **Never raise `maximumWarning`/`maximumError` bundle budgets in `angular.json`.** Solve size problems with lazy-loading or dependency dieting instead.
- **Schema changes go through Drizzle migrations**: edit `server/src/schema/`, then `npm run server:migrate`. Rename the generated `NNNN_<random>.sql` descriptively and update its `tag` in `server/drizzle/meta/_journal.json`. **Never edit a shipped migration** — add another one.
- Components/stores never call the API directly (no `HttpClient`, no `ApiClient`) — always go through a repository in `core/data-access/`, which is the seam that knows a server exists. The only sanctioned `ApiClient` callers outside that folder are the four multi-table operation services in `core/` (`import`, `transfers`, `transactions`, `accounts`), each owning one transactional endpoint a per-entity repository cannot express — don't "fix" those back.
- Every entity table carries a `userId`; every query filters on the session's user, which comes from the cookie and from nowhere else — never from a body, query string or path.
- Rules must never overwrite a category the user set manually (`categoryManual` flag on `Transaction`).
- Cross-feature imports go through the feature's `index.ts` barrel (`@/feature-x`), never deep paths. Two exceptions already in place — don't "fix" either back:
  - `app.routes.ts` imports `feature-transactions/transactions.routes` directly to break a barrel cycle.
  - Four shell-adjacent components import `shared/ui` primitives **by file** rather than through `@/shared/ui` (`core/layout/app-shell`, `core/layout/default-password-notice`, `core/layout/backup-reminder`, `feature-auth/.../login-page`). That barrel re-exports every primitive and `@Component` has side effects esbuild cannot tree-shake, so one barrel import from an eager component drags the whole of `shared/ui` — and `@angular/forms` behind it — into the eager chunk. Nothing enforces this but the bundle budget; keep it to these four.
  - Four modules that *define* a type re-exported by `shared/entities.ts` (`core/theme/accent-colors.ts`, `core/stats/saving-velocity.ts`, `core/ml/model-config.ts`, `shared/utils/format-settings.ts`) import it from `@/core/data-access/entities` rather than the barrel. The barrel would drag the Angular repositories into `shared/utils`; these are type-only imports, so there is no runtime cycle.
- **`shared/` is framework-free, dependency-free plain TypeScript** — the one place both the Angular app and the server may import from (TICKET-SRV-02). It may import *nothing*: not Angular, not Drizzle, not Express, not ngrx. An ESLint block and `server/src/shared-module.spec.ts` both enforce it; the spec reads the folder, so a new module there is covered automatically. Neither workspace may import the other — `src/**` ↔ `server/**` is blocked in both directions.
- Prettier (single quotes) runs via husky/lint-staged pre-commit; don't fight it.
- **Never mention Claude, Anthropic, or any AI assistant in git history.** No `Co-Authored-By: Claude ...` trailer, no "Generated with Claude Code", no 🤖 — not in commit messages, branch names, tags, or PR bodies. Referring to the `CLAUDE.md` file by name is fine.


## Verifying

**In browser verification** always ask the user whether to verify in browser. if decline, continue on the task. if something is not working in browser, they will come back to correct it.